(function better_chat(argument) {

    if (!$('header').text().match(/Чат/))
        return;

    let log = console.log;

    log('better chat');

    loadCustomCss();

    let $main_container = $('body > .main .chblock0').parent();

    printMessages(
        parseMessages($main_container.find('.chblock0')),
        $main_container
    );

    setInterval(() => getNewMessages().then(messages => {
        printMessages(messages, $main_container);
    }), 1000);

    /*----------------------*/
    /*----------------------*/
    /*----------------------*/

    function printMessages(list, $container) {

        let repack = [];

        let last_ind = () => repack.length - 1;
        for (let i = 0; i < list.length; i++) {
            let message = list[i];
            if (repack.length === 0) {
                repack.push(message);
                continue;
            }

            let last_message = repack[last_ind()];

            let time_diff = last_message.timestamp - message.timestamp;
            let is_same_receiver = last_message.receiver === message.receiver;
            let is_same_sender = last_message.sender.name === message.sender.name;

            if (Math.abs(time_diff) < 3 && is_same_sender && is_same_receiver) {
                last_message.time = message.time;
                last_message.timestamp = message.timestamp;
                last_message.text = concatMessages(last_message.text, message.text);

                repack[last_ind()] = last_message;
                continue;
            }

            repack.push(message);

        }

        $container.html('');
        repack.forEach(item => {
            $container.append($messageEl(item));
        });
    }

    function concatMessages(oldText, newText) {
        newText = newText.replace(/<\/?div.*?>/gm, '');

        // вставляем новый текст сразу после первого открывающего div'а
        return oldText.replace(/^(<div.+?>)/, `$1${newText}`);
    }

    function $messageEl(info) {
        let $container = $('<div class="chblock0">');

        $container.html(`
    			<span class="small f3">${info.time}</span>
    			<a class="bold f2" href="${info.sender.answer}">${info.sender.name}</a>
    			[<a class="f23" href="${info.sender.inf}">inf</a>]
    			${info.text}
    		`);
        if (info.receiver)
            $container.find('.abzac').eq(0).prepend(`<span class="bold f23">${info.receiver}, </span>`);

        return $container;
    }

    async function getNewMessages() {
        let update_url = this.update_url || location.href;

        let html = await fetch(update_url).then(r => r.text());

        let $container = $('<div>');
        $container.css('display', 'none');
        $(document.body).append($container);

        html = html.replace(/.*<body.*?>(.+?)<\/body>.*/gm, '$1');
        $container.html(html);

        $container.find('.main > a.info').each(function() {
            if ($(this).text() === 'Обновить')
                update_url = $(this).attr('href');
        });
        this.update_url = update_url;

        let messages = parseMessages($container.find('.frame > .chblock0'))

        $container.remove();

        return messages;
    }

    function parseMessages($list) {
        let list = [];

        $list.each(function() {
            let $message = $(this);

            let info = {};
            list.push(info);

            info.time = $message.find('.small.f3:first-child').text();


            let time = info.time.split(':');
            // не реальный timestamp. Нужен только для того что бы сравнивать сообщения по времени
            info.timestamp = parseInt(time[0]) * 60 * 60;
            info.timestamp += parseInt(time[1]) * 60;
            info.timestamp += parseInt(time[2]);


            info.sender = $message.find('a.bold.f2');
            info.sender = {
                name: info.sender.text(),
                answer: info.sender.attr('href'),
                inf: $message.find('a.f23').attr('href'),
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

    /*----------------------*/
    /*----------------------*/
    /*----------------------*/


    function loadCustomCss() {
        // "можно было лучше", - скажите вы
        // "можно. делай и отправь pull request", - скажу я

        let $style = $('<style>');
        $('head').append($style);

        $style.html(`
    		.abzac{
    			white-space: pre-line;
    		}
    	`);
    }


})()