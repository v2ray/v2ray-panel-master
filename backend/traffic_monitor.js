const Tesserarius = require("tesserarius");
const util = require("util");
const ip_address = require("ip-address");
const iptables_stats = require("./iptables_stats.js");
const User = require("./user.js");
const sleep = require("./sleep.js");

const _iptables = new Tesserarius();

const iptables = {
    create_chain: util.promisify(_iptables.create_chain.bind(_iptables)),
    flush: util.promisify(_iptables.flush.bind(_iptables)),
    add_rule: util.promisify(_iptables.add_rule.bind(_iptables)),
    delete_rule: util.promisify(_iptables.delete_rule.bind(_iptables))
};

class TrafficMonitor {
    constructor(chain_name = "V2RAY_TRAFFICMON") {
        this.chain_name = chain_name;
        this.local_state = {};
        this.started = false;
    }

    async start() {
        try {
            await iptables.create_chain(this.chain_name);
        } catch(e) {
            if(e.toString().indexOf("Chain already exists") == -1) {
                throw e;
            }
        }

        await iptables.flush(this.chain_name);

        try {
            while(true) {
                await iptables.delete_rule("INPUT", {
                    policy: this.chain_name
                });
            }
        } catch(e) {}

        try {
            while(true) {
                await iptables.delete_rule("OUTPUT", {
                    policy: this.chain_name
                });
            }
        } catch(e) {}

        try {
            await iptables.add_rule("INPUT", {
                policy: this.chain_name
            });
        } catch(e) {
            console.log(e);
        }
        try {
            await iptables.add_rule("OUTPUT", {
                policy: this.chain_name
            });
        } catch(e) {
            console.log(e);
        }

        this.started = true;
    }

    async add_connection({ server, db, protocol, remote_ip, remote_port, user_id }) {
        if(!this.started) {
            throw new Error("Not started");
        }

        if(protocol != "tcp") {
            throw new Error("Invalid protocol: " + protocol);
        }

        let port = parseInt(remote_port);
        if(port <= 0 || port > 65535) {
            throw new Error("Invalid remote port");
        }

        // TODO: Add IPv6 support
        if(!(new ip_address.Address4(remote_ip).isValid())) {
            throw new Error("Invalid remote ip");
        }

        let u = await User.load_from_database(db, user_id);
        if(!u.traffic_is_ok()) {
            throw new Error("Invalid remaining traffic");
        }

        let in_rule = {
            protocol: protocol,
            source_port: remote_port,
            source: remote_ip,
            policy: "ACCEPT"
        };
        let out_rule = {
            protocol: protocol,
            destination_port: remote_port,
            destination: remote_ip,
            policy: "ACCEPT"
        };

        await iptables.add_rule(this.chain_name, in_rule);
        await iptables.add_rule(this.chain_name, out_rule);

        let conn_desc = get_conn_desc({
            protocol: protocol,
            remote_ip: remote_ip,
            remote_port: remote_port
        });

        this.local_state[conn_desc] = {
            rules: [ in_rule, out_rule ],
            user: u
        };
    }

    async remove_connection({ server, db, protocol, remote_ip, remote_port }) {
        if(!this.started) {
            throw new Error("Not started");
        }

        let conn_desc = get_conn_desc({
            protocol: protocol,
            remote_ip: remote_ip,
            remote_port: remote_port
        });
        if(!this.local_state[conn_desc]) {
            throw new Error("Invalid connection");
        }

        let state = this.local_state[conn_desc];
        delete this.local_state[conn_desc];

        let stats = (await iptables_stats.get_chain_stats(this.chain_name))
            .filter(v => get_conn_desc(v) == conn_desc);

        let total_traffic = stats
            .map(v => v.bytes)
            .reduce((a, b) => a + b, 0);
        
        await state.user.inc_used_traffic(db, total_traffic);
        server.add_event({
            type: "inc_used_traffic",
            user_id: state.user.id,
            dt: total_traffic
        });

        for(let rule of state.rules) {
            await iptables.delete_rule(this.chain_name, rule);
        }

        return stats;
    }

    async start_timeout_checker({ server, db }) {
        if(!this.started) {
            throw new Error("Not started");
        }

        let conn_stats = {};
        const timeout_ms = 60000;

        while(true) {
            try {
                let t = Date.now();
                let stats = await iptables_stats.get_chain_stats(this.chain_name);
                for(let item of stats) {
                    let conn_desc = get_conn_desc(item);
                    if(!conn_stats[conn_desc]) {
                        conn_stats[conn_desc] = {
                            last_active_time: t,
                            last_stat: item
                        };
                    } else {
                        let prev = conn_stats[conn_desc];
                        if(prev.last_stat.bytes != item.bytes) {
                            prev.last_active_time = t;
                            prev.last_stat = item;
                        } else {
                            if(t - prev.last_active_time > timeout_ms) {
                                console.log("Removing connection due to timeout: " + conn_desc);
                                try {
                                    await this.remove_connection({
                                        server: server,
                                        db: db,
                                        protocol: prev.last_stat.protocol,
                                        remote_ip: prev.last_stat.remote_ip,
                                        remote_port: prev.last_stat.remote_port
                                    });
                                } catch(e) {
                                    console.log(e);
                                }
                                delete conn_stats[conn_desc];
                            }
                        }
                    }
                }
            } catch(e) {
                console.log(e);
            }
            await sleep(5000);
        }
    }

    async get_stats() {
        return await iptables_stats.get_chain_stats(this.chain_name);
    }
}

module.exports = TrafficMonitor;

function get_conn_desc({ protocol, remote_ip, remote_port }) {
    return protocol + "://" + remote_ip + ":" + remote_port;
}
