# Kyu — архитектура и заметки разработчика

Этот документ объясняет, **что такое Kyu, как он устроен и как его развивать**. Написан так,
чтобы человек (или ИИ-ассистент), впервые открывший репозиторий, быстро всё понял.

---

## 1. Что это и откуда взялось

Kyu — десктопный (Electron) клиент-обёртка над **публичным API AniXart**. Сам по себе он не
хранит и не раздаёт видео: он ходит в те же эндпоинты, что и мобильное приложение AniXart,
и показывает результат в нативном окне на ПК.

API и формат запросов были получены **реверсом APK** «AniXart Premium» (распаковка `classes*.dex`,
поиск строк-эндпоинтов и User-Agent). В репозитории APK нет — он не нужен для работы.

Технологии: **Electron + ванильный JS** (без React/Vue/сборщиков). Всё рендерится руками через
маленький хелпер `el()` (createElement-обёртка). Это сделано намеренно — минимум зависимостей,
один `npm install` ставит только Electron.

## 2. Процессная модель

```
main.js (Node / главный процесс)
  ├─ создаёт BrowserWindow (frameless)
  ├─ проксирует ВСЕ запросы к API (fetch с нужным User-Agent и токеном) — обходит CORS
  ├─ адблокер + подмена Referer для плееров (session.webRequest)
  ├─ хранилище store.json (избранное/история/токен/настройки)
  └─ IPC-обработчики ipcMain.handle('api:*', 'win:*', 'store:*', ...)

preload.js (мост)
  └─ contextBridge.exposeInMainWorld('anixart', { ...методы → ipcRenderer.invoke })

src/renderer.js (UI, без доступа к Node)
  └─ вызывает window.anixart.* , рисует интерфейс
```

Рендерер **не имеет доступа к Node** (`contextIsolation: true`, `nodeIntegration: false`).
Любой сетевой запрос и доступ к ФС идут через `preload` → `ipcMain`.

## 3. API AniXart — важные факты

- **База:** `https://api-s.anixsekai.com`
- **User-Agent обязателен:** `AnixartApp/9.0b11-1000 (Android 13; SDK 33; ...)` — без него часть ручек молчит.
- **Токен** передаётся как query-параметр `?token=<token>` (получается при логине).
- ⚠️ **ГЛАВНЫЙ ПОДВОХ: мутации — это `GET`, не `POST`.** Добавить в избранное, в список,
  отметить серию, поставить оценку — всё это **GET**-запросы. Если слать POST, сервер вернёт
  `200` с **пустым телом** и **молча ничего не сделает**. На этом легко потерять часы.
  POST с телом используется только там, где есть тело: `filter`, `search/releases`,
  `auth/signIn` (form-urlencoded), `profile/preference/*/edit`, `release/comment/add`, `article/create`.
- Пустой ответ (`200`, 0 байт) обычно значит «неверный токен / не GET / не та ручка». Коды: `0` — ок,
  `2` — неверный логин/пароль, `401` — нет авторизации.

### Карта основных эндпоинтов

| Раздел | Эндпоинт |
|---|---|
| Каталог | `POST /filter/{page}` (тело `{sort, genres, ...}`) |
| Поиск аниме | `POST /search/releases/{page}` (`{query, searchBy}`) |
| Поиск юзеров | `POST /search/profiles/{page}` (`{query}`) |
| Релиз | `GET /release/{id}` (поля `is_favorite`, `is_viewed`, `profile_list_status`, `your_vote` — с токеном) |
| Серии | `GET /episode/{id}` → `/{id}/{typeId}` → `/{id}/{typeId}/{sourceId}` |
| Вход | `POST /auth/signIn` (form `login`/`password`) → `{code, profile, profileToken{token}}` |
| Избранное | `GET /favorite/add/{id}` · `/favorite/delete/{id}` · `/favorite/all/{page}` |
| Списки | `GET /profile/list/all/{status}/{page}` · `add/{status}/{id}` · `delete/{status}/{id}` |
| История | `GET /history/{page}` · `/history/add/{r}/{s}/{pos}` |
| Отметка серии | `GET /episode/watch/{r}/{s}/{pos}` |
| Оценка | `GET /release/vote/add/{id}/{vote}` · `/release/vote/delete/{id}` |
| Профиль | `GET /profile/{id}` (статистика, `votes`, `watch_dynamics`, `preferred_genres`...) |
| Друзья | `GET /profile/friend/all/{id}/{page}` · `/profile/friend/recommendations` |
| Настройки | `GET /profile/preference/my` · `POST .../status/edit` · `.../social/edit` · `.../privacy/{kind}/edit` · `.../login/change` · `.../password/change` · `.../avatar/edit` (multipart, поле `avatar`) |
| Обзор | `GET /discover/interesting` (баннеры, `action` = id релиза) · `/discover/watching/{page}` |
| Лента/каналы | `GET /channel/subscription/all/{page}` · `/channel/recommendations/{page}` · `/channel/{id}/article/all/{page}` · `GET /channel/(un)subscribe/{id}` |
| Статьи | payload — формат **Editor.js** (`{blocks:[{type,data}]}`): paragraph/header/image/list/quote |
| Комментарии | `GET /release/comment/all/{id}/{page}` · `add` (POST) · `vote` · `replies` · `edit`/`delete` |

