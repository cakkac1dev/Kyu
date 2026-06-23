'use strict';

// ── Состояние ────────────────────────────────────────────────────────────────
const state = {
  view: 'discover',
  store: { favorites: [], history: [], settings: { token: '' }, profile: null },
  auth: { token: '', profile: null },
  catalog: { page: 0, sort: 2, items: [] },
  search: { page: 0, query: '', items: [] },
  discover: { banners: [], watching: [] },
  bm: { tab: 1, page: 0, col: null },
  profileTab: 'stats',
};
const isAuthed = () => !!state.auth.token;

// Ссылки автора (замени на свои)
const LINKS = { github: 'https://github.com/cakkac1dev', telegram: 'https://t.me/cakkac' };
function ext(url) { window.anixart.openExternal(url); }
function setupChrome() {
  // кнопки управления окном
  const wb = (id, icon, fn) => { const b = $(id); if (b) { b.append(ic(icon, id === '#winMax' ? 13 : 16)); b.addEventListener('click', fn); } };
  wb('#winMin', 'winmin', () => window.anixart.winMinimize());
  wb('#winMax', 'winmax', () => window.anixart.winMaximize());
  wb('#winClose', 'winclose', () => window.anixart.winClose());

  // футер
  const fl = $('#footerLinks');
  if (fl) {
    fl.innerHTML = '';
    const gh = el('a', { onclick: () => ext(LINKS.github) }, ic('user', 13), 'GitHub');
    const tg = el('a', { onclick: () => ext(LINKS.telegram) }, ic('feed', 13), 'Telegram');
    fl.append(gh, tg);
  }
  // дисклеймер
  const dsc = $('#disclaimer');
  if (dsc && !state.store.hideDisclaimer) dsc.classList.remove('hidden');
  const hideBtn = $('#dscHideBtn'), closeBtn = $('#dscCloseBtn');
  if (hideBtn) hideBtn.addEventListener('click', async () => { state.store.hideDisclaimer = true; await window.anixart.storeSet({ hideDisclaimer: true }); dsc.classList.add('hidden'); });
  if (closeBtn) closeBtn.addEventListener('click', () => dsc.classList.add('hidden'));
}

const SORT_OPTIONS = [
  { value: 2, label: 'Новинки' }, { value: 1, label: 'Обновления' },
  { value: 3, label: 'По рейтингу' }, { value: 4, label: 'По году' }, { value: 0, label: 'По умолчанию' },
];
const LIST_STATUS = [
  { v: 1, label: 'Смотрю', color: '#4d7cff' },
  { v: 2, label: 'В планах', color: '#8b5cff' },
  { v: 3, label: 'Просмотрено', color: '#3ddc84' },
  { v: 4, label: 'Отложено', color: '#ffb454' },
  { v: 5, label: 'Брошено', color: '#ff5c93' },
];
const statusColor = (s) => (LIST_STATUS.find((x) => x.v === s) || {}).color;

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, props = {}, ...children) => {
  const n = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (v == null || v === false) return;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'style') n.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  });
  children.flat().forEach((c) => n.append(c?.nodeType ? c : document.createTextNode(c ?? '')));
  return n;
};

const viewRoot = $('#viewRoot');
const viewTitle = $('#viewTitle');
const topbarControls = $('#topbarControls');
const VIEW_TITLES = { discover: 'Обзор', catalog: 'Каталог', search: 'Поиск', bookmarks: 'Закладки', feed: 'Лента', profile: 'Профиль', settings: 'Настройки', player: 'Просмотр' };

