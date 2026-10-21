'use strict';
/* 海外员工打卡（移动端 H5 + 可安装 PWA）
 * 移植自「海外员工打卡程序」前端：工号+打卡密码登录(30天免登) → 人脸活体 + 地理围栏 + 按员工时区打卡
 * 后端接口（与排期人员管理系统共用）：
 *   POST /api/att/emp/login   {employee_no, pin} -> {token, name, employee_no, timezone, work_start, work_end, country, has_face}
 *   GET  /api/att/emp/me       (Bearer) -> 同上
 *   POST /api/att/checkin      (Bearer) {type, lat, lng, descriptor} -> {record, eval}
 * 人脸模型与员工证件照特征提取均在浏览器本地完成，原始照片不上传。 */

const MODEL_URL = 'assets/vendor/models';
// API 地址解析：?api= 参数 > att-config.js 的 window.ATT_API_BASE > 本地记忆 > 同源
(function () {
  const q = new URLSearchParams(location.search).get('api');
  if (q) { window.ATT_API_BASE = q.replace(/\/+$/, ''); localStorage.setItem('att_api_base', window.ATT_API_BASE); }
  else if (!window.ATT_API_BASE) { window.ATT_API_BASE = localStorage.getItem('att_api_base') || ''; }
  window.ATT_API_BASE = (window.ATT_API_BASE || '').replace(/\/+$/, '');
})();
const API = window.ATT_API_BASE || '';
const $ = (id) => document.getElementById(id);

let currentEmp = null;
let stream = null;
let MODELS_OK = false;
let TYPE = 'check_in';
let punchBtn = $('btn-punch');

// 顶部时钟：按员工所在时区走，而非手机本地时区
let _clockTimer = null;
let _empOffset = 480;
const _LANG_LOCALE = { zh: 'zh-CN', en: 'en-US', uz: 'uz-UZ' };

// ---------------- 隐私协议 ----------------
const PRIVACY_BODY = {
  zh: '1. 为完成打卡身份核验，系统将通过摄像头实时进行人脸识别。\n2. 识别过程仅在本机浏览器内提取人脸特征值用于比对，原始人脸照片不会上传、不会存储。\n3. 您的面部信息不会用于考勤以外的任何用途，也不会向任何第三方提供、出售或披露。\n4. 打卡记录仅保存工号、时间、地理位置与识别结果，用于考勤统计。\n5. 如有疑问请联系管理员。',
  en: '1. For identity verification, the camera performs real-time face recognition.\n2. Features are extracted locally in your browser for comparison only; no facial photos are uploaded or stored.\n3. Your facial data is never used for other purposes or shared with any third party.\n4. Only employee ID, time, location and result are saved for attendance statistics.\n5. Contact the administrator if you have questions.',
  uz: "1. Shaxsni tekshirish uchun kamera real vaqtda yuzni tanishni amalga oshiradi.\n2. Xususiyatlar faqat taqqoslash uchun brauzeringizda chiqariladi; yuz suratlari yuklanmaydi va saqlanmaydi.\n3. Yuz ma'lumotlari boshqa maqsadlarda ishlatilmaydi va uchinchi shaxslarga berilmaydi.\n4. Faqat ishchi raqami, vaqt, joylashuv va natija saqlanadi.\n5. Savollar bo'lsa administratorga murojaat qiling."
};
function renderPrivacy() {
  const line = `<span>${tr('privacy_line')} </span><a onclick="showPrivacy()">${tr('privacy_link')}</a>`;
  const a = $('privacyLine'), b = $('privacyLine2'), c = $('privacyLine3');
  if (a) a.innerHTML = line;
  if (b) b.innerHTML = line;
  if (c) c.innerHTML = line;
}
function showPrivacy() { $('privacyTitle').textContent = tr('privacy_title'); $('privacyBody').textContent = PRIVACY_BODY[currentLang] || PRIVACY_BODY.zh; $('privacyModal').classList.add('show'); }
function acceptPrivacy() { localStorage.setItem('att_privacy_agreed', '1'); $('privacyModal').classList.remove('show'); }
function declinePrivacy() { $('privacyModal').classList.remove('show'); logoutEmp(); }
if (!localStorage.getItem('att_privacy_agreed')) setTimeout(showPrivacy, 600);

// ---------------- API ----------------
async function attFetch(path, opts) {
  opts = opts || {};
  const tok = localStorage.getItem('att_token');
  if (tok && !(opts.headers && opts.headers.Authorization)) opts.headers = Object.assign({}, opts.headers, { Authorization: 'Bearer ' + tok });
  return fetch(API + path, opts);
}