Все ручки добавляются в `main.js` (`registerIpc`) и пробрасываются в `preload.js`.

## 4. Плеер — самое хитрое

Серия отдаёт `url` плеера-провайдера (чаще **Kodik** — `kodikplayer.com`, либо **Sibnet** — `video.sibnet.ru`).

- **Kodik блокирует прямое открытие** верхним документом (показывает «страница не существует»).
  Решение как в самом приложении: грузим плеер **внутри `<iframe>`** через обёртку `src/player.html`
  (`player.html#u=<encoded-url>`), а в `main.js` подменяем `Referer` на `https://anixart-app.com/`
  для доменов `kodik|anixmirai|aniqit`.
- **Sibnet — наоборот:** его видеофайл защищён от хотлинка и требует **свой** реферер.
  Поэтому для `sibnet` ставим `Referer: https://video.sibnet.ru/` (НЕ anixart).
- **`src/playerbridge.js`** — preload для webview: ловит `postMessage` от Kodik (время/окончание)
  и шлёт в рендерер через `sendToHost` для синхронизации прогресса (best-effort).
- **Полный экран:** видео сидит в webview. По событиям `enter/leave-html-full-screen` мы
  (а) вешаем класс `.fs` (webview `position:fixed; inset:0`) и (б) разворачиваем само окно
  `winSetFullScreen(true)`. Без (б) у безрамочного окна нижняя зона ресайза перехватывала клики
  по контролам плеера.

## 5. Адблокер

`session.webRequest.onBeforeRequest` отменяет запросы к рекламным доменам (`AD_HOSTS` в `main.js`):
весь рекламный куст Yandex (`yandex.ru`, `yastatic.net`, `yabs/bs/an.yandex`, `webvisor.org`),
AdFox, AdRiver, Google/IMA, Mail.ru ads, Buzzoola и т.д. **Видео-CDN не трогаем**
(`*.solodcdn.com` у Kodik, `video.sibnet.ru` — это сам контент). Преролл «скип через N сек» в
Kodik — это Yandex InStream, поэтому блок Yandex его убирает. Тумблер — Настройки → Плеер.

> Как искать новый рекламный домен: временно логируем все URL в `onBeforeRequest`, играем серию,
> смотрим, какие «лишние» хосты грузятся помимо CDN/плеера, и добавляем их в `AD_HOSTS`.

## 6. Окно и UI-мелочи

- Окно **безрамочное** (`frame:false`); свои кнопки — / ▢ / ✕ в шапке, перетаскивание —
  `-webkit-app-region: drag` на `.topnav`, `no-drag` на интерактивных элементах. IPC `win:*`.
- **Кастомные выпадашки** (`ddSelect`) вместо `<select>` — у них `.dd-menu{display:none}` /
  `.dd.open .dd-menu{display:block}` (если забыть — меню «залипает» открытым).
- **Иконки** — инлайн-SVG (`ICONS` + `ic()`), без эмодзи.
- **Отметка «просмотрено»** ставится НЕ по клику, а по таймеру (~60 c реального просмотра),
  иначе перелистывание серий помечало бы их все.
- **Дисклеймер** при запуске (можно скрыть навсегда — флаг `hideDisclaimer` в store).

## 7. Хранилище

`main.js` → `store.json` в `app.getPath('userData')` (`%APPDATA%/Kyu/data/`). Структура:
`{ favorites, history, settings:{ token, adblock }, profile, hideDisclaimer }`.
Без входа избранное/история живут локально; со входом — тянутся с сервера.

## 8. Как добавить фичу (шаблон)

1. **main.js** → `registerIpc`: `ipcMain.handle('api:newThing', (_e,a)=>apiRequest('/path/...'))`.
   Помни про **GET для мутаций**.
2. **preload.js**: `newThing: (a)=>ipcRenderer.invoke('api:newThing', a)`.
3. **src/renderer.js**: вызови `window.anixart.newThing(...)`, нарисуй UI через `el()`.
4. Проверка endpoint'а до кода: `node -e` с `fetch` и токеном из `store.json` — посмотреть формат ответа.

## 9. Сборка/иконка

- `npm run portable` → `electron-builder --win portable` → один `dist/Kyu-*-portable.exe`.
- Иконка: `build/icon.png` (512×512, electron-builder сам конвертит в `.ico`). Окно/дисклеймер
  используют `src/icon.png`.
- `productName`/`appId` в `package.json` → определяют имя exe и папку данных.

## 10. Юридическое

Kyu — сторонний клиент к публичному API. Контент не хостится. Название/логотип AniXart —
их владельцев; в проекте AniXart фигурирует только как «клиент **для** AniXart» + дисклеймер.
