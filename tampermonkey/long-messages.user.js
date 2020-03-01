// ==UserScript==
// @name         Длинные сообщения в чате
// @namespace    https://github.com/The-Ein
// @version      0.6
// @description  Снимает ограничение в 250 символов при написании сообщения в чат
// @author       TheEin
// @match        http://velgame.ru/game.php*
// @match        http://lt-site.ru/game.php*
// @license      Apache License 2.0
// @run-at       document-end
// @grant        none
// @updateURL    https://github.com/The-Ein/vg-pub-scripts/raw/master/tampermonkey/long-messages.user.js
// @downloadURL  https://github.com/The-Ein/vg-pub-scripts/raw/master/tampermonkey/long-messages.user.js
// ==/UserScript==

(() => {

    let form = document.querySelector('form[action^="game.php?14&"]');

    // @match не поддерживает "*" в get параметрах
    // https://developer.chrome.com/extensions/match_patterns
    if (!location.href.match(/\?14&/) || !form)
        return;

    let textarea = form.querySelector('textarea');
    let max = parseInt(textarea.getAttribute('maxlength'));
    textarea.removeAttribute('maxlength');

    let info = document.createElement('div');
    info.className = 'small';
    form.insertBefore(info, textarea);

    textarea.oninput = () => {
        let parts = split(textarea.value);
        let lastLength = parts[parts.length - 1].length;
        let word = messageWord(parts.length);
        info.innerHTML = `${parts.length} ${word}. Осталось символов ≈${max - lastLength}`;
    }
    // вызываем для того что бы появился текст
    textarea.oninput();

    document.querySelector('form').onsubmit = (e) => {
        let text = textarea.value;
        if (text.length <= max)
            return true;

        // делаем магию только если сообщение очень длинное
        e.preventDefault();

        send(text);

        return false;
    }

    async function send(text) {
        text = split(text);
        let referrer = location.href;

        for (let i = 0; i < text.length; i++) {
            // что бы самому не собирать тело запроса,
            // просто пихаем по очереди все куски в textarea
            // и сериализуем местными функциями
            textarea.value = text[i];
            let data = new URLSearchParams(new FormData(form)).toString();

            let html = await fetch(form.action, {
                "credentials": "include",
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "content-type": "application/x-www-form-urlencoded",
                    "upgrade-insecure-requests": "1"
                },
                "referrer": referrer,
                "referrerPolicy": "no-referrer-when-downgrade",
                "body": data,
                "method": "POST",
                "mode": "cors"
            }).then(resp => resp.text());

            // как оказалось, для того что бы отправлять кучу сообщений
            // нужно делать вид что мы честно жмём на кнопки "Отправить" и "Написать"
            let writeLinkHash = html.match(/\|(\d+)">Написать/)[1];
            referrer = referrer.replace(/\|.+/, `|${writeLinkHash}`);
            console.log(referrer);
            await fetch(referrer); // "Написать"
        }

        // Нагло пользуемся тем, что пустая форма перенаправляет в чат,
        // из которого мы пришли
        textarea.value = '';
        form.submit();
    }

    function split(text) {
        let parts = [];

        while (text.length) {
            // удаляем пустые символы в начале
            text = text.replace(/^\s+/, '');

            // отрезаем кусок
            let part = text.slice(0, max);
            text = text.slice(max);

            // если кусок заканчивается на непробельный символ
            // и оставшаяся часть начинается с не пробельного,
            // то высока вероятность, что мы разрезали слово
            let indiv = part.match(/\s$/) || text.match(/^\s/);

            // или если это был последний кусок
            indiv = indiv || !text.length;

            // если в куске нет пробелов, то и не пытаемся
            indiv = indiv || !part.match(/\s/);
            if (indiv) {
                parts.push(part);
                continue;
            }

            // иначе возвращаем огрызок в остаток
            let subpart = part.match(/\S+$/)[0];

            part = part.slice(0, max - subpart.length);
            text = subpart.concat(text);

            parts.push(part);
        }

        // если текст получился пустым
        return parts.length ? parts : [''];
    }

    function messageWord(count) {
        let lastDigit = count.toString().match(/(\d)$/)[1];

        // 5/6/7/11/25/37 сообщений
        if ((count >= 5 && count <= 20) || lastDigit >= 5)
            return 'сообщений';
        // 21/51/101/100501 сообщение
        if (lastDigit == 1)
            return 'сообщение';
        // 22/73/144 сообщения
        return 'сообщения'
    }
})()