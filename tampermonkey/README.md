## Установка любого в tampermonkey:

- скачиваем расширение c [tampermonkey.net](https://www.tampermonkey.net/), если ещё не сделали это
- открываем нужный скрипт. Например [maps-coords-in-list.user.js](https://github.com/The-Ein/vg-pub-scripts/blob/master/tampermonkey/maps-coords-in-list.user.js)
- над кодом скрипта будет находится кнопка RAW, на неё нужно нажать.
- после того как Tampermonkey подхватит скрипт, нажимаем Install(Установить)
- ???
- Profit

## Описание скриптов

### Координаты карт в списке
Файл: [maps-coords-in-list.user.js](https://github.com/The-Ein/vg-pub-scripts/blob/master/tampermonkey/maps-coords-in-list.user.js) <br/>
Во всех списках, где есть карты сокровищ выводит координаты клада.
Примерно так:
```
{2:0} Карта сокровищ 71/173 (1) - 935 [1]
{3:0} Карта сокровищ 21/35 (1) - 935 [1]
```

### Длинные сообщения в чате
Файл: [long-messages.user.js](/tampermonkey/long-messages.user.js) <br/>
Снимает ограничение в 250 символов при написании сообщения в чат. В случаях, когда сообение слишком длинное, скрипт разделяет по словам текст и отправляет как несколько последовательных сообщений. 

###Продажа вещей из мешка
Файл: [sell-from-bag.user.js](/tampermonkey/sell-from-bag.user.js) <br/>
Добаляет в меню вещи формочку для выставлния на Торговую площадь. 