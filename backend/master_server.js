const ice = require("ice-node");
const MongoClient = require("mongodb").MongoClient;
const bcrypt = require("bcrypt");
const uuid = require("uuid");
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const User = require("./user.js");

class MasterServer {
    constructor({ listen_addr, db_url, admin_users }) {
        this.listen_addr = listen_addr;
        this.db_url = db_url;
        this.admin_users = admin_users;
        this.admin_mapping = {};
        this.app = new ice.Ice();
        this.ev_queue = [];
        this.node_ev_revs = {};
        this.db = null;

        for(const uid of this.admin_users) {
            this.admin_mapping[uid] = true;
        }

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
            password_hashed: pw_hashed,
            register_time: Date.now()
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
        "console.html",
        "admin_base.html",
        "admin.html",
        "users.html",
        "user_settings.html",
        "nodes.html",
        "node_remove_confirm.html"
    ];

    for(const fn of templates) {
        app.add_template(fn, fs.readFileSync(path.join(__dirname, "../templates/" + fn), "utf-8"));
    }

    const must_read_user_info = async req => {
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
    };

    const require_admin = req => {
        if(!req.user || !server.admin_mapping[req.user.id]) {
            throw new ice.Response({
                status: 403,
                body: "This page is only available to administrators."
            });
        }
    };

    app.use("/static/", ice.static(path.join(__dirname, "../static")));

    app.use("/verify_login", new ice.Flag("init_session"));
    app.use("/logout", new ice.Flag("init_session"));
    app.use("/user/", new ice.Flag("init_session"));
    app.use("/user/console/", must_read_user_info);

    app.use("/admin/", new ice.Flag("init_session"));
    app.use("/admin/", must_read_user_info);
    app.use("/admin/", require_admin);

    app.get("/", req => new ice.Response({
        status: 302,
        headers: {
            Location: "/user/console/index"
        },
        body: "Redirecting"
    }));