// ── SVG-иконки (без виндовых эмодзи) ────────────────────────────────────────────
const ICONS = {
  discover: '<circle cx="12" cy="12" r="9"/><polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5" fill="currentColor" stroke="none"/>',
  catalog: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  bookmark: '<path d="M19 21l-7-4.5L5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  feed: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.6" fill="currentColor" stroke="none"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="m4 4 5 5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>',
  play: '<polygon points="6 4 20 12 6 20" fill="currentColor" stroke="none"/>',
  star: '<polygon points="12 2.5 14.9 8.7 21.5 9.5 16.7 14.1 17.9 20.6 12 17.5 6.1 20.6 7.3 14.1 2.5 9.5 9.1 8.7"/>',
  heart: '<path d="M12 21s-7-4.4-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.6 12 21 12 21z"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  like: '<path d="M7 22V11l5-9c1.1 0 2 .9 2 2v5h5.5a2 2 0 0 1 2 2.4l-1.5 7A2 2 0 0 1 18 21H7z"/>',
  comment: '<path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z"/>',
  repost: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  stats: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  friends: '<circle cx="9" cy="8" r="3.5"/><path d="M3 21a6 6 0 0 1 12 0"/><path d="M16 5.5a3.5 3.5 0 0 1 0 6.9"/><path d="M21 21a6 6 0 0 0-4-5.6"/>',
  fire: '<path d="M12 22c4 0 6-2.6 6-6 0-3-2-5-3-7-1.5 1-2 2-2 3 0-2-1-4-3-6-.5 3-2.5 4-3.5 6.5C5.6 9 5 10.5 5 13c0 4 3 9 7 9z"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
  winmin: '<line x1="5" y1="12" x2="19" y2="12"/>',
  winmax: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  winclose: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  fs: '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
  fsexit: '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>',
};
function ic(name, size = 18) { const s = el('span', { class: 'ic' }); s.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`; return s; }
function iconBtn(cls, name, text, on) { const b = el('button', { class: cls }, ic(name, 17), text ? el('span', {}, text) : ''); if (on) b.addEventListener('click', on); return b; }

// ── Кастомный dropdown ─────────────────────────────────────────────────────────
function ddSelect(options, value, onChange, opt = {}) {
  const dd = el('div', { class: 'dd' });
  const find = (v) => options.find((o) => String(o.value) === String(v));
  const btn = el('div', { class: 'dd-btn' });
  const cur = find(value) || options[0];
  const lbl = el('span', {}, cur ? cur.label : '');
  btn.append(lbl, el('span', { class: 'chev' }, '▾'));
  const menu = el('div', { class: 'dd-menu' + (opt.right ? ' right' : '') });
  const build = () => {
    menu.innerHTML = '';
    options.forEach((o) => {
      const it = el('div', { class: 'dd-opt' + (String(o.value) === String(value) ? ' sel' : '') }, o.dot ? el('span', { class: 'dd-dot', style: `background:${o.dot}` }) : '', o.label);
      it.addEventListener('click', (e) => { e.stopPropagation(); value = o.value; lbl.textContent = o.label; dd.classList.remove('open'); build(); onChange(o.value); });
      menu.append(it);
    });
  };
  build();
  btn.addEventListener('click', (e) => { e.stopPropagation(); document.querySelectorAll('.dd.open').forEach((d) => { if (d !== dd) d.classList.remove('open'); }); dd.classList.toggle('open'); });
  dd.append(btn, menu);
  dd.setValue = (v) => { value = v; const c = find(v); if (c) lbl.textContent = c.label; build(); };
  return dd;
}
document.addEventListener('click', () => document.querySelectorAll('.dd.open').forEach((d) => d.classList.remove('open')));

// ── Утилиты ──────────────────────────────────────────────────────────────────
const spinner = () => el('div', { class: 'spinner' });
const msg = (text) => el('div', { class: 'center-msg' }, text);
const releaseTitle = (r) => r.title_ru || r.title_original || r.title_alt || 'Без названия';
const avatarUrl = (p) => (p && p.avatar) || '';
function fmtDate(ts) { if (!ts) return ''; return new Date(ts * 1000).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fmtWatchTime(min) { if (!min) return '0 ч'; const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60); return (d ? d + ' дн ' : '') + h + ' ч'; }
function skeletonGrid(n = 12) { const g = el('div', { class: 'skel-grid' }); for (let i = 0; i < n; i++) g.append(el('div', { class: 'skel' })); return g; }

function makeCard(r, i = 0) {
  const grade = r.grade ? Number(r.grade).toFixed(1) : null;
  return el('div', { class: 'card', style: `animation-delay:${Math.min(i * 22, 380)}ms`, onclick: () => openRelease(r.id) },
    el('div', { class: 'card-poster-wrap' },
      r.profile_list_status ? el('span', { class: 'card-status-dot', style: `background:${statusColor(r.profile_list_status)}` }) : '',
      grade ? el('span', { class: 'card-grade-badge' }, '★ ' + grade) : '',
      el('img', { class: 'card-poster', src: r.image || '', loading: 'lazy', alt: '' })),
    el('div', { class: 'card-body' },
      el('div', { class: 'card-title' }, releaseTitle(r)),
      el('div', { class: 'card-meta' }, el('span', {}, r.year || '—'), r.episodes_total ? el('span', {}, (r.episodes_released ?? '?') + '/' + (r.episodes_total || '?') + ' эп.') : '')));
}
function makeGrid(items, emptyText) {
  if (!items || !items.length) return msg(emptyText || 'Ничего не найдено');
  const grid = el('div', { class: 'grid' });
  items.forEach((r, i) => grid.append(makeCard(r, i)));
  return grid;
}
function makePager(page, onPrev, onNext) {
  return el('div', { class: 'pager' },
    el('button', { class: 'btn secondary', onclick: onPrev, disabled: page <= 0 }, '← Назад'),
    el('span', { class: 'muted' }, 'Стр. ' + (page + 1)),
    el('button', { class: 'btn secondary', onclick: onNext }, 'Вперёд →'));
}
const sectionTitle = (text, icon) => el('div', { class: 'section-title' }, el('span', { class: 'accent-bar' }), icon ? ic(icon, 18) : '', text);

// ── Навигация ────────────────────────────────────────────────────────────────
const VIEWS = { discover: renderDiscover, catalog: renderCatalog, search: renderSearch, bookmarks: renderBookmarks, feed: renderFeed, profile: renderProfile, settings: renderSettings };
function setView(view) {
  if (view !== 'profile') state.otherProfileId = null;
  state.view = view;
  document.querySelectorAll('.nav-pill').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  viewTitle.textContent = VIEW_TITLES[view] || '';
  topbarControls.innerHTML = ''; viewRoot.innerHTML = '';
  (VIEWS[view] || (() => {}))();
}
document.querySelectorAll('.nav-pill').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
const topSearchInput = $('#topSearchInput');
topSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const q = topSearchInput.value.trim(); if (!q) return; state.search.query = q; state.search.page = 0; state.search.mode = 'anime'; setView('search'); } });

// ── Обзор ────────────────────────────────────────────────────────────────────
async function renderDiscover() {
  viewRoot.innerHTML = ''; viewRoot.append(skeletonGrid(10));
  const [intRes, watchRes] = await Promise.all([window.anixart.discoverInteresting(), window.anixart.discoverWatching(0)]);
  if (state.view !== 'discover') return;
  state.discover.banners = (intRes && intRes.content) || [];
  state.discover.watching = (watchRes && watchRes.content) || [];
  viewRoot.innerHTML = '';
  if (state.discover.banners.length) {
    const rail = el('div', { class: 'hero-rail' });
    state.discover.banners.forEach((b) => rail.append(el('div', { class: 'hero-card', onclick: () => { if (b.action) openRelease(Number(b.action)); } },
      el('img', { src: b.image || '', alt: '' }), el('div', { class: 'hero-text' }, el('h3', {}, b.title || ''), el('p', {}, b.description || '')))));
    viewRoot.append(sectionTitle('Интересное', 'sparkle'), rail);
  }
  viewRoot.append(sectionTitle('Сейчас смотрят', 'fire'), makeGrid(state.discover.watching));
}

// ── Каталог ──────────────────────────────────────────────────────────────────
async function loadCatalog() {
  viewRoot.innerHTML = ''; viewRoot.append(skeletonGrid());
  const res = await window.anixart.filter(state.catalog.page, { sort: state.catalog.sort });
  state.catalog.items = res.content || [];
  if (state.view === 'catalog') renderCatalog();
}
function renderCatalog() {
  topbarControls.innerHTML = '';
  topbarControls.append(ddSelect(SORT_OPTIONS, state.catalog.sort, (v) => { state.catalog.sort = Number(v); state.catalog.page = 0; loadCatalog(); }, { right: true }));
  viewRoot.innerHTML = '';
  if (!state.catalog.items.length) { loadCatalog(); return; }
  viewRoot.append(makeGrid(state.catalog.items));
  viewRoot.append(makePager(state.catalog.page, () => { state.catalog.page--; loadCatalog(); }, () => { state.catalog.page++; loadCatalog(); }));
}

// ── Поиск ────────────────────────────────────────────────────────────────────
function renderSearch() {
  viewRoot.innerHTML = '';
  if (!state.search.query) { viewRoot.append(msg('Введите запрос в строке поиска вверху.')); topSearchInput.focus(); return; }
  viewRoot.append(el('div', { class: 'muted', style: 'margin-bottom:14px;font-size:15px' }, 'Результаты по запросу: ', el('b', { style: 'color:var(--text)' }, '«' + state.search.query + '»')));
  const tabs = el('div', { class: 'tabs' });
  [['anime', 'Аниме'], ['users', 'Пользователи']].forEach(([k, lbl]) => { const t = el('button', { class: 'tab' + ((state.search.mode || 'anime') === k ? ' active' : ''), onclick: () => { state.search.mode = k; state.search.page = 0; renderSearch(); } }, lbl); tabs.append(t); });
  viewRoot.append(tabs, el('div', { id: 'searchResults' }));
  runSearch();
}
function userCard(u) {
  return el('div', { class: 'friend-card', onclick: () => openProfile(u.id) },
    el('img', { class: 'friend-av', src: avatarUrl(u) || '', alt: '' }),
    el('div', { class: 'friend-name' }, u.login || ('ID ' + u.id)),
    el('div', { class: 'muted', style: 'font-size:12px' }, u.status || ''));
}
async function runSearch() {
  const results = $('#searchResults'); results.innerHTML = ''; results.append(skeletonGrid());
  const mode = state.search.mode || 'anime';
  if (mode === 'users') {
    const res = await window.anixart.searchProfiles(state.search.page, state.search.query);
    results.innerHTML = '';
    const list = (res && res.content) || [];
    if (!list.length) { results.append(msg('Пользователи не найдены.')); return; }
    const grid = el('div', { class: 'friends-grid' });
    list.forEach((u) => grid.append(userCard(u)));
    results.append(grid, makePager(state.search.page, () => { state.search.page--; runSearch(); }, () => { state.search.page++; runSearch(); }));
    return;
  }
  const res = await window.anixart.search(state.search.page, state.search.query);
  results.innerHTML = '';
  if (res._empty || (res.content && !res.content.length)) { results.append(msg('Ничего не найдено.')); return; }
  state.search.items = res.content || [];
  results.append(makeGrid(state.search.items));
  results.append(makePager(state.search.page, () => { state.search.page--; runSearch(); }, () => { state.search.page++; runSearch(); }));
}

// ── Закладки (Коллекции / История / Избранное / статусы) ────────────────────────
const BM_TABS = [
  { v: 'col', label: 'Коллекции' }, { v: 'hist', label: 'История' }, { v: 'fav', label: 'Избранное' },
  ...LIST_STATUS.map((s) => ({ v: s.v, label: s.label })),
];
function renderBookmarks() {
  viewRoot.innerHTML = '';
  if (!isAuthed()) { viewRoot.append(msg('Войдите в аккаунт (меню профиля справа сверху), чтобы видеть закладки.')); return; }
  const tabs = el('div', { class: 'tabs' });
  BM_TABS.forEach((t) => tabs.append(el('button', { class: 'tab' + (state.bm.tab === t.v ? ' active' : ''), onclick: () => { state.bm.tab = t.v; state.bm.page = 0; state.bm.col = null; renderBookmarks(); } }, t.label)));
  viewRoot.append(tabs);
  topbarControls.innerHTML = '';
  if (typeof state.bm.tab === 'number') topbarControls.append(iconBtn('btn secondary', 'shuffle', 'Перемешать', async () => { const pid = state.auth.profile && state.auth.profile.id; const r = await window.anixart.randomFromList(pid, state.bm.tab); if (r && r.release) openRelease(r.release.id); }));
  const box = el('div', { id: 'bmBox' }); viewRoot.append(box);
  loadBookmark(box);
}
async function loadBookmark(box) {
  box.innerHTML = ''; box.append(skeletonGrid());
  const t = state.bm.tab, page = state.bm.page;
  // открыта конкретная коллекция
  if (t === 'col' && state.bm.col) {
    const res = await window.anixart.collectionReleases(state.bm.col.id, page);
    if (state.view !== 'bookmarks') return;
    box.innerHTML = '';
    box.append(iconBtn('btn secondary', 'back', 'К коллекциям', () => { state.bm.col = null; state.bm.page = 0; loadBookmark(box); }));
    box.append(makeGrid((res && res.content) || [], 'В коллекции пусто.'));
    box.append(makePager(page, () => { state.bm.page--; loadBookmark(box); }, () => { state.bm.page++; loadBookmark(box); }));
    return;
  }
  let res, items, isCollections = false;
  if (t === 'col') { res = await window.anixart.collectionFavorites(page); isCollections = true; }
  else if (t === 'hist') res = await window.anixart.historyList(page);
  else if (t === 'fav') res = await window.anixart.favoritesList(page);
  else res = await window.anixart.profileList(t, page);
  if (state.view !== 'bookmarks') return;
  items = (res && res.content) || [];
  box.innerHTML = '';
  if (isCollections) {
    if (!items.length) box.append(msg('Нет избранных коллекций.'));
    else { const g = el('div', { class: 'grid' }); items.forEach((c) => g.append(collectionCard(c))); box.append(g); }
  } else box.append(makeGrid(items, 'Список пуст.'));
  box.append(makePager(page, () => { state.bm.page--; loadBookmark(box); }, () => { state.bm.page++; loadBookmark(box); }));
}
function collectionCard(c) {
  return el('div', { class: 'card', onclick: () => { state.bm.col = c; state.bm.page = 0; loadBookmark($('#bmBox')); } },
    el('div', { class: 'card-poster-wrap' }, el('img', { class: 'card-poster', src: c.image || '', loading: 'lazy', alt: '' })),
    el('div', { class: 'card-body' }, el('div', { class: 'card-title' }, c.title || 'Коллекция'),
      el('div', { class: 'card-meta' }, el('span', {}, (c.release_count ?? c.count ?? '') + ' релизов'))));
}

// ── Лента (каналы) ─────────────────────────────────────────────────────────────
async function renderFeed() {
  viewRoot.innerHTML = '';
  if (!isAuthed()) { viewRoot.append(msg('Войдите в аккаунт, чтобы пользоваться лентой и каналами.')); return; }
  viewRoot.append(spinner());
  const [subs, recs] = await Promise.all([window.anixart.channelSubs(0), window.anixart.channelRecs(0)]);
  if (state.view !== 'feed') return;
  viewRoot.innerHTML = '';
  const mySubs = (subs && subs.content) || [];
  if (mySubs.length) { viewRoot.append(sectionTitle('Мои подписки', 'feed')); const l = el('div', { class: 'channel-list' }); mySubs.forEach((c) => l.append(channelRow(c))); viewRoot.append(l); }
  else viewRoot.append(el('div', { class: 'center-msg', style: 'padding:30px 0' }, 'Подписок пока нет — подпишитесь на каналы ниже.'));
  viewRoot.append(sectionTitle('Рекомендуемые каналы', 'star'));
  const list = el('div', { class: 'channel-list' });
  ((recs && recs.content) || []).forEach((c) => list.append(channelRow(c)));
  viewRoot.append(list);
}
function channelRow(c) {
  let subbed = !!c.is_subscribed;
  const subBtn = el('button', { class: 'btn' + (subbed ? ' secondary' : '') });
  const paintSub = () => { subBtn.innerHTML = ''; subBtn.append(subbed ? ic('check', 16) : ic('plus', 16), el('span', {}, subbed ? 'Вы подписаны' : 'Подписаться')); subBtn.classList.toggle('secondary', subbed); };
  paintSub();
  subBtn.addEventListener('click', async (e) => { e.stopPropagation(); subbed = !subbed; paintSub(); await window.anixart.channelSubscribe(c.id, subbed); });
  return el('div', { class: 'channel-row', onclick: () => openChannel(c) },
    el('img', { class: 'channel-av', src: c.avatar || '', alt: '' }),
    el('div', { class: 'channel-meta' },
      el('div', { class: 'channel-name' }, c.title || 'Канал', c.is_verified ? el('span', { class: 'verified' }, '✓') : ''),
      el('div', { class: 'channel-subs' }, (c.subscriber_count ?? 0) + ' подписчиков · ' + (c.article_count ?? 0) + ' статей')),
    subBtn);
}
async function openChannel(c) {
  viewRoot.innerHTML = '';
  viewRoot.append(iconBtn('btn secondary', 'back', 'К ленте', () => setView('feed')));
  viewRoot.append(el('div', { class: 'channel-head' },
    el('img', { class: 'channel-av-lg', src: c.avatar || '', alt: '' }),
    el('div', {}, el('h2', { style: 'font-size:22px' }, c.title || 'Канал'), el('div', { class: 'muted' }, (c.subscriber_count ?? 0) + ' подписчиков'),
      el('div', { class: 'muted', style: 'margin-top:8px;font-size:13.5px' }, c.description || ''))));
  const box = el('div', {}); viewRoot.append(box); box.append(spinner());
  const res = await window.anixart.channelArticles(c.id, 0);
  box.innerHTML = '';
  const arts = (res && res.content) || [];
  if (!arts.length) { box.append(msg('В канале нет статей.')); return; }
  arts.forEach((a) => box.append(articleCard(a, c)));
}
function articleText(a) {
  let p = a.payload; if (p == null) return '';
  if (typeof p === 'string') { try { p = JSON.parse(p); } catch { return p.slice(0, 320); } }
  const collect = (x) => { if (!x) return ''; if (typeof x === 'string') return x; if (Array.isArray(x)) return x.map(collect).join(' '); if (typeof x === 'object') return Object.values(x).map(collect).join(' '); return ''; };
  return collect(p).replace(/https?:\/\/\S+/g, '').replace(/\{|\}|"/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 360);
}
function decodeHtml(html) { const doc = new DOMParser().parseFromString(String(html || ""), "text/html"); return doc.body.textContent || ""; }
function renderArticleBody(a) {
  let p = a.payload; if (typeof p === "string") { try { p = JSON.parse(p); } catch { return el("div", { class: "article-body" }, p); } }
  const blocks = (p && p.blocks) || [];
  const wrap = el("div", { class: "article-body" });
  blocks.forEach((bl) => {
    const d = bl.data || {};
    if (bl.type === "paragraph") wrap.append(el("p", { class: "art-p" }, decodeHtml(d.text)));
    else if (bl.type === "header") wrap.append(el(d.level >= 3 ? "h4" : "h3", { class: "art-h" }, decodeHtml(d.text)));
    else if (bl.type === "image") { const url = (d.file && d.file.url) || d.url; if (url) wrap.append(el("img", { class: "art-img", src: url, loading: "lazy", onclick: () => lightbox(url) })); if (d.caption) wrap.append(el("div", { class: "art-cap" }, decodeHtml(d.caption))); }
    else if (bl.type === "list") { const list = el(d.style === "ordered" ? "ol" : "ul", { class: "art-list" }); (d.items || []).forEach((it) => list.append(el("li", {}, decodeHtml(typeof it === "string" ? it : (it && it.content) || "")))); wrap.append(list); }
    else if (bl.type === "quote") wrap.append(el("blockquote", { class: "art-quote" }, decodeHtml(d.text)));
    else if (bl.type === "delimiter") wrap.append(el("div", { class: "art-delim" }, "◆ ◆ ◆"));
    else if (d.text) wrap.append(el("p", { class: "art-p" }, decodeHtml(d.text)));
  });
  if (!wrap.children.length) wrap.append(el("div", { class: "muted" }, "(без текста)"));
  return wrap;
}
function articleCard(a, ch) {
  const author = a.author || {};
  return el('div', { class: 'article-card', onclick: () => openArticle(a, ch) },
    el('div', { class: 'article-head' },
      el('img', { class: 'comment-av', src: (ch && ch.avatar) || avatarUrl(author) || '', alt: '' }),
      el('div', {}, el('div', { class: 'comment-author' }, (ch && ch.title) || author.login || 'Канал'),
        el('div', { class: 'comment-date' }, fmtDate(a.creation_date)))),
    renderArticleBody(a),
    el('div', { class: 'comment-foot' }, el('span', { class: 'cf' }, ic('like', 14), String(a.vote_count ?? 0)), el('span', { class: 'cf' }, ic('comment', 14), String(a.comment_count ?? 0)), a.repost_count ? el('span', { class: 'cf' }, ic('repost', 14), String(a.repost_count)) : ''));
}

// ── Профиль ──────────────────────────────────────────────────────────────────
async function renderProfile() {
  viewRoot.innerHTML = '';
  const otherId = state.otherProfileId;
  if (!isAuthed() && !otherId) { renderLoginForm(); return; }
  viewRoot.append(spinner());
  const targetId = otherId || (state.auth.profile && state.auth.profile.id);
  let p;
  try { const res = await window.anixart.profile(targetId); p = res && res.profile; } catch {}
  if (!p) p = state.auth.profile;
  if (!p) { viewRoot.innerHTML = ''; viewRoot.append(msg('Не удалось загрузить профиль.')); return; }
  const isMe = !otherId;
  if (isMe) state.auth.profile = p;
  if (state.view !== 'profile') return;
  viewRoot.innerHTML = '';

  const grad = profileGradient(p);
  const statusEl = el('div', { class: 'profile-status', style: isMe ? '' : 'cursor:default' }, p.status || (isMe ? 'нажмите, чтобы задать статус' : ''));
  const editStatus = () => {
    if (!isMe) return;
    const inp = el('input', { type: 'text', value: p.status || '', maxlength: '64', style: 'margin-top:6px;max-width:320px' });
    const save = async () => { p.status = inp.value.trim(); state.auth.profile = p; await window.anixart.statusEdit(p.status); statusEl.textContent = p.status || 'нажмите, чтобы задать статус'; inp.replaceWith(statusEl); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); }); inp.addEventListener('blur', save);
    statusEl.replaceWith(inp); inp.focus();
  };
  if (isMe) statusEl.addEventListener('click', editStatus);
  const head = el('div', { class: 'profile-head', style: grad ? `--profile-grad:${grad}` : '' },
    el('img', { class: 'profile-avatar' + (isMe ? ' editable' : ''), src: avatarUrl(p) || '', alt: '', title: isMe ? 'Сменить аватар' : '', onclick: isMe ? changeAvatar : null }),
    el('div', { class: 'profile-meta' },
      el('h2', {}, p.login || ('ID ' + p.id), p.is_verified ? el('span', { class: 'verified', style: 'margin-left:8px' }, '✓') : ''),
      statusEl,
      el('div', { class: 'profile-sub muted' }, 'на проекте давно' + (p.friend_count ? ' · ' + p.friend_count + ' друзей' : '')),
      socialLinks(p)));
  if (isMe) { const editBtn = iconBtn('btn secondary', 'edit', 'Статус', editStatus); editBtn.style.marginLeft = 'auto'; head.append(editBtn); }
  else { const back = iconBtn('btn secondary', 'back', 'Назад', () => { state.otherProfileId = null; setView('discover'); }); back.style.marginLeft = 'auto'; head.append(back); }
  viewRoot.append(head);

  // Вкладки профиля
  const tabs = el('div', { class: 'tabs', style: 'margin-top:22px' });
  [['stats', 'Статистика', 'stats'], ['wall', 'Стена', 'edit'], ['votes', 'Оценки релизов', 'star'], ['friends', 'Друзья', 'friends']].forEach(([k, lbl, icon]) => { const t = el('button', { class: 'tab tab-ic' + (state.profileTab === k ? ' active' : ''), onclick: () => { state.profileTab = k; renderProfileTab(p, body); tabs.querySelectorAll('.tab').forEach((x) => x.classList.remove('active')); t.classList.add('active'); } }, ic(icon, 15), el('span', {}, lbl)); tabs.append(t); });
  const body = el('div', {});
  viewRoot.append(tabs, body);
  renderProfileTab(p, body);

  if (isMe) viewRoot.append(el('div', { style: 'margin-top:26px' }, iconBtn('btn secondary', 'logout', 'Выйти из аккаунта', doLogout)));
}
function socialLinks(p) {
  const links = [['VK', p.vk_page], ['Telegram', p.tg_page], ['Instagram', p.inst_page], ['TikTok', p.tt_page], ['Discord', p.discord_page]].filter(([, v]) => v);
  if (!links.length) return '';
  const wrap = el('div', { class: 'social-row' });
  links.forEach(([name, v]) => wrap.append(el('span', { class: 'social-chip' }, name + ': ' + v)));
  return wrap;
}
function openProfile(id) { closeModal(); state.otherProfileId = (state.auth.profile && id === state.auth.profile.id) ? null : id; state.profileTab = 'stats'; setView('profile'); }

function renderProfileTab(p, body) {
  body.innerHTML = '';
  if (state.profileTab === 'stats') return renderStats(p, body);
  if (state.profileTab === 'wall') return renderWall(p, body);
  if (state.profileTab === 'votes') return renderVotes(p, body);
  if (state.profileTab === 'friends') return renderFriends(p, body);
}
async function renderWall(p, body) {
  const isMe = !state.otherProfileId;
  body.append(spinner());
  const blog = await window.anixart.blogGet(p.id);
  body.innerHTML = '';
  const channel = (blog && blog.code === 0 && blog.channel && blog.channel.id) ? blog.channel : null;
  if (isMe) {
    if (!channel) {
      body.append(el('div', { class: 'wall-post' },
        el('div', {}, 'У вас ещё нет стены. Создайте её, чтобы публиковать записи.'),
        el('div', { style: 'margin-top:12px' }, iconBtn('btn', 'plus', 'Создать стену', async () => { const r = await window.anixart.blogCreate(); if (r && (r.code === 0 || r.channel)) renderWall(p, body); else alert('Не удалось создать стену (код ' + (r && r.code) + ').'); }))));
      return;
    }
    const ta = el('textarea', { class: 'comment-input', placeholder: 'Что нового?…', rows: '3' });
    const send = iconBtn('btn', 'check', 'Опубликовать');
    send.addEventListener('click', async () => { const t = ta.value.trim(); if (!t) return; send.disabled = true; const r = await window.anixart.articleCreate(channel.id, t); send.disabled = false; if (r && (r.code === 0 || r.article)) { ta.value = ''; renderWall(p, body); } else alert('Не удалось опубликовать (код ' + (r && r.code) + ').'); });
    body.append(el('div', { class: 'comment-form' }, ta, el('div', { class: 'comment-form-row' }, send)));
  }
  if (!channel) { body.append(msg('Записей нет.')); return; }
  const arts = await window.anixart.channelArticles(channel.id, 0);
  const list = (arts && arts.content) || [];
  if (!list.length) { body.append(msg('Записей пока нет.')); return; }
  list.forEach((a) => { const post = el('div', { class: 'wall-post', onclick: () => openArticle(a, channel) }, el('div', { class: 'wall-post-date' }, fmtDate(a.creation_date)), renderArticleBody(a), el('div', { class: 'comment-foot', style: 'margin-top:8px' }, el('span', { class: 'cf' }, ic('like', 14), String(a.vote_count ?? 0)), el('span', { class: 'cf' }, ic('comment', 14), String(a.comment_count ?? 0)))); body.append(post); });
}

function renderStats(p, body) {
  // Кольцевая диаграмма распределения списков
  const segs = LIST_STATUS.map((s) => ({ label: s.label, color: s.color, value: [null, p.watching_count, p.plan_count, p.completed_count, p.hold_on_count, p.dropped_count][s.v] || 0 }));
  const donut = el('div', { class: 'stats-row' },
    el('div', { class: 'donut-wrap', html: donutSVG(segs) }),
    el('div', { class: 'donut-legend' }, segs.map((s) => el('div', { class: 'legend-item' },
      el('span', { class: 'legend-dot', style: `background:${s.color}` }), el('span', {}, s.label), el('b', {}, String(s.value))))));

  // Сводка
  const summary = el('div', { class: 'summary-row' },
    el('div', { class: 'stat-card' }, el('div', { class: 'stat-num' }, String(p.watched_episode_count ?? 0)), el('div', { class: 'stat-label' }, 'Просмотрено серий')),
    el('div', { class: 'stat-card' }, el('div', { class: 'stat-num', style: 'font-size:20px' }, fmtWatchTime(p.watched_time)), el('div', { class: 'stat-label' }, 'Время просмотра')),
    el('div', { class: 'stat-card' }, el('div', { class: 'stat-num' }, String(p.favorite_count ?? 0)), el('div', { class: 'stat-label' }, 'В избранном')),
    el('div', { class: 'stat-card' }, el('div', { class: 'stat-num' }, String(p.comment_count ?? 0)), el('div', { class: 'stat-label' }, 'Комментариев')));

  body.append(donut, summary);

  // Проценты по жанрам/аудитории/тематике
  const prefBlock = (title, arr) => {
    if (!arr || !arr.length) return '';
    const wrap = el('div', { class: 'pref-block' }, el('div', { class: 'pref-title' }, title));
    arr.slice(0, 6).forEach((g) => wrap.append(el('div', { class: 'pref-row' },
      el('span', { class: 'pref-name' }, g.name), el('div', { class: 'pref-bar' }, el('div', { class: 'pref-fill', style: `width:${Math.min(100, (g.percentage || 0) * 4)}%` })), el('span', { class: 'pref-pct' }, (g.percentage || 0) + '%'))));
    return wrap;
  };
  const prefs = el('div', { class: 'prefs-grid' });
  [prefBlock('Жанры', p.preferred_genres), prefBlock('Аудитория', p.preferred_audiences), prefBlock('Тематика', p.preferred_themes)].filter(Boolean).forEach((b) => prefs.append(b));
  if (prefs.children.length) body.append(sectionTitle('Предпочтения'), prefs);

  // Динамика просмотра серий
  const dyn = (p.watch_dynamics || []).slice(-14);
  if (dyn.length) {
    const max = Math.max(1, ...dyn.map((d) => d.count || 0));
    const chart = el('div', { class: 'bars' });
    dyn.forEach((d) => {
      const lbl = d.timestamp ? new Date(d.timestamp * 1000).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : String(d.day || '');
      chart.append(el('div', { class: 'bar-col' },
        el('span', { class: 'bar-val' }, String(d.count || 0)),
        el('div', { class: 'bar', style: `height:${Math.max(4, (d.count || 0) / max * 100)}%` }),
        el('span', { class: 'bar-lbl' }, lbl)));
    });
    body.append(sectionTitle('Динамика просмотра серий'), chart);
  }
}
function donutSVG(segs) {
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const r = 54, c = 2 * Math.PI * r; let off = 0;
  let circles = `<circle cx="70" cy="70" r="${r}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="22"/>`;
  segs.filter((s) => s.value > 0).forEach((s) => {
    const len = s.value / total * c;
    circles += `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${s.color}" stroke-width="22" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)" stroke-linecap="butt"/>`;
    off += len;
  });
  return `<svg viewBox="0 0 140 140" width="150" height="150">${circles}<text x="70" y="64" text-anchor="middle" fill="#fff" font-size="22" font-weight="800">${total}</text><text x="70" y="84" text-anchor="middle" fill="#939ab0" font-size="11">всего</text></svg>`;
}
async function renderVotes(p, body) {
  body.append(spinner());
  // оценки есть в превью профиля; берём свежий профиль
  let votes = p.votes || [];
  body.innerHTML = '';
  if (!votes.length) { body.append(msg('Оценённых релизов нет.')); return; }
  body.append(makeGrid(votes, 'Оценённых релизов нет.'));
}
async function renderFriends(p, body) {
  body.append(spinner());
  const res = await window.anixart.friends(p.id, 0);
  body.innerHTML = '';
  const friends = (res && res.content) || [];
  const list = el('div', { class: 'friends-grid' });
  if (!friends.length) body.append(msg('Друзей пока нет.')); else
  friends.forEach((f) => list.append(el('div', { class: 'friend-card', onclick: () => openProfile(f.id) },
    el('img', { class: 'friend-av', src: avatarUrl(f) || '', alt: '' }),
    el('div', { class: 'friend-name' }, f.login || ('ID ' + f.id)),
    el('div', { class: 'muted', style: 'font-size:12px' }, f.status || ''))));
  if (friends.length) body.append(list);
  try { const recs = await window.anixart.friendRecs(); const rl = (recs && recs.content) || []; if (rl.length) { body.append(sectionTitle('Возможно, вы знакомы')); const g = el('div', { class: 'friends-grid' }); rl.forEach((u) => g.append(userCard(u))); body.append(g); } } catch {}
}
async function renderSettings() {
  viewRoot.innerHTML = '';
  if (!isAuthed()) { viewRoot.append(msg('Войдите в аккаунт, чтобы менять настройки.')); return; }
  viewRoot.append(spinner());
  const my = await window.anixart.prefMy();
  const p = state.auth.profile || {};
  if (state.view !== 'settings') return;
  viewRoot.innerHTML = '';
  const box = el('div', { class: 'settings-box' });
  const flash = (node, ok) => { node.textContent = ok ? 'Сохранено ✓' : 'Ошибка'; node.style.color = ok ? 'var(--good)' : 'var(--accent-3)'; setTimeout(() => { node.textContent = ''; }, 2500); };

  box.append(sectionTitle('Плеер', 'play'));
  { const adOn = state.store.settings.adblock !== false; const cb = el('input', { type: 'checkbox' }); if (adOn) cb.checked = true;
    cb.addEventListener('change', async () => { state.store.settings.adblock = cb.checked; await window.anixart.storeSet({ settings: state.store.settings }); });
    box.append(el('label', { class: 'toggle-row' }, cb, el('span', {}, 'Блокировать рекламу в плеере (адблокер)')));
    box.append(el('div', { class: 'hint', style: 'margin-top:6px;margin-bottom:6px' }, 'Режет рекламные сети в kodik/sibnet. Применяется при следующем запуске серии.')); }

  box.append(sectionTitle('Аватар', 'user'));
  box.append(el('div', { class: 'field' }, el('div', { style: 'display:flex;align-items:center;gap:16px' }, el('img', { src: avatarUrl(p) || '', style: 'width:72px;height:72px;border-radius:50%;object-fit:cover;background:var(--bg-3)' }), iconBtn('btn secondary', 'edit', 'Загрузить новый', changeAvatar))));

  box.append(sectionTitle('Социальные ссылки', 'user'));
  const sf = {};
  [['vk_page', 'VK'], ['tg_page', 'Telegram'], ['inst_page', 'Instagram'], ['tt_page', 'TikTok'], ['discord_page', 'Discord']].forEach(([k, lbl]) => { const inp = el('input', { type: 'text', value: p[k] || '', placeholder: 'username' }); sf[k] = inp; box.append(el('div', { class: 'field' }, el('label', {}, lbl), inp)); });
  const socInfo = el('span', { class: 'muted', style: 'margin-left:12px' });
  box.append(el('div', { class: 'field' }, iconBtn('btn', 'check', 'Сохранить ссылки', async () => { const b = {}; Object.keys(sf).forEach((k) => b[k] = sf[k].value.trim()); if (state.auth.profile) Object.assign(state.auth.profile, b); const r = await window.anixart.socialEdit(b); flash(socInfo, r && r.code === 0); }), socInfo));

  box.append(sectionTitle('Приватность', 'edit'));
  [['stats', 'Скрывать статистику', my.privacy_stats], ['counts', 'Скрывать счётчики', my.privacy_counts], ['social', 'Скрывать соцсети', my.privacy_social], ['incognito', 'Режим инкогнито', my.is_incognito ? 1 : 0]].forEach(([kind, lbl, val]) => {
    const cb = el('input', { type: 'checkbox' }); if (val) cb.checked = true;
    cb.addEventListener('change', () => window.anixart.privacyEdit(kind, cb.checked ? 1 : 0).catch(() => {}));
    box.append(el('label', { class: 'toggle-row' }, cb, el('span', {}, lbl)));
  });

  box.append(sectionTitle('Смена логина', 'edit'));
  const loginInp = el('input', { type: 'text', value: p.login || '', placeholder: 'Новый логин' });
  const loginInfo = el('span', { class: 'muted', style: 'margin-left:12px' });
  box.append(el('div', { class: 'field' }, loginInp), el('div', { class: 'field' }, iconBtn('btn secondary', 'edit', 'Сменить логин', async () => { const v = loginInp.value.trim(); if (!v) return; const r = await window.anixart.loginChange(v); if (r && r.code === 0 && state.auth.profile) { state.auth.profile.login = v; renderProfileMenu(); } flash(loginInfo, r && r.code === 0); }), loginInfo));

  box.append(sectionTitle('Смена пароля', 'edit'));
  const oldP = el('input', { type: 'password', placeholder: 'Текущий пароль', autocomplete: 'current-password' });
  const newP = el('input', { type: 'password', placeholder: 'Новый пароль', autocomplete: 'new-password' });
  const pwInfo = el('span', { class: 'muted', style: 'margin-left:12px' });
  box.append(el('div', { class: 'field' }, oldP), el('div', { class: 'field' }, newP), el('div', { class: 'field' }, iconBtn('btn secondary', 'edit', 'Сменить пароль', async () => { if (!oldP.value || !newP.value) return; const r = await window.anixart.passwordChange(oldP.value, newP.value); oldP.value = ''; newP.value = ''; flash(pwInfo, r && r.code === 0); }), pwInfo));

  box.append(sectionTitle('Смена почты', 'edit'));
  box.append(el('div', { class: 'hint', style: 'margin-bottom:10px' }, 'Текущая почта: ' + (my.email_hint || '—')));
  const emailInp = el('input', { type: 'text', placeholder: 'Новый e-mail' });
  const emailPw = el('input', { type: 'password', placeholder: 'Текущий пароль', autocomplete: 'current-password' });
  const emInfo = el('span', { class: 'muted', style: 'margin-left:12px' });
  box.append(el('div', { class: 'field' }, emailInp), el('div', { class: 'field' }, emailPw), el('div', { class: 'field' }, iconBtn('btn secondary', 'edit', 'Сменить почту', async () => { if (!emailInp.value || !emailPw.value) return; const r = await window.anixart.emailChange(emailInp.value.trim(), emailPw.value); emailPw.value = ''; flash(emInfo, r && r.code === 0); }), emInfo));

  box.append(sectionTitle('Привязанные аккаунты', 'user'));
  const binds = el('div', { class: 'bindings' });
  [['VK', my.is_vk_bound || my.isVkBound], ['Google', my.is_google_bound || my.isGoogleBound], ['Telegram', my.is_telegram_bound]].forEach(([name, on]) => binds.append(el('div', { class: 'binding-row' }, el('span', {}, name), el('span', { class: on ? 'bind-on' : 'bind-off' }, on ? 'привязан' : 'не привязан'))));
  box.append(binds, el('div', { class: 'hint', style: 'margin-top:8px' }, 'Привязка/отвязка соцсетей делается в мобильном приложении (требует OAuth-вход).'));

  viewRoot.append(box);
}
function profileGradient(p) {
  const toHex = (c) => { if (c == null) return null; if (typeof c === 'string') return c.startsWith('#') ? c : ('#' + c.replace(/^0x/i, '')); const n = (c >>> 0) & 0xffffff; return '#' + n.toString(16).padStart(6, '0'); };
  const a = toHex(p.theme_gradient_start_color), b = toHex(p.theme_gradient_end_color);
  if (a && b && /^#[0-9a-f]{6}$/i.test(a) && /^#[0-9a-f]{6}$/i.test(b)) return `linear-gradient(${(p.theme_gradient_angle || 120)}deg, ${a}, ${b})`;
  return null;
}
async function doLogout() { await window.anixart.logout(); state.auth = { token: '', profile: null }; renderProfileMenu(); setView('profile'); }
function renderLoginForm() {
  const box = el('div', { class: 'settings-box' });
  const login = el('input', { type: 'text', placeholder: 'E-mail или логин', autocomplete: 'username' });
  const pass = el('input', { type: 'password', placeholder: 'Пароль', autocomplete: 'current-password' });
  const info = el('div', { class: 'muted', style: 'min-height:18px;margin-top:6px' });
  const submit = async () => {
    const l = login.value.trim(), pw = pass.value;
    if (!l || !pw) { info.textContent = 'Введите логин и пароль.'; return; }
    info.textContent = 'Вход…';
    const res = await window.anixart.signIn(l, pw);
    if (res && res.code === 0 && res.profileToken) { state.auth.token = res.profileToken.token || res.profileToken; state.auth.profile = res.profile || null; pass.value = ''; renderProfileMenu(); setView('profile'); }
    else info.textContent = authError(res);
  };
  pass.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  box.append(
    el('h2', { style: 'font-size:20px;margin-bottom:6px' }, 'Вход в аккаунт AniXart'),
    el('div', { class: 'hint', style: 'margin-bottom:18px' }, 'Логин и пароль отправляются только на сервер AniXart. Пароль не сохраняется — локально хранится лишь токен сессии.'),
    el('div', { class: 'field' }, el('label', {}, 'Логин'), login),
    el('div', { class: 'field' }, el('label', {}, 'Пароль'), pass),
    el('div', { class: 'field' }, el('button', { class: 'btn', onclick: submit }, 'Войти'), info));
  viewRoot.append(box);
}
function authError(res) { if (!res) return 'Нет ответа от сервера.'; return ({ 2: 'Неверный логин или пароль.', 3: 'Слишком много попыток, попробуйте позже.', 4: 'Аккаунт не подтверждён.', 401: 'Ошибка авторизации.' })[res.code] || ('Не удалось войти (код ' + (res.code ?? '?') + ').'); }

// ── Меню профиля (верхняя панель) ──────────────────────────────────────────────
function renderProfileMenu() {
  const host = $('#profileMenu'); host.innerHTML = '';
  if (isAuthed() && state.auth.profile) {
    const p = state.auth.profile;
    const trigger = el('div', { class: 'pm-trigger' }, el('img', { class: 'pm-av', src: avatarUrl(p) || '', alt: '' }), el('span', { class: 'pm-name' }, p.login || ('ID ' + p.id)));
    const pop = el('div', { class: 'pm-pop', style: 'display:none' },
      iconBtn('', 'user', 'Профиль', () => { pop.style.display = 'none'; state.otherProfileId = null; setView('profile'); }),
      iconBtn('', 'edit', 'Настройки', () => { pop.style.display = 'none'; setView('settings'); }),
      iconBtn('', 'logout', 'Выйти', () => { pop.style.display = 'none'; doLogout(); }));
    trigger.addEventListener('click', (e) => { e.stopPropagation(); pop.style.display = pop.style.display === 'none' ? 'block' : 'none'; });
    document.addEventListener('click', () => { pop.style.display = 'none'; });
    host.append(trigger, pop);
  } else host.append(el('button', { class: 'pm-login', onclick: () => setView('profile') }, 'Войти'));
}

// ── Лайтбокс ───────────────────────────────────────────────────────────────────
function lightbox(src) {
  const ov = el('div', { style: 'position:fixed;inset:0;z-index:200;background:rgba(4,5,8,.9);display:grid;place-items:center;cursor:zoom-out', onclick: () => ov.remove() },
    el('img', { src, style: 'max-width:92vw;max-height:92vh;border-radius:14px' }));
  document.body.append(ov);
}

// ── Модалка релиза ─────────────────────────────────────────────────────────────
const modal = $('#modal');
const modalCard = $('#modalCard');
$('.modal-backdrop', modal).addEventListener('click', closeModal);
function closeModal() { modal.classList.add('hidden'); modalCard.innerHTML = ''; }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

async function openRelease(id) {
  modal.classList.remove('hidden'); modalCard.innerHTML = ''; modalCard.append(spinner());
  const res = await window.anixart.release(id); const r = res.release;
  if (!r) { modalCard.innerHTML = ''; modalCard.append(msg('Не удалось загрузить релиз.')); return; }
  renderReleaseDetail(r);
}
function localIsFav(id) { return state.store.favorites.some((x) => x.id === id); }
function renderReleaseDetail(r) {
  modalCard.innerHTML = '';
  const genres = (r.genres || '').split(',').map((s) => s.trim()).filter(Boolean);
  let fav = isAuthed() ? !!r.is_favorite : localIsFav(r.id);
  const favBtn = el('button', { class: 'btn secondary fav-toggle' });
  const paintFav = () => { favBtn.innerHTML = ''; favBtn.append(ic('heart', 17), el('span', {}, fav ? 'В избранном' : 'В избранное')); favBtn.classList.toggle('active', fav); };
  paintFav();
  favBtn.addEventListener('click', async () => {
    fav = !fav; paintFav();
    if (isAuthed()) { if (fav) await window.anixart.favoriteAdd(r.id); else await window.anixart.favoriteDelete(r.id); }
    else { const mini = { id: r.id, image: r.image, title_ru: r.title_ru, title_original: r.title_original, year: r.year, grade: r.grade }; if (fav) state.store.favorites.unshift(mini); else state.store.favorites = state.store.favorites.filter((x) => x.id !== r.id); await persist(); }
  });
  let curStatus = r.profile_list_status || 0;
  const listOpts = [{ value: 0, label: '＋ В список' }, ...LIST_STATUS.map((s) => ({ value: s.v, label: s.label, dot: s.color }))];
  const listDd = ddSelect(listOpts, curStatus, async (v) => {
    const next = Number(v);
    if (!isAuthed()) { listDd.setValue(curStatus); alert('Войдите в аккаунт, чтобы вести списки.'); return; }
    if (curStatus) await window.anixart.profileListDelete(curStatus, r.id);
    if (next) await window.anixart.profileListAdd(next, r.id); curStatus = next;
  });
  let myVote = r.your_vote || 0;
  const stars = el('div', { class: 'stars' });
  const paintStars = () => stars.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('on', i < myVote));
  for (let i = 1; i <= 5; i++) { const star = el('span', { class: 'star' }, '★'); star.addEventListener('click', async () => { if (!isAuthed()) { alert('Войдите в аккаунт, чтобы оценивать.'); return; } if (myVote === i) { await window.anixart.voteDelete(r.id); myVote = 0; } else { await window.anixart.voteAdd(r.id, i); myVote = i; } paintStars(); }); stars.append(star); }
  setTimeout(paintStars, 0);

  const shots = r.screenshot_images || [];
  const related = [...(r.related_releases || []), ...(r.recommended_releases || [])].filter((x) => x && x.id);
  const mtabBody = el('div', { class: 'mtab-body' });
  const TABS = [{ key: 'desc', label: 'Описание' }, shots.length ? { key: 'shots', label: 'Кадры ' + shots.length } : null, related.length ? { key: 'related', label: 'Похожее ' + related.length } : null, { key: 'comments', label: 'Комментарии' }].filter(Boolean);
  const mtabs = el('div', { class: 'mtabs' });
  const renderTab = (key) => {
    mtabs.querySelectorAll('.mtab').forEach((t) => t.classList.toggle('active', t.dataset.k === key));
    mtabBody.innerHTML = '';
    if (key === 'desc') mtabBody.append(el('div', { class: 'detail-desc' }, (r.description || 'Нет описания.').replace(/\s+/g, ' ').trim()));
    else if (key === 'shots') { const g = el('div', { class: 'shots-grid' }); shots.forEach((s) => g.append(el('div', { class: 'shot', onclick: () => lightbox(s) }, el('img', { src: s, loading: 'lazy' })))); mtabBody.append(g); }
    else if (key === 'related') mtabBody.append(makeGrid(related));
    else if (key === 'comments') loadComments(r.id, mtabBody);
  };
  TABS.forEach((t) => mtabs.append(el('div', { class: 'mtab', 'data-k': t.key, onclick: () => renderTab(t.key) }, t.label)));

  // «Смотрели» (is_viewed = есть в истории) — кликабельно, снимает отметку
  let viewed = isAuthed() && !!r.is_viewed;
  const viewedChip = el('span', { class: 'viewed-chip', title: 'Снять отметку (убрать из истории)' });
  const paintViewed = () => { viewedChip.style.display = viewed ? 'inline-flex' : 'none'; viewedChip.innerHTML = ''; viewedChip.append(ic('check', 13), el('span', {}, 'Смотрели'), el('span', { class: 'vx' }, '✕')); };
  paintViewed();
  viewedChip.addEventListener('click', async () => { if (!viewed) return; viewed = false; paintViewed(); await window.anixart.historyDelete(r.id).catch(() => {}); });

  modalCard.append(
    el('button', { class: 'close-x', onclick: closeModal }, '×'),
    el('div', { class: 'detail-banner' }, el('img', { src: r.image || '', alt: '' })),
    el('div', { class: 'detail-hero' },
      el('img', { class: 'detail-poster', src: r.image || '', alt: '' }),
      el('div', { class: 'detail-info' },
        el('h2', {}, releaseTitle(r)),
        el('div', { class: 'detail-orig' }, r.title_original || ''),
        el('div', { class: 'detail-stats' },
          el('span', {}, el('b', {}, '★ ' + (r.grade ? Number(r.grade).toFixed(2) : '—'))),
          el('span', { class: 'muted' }, (r.year || '—') + ' · ' + ((r.status && r.status.name) || r.country || '')),
          el('span', { class: 'muted' }, 'Эп.: ' + (r.episodes_released ?? '?') + '/' + (r.episodes_total ?? '?')),
          viewedChip),
        el('div', { class: 'chips' }, genres.map((g) => el('span', { class: 'chip' }, g))),
        el('div', { class: 'detail-actions' },
          iconBtn('btn', 'play', 'Смотреть', () => openPlayer(r)),
          favBtn, listDd, el('span', { class: 'muted', style: 'margin-left:6px' }, 'Оценка:'), stars))),
    mtabs, mtabBody);
  renderTab('desc');
}
async function loadComments(rid, container) {
  container.innerHTML = '';
  if (isAuthed()) {
    const ta = el('textarea', { class: 'comment-input', placeholder: 'Написать комментарий…', rows: '2' });
    const spoiler = el('label', { class: 'spoiler-check' }, el('input', { type: 'checkbox' }), el('span', {}, 'спойлер'));
    const sendBtn = iconBtn('btn', 'comment', 'Отправить');
    sendBtn.addEventListener('click', async () => { const m = ta.value.trim(); if (!m) return; sendBtn.disabled = true; await window.anixart.commentAdd(rid, m, spoiler.querySelector('input').checked); ta.value = ''; sendBtn.disabled = false; loadComments(rid, container); });
    container.append(el('div', { class: 'comment-form' }, ta, el('div', { class: 'comment-form-row' }, spoiler, sendBtn)));
  }
  const wrap = el('div', {}); container.append(wrap); wrap.append(spinner());
  const res = await window.anixart.comments(rid, 0);
  wrap.innerHTML = '';
  const list = (res && res.content) || [];
  if (!list.length) { wrap.append(msg('Комментариев пока нет. Будьте первым!')); return; }
  list.forEach((c) => wrap.append(buildComment(c, rid, false)));
}
function buildComment(c, rid, isReply, ro) {
  const p = c.profile || {};
  const node = el('div', { class: 'comment' + (isReply ? ' reply' : '') });
  const textEl = el('div', { class: 'comment-text' + (c.is_spoiler ? ' spoiler' : '') }, c.message || '');
  if (c.is_spoiler) textEl.addEventListener('click', () => textEl.classList.add('revealed'));
  let likes = c.likes_count ?? c.vote_count ?? 0, liked = c.vote === 1;
  const likeBtn = el('span', { class: 'cf' + (ro ? '' : ' cf-btn') });
  const paintLike = () => { likeBtn.innerHTML = ''; likeBtn.append(ic('like', 14), el('span', {}, String(likes))); likeBtn.classList.toggle('on', liked); };
  paintLike();
  if (!ro) likeBtn.addEventListener('click', async () => { if (!isAuthed()) { alert('Войдите, чтобы оценивать комментарии.'); return; } liked = !liked; likes += liked ? 1 : -1; paintLike(); await window.anixart.commentVote(c.id, liked ? 1 : 0).catch(() => {}); });
  const foot = el('div', { class: 'comment-foot' }, likeBtn);
  const repliesBox = el('div', { class: 'replies', style: 'display:none' });
  if (!ro && !isReply && c.reply_count) {
    const rb = el('span', { class: 'cf cf-btn' }, ic('comment', 14), el('span', {}, 'Ответы (' + c.reply_count + ')'));
    let open = false;
    rb.addEventListener('click', async () => { open = !open; repliesBox.style.display = open ? 'block' : 'none'; if (open && !repliesBox.dataset.loaded) { repliesBox.dataset.loaded = '1'; repliesBox.append(spinner()); const r = await window.anixart.commentReplies(c.id, 0); repliesBox.innerHTML = ''; ((r && r.content) || []).forEach((x) => repliesBox.append(buildComment(x, rid, true))); } });
    foot.append(rb);
  }
  const myId = state.auth.profile && state.auth.profile.id;
  if (!ro && p.id && p.id === myId) {
    const editBtn = el('span', { class: 'cf cf-btn' }, 'Ред.');
    editBtn.addEventListener('click', () => {
      const ta = el('textarea', { class: 'comment-input' }); ta.value = c.message || '';
      const save = el('button', { class: 'btn', style: 'margin-top:8px' }, 'Сохранить');
      save.addEventListener('click', async () => { const m = ta.value.trim(); if (!m) return; await window.anixart.commentEdit(c.id, m, c.is_spoiler); c.message = m; textEl.textContent = m; ta.replaceWith(textEl); save.remove(); });
      textEl.replaceWith(ta); ta.after(save); ta.focus();
    });
    const delBtn = el('span', { class: 'cf cf-btn' }, 'Удалить');
    delBtn.addEventListener('click', async () => { if (!confirm('Удалить комментарий?')) return; await window.anixart.commentDelete(c.id); node.remove(); });
    foot.append(editBtn, delBtn);
  }
  if (c.is_edited) foot.append(el('span', { class: 'muted' }, 'изменён'));
  const author = el('span', { class: 'comment-author link', onclick: () => p.id && openProfile(p.id) }, p.login || 'Аноним');
  node.append(
    el('img', { class: 'comment-av', src: avatarUrl(p) || '', alt: '', onclick: () => p.id && openProfile(p.id) }),
    el('div', { class: 'comment-main' },
      el('div', { class: 'comment-head' }, author, el('span', { class: 'comment-date' }, fmtDate(c.timestamp))),
      textEl, foot, repliesBox));
  return node;
}
async function openArticle(a, ch) {
  modal.classList.remove('hidden'); modalCard.innerHTML = '';
  modalCard.append(el('div', { class: 'article-head', style: 'padding:26px 32px 0' },
    el('img', { class: 'channel-av', src: (ch && ch.avatar) || '', alt: '' }),
    el('div', {}, el('div', { class: 'comment-author', style: 'font-size:16px' }, (ch && ch.title) || 'Канал'), el('div', { class: 'comment-date' }, fmtDate(a.creation_date)))));
  const body = renderArticleBody(a); body.setAttribute('style', 'padding:16px 32px 6px'); modalCard.append(body);
  if (a.repost_article) { const rch = a.repost_article.channel; const rb = renderArticleBody(a.repost_article); const box = el('div', { class: 'repost-box', style: 'margin:0 32px 10px' }, el('div', { class: 'comment-author', style: 'margin-bottom:8px' }, '🔁 ' + ((rch && rch.title) || 'Репост')), rb); modalCard.append(box); }
  const cbox = el('div', { style: 'padding:6px 32px 32px' }); modalCard.append(cbox);
  cbox.append(sectionTitle('Комментарии', 'comment'));
  const reload = el('div', {});
  if (isAuthed()) {
    const ta = el('textarea', { class: 'comment-input', placeholder: 'Написать комментарий…', rows: '2' });
    const send = iconBtn('btn', 'comment', 'Отправить');
    send.addEventListener('click', async () => { const m = ta.value.trim(); if (!m) return; send.disabled = true; await window.anixart.articleCommentAdd(a.id, m); ta.value = ''; send.disabled = false; loadArticleComments(a.id, reload); });
    cbox.append(el('div', { class: 'comment-form' }, ta, el('div', { class: 'comment-form-row' }, send)));
  }
  cbox.append(reload);
  modalCard.append(el('button', { class: 'close-x', onclick: closeModal }, '×'));
  loadArticleComments(a.id, reload);
}
async function loadArticleComments(aid, list) {
  list.innerHTML = ''; list.append(spinner());
  const res = await window.anixart.articleComments(aid, 0);
  list.innerHTML = '';
  const cs = (res && res.content) || [];
  if (!cs.length) { list.append(msg('Комментариев нет.')); return; }
  cs.forEach((c) => list.append(buildComment(c, null, false, true)));
}
async function changeAvatar() {
  const r = await window.anixart.avatarUpload();
  if (!r || r.canceled) return;
  if (r.code === 0 || r.avatar || r.profile) {
    try { const me = await window.anixart.profile(state.auth.profile.id); if (me && me.profile) state.auth.profile = me.profile; } catch {}
    renderProfileMenu(); if (state.view === 'profile') setView('profile');
  } else alert('Не удалось обновить аватар (код ' + (r.code ?? '?') + ').');
}

