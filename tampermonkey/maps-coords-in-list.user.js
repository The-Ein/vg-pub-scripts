// ==UserScript==
// @name         Координаты карт в списке
// @namespace    https://github.com/The-Ein
// @version      0.4
// @description  Отображает координаты карт в списках
// @author       TheEin
// @match        http://velgame.ru/*
// @license      Apache License 2.0
// @run-at       document-end
// @grant        none
// @updateURL    https://github.com/The-Ein/vg-pub-scripts/raw/master/tampermonkey/maps-coords-in-list.user.js
// @downloadURL  https://github.com/The-Ein/vg-pub-scripts/raw/master/tampermonkey/maps-coords-in-list.user.js
// ==/UserScript==

(async function() {
    clearMapCache();

    let links = document.querySelectorAll('a');
    let maps_links = [];
    // первым проходом сортируем ссылки и выводим значения из кеша
    for (let i = 0; i < links.length; i++) {
        let link = links[i];
        if (!link.innerText.match(/Карта сокровищ/)) continue;

        let cached = getMap(link.href);
        if (cached) {
            link.innerHTML = link.innerHTML.replace(/(сокровищ)/, '$1 ' + cached.pos);
            maps_links.push(link);
        } else {
            // если ссылки не было в кеше, то у неё больше приоритет 
            maps_links.unshift(link);
        }
    }

    // запрашиваем те ссылки про которые ничего не знаем и пишем в кеш
    // иногда может случиться так, что вещи пересортировались, 
    // как следствие ссылки будут невалидными
    // из-за этого в любом случае проверяем все ссылки 
    // и если что-то не так, то обновляем кеш
    for (let i = 0; i < maps_links.length; i++) {
        let link = maps_links[i];
        let resp = await fetch(link.href).then(resp => resp.text());
        let coords = resp.match(/тут: (\d+\/\d+)/);
        // может вернуться страница "Идёт бой" или "Ошибка авторизации"
        if (coords) {
            link.innerHTML = link.innerHTML.replace(/(сокровищ)( \d+\/\d+)?/, '$1 ' + coords[1]);

            let cached = getMap(link.href);

            // если не было - добавляем, если свежие - обновляем
            if (!cached || cached.pos !== coords[1])
                setMap(link.href, coords[1])
        }
    }

    function clearMapCache() {
        let cache = JSON.parse(localStorage['ein-maps-coords-cache'] || '{}');
        let time = (new Date()).getTime();
        let cache_time_ms = 1000 * 60 * 60 * 2; // кешируем на 2 часа

        // удаляем старые данные
        Object.keys(cache).forEach(key => {
            if (time - cache[key].time > cache_time_ms)
                delete cache[key];
        });

        localStorage['ein-maps-coords-cache'] = JSON.stringify(cache);
    }

    function getMap(link) {
        let cache = JSON.parse(localStorage['ein-maps-coords-cache'] || '{}');

        let key = linkToKey(link);

        return cache[key];
    }

    function setMap(link, pos) {
        let cache = JSON.parse(localStorage['ein-maps-coords-cache'] || '{}');

        let key = linkToKey(link);
        let time = (new Date()).getTime();

        cache[key] = {
            pos,
            time
        }

        localStorage['ein-maps-coords-cache'] = JSON.stringify(cache);
    }

    function linkToKey(link) {
        // http://velgame.ru/game.php?7&1&0&21|322106 -> game.php?7&21
        return link.replace(/.*(game\.php\?\d+)&\d+&\d+(&\d+).*\|.*/, '$1$2');
    }

})();