// ==UserScript==
// @name         Координаты карт в списке
// @namespace    https://github.com/The-Ein
// @version      0.3
// @description  Отображает координаты карт в списках
// @author       TheEin
// @match        http://velgame.ru/*
// @license      Apache License 2.0
// @run-at       document-end
// @grant        none
// @updateURL    https://github.com/The-Ein/vg-pub-scripts/raw/master/tampermonkey/maps-coords-in-list.user.js
// @downloadURL  https://github.com/The-Ein/vg-pub-scripts/raw/master/tampermonkey/maps-coords-in-list.user.js
// ==/UserScript==

(async function(){
    let cache = JSON.parse(localStorage['ein-maps-coords-cache'] || '{}');
    let time = (new Date()).getTime();
    let cache_time_ms = 1000 * 60 * 60 * 2; // кешируем на 2 часа

    // удаляем старые данные
    Object.keys(cache).forEach(key => {
    	if(time - cache[key].time > cache_time_ms)
    		delete cache[key];
    })

    let links = document.querySelectorAll('a');
    let maps_links = [];
    // первым проходом сортируем ссылки и выводим значения из кеша
    for(let i = 0; i < links.length; i++){
        let link = links[i];
        if(!link.innerText.match(/Карта сокровищ/)) continue;

        // http://velgame.ru/game.php?7&1&0&21|322106 -> game.php?7&1&0&21
        let cached = cache[link.href.replace(/.*(game.+?)\|.*/, '$1')];
        if(cached){
        	link.innerHTML = link.innerHTML.replace(/(сокровищ)/, '$1 ' + cached.pos);
        	maps_links.push(link);
        }else{
        	// если ссылки не было в кеше, то у неё больше приоритет 
        	maps_links.unshift(link);
        }
    }

    // запрашиваем те ссылки про которые ничего не знаем и пишем в кеш
    // иногда может случиться так, что вещи пересортировались, 
    // как следствие ссылки будут невалидными
    // из-за этого в любом случае проверяем все ссылки 
    // и если что-то не так, то обновляем кеш
    for(let i = 0; i < maps_links.length; i++){
    	let link = maps_links[i];
    	let resp = await fetch(link.href).then(resp => resp.text());
        let coords = resp.match(/тут: (\d+\/\d+)/);
        // может вернуться страница "Идёт бой" или "Ошибка авторизации"
        if(coords) {
        	link.innerHTML = link.innerHTML.replace(/(сокровищ)( \d+\/\d+)?/, '$1 ' + coords[1]);
        	
        	let key = link.href.replace(/.*(game.+?)\|.*/, '$1');
        	// если не было - добавляем, если свежие - обновляем
        	if(!cache[key] || cache[key].pos !== coords[1])
	        	cache[link.href.replace(/.*(game.+?)\|.*/, '$1')] = {
	        		pos: coords[1],
	        		time: time
	        	};
        }
    }

    localStorage['ein-maps-coords-cache'] = JSON.stringify(cache);
})();