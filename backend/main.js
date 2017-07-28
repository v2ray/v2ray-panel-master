const TrafficMonitor = require("./traffic_monitor.js");
const ApiServer = require("./api_server.js");

async function run() {
    let trafficmon = new TrafficMonitor();
    await trafficmon.start();
    
    let server = new ApiServer({
        listen_addr: "127.0.0.1:4327",
        trafficmon: trafficmon
    });
    server.start();
}

run().then(_ => {}).catch(e => console.log(e));
