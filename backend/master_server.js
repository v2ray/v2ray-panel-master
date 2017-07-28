const ice = require("ice-node");
const MongoClient = require("mongodb").MongoClient;
const bcrypt = require("bcrypt");
const uuid = require("uuid");
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const User = require("./user.js");

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

    async user_register(name, pw) {
        assert(typeof(name) == "string" && typeof(pw) == "string");

        let u = await this.db.collection("users").find({
            name: name
        }).limit(1).toArray();
        if(u && u.length) {
            throw new Error("User already exists");
        }

        if(!check_username(name)) {
            throw new Error("Invalid username");
        }

        if(!check_password(pw)) {
            throw new Error("Invalid password");
        }

        let id = uuid.v4();
        let pw_hashed = await bcrypt.hash(pw, 10);

        await this.db.collection("users").insertOne({
            id: id,
            name: name,
            password_hashed: pw_hashed
        });
    }

    async user_login(name, pw) {
        assert(typeof(name) == "string" && typeof(pw) == "string");

        let u = await this.db.collection("users").find({
            name: name
        }).limit(1).toArray();
        if(!u || !u.length) {
            throw new Error("Incorrect username or password");
        }
        u = u[0];

        let compare_result = await bcrypt.compare(pw, u.password_hashed);
        if(!compare_result) {
            throw new Error("Incorrect username or password");
        }

        return u.id;
    }
}

module.exports = MasterServer;

function init_app(server, app) {
    const templates = [
        "base.html",
        "user_login.html",
        "user_register.html",
        "console.html"
    ];

    for(const fn of templates) {
        app.add_template(fn, fs.readFileSync(path.join(__dirname, "../templates/" + fn), "utf-8"));
    }

    app.use("/static/", ice.static(path.join(__dirname, "../static")));
    app.use("/user/", new ice.Flag("init_session"));
    app.use("/user/console/", async req => {
        if(!req.session.user_id) {
            throw new ice.Response({
                status: 302,
                headers: {
                    Location: "/user/login"
                },
                body: "Redirecting"
            });
        }
        req.user = await User.load_from_database(server.db, req.session.user_id);
    });

    app.get("/user/login", req => new ice.Response({
        template_name: "user_login.html",
        template_params: {}
    }));
    app.post("/user/login/verify", async req => {
        let data = req.form();
        let user_id;

        try {
            user_id = await server.user_login(data.username, data.password);
        } catch(e) {
            return "" + e;
        }

        req.session.user_id = user_id;
        return new ice.Response({
            status: 302,
            headers: {
                Location: "/user/console/index"
            },
            body: "Redirecting"
        });
    });

    app.get("/user/register", req => new ice.Response({
        template_name: "user_register.html",
        template_params: {}
    }));
    app.post("/user/register/do", async req => {
        let data = req.form();

        try {
            await server.user_register(data.username, data.password);
        } catch(e) {
            return "" + e;
        }

        return new ice.Response({
            status: 302,
            headers: {
                Location: "/user/login"
            },
            body: "Redirecting"
        });
    });

    app.get("/user/console/index", req => {
        return new ice.Response({
            template_name: "console.html",
            template_params: {
                username: req.user.name,
                total_traffic: "" + ((req.user.traffic.total || 0) / 1048576) + " M",
                used_traffic: "" + ((req.user.traffic.used || 0) / 1048576) + " M"
            }
        });
    })

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

function check_username(name) {
    if(typeof(name) != "string" || name.length < 3) return false;
    for(let i = 0; i < name.length; i++) {
        let ch = name[i];
        if(
            (ch >= 'A' && ch <= 'Z')
            || (ch >= 'a' && ch <= 'z')
            || (ch >= '0' && ch <= '9')
            || ch == '-'
            || ch == '_'
        ) {
            continue;
        } else {
            return false;
        }
    }
    return true;
}

function check_password(pw) {
    if(typeof(pw) != "string" || pw.length < 6) {
        return false;
    }
    return true;
}
