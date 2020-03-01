// ==UserScript==
// @name         Продажа вещей из мешка
// @namespace    https://github.com/The-Ein
// @version      0.3
// @description  Добаляет в меню вещи формочку для выставлния на Торговую площадь.
// @author       TheEin
// @match        http://velgame.ru/game.php*
// @match        http://lt-site.ru/game.php*
// @license      Apache License 2.0
// @run-at       document-end
// @grant        none
// @updateURL    https://github.com/The-Ein/vg-pub-scripts/raw/master/tampermonkey/sell-from-bag.user.js
// @downloadURL  https://github.com/The-Ein/vg-pub-scripts/raw/master/tampermonkey/sell-from-bag.user.js
// ==/UserScript==

(async function() {
    let item_id = location.href.match(/game\.php\?7&\d+&\d+&(\d+)/);

    let is_locked = document.body.innerText.match(/Вещь привязана к герою/);

    if (!item_id || is_locked)
        return;

    item_id = item_id[1];

    let count = document.body.innerText.match(/Количество: (\d+)\/(\d+)/);

    if (!count)
        return;

    count = {
        curr: count[1],
        max: count[2]
    };

    let back_button = document.querySelector('a.info[href^="game.php?7&"]');

    // вставляем формочку перед кнопкой "Назад"
    back_button.parentElement.insertBefore(create_from(item_id, count), back_button);

    function create_from(item_id, count) {
        let form = document.createElement('form');

        form.action = `game.php?46&1&0&${item_id}&1`;
        form.method = "post";
        form.className = "fblock cntr";

        if (count.max == 1)
            form.innerHTML += `<input type="hidden" name="kolvo" value="1">`;
        else
            form.innerHTML += `
                <div>
                    Количество:<br>
                    <input type="number" name="kolvo" value="${count.curr}" max="${count.max}" min="1">
                </div>
            `;


        form.innerHTML += `
            <div></div>
            <div>Цена за единицу:</div>
            <div>
                <input type="text" name="cena" value="1" maxlength="9">
            </div>
            <div>
                <input class="enter bs ts" type="submit" value="выставить">
            </div>
        `;

        let frame = document.createElement('div');
        frame.className = "frame";

        frame.appendChild(form);

        return frame;
    }

})();