// ---------------- 多入口环境识别：Telegram / 钉钉 / 普通浏览器 ----------------
const IS_TG = /Telegram/i.test(navigator.userAgent);
const IS_DD = /DingTalk/i.test(navigator.userAgent);
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('script load failed'));
    document.head.appendChild(s);
  });
}
// TG Web App initData：配置 botToken 后服务端强校验，必须随打卡请求透传
function tgData() { const t = window.Telegram && window.Telegram.WebApp; return (t && t.initData) || ''; }
function withTg(body) { const t = tgData(); if (t) body.tgData = t; return body; }

// 钉钉免登：JSAPI 取 authCode -> 服务端换取 unionId -> 匹配已绑定员工 -> 发 token
async function dingtalkLogin() {
  try {
    setStatus(tr('loading'), 'warn');
    if (!window.dd) await loadScript('https://g.alicdn.com/dingtalk-jsapi/3.0.25/dingtalk.open.js');
    const rc = await attFetch('/api/att/emp/dingtalk-cfg');
    const cd = await rc.json();
    if (!cd.ok || !cd.corpId) throw new Error('未配置钉钉 corpId（管理员在「集成配置」填写）');
    window.dd.ready(() => {
      window.dd.runtime.permission.requestAuthCode({
        corpId: cd.corpId,
        onSuccess: async (r) => {
          try {
            const resp = await attFetch('/api/att/emp/dingtalk-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: r.code }) });
            const d = await resp.json();
            if (!resp.ok || !d.ok) throw new Error(d.error || tr('dd_fail'));
            currentEmp = d;
            localStorage.setItem('att_token', d.token);
            setStatus('', '');
            enterPunchView(d);
          } catch (e) {
            setStatus(e.message, 'bad');
            if ($('regView')) $('regView').classList.add('hidden');
            $('loginView').classList.remove('hidden');
          }
        },
        onFail: (err) => setStatus(tr('dd_fail') + '：' + JSON.stringify(err), 'bad'),
      });
    });
    window.dd.error((err) => setStatus(tr('dd_fail') + '：' + ((err && err.message) || ''), 'bad'));
  } catch (e) {
    setStatus(tr('dd_fail') + '：' + e.message, 'bad');
    $('loginView').classList.remove('hidden');
  }
}

// ---------------- 登录 ----------------
async function restoreSession() {
  const tok = localStorage.getItem('att_token');
  if (!tok) { if (IS_DD) dingtalkLogin(); return; }
  try {
    const r = await attFetch('/api/att/emp/me');
    const d = await r.json();
    if (r.ok && d.ok) { currentEmp = d; enterPunchView(d); }
    else localStorage.removeItem('att_token');
  } catch (e) {}
}
async function login() {
  const no = $('empNo').value.trim();
  const pass = $('empPass').value;
  if (!no || !pass) { setStatus(tr('fields_required'), 'warn'); return; }
  const btn = $('btn-login'); if (btn) btn.disabled = true;
  try {
    const r = await attFetch('/api/att/emp/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withTg({ employee_no: no, pin: pass })) });
    const d = await r.json();
    if (!r.ok || !d.ok) { setStatus(tr((d && d.code) || 'login_failed', d && d.error), 'bad'); if (btn) btn.disabled = false; return; }
    currentEmp = d;
    if (d.token) localStorage.setItem('att_token', d.token);
    setStatus('', '');
    enterPunchView(d);
  } catch (e) { setStatus(tr('net_error'), 'bad'); if (btn) btn.disabled = false; }
  if (btn) btn.disabled = false;
}
function logoutEmp() {
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  stopClock();
  localStorage.removeItem('att_token');
  currentEmp = null;
  setStatus('', '');
  $('punchView').classList.add('hidden');
  $('loginView').classList.remove('hidden');
}

// ---------------- 自助注册 ----------------
function showRegister() { $('loginView').classList.add('hidden'); $('regView').classList.remove('hidden'); renderRegSelects(); }
function showLogin() { $('regView').classList.add('hidden'); $('loginView').classList.remove('hidden'); }

const TZ_LIST = ['Asia/Shanghai', 'Asia/Tashkent', 'Asia/Almaty', 'Asia/Bishkek', 'Asia/Dushanbe', 'Asia/Ashgabat',
  'Europe/Moscow', 'Europe/Istanbul', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Tehran', 'Asia/Karachi', 'Asia/Kolkata',
  'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Singapore', 'Asia/Seoul', 'Asia/Tokyo', 'Europe/London', 'Europe/Berlin',
  'Europe/Paris', 'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam', 'Europe/Warsaw', 'Europe/Kyiv',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Mexico_City',
  'America/Sao_Paulo', 'America/Toronto', 'Africa/Cairo', 'Australia/Sydney', 'Pacific/Auckland', 'UTC'];
const TZ_BY_COUNTRY = { CN: 'Asia/Shanghai', UZ: 'Asia/Tashkent', KZ: 'Asia/Almaty', KG: 'Asia/Bishkek', TJ: 'Asia/Dushanbe',
  TM: 'Asia/Ashgabat', RU: 'Europe/Moscow', TR: 'Europe/Istanbul', AE: 'Asia/Dubai', SA: 'Asia/Riyadh', IR: 'Asia/Tehran',
  PK: 'Asia/Karachi', IN: 'Asia/Kolkata', TH: 'Asia/Bangkok', ID: 'Asia/Jakarta', SG: 'Asia/Singapore', KR: 'Asia/Seoul',
  JP: 'Asia/Tokyo', GB: 'Europe/London', DE: 'Europe/Berlin', FR: 'Europe/Paris', ES: 'Europe/Madrid', IT: 'Europe/Rome',
  NL: 'Europe/Amsterdam', PL: 'Europe/Warsaw', UA: 'Europe/Kyiv', EG: 'Africa/Cairo', US: 'America/New_York',
  CA: 'America/Toronto', MX: 'America/Mexico_City', BR: 'America/Sao_Paulo', AU: 'Australia/Sydney', NZ: 'Pacific/Auckland' };

let _regLoaded = false;
async function renderRegSelects() {
  const cSel = $('regCountry'), tSel = $('regTz');
  if (!cSel || !tSel) return;
  // 时区
  const curTz = tSel.value;
  tSel.innerHTML = TZ_LIST.map((t) => `<option value="${t}">${t.replace('_', ' ')}</option>`).join('');
  if (curTz && TZ_LIST.includes(curTz)) tSel.value = curTz;
  // 国家（公开接口）
  try {
    const r = await attFetch('/api/att/geo/countries');
    const d = await r.json();
    if (!d.ok || !Array.isArray(d.countries)) return;
    const cur = cSel.value;
    let list = d.countries.map((c) => ({ iso: c.iso, label: currentLang === 'zh' ? (c.zh || c.name) : c.name }));
    // 常用国家置顶：乌兹 / 中国 / 俄 / 哈萨克
    const top = ['UZ', 'CN', 'RU', 'KZ'];
    list = list.filter((c) => !top.includes(c.iso)).sort((a, b) => a.label.localeCompare(b.label, currentLang === 'zh' ? 'zh' : 'en'));
    top.forEach((iso) => { const c = d.countries.find((x) => x.iso === iso); if (c) list.unshift({ iso, label: currentLang === 'zh' ? (c.zh || c.name) : c.name }); });
    cSel.innerHTML = list.map((c) => `<option value="${c.iso}">${c.iso} · ${c.label}</option>`).join('');
    if (cur) cSel.value = cur; else { cSel.value = 'UZ'; tSel.value = TZ_BY_COUNTRY.UZ; }
  } catch (e) { /* 列表加载失败不影响手输注册 */ }
}
function onRegCountryChange() {
  const iso = $('regCountry').value;
  if (iso && TZ_BY_COUNTRY[iso]) $('regTz').value = TZ_BY_COUNTRY[iso];
}
async function register() {
  const name = $('regName').value.trim();
  const no = $('regNo').value.trim();
  const phone = $('regPhone').value.trim();
  const p1 = $('regPin').value.trim(), p2 = $('regPin2').value.trim();
  if (!name || !p1) { setStatus(tr('fields_required'), 'warn'); return; }
  if (p1 !== p2) { setStatus(tr('reg_pin_mismatch'), 'bad'); return; }
  const btn = $('btn-register'); if (btn) btn.disabled = true;
  try {
    const r = await attFetch('/api/att/emp/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withTg({ name, employee_no: no, pin: p1, phone, country: $('regCountry').value, timezone: $('regTz').value })) });
    const d = await r.json();
    if (!r.ok || !d.ok) { setStatus(tr((d && d.code) || 'save_fail', d && d.error), 'bad'); return; }
    currentEmp = d;
    localStorage.setItem('att_token', d.token);
    _regLoaded = false;
    $('regView').classList.add('hidden');
    setStatus(tr('reg_ok') + '\n' + tr('employee_no') + ': ' + d.employee_no, 'ok');
    enterPunchView(d);
  } catch (e) { setStatus(tr('net_error'), 'bad'); }
  if (btn) btn.disabled = false;
}

// ---------------- 首次自助录入人脸底库 ----------------
async function enrollFace() {
  if (!currentEmp) { setStatus(tr('need_login'), 'warn'); return; }
  if (!localStorage.getItem('att_privacy_agreed')) { showPrivacy(); return; }
  const btn = $('btn-enroll'); if (btn) btn.disabled = true;
  setStatus(tr('recognizing'), 'warn');
  setCameraState('busy', tr('recognizing'));
  try {
    const descriptor = await captureDescriptor();
    const r = await attFetch('/api/att/emp/enroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withTg({ descriptor })) });
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(tr('enroll_fail', d && d.error));
    currentEmp.has_face = true;
    renderEnrollUI();
    setStatus(tr('enroll_ok'), 'ok');
    setCameraState('ready', tr('model_ready'));
  } catch (e) {
    setStatus(tr('enroll_fail') + '：' + e.message, 'bad');
    setCameraState('ready', tr('cam_align'));
  }
  if (btn) btn.disabled = false;
}
function renderEnrollUI() {
  const need = currentEmp && !currentEmp.has_face;
  const panel = $('enrollPanel');
  if (panel) panel.classList.toggle('hidden', !need);
  const seg = $('typeSeg'), pb = $('btn-punch');
  if (seg) seg.classList.toggle('hidden', !!need);
  if (pb) pb.classList.toggle('hidden', !!need);
}

// ---------------- 员工信息 / 时区时钟 ----------------
function enterPunchView(emp) {
  $('loginView').classList.add('hidden');
  $('punchView').classList.remove('hidden');
  const nm = (emp.name || '').trim();
  $('whoAvatar').textContent = nm ? nm.charAt(0).toUpperCase() : '·';
  $('whoName').textContent = nm || '—';
  $('whoNo').textContent = emp.employee_no || '';
  renderTzChips(emp);
  startClock(emp);
  renderPrivacy();
  renderPunchBtn();
  renderEnrollUI();
  renderCameraHint();
  if (!emp.has_face) { setStatus(tr('enroll_title'), 'warn'); }
  const live = $('liveState'); if (live) live.classList.add('loading');
  $('liveText').textContent = tr('loading');
  startCamera();
}

function _utcMs() { const n = new Date(); return n.getTime() + n.getTimezoneOffset() * 60000; }
function _pad2(n) { return String(n).padStart(2, '0'); }
function fmtTime(utcMs, offsetMin) { const d = new Date(utcMs + offsetMin * 60000); return _pad2(d.getUTCHours()) + ':' + _pad2(d.getUTCMinutes()) + ':' + _pad2(d.getUTCSeconds()); }
function startClock(emp) {
  _empOffset = tzOffsetMinutes(emp.timezone) || 480;
  if (_clockTimer) clearInterval(_clockTimer);
  tickClock();
  _clockTimer = setInterval(tickClock, 1000);
}
function stopClock() { if (_clockTimer) { clearInterval(_clockTimer); _clockTimer = null; } }
function tickClock() {
  const el = $('clockTime'); if (!el) return;
  const utcMs = _utcMs();
  el.textContent = fmtTime(utcMs, _empOffset);
  const dEl = $('clockDate');
  if (dEl) {
    try { dEl.textContent = new Date(utcMs + _empOffset * 60000).toLocaleDateString(_LANG_LOCALE[currentLang] || 'zh-CN', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }); } catch (e) { dEl.textContent = ''; }
  }
  const bj = $('chipBj');
  if (bj && currentEmp && _empOffset !== 480) bj.textContent = tr('bj_time') + ' ' + fmtTime(utcMs, 480);
}
function renderTzChips(emp) {
  const tz = $('chipTz'), bj = $('chipBj'), sh = $('chipShift');
  if (!tz) return;
  if (!emp) { tz.textContent = ''; if (bj) bj.textContent = ''; if (sh) sh.textContent = ''; return; }
  const off = tzOffsetMinutes(emp.timezone);
  const bjDiff = off - 480;
  const tzTxt = (emp.timezone || '') + (off ? ' · UTC' + (off >= 0 ? '+' : '') + (off / 60) : '');
  tz.textContent = tzTxt + (bjDiff ? ' · ' + bjDiffText(bjDiff * 60) : '');
  if (bj) {
    if (bjDiff) { bj.textContent = tr('bj_time') + ' ' + fmtTime(_utcMs(), 480); bj.classList.remove('hidden'); }
    else { bj.textContent = ''; bj.classList.add('hidden'); }
  }
  if (sh) sh.textContent = (emp.work_start && emp.work_end) ? tr('time_plan') + ' ' + String(emp.work_start).slice(0, 5) + '–' + String(emp.work_end).slice(0, 5) : '';
}

// ---------------- 打卡类型 ----------------
$('typeSeg') && $('typeSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  TYPE = b.dataset.t;
  [...$('typeSeg').children].forEach((x) => x.classList.toggle('on', x === b));
  renderPunchBtn();
});
function renderPunchBtn() {
  if (!punchBtn) return;
  punchBtn.textContent = (TYPE === 'check_out') ? tr('punch_out') : tr('punch_in');
}

// ---------------- 摄像头 + 人脸模型 ----------------
let _camState = 'idle';
function setCameraState(state, text) {
  _camState = state;
  const box = $('camHint'), txt = $('camHintText');
  if (txt) txt.textContent = text || '';
  if (box) box.className = 'ov' + (state === 'error' ? ' bad' : (state === 'loading' || state === 'busy' ? ' warn' : ''));
  const cam = $('camBox'); if (cam) cam.classList.toggle('busy', state === 'busy');
}
function renderCameraHint() {
  const map = { idle: tr('cam_align'), loading: tr('loading_model'), ready: tr('model_ready'), busy: tr('recognizing'), error: tr('camera_error') };
  setCameraState(_camState, map[_camState]);
}
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } }, audio: false });
    $('video').srcObject = stream;
    if (_camState === 'idle' || _camState === 'error') setCameraState(MODELS_OK ? 'ready' : 'loading', MODELS_OK ? tr('model_ready') : tr('loading_model'));
  } catch (e) { setCameraState('error', tr('camera_error')); }
}
async function loadFaceModel() {
  const m = window.faceapi;
  if (!m) throw new Error('face-api load failed');
  if (m.nets.faceRecognitionNet.params) { MODELS_OK = true; return; }
  await Promise.all([
    m.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    m.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    m.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  MODELS_OK = true;
  markModelReady();
}
function markModelReady() {
  const live = $('liveState'); if (live) live.classList.remove('loading');
  $('liveText').textContent = tr('model_ready');
  if (_camState === 'loading' || _camState === 'idle') setCameraState('ready', tr('model_ready'));
}
let _work = null;
function getWorkCanvas(w, h) { if (!_work) _work = document.createElement('canvas'); _work.width = w; _work.height = h; return _work; }
async function captureDescriptor() {
  if (!MODELS_OK) { setCameraState('loading', tr('loading_model')); }
  await loadFaceModel();
  const video = $('video');
  const vw = video.videoWidth || 640, vh = video.videoHeight || 480;
  const W = 320, H = Math.max(1, Math.round(vh / vw * W));
  const work = getWorkCanvas(W, H);
  work.getContext('2d').drawImage(video, 0, 0, W, H);
  const det = await window.faceapi.detectSingleFace(work, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 })).withFaceLandmarks(true).withFaceDescriptor();
  if (!det) throw new Error(tr('face_not_found'));
  return Array.from(det.descriptor);
}
setCameraState('idle', '');
renderCameraHint();
loadFaceModel().catch(() => { setCameraState('error', tr('camera_error')); });

