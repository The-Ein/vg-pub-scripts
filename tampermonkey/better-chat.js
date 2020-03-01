(function better_chat(argument) {

    // "можно было лучше", - скажите вы
    // "можно. делай и отправь pull request", - скажу я

    if (!$('header').text().match(/Чат/))
        return;

    const log = console.log;
    const message_chunk_length = 250;
    const control_buttons = getControlButtons();

    log('better chat');

    loadCustomCss();
    insertMessageForm();

    const $main_container = $('body > .main .chblock0').parent();

    printMessages(
        parseMessages($main_container.find('.chblock0')),
        $main_container
    );

    setInterval(updateChat, 1000);


    /*----------------------*/
    /*----------------------*/
    /*----------------------*/

    function insertMessageForm() {
        let $form = $('<form class="message_form" method="post">');
        $form.insertBefore(control_buttons.$write);

        $form.html(`
            <div class="msg" contenteditable="true" role="textbox"></div>
            <textarea class="hidden" name="mes"></textarea>
            <div class="bottom-panel">
                <div class="col resonse">
                    <div class="resonse_for"></div>
                    <label>
                        <input type="checkbox" name="lichka"> Личное
                    </label>
                </div>
                <div class="col">
                    <div class="message_info small">1 сообщение. Осталось символов ≈250</div>
                    <button class="info" type="submit">Отправить (shift+enter)</button>
                </div>
            </div>
        `);

        $('div[contenteditable]').keydown(function(e) {
            // отправка сообщения на shift+enter
            if (e.shiftKey && e.keyCode === 13) {
                $form.submit();
            }
        }).on('paste', function(e) {
            // чистка текста перед вставкой
            e.preventDefault();
            var text = '';
            if (e.clipboardData || e.originalEvent.clipboardData) {
                text = (e.originalEvent || e).clipboardData.getData('text/plain');
            } else if (window.clipboardData) {
                text = window.clipboardData.getData('Text');
            }
            if (document.queryCommandSupported('insertText')) {
                document.execCommand('insertText', false, text);
            } else {
                document.execCommand('paste', false, text);
            }
        });

        let $message_info = $form.find('.message_info');
        $form.find('.msg').on('input', function() {
            let $textarea = $form.find('[name="mes"]');
            $textarea.val(clearText($(this).html()));

            let parts = split($textarea.val());
            let lastLength = parts[parts.length - 1].length;
            let word = messageWord(parts.length);

            $message_info.html(`${parts.length} ${word}. Осталось символов ≈${message_chunk_length - lastLength}`);
        });

        $form.submit(function(e) {
            send($form.clone())
                .then(updateChat);
            $form[0].reset();
            $form.find('.msg').html('');

            e.preventDefault();
            return false;
        });
    };

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

    async function send($form) {
        let $textarea = $form.find('[name="mes"]');

        let text = split($textarea.val());

        for (let i = 0; i < text.length; i++) {
            // что бы самому не собирать тело запроса,
            // просто пихаем по очереди все куски в textarea
            // и сериализуем функциями
            $textarea.val(text[i]);
            let data = $form.serialize();

            let referrer = control_buttons.$write.attr('href');
            await fetch_queue(referrer);

            // почему-то если отпралять только обязательные заголовки, 
            // то сообщение не отправляется, поэтому даём серверу то, 
            // что он хочет
            let html = await fetch_queue(makeActionLink(referrer), {
                "credentials": "include",
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "content-type": "application/x-www-form-urlencoded",
                    "upgrade-insecure-requests": "1"
                },
                "referrer": referrer,
                "referrerPolicy": "no-referrer-when-downgrade",
                "body": data,
                "method": "POST",
                "mode": "cors"
            }).then(resp => resp.text());

            // как оказалось, для того что бы отправлять кучу сообщений
            // нужно делать вид что мы честно жмём на кнопки "Отправить" и "Написать"
            let writeLinkHash = html.match(/\|(\d+)">Написать/)[1];
            referrer = referrer.replace(/\|.+/, `|${writeLinkHash}`);

            control_buttons.$write.attr('href', referrer);

            log('referrer', referrer);
        }
    }

    function getControlButtons() {
        let buttons = {};
        $('.main > a.info').each(function() {
            if ($(this).text().match(/Написать/im))
                buttons.$write = $(this);

            if ($(this).text().match(/Обновить/im))
                buttons.$update = $(this);

            if ($(this).text().match(/Герои/im))
                buttons.$heroes = $(this);

            if ($(this).text().match(/Смайлы/im))
                buttons.$emoji = $(this);
        });

        return buttons;
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

    function clearText(text) {
        // сначала заменяем все открывающие <div> на переносы
        // что бы, внезапно, не проебать переносы.
        // после удаляем все теги которые добавил браузер
        // все пользовательское будет выглядеть как-то так: &lt; (<)
        return text
            .replace(/<div.*?>/gm, `\n`)
            .replace(/<\/?.+?>/gm, '');
    }

    function makeActionLink(link) {
        // game.php?14&1&1&29744&1 -> game.php?14&0&1&29744&2
        //                       ^                          ^
        return link.replace(/&1($|\|)/, '&2$1');
    }

    function makeWriteFormLink(link) {
        // game.php?14&1&1&29744&2 -> game.php?14&0&1&29744&1
        //                       ^                          ^
        return link.replace(/&2($|\|)/, '&1$1');
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

        let html = await fetch_queue(update_url).then(r => r.text());

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

    function updateChat() {
        return getNewMessages().then(messages => {
            printMessages(messages, $main_container);
        });
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

    /**
        Аналог fetch, но все запросы идёт последовательно.
        Существует из-за того что зачастую если сделать одновременно два запроса
        к velgame.ru в предлах одной сессии, то вернётся 500.
    */
    function fetch_queue() {
        // сохряняем аргументы, т.к. дальше у функции буду уже свои
        let args = arguments;
        return new Promise(async (resolve) => {
            // пихаем запрос в очередь
            this.queue = this.queue || [];
            this.queue.push({
                resolve,
                args
            });

            // если сейчас что-то работает, то выходим
            if (this.current)
                return;

            // иначе, начинаем доставать по очереди все запросы и выполняем их
            while (this.current = this.queue.shift()) {
                let resp = await fetch(...this.current.args);
                this.current.resolve(resp);
            }
        });
    }


})()