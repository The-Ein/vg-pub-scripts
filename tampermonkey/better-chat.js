(function better_chat(argument) {

    // "можно было лучше", - скажите вы
    // "можно. делай и отправь pull request", - скажу я

    if (!$('header').text().match(/Чат/))
        return;

    const log = console.log;
    const message_chunk_length = 250;


    log('better chat');

    loadCustomCss();
    insertMessageForm();

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

    function insertMessageForm() {
        $button = null;
        $('.main > a.info').each(function() {
            if ($(this).text().match(/Написать/im))
                $button = $(this);
        });

        let $form = $('<form class="message_form">');
        $form.insertBefore($button);

        $form.html(`
			<div class="msg" contenteditable="true" role="textbox"></div>
			<textarea class="hidden" name="mes"></textarea>
			<div class="bottom-panel">
				<div class="message_info small">1 сообщение. Осталось символов ≈250</div>
				<button class="info" type="submit">Отправить (shift+enter)</button>
			</div>
		`);

        $('div[contenteditable]').keydown(function(e) {
            if (e.shiftKey && e.keyCode === 13) {
                $form.submit();
            }
        });

        let $message_info = $form.find('.message_info');
        log($message_info);
        $form.find('.msg').on('input', function() {
        	let $textarea = $form.find('[name="mes"]');
        	$textarea.val(clearText($(this).html()));

        	let parts = split($textarea.val());
	        let lastLength = parts[parts.length - 1].length;
	        let word = messageWord(parts.length);
	        
	        $message_info.html(`${parts.length} ${word}. Осталось символов ≈${message_chunk_length - lastLength}`);
        });

    };

    function clearText(text){
    	// сначала заменяем все открывающие <div> на переносы
    	// что бы, внезапно, не проебать переносы.
    	// после удаляем все теги которые добавил браузер
    	// все пользовательское будет выглядеть как-то так: &lt; (<)
    	return text
    		.replace(/<div.*?>/gm, `\n`)
    		.replace(/<\/?.+?>/gm, '');
    }

    function split(text) {
        let parts = [];

        while (text.length) {
            // удаляем пустые символы в начале
            text = text.replace(/^\s+/, '');

            // отрезаем кусок
            let part = text.slice(0, message_chunk_length);
            text = text.slice(message_chunk_length);

            // если кусок заканчивается на непробельный символ
            // и оставшаяся часть начинается с не пробельного,
            // то высока вероятность, что мы разрезали слово
            let indiv = part.match(/\s$/) || text.match(/^\s/);

            // или если это был последний кусок
            indiv = indiv || !text.length;

            // если в куске нет пробелов, то и не пытаемся
            indiv = indiv || !part.match(/\s/);
            if (indiv) {
                parts.push(part);
                continue;
            }

            // иначе возвращаем огрызок в остаток
            let subpart = part.match(/\S+$/)[0];

            part = part.slice(0, message_chunk_length - subpart.length);
            text = subpart.concat(text);

            parts.push(part);
        }

        // если текст получился пустым
        return parts.length ? parts : [''];
    }

    function messageWord(count) {
        let lastDigit = count.toString().match(/(\d)$/)[1];

        // 5/6/7/11/25/37 сообщений
        if ((count >= 5 && count <= 20) || lastDigit >= 5)
            return 'сообщений';
        // 21/51/101/100501 сообщение
        if (lastDigit == 1)
            return 'сообщение';
        // 22/73/144 сообщения
        return 'сообщения'
    }

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
        let $style = $('<style>');
        $('head').append($style);

        $style.html(`
    		.abzac{
    			white-space: pre-line;
    		}

    		.message_form{
    			text-align: right;
    		}

    		.hidden{
    			display:none;
    		}

    		.msg{
    			min-height: 40px;
			    min-width: 100px;
			    font-size: 16px;
			    background: #40393a;
			    color: #9acd32;
			    padding: 15px 20px;
			    text-align: left;

			    outline: none;
    		}
    	`);
    }


})()