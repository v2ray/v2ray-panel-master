const fs = require("fs");
const child_process = require("child_process");
const assert = require("assert");
const sleep = require("./sleep.js");

class CoreProcess {
    constructor({ binary_path, config_rw_path, initial_config }) {
        if(typeof(binary_path) != "string") {
            throw new Error("Invalid binary path");
        }
        if(typeof(config_rw_path) != "string") {
            throw new Error("Invalid config (rw) path");
        }

        this.binary_path = binary_path;
        this.config_rw_path = config_rw_path;
        this.config = initial_config;
        this.handle = null;
        this.expecting_exit = false;
    }

    start() {
        if(this.handle) throw new Error("Already started");

        fs.writeFileSync(this.config_rw_path, JSON.stringify(this.config, null, 4));

        this.handle = child_process.spawn(
            this.binary_path,
            [
                "-config",
                this.config_rw_path
            ],
            {
                stdio: "inherit"
            }
        );
        this.handle.on("error", e => {
            console.log("Error while starting / killing V2Ray process: " + e);
            process.exit(1);
        });
        this.handle.on("exit", (code, signal) => {
            if(this.expecting_exit) {
                console.log("V2Ray process exited as requested");
                this.expecting_exit = false;
                this.handle = null;
            } else {
                console.log("Unexpected exit of V2Ray process");
                this.handle = null;
                this.start();
            }
        });
    }

    kill() {
        if(!this.handle) throw new Error("Not running");
        this.handle.kill("SIGTERM");
        this.handle = null;
    }

    async restart() {
        console.log("Restarting core process");
        this.expecting_exit = true;
        this.kill();
        await sleep(1000);
        this.start();
    }

    // This will not restart the server.
    reload_config(cfg) {
        if(cfg.users) {
            this.config.inbound.settings.clients = cfg.users;
        }
    }
}

module.exports = CoreProcess;
