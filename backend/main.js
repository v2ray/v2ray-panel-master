const fs = require("fs");
const TrafficMonitor = require("./traffic_monitor.js");
const ApiServer = require("./api_server.js");
const MasterServer = require("./master_server.js");

async function run() {
    let cfg = JSON.parse(fs.readFileSync(process.argv[2], "utf-8"));

    switch(cfg.mode) {
        case "master": {
            await run_master(cfg);
            break;
        }

        case "node": {
            await run_node(cfg);
            break;
        }

        default:
            throw new Error("Unknown mode: " + cfg.mode);
    }
}

run().then(_ => {}).catch(e => {
    console.log(e);
    process.exit(1);
});

async function run_node(cfg) {
    let trafficmon = new TrafficMonitor();
    await trafficmon.start();
    
    let server = new ApiServer({
        listen_addr: cfg.listen_addr,
        db_url: cfg.db_url,
        master_url: cfg.master_url,
        node_key: cfg.node_key,
        trafficmon: trafficmon
    });
    server.start();
}

async function run_master(cfg) {
    let server = new MasterServer({
        listen_addr: cfg.listen_addr,
        db_url: cfg.db_url
    });
    server.start();
}
