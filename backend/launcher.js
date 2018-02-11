const fs = require("fs");
const tmp = require("tmp");
const path = require("path");
const TrafficMonitor = require("./traffic_monitor.js");
const CoreProcess = require("./core_process.js");

module.exports.run_with_config_file = run_with_config_file;
async function run_with_config_file(cfg_path) {
    let cfg;
    try {
        cfg = JSON.parse(fs.readFileSync(cfg_path, "utf-8"));
    } catch(e) {
        throw new Error("Unable to load config file: " + e);
    }

    await run_with_config(cfg);
}

module.exports.run_with_config = run_with_config;
async function run_with_config(cfg) {
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

async function run_node(cfg) {
    const ApiServer = require("./api_server.js");

    let trafficmon = new TrafficMonitor();
    await trafficmon.start();

    let tmp_dir = tmp.dirSync();
    let config_rw_path = path.join(tmp_dir.name, "config.json");

    console.log("Created temporary config.json: " + config_rw_path);

    let core_process = new CoreProcess({
        binary_path: cfg.binary_path,
        config_rw_path: config_rw_path,
        initial_config: cfg.v2ray_config
    });
    core_process.start();
    
    let server = new ApiServer({
        listen_addr: cfg.listen_addr,
        db_url: cfg.db_url,
        master_url: cfg.master_url,
        node_key: cfg.node_key,
        trafficmon: trafficmon,
        core_process: core_process
    });
    server.start();
}

async function run_master(cfg) {
    const MasterServer = require("./master_server.js");

    let server = new MasterServer({
        listen_addr: cfg.listen_addr,
        db_url: cfg.db_url,
        admin_users: cfg.admin_users
    });
    server.start();
}
