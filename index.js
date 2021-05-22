/*----------------------------------------------------------------------------------------------------------*/
/*Подключение бота к сообществу:*/
/*----------------------------------------------------------------------------------------------------------*/
const token_group = ""; // токен группы
const token_admin = ""; // токен администратора группы
let cgroup = 204671289; // id группы
const admins = [144793398, 370553427]; // id админов бота через запятую
const chatId = 1; // ID главной беседы (админов)

const { VK } = require('vk-io');
const vk = new VK({
    token: token_group,
    lang: "ru",
    pollingGroupId: cgroup,
    apiMode: "parallel"
});
const page = new VK({ token: token_admin });

const { updates } = vk;
const db = require("./modules/MongoConnect"); // Подключение к БАЗЕ ДАННЫХ!
const utils = require("./modules/utils"); // Дополнения к боту [КрасиВые деньги, ID игрока и др.]
const user = require("./modules/ProfileConnect"); // Профили игроков/информация!
const group = require("./modules/ProfileConnect"); // Профили игроков/информация!
const request = require("request"); // Запросы к сайтам!
const { vkId } = require('./modules/utils');

/*----------------------------------------------------------------------------------------------------------*/
/*Переменные:*/
/*----------------------------------------------------------------------------------------------------------*/

/*----------------------------------------------------------------------------------------------------------*/
/*Регистрация пользователя:*/
/*----------------------------------------------------------------------------------------------------------*/
console.log("Бот успешно загружен!"); // Сообщение в консоль
/*----------------------------------------------------------------------------------------------------------*/

updates.startPolling();
updates.on('message', async(msg, next) => {
    if (msg.senderId < 0) return; // Игнор если пишет группа!

    // let NewUser = await db().collection("admins").findOne({ vk: msg.senderId });
    // msg.user = await user(msg.senderId); // Взаимодействие с игроком!

    // if (!NewUser) {
    //     if (!msg.isChat) return msg.send(`🔥 у Вас нет прав для использования этим ботом \n Обратитесь к @id${ownerId}`);
    // }

    msg.original = msg.text // Так надо :D
    msg.params_org = msg.original.split(" "); // Так надо :D
    msg.params_org.shift(); // Так надо :D
    msg.params = msg.text.split(" "); // Так надо :D
    msg.params.shift(); // Так надо :D
    msg.params_alt = msg.text.split(" "); // Так надо :D

    await next(); // Так надо :/
});


//////////////////////////////////////////////////////////////////////
/*-------------------------------------------------------------------*/
/*     |                   Интервалы                   
/*-------------------------------------------------------------------*/
setInterval(() => {
    utils.getFrauds(page, cgroup);
    utils.checkConversations(page, vk, cgroup);
}, 600000);

/*-------------------------------------------------------------------*/
/*     |                   Команды                   
/*-------------------------------------------------------------------*/

//Админка
updates.hear(/^(updatedb)/ig, async(msg) => {
    await db().collection('data').updateMany({}, {
        $set: {}
    });
});

/*-------------------------------------------------------------------*/
/*     |                   Для админов беседы:                   
/*-------------------------------------------------------------------*/
updates.hear(/^([ао]став[еи]ть)/ig, async(msg) => {
    if (!msg.chatId) return msg.send(`Кого оставить то? Команда работает только в беседе 👀`);

    let peerId = Number(msg.peerId - 2000000000); // id беседы в которой вызвалась команда
    page.api.messages.getConversationMembers({
        peer_id: 2000000000 + peerId,
        group_id: cgroup
    }).then(async function(a) {
        for (let i = 0; i < a.count; i++) {
            if (a.items[i].member_id == msg.senderId) { // если пользователь админ в беседе то работаем дальше
                if (!msg.params_org[0]) return msg.send(`Пришлите мне ссылку или ID пользователя которого необходимо оставить`);
                let id = await vkId(msg.params_org[0], vk); // получение пользователя в БД которого ввели
                let t = await user(id);


                // добавляем в базу ID беседы как исключение
                let exception = t.exception;
                if (exception.includes(peerId)) return msg.send(`Вы уже добавили данного пользователя как в исключение для этой беседы ❗`);
                exception.push(peerId);
                t.exception = exception;

                // отправляем в главную беседу:
                vk.api.messages.send({
                    chat_id: chatId,
                    message: `⚠ @id${t.vk} Данного человека оставили, как не слитого в одной из бесед! Пожалуйста, ознакомьтесь со сливами и примите меры! \n
                    💌 ID беседы в которой оставили: ${peerId}\n\n
                    👉🏻 vk.com/wall${t.group}_${t.post}
                    `,
                    keyboard: JSON.stringify({
                        inline: true,
                        buttons: [
                            [{ "action": { "type": "text", "label": `Разбанить ${t.vk}` }, "color": "positive" },
                                { "action": { "type": "text", "label": `Заблокировать ${t.vk}` }, "color": "negative" }
                            ]
                        ]
                    })
                })

                return msg.send(`Хорошо, мы оставляем в данной беседе @id${t.vk} ✅ \n Теперь его не исключит система автоматически 👤`);
            } else {
                return msg.send(`Вы не администартор в этой беседе, поэтому не можете это сделать`)
            }
        }

    })
});

