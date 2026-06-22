// Webview-preload: ловит события плеера Kodik (postMessage) и передаёт
// текущее время просмотра/окончание в renderer через sendToHost.
// Загружается в контексте player.html (внутри webview).
const { ipcRenderer } = require('electron');

let lastReport = 0;

window.addEventListener('message', (e) => {
  const d = e.data;
  if (!d || typeof d !== 'object') return;
  try {
    const key = String(d.key || d.event || d.type || '');
    const val = d.value != null ? d.value : d;
    let time = null, duration = null, ended = false;

    if (/end|finish|complete/i.test(key)) ended = true;
    if (val && typeof val === 'object') {
      if (val.time != null) time = Number(val.time);
      else if (val.currentTime != null) time = Number(val.currentTime);
      if (val.duration != null) duration = Number(val.duration);
    } else if (/time/i.test(key) && typeof val === 'number') {
      time = val;
    }

    if (ended) { ipcRenderer.sendToHost('kodik', { ended: true }); return; }
    const now = Date.now();
    if (time != null && !Number.isNaN(time) && now - lastReport > 10000) {
      lastReport = now;
      ipcRenderer.sendToHost('kodik', { time: Math.floor(time), duration: duration ? Math.floor(duration) : null });
    }
  } catch {}
});
