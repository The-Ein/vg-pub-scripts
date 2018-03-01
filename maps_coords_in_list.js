(function(){
	function aget(url, cb){
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.onreadystatechange = function() {
		  if (xhr.readyState != 4) return;
		  if (xhr.status != 200) {
			throw new Error(xhr.status + ': ' + xhr.statusText);
		  } else {
			(typeof cb === 'function' ? cb : function(){})(xhr.responseText);
		  }
		}
		xhr.send();
	}

	var links_raw = document.querySelectorAll('a');
	for(let i = 0; i < links_raw.length; i++){
		if(!links_raw[i].innerText.match(/Карта сокровищ/)) continue;
		setTimeout(()=>{aget(links_raw[i].href, function(resp){
			var coords = resp.match(/тут: (\d+\/\d+)/)[1];
			links_raw[i].innerHTML = links_raw[i].innerHTML.replace(/(сокровищ)/, '$1 '+coords);
		})},i*150);
	}
})();