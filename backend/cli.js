#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const commander = require("commander");
const ApiServer = require("./api_server.js");
const MasterServer = require("./master_server.js");
const launcher = require("./launcher.js");
const package_config = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8"));

const commands = {
    "run": {
        description: "Run server",
        action: async ctx => {
            await launcher.run_with_config(ctx.config);
        }
    },
    "register": {
        description: "Register (master server only)",
        action: async ctx => {
            if(ctx.config.mode != "master") {
                throw new Error("Invalid mode: " + ctx.config.mode);
            }
            if(!ctx.params.username) throw new Error("Username required");
            if(!ctx.params.password) throw new Error("Password required");

            let server = new MasterServer({
                db_url: ctx.config.db_url,
                admin_users: ctx.config.admin_users
            });
            await server.init();

            let uid = await server.user_register(ctx.params.username, ctx.params.password);
            console.log(uid);
            process.exit(0);
        }
    }
};

async function run() {
    if(process.argv.length <= 2) {
        process.argv.push("--help");
    }

    commander
        .version(package_config.version)
        .option("-c, --config <...>", "Config file")
        .option("-u, --username <...>", "Username")
        .option("-p, --password <...>", "Password")
        .parse(process.argv);
    
    if(!commander.config) {
        throw new Error("Config file required");
    }
    
    let cfg = JSON.parse(fs.readFileSync(commander.config, "utf-8"));
    let cmd = commander.args[0];

    if(cmd && commands[cmd]) {
        await commands[cmd].action({
            params: commander,
            config: cfg
        });
    } else {
        console.log(commands);
        process.exit(0);
    }
}

run().then(_ => {}).catch(e => {
    console.log(e);
    process.exit(1);
});