    app.get("/user/login", req => new ice.Response({
        template_name: "user_login.html",
        template_params: {}
    }));
    app.post("/verify_login", async req => {
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
    app.post("/logout", req => {
        req.session.user_id = null;
        return new ice.Response({
            status: 302,
            headers: {
                Location: "/"
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
                user_id: req.user.id,
                total_traffic: req.user.traffic.total || 0,
                used_traffic: req.user.traffic.used || 0
            }
        });
    });

    app.get("/admin/index", req => new ice.Response({
        template_name: "admin.html",
        template_params: {}
    }));

    app.get("/admin/users", async req => {
        let users = await server.db.collection("users").find().sort({
            register_time: -1
        }).toArray();
        users = users.map(u => {
            return {
                id: u.id,
                name: u.name,
                register_time: new Date(u.register_time || 0).toLocaleString(),
                total_traffic: u.total_traffic || 0,
                used_traffic: u.used_traffic || 0
            };
        });
        return new ice.Response({
            template_name: "users.html",
            template_params: {
                users: users
            }
        });
    });

    app.get("/admin/users/:id", async req => {
        let id = req.params.id;
        let u;
        try {
            u = await User.load_from_database(server.db, id);
        } catch(e) {
            return "Invalid user id";
        }
        return new ice.Response({
            template_name: "user_settings.html",
            template_params: {
                user_id: u.id,
                username: u.name,
                used_traffic: u.traffic.used,
                total_traffic: u.traffic.total
            }
        });
    });

    app.get("/admin/nodes", async req => {
        let nodes = await server.db.collection("nodes").find().sort({
            create_time: -1
        }).toArray();
        nodes = nodes.map(v => {
            return {
                name: v.name || "",
                key: v.key,
                create_time: v.create_time || 0
            };
        });
        return new ice.Response({
            template_name: "nodes.html",
            template_params: {
                nodes: nodes
            }
        });
    });

    app.post("/admin/nodes/create", async req => {
        let body = req.form();
        let name = body.name;
        if(!name || !check_node_name(name)) return "Invalid name";
        if(await server.db.collection("nodes").find({ name: name }).limit(1).count()) {
            return "Duplicate name";
        }
        await server.db.collection("nodes").insertOne({
            key: uuid.v4(),
            name: name,
            create_time: Date.now()
        });
        return new ice.Response({
            status: 302,
            headers: {
                Location: "/admin/nodes"
            },
            body: "Redirecting"
        });
    });

    app.post("/admin/nodes/sync_traffic", async req => {
        let users = await server.db.collection("users").find({}).toArray();
        for(const u of users) {
            server.add_event({
                type: "update_user_traffic",
                user_id: u.id,
                total_traffic: u.total_traffic,
                used_traffic: u.used_traffic
            });
        }
        return "OK";
    })

    app.get("/admin/nodes/remove/confirm/:key", async req => {
        let node = await server.db.collection("nodes").find({
            key: req.params.key
        }).limit(1).toArray();
        if(!node || !node.length) return "Node not found";

        node = node[0];

        return new ice.Response({
            template_name: "node_remove_confirm.html",
            template_params: {
                name: node.name,
                key: node.key
            }
        });
    })

    app.post("/admin/nodes/remove/do/:key", async req => {
        let body = req.form();
        let confirm_name = body.name;
        if(!confirm_name) return "Invalid name";

        let node = await server.db.collection("nodes").find({
            key: req.params.key
        }).limit(1).toArray();
        if(!node || !node.length) return "Node not found";

        node = node[0];

        if(node.name != confirm_name) {
            return "Incorrect name";
        }

        await server.db.collection("nodes").deleteOne({
            key: req.params.key
        });
        return "OK";
    });

    app.post("/admin/action/set_user_traffic", async req => {
        let data = req.form();
        let user_id = data.user_id;

        let u;

        try {
            u = await User.load_from_database(server.db, user_id);
        } catch(e) {
            return "User not found";
        }

        if(typeof(data.total_traffic) == "string" && data.total_traffic) {
            let total = parseInt(data.total_traffic);
            await u.set_total_traffic(server.db, total);
        }
        if(typeof(data.used_traffic) == "string" && data.used_traffic) {
            let used = parseInt(data.used_traffic);
            await u.set_used_traffic(server.db, used);
        }

        server.add_event({
            type: "update_user_traffic",
            user_id: user_id,
            total_traffic: u.traffic.total,
            used_traffic: u.traffic.used
        });

        return new ice.Response({
            status: 302,
            headers: {
                Location: "/admin/users"
            },
            body: "Redirecting"
        });
    });

    app.post("/sync", async req => {
        let data = req.json();
        let key = data.key;
        if(typeof(key) != "string") throw new Error("Invalid key type");

        let node = await server.db.collection("nodes").find({
            key: key
        }).limit(1).toArray();
        if(!node || !node.length) {
            return "Invalid key";
        }
        node = node[0];

        let rev = server.node_ev_revs[key] || 0;

        if(data.events) {
            console.log(`Received ${data.events.length} events from node ${node.name}`);
            for(const ev of data.events) {
                try {
                    switch(ev.type) {
                        case "inc_used_traffic": {
                            let user = await server.db.collection("users").find({
                                id: ev.user_id
                            }).limit(1).toArray();
                            if(!user || !user.length) {
                                console.log("User not found: " + ev.user_id);
                                break;
                            }

                            await server.db.collection("users").updateOne({
                                id: ev.user_id
                            }, {
                                $inc: {
                                    used_traffic: ev.dt
                                }
                            });
                            let current = (await server.db.collection("users").find({
                                id: ev.user_id
                            }).limit(1).toArray())[0];
                            server.ev_queue.push({
                                type: "update_user_traffic",
                                user_id: ev.user_id,
                                used_traffic: current.used_traffic,
                                total_traffic: current.total_traffic
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
        server.node_ev_revs[key] = server.ev_queue.length;
        let ev_queue = [];
        for(let i = rev; i < server.ev_queue.length; i++) {
            ev_queue.push(server.ev_queue[i]);
        }
        return ice.Response.json({
            err: 0,
            msg: "OK",
            events: ev_queue
        });
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

function check_node_name(name) {
    return check_username(name);
}

function check_password(pw) {
    if(typeof(pw) != "string" || pw.length < 6) {
        return false;
    }
    return true;
}
