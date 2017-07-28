const child_process = require("child_process");
const util = require("util");

let exec_file = util.promisify(child_process.execFile.bind(child_process));

module.exports.get_chain_stats = get_chain_stats;
async function get_chain_stats(chain_name) {
    let raw_output = await exec_file("iptables", ["-nvL"]);

    let result = raw_output
        .split("Chain " + chain_name)[1]
        .split("Chain")[0]
        .split("\n")
        .map(v => v.trim())
        .filter(v => v)
        .slice(1);
    
    let field_names = result.shift()
        .split(" ")
        .filter(v => v);

    return result.map(v => v.split(" ").filter(v => v))
        .map(v => {
            let item = {};
            for(let i in field_names) {
                item[field_names[i]] = v[i];
            }
            
            item.pkts = parseInt(item.pkts);
            item.bytes = parseInt(item.bytes);
            item.protocol = item.prot;

            let port_desc = v[v.length - 1].split(":");
            if(port_desc[0] == "spt") {
                item.remote_ip = item.source;
            } else if(port_desc[0] == "dpt") {
                item.remote_ip = item.destination;
            } else {
                throw new Error("Invalid port description: " + port_desc.join(":"));
            }

            item.remote_port = parseInt(port_desc[1]);

            return item;
        });
}