updates.hear(/^(исключить)/ig, async(msg) => {
    if (!msg.chatId) return msg.send(`Кого исключить то? Команда работает только в беседе 👀`);

    let peerId = Number(msg.peerId - 2000000000); // id беседы в которой вызвалась команда
    page.api.messages.getConversationMembers({
        peer_id: 2000000000 + peerId,
        group_id: cgroup
    }).then(async function(a) {
        for (let i = 0; i < a.count; i++) {
            if (a.items[i].member_id == msg.senderId) { // если пользователь админ в беседе то работаем дальше
                if (!msg.params_org[0]) return msg.send(`Пришлите мне ссылку или ID пользователя которого необходимо оставить`);
                let id = await vkId(msg.params_org[0], vk); // получение пользователя в БД которого ввели
                let t = await user(id);

                // исключаем пользователя:
                vk.api.messages.removeChatUser({
                    chat_id: peerId,
                    user_id: t.vk
                })

                // отправляем в главную беседу:
                vk.api.messages.send({
                    chat_id: chatId,
                    message: `⚠ @id${t.vk} Данного человека кикнули из беседы №${peerId} \n
                    Ссылка на пост:
                    👉🏻 vk.com/wall${t.group}_${t.post}
                    `,
                    keyboard: JSON.stringify({
                        inline: true,
                        buttons: [
                            [{ "action": { "type": "text", "label": `Разбанить ${t.vk}` }, "color": "positive" },
                                { "action": { "type": "text", "label": `Заблокировать ${t.vk}` }, "color": "negative" }
                            ]
                        ]
                    })
                })
            } else {
                return msg.send(`Вы не администартор в этой беседе, поэтому не можете это сделать`)
            }
        }

    })
});

/*-------------------------------------------------------------------*/
/*     |                  Для админов бота:                   
/*-------------------------------------------------------------------*/
updates.hear(/^(р[оа][сз]бан[еи]ть)/ig, async(msg) => {
    if (!admins.includes(msg.senderId)) return msg.send(`Ты не админ`);

    if (!msg.params_org[0]) return msg.send(`Для использования данной команды воспользуйтесь следующей формой:\n разбанить [ссылка/id] \n\nПример использования: \n разбанить https://vk.com/id0`)
    let rid = msg.params_org[0];
    let id = await vkId(rid, vk),
        t = await user(id);

    if (!t) return msg.send(`🕵 Пользователь не найден`);

    t.status = 2;

    return msg.send(`Вы успешно разблокировали [id${t.vk}|пользователя] ✅ \n 📃 Теперь его не исключат в ниодной из бесед`);
});

updates.hear(/^(з[ао]бл[ао]кир[fо]вать)/ig, async(msg) => {
    if (!admins.includes(msg.senderId)) return msg.send(`Ты не админ`);

    if (!msg.params_org[0]) return msg.send(`Для использования данной команды воспользуйтесь следующей формой:\n заблокировать [ссылка/id] \n\nПример использования: \n заблокировать https://vk.com/id0`)
    let rid = msg.params_org[0];
    let id = await vkId(rid, vk),
        t = await user(id);

    if (!t) return msg.send(`🕵 Пользователь не найден`);

    t.status = 4;

    await msg.send(`Вы успешно заблокировали [id${t.vk}|пользователя] ✅ \n 📃 Теперь его исключат со всех бесед, которые не оставили данного человека в своей беседе `);
    return utils.checkConversations(page, vk, cgroup);
});

updates.hear(/^(test)/ig, async(msg) => {
    // cgroup = [185295814];
    utils.getFrauds(page, cgroup)
        // utils.checkConversations(page, vk, cgroup)

    // utils.sendRequest(msg, VK)
    // 3f25434da3d288039b91ee79b27236d328ab5c8a4604c6aaab5b0c959e3d93cebf416fcfb7a68b06e88fc
    msg.send(`good, запустили проверку`)
});



// остальное:
updates.hear(/^(?:[0-9]+)$/i, async(msg) => {

});

updates.hear(/(.*)/igm, async(msg) => { // Навигация

});