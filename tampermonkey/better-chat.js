(function better_chat(argument) {

    if (!$('header').text().match(/Чат/))
        return;

    let log = console.log;

    log('better chat');


    getNewMessages();


    async function getNewMessages() {
        let update_url = this.update_url || location.href;

        let html = await fetch(update_url).then(r => r.text());

        let $container = $('<div>');
        //$container.attr('id', `cont${Math.random()}${Math.random()}${Math.random()}`.replace(/[^0-9cont]/gm);)
        //$container.css('display', 'none');
        $(document.body).append($container);

        html = html.replace(/.*<body.*?>(.+?)<\/body>.*/gm, '$1');
        $container.html(html);

        $container.find('.main > a.info').each(function() {
            if ($(this).text() === 'Обновить')
                update_url = $(this).attr('href');
        });
        this.update_url = update_url;

        let messages = parseMessages($container.find('.frame > .chblock0'));

        log(messages);
    }

    function parseMessages($list) {
        let list = [];

        $list.each(function() {
            let $message = $(this);

            let info = {};
            list.push(info);

            info.time = $message.find('.small.f3:first-child').text();


            let time = info.time.split(':');
            info.timestamp = new Date();
            info.timestamp.setHours(time[0]);
            info.timestamp.setMinutes(time[1]);
            info.timestamp.setSeconds(time[2]);
			// не реальный timestamp. Нужен только для того что бы сравнивать сообщения по времени            
            info.timestamp = info.timestamp.getTime();


            info.sender = $message.find('a.bold.f2');
            info.sender = {
                name: info.sender.text(),
                link: info.sender.attr('href')
            };

            let $receiver = $message.find('.abzac .bold.f23');
            info.receiver = $receiver.text().replace(/, /, '');
            $receiver.remove();

            info.text = '';
            $message.find('.abzac').each(function() {
                info.text += $(this)[0].outerHTML;
            });
        });

        return list;
    }


})()