/*jslint esversion: 6, evil: true, loopfunc: true */
const db = require('../modules/MongoConnect');
const { VK } = require('vk-io');


// прототипы:
Array.prototype.diff = function(a) {
    return this.filter(function(i) { return a.indexOf(i) < 0; });
};

module.exports = {
    regDataFraud: async function(user, groupId, postId) { // регистрация мошенника
        let NewUser = await db().collection("fraud").findOne({ vk: user });
        if (!NewUser) {
            db().collection("fraud").insertOne({
                // Информация об игроке:
                vk: Number(user), // Вконтакте ID
                group: groupId, // группа в которой пост
                post: postId, // ID поста
                exception: [], // исключение, ID бесед где пользователя оставили
                // Данные:
                status: 0, // 0 по умолчанию статус 0 - не определено
            });
        }
    },
    getFrauds: async function(page, groups = []) {
        // let data = await db().collection("fraud").toArray(); // получаем всех сливщиков в массив Data
        // let count = 0;
        // await page.api.wall.get({ owner_id: -cgroup, count: 100 }).then(async res => {
        //     count = res.count; // количество полученных записей со стены
        // });
        // console.log(count);
        // for (z = 1; z < count; z += 100) {
        //     await page.api.wall.get({ owner_id: -cgroup, count: 100, offset: 1 }).then(async res => {
        //         for (let i = 0; i < 100; i++) {
        //             console.log(res.items[i])
        //             if (res.items[i] === null) continue;
        //             let text = res.items[i].text; // получаем текст поста
        //             let ownerId = res.items[i].owner_id; // группа в которой нашли пост
        //             let id = res.items[i].id; // id поста в группе 
        //             let fraudId = text.match(/(id\d+)/i); // ищем цифры в посте, это и есть ID "кидалы"
        //             console.log(i)
        //             console.log(fraudId)
        //             fraudId = fraudId[0].match(/(\d+)/i);
        //             // console.log(fraudId[0])

        //             page.api.users.get({ user_ids: fraudId[0] }).then(async a => {
        //                 let fraudDb = await db().collection("fraud").findOne({ vk: Number(fraudId[0]) }); // смотрим есть пользователь в БД или нет
        //                 if (!fraudDb) this.regDataFraud(fraudId[0], ownerId, id);
        //             })
        //         }
        //     }).catch(err => console.log(err));
        // }

        let posts = [];
        const data = Date.now();
        for (let j = 0; j < groups.length; j++) {
            let owner = -groups[j];
            await page.api.wall.get({
                owner_id: owner,
                count: 0
            }).then(async(res) => {
                const residue = res.count % 100;
                const count = res.count - residue;
                for (let i = 0; i < count; i += 100) {
                    await page.api.wall.get({
                        owner_id: owner,
                        count: 100,
                        offset: i
                    }).then(result => {
                        // console.log(result.items[i])
                        posts = [...posts, ...result.items];
                    });
                }
                await page.api.wall.get({
                    owner_id: owner,
                    count: residue,
                    offset: count
                }).then(result => {
                    // console.log(result)
                    posts = [...posts, ...result.items];
                });
            });
        }
        this.addDataBase(posts, page);
        console.log(Date.now() - data);
    },
    addDataBase: async function(posts, page) {
        // console.log(posts[]);

        posts.forEach((element, index) => {

            console.log(index)
            console.log(element)
            if (element.text == `` || element.text == undefined || element.text == null) return console.log(`RETURN SYKA`)
            let text = element.text; // получаем текст поста
            let ownerId = element.owner_id; // группа в которой нашли пост
            let id = element.id; // id поста в группе 
            let fraudId = text.match(/(id\d+)/i); // ищем цифры в посте, это и есть ID "кидалы"
            if (fraudId == null) return;
            console.log(fraudId[0])
            fraudId = fraudId[0].match(/(\d+)/i);

            page.api.users.get({ user_ids: fraudId[0] }).then(async a => {
                let fraudDb = await db().collection("fraud").findOne({ vk: Number(fraudId[0]) }); // смотрим есть пользователь в БД или нет
                if (!fraudDb) this.regDataFraud(fraudId[0], ownerId, id);
            })
        });
        // for (let i = 0; i < 99; i++) {
        //     // console.log(i - 1)
        //     // console.log(i)
        //     // console.log(res.items[i])
        //     let text = res.items[i].text; // получаем текст поста
        //     let ownerId = res.items[i].owner_id; // группа в которой нашли пост
        //     let id = res.items[i].id; // id поста в группе 
        //     let fraudId = text.match(/(id\d+)/i); // ищем цифры в посте, это и есть ID "кидалы"
        //     console.log(fraudId)
        //     fraudId = fraudId[0].match(/(\d+)/i);

        //     page.api.users.get({ user_ids: fraudId[0] }).then(async a => {
        //         let fraudDb = await db().collection("fraud").findOne({ vk: Number(fraudId[0]) }); // смотрим есть пользователь в БД или нет
        //         if (!fraudDb) this.regDataFraud(fraudId[0], ownerId, id);
        //     })
        // }
    },
    checkConversations: async function(page, vk, cgroup) {

        for (let i = 1; i < 10; i++) {
            page.api.messages.getConversationMembers({
                peer_id: 2000000000 + i,
                group_id: cgroup
            }).then(async function(a) {
                // return console.log(a.profiles.length)
                let peopleCount = a.profiles.length; // количество людей в беседе
                for (let j = 0; j < peopleCount; j++) {
                    let user = a.profiles[j].id;
                    console.log(user)
                    let fraudDb = await db().collection("fraud").findOne({ vk: user }); // ищем в базе
                    console.log(fraudDb)
                    if (fraudDb && fraudDb.status != 2) { // если найден в базе и не разбанен
                        console.log(`СЮДА ЗАШЛО`)
                        if (fraudDb.status == 4) { // если статус "бан" - кикаем

                            // если есть в исключении, то не кикаем:
                            // let exception = fraudDb.exception;
                            // for (let x = 0; x < exception.length; x++) { if (exception[x] == i) return } 
                            vk.api.messages.send({
                                chat_id: i,
                                message: `⚠ @id${user} был найден в наших базах!\n\n
    
                                ❗ У данного пользователя статус "забанен во всех беседах" \n
                                Исключаем его из данной беседы`,
                                keyboard: JSON.stringify({
                                    inline: true,
                                    buttons: [
                                        [{ "action": { "type": "text", "label": `Оставить ${user}` }, "color": "positive" }]
                                    ]
                                })
                            })

                            return vk.api.messages.removeChatUser({
                                chat_id: i,
                                user_id: user
                            })
                        }

                        vk.api.messages.send({
                            chat_id: i,
                            message: `⚠ @id${user} был найден в наших базах! Пожалуйста, примите меры, нажав на одну из кнопок \n\n

                            ❗ Слив в базы не может означать, что человек мошенник. \n
                            Все доказательства являются косвенными, \nпоэтому рекомендуем ознакомится со сливами,
                            прежде чем принять решение:\n\n
                            vk.com/wall${fraudDb.group}_${fraudDb.post}
                            `,
                            keyboard: JSON.stringify({
                                inline: true,
                                buttons: [
                                    [{ "action": { "type": "text", "label": `Оставить ${user}` }, "color": "positive" },
                                        { "action": { "type": "text", "label": `Исключить ${user}` }, "color": "negative" }
                                    ]
                                ]
                            })
                        })
                    };
                }
            })
        }
    },
    hundlerError: async function() {},
    vkId: function(str, vk) {
        str = str + "";
        return new Promise((r, x) => {
            if (parseInt(str) <= 1000000) {
                db().collection('fraud').findOne({
                    vk: parseInt(str)
                }, (error, user) => {
                    console.log(user)
                    if (user) { r(user.vk) } else { r(-1) }
                });
            } else if (parseInt(str) > 1000000) {
                db().collection('fraud').findOne({
                    vk: parseInt(str)
                }, (error, user) => {
                    if (user) { r(user.vk) } else { r(-1) }
                });
            } else {
                var link = str.match(/(https?:\/\/)?(m\.)?(vk\.com\/)?([a-z_0-9.]+)/i)
                if (!link) return r(-1)
                vk.api.call("utils.resolveScreenName", { screen_name: link[4] }).then(s => {
                    r(s.object_id)
                }).catch(h => {
                    r(-1);
                });
            }
        });
    },
    chunks: function(array, size) { var results = []; while (array.length) { results.push(array.splice(0, size)); } return results; },
    getUnix: function() {
        return Date.now()

    },
    unixStampLeft: function(stamp) {
        stamp = stamp / 1000;

        let s = stamp % 60;
        stamp = (stamp - s) / 60;

        let m = stamp % 60;
        stamp = (stamp - m) / 60;

        let h = (stamp) % 24;
        let d = (stamp - h) / 24;

        let text = ``;

        if (d > 0) text += Math.floor(d) + "д. ";
        if (h > 0) text += Math.floor(h) + "ч. ";
        if (m > 0) text += Math.floor(m) + "мин. ";
        if (s > 0) text += Math.floor(s) + "с.";

        return text;
    },
    random: function(min, max) {
        let rand = min + Math.random() * (max + 1 - min);
        rand = Math.floor(rand);
        return rand;
    }
};