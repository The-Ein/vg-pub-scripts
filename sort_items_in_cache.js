function get_list(doc){
	let raw_list = doc.find('div.frame > a:nth-child(n+2)');
    let list = [];
    for (let i = 0; i < raw_list.length; i++) {
        let item = $(raw_list.get(i));
        item = {
            text: item.text().match(/(\{.+) \[/)[1],
            link: item.attr('href').match(/(.+)\|/)[1],
            count: item.text().match(/ \[(\d+)\]/)[1]
        };
        list.push(item);
    }
	return list;
}

function sort_list(list){
	console.log('sort_list', list.length);
	list.sort((a, b) => {
    	return a.text.localeCompare(b.text)
    });
    let counts = 0;
    for (let i = 0; i < list.length; i++) {
        setTimeout(function(){$.get(list[i].link, {}, function(resp) {
            list[i].max = (resp.match(/Количество: \d+\/(\d+)/) || [1, 1])[1];
            if (++counts == list.length) sort_cache_items(list);
        })},tik*i);
    }
}

function find_in_bag(find, count, cb, page_link, pages) {
    console.log('fib', find, count);
    $.get(page_link || '/game.php?26', {}, function(resp) {
        resp = $(resp);
        let finded_item = false;
        let items = resp.find('a:nth-child(n+2)');
        items.each((i) => {
            let item = $(items.get(i)).text();
            let true_item = item.indexOf(find) !== -1;
            if (true_item && item.match(/ \[(\d+)\]/)[1] >= count) {
                finded_item = $(items.get(i));
                return false;
            }
        });
        console.log(finded_item);
        if (finded_item)
            return cb({
                text: finded_item.text().match(/(\{.+) \[/)[1],
                link: finded_item.attr('href').match(/(.+)\|/)[1],
                count: Number(finded_item.text().match(/ \[(\d+)\]/)[1])
            });
        let links = pages || resp.find('div:nth-child(n+10) > a');
        if (!links.length) throw new Error('some shit happened');
        find_in_bag(find, count, cb, links.splice(0, 1), links);
    });
}

function sort_cache_items(list, last_item) {
    console.log('sci', list, last_item);
    last_item = last_item || {};
    let item = list.shift();
    $.post(item.link + '&1', {
        kolvo: item.count
    }, () => {
        find_in_bag(item.text, item.count, (bag_item) => {
            if (last_item.text == bag_item.text) {
                console.log('fib_cb', item.text, item.count);
                let count = (last_item.max < bag_item.count + last_item.count) ? (last_item.max - last_item.count) : bag_item.count;
                console.log('count', count);
                $.post(bag_item.link + '&1', {
                    kolvo: count
                });
                console.log(count, bag_item.count, bag_item.count + last_item.count, last_item.max - last_item.count);
                if (count != bag_item.count) {
                    $.post(bag_item.link + '&1', {
                        kolvo: bag_item.count - count
                    });
                    last_item = Object.assign(last_item, bag_item, );
                    last_item.count -= count;
                } else if (last_item.max == bag_item.count + last_item.count) {
                    last_item = {};
                } else {
                    last_item = Object.assign(last_item, bag_item);
                }
            } else {
                $.post(bag_item.link + '&1', {
                    kolvo: bag_item.count
                });
                last_item = Object.assign(last_item, bag_item);
            }
            last_item.max = item.max;
            if (list.length)
                sort_cache_items(list, last_item)
            else
                console.log('end');
        });
    });
}

var tik = 300;
var items_list = get_list($('body'));
var lists_count = 0;
var lists = $('div:nth-child(n+10) > a');
if (!lists.length) sort_list(items_list);
lists.each((i, item)=>{
    item = $(item);
    $.get(item.attr('href'), {}, function(resp){
        items_list = items_list.concat(get_list($(resp)));
        console.log(($(resp).find('div.frame > a:nth-child(n+2)')));
        if(++lists_count == lists.length) sort_list(items_list);
    });
});