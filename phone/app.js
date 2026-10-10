/* 恋爱巴别塔 · 主角的手机 —— 悬浮组件主程序
   只读 huohu.state（完整快照，订阅时替换根引用）；所有"发送"都只调用 huohu.insertInput，不自动发送。 */
(function () {
  const mount = document.getElementById('lbp-mount');
  if (!mount || mount.dataset.ready) return;
  mount.dataset.ready = '1';

  const BASES = (window.LBP_RESOURCE_BASES || ['./']).slice();
  const IMG = 'https://img.huohu.ai/library/5562991478/images/';
  const SLOTS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const CAST = {
    h1: { name: '陈霜月', nick: '霜月', sig: '请说重点。', c: '#6f9fdc', sprite: IMG + '1152827677463.webp', face: [.37, .11], ax: .5, school: 'fudan', room: '202', dialect: '北京话' },
    h2: { name: '江澜', nick: '澜子', sig: '今天也要练！', c: '#f2683c', sprite: IMG + '9775495391960.webp', face: [.45, .125], ax: .515, school: 'sus', room: '101', dialect: '四川话' },
    h3: { name: '周莹春', nick: 'yc_0314', sig: '∑ 1/n² = π²/6', c: '#e8a33a', sprite: IMG + '6501736655754.webp', face: [.27, .16], ax: .31, school: 'fudan', room: '102', dialect: '河南话' },
    h4: { name: '柳轻飏', nick: '飏飏飏', sig: '嗦粉第一名', c: '#2db3a0', sprite: IMG + '6484478934390.webp', face: [.39, .13], ax: .47, school: 'sta', room: '101', dialect: '广西普通话' },
    h5: { name: '东方遇晓', nick: '晓晓不是小小', sig: '洋泾浜退散', c: '#f07ea8', sprite: IMG + '3633698951087.webp', face: [.25, .13], ax: .335, school: 'sjtu', room: '203', dialect: '上海话' },
    h6: { name: '叶潇雨', nick: '潇潇雨歇', sig: '直播中 勿扰', c: '#8a86f0', sprite: IMG + '4074715116402.webp', face: [.51, .155], ax: .6, school: null, room: '103', dialect: '粤语' },
    ai: { name: '宇智波爱', nick: '观测者', sig: '杂鱼主角今天也翻车了吗', c: '#e07ab8', sprite: IMG + '9636094724211.webp', face: [.53, .36, 5], ax: .5, egg: true }
  };
  const GROUP = '锦绣云湾2001';

  /* ---------- 平台桥 ---------- */
  const H = window.huohu || {};
  const chat = H.chat || {};
  const ME = chat.user || '我';
  const MEAV = chat.userAvatar || '';
  let S = (H.state && typeof H.state === 'object') ? H.state : {};
  let unsub = null;
  if (typeof H.subscribeState === 'function') unsub = H.subscribeState(s => { S = (s && typeof s === 'object') ? s : {}; onState(); });
  if (H.stateReady && typeof H.stateReady.then === 'function') H.stateReady.then(() => { if (H.state) { S = H.state; onState(); } });
  window.addEventListener('pagehide', () => { if (typeof unsub === 'function') unsub(); });
  const canInsert = () => typeof H.insertInput === 'function';
  function insert(text) {
    if (canInsert()) { H.insertInput(text); toast('已填进输入框，看一眼再发送'); return true; }
    toast('预览环境：进到正式对话里才会填进输入框'); return false;
  }

  /* ---------- 读状态的小工具（全部带默认值） ---------- */
  const g = (p, d) => { try { return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), S) ?? d; } catch (e) { return d; } };
  const girl = id => Object.assign({ name: CAST[id].name, love: 0, rel: '陌生人', in: false }, g('girls.' + id, {}));
  const ROUTE_AT = 70; /* 个人线门槛：世界书 Phase_2 单人好感 ≥ 70 */
  const present = () => (Array.isArray(g('scene.present')) ? g('scene.present') : []);
  const events = () => (Array.isArray(g('plot.events')) ? g('plot.events') : []);
  const chats = id => (Array.isArray(g('qq.chats.' + id)) ? g('qq.chats.' + id) : []);
  const group = () => (Array.isArray(g('qq.group')) ? g('qq.group') : []);
  const moments = () => (Array.isArray(g('qq.moments')) ? g('qq.moments') : []);
  const unread = k => +(g('qq.unread.' + k, 0)) || 0;
  const unreadAll = () => SLOTS.reduce((n, id) => n + unread(id), 0) + unread('group') + unread('moments');
  const call = () => (g('qq.call') && typeof g('qq.call') === 'object' ? g('qq.call') : {});
  const members = () => SLOTS.filter(id => girl(id).in);
  const online = id => girl(id).in;
  const badend = () => (+g('plot.badend', 0)) > 0;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* 游戏内时间：全部来自会话变量 time.*，不读现实时钟 */
  const WEEK_CN = { Mon: '星期一', Tue: '星期二', Wed: '星期三', Thu: '星期四', Fri: '星期五', Sat: '星期六', Sun: '星期日' };
  function ymd() {
    const m = String(g('time.date', '')).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  }
  function weekCN() {
    const w = g('time.week', ''); if (WEEK_CN[w]) return WEEK_CN[w];
    if (/^星期|^周/.test(w)) return w.replace(/^周/, '星期');
    const t = ymd(); if (!t) return '';
    return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][new Date(t.y, t.m - 1, t.d).getDay()];
  }
  const clock = () => { const c = String(g('time.clock', '')).match(/(\d{1,2})\D(\d{2})/); return c ? c[1].padStart(2, '0') + ':' + c[2] : '--:--'; };
  const dateCN = () => { const t = ymd(); return t ? `${t.y}年${t.m}月${t.d}日` : ''; };

  /* 节假日：法定假日按国务院公布的放假安排（2025、2026 年）；其余年份只标固定日期的节日 */
  const HOLI = {
    2025: [['元旦', '1-1', '1-1'], ['春节', '1-28', '2-4'], ['清明节', '4-4', '4-6'], ['劳动节', '5-1', '5-5'], ['端午节', '5-31', '6-2'], ['国庆节 · 中秋节', '10-1', '10-8']],
    2026: [['元旦', '1-1', '1-3'], ['春节', '2-15', '2-23'], ['清明节', '4-4', '4-6'], ['劳动节', '5-1', '5-5'], ['端午节', '6-19', '6-21'], ['中秋节', '9-25', '9-27'], ['国庆节', '10-1', '10-7']]
  };
  const FIXED = { '1-1': '元旦', '2-14': '情人节', '3-8': '妇女节', '4-1': '愚人节', '5-1': '劳动节', '6-1': '儿童节', '9-10': '教师节', '10-1': '国庆节', '10-31': '万圣夜', '12-24': '平安夜', '12-25': '圣诞节' };
  const LUNAR = { 2025: { '8-29': '七夕', '10-6': '中秋节', '10-29': '重阳节' }, 2026: { '8-19': '七夕', '9-25': '中秋节', '10-18': '重阳节', '2-17': '春节', '3-3': '元宵节' } };
  function dayInfo(y, m, d) {
    const k = m + '-' + d, n = m * 100 + d; let off = null;
    (HOLI[y] || []).forEach(([name, a, b]) => { const [am, ad] = a.split('-').map(Number), [bm, bd] = b.split('-').map(Number); if (n >= am * 100 + ad && n <= bm * 100 + bd) off = name; });
    if (!HOLI[y] && ['1-1', '5-1', '10-1', '10-2', '10-3'].includes(k)) off = FIXED[k] || '国庆节';
    const fest = (LUNAR[y] || {})[k] || FIXED[k] || '';
    const wd = new Date(y, m - 1, d).getDay();
    return { off, fest, weekend: wd === 0 || wd === 6 };
  }
  function todayTag() {
    const t = ymd(); if (!t) return '';
    const i = dayInfo(t.y, t.m, t.d);
    if (i.off) return i.off + ' · 放假';
    if (i.fest) return i.fest;
    return i.weekend ? '周末' : '';
  }

  /* 天气：time.weather 的文字归到 7 类，决定图标和整部手机的主题色 */
  const WX = {
    sun: { k: '晴', c1: '#ffb547', c2: '#ff7a45', ink: '#7a3d12' },
    hot: { k: '酷热', c1: '#ff8a5c', c2: '#f5455c', ink: '#7a1f1f' },
    cloud: { k: '多云', c1: '#8ec5ff', c2: '#6f9fdc', ink: '#2b4a73' },
    over: { k: '阴', c1: '#a3adbb', c2: '#6e7787', ink: '#333a45' },
    rain: { k: '雨', c1: '#5fa8d3', c2: '#3a6ea5', ink: '#1d3c5c' },
    storm: { k: '雷雨', c1: '#7f6ad6', c2: '#3d3a8c', ink: '#231f55' },
    snow: { k: '雪', c1: '#bfe3ff', c2: '#8fb9e8', ink: '#2c4b6e' },
    fog: { k: '雾', c1: '#c9c2b8', c2: '#9a9286', ink: '#4a443c' }
  };
  function wxKind() {
    const w = String(g('time.weather', ''));
    if (/雷/.test(w)) return 'storm'; if (/雪/.test(w)) return 'snow'; if (/雨/.test(w)) return 'rain';
    if (/雾|霾/.test(w)) return 'fog'; if (/阴/.test(w)) return 'over'; if (/云/.test(w)) return 'cloud';
    if (/热|闷|炎/.test(w)) return 'hot'; return 'sun';
  }
  function wxIcon(kind, cls) {
    const k = kind || wxKind(), c = WX[k];
    const sun = `<circle cx="24" cy="22" r="8" fill="${c.c1}"/><g stroke="${c.c1}" stroke-width="2.6" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="24" y1="8" x2="24" y2="4" transform="rotate(${a} 24 22)"/>`).join('')}</g>`;
    const cloud = (x, y, f) => `<path d="M${x} ${y}h20a7 7 0 0 0 0-14 9 9 0 0 0-17-2 6 6 0 0 0-3 16z" fill="${f}"/>`;
    const body = {
      sun, hot: sun + `<path d="M10 40q4-3 8 0t8 0 8 0 8 0" stroke="${c.c2}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
      cloud: `<circle cx="18" cy="18" r="7" fill="#ffb547"/>` + cloud(12, 36, '#fff'),
      over: cloud(8, 32, '#c3cad3') + cloud(16, 38, '#9aa4b2'),
      rain: cloud(10, 28, '#b9c7d6') + `<g stroke="${c.c1}" stroke-width="2.4" stroke-linecap="round"><line x1="16" y1="33" x2="13" y2="41"/><line x1="24" y1="33" x2="21" y2="41"/><line x1="32" y1="33" x2="29" y2="41"/></g>`,
      storm: cloud(10, 28, '#8c94a8') + `<path d="M24 30l-5 8h5l-3 8 9-11h-5l3-5z" fill="#ffd34d"/>`,
      snow: cloud(10, 28, '#dbe8f5') + `<g fill="${c.c2}"><circle cx="16" cy="36" r="2"/><circle cx="24" cy="40" r="2"/><circle cx="32" cy="36" r="2"/></g>`,
      fog: `<g stroke="${c.c2}" stroke-width="3" stroke-linecap="round"><line x1="8" y1="18" x2="40" y2="18"/><line x1="12" y1="26" x2="36" y2="26"/><line x1="8" y1="34" x2="40" y2="34"/></g>`
    }[k];
    return `<svg class="${cls || 'wx-ic'}" viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
  }

  /* 壁纸：只存在本机浏览器（每位玩家自己的设置） */
  let WALL = ''; try { WALL = localStorage.getItem('lbp-wall') || ''; } catch (e) { }
  function setWall(src) { WALL = src || ''; try { src ? localStorage.setItem('lbp-wall', src) : localStorage.removeItem('lbp-wall'); } catch (e) { } }
  const wallCss = () => WALL ? `background:#222 url('${encodeURI(WALL).replace(/'/g, '%27')}') center/cover no-repeat` : '';

  /* 角色当前位置：在场=当前场景；否则按时段推断（白天在学校，其余在公寓） */
  function locOf(id) {
    const gi = girl(id); if (!gi.in) return '还没搬进来';
    if (present().includes(id)) return g('scene.place', '就在你身边') + '（在你身边）';
    const slot = g('time.slot', '白天'); const sc = CAST[id].school;
    if (slot === '白天' && sc && MAP) { const p = MAP.points.find(x => x.id === sc); if (p) return p.name; }
    if (id === 'h6' && slot === '白天') return '锦绣云湾 · 103 工作室';
    return '锦绣云湾 · ' + CAST[id].room + ' 室';
  }
  const whoName = s => s === 'me' ? ME : (CAST[s] ? CAST[s].name : String(s || '？'));
  const whoNick = s => s === 'me' ? ME : (CAST[s] ? CAST[s].nick : String(s || '？'));

  /* ---------- 头像 ---------- */
  function av(id, cls) {
    cls = cls || '';
    if (id === 'me') return `<span class="av me ${cls}">${MEAV ? `<img src="${esc(MEAV)}" alt="">` : `<span>${esc(ME.slice(0, 1))}</span>`}</span>`;
    const c = CAST[id];
    if (!c) return `<span class="av ${cls}"><span class="q">？</span></span>`;
    if (c.egg && !badend()) return `<span class="av ${cls}"><span class="q">？</span></span>`;
    const off = (!c.egg && !online(id)) ? ' off' : '';
    return `<span class="av ${cls}${off}" style="--c:${c.c}"><img src="${c.sprite}" alt="" style="--fx:${c.face[0]};--fy:${c.face[1]};--fz:${c.face[2] || 7}"></span>`;
  }

  /* ---------- 外置数据（解锁表 / 地图） ---------- */
  let CG = { albums: [], cgs: [] }, MAP = null;
  async function fetchJSON(name) {
    for (const b of BASES) {
      try { const r = await fetch(b + 'data/' + name, { cache: 'no-cache' }); if (r.ok) return await r.json(); } catch (e) { }
    }
    return null;
  }
  Promise.all([fetchJSON('cg.json'), fetchJSON('map.json')]).then(([c, m]) => { if (c) CG = c; if (m) MAP = m; render(); });

  /* ---------- 解锁 ---------- */
  function unlocked(cg) {
    const cd = cg.cond || {};
    if (cd.event) return events().includes(cd.event);
    if (typeof cd.love === 'number') { const id = cg.album; return id !== 'all' && girl(id).love >= cd.love; }
    return false;
  }
  const condText = cg => cg.cond && cg.cond.event ? '？？？' : (cg.cond && typeof cg.cond.love === 'number' ? '好感 ' + cg.cond.love : '？？？');
  let seen = new Set(); try { seen = new Set(JSON.parse(localStorage.getItem('lbp-seen') || '[]')); } catch (e) { }
  const unlockedList = () => CG.cgs.filter(unlocked);
  const newCgs = () => unlockedList().filter(c => !seen.has(c.id));
  function markSeen(ids) { ids.forEach(i => seen.add(i)); try { localStorage.setItem('lbp-seen', JSON.stringify([...seen])); } catch (e) { } }

  /* ---------- DOM 骨架 ---------- */
  mount.innerHTML = `<div class="ph-root" id="lbp">
    <button type="button" class="ph-mini" id="lbp-mini" aria-label="打开手机"><span class="notch" data-huohu-draggable></span><span class="scr"><b id="lbp-mini-t"></b><small id="lbp-mini-s"></small></span><span class="dot" id="lbp-mini-dot" hidden></span></button>
    <div class="ph-phone" id="lbp-phone" hidden>
      <button type="button" class="ph-close" id="lbp-close" aria-label="收起手机">×</button>
      <button type="button" class="ph-key power" id="lbp-power" aria-label="锁屏" title="锁屏"></button>
      <button type="button" class="ph-key vol" aria-hidden="true" tabindex="-1"></button>
      <div class="ph-screen" id="lbp-screen">
        <div class="ph-island" data-huohu-draggable title="按住拖动"></div>
        <div class="ph-bar" id="lbp-bar"></div>
        <div class="ph-view" id="lbp-view"></div>
        <button type="button" class="ph-home-ind" id="lbp-homeind" aria-label="回到主屏"></button>
        <div class="ph-toast" id="lbp-toast" role="status" aria-live="polite"></div>
      </div>
    </div>
  </div>`;
  const $ = s => mount.querySelector(s);
  const mini = $('#lbp-mini'), phone = $('#lbp-phone'), view = $('#lbp-view'), bar = $('#lbp-bar');
  let toastT;
  function toast(m) { const t = $('#lbp-toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); }

  /* ---------- 路由 ---------- */
  let stack = [{ v: 'lock' }];
  const cur = () => stack[stack.length - 1];
  function go(v, p) { stack.push(Object.assign({ v }, p || {})); render(); }
  function back() { if (stack.length > 1) stack.pop(); render(); }
  function home() { stack = [{ v: 'home' }]; render(); }
  let open = false;
  function setOpen(o) { open = o; phone.hidden = !o; mini.hidden = o; if (o && cur().v === 'lock') { /* 保持锁屏 */ } render(); }
  mini.addEventListener('click', e => { if (e.target.closest('[data-huohu-draggable]')) return; setOpen(true); });
  $('#lbp-close').addEventListener('click', () => setOpen(false));
  $('#lbp-homeind').addEventListener('click', () => { if (cur().v !== 'lock') home(); });
  $('#lbp-power').addEventListener('click', () => { stack = [{ v: 'lock' }]; render(); toast('已锁屏'); });
  const drafts = {};

  /* ---------- 渲染 ---------- */
  function onState() { renderMini(); if (open) render(); }
  function renderMini() {
    $('#lbp-mini-t').textContent = clock();
    $('#lbp-mini-s').textContent = g('time.weather', '') || '';
    mini.style.setProperty('--w1', WX[wxKind()].c1); mini.style.setProperty('--w2', WX[wxKind()].c2);
    const n = unreadAll() + newCgs().length;
    const d = $('#lbp-mini-dot'); d.hidden = !n; d.textContent = n > 99 ? '99+' : n;
  }
  function renderBar(onLock) {
    bar.innerHTML = onLock ? '' : `<span></span><span class="wxs">${wxIcon()}<span>${esc(g('time.weather', ''))}</span></span>`;
  }
  function render() {
    renderMini();
    if (!open) return;
    const c = cur();
    const R = VIEWS[c.v] || VIEWS.home;
    view.onclick = null;
    view.className = 'ph-view ' + (R.cls || '');
    view.innerHTML = R.html(c);
    const wk = WX[wxKind()]; const root = $('#lbp');
    root.style.setProperty('--w1', wk.c1); root.style.setProperty('--w2', wk.c2); root.style.setProperty('--wink', wk.ink);
    root.dataset.wx = wxKind();
    renderBar(c.v === 'lock');
    bar.style.setProperty('--bar', R.bar || '#111');
    $('#lbp-homeind').hidden = c.v === 'lock' || c.v === 'call' || c.v === 'viewer';
    if (R.after) R.after(c);
  }
  const ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    video: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3z"/></svg>',
    msg: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    ppl: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
    album: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>',
    map: '<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
    qq: '<svg viewBox="0 0 24 24"><path d="M12 3c-3.5 0-6 2.8-6 6.5v2.5l-1.5 3.5c-.3.8.5 1.3 1 .8L7 15c.6 2 2.6 3.5 5 3.5s4.4-1.5 5-3.5l1.5 1.3c.5.5 1.3 0 1-.8L18 12V9.5C18 5.8 15.5 3 12 3z"/></svg>',
    fan: '<svg viewBox="0 0 24 24"><path d="M12 13a7 7 0 0 1 7-7 7 7 0 0 1-7 7zM12 13a7 7 0 0 0-7-7 7 7 0 0 0 7 7z"/><path d="M12 13v8"/></svg>',
    hang: '<svg viewBox="0 0 24 24"><path d="M4 14c4-4 12-4 16 0l-2 3-3-1v-2c-2-1-4-1-6 0v2l-3 1z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>'
  };
  /* 应用根页面左上角是「退出」(回主屏)，子页面是「返回」 */
  const topbar = (title, right, cls, root) => `<div class="ap-top ${cls || ''}">${root ? `<button type="button" class="bk" data-act="exit" aria-label="退出应用">${ICON.home}</button>` : `<button type="button" class="bk" data-act="back" aria-label="返回">${ICON.back}</button>`}<h2>${esc(title)}</h2>${right || '<span class="ac"></span>'}</div>`;
  view.addEventListener('click', e => { if (e.target.closest('[data-act="exit"]')) home(); });

  const VIEWS = {};

  /* 锁屏：时间日期只在这里显示；最新消息按时间倒序；点日期打开日历 */
  function latestNotes() {
    const out = [];
    SLOTS.forEach(id => { const n = unread(id); if (n) { const last = chats(id).slice(-1)[0]; out.push({ ic: 'qq', t: CAST[id].nick + (n > 1 ? `（${n}条）` : ''), p: last ? last.t : '新消息', at: last ? last.at || '' : '', go: ['chat', { id }] }); } });
    if (unread('group')) { const last = group().slice(-1)[0]; out.push({ ic: 'qq', t: GROUP + `（${unread('group')}条）`, p: last ? whoNick(last.s) + '：' + last.t : '新消息', at: last ? last.at || '' : '', go: ['group', {}] }); }
    if (unread('moments')) { const last = moments().slice(-1)[0]; out.push({ ic: 'qq', t: '空间动态', p: last ? whoNick(last.s) + '：' + last.t : `${unread('moments')} 条新动态`, at: last ? last.at || '' : '', go: ['qq', { tab: 'moments' }] }); }
    const nc = newCgs(); if (nc.length) out.push({ ic: 'al', t: '相册', p: `解锁了 ${nc.length} 张新照片`, at: '', go: ['album', {}] });
    return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }
  function calendar(y, m) {
    const first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate(); const t = ymd() || {};
    let cells = ''; for (let i = 0; i < first; i++) cells += '<span></span>';
    const notes = [];
    for (let d = 1; d <= days; d++) {
      const i = dayInfo(y, m, d); const today = t.y === y && t.m === m && t.d === d;
      const lab = i.off ? i.off.split(' · ')[0].replace(/节$/, '') : (i.fest ? i.fest : '');
      cells += `<span class="${i.off ? 'off' : ''} ${i.weekend ? 'we' : ''} ${today ? 'today' : ''}"><b>${d}</b>${lab ? `<i>${esc(lab.length > 3 ? lab.slice(0, 3) : lab)}</i>` : ''}</span>`;
      if ((i.off || i.fest) && !notes.some(n => n.n === (i.off || i.fest))) notes.push({ n: i.off || i.fest, d, off: !!i.off });
    }
    return `<div class="cal-h"><button type="button" data-cal="-1" aria-label="上个月">‹</button><b>${y} 年 ${m} 月</b><button type="button" data-cal="1" aria-label="下个月">›</button></div>
      <div class="cal-w">${['日', '一', '二', '三', '四', '五', '六'].map(x => `<span>${x}</span>`).join('')}</div><div class="cal-g">${cells}</div>
      <ul class="cal-n">${notes.length ? notes.map(n => `<li class="${n.off ? 'off' : ''}"><span>${m}月${n.d}日</span>${esc(n.n)}${n.off ? '<em>放假</em>' : ''}</li>`).join('') : '<li>这个月没有节日</li>'}</ul>
      <p class="cal-src">${HOLI[y] ? '放假安排按国务院办公厅公布的 ' + y + ' 年安排' : '这一年只标出固定日期的节日'}</p>`;
  }
  VIEWS.lock = {
    cls: 'ph-lock', bar: '#fff',
    html(c) {
      const notes = latestNotes(); const tag = todayTag();
      const cal = c.cal;
      return `<div class="wall" style="${wallCss()}">${WALL ? '' : `<div class="pol" style="--r:-5deg;left:14%;top:40%;width:44%"><div class="pic"></div><div class="cap">锦绣云湾 2001</div></div><div class="pol" style="--r:6deg;left:52%;top:47%;width:32%"><div class="pic"></div><div class="cap">${esc(g('time.date', ''))}</div></div>`}</div>
        <div class="lk-top"><button type="button" class="date" data-act="cal">${esc(dateCN())} ${esc(weekCN())}${tag ? `<em>${esc(tag)}</em>` : ''}</button><b class="time">${clock()}</b><span class="wx">${wxIcon(null, 'wx-big')}<span>${esc(g('time.weather', ''))}${g('time.slot') ? ' · ' + esc(g('time.slot')) : ''}</span></span><span class="place">${esc(g('scene.place', ''))}</span></div>
        <div class="notif">${notes.slice(0, 4).map((n, i) => `<button type="button" class="n" data-note="${i}"><span class="ic ${n.ic}">${n.ic === 'qq' ? ICON.qq : ICON.album}</span><div><b>${esc(n.t)}<small>${esc(n.at)}</small></b><p>${esc(n.p)}</p></div></button>`).join('')}</div>
        <button type="button" class="unlock" data-act="unlock">${ICON.lock}<span>点这里解锁</span></button>
        ${cal ? `<div class="cal" role="dialog" aria-label="日历"><div class="cal-in">${calendar(cal.y, cal.m)}<button type="button" class="cal-x" data-act="calx">关闭</button></div></div>` : ''}`;
    },
    after(c) {
      const notes = latestNotes();
      view.querySelector('[data-act="unlock"]').onclick = () => home();
      view.querySelectorAll('[data-note]').forEach(b => b.onclick = () => { const n = notes[+b.dataset.note]; stack = [{ v: 'home' }]; go(n.go[0], n.go[1]); });
      view.querySelector('[data-act="cal"]').onclick = () => { const t = ymd() || { y: 2025, m: 7 }; stack[stack.length - 1] = { v: 'lock', cal: { y: t.y, m: t.m } }; render(); };
      const x = view.querySelector('[data-act="calx"]'); if (x) x.onclick = () => { stack[stack.length - 1] = { v: 'lock' }; render(); };
      view.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => { let { y, m } = c.cal; m += +b.dataset.cal; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } stack[stack.length - 1] = { v: 'lock', cal: { y, m } }; render(); });
    }
  };

  /* 主屏：不显示时间；上方是背包，三个 App 在底部 Dock */
  VIEWS.home = {
    cls: 'ph-home', bar: '#fff',
    html() {
      const n = unreadAll(), nc = newCgs().length;
      const inv = g('me.inventory', []); const items = (Array.isArray(inv) ? inv : String(inv || '').split(/[、,，]/)).map(x => String(x).trim()).filter(Boolean);
      const tok = Array.isArray(g('plot.tokens')) ? g('plot.tokens') : [];
      return `<div class="wall" style="${wallCss()}"></div>
      <div class="bag"><div class="bag-h">${ICON.bag}<b>背包</b><small>${items.length} 件</small></div>
        <ul class="bag-g">${items.length ? items.map((it, i) => `<li style="--r:${[-2, 1.5, -1, 2.5][i % 4]}deg">${esc(it)}</li>`).join('') : '<li class="empty">空空如也</li>'}</ul>
        ${tok.length ? `<div class="bag-t"><span>信物</span>${SLOTS.map(id => `<i class="${tok.includes(id) ? 'got' : ''}" style="--c:${CAST[id].c}" title="${CAST[id].name}"></i>`).join('')}</div>` : ''}
      </div>
      ${badend() ? `<div class="ph-apps"><button type="button" class="ph-app ai" data-go="ai"><span class="ic">${ICON.fan}</span><span>　</span></button></div>` : ''}
      <div class="dock">
        <button type="button" class="ph-app qq" data-go="qq"><span class="ic">${ICON.qq}</span><span>QQ</span>${n ? `<span class="badge">${n}</span>` : ''}</button>
        <button type="button" class="ph-app al" data-go="album"><span class="ic">${ICON.album}</span><span>相册</span>${nc ? `<span class="badge">${nc}</span>` : ''}</button>
        <button type="button" class="ph-app mp" data-go="map"><span class="ic">${ICON.map}</span><span>地图</span></button>
      </div>`;
    },
    after() { view.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go, b.dataset.go === 'qq' ? { tab: 'msgs' } : {})); }
  };

  /* ---------- QQ ---------- */
  const qqTabs = tab => `<div class="qq-tabs" role="tablist">
    <button type="button" role="tab" aria-selected="${tab === 'msgs'}" data-tab="msgs">${ICON.msg}消息${(unreadAll() - unread('moments')) ? `<span class="badge">${unreadAll() - unread('moments')}</span>` : ''}</button>
    <button type="button" role="tab" aria-selected="${tab === 'contacts'}" data-tab="contacts">${ICON.ppl}联系人</button>
    <button type="button" role="tab" aria-selected="${tab === 'moments'}" data-tab="moments">${ICON.star}动态${unread('moments') ? `<span class="badge">${unread('moments')}</span>` : ''}</button></div>`;
  const grpAv = () => `<span class="qq-grp">${['me'].concat(members()).slice(0, 4).map(id => av(id)).join('')}</span>`;
  VIEWS.qq = {
    cls: 'qq', bar: '#111',
    html(c) {
      const tab = c.tab || 'msgs';
      let body = '';
      if (tab === 'msgs') {
        const gl = group().slice(-1)[0];
        const rows = [`<li class="top"><button type="button" data-open="group">${grpAv()}<div class="t"><b>${GROUP}<small>${esc(gl ? gl.at || '' : '')}</small></b><p>${gl ? esc(whoNick(gl.s) + '：' + gl.t) : '群里还没人说话'}</p></div>${unread('group') ? `<span class="n">${unread('group')}</span>` : ''}</button></li>`];
        const list = SLOTS.map(id => ({ id, last: chats(id).slice(-1)[0] })).filter(x => girl(x.id).in || x.last)
          .sort((a, b) => (unread(b.id) - unread(a.id)));
        rows.push(...list.map(({ id, last }) => `<li><button type="button" data-open="${id}">${av(id)}<div class="t"><b>${esc(CAST[id].nick)}<small>${esc(last ? last.at || '' : '')}</small></b><p>${last ? esc((last.s === 'me' ? '我：' : '') + last.t) : esc(CAST[id].sig)}</p></div>${unread(id) ? `<span class="n">${unread(id)}</span>` : ''}</button></li>`));
        if (badend()) rows.push(`<li><button type="button" data-open="ai">${av('ai')}<div class="t"><b>${esc(CAST.ai.nick)}<small></small></b><p>陌生号码</p></div></button></li>`);
        body = `<ul class="qq-list">${rows.join('')}</ul>`;
      } else if (tab === 'contacts') {
        body = `<div class="qq-ct"><div class="grp"><button type="button" data-open="group">${grpAv()}<div><b>${GROUP}</b><small>${members().length + 1} 人</small></div></button></div><div class="hd">室友</div><ul>${SLOTS.map(id => { const gi = girl(id); return `<li><button type="button" data-card="${id}">${av(id)}<div class="t"><b>${esc(CAST[id].nick)}${gi.in ? '' : '<em>未入住</em>'}</b><p>${esc(CAST[id].sig)}</p></div></button></li>`; }).join('')}${badend() ? `<div class="hd">？</div><ul><li><button type="button" data-card="ai">${av('ai')}<div class="t"><b>${esc(CAST.ai.nick)}<em>陌生号码</em></b><p>${esc(CAST.ai.sig)}</p></div></button></li></ul>` : ''}</ul></div>`;
      } else {
        const ms = moments().slice().reverse();
        body = `<div class="qq-mo-new"><textarea id="lbp-mo" rows="1" maxlength="200" placeholder="说点什么…">${esc(drafts.moments || '')}</textarea><button type="button" data-act="post">发表</button></div><div class="qq-mo">${ms.length ? ms.map(m => `<div class="qq-post"><div class="h">${av(m.s, 'round')}<div><b>${esc(whoNick(m.s))}</b><small>${esc(m.at || '')}</small></div></div><div class="tx">${esc(m.t)}</div>${m.img ? (() => { const cg = CG.cgs.find(x => x.id === m.img); return cg && cg.src && unlocked(cg) ? `<div class="img"><img src="${esc(cg.src)}" alt=""></div>` : ''; })() : ''}${(m.likes && m.likes.length) || (m.comments && m.comments.length) ? `<div class="ft">${m.likes && m.likes.length ? `<div class="lk">${m.likes.map(whoNick).map(esc).join('、')}</div>` : ''}${(m.comments || []).map(cm => `<div class="cm"><b>${esc(whoNick(cm.s))}</b>：${esc(cm.t)}</div>`).join('')}</div>` : ''}</div>`).join('') : `<div class="ap-empty"><b>空间还是空的</b>发一条试试，看看谁会来点赞</div>`}</div>`;
      }
      return `${topbar(tab === 'msgs' ? '消息' : tab === 'contacts' ? '联系人' : '动态', '', '', true)}<div class="ap-body">${body}</div>${qqTabs(tab)}`;
    },
    after(c) {
      view.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { stack[stack.length - 1] = { v: 'qq', tab: b.dataset.tab }; render(); });
      view.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { const id = b.dataset.open; go(id === 'group' ? 'group' : 'chat', { id }); });
      view.querySelectorAll('[data-card]').forEach(b => b.onclick = () => go('card', { id: b.dataset.card }));
      const ta = view.querySelector('#lbp-mo'); if (ta) { ta.oninput = () => drafts.moments = ta.value; }
      const post = view.querySelector('[data-act="post"]'); if (post) post.onclick = () => { const t = (drafts.moments || '').trim(); if (!t) { toast('先写点什么'); return; } if (insert(`（QQ·发动态）${t}`)) { drafts.moments = ''; render(); } };
      if (c.tab === 'moments') markSeen([]);
    }
  };
  function bubbles(list, grp) {
    if (!list.length) return `<div class="qq-sys">还没有聊天记录</div>`;
    return list.map(m => {
      const me = m.s === 'me'; const t = String(m.t ?? ''); const mm = t.match(/^(.*?)(（[^（）]{2,}）)\s*$/);
      const body = mm && !me ? `${esc(mm[1])}<small>${esc(mm[2])}</small>` : esc(t);
      return `<div class="qq-m ${me ? 'me' : ''}">${av(m.s, 'round')}<div class="wrap">${grp && !me ? `<span class="nm">${esc(whoNick(m.s))}${CAST[m.s] ? `<em>${esc(CAST[m.s].dialect || '')}</em>` : ''}</span>` : ''}<div class="bb">${body}</div>${m.at ? `<span class="at">${esc(m.at)}</span>` : ''}</div></div>`;
    }).join('');
  }
  function chatInput(key, ph) {
    return `<div class="qq-input"><textarea id="lbp-in" rows="1" maxlength="300" placeholder="${esc(ph)}">${esc(drafts[key] || '')}</textarea><button type="button" data-act="send">发送</button></div><div class="qq-hint">发送=填进对话输入框，由你确认后发出</div>`;
  }
  function wireChat(key, build) {
    const ta = view.querySelector('#lbp-in'); const body = view.querySelector('.ap-body'); if (body) body.scrollTop = body.scrollHeight;
    if (!ta) return; ta.oninput = () => { drafts[key] = ta.value; ta.style.height = 'auto'; ta.style.height = Math.min(92, ta.scrollHeight) + 'px'; };
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); view.querySelector('[data-act="send"]').click(); } };
    view.querySelector('[data-act="send"]').onclick = () => { const t = (drafts[key] || '').trim(); if (!t) { toast('先写点什么'); ta.focus(); return; } if (insert(build(t))) { drafts[key] = ''; render(); } };
  }
  VIEWS.chat = {
    cls: 'qq qq-chat', bar: '#111',
    html(c) {
      const id = c.id, ca = CAST[id]; const gi = id === 'ai' ? null : girl(id);
      const list = id === 'ai' ? [] : chats(id);
      const right = id === 'ai' ? '<span class="ac"></span>' : `<button type="button" class="ac" data-act="video" aria-label="视频通话" ${gi.in ? '' : 'disabled'}>${ICON.video}</button>`;
      return `${topbar(ca.nick + (gi && !gi.in ? '（未入住）' : ''), right)}<div class="ap-body"><div class="qq-msgs">${id === 'ai' ? `<div class="qq-sys">这个号码没有任何记录。<br>但它确实出现在了你的列表里。</div>` : bubbles(list, false)}</div></div>${id === 'ai' ? '' : chatInput('c_' + id, `发给 ${ca.nick}…`)}`;
    },
    after(c) {
      view.querySelector('[data-act="back"]').onclick = back;
      if (c.id === 'ai') return;
      wireChat('c_' + c.id, t => `（QQ·私聊 ${CAST[c.id].name}）${t}`);
      const v = view.querySelector('[data-act="video"]'); if (v) v.onclick = () => { if (insert(`（QQ·视频通话 ${CAST[c.id].name}）`)) go('call', { id: c.id }); else go('call', { id: c.id }); };
    }
  };
  VIEWS.group = {
    cls: 'qq qq-chat', bar: '#111',
    html() { return `${topbar(`${GROUP}（${members().length + 1}）`)}<div class="ap-body"><div class="qq-msgs"><div class="qq-sys">群成员：${esc(['我'].concat(members().map(id => CAST[id].nick)).join('、'))}</div>${bubbles(group(), true)}</div></div>${chatInput('group', '在群里说点什么…')}`; },
    after() { view.querySelector('[data-act="back"]').onclick = back; wireChat('group', t => `（QQ·群聊）${t}`); }
  };
  /* 名片：只放好感、关系、当前位置；到达个人线门槛时弹窗询问 */
  let routeAsked = {}; try { routeAsked = JSON.parse(localStorage.getItem('lbp-route') || '{}'); } catch (e) { }
  VIEWS.card = {
    cls: 'qq qq-card', bar: '#fff',
    html(c) {
      const id = c.id, ca = CAST[id];
      if (id === 'ai') return `<div class="ap-top" style="position:absolute;left:0;right:0;z-index:2;background:transparent;border:0;color:#fff"><button type="button" class="bk" data-act="back" aria-label="返回">${ICON.back}</button><h2></h2><span class="ac"></span></div><div class="ap-body"><div class="hero" style="--c:${ca.c};--ax:${ca.ax}"><img src="${ca.sprite}" alt="" style="mix-blend-mode:multiply">${av(id)}</div><div class="who"><b>${esc(ca.nick)}</b><p>${esc(ca.sig)}</p></div><div class="rows"><div><span>好感</span><b>？？？</b></div><div><span>关系</span><b>？？？</b></div><div><span>位置</span><b>观测者剧场</b></div></div><div class="acts"><button type="button" data-act="msg">发消息</button></div></div>`;
      const gi = girl(id); const love = Math.max(0, Math.min(100, +gi.love || 0)); const ready = gi.in && love >= ROUTE_AT && g('plot.phase') !== 'route';
      return `<div class="ap-top" style="position:absolute;left:0;right:0;z-index:2;background:transparent;border:0;color:#fff"><button type="button" class="bk" data-act="back" aria-label="返回">${ICON.back}</button><h2></h2><span class="ac"></span></div>
      <div class="ap-body"><div class="hero" style="--c:${ca.c};--ax:${ca.ax}"><img src="${ca.sprite}" alt="">${av(id)}</div>
      <div class="who"><b>${esc(ca.nick)}<em>${esc(ca.name)}</em></b><p>${esc(ca.sig)}</p></div>
      <div class="rows"><div><span>好感</span><span class="love"><span class="bar" style="--c:${ca.c};--p:${love}%"><i></i></span><b>${love}</b></span></div><div><span>关系</span><b>${esc(gi.in ? gi.rel || '—' : '未入住')}</b></div><div><span>位置</span><b>${esc(locOf(id))}</b></div></div>
      ${ready ? `<button type="button" class="route-cta" data-act="route" style="--c:${ca.c}">♥ 前往${esc(ca.name)}的角色剧情</button>` : ''}
      <div class="acts"><button type="button" data-act="msg">发消息</button><button type="button" class="vd" data-act="video" ${gi.in ? '' : 'disabled'}>视频通话</button></div></div>
      ${ready && !routeAsked[id] ? `<div class="route-pop" role="dialog" aria-label="角色剧情"><div class="rp-in" style="--c:${ca.c}">${av(id)}<b>和${esc(ca.name)}的好感达到了 ${love}</b><p>是否前往角色剧情？</p><div class="rp-b"><button type="button" data-act="later">以后再说</button><button type="button" class="yes" data-act="route">前往</button></div></div></div>` : ''}`;
    },
    after(c) {
      view.querySelector('[data-act="back"]').onclick = back;
      view.querySelector('[data-act="msg"]').onclick = () => go('chat', { id: c.id });
      const v = view.querySelector('[data-act="video"]'); if (v) v.onclick = () => { insert(`（QQ·视频通话 ${CAST[c.id].name}）`); go('call', { id: c.id }); };
      const remember = () => { routeAsked[c.id] = 1; try { localStorage.setItem('lbp-route', JSON.stringify(routeAsked)); } catch (e) { } };
      view.querySelectorAll('[data-act="route"]').forEach(b => b.onclick = () => { remember(); if (insert(`（前往角色剧情 ${CAST[c.id].name}）我想认真面对和${CAST[c.id].name}的关系。`)) render(); else render(); });
      const l = view.querySelector('[data-act="later"]'); if (l) l.onclick = () => { remember(); render(); };
    }
  };
  let callT, callI = 0, callStart = 0;
  VIEWS.call = {
    cls: 'qq-call', bar: '#fff',
    html(c) {
      const ca = CAST[c.id]; const cl = call(); const live = cl.with === c.id && Array.isArray(cl.lines) && cl.lines.length;
      return `<div class="bg" style="--c:${ca.c};--ax:${ca.ax}"><img src="${ca.sprite}" alt=""></div>${live ? `<img class="fig ${ca.egg ? 'egg' : ''}" src="${ca.sprite}" alt="" style="--ax:${ca.ax}">` : ''}
      <div class="hd"><b>${esc(ca.name)}</b><span id="lbp-call-t">${live ? '通话中' : '正在呼叫…'}</span></div><div class="self">我</div>
      ${live ? `<div class="sub"><span id="lbp-sub"></span><small id="lbp-sub-n"></small></div>` : `<div class="none">已经把呼叫填进输入框。<br>发送后，她接不接、说什么，由剧情决定；<br>接通后这里会显示她说的话。</div>`}
      <div class="btns">${live ? `<button type="button" class="nx" data-act="next">${ICON.next}下一句</button>` : ''}<button type="button" class="hang" data-act="hang">${ICON.hang}挂断</button></div>`;
    },
    after(c) {
      clearInterval(callT); callStart = Date.now(); callI = 0;
      const cl = call(); const live = cl.with === c.id && Array.isArray(cl.lines) && cl.lines.length;
      const show = () => { const s = view.querySelector('#lbp-sub'); if (!s) return; s.textContent = cl.lines[callI] || ''; view.querySelector('#lbp-sub-n').textContent = `${callI + 1} / ${cl.lines.length}`; };
      if (live) { show(); callT = setInterval(() => { const t = view.querySelector('#lbp-call-t'); if (!t) { clearInterval(callT); return; } const s = Math.floor((Date.now() - callStart) / 1000); t.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 1000); }
      const nx = view.querySelector('[data-act="next"]'); if (nx) nx.onclick = () => { callI = (callI + 1) % cl.lines.length; show(); };
      view.querySelector('[data-act="hang"]').onclick = () => { clearInterval(callT); back(); };
    }
  };

  /* ---------- 相册 ---------- */
  VIEWS.album = {
    cls: 'al', bar: '#3f3328',
    html() {
      return `${topbar('相册', '', '', true)}<div class="ap-body"><div class="al-books">${CG.albums.map(a => { const list = CG.cgs.filter(c => c.album === a.id); const n = list.filter(unlocked).length; const nw = list.filter(c => unlocked(c) && !seen.has(c.id)).length; const ca = CAST[a.id]; return `<button type="button" class="al-book" data-book="${a.id}" style="--c:${ca ? ca.c : '#9a6a3c'};--ax:${ca ? ca.ax : .5}"><span class="cv">${ca ? `<img src="${ca.sprite}" alt="">` : ''}<span class="lab">${esc(a.title)}</span></span><small>${esc(a.sub)} · ${n} / ${list.length}</small>${nw ? `<span class="nw">${nw}</span>` : ''}</button>`; }).join('')}</div></div>`;
    },
    after() { view.querySelectorAll('[data-book]').forEach(b => b.onclick = () => go('book', { id: b.dataset.book })); }
  };
  VIEWS.book = {
    cls: 'al', bar: '#3f3328',
    html(c) {
      const a = CG.albums.find(x => x.id === c.id) || { title: '', sub: '' }; const list = CG.cgs.filter(x => x.album === c.id); const ca = CAST[c.id];
      return `${topbar(a.title + ' · ' + a.sub)}<div class="ap-body"><div class="al-grid">${list.map((cg, i) => { const u = unlocked(cg); const nw = u && !seen.has(cg.id); return `<button type="button" class="al-pol ${nw ? 'new' : ''}" data-cg="${cg.id}" style="--r:${[-3, 2, -1.5, 3][i % 4]}deg;--c:${ca ? ca.c : '#9a6a3c'}" ${u ? '' : 'disabled'}><span class="tp"></span><span class="pic">${u && cg.src ? `<img src="${esc(cg.src)}" alt="">` : `<span class="lk">${u ? '<b>…</b>照片还在冲洗' : `<b>?</b>${esc(condText(cg))}`}</span>`}</span><span class="cap">${u ? esc(cg.cap || '　') : '　'}</span></button>`; }).join('') || `<div class="ap-empty"><b>这本还是空的</b></div>`}</div></div>`;
    },
    after(c) {
      view.querySelector('[data-act="back"]').onclick = back;
      const list = CG.cgs.filter(x => x.album === c.id);
      markSeen(list.filter(unlocked).map(x => x.id));
      view.querySelectorAll('[data-cg]').forEach(b => b.onclick = () => { const cg = CG.cgs.find(x => x.id === b.dataset.cg); if (cg && cg.src) go('viewer', { id: c.id, cg: cg.id }); else toast('这张 CG 还没有图'); });
    }
  };
  VIEWS.viewer = {
    cls: 'al-view', bar: '#fff',
    html(c) {
      const list = CG.cgs.filter(x => x.album === c.id && unlocked(x) && x.src); const i = Math.max(0, list.findIndex(x => x.id === c.cg)); const cg = list[i] || {};
      return `<button type="button" class="x" data-act="back" aria-label="关闭">×</button>${list.length > 1 ? `<button type="button" class="nav l" data-nav="-1">‹</button><button type="button" class="nav r" data-nav="1">›</button>` : ''}<div class="img"><img src="${esc(cg.src || '')}" alt=""></div><div class="cap">${esc(cg.cap || '')}<small>${i + 1} / ${list.length}</small><button type="button" class="setwall" data-act="wall">${WALL === cg.src ? '✓ 当前壁纸（点击恢复默认）' : '设为壁纸'}</button></div>`;
    },
    after(c) {
      view.querySelector('[data-act="back"]').onclick = back;
      const list = CG.cgs.filter(x => x.album === c.id && unlocked(x) && x.src);
      const w = view.querySelector('[data-act="wall"]'); if (w) w.onclick = () => { const cg = CG.cgs.find(x => x.id === c.cg); if (!cg) return; if (WALL === cg.src) { setWall(''); toast('已恢复默认壁纸'); } else { setWall(cg.src); toast('已设为锁屏和主屏壁纸'); } render(); };
      view.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => { const i = list.findIndex(x => x.id === c.cg); const n = (i + (+b.dataset.nav) + list.length) % list.length; stack[stack.length - 1] = { v: 'viewer', id: c.id, cg: list[n].id }; render(); });
    }
  };

  /* ---------- 地图 ---------- */
  function whereIs(id) {
    const gi = girl(id); if (!gi.in) return null;
    const slot = g('time.slot', '白天');
    if (slot === '白天' && CAST[id].school) return CAST[id].school;
    return 'home';
  }
  function svgMap() {
    if (!MAP) return '';
    const pts = MAP.points.map(p => { const done = p.event && events().includes(p.event); const here = (g('scene.place', '') || '').includes(p.name.slice(0, 2)); return `<g class="pt ${done ? 'done' : ''} ${here ? 'here' : ''}" data-pt="${p.id}" style="--c:${p.c}"><circle cx="${p.x}" cy="${p.y}" r="6"/><text x="${p.x + 9}" y="${p.y + 4}">${esc(p.name)}</text>${done ? `<text class="stamp" x="${p.x - 14}" y="${p.y - 10}">已去过</text>` : ''}</g>`; }).join('');
    return `<svg class="mp-svg" viewBox="${MAP.view}" preserveAspectRatio="xMidYMid meet" aria-label="上海地图">
      <rect class="land" x="0" y="0" width="400" height="520"/>
      <path class="water" d="M285 0 C300 60 250 120 262 190 C270 240 300 270 300 330 C300 400 340 450 360 520 L400 520 L400 0 Z" opacity=".9"/>
      <path class="water" d="M300 330 C300 400 340 450 360 520 L330 520 C320 450 280 400 285 330 Z"/>
      <path class="water" d="M0 500 Q120 470 260 505 L260 520 L0 520 Z" opacity=".7"/>
      <path class="dist" d="M110 230 L200 150 M200 150 L260 120 M110 230 L120 330 M120 330 L200 300 M200 300 L250 320 M200 150 L230 230 L250 320 M60 400 L200 380"/>
      <path class="road" d="M40 300 C120 290 180 330 250 300 C300 280 330 230 300 150 M150 520 C160 440 140 380 170 300 C190 240 180 180 230 120"/>
      <path class="metro" stroke="#e0397a" d="M118 440 C130 400 180 360 220 330 C250 300 262 260 268 232 C275 200 300 160 318 150"/>
      <path class="metro" stroke="#8fc31f" d="M62 290 C120 280 180 300 230 260 C250 240 270 240 292 110"/>
      ${MAP.districts.map(d => `<text class="dname" x="${d.x}" y="${d.y}">${esc(d.name)}</text>`).join('')}
      ${pts}</svg>`;
  }
  VIEWS.map = {
    cls: 'mp', bar: '#3f3328',
    html() {
      return `${topbar('上海 · 她们在哪', '', '', true)}<div class="mp-wrap">${svgMap()}<div class="mp-ppl" id="lbp-ppl"></div><div class="mp-legend"><i style="background:#fff;box-shadow:0 0 0 2px #6f9fdc"></i>地点　<i style="background:#e8a33a"></i>去过　<i style="background:#fff;box-shadow:0 0 0 2px #2db3a0;animation:mp-ping 1.6s infinite"></i>现在</div><div class="mp-card" id="lbp-card" hidden></div></div>`;
    },
    after() {
      const svg = view.querySelector('.mp-svg'); const card = view.querySelector('#lbp-card'); const ppl = view.querySelector('#lbp-ppl');
      if (!svg) return;
      const place = () => {
        const wrap = view.querySelector('.mp-wrap'); if (!svg.isConnected || !wrap) { ro && ro.disconnect(); return; }
        const vb = MAP.view.split(' ').map(Number); const r = svg.getBoundingClientRect(); const wr = wrap.getBoundingClientRect();
        const sc = Math.min(r.width / vb[2], r.height / vb[3]); const ox = r.left - wr.left + (r.width - vb[2] * sc) / 2, oy = r.top - wr.top + (r.height - vb[3] * sc) / 2;
        const at = {}; SLOTS.forEach(id => { const w = whereIs(id); if (w) (at[w] = at[w] || []).push(id); });
        ppl.innerHTML = Object.entries(at).map(([pid, ids]) => { const p = MAP.points.find(x => x.id === pid); if (!p) return ''; return ids.map((id, k) => `<span class="p" data-card="${id}" style="--c:${CAST[id].c};left:${ox + (p.x + (k - (ids.length - 1) / 2) * 24) * sc}px;top:${oy + (p.y - 8 - (k % 2 ? 0 : 22)) * sc}px">${av(id, 'round')}</span>`).join(''); }).join('');
        ppl.querySelectorAll('[data-card]').forEach(b => b.onclick = () => go('card', { id: b.dataset.card }));
      };
      let ro = null; place(); ro = new ResizeObserver(place); ro.observe(svg);
      const showCard = id => {
        const p = MAP.points.find(x => x.id === id); if (!p) return;
        svg.querySelectorAll('.pt').forEach(x => x.classList.toggle('sel', x.dataset.pt === id));
        const who = p.who === 'home' ? SLOTS.filter(x => whereIs(x) === 'home') : (Array.isArray(p.who) ? p.who.filter(x => x !== 'me' && girl(x).in) : []);
        card.innerHTML = `<button type="button" class="x" data-act="x" aria-label="关闭">×</button><b>${esc(p.name)}<em>${esc(p.area)}</em></b><p>${esc(p.desc)}</p>${who.length ? `<div class="who">现在在这：${who.map(x => av(x)).join('')}</div>` : ''}<div class="row">${p.floor ? `<button type="button" class="sec" data-act="floor">看平面图</button>` : ''}<button type="button" data-act="go">${esc(p.go)}</button></div>`;
        card.hidden = false;
        card.querySelector('[data-act="x"]').onclick = () => { card.hidden = true; svg.querySelectorAll('.pt').forEach(x => x.classList.remove('sel')); };
        card.querySelector('[data-act="go"]').onclick = () => insert(p.go);
        const f = card.querySelector('[data-act="floor"]'); if (f) f.onclick = () => go('floor');
      };
      svg.querySelectorAll('.pt').forEach(p => p.addEventListener('click', () => showCard(p.dataset.pt)));
    }
  };
  VIEWS.floor = {
    cls: 'mp', bar: '#3f3328',
    html() {
      const here = (g('scene.place', '') || '');
      const room = r => { const who = Array.isArray(r.who) ? r.who : [r.who]; const ins = who.filter(x => x === 'me' || girl(x).in); const vac = !ins.length; return `<div class="mp-rm ${vac ? 'vac' : ''} ${here.includes(r.no) ? 'here' : ''}"><span class="no">${r.no}</span>${vac ? `<small>招租中</small>` : `<span class="avs">${ins.map(x => av(x, 'round')).join('')}</span><span>${esc(ins.map(x => x === 'me' ? '我' : CAST[x].name).join(' / '))}</span>`}${r.label ? `<small>${esc(r.label)}</small>` : ''}${vac ? '' : `<button type="button" data-knock="${r.no}" style="position:absolute;inset:0" aria-label="去 ${r.no}"></button>`}</div>`; };
      const pub = (name, key) => `<div class="mp-rm pub ${here.includes(name) ? 'here' : ''}"><b style="font-weight:400">${name}</b><span class="avs">${present().filter(x => here.includes(name)).map(x => av(x, 'round')).join('')}</span><button type="button" data-knock="${key}" style="position:absolute;inset:0" aria-label="去${name}"></button></div>`;
      return `${topbar('锦绣云湾 2001')}<div class="ap-body"><div class="mp-floor"><h3>二楼 · 静区</h3><div class="mp-fl">${MAP.rooms.filter(r => r.floor === 2).map(room).join('')}</div><h3>一楼 · 动区</h3><div class="mp-fl">${pub('客厅', '客厅')}${MAP.rooms.filter(r => r.floor === 1).map(room).join('')}${pub('厨房', '厨房')}</div></div></div>`;
    },
    after() {
      view.querySelector('[data-act="back"]').onclick = back;
      view.querySelectorAll('[data-knock]').forEach(b => b.onclick = () => { const k = b.dataset.knock; const r = MAP.rooms.find(x => x.no === k); if (!r) { insert(`我去${k}。`); return; } const who = (Array.isArray(r.who) ? r.who : [r.who]).filter(x => x !== 'me'); insert(who.length ? `我走到 ${k} 室门口，敲了敲${who.map(x => CAST[x].name).join('和')}的门。` : `我回 ${k} 室。`); });
    }
  };

  /* ---------- 观测者 ---------- */
  VIEWS.ai = {
    cls: 'ai-app', bar: '#fff',
    html() {
      const say = ['又来了？这次打算怎么翻车？', '读档次数我都替你数着呢。', '别看了，看我也不会给你提示。', '贪心的代价好吃吗，大少爷？'][(+g('plot.badend', 0)) % 4];
      return `${topbar('　')}<div class="ap-body"><div class="body"><img class="fig" src="${CAST.ai.sprite}" alt=""><div class="num"><div><b>${esc(String(g('plot.loop', 1)))}</b><span>周目</span></div><div><b>${esc(String(g('plot.badend', 0)))}</b><span>Bad End</span></div></div><div class="say">${esc(say)}</div></div></div>`;
    },
    after() { view.querySelector('[data-act="back"]').onclick = back; }
  };

  /* 通用：返回按钮 / 每分钟刷新时钟 */
  renderMini();
  render();
  mount.lbp = { go, home, back, setOpen, render, setWall: src => { setWall(src); render(); }, get state() { return S; } };
})();