// ---------------- 定位 ----------------
function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error(tr('location_required')));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(tr('location_error'))),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}

// ---------------- 打卡 ----------------
async function punch() {
  if (!localStorage.getItem('att_privacy_agreed')) { showPrivacy(); return; }
  if (!currentEmp) { setStatus(tr('need_login'), 'warn'); return; }
  if (!currentEmp.has_face) { setStatus(tr('bad_descriptor'), 'warn'); return; }
  punchBtn.disabled = true;
  setStatus(tr('recognizing'), 'warn');
  setCameraState('busy', tr('recognizing'));
  try {
    const descriptor = await captureDescriptor();
    let lat = null, lng = null;
    try { const pos = await locate(); lat = pos.lat; lng = pos.lng; } catch (e) { /* 允许无定位提交，由服务端判定 */ }
    const r = await attFetch('/api/att/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(withTg({ type: TYPE, lat, lng, descriptor })) });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      if (d && d.code === 'out_of_range') throw new Error(tr('out_of_range') + (d.distance_m != null ? '（' + Math.round(d.distance_m) + 'm）' : ''));
      if (d && d.code === 'face_mismatch') throw new Error(tr('face_mismatch'));
      throw new Error(tr(d.code || 'punch_fail', d && d.error));
    }
    const ev = d.eval || {}, rec = d.record || {};
    const bj = (_empOffset !== 480) ? '（' + tr('bj_time') + ' ' + fmtTime(_utcMs(), 480) + '）' : '';
    const timeTxt = { normal: tr('normal'), late: tr('late'), early_out: tr('early'), normal_out: tr('punch_ok_out'), early: tr('early') }[ev.timeStatus] || ev.timeStatus || '';
    const hol = (ev.holidayLocal || ev.holidayCn) ? '\n🌴 ' + [ev.holidayLocalName, ev.holidayCnName].filter(Boolean).join('·') : '';
    const okTxt = (TYPE === 'check_out') ? tr('punch_ok_out') : tr('punch_ok_in');
    setStatus(okTxt + ' · ' + tr('local_time') + ' ' + (ev.localTime || '') + bj + (timeTxt ? ' · ' + timeTxt : '') + (ev.inRange ? '' : '\n' + tr('out_of_range')) + hol, 'ok');
    setCameraState('ready', tr('model_ready'));
  } catch (e) {
    setStatus(tr('punch_fail') + '：' + e.message, 'bad');
    setCameraState('ready', tr('cam_align'));
  }
  punchBtn.disabled = false;
}