// ── Плеер ────────────────────────────────────────────────────────────────────
async function openPlayer(r) {
  closeModal(); setView('player'); viewTitle.textContent = releaseTitle(r);
  if (!isAuthed() && !state.store.history.some((x) => x.id === r.id)) { state.store.history.unshift({ id: r.id, image: r.image, title_ru: r.title_ru, title_original: r.title_original, year: r.year, grade: r.grade }); state.store.history = state.store.history.slice(0, 60); persist(); }
  topbarControls.append(iconBtn('btn secondary', 'back', 'Назад', () => setView('discover')));
  viewRoot.innerHTML = '';
  const selectors = el('div', { class: 'player-selectors' });
  const epStrip = el('div', { class: 'episode-strip' });
  const frameWrap = el('div', { class: 'player-main' });
  const bridge = new URL('playerbridge.js', location.href).href;
  const frame = el('webview', { class: 'player-frame', allowpopups: true, src: 'about:blank', preload: bridge, webpreferences: 'contextIsolation=no' });
  // Свой полноэкранный режим — надёжно работает и для Kodik, и для Sibnet
  let fsOn = false;
  const fsExit = el('button', { class: 'player-fs-exit', title: 'Выйти из полного экрана (Esc)' }); fsExit.append(ic('fsexit', 18));
  const setFs = (on) => { fsOn = on; frame.classList.toggle('fs', on); fsExit.classList.toggle('show', on); window.anixart.winSetFullScreen(on); };
  fsExit.addEventListener('click', () => setFs(false));
  frame.addEventListener('enter-html-full-screen', () => setFs(true));
  frame.addEventListener('leave-html-full-screen', () => setFs(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && fsOn && frame.isConnected) setFs(false); });
  frameWrap.append(frame, fsExit);
  const layout = el('div', { class: 'player-layout' }, frameWrap, epStrip);
  viewRoot.append(selectors, layout);
  let current = null, watchTimer = null;
  const playEpisode = (ep, sourceId, btn) => {
    current = { rId: r.id, sId: sourceId, position: ep.position };
    frame.src = 'player.html#u=' + encodeURIComponent(ep.url);
    if (isAuthed()) window.anixart.historyAdd(r.id, sourceId, 0).catch(() => {});
    if (watchTimer) { clearTimeout(watchTimer); watchTimer = null; }
    // отмечаем просмотренной только после ~60 c просмотра, а не по клику
    if (isAuthed() && !ep.is_watched) {
      watchTimer = setTimeout(() => {
        window.anixart.episodeWatch(r.id, sourceId, ep.position).catch(() => {});
        ep.is_watched = true;
        if (btn) { btn.classList.add('watched'); if (btn.textContent.indexOf('✓') !== 0) btn.textContent = '✓ ' + btn.textContent; }
      }, 60000);
    }
  };
  frame.addEventListener('ipc-message', (e) => { if (e.channel !== 'kodik' || !current || !isAuthed()) return; const d = e.args && e.args[0]; if (!d) return; if (d.ended || typeof d.time === 'number') window.anixart.historyAdd(current.rId, current.sId, Math.floor(d.ended ? (d.duration || d.time || 0) : d.time)).catch(() => {}); });
  selectors.append(spinner());
  const typesRes = await window.anixart.episodeTypes(r.id);
  selectors.innerHTML = '';
  const types = typesRes.types || [];
  if (!types.length) { selectors.append(msg('Нет доступных озвучек для этого релиза.')); return; }
  let curType = types[0].id, curSource = null;
  const typeDd = ddSelect(types.map((t) => ({ value: t.id, label: `${t.name}${t.is_sub ? ' (суб)' : ''} · ${t.episodes_count} эп.` })), curType, (v) => { curType = Number(v); loadSources(); });
  const sourceHost = el('span');
  selectors.append(el('label', {}, 'Озвучка:'), typeDd, el('label', {}, 'Источник:'), sourceHost, iconBtn('btn secondary player-fs-enter', 'fs', 'На весь экран', () => setFs(true)));
  const loadSources = async () => {
    sourceHost.innerHTML = ''; sourceHost.append(el('span', { class: 'muted' }, 'загрузка…')); epStrip.innerHTML = ''; frame.src = 'about:blank';
    const sres = await window.anixart.episodeSources(r.id, curType);
    const sources = (sres.sources || []).filter((s) => s.episodes_count > 0);
    sourceHost.innerHTML = '';
    if (!sources.length) { sourceHost.append(el('span', { class: 'muted' }, 'нет источников')); epStrip.append(msg('У этой озвучки нет серий.')); return; }
    curSource = sources[0].id;
    sourceHost.append(ddSelect(sources.map((s) => ({ value: s.id, label: `${s.name} · ${s.episodes_count} эп.` })), curSource, (v) => { curSource = Number(v); loadEpisodes(); }));
    await loadEpisodes();
  };
  const loadEpisodes = async () => {
    epStrip.innerHTML = ''; epStrip.append(spinner()); frame.src = 'about:blank';
    const eres = await window.anixart.episodes(r.id, curType, curSource);
    epStrip.innerHTML = '';
    const eps = eres.episodes || [];
    if (!eps.length) { epStrip.append(msg('Серии не найдены.')); return; }
    let resumeIdx = 0;
    if (eps.some((e) => e.is_watched)) { const u = eps.findIndex((e) => !e.is_watched); resumeIdx = u === -1 ? eps.length - 1 : u; }
    eps.forEach((ep, i) => {
      const b = el('button', { class: 'ep-btn' + (ep.is_watched ? ' watched' : '') }, (ep.is_watched ? '✓ ' : '') + (ep.name || ('Серия ' + ep.position)));
      b.addEventListener('click', () => { epStrip.querySelectorAll('.ep-btn').forEach((x) => x.classList.remove('active')); b.classList.add('active'); playEpisode(ep, curSource, b); });
      epStrip.append(b);
      if (i === resumeIdx) { b.classList.add('active'); playEpisode(ep, curSource, b); }
    });
  };
  await loadSources();
}

// ── Случайное / старт ──────────────────────────────────────────────────────────
$('#randomBtn').addEventListener('click', async () => { const res = await window.anixart.randomRelease(); if (res.release) openRelease(res.release.id); });
async function persist() { await window.anixart.storeSet({ favorites: state.store.favorites, history: state.store.history }); }
window.__test = { openRelease, setView };

(async function init() {
  try {
    const s = await window.anixart.storeGet();
    if (s && typeof s === 'object') { state.store = Object.assign(state.store, s); state.store.settings = Object.assign({ token: '' }, s.settings || {}); }
    const me = await window.anixart.me();
    state.auth = { token: (me && me.token) || '', profile: (me && me.profile) || null };
  } catch {}
  // иконки навигации/поиска/random
  document.querySelectorAll('.nav-pill').forEach((p) => { const i = ic(p.dataset.ic, 17); p.prepend(i); });
  $('#searchIcon').append(ic('search', 16));
  $('#randomBtn').append(ic('shuffle', 18));
  setupChrome();
  renderProfileMenu();
  setView('discover');
})();
