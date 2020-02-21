// ==UserScript==
// @name         Координаты карт в списке
// @namespace    https://github.com/The-Ein
// @version      0.2
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
    let links = document.querySelectorAll('a');
    for(let i = 0; i < links.length; i++){
        let link = links[i];
        if(!link.innerText.match(/Карта сокровищ/)) continue;

        let resp = await fetch(link.href).then(resp => resp.text());
        let coords = resp.match(/тут: (\d+\/\d+)/)[1];
        link.innerHTML = link.innerHTML.replace(/(сокровищ)/, '$1 '+coords);
    }
})();