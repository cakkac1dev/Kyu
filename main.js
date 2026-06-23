const { app, BrowserWindow, ipcMain, session, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Конфигурация API (вытащено из AniXart Premium 9.0b11) ───────────────────
const API_BASE = 'https://api-s.anixsekai.com';
const USER_AGENT =
  'AnixartApp/9.0b11-1000 (Android 13; SDK 33; arm64-v8a; Samsung SM-G991B; ru)';

// Куда складываем локальные данные (избранное, история, аккаунт)
const DATA_DIR = path.join(app.getPath('userData'), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

const DEFAULT_STORE = { favorites: [], history: [], settings: { token: '' }, profile: null };

let store = DEFAULT_STORE;
function loadStore() {
  try {
    store = Object.assign({}, DEFAULT_STORE, JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')));
    store.settings = Object.assign({ token: '' }, store.settings || {});
  } catch {
    store = JSON.parse(JSON.stringify(DEFAULT_STORE));
  }
  return store;
}
function saveStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
}
function token() { return (store.settings && store.settings.token) || ''; }

// ── Прокси-запросы к API (в main-процессе: обход CORS, User-Agent, токен) ────
async function apiRequest(pathname, { method = 'GET', body = null, form = null, auth = true } = {}) {
  let url = API_BASE + pathname;
  if (auth && token()) url += (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token());

  const opts = { method, headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' } };
  if (form != null) {
    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8';
    opts.body = new URLSearchParams(form).toString();
  } else if (body != null) {
    opts.headers['Content-Type'] = 'application/json; charset=utf-8';
    opts.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    if (!text) return { code: -1, _empty: true, _status: res.status };
    try { return JSON.parse(text); }
    catch { return { code: -1, _raw: text.slice(0, 500) }; }
  } catch (e) {
    return { code: -1, _error: String(e && e.message || e) };
  }
}

// ── IPC ──────────────────────────────────────────────────────────────────────
function registerIpc() {
  // — Каталог / поиск / релиз —
  ipcMain.handle('api:filter', (_e, { page, filter }) =>
    apiRequest(`/filter/${page}`, { method: 'POST', body: filter || {} }));
  ipcMain.handle('api:search', (_e, { page, query }) =>
    apiRequest(`/search/releases/${page}`, { method: 'POST', body: { query, searchBy: 0 } }));
  ipcMain.handle('api:release', (_e, { id }) => apiRequest(`/release/${id}`));
  ipcMain.handle('api:randomRelease', () => apiRequest(`/release/random`));

  // — Серии —
  ipcMain.handle('api:episodeTypes', (_e, { id }) => apiRequest(`/episode/${id}`));
  ipcMain.handle('api:episodeSources', (_e, { id, typeId }) => apiRequest(`/episode/${id}/${typeId}`));
  ipcMain.handle('api:episodes', (_e, { id, typeId, sourceId }) =>
    apiRequest(`/episode/${id}/${typeId}/${sourceId}`));

  // — Аккаунт —
  ipcMain.handle('auth:signIn', async (_e, { login, password }) => {
    const res = await apiRequest(`/auth/signIn`, { method: 'POST', form: { login, password }, auth: false });
    if (res && res.code === 0 && res.profileToken) {
      const tok = res.profileToken.token || res.profileToken;
      store.settings.token = tok;
      store.profile = res.profile || null;
      saveStore();
    }
    return res;
  });
  ipcMain.handle('auth:logout', () => {
    store.settings.token = '';
    store.profile = null;
    saveStore();
    return true;
  });
  ipcMain.handle('auth:me', () => ({ token: token(), profile: store.profile }));
  ipcMain.handle('api:profile', (_e, { id }) => apiRequest(`/profile/${id}`));

  // — Синхронизация (требуют токен). ВАЖНО: эти мутации в AniXart — GET, не POST! —
  ipcMain.handle('api:favoriteAdd', (_e, { id }) => apiRequest(`/favorite/add/${id}`));
  ipcMain.handle('api:favoriteDelete', (_e, { id }) => apiRequest(`/favorite/delete/${id}`));
  ipcMain.handle('api:favoritesList', (_e, { page }) => apiRequest(`/favorite/all/${page}`));
  ipcMain.handle('api:historyList', (_e, { page }) => apiRequest(`/history/${page}`));
  ipcMain.handle('api:historyAdd', (_e, { rId, sId, position }) =>
    apiRequest(`/history/add/${rId}/${sId}/${position || 0}`));
  ipcMain.handle('api:historyDelete', (_e, { id }) => apiRequest(`/history/delete/${id}`));
  // Отметить серию просмотренной / снять отметку
  ipcMain.handle('api:episodeWatch', (_e, { rId, sId, position }) =>
    apiRequest(`/episode/watch/${rId}/${sId}${position != null ? '/' + position : ''}`));
  ipcMain.handle('api:episodeUnwatch', (_e, { rId, sId, position }) =>
    apiRequest(`/episode/unwatch/${rId}/${sId}${position != null ? '/' + position : ''}`));

  // — Списки профиля (Смотрю / В планах / Просмотрено / Отложено / Брошено) —
  ipcMain.handle('api:profileList', (_e, { status, page }) =>
    apiRequest(`/profile/list/all/${status}/${page}`));
  ipcMain.handle('api:profileListAdd', (_e, { status, id }) =>
    apiRequest(`/profile/list/add/${status}/${id}`));
  ipcMain.handle('api:profileListDelete', (_e, { status, id }) =>
    apiRequest(`/profile/list/delete/${status}/${id}`));

  // — Обзор —
  ipcMain.handle('api:discoverInteresting', () => apiRequest(`/discover/interesting`));
  ipcMain.handle('api:discoverWatching', (_e, { page }) => apiRequest(`/discover/watching/${page}`));

  // — Оценка релиза —
  ipcMain.handle('api:voteAdd', (_e, { id, vote }) => apiRequest(`/release/vote/add/${id}/${vote}`));
  ipcMain.handle('api:voteDelete', (_e, { id }) => apiRequest(`/release/vote/delete/${id}`));

  // — Коллекции (избранные пользователем) —
  ipcMain.handle('api:collectionFavorites', (_e, { page }) => apiRequest(`/collectionFavorite/all/${page}`));
  ipcMain.handle('api:collectionReleases', (_e, { id, page }) => apiRequest(`/collection/${id}/releases/${page}`));

  // — Комментарии к релизу —
  ipcMain.handle('api:comments', (_e, { id, page }) =>
    apiRequest(`/release/comment/all/${id}/${page}`));

  // — Действия с комментариями —
  ipcMain.handle('api:commentVote', (_e, { id, vote }) => apiRequest(`/release/comment/vote/${id}/${vote}`));
  ipcMain.handle('api:commentAdd', (_e, { releaseId, message, spoiler, parentId }) =>
    apiRequest(`/release/comment/add/${releaseId}`, { method: 'POST', body: { message, spoiler: !!spoiler, parentCommentId: parentId || null } }));
  ipcMain.handle('api:commentReplies', (_e, { id, page }) => apiRequest(`/release/comment/replies/${id}/${page}`));
  ipcMain.handle('api:searchProfiles', (_e, { page, query }) => apiRequest(`/search/profiles/${page}`, { method: 'POST', body: { query } }));

  // — Друзья —
  ipcMain.handle('api:friends', (_e, { id, page }) => apiRequest(`/profile/friend/all/${id}/${page}`));
  ipcMain.handle('api:friendRecs', () => apiRequest(`/profile/friend/recommendations`));
  ipcMain.handle('api:randomFromList', (_e, { pid, status }) => apiRequest(`/release/random/profile/list/${pid}/${status}`));

  // — Настройки аккаунта —
  ipcMain.handle('api:prefMy', () => apiRequest(`/profile/preference/my`));
  ipcMain.handle('api:socialEdit', (_e, b) => apiRequest(`/profile/preference/social/edit`, { method: 'POST', body: b }));
  ipcMain.handle('api:privacyEdit', (_e, { kind, value }) => apiRequest(`/profile/preference/privacy/${kind}/edit`, { method: 'POST', body: { value } }));
  ipcMain.handle('api:loginChange', (_e, { login }) => apiRequest(`/profile/preference/login/change`, { method: 'POST', body: { login } }));
  ipcMain.handle('api:passwordChange', (_e, { oldPassword, newPassword }) => apiRequest(`/profile/preference/password/change`, { method: 'POST', body: { old_password: oldPassword, new_password: newPassword } }));

  // — Редактирование статуса профиля —
  ipcMain.handle('api:statusEdit', (_e, { status }) =>
    apiRequest(`/profile/preference/status/edit`, { method: 'POST', body: { status } }));

  // — Лента / каналы —
  ipcMain.handle('api:channelSubs', (_e, { page }) => apiRequest(`/channel/subscription/all/${page}`));
  ipcMain.handle('api:channelRecs', (_e, { page }) => apiRequest(`/channel/recommendations/${page}`));
  ipcMain.handle('api:channel', (_e, { id }) => apiRequest(`/channel/${id}`));
  ipcMain.handle('api:channelArticles', (_e, { id, page }) => apiRequest(`/channel/${id}/article/all/${page}`));
  ipcMain.handle('api:channelSubscribe', (_e, { id, on }) => apiRequest(`/channel/${on ? 'subscribe' : 'unsubscribe'}/${id}`));
  ipcMain.handle('api:feed', (_e, { page }) => apiRequest(`/article/all/${page}`, { method: 'POST', body: {} }));

  // — Комментарии статей —
  ipcMain.handle('api:articleComments', (_e, { id, page }) => apiRequest(`/article/comment/all/${id}/${page}`));
  // — Ред./удаление своих комментариев релиза —
  ipcMain.handle('api:commentEdit', (_e, { id, message, spoiler }) => apiRequest(`/release/comment/edit/${id}`, { method: 'POST', body: { message, spoiler: !!spoiler } }));
  ipcMain.handle('api:commentDelete', (_e, { id }) => apiRequest(`/release/comment/delete/${id}`));

  // — Комментарии статей: постинг —
  ipcMain.handle('api:articleCommentAdd', (_e, { articleId, message }) => apiRequest(`/article/comment/add/${articleId}`, { method: 'POST', body: { message } }));
  // — Стена профиля (блог) —
  ipcMain.handle('api:blogGet', (_e, { pid }) => apiRequest(`/channel/blog/${pid}`));
  ipcMain.handle('api:blogCreate', () => apiRequest(`/channel/blog/create`, { method: 'POST', body: {} }));
  ipcMain.handle('api:articleCreate', (_e, { cid, text }) => apiRequest(`/article/create/${cid}`, { method: 'POST', body: { payload: { time: Date.now(), blocks: [{ type: 'paragraph', data: { text } }], version: '2.28.2' }, repost_article_id: null } }));

  // — Смена почты —
  ipcMain.handle('api:emailChange', (_e, { email, password }) => apiRequest(`/profile/preference/email/change`, { method: 'POST', body: { email, password } }));

  // — Смена аватара (файловый диалог + multipart) —
  ipcMain.handle('api:avatarUpload', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const r = await dialog.showOpenDialog(win, { title: 'Выберите аватар', properties: ['openFile'], filters: [{ name: 'Изображения', extensions: ['jpg', 'jpeg', 'png', 'webp'] }] });
    if (r.canceled || !r.filePaths || !r.filePaths[0]) return { canceled: true };
    try {
      const fp = r.filePaths[0];
      const buf = fs.readFileSync(fp);
      const ext = path.extname(fp).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const fd = new FormData();
      fd.append('avatar', new Blob([buf], { type: mime }), 'avatar' + ext);
      const res = await fetch(API_BASE + '/profile/preference/avatar/edit?token=' + encodeURIComponent(token()), { method: 'POST', headers: { 'User-Agent': USER_AGENT }, body: fd });
      const txt = await res.text(); try { return JSON.parse(txt); } catch { return { code: -1, _raw: txt.slice(0, 200) }; }
    } catch (e) { return { code: -1, _error: String(e && e.message || e) }; }
  });

  // — Управление окном (безрамочное) —
  const winOf = (e) => BrowserWindow.fromWebContents(e.sender);
  ipcMain.handle('win:minimize', (e) => { const w = winOf(e); if (w) w.minimize(); });
  ipcMain.handle('win:maximize', (e) => { const w = winOf(e); if (!w) return; if (w.isMaximized()) w.unmaximize(); else w.maximize(); });
  ipcMain.handle('win:close', (e) => { const w = winOf(e); if (w) w.close(); });
  ipcMain.handle('win:isMaximized', (e) => { const w = winOf(e); return w ? w.isMaximized() : false; });
  ipcMain.handle('win:setFullScreen', (e, { flag }) => { const w = winOf(e); if (w) w.setFullScreen(!!flag); });

  // — Открыть ссылку во внешнем браузере —
  ipcMain.handle('app:openExternal', (_e, { url }) => { if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) shell.openExternal(url); });

  // — Локальное хранилище (избранное/история без входа) —
  ipcMain.handle('store:get', () => store);
  ipcMain.handle('store:set', (_e, next) => { store = Object.assign(store, next); saveStore(); return true; });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 940, minHeight: 600,
    backgroundColor: '#0e0f13', title: 'Kyu',
    icon: path.join(__dirname, 'src', 'icon.png'),
    frame: false, // безрамочное окно — свои кнопки управления
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
      webviewTag: true, // нужен для встроенного плеера
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Сообщаем рендереру о смене maximize/fullscreen (для иконки кнопки)
  const sendState = () => win.webContents.send('win:state', { maximized: win.isMaximized(), fullscreen: win.isFullScreen() });
  win.on('maximize', sendState); win.on('unmaximize', sendState);
  win.on('enter-full-screen', sendState); win.on('leave-full-screen', sendState);
}

// Рекламные сети (preroll/VAST в плеерах kodik/sibnet и т.п.)
const AD_HOSTS = [
  'yandex.ru', 'yandex.net', 'yastatic.net', 'webvisor.org', 'yandexadexchange.net',
  'an.yandex.ru', 'yabs.yandex', 'bs.yandex', 'awaps.yandex', 'adfox.ru', 'ads.adfox.ru', 'adfox.net',
  'adriver.ru', 'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'imasdk.googleapis.com', 'pagead2.googlesyndication.com', 'ad.mail.ru', 'rs.mail.ru',
  'top-fwz1.mail.ru', 'mradar.mail.ru', 'mc.yandex.ru', 'mc.admetrica.ru', 'ads.adfox',
  'smi2.ru', 'smi2.net', 'mgid.com', 'marketgid.com', 'buzzoola.com', 'betweendigital.com',
  'getshop.tv', 'otm-r.com', 'sape.ru', 'criteo.com', 'criteo.net', 'taboola.com',
  'outbrain.com', 'moatads.com', 'adsafeprotected.com', 'relap.io', 'hybrid.ai',
  'adloox.com', 'luckyads', 'adspire', 'vidoomy', 'aniview.com', 'springserve.com',
  'rtb.com', 'adnxs.com', 'rubiconproject.com', 'pubmatic.com', 'openx.net', 'innovid.com',
];
function isAdUrl(url) {
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch { return false; }
  return AD_HOSTS.some((d) => host === d || host.endsWith('.' + d) || host.includes(d));
}

app.whenReady().then(() => {
  loadStore();

  // Адблокер: режем запросы к рекламным сетям (можно отключить в Настройках)
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
    if (store.settings && store.settings.adblock === false) return cb({});
    if (isAdUrl(details.url)) return cb({ cancel: true });
    cb({});
  });

  // Встроенный плеер.
  // Kodik проверяет реферер при встраивании — подменяем на разрешённый домен AniXart.
  // Sibnet, наоборот, требует СВОЙ реферер (хотлинк-защита видеофайла) —
  // его НЕ трогаем, чтобы плеер использовал естественный реферер video.sibnet.ru.
  session.defaultSession.webRequest.onBeforeSendHeaders((details, cb) => {
    const h = details.requestHeaders;
    if (/sibnet/i.test(details.url)) {
      h['Referer'] = 'https://video.sibnet.ru/';
    } else if (/kodik|anixmirai|aniqit/i.test(details.url)) {
      h['Referer'] = 'https://anixart-app.com/';
      h['Origin'] = 'https://anixart-app.com';
    }
    cb({ requestHeaders: h });
  });

  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
