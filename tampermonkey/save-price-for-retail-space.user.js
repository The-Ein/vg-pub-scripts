// ==UserScript==
// @name         Сохранение последней цены за предмет
// @namespace    https://github.com/The-Ein
// @version      0.2
// @description  Автоматически заполняет поле цены, при выставлении товара на ТП, последней ценой за этот товар.
// @author       TheEin
// @match        http://velgame.ru/game.php*
// @match        http://lt-site.ru/game.php*
// @license      Apache License 2.0
// @run-at       document-end
// @grant        none
// @updateURL    https://github.com/The-Ein/vg-pub-scripts/raw/master/tampermonkey/save-price-for-retail-space.user.js
// @downloadURL  https://github.com/The-Ein/vg-pub-scripts/raw/master/tampermonkey/save-price-for-retail-space.user.js
// ==/UserScript==

(async function() {
    let form = document.querySelector('[action^="game.php?46&"]');
    if (!form)
        return;

    let item_name = document.body.innerHTML.match(/(\{\d+\} .+?)</);
    if (!item_name)
        return;
    item_name = item_name[1];

    let price_input = form.querySelector('[name="cena"]');

    let price = getPrice(item_name);
    if (price)
        price_input.value = price;

    form.addEventListener('submit', () => {
        savePrice(item_name, price_input.value);
    });


    function savePrice(id, price) {
        let prices = JSON.parse(localStorage['ein-retail-prices-cache'] || '{}');
        prices[id] = price;
        localStorage['ein-retail-prices-cache'] = JSON.stringify(prices);
    }

    function getPrice(id) {
        let prices = JSON.parse(localStorage['ein-retail-prices-cache'] || '{}');
        return parseInt(prices[id]);
    }
})();