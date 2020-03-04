// ==UserScript==
// @name         Координаты карт в списке
// @namespace    https://github.com/The-Ein
// @version      0.6
// @description  Отображает координаты карт в списках
// @author       TheEin
// @match        http://velgame.ru/*
// @match        http://lt-site.ru/*
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
            let nearest = getNearestPoint(cached.pos);
            link.innerHTML = link.innerHTML.replace(/(сокровищ)/, `$1 ${cached.pos} ${nearest.name}`);
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
        if (coords && coords[1]) {
            let nearest = getNearestPoint(coords[1]);
            link.innerHTML = link.innerHTML.replace(
                /(сокровищ)( \d+\/\d+.*?(\())?/,
                `$1 ${coords[1]} ${nearest.name} $3`
            );

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

    function getNearestPoint(pos) {
        pos = pos.split('/');
        let y = pos[0];
        let x = pos[1];

        let nearest = null;

        getPointsList().forEach((point) => {
            let dist = distance(y, x, point.y, point.x);

            if (!nearest || nearest.dist > dist)
                nearest = {
                    point,
                    dist
                };
        });

        return nearest.point;

        function distance(y1, x1, y2, x2) {
            return Math.sqrt(
                (y1 - y2) ** 2 +
                (x1 - x2) ** 2
            )
        }
    }

    function getPointsList() {
        // http://velgame.ru/game.php?145
        return [
            { name:"Осгард",         y:21,   x:58    },
            { name:"Хазарск",        y:27,   x:121   },
            { name:"Гоблинбург",     y:111,  x:116   },
            { name:"Хант",           y:106,  x:135   },
            { name:"Помпей",         y:82,   x:99    },
            { name:"Иберий",         y:61,   x:67    },
            { name:"Рома",           y:130,  x:79    },
            { name:"Тёрн",           y:192,  x:74    },
            { name:"Трой",           y:207,  x:62    },
            { name:"Спарта",         y:173,  x:127   },
            { name:"Ренс",           y:145,  x:163   },
            { name:"Номрас",         y:307,  x:201   },
            { name:"Храссвандейл",   y:348,  x:211   },
            { name:"Марон",          y:374,  x:186   },
            { name:"Этта",           y:352,  x:249   },
            { name:"Айлендааль",     y:264,  x:205   },
            { name:"Вольфсбург",     y:244,  x:214   },
            { name:"Вольск",         y:249,  x:242   },
            { name:"Элдориан",       y:196,  x:200   },
            { name:"Нордингтон",     y:186,  x:225   },
            { name:"Скай",           y:159,  x:239   },
            { name:"Валь",           y:197,  x:163   },
            { name:"Мехтаун",        y:314,  x:58    },
        ];
    }

})();