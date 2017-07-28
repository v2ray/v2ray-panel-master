class User {
    constructor(data) {
        this.init(data);
    }

    init(data) {
        this.id = data.id;
        this.traffic = {
            total: data.total_traffic,
            used: data.used_traffic
        };
    }

    traffic_is_ok() {
        return this.traffic.used < this.traffic.total;
    }

    async inc_used_traffic(db, dt) {
        this.traffic.used += dt;
        await db.collection("users").updateOne({
            id: this.id
        }, {
            $inc: {
                used_traffic: dt
            }
        });

        // Keep sync with master.
        this.init(await User.get_info_from_database(db, this.id));
    }

    static async get_info_from_database(db, user_id) {
        let r = await db.collection("users").find({
            id: user_id
        }).limit(1).toArray();
        if(!r || !r.length) {
            throw new Error("User not found");
        }
        return r[0];
    }

    static async load_from_database(db, user_id) {
        let r = await User.get_info_from_database(db, user_id);
        return new User(r);
    }
}

module.exports = User;
