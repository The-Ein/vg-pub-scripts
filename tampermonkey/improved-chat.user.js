// ==UserScript==
// @name         Улучшенный чат
// @namespace    https://github.com/The-Ein
// @version      0.2
// @description  Заменяет чат в игре на его улучшенную версию
// @author       TheEin
// @match        http://velgame.ru/game.php*
// @match        http://lt-site.ru/game.php*
// @license      Apache License 2.0
// @run-at       document-end
// @grant        none
// @updateURL    https://github.com/The-Ein/vg-pub-scripts/raw/master/tampermonkey/improved-chat.user.js
// @downloadURL  https://github.com/The-Ein/vg-pub-scripts/raw/master/tampermonkey/improved-chat.user.js
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @icon         http://velgame.ru/icons/main/messin.png
// ==/UserScript==

(function improved_chat() {
    // "можно было лучше", - скажите вы
    // "можно. делай и отправь pull request", - скажу я

    if (!$('header').text().match(/Чат/))
        return;

    const log = console.log;

    /**
        Длина оригинального сообщения
    */
    const message_chunk_length = 250;

    /**
        Максимальное время при котором сообщения склеиваются
    */
    const messages_concat_time = 3;

    // основные кнопки Написать, Обновить, Герои, Смайлы
    const control_buttons = getControlButtons();

    // Грузим стили для своей формы
    loadCustomCss();

    // контейнер в котором идёт работа
    const $main_container = $('body > .main .chblock0').parent();

    // вставляем форму, скрываем кнопки,
    // вешаем обработчики событий
    init();

    // Обрабатываем текущие сообщения
    printMessages(
        parseMessages($main_container.find('.chblock0')),
        $main_container
    );

    // Качаем новые и обновляем каждые 5 секунд
    setInterval(updateChat, 5000);


    /*----------------------*/
    /*----------------------*/
    /*----------------------*/

    function init() {
        // скрываем кнопки Написать и Обновить т.к. они больше не нужны пользователю
        control_buttons.$write.addClass('hidden');
        control_buttons.$update.addClass('hidden');

        // какой-то гений пихнул пагинацию в один блок с сообщениями
        // иии... приходится это исправлять
        fixPagination();

        // создаём формочку
        let $form = $('<div class="frame"><form class="message_form fblock" method="post"></form></div>');
        $form.insertBefore(control_buttons.$write);
        $form = $form.find('form');
        $form.html(getFormHtml());


        $('div[contenteditable]').keydown(function(e) {
            // отправка сообщения на enter (без шифта)
            // но только в форме
            if (!e.shiftKey && e.keyCode === 13) {
                e.preventDefault();
                $form.submit();
            }
        }).on('paste', function(e) {
            // чистим вставляемый текст
            // из-за того что используется div,
            // вёрстка может вставиться 1 в 1
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

        // выводим и обновляем инфу о том сколько будет сообщений,
        // и колличество оставшихся символов в текущем сообщении
        let $message_info = $form.find('.message_info');
        $form.find('.msg').on('input', function() {
            let $textarea = $form.find('[name="mes"]');
            $textarea.val(clearText($(this).html()));

            let parts = split($textarea.val());
            let lastLength = parts[parts.length - 1].length;
            let word = messageWord(parts.length);

            $message_info.html(
                `${parts.length} ${word}. Осталось&nbsp;символов&nbsp;≈${message_chunk_length - lastLength}`
            );
        });

        /**
            Фиксируем ли мы диалог с конкретным человеком
        */
        let is_dialog = false;

        // отправляем сообщения при submit
        // так же чистим форму и принудительно обновляем сообщения
        $form.submit(function(e) {
            send($form.clone())
                .then(updateChat);

            //$form[0].reset();
            $form.find('.msg')
                .html('')
                .trigger('input'); // что бы обновить инфу о длине сообщения и textarea


            $form.find('[name="lichka"]').prop('checked', is_dialog);
            if (!is_dialog)
                $form.find('.response_for').click();

            e.preventDefault();
            return false;
        });

        // ловим клики по никам для ответа
        $main_container.on('click', '.response_button', function(e) {
            e.preventDefault();

            // если повторное нажатие на один и тот же ник, то
            // делаем переписку диалогом
            // иначе всё как обычно
            let new_action = makeActionLink($(this).attr('href'));
            if ($form.attr('action') === new_action)
                is_dialog = true;
            else
                $form.attr('action', new_action)

            $form.find('.response_for')
                .one('click', function() {
                    $form.attr('action', makeActionLink(control_buttons.$write.attr('href')))
                    $(this).html('');
                    is_dialog = false;
                })
                .html(`${is_dialog ? 'Беседа с' : 'Ответ для' } <span class="name">${$(this).text()}</span>`);

            let is_private = $(this).parent().attr('data-pritate') === 'true';
            $('[name="lichka"]').prop('checked', is_private);

            this.clicktime = (new Date()).getTime();
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
            // и сериализуем
            $textarea.val(text[i]);
            let data = $form.serialize();

            // как оказалось, для того что бы отправлять кучу сообщений
            // нужно делать вид что мы честно жмём на кнопки "Написать" и "Отправить"
            let referrer = control_buttons.$write.attr('href');
            await fetch_queue(referrer);

            // почему-то если отпралять только обязательные заголовки,
            // то сообщение не отправляется, поэтому даём серверу то, что он хочет
            let html = await fetch_queue(makeActionLink($form.attr('action') || referrer), {
                "credentials": "include",
                "headers": {
                    "accept": "text/html,application/xhtml+xml," +
                        "application/xml;q=0.9,image/webp,image/apng," +
                        "*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
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

            // сохраняем ссылку из кнопки Написать для последующих сообщений
            let writeLinkHash = html.match(/\|(\d+)">Написать/)[1];
            referrer = referrer.replace(/\|.+/, `|${writeLinkHash}`);
            control_buttons.$write.attr('href', referrer);
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

    function fixPagination() {
        let $new_container = $('<div class="frame">');
        $new_container.insertAfter($main_container);
        $new_container.append($('.chblock0 + .fblock .pag').parent().detach());
    }

    /*----------------------*/
    /*----------------------*/
    /*----------------------*/

    function printMessages(list, $container) {

        let repack = [];

        let last_ind = () => repack.length - 1;

        // проходимся по всем сообщениям
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
            let is_same_privat = last_message.is_privat === message.is_privat;

            // и если у нас совпали условия, то склеиваем с предыдущим

            if (Math.abs(time_diff) < messages_concat_time && is_same_sender && is_same_receiver && is_same_privat) {
                last_message.time = message.time;
                last_message.timestamp = message.timestamp;
                last_message.text = concatMessages(last_message, message);

                repack[last_ind()] = last_message;
                continue;
            }

            repack.push(message);

        }

        $container.html('');
        repack.forEach(item => {
            item.text = prepareText(item.text);
            $container.append($messageEl(item));
        });
    }

    function concatMessages(oldMessage, newMessage) {
        // удялем все div'ы т.к. чиним это стилями
        let newText = newMessage.text.replace(/<\/?div.*?>/gm, '');

        // У Геральда всё не как у людей,
        // поэтому добавляем к его сообщениям переносы в конце
        if (oldMessage.is_herald)
            newText += `\n`;

        let oldText = oldMessage.text;
        // вставляем новый текст сразу после первого открывающего div'а
        return oldText.replace(/^(<div.+?>)/, `$1${newText}`);
    }

    function $messageEl(info) {
        // собираем блок сообщения
        let $container = $('<div class="chblock0">');

        // конечно добавляем немного информации от себя
        if (info.is_privat)
            $container.attr('data-pritate', 'true');

        if (info.is_herald)
            $container.attr('data-herald', 'true');

        // но в остальном всё стандартно
        $container.html(`
                <span class="small f3">${info.time}</span>
                <a class="bold f2 response_button" href="${info.sender.answer}">${info.sender.name}</a>
                [<a class="f23" href="${info.sender.inf}">inf</a>]
                ${!info.is_privat ? '' : '<span class="f16">[личное]</span>'}
                ${info.text}
            `);

        // если это было ответом, то добавляем ник получателя в начале
        if (info.receiver)
            $container.find('.abzac').eq(0).prepend(`<span class="bold f23">${info.receiver}, </span>`);

        return $container;
    }

    async function getNewMessages() {
        let update_url = this.update_url || location.href;

        // качаем страницу с сообщениями
        let html = await fetch_queue(update_url).then(r => r.text());

        let $container = $('<div>');

        // забираем только содержимое body
        html = html.replace(/.*<body.*?>(.+?)<\/body>.*/gm, '$1');
        $container.html(html);

        // берём свежую ссылку для обновления
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

        // проходимся по всем элементам
        $list.each(function() {
            let $message = $(this);

            // т.к. объекты передаются по ссылке,
            // то сразу после создания мы вставляем его в массив
            // и только потом заполняем
            let info = {};
            list.push(info);

            info.time = $message.find('.small.f3:first-child').text();

            // не реальный timestamp. Нужен только для того что бы сравнивать сообщения по времени
            let time = info.time.split(':');

            // 12:23:45 -> 12 * 60 * 60 + 23 * 60 + 45
            info.timestamp = parseInt(time[0]) * 60 * 60;
            info.timestamp += parseInt(time[1]) * 60;
            info.timestamp += parseInt(time[2]);


            info.sender = $message.find('a.bold.f2');
            info.sender = {
                name: info.sender.text(),
                answer: info.sender.attr('href'),
                inf: $message.find('a.f23').attr('href'),
            };

            // этого пидора помечаем отдельно
            info.is_herald = info.sender.name === 'Герольд';

            let $receiver = $message.find('.abzac .bold.f23');
            info.receiver = $receiver.text().replace(/, /, '');
            $receiver.remove();

            info.is_privat = !!$message.html().match(/>\[личное\]<\/span/);

            info.text = '';
            $message.find('.abzac').each(function() {
                info.text += $(this)[0].outerHTML;
            });
        });

        return list;
    }

    function updateChat() {
        return getNewMessages().then(messages => {
            // обновляем сообщения, только если что-то новое пришло
            if (messages[0].timestamp !== this.last_timestamp)
                printMessages(messages, $main_container);
            this.last_timestamp = messages[0].timestamp;
        });
    }

    /*----------------------*/
    /*----------------------*/
    /*----------------------*/


    function prepareText(text) {
        text = printEmoji(text);
        text = markupToHtml(text);
        text = prepareLinks(text);

        return text;
    }

    function prepareLinks(text) {
        // Пояснение и проверка: https://regex101.com/r/z84eB2/1
        // Незначительно отличается от того что в коде
        return text.replace(
            /(^|\s|[();]|>)(([a-zA-Z]{2,}?:\/\/).+?)(?=\s|$|\.(\s|$)|&[a-z]{2,5};|[()])/gm,
            (full, char_before, link, protocol) => {
                let anchor = link.replace(protocol, '');

                // Укорачиваем слишком длинные ссылки.
                // idleness.ru/asd-qwe-zxc-rty сократится idleness.ru/asd-qwe-...
                // Но idleness.ru/asd-qwe-zxc останется idleness.ru/asd-qwe-zxc т.к. нет смысла
                if(anchor.length > 23)
                    anchor = anchor.replace(/(^.{20}).*/, '$1...')
                
                return `${char_before}<a href="${link}" class="text-link" target="_blank">${anchor}</a>`;
            }
        )
    }

    function printEmoji(text) {
        let allowed = getEmojiList();

        for (let name in allowed) {
            let img = allowed[name];
            let alt = name.replace(':', '');

            // RegExp только ради gm, иначе заменяем только первое
            let search = new RegExp(name, 'gm');

            text = text.replace(search, `<img src="help/dark_smiles/${img}" alt="${alt}">`);
        }

        return text;
    }

    function markupToHtml(text) {
        text = markToTag(text, '**', 'b');
        text = markToTag(text, '__', 'i');
        text = markToTag(text, '~~', 's');

        return text;

        function markToTag(text, mark, tagname) {
            // https://stackoverflow.com/a/6969486
            mark = mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Частный случай регулярки: https://regex101.com/r/5tiVFh/2
            let search = new RegExp(`([^\S\\\\]|^)${mark}.+?[^\\\\]${mark}`, 'gm');

            return text.replace(search, (full) => {
                // если находим любой цельный тег
                // то оставляем всё как есть
                if (full.match(/<\S+?>/))
                    return full;

                let open_tag = new RegExp(`${mark}`);
                let close_tag = new RegExp(`${mark}$`);
                return full
                    .replace(open_tag, `<${tagname}>`)
                    .replace(close_tag, `</${tagname}>`);

            });
        }
    }


    /*----------------------*/
    /*----------------------*/
    /*----------------------*/

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

    /*----------------------*/
    /*----------------------*/
    /*----------------------*/

    function getFormHtml() {
        return `
            <div class="msg" contenteditable="true" role="textbox"> </div>
            <textarea class="hidden" name="mes"></textarea>
            <div class="bottom-panel">
                <div class="col response">
                    <div class="response_for"></div>
                    <label>
                        <input type="checkbox" name="lichka"> Личное
                    </label>
                </div>
                <div class="col">
                    <button class="info" type="submit">Отправить (enter)</button>
                    <div class="message_info small">1 сообщение. Осталось символов ≈250</div>
                </div>
            </div>
        `;
    }

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
                min-height: 80px;
                min-width: 100px;
                font-size: 14px;
                background: #40393a;
                color: #9acd32;
                padding: 15px 20px;
                text-align: left;
                border-radius: 5px;
                border: 1px solid #6a503a;
                box-sizing: border-box;
                outline: none;
            }

            .bottom-panel {
                display: flex;
                width: 100%;
            }

            .bottom-panel > .col {
                flex-grow: 1;
                text-align: center;
                box-sizing: border-box;
                padding: 10px;
                line-height: 230%;
            }

            .bottom-panel > .col:first-child {
                text-align: left;
            }

            .bottom-panel > .col:last-child {
                text-align: right;
            }

            .response_for {
                position: relative;
                cursor: pointer;
            }

            .response_for:before {
                content: "+";
                color: red;
                display: inline-block;
                padding: 0 4px 0 2px;
                box-sizing: border-box;
                transform: rotate(45deg);
            }

            .response_for:empty:before {
                display: none;
            }

            .response_for .name {
                color: #2196f4;
                font-weight: bold;
            }

            .response_for:empty + label {
                display: none;
            }

            .bottom-panel label {
                cursor: pointer;
            }

            .bottom-panel button {
                cursor: pointer;
            }

            .text-link {
                color: #2196f4;
            }

            .text-link:hover {
                color: gold;
            }
        `);
    }

    function getEmojiList() {
        return {
            // Взято тут: http://velgame.ru/game.php?14&1&1&-1&3
            ':\\(': 'sad.gif',
            ':\\)': 'smile3.gif',
            ':acute': 'acute.gif',
            ':agr': 'agr.gif',
            ':bad': 'bad.gif',
            ':bcat': 'bcat.gif',
            ':beee': 'beee.gif',
            ':blum': 'blum.gif',
            ':blush1': 'blush1.gif',
            ':blush2': 'blush2.gif',
            ':boast': 'boast.gif',
            ':bore': 'bore.gif',
            ':bravo': 'bravo.gif',
            ':cool': 'cool.gif',
            ':cray': 'cray.gif',
            ':crazy': 'crazy.gif',
            ':D': 'laugh3.gif',
            ':dance1': 'dance1.gif',
            ':dance2': 'dance2.gif',
            ':dance3': 'dance3.gif',
            ':dance4': 'dance4.gif',
            ':dntknw': 'dntknw.gif',
            ':dntmnn': 'dntmnn.gif',
            ':drinks': 'drinks.gif',
            ':dwarf': 'dwarf.gif',
            ':fcpalm': 'fcpalm.gif',
            ':fool': 'fool.gif',
            ':friends': 'friends.gif',
            ':gamer': 'gamer1.gif',
            ':gcray': 'gcray.gif',
            ':good': 'good.gif',
            ':good2': 'good2.gif',
            ':help': 'help.gif',
            ':hi': 'hi.gif',
            ':ireful': 'ireful.gif',
            ':joke': 'joke.gif',
            ':king': 'king2.gif',
            ':kiss1': 'kiss1.gif',
            ':lazy': 'lazy.gif',
            ':mag': 'wizard.gif',
            ':mail': 'mail1.gif',
            ':mda': 'mda.gif',
            ':meet': 'meet.gif',
            ':nasos': 'nasos.gif',
            ':nea': 'nea.gif',
            ':notme': 'notme.gif',
            ':ok': 'ok.gif',
            ':pardon': 'pardon.gif',
            ':party': 'party.gif',
            ':punish': 'punish.gif',
            ':queen': 'queen.gif',
            ':rofl': 'rofl.gif',
            ':scare': 'scare.gif',
            ':search': 'search.gif',
            ':secret': 'secret.gif',
            ':sorry': 'sorry.gif',
            ':stop': 'stop.gif',
            ':thanks': 'thanks.gif',
            ':victory': 'victory.gif',
            ':wacko': 'wacko2.gif',
            ':wall': 'dash1.gif',
            ':witch': 'witch.gif',
            ':yahoo': 'yahoo.gif',
            ':yes': 'yes3.gif',
        }
    }
})();