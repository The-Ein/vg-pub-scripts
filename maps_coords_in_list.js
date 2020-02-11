(async function(){
    let links = document.querySelectorAll('a');
    for(let i = 0; i < links.length; i++){
        let link = links[i];
        if(!link.innerText.match(/Карта сокровищ/)) continue;

        let resp = await aget(link.href);
        let coords = resp.match(/тут: (\d+\/\d+)/)[1];
		link.innerHTML = link.innerHTML.replace(/(сокровищ)/, '$1 '+coords);
    }

    function aget(url){
		return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function() {
              if (xhr.readyState != 4) return;
              if (xhr.status != 200) {
                reject(xhr.status + ': ' + xhr.statusText);
              } else {
                resolve(xhr.responseText);
              }
            }
            xhr.send();
        });
	}
})();
