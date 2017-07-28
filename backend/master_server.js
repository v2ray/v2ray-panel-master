const ice = require("ice-node");
const MongoClient = require("mongodb").MongoClient;

class MasterServer {
    constructor({ listen_addr, db_url }) {
        this.listen_addr = listen_addr;
        this.db_url = db_url;
        this.app = new ice.Ice();
        this.ev_queue = [];
        this.db = null;

        init_app(this, this.app);
    }

    async start() {
        this.db = await MongoClient.connect(this.db_url);
        this.app.listen(this.listen_addr);
    }

    add_event(ev) {
        this.ev_queue.push(ev);
    }
}

module.exports = MasterServer;

function init_app(server, app) {
    app.post("/sync", async req => {
        let data = req.json();
        let key = data.key;
        if(typeof(key) != "string") throw new Error("Invalid key type");

        let r = await server.db.collection("nodes").find({
            key: key
        }).limit(1).toArray();
        if(!r || !r.length) {
            return "Invalid key";
        }
        r = r[0];

        if(data.events) {
            console.log(`Received ${data.events.length} events`);
            for(const ev of data.events) {
                try {
                    switch(ev.type) {
                        case "inc_user_traffic": {
                            let user = server.db.collection("users").find({
                                id: ev.user_id
                            }).limit(1).toArray();
                            if(!user || !user.length) {
                                console.log("User not found: " + ev.user_id);
                                break;
                            }

                            server.db.collection("users").updateOne({
                                id: ev.user_id
                            }, {
                                $inc: {
                                    used_traffic: ev.dt
                                }
                            });
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
        let ev_queue = server.ev_queue;
        server.ev_queue = [];
        return ice.Response.json(ev_queue);
    });
}
