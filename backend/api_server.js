const ice = require("ice-node");
const TrafficMonitor = require("./traffic_monitor.js");

class ApiServer {
    constructor({ listen_addr, trafficmon }) {
        if(!(trafficmon instanceof TrafficMonitor)) {
            throw new Error("Invalid trafficmon");
        }
        this.listen_addr = listen_addr;
        this.trafficmon = trafficmon;
        this.app = new ice.Ice();

        init_app(this, this.app);
    }

    start() {
        this.app.listen(this.listen_addr);
    }
}

module.exports = ApiServer;

function init_app(server, app) {
    app.post("/connection/add", async req => {
        let data = req.json();

        await server.trafficmon.add_connection({
            protocol: data.protocol,
            remote_ip: data.remote_ip,
            remote_port: data.remote_port
        });

        return "OK";
    });

    app.post("/connection/remove", async req => {
        let data = req.json();

        let stats = await server.trafficmon.remove_connection({
            protocol: data.protocol,
            remote_ip: data.remote_ip,
            remote_port: data.remote_port
        });

        return ice.Response.json(stats);
    });

    app.get("/stats", async req => ice.Response.json(await server.trafficmon.get_stats()));
}