// ---------------- 状态卡 ----------------
function setStatus(msg, cls) {
  const el = $('statusLine'); if (!el) return;
  el.innerHTML = '';
  if (!msg) { el.className = 'status-card'; return; }
  const icons = { ok: '✓', bad: '!', warn: '…' };
  const ic = document.createElement('span'); ic.className = 'si'; ic.textContent = icons[cls] || 'i';
  const tx = document.createElement('span'); tx.className = 'st'; tx.textContent = msg;
  el.appendChild(ic); el.appendChild(tx);
  el.className = 'status-card show' + (cls ? ' ' + cls : '');
}

// ---------------- PWA ----------------
function registerSW() { if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {}); }
let deferredPrompt = null;
function setupInstall() {
  if (window.navigator.standalone) return;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; showInstallBanner(); });
  const isIos = /iP(hone|ad|od)/.test(navigator.userAgent) && !window.MSStream;
  if (isIos) showInstallBanner();
}
function showInstallBanner() {
  const el = $('installBanner'); if (!el) return;
  el.classList.remove('hidden');
  const isIos = /iP(hone|ad|od)/.test(navigator.userAgent) && !window.MSStream;
  $('installText').textContent = isIos ? tr('install_ios') : tr('install_android');
}
function doInstall() {
  if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt = null; const b = $('installBanner'); if (b) b.classList.add('hidden'); }).catch(() => {}); return; }
  alert(tr('install_hint'));
}

// ---------------- 初始化 ----------------
$('regCountry') && $('regCountry').addEventListener('change', onRegCountryChange);
if (IS_DD && $('btn-dd')) $('btn-dd').style.display = 'block'; // 钉钉环境显示一键登录
if (IS_TG) loadScript('https://telegram.org/js/telegram-web-app.js').then(() => {
  try { const tg = window.Telegram.WebApp; tg.ready(); tg.expand(); } catch (e) {}
}).catch(() => {});
renderLangSwitcher('lang-box');
applyI18n();
renderPrivacy();
renderPunchBtn();
registerSW();
setupInstall();
tickClock();
restoreSession();

// 语言切换后刷新动态文案
document.addEventListener('langchange', () => {
  renderPrivacy(); renderPunchBtn(); renderTzChips(currentEmp);
  renderCameraHint(); tickClock(); renderEnrollUI();
  if (!_regViewHidden()) renderRegSelects();
  const lt = $('liveText');
  if (lt) { const live = $('liveState'); lt.textContent = (live && live.classList.contains('loading')) ? tr('loading') : tr('model_ready'); }
});
function _regViewHidden() { const v = $('regView'); return !v || v.classList.contains('hidden'); }
