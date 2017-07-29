const ice = require("ice-node");
const MongoClient = require("mongodb").MongoClient;
const rp = require("request-promise");
const TrafficMonitor = require("./traffic_monitor.js");
const sleep = require("./sleep.js");
const CoreProcess = require("./core_process.js");

class ApiServer {
    constructor({ listen_addr, db_url, master_url, node_key, trafficmon, core_process }) {
        if(!(trafficmon instanceof TrafficMonitor)) {
            throw new Error("Invalid trafficmon");
        }
        if(!(core_process instanceof CoreProcess)) {
            throw new Error("Invalid core_process");
        }

        this.listen_addr = listen_addr;
        this.db_url = db_url;
        this.master_url = master_url;
        this.node_key = node_key;
        this.trafficmon = trafficmon;
        this.core_process = core_process;
        this.ev_queue = [];
        this.app = new ice.Ice();
        this.db = null;

        init_app(this, this.app);
    }

    async start() {
        this.db = await MongoClient.connect(this.db_url);
        this.app.listen(this.listen_addr);
        this.start_sync();
        this.trafficmon.start_timeout_checker({
            server: this,
            db: this.db
        });
    }

    add_event(ev) {
        this.ev_queue.push(ev);
    }

    async start_sync() {
        while(true) {
            try {
                let ev_queue = this.ev_queue;
                this.ev_queue = [];

                console.log(`Sending ${ev_queue.length} events`);

                const r = await rp.post(this.master_url + "/sync", {
                    json: {
                        key: this.node_key,
                        events: ev_queue
                    }
                });
                if(r.err !== 0) {
                    throw r;
                }

                if(r.events) {
                    console.log(`Received ${r.events.length} events`);
                    for(const ev of r.events) {
                        try {
                            switch(ev.type) {
                                case "update_user_traffic": {
                                    const user_id = ev.user_id;
                                    const new_total_traffic = ev.total_traffic;
                                    const new_used_traffic = ev.used_traffic;

                                    console.log(`Updating traffic for user ${user_id}: ${new_used_traffic} / ${new_total_traffic}`);

                                    await this.db.collection("users").updateOne({
                                        id: user_id
                                    }, {
                                        id: user_id,
                                        total_traffic: new_total_traffic,
                                        used_traffic: new_used_traffic
                                    }, {
                                        upsert: true
                                    });

                                    break;
                                }

                                case "update_config": {
                                    const cfg = ev.config;
                                    this.core_process.reload_config(cfg);
                                    await this.core_process.restart();
                                    break;
                                }

                                default:
                                    console.log("Unknown event type: " + ev.type);
                            }
                        } catch(e) {
                            console.log(e);
                        }
                    }
                }
            } catch(e) {
                console.log(e);
            }
            await sleep(60000);
        }
    }
}

module.exports = ApiServer;

function init_app(server, app) {
    init_local_api(server, app);

    app.get("/stats", async req => ice.Response.json(await server.trafficmon.get_stats()));
}

function init_local_api(server, app) {
    app.use("/connection/", req => {
        if(!req.remote_addr.startsWith("127.0.0.1:")) {
            throw new ice.Response({
                status: 403,
                body: "Permission denied"
            });
        }
    });

    app.post("/connection/add", async req => {
        let data = req.json();

        try {
            await server.trafficmon.add_connection({
                server: server,
                db: server.db,
                protocol: data.protocol || "tcp",
                remote_ip: data.remote_ip,
                remote_port: data.remote_port,
                user_id: data.user_id || ""
            });
        } catch(e) {
            console.log(e);
            return "" + e;
        }

        return "OK";
    });

    app.post("/connection/remove", async req => {
        let data = req.json();

        try {
            await server.trafficmon.remove_connection({
                server: server,
                db: server.db,
                protocol: data.protocol || "tcp",
                remote_ip: data.remote_ip,
                remote_port: data.remote_port
            });
        } catch(e) {
            return "" + e;
        }

        return "OK";
    });
}
