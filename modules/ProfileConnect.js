/*jslint esversion: 6, evil: true, loopfunc: true */

const db = require('../modules/MongoConnect');

module.exports = (id, error) => {
    return new Promise((resolve) => {
        db().collection("fraud").findOne({
            vk: id
        }, (error, user) => {
            if (user == null) return resolve({ error: "ERROR BLYAT DEBIL" });
            resolve(new Proxy(user, {
                set(_, key, value) {
                    db().collection("fraud").updateOne({
                        vk: id
                    }, {
                        $set: {
                            [key]: value
                        }
                    });
                    return Reflect.set(...arguments);
                }
            }));
        });
    });
};