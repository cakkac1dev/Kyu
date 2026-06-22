const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('anixart', {
  // Каталог / поиск / релиз
  filter: (page, filter) => ipcRenderer.invoke('api:filter', { page, filter }),
  search: (page, query) => ipcRenderer.invoke('api:search', { page, query }),
  release: (id) => ipcRenderer.invoke('api:release', { id }),
  randomRelease: () => ipcRenderer.invoke('api:randomRelease'),

  // Серии
  episodeTypes: (id) => ipcRenderer.invoke('api:episodeTypes', { id }),
  episodeSources: (id, typeId) => ipcRenderer.invoke('api:episodeSources', { id, typeId }),
  episodes: (id, typeId, sourceId) => ipcRenderer.invoke('api:episodes', { id, typeId, sourceId }),

  // Аккаунт
  signIn: (login, password) => ipcRenderer.invoke('auth:signIn', { login, password }),
  logout: () => ipcRenderer.invoke('auth:logout'),
  me: () => ipcRenderer.invoke('auth:me'),
  profile: (id) => ipcRenderer.invoke('api:profile', { id }),

  // Синхронизация
  favoriteAdd: (id) => ipcRenderer.invoke('api:favoriteAdd', { id }),
  favoriteDelete: (id) => ipcRenderer.invoke('api:favoriteDelete', { id }),
  favoritesList: (page) => ipcRenderer.invoke('api:favoritesList', { page }),
  historyList: (page) => ipcRenderer.invoke('api:historyList', { page }),
  historyAdd: (rId, sId, position) => ipcRenderer.invoke('api:historyAdd', { rId, sId, position }),
  episodeWatch: (rId, sId, position) => ipcRenderer.invoke('api:episodeWatch', { rId, sId, position }),
  episodeUnwatch: (rId, sId) => ipcRenderer.invoke('api:episodeUnwatch', { rId, sId }),

  // Списки профиля
  profileList: (status, page) => ipcRenderer.invoke('api:profileList', { status, page }),
  profileListAdd: (status, id) => ipcRenderer.invoke('api:profileListAdd', { status, id }),
  profileListDelete: (status, id) => ipcRenderer.invoke('api:profileListDelete', { status, id }),

  // Обзор
  discoverInteresting: () => ipcRenderer.invoke('api:discoverInteresting'),
  discoverWatching: (page) => ipcRenderer.invoke('api:discoverWatching', { page }),

  // Оценка
  voteAdd: (id, vote) => ipcRenderer.invoke('api:voteAdd', { id, vote }),
  voteDelete: (id) => ipcRenderer.invoke('api:voteDelete', { id }),

  // Коллекции
  collectionFavorites: (page) => ipcRenderer.invoke('api:collectionFavorites', { page }),
  collectionReleases: (id, page) => ipcRenderer.invoke('api:collectionReleases', { id, page }),

  // Комментарии
  comments: (id, page) => ipcRenderer.invoke('api:comments', { id, page }),
  articleComments: (id, page) => ipcRenderer.invoke('api:articleComments', { id, page }),
  commentEdit: (id, message, spoiler) => ipcRenderer.invoke('api:commentEdit', { id, message, spoiler }),
  commentDelete: (id) => ipcRenderer.invoke('api:commentDelete', { id }),
  avatarUpload: () => ipcRenderer.invoke('api:avatarUpload'),
  articleCommentAdd: (articleId, message) => ipcRenderer.invoke('api:articleCommentAdd', { articleId, message }),
  emailChange: (email, password) => ipcRenderer.invoke('api:emailChange', { email, password }),
  blogGet: (pid) => ipcRenderer.invoke('api:blogGet', { pid }),
  blogCreate: () => ipcRenderer.invoke('api:blogCreate'),
  articleCreate: (cid, text) => ipcRenderer.invoke('api:articleCreate', { cid, text }),

  // Действия с комментариями / пользователи
  commentVote: (id, vote) => ipcRenderer.invoke('api:commentVote', { id, vote }),
  commentAdd: (releaseId, message, spoiler, parentId) => ipcRenderer.invoke('api:commentAdd', { releaseId, message, spoiler, parentId }),
  commentReplies: (id, page) => ipcRenderer.invoke('api:commentReplies', { id, page }),
  searchProfiles: (page, query) => ipcRenderer.invoke('api:searchProfiles', { page, query }),

  // Настройки / друзья
  friendRecs: () => ipcRenderer.invoke('api:friendRecs'),
  randomFromList: (pid, status) => ipcRenderer.invoke('api:randomFromList', { pid, status }),
  prefMy: () => ipcRenderer.invoke('api:prefMy'),
  socialEdit: (b) => ipcRenderer.invoke('api:socialEdit', b),
  privacyEdit: (kind, value) => ipcRenderer.invoke('api:privacyEdit', { kind, value }),
  loginChange: (login) => ipcRenderer.invoke('api:loginChange', { login }),
  passwordChange: (oldPassword, newPassword) => ipcRenderer.invoke('api:passwordChange', { oldPassword, newPassword }),

  // Друзья / статус / лента
  friends: (id, page) => ipcRenderer.invoke('api:friends', { id, page }),
  statusEdit: (status) => ipcRenderer.invoke('api:statusEdit', { status }),
  channelSubs: (page) => ipcRenderer.invoke('api:channelSubs', { page }),
  channelRecs: (page) => ipcRenderer.invoke('api:channelRecs', { page }),
  channel: (id) => ipcRenderer.invoke('api:channel', { id }),
  channelArticles: (id, page) => ipcRenderer.invoke('api:channelArticles', { id, page }),
  channelSubscribe: (id, on) => ipcRenderer.invoke('api:channelSubscribe', { id, on }),
  feed: (page) => ipcRenderer.invoke('api:feed', { page }),

  openExternal: (url) => ipcRenderer.invoke('app:openExternal', { url }),
  winMinimize: () => ipcRenderer.invoke('win:minimize'),
  winMaximize: () => ipcRenderer.invoke('win:maximize'),
  winClose: () => ipcRenderer.invoke('win:close'),
  winIsMaximized: () => ipcRenderer.invoke('win:isMaximized'),
  winSetFullScreen: (flag) => ipcRenderer.invoke('win:setFullScreen', { flag }),
  onWinState: (cb) => ipcRenderer.on('win:state', (_e, st) => cb(st)),

  // Локальное хранилище
  storeGet: () => ipcRenderer.invoke('store:get'),
  storeSet: (store) => ipcRenderer.invoke('store:set', store),
});
