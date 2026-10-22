'use strict';
/* 人脸考勤管理后台 */
// API 地址解析：?api= 参数 > att-config.js 的 window.ATT_API_BASE > 本地记忆 > 同源（与员工打卡页同规则）
(function () {
  const q = new URLSearchParams(location.search).get('api');
  if (q) { window.ATT_API_BASE = q.replace(/\/+$/, ''); localStorage.setItem('att_api_base', window.ATT_API_BASE); }
  else if (!window.ATT_API_BASE) { window.ATT_API_BASE = localStorage.getItem('att_api_base') || ''; }
  window.ATT_API_BASE = (window.ATT_API_BASE || '').replace(/\/+$/, '');
})();
const API = window.ATT_API_BASE || '';
// 每次请求动态读 token：登录后立即生效（跨域部署无 cookie，全靠 Bearer）
const auth = () => { const t = localStorage.getItem('att_token') || ''; return t ? { Authorization: 'Bearer ' + t } : {}; };
let COUNTRIES = {};
let MODELS_OK = false;

const $ = (id) => document.getElementById(id);
function toast(t) { const e = $('toast'); e.textContent = t; e.style.display = 'block'; setTimeout(() => (e.style.display = 'none'), 2200); }
async function api(path, opts = {}) {
  let r, body;
  try {
    r = await fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', ...auth(), ...(opts.headers || {}) } });
    body = await r.json().catch(() => ({}));
  } catch (e) {
    // 网络中断 / 请求体过大被掐断：必须给出反馈，而不是静默无反应
    $('banner').style.display = 'block';
    return { ok: false, status: 0, body: { error: '网络请求失败（' + (e && e.message ? e.message : 'unknown') + '），请重试' } };
  }
  if (r.status === 401) { $('banner').style.display = 'block'; }
  return { ok: r.ok && body.ok, status: r.status, body };
}

/* ---------- 鉴权 ---------- */
async function mockLogin() {
  const pin = ($('adminPin') && $('adminPin').value.trim()) || '';
  const r = await api('/api/auth/mock-login', { method: 'POST', body: JSON.stringify({ staffId: 'stf_01', pin }) });
  if (r.body.ok) { localStorage.setItem('att_token', r.body.token); $('banner').style.display = 'none'; toast('已登录'); boot(); ensureModels(true).catch(() => {}); }
  else toast(r.body.code === 'bad_admin_pin' ? '管理密码错误' : '登录失败');
}

/* ---------- Tabs ---------- */
$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  [...$('tabs').children].forEach((x) => x.classList.toggle('on', x === b));
  ['emp', 'rule', 'hol', 'rec', 'gf', 'dt'].forEach((t) => ($('sec-' + t).style.display = t === b.dataset.t ? '' : 'none'));
  if (b.dataset.t === 'rule') { loadRules(); loadSeason(); }
  if (b.dataset.t === 'hol') loadHol();
  if (b.dataset.t === 'rec') loadRec();
  if (b.dataset.t === 'gf') { gfTouched = false; loadGeofence(); }
  if (b.dataset.t === 'dt') loadDingtalk();
});

/* ---------- 员工 ---------- */
// 列表接口只回 has_face（不传 128 维特征，省流量）；兼容旧字段 face_descriptor
const faceReady = (e) => !!(e && (e.has_face || e.face_descriptor));
async function loadEmployees() {
  const r = await api('/api/att/employees');
  if (!r.ok) return;
  $('empBody').innerHTML = r.body.employees.map((e) => `<tr>
    <td>${e.name}</td><td>${e.dept || '-'}</td><td>${e.emp_no || '-'}</td>
    <td>${faceReady(e) ? '<span class="pill g">已建底库</span>' : '<span class="pill r">未录入</span>'}</td>
    <td>
      ${faceReady(e) ? '' : `<button class="btn s" onclick="openEnroll('${e.id}','${e.name}')">录入人脸</button>`}
      <button class="btn s danger" onclick="delEmp('${e.id}')">删</button>
    </td></tr>`).join('');
}
let EMP_CIRCLE = null;   // 员工自定义圆形范围（地图选点结果）
function defaultPickCenter() {
  const k = ($('r_country') && $('r_country').value) || 'CN';
  const c = COUNTRIES[k] || { lat: 31.2304, lng: 121.4737 };
  return { lat: +c.lat || 31.2304, lng: +c.lng || 121.4737, radius: 300 };
}
function rangeText(v) {
  return '圆心 ' + (+v.lat).toFixed(5) + ', ' + (+v.lng).toFixed(5) + ' · 半径 ' + (window.MapPick ? MapPick.fmtMeters(v.radius) : v.radius + ' 米');
}
function empGfModeChange() {
  const m = $('e_gf_mode').value;
  $('e_gf_pickWrap').style.display = m === 'circle' ? 'block' : 'none';
  if (m === 'circle' && EMP_CIRCLE) $('e_gf_text').textContent = rangeText(EMP_CIRCLE);
  if (m !== 'circle') $('e_gf_text').textContent = '';
}
function pickEmpRange() {
  const d = EMP_CIRCLE || defaultPickCenter();
  MapPick.openModal({
    lat: d.lat, lng: d.lng, radius: d.radius || 300,
    title: '选择该员工的打卡范围',
    onOk: (v) => {
      EMP_CIRCLE = { lat: v.lat, lng: v.lng, radius: v.radius };
      $('e_gf_text').textContent = rangeText(v);
      toast('已选取：' + MapPick.fmtMeters(v.radius));
    },
  });
}
async function addEmp() {
  const mode = $('e_gf_mode').value;
  let geofence = null;
  if (mode === 'off') geofence = { mode: 'off' };
  else if (mode === 'circle') {
    if (!EMP_CIRCLE) { toast('请先点「📍 地图选范围」确定打卡距离圈'); return; }
    geofence = { mode: 'circle', circle: EMP_CIRCLE };
  }
  const r = await api('/api/att/employees', { method: 'POST', body: JSON.stringify({
    name: $('e_name').value, dept: $('e_dept').value,
    pin: $('e_pin').value, country: $('e_country').value || 'CN', timezone: $('e_tz').value || 'Asia/Shanghai',
    work_start: $('e_ws').value || '09:00', work_end: $('e_we').value || '18:00',
    dingtalk_id: $('e_dd') ? $('e_dd').value : '',
    geofence,
  }) });
  if (r.ok) {
    const no = r.body.employee && r.body.employee.emp_no;
    $('e_name').value = $('e_dept').value = $('e_pin').value = '';
    if ($('e_dd')) $('e_dd').value = '';
    loadEmployees();
    toast(no ? '已添加，工号 ' + no : '已添加');
  }
  else toast('添加失败：' + (r.body.error || ''));
}
async function delEmp(id) { await api('/api/att/employees/' + id, { method: 'DELETE' }); loadEmployees(); }

/* ---------- 人脸录入（证件照 → 本地提取特征） ---------- */
let enrollId = '', enrollDescriptor = null, enrollPreview = null;
/* 模型加载进度：登录预热时后台也在跑，用户中途打开弹窗要能立刻看到「正在下载 2/3」，
 * 而不是停在「请上传证件照」的旧文案上（那样点按钮就像没反应）。 */
let fmProg = '';
function fmSay(t) {
  fmProg = t;
  const m = $('enrollModal');
  if (m && m.style.display === 'flex') $('enrollStatus').textContent = t;
}
function openEnroll(id, name) {
  enrollId = id; enrollDescriptor = null; enrollPreview = null;
  $('enrollName').textContent = '员工：' + name;
  $('enrollImg').src = ''; $('enrollFile').value = '';
  $('enrollBtn').disabled = true;
  $('enrollRetry').style.display = 'none';
  $('enrollStatus').textContent = MODELS_OK ? '请上传员工证件照（正面清晰人脸）' : (fmProg || '正在加载人脸模型…');
  $('enrollModal').style.display = 'flex';
  // 打开弹窗就开始预热模型（7.7MB），等用户选完照片时往往已经下好
  ensureModels().catch(() => {});
}
function closeModal() { $('enrollModal').style.display = 'none'; }
async function ensureModels(silent) {
  if (MODELS_OK) return true;
  if (window.__fmLoading) { fmSay(fmProg || '正在加载人脸模型…'); return window.__fmLoading; } // 登录预热与点录入同时触发时复用同一次加载
  fmSay(fmProg || '正在加载人脸模型…');
  if (!silent) $('enrollRetry').style.display = 'none';
  window.__fmLoading = (async () => {
    try {
      await window.FaceModels.load({
        tinyLandmark: false,           // 后台录入用标准关键点，精度更高
        onProgress: (i, n, label) => {
          fmSay('加载人脸模型 ' + i + '/' + n + '（' + label + (i === n ? '，约 6MB，首次稍慢' : '') + '）…');
        },
      });
      MODELS_OK = true;
      fmSay('模型已就绪，正在提取人脸特征…');
      return true;
    } catch (e) {
      fmSay('模型加载失败：' + (e && e.message ? e.message : '网络异常') + '（可点「重新加载模型」重试）');
      if (!silent) $('enrollRetry').style.display = '';
      return false;
    } finally { window.__fmLoading = null; }
  })();
  return window.__fmLoading;
}
async function retryModels() {
  window.FaceModels.reset();
  if (await ensureModels()) {
    if (enrollPreview) extractEnroll();
    else fmSay('模型已就绪，请上传员工证件照');
  }
}
function previewEnroll() {
  const f = $('enrollFile').files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = async () => {
    $('enrollImg').src = rd.result; enrollPreview = rd.result;
    $('enrollBtn').disabled = false;   // 立刻可点：点了就先识别再保存，避免灰按钮像"死机"
    extractEnroll();
  };
  rd.readAsDataURL(f);
}
async function extractEnroll() {
  if (!enrollPreview) { toast('请先选择员工照片'); return; }
  fmSay('正在准备人脸识别…');
  if (!(await ensureModels())) return;
  $('enrollStatus').textContent = '正在提取人脸特征…';
  try { await $('enrollImg').decode(); } catch (e) {}
  try {
    const det = await faceapi.detectSingleFace($('enrollImg'), new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    if (!det) { $('enrollStatus').textContent = '未检测到人脸，请换一张清晰证件照'; return; }
    enrollDescriptor = Array.from(det.descriptor);
    $('enrollStatus').textContent = '✅ 已提取 128 维特征，可保存';
    $('enrollBtn').disabled = false;
  } catch (e) { $('enrollStatus').textContent = '提取失败：' + e.message; }
}
/* 照片压缩：手机原图动辄 4~8MB，base64 后超出后端请求体上限会被掐断（表现为「点保存没反应」）。
 * 特征已在本地提取完毕，压缩不影响识别精度。 */
function shrinkPhoto(dataUrl, maxEdge = 720, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      try { resolve(c.toDataURL('image/jpeg', quality)); } catch (e) { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
async function doEnroll() {
  if (!enrollId) return;
  const btn = $('enrollBtn');
  // 照片刚选好还没提完特征就点按钮：先识别再保存，不能默默 return
  if (!enrollDescriptor) {
    if (!enrollPreview) { toast('请先选择员工照片'); $('enrollStatus').textContent = '请上传员工证件照（正面清晰人脸）'; return; }
    toast('正在识别人脸，稍候会自动保存…');
    await extractEnroll();
    if (!enrollDescriptor) { toast('人脸识别未完成，请按提示重试'); return; }
  }
  btn.disabled = true;
  $('enrollStatus').textContent = '正在保存人脸底库…';
  try {
    const photo = await shrinkPhoto($('enrollImg').src);
    const r = await api('/api/att/employees/' + enrollId + '/enroll', { method: 'POST', body: JSON.stringify({ photo, descriptor: enrollDescriptor }) });
    if (r.ok) { toast('人脸底库已建立'); closeModal(); loadEmployees(); }
    else { toast('录入失败：' + (r.body.error || '')); $('enrollStatus').textContent = '保存失败：' + (r.body.error || '') + '，可重试'; btn.disabled = false; }
  } catch (e) {
    toast('保存异常：' + (e && e.message ? e.message : 'unknown'));
    $('enrollStatus').textContent = '保存异常，请重试';
    btn.disabled = false;
  }
}

/* ---------- 规则 ---------- */
async function fillCountries() {
  const r = await api('/api/att/rules');
  COUNTRIES = r.ok ? r.body.countries : {};
  const opts = Object.entries(COUNTRIES).map(([k, v]) => `<option value="${k}">${v.name} (${k}) · ${v.tz}</option>`).join('');
  $('r_country').innerHTML = opts;
  $('h_country').innerHTML = opts;
  $('h_filter').innerHTML = '<option value="">全部</option>' + opts;
  // 时区一律用下拉选择（按大洲分组，带实时 UTC 偏移），不再手填 IANA 字符串
  $('r_tz').innerHTML = window.tzOptionsHTML('Asia/Shanghai');
  $('e_tz').innerHTML = window.tzOptionsHTML('Asia/Shanghai');
  $('r_country').onchange = () => {
    const k = $('r_country').value, c = COUNTRIES[k];
    if (!c) return;
    const tz = (window.TZ_BY_COUNTRY || {})[k] || c.tz;
    if (tz) $('r_tz').value = tz;
    if (c.lat != null) { $('r_lat').value = c.lat; $('r_lng').value = c.lng; }
    rGeoText();
  };
  // 员工表单：国家 + 打卡范围（用更全的 geo/countries，含中文名）
  try {
    const g = await api('/api/att/geo/countries');
    const items = (g.ok ? g.body.countries : []).filter((c) => c.iso !== 'CN');
    const list = '<option value="CN">中国 CN</option>' + items.map((c) => `<option value="${c.iso}">${c.zh} ${c.name} (${c.iso})</option>`).join('');
    if ($('e_country')) $('e_country').innerHTML = list;
    if ($('e_country')) {
      const sync = () => {
        const iso = $('e_country').value || 'CN';
        // 工号只读：提示当前国家会自动分配的编号规则
        if ($('e_no')) $('e_no').placeholder = '自动生成：' + iso + '0001 起';
        // 国家决定默认时区（仍可手动改成同一国家的其它时区）
        const tz = (window.TZ_BY_COUNTRY || {})[iso];
        if (tz && $('e_tz')) $('e_tz').value = tz;
      };
      $('e_country').addEventListener('change', sync);
      sync();
    }
  } catch (_) {}
  rGeoText();
}
async function loadRules() {
  const r = await api('/api/att/rules'); if (!r.ok) return;
  $('ruleBody').innerHTML = r.body.rules.map((x) => `<tr>
    <td>${x.name}</td><td>${x.country}</td><td>${x.timezone}</td>
    <td>${x.center_lat},${x.center_lng}</td><td>${x.radius_m}m</td>
    <td>${x.check_in_time}-${x.check_out_time}</td>
    <td><button class="btn s danger" onclick="delRule('${x.id}')">删</button></td></tr>`).join('');
}
async function addRule() {
  const r = await api('/api/att/rules', { method: 'POST', body: JSON.stringify({
    name: $('r_name').value, country: $('r_country').value, timezone: $('r_tz').value,
    center_lat: +$('r_lat').value, center_lng: +$('r_lng').value, radius_m: +$('r_radius').value,
    workdays: $('r_wd').value, check_in_time: $('r_ci').value, check_out_time: $('r_co').value, late_grace_min: +$('r_grace').value,
  }) });
  if (r.ok) { toast('规则已保存'); loadRules(); } else toast('保存失败：' + (r.body.error || ''));
}
async function delRule(id) { await api('/api/att/rules/' + id, { method: 'DELETE' }); loadRules(); }
function rGeoText() {
  if (!$('r_geoText')) return;
  const lat = +$('r_lat').value, lng = +$('r_lng').value;
  const rad = +$('r_radius').value || 300;
  $('r_geoText').textContent = (isFinite(lat) && isFinite(lng))
    ? rangeText({ lat, lng, radius: rad })
    : '未选择（点左侧按钮在地图上点选）';
}
function pickRuleRange() {
  MapPick.openModal({
    lat: +$('r_lat').value || 31.2304,
    lng: +$('r_lng').value || 121.4737,
    radius: +$('r_radius').value || 300,
    title: '选择该规则的打卡范围',
    onOk: (v) => {
      $('r_lat').value = v.lat; $('r_lng').value = v.lng; $('r_radius').value = v.radius;
      rGeoText(); toast('已选取：' + MapPick.fmtMeters(v.radius));
    },
  });
}
$('r_radius') && $('r_radius').addEventListener('input', rGeoText);

/* ---------- 冬令时 / 夏令时 ---------- */
async function loadSeason() {
  const r = await api('/api/att/season'); if (!r.ok || !$('s_from')) return;
  const c = r.body.config || {}, t = r.body.today || {};
  $('s_enabled').value = c.enabled === false ? '0' : '1';
  $('s_from').value = c.winterFrom || '10-01';
  $('s_to').value = c.winterTo || '03-31';
  $('s_wend').value = c.winterEnd || '17:30';
  $('s_send').value = c.summerEnd || '18:00';
  $('seasonNow').textContent = c.enabled === false
    ? ' 当前：季节规则已关闭，下班时间按规则/员工设定'
    : ' 当前生效：' + (t.season === 'winter' ? '冬令时' : '夏令时') + '，今天下班时间 ' + (t.work_end || '') + '（' + (t.date || '') + '）';
}
async function saveSeason() {
  const r = await api('/api/att/season', { method: 'POST', body: JSON.stringify({
    enabled: $('s_enabled').value === '1',
    winterFrom: $('s_from').value.trim(), winterTo: $('s_to').value.trim(),
    winterEnd: $('s_wend').value, summerEnd: $('s_send').value,
  }) });
  if (r.ok) { toast('季节规则已保存'); loadSeason(); loadRules(); } else toast('保存失败：' + (r.body.error || ''));
}

/* ---------- 节假日 ---------- */
async function loadHol() {
  const c = $('h_filter').value;
  const r = await api('/api/att/holidays' + (c ? '?country=' + c : '')); if (!r.ok) return;
  $('holBody').innerHTML = r.body.holidays.map((h) => `<tr>
    <td>${h.country}</td><td>${h.date}</td><td>${h.name}</td>
    <td>${h.type === 'makeup' ? '<span class="pill y">调休补班</span>' : '<span class="pill g">法定假</span>'}</td>
    <td><button class="btn s danger" onclick="delHol('${h.id}')">删</button></td></tr>`).join('');
}
async function addHol() {
  const r = await api('/api/att/holidays', { method: 'POST', body: JSON.stringify({
    country: $('h_country').value, date: $('h_date').value, name: $('h_name').value, type: $('h_type').value,
  }) });
  if (r.ok) { $('h_name').value = ''; loadHol(); toast('已添加'); } else toast('添加失败');
}
async function delHol(id) { await api('/api/att/holidays/' + id, { method: 'DELETE' }); loadHol(); }

/* ---------- 记录 ---------- */
async function loadRec() {
  const p = new URLSearchParams();
  if ($('rec_emp').value) p.set('empId', $('rec_emp').value);
  if ($('rec_from').value) p.set('from', $('rec_from').value);
  if ($('rec_to').value) p.set('to', $('rec_to').value);
  const r = await api('/api/att/records?' + p.toString()); if (!r.ok) return;
  $('recBody').innerHTML = r.body.records.map((x) => {
    const hol = (x.holiday_local || x.holiday_cn) ? `<span class="pill y">${x.holiday_local_name || ''}${x.holiday_cn_name || ''}</span>` : '-';
    const ts = { normal: '正常', late: '迟到', early_out: '早退', normal_out: '正常下班' }[x.time_status] || x.time_status;
    const bj = (x.ts_utc || '').slice(11, 16);
    const timeCell = `${x.ts_local}${bj ? `<br><span style="font-size:11px;color:#8a93a8">北京 ${bj}</span>` : ''}`;
    return `<tr><td>${x.emp_name}${x.emp_no ? `<br><span style="font-size:11px;color:#8a93a8">${x.emp_no}</span>` : ''}</td><td>${x.type === 'check_in' ? '上班' : '下班'}</td><td>${timeCell}</td>
      <td>${x.distance_m}m</td><td>${x.in_range ? '<span class="pill g">内</span>' : '<span class="pill r">越界</span>'}</td>
      <td>${x.face_match ? '<span class="pill g">通过</span>' : '<span class="pill r">失败</span>'}</td>
      <td>${ts}</td><td>${hol}</td><td>${geoCell(x)}</td></tr>`;
  }).join('') || '<tr><td colspan="9" class="muted">暂无记录</td></tr>';
}
function geoCell(x) {
  if (x.lat == null || x.lng == null) return '—';
  return `<span class="geo-btn" onclick="reverseGeocode('${x.lat}','${x.lng}',this)">📍 解析</span><br><span style="font-size:11px;color:#8a93a8">${x.lat},${x.lng}</span>`;
}
async function reverseGeocode(lat, lng, el) {
  el.textContent = '解析中…'; el.classList.remove('geo-btn');
  const r = await api('/api/att/geo/reverse?lat=' + lat + '&lng=' + lng);
  el.textContent = (r.ok && r.body.addr) ? r.body.addr : '未解析';
}
async function exportCsv() {
  const p = new URLSearchParams();
  if ($('rec_emp').value) p.set('empId', $('rec_emp').value);
  if ($('rec_from').value) p.set('from', $('rec_from').value);
  if ($('rec_to').value) p.set('to', $('rec_to').value);
  const month = ($('rec_from').value ? $('rec_from').value.slice(0, 7) : new Date().toISOString().slice(0, 7));
  const url = API + '/api/att/stats?export=csv&month=' + month + '&' + p.toString();
  const r = await fetch(url, { headers: auth() });
  if (!r.ok) { toast('导出失败'); return; }
  const blob = await r.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'attendance_' + month + '.csv'; a.click();
  URL.revokeObjectURL(a.href);
  toast('已导出 CSV');
}
async function pushDingtalk() {
  const r = await api('/api/att/push-dingtalk', { method: 'POST', body: '{}' });
  toast(r.body.push && r.body.push.ok ? '已推送到钉钉群' : '推送：' + ((r.body.push && r.body.push.error) || '失败'));
}

/* ---------- 打卡范围（不限 / 地图圆形 / 行政区） ---------- */
let GF_COUNTRIES = [];
let GF_MAP = null;        // Leaflet 实例
let gfBusy = false;       // 防止「地图 → 输入框 → 地图」互相触发的死循环
let gfTouched = false;    // 用户已手动选过模式：loadGeofence 的慢回包不得覆盖（异步竞态防呆）

function gfPaint(v) {
  if (!v) return;
  $('gf_lat').value = v.lat; $('gf_lng').value = v.lng;
  if (!gfBusy) {
    gfBusy = true;
    $('gf_radius').value = v.radius;
    $('gf_radius_range').value = Math.min(3000, v.radius);
    gfBusy = false;
  }
  $('gfCoord').innerHTML = '圆心 <b>' + (+v.lat).toFixed(6) + ', ' + (+v.lng).toFixed(6) +
    '</b>　半径 <b>' + (window.MapPick ? MapPick.fmtMeters(v.radius) : v.radius + ' 米') + '</b>';
}

function ensureGfMap(initial) {
  if (typeof L === 'undefined') return null;
  if (GF_MAP) return GF_MAP;
  const d = initial || defaultPickCenter();
  GF_MAP = MapPick.create($('gfMap'), {
    lat: d.lat, lng: d.lng, radius: d.radius || 300,
    onChange: gfPaint,
  });
  if (GF_MAP) gfPaint(GF_MAP.getValue());
  return GF_MAP;
}

function gfLocate() {
  if (!GF_MAP) return;
  if (!navigator.geolocation) { toast('当前浏览器不支持定位'); return; }
  toast('正在定位…');
  navigator.geolocation.getCurrentPosition(
    (p) => { GF_MAP.setPoint(p.coords.latitude, p.coords.longitude, true); toast('已定位到当前位置，可拖动微调'); },
    (e) => toast('定位失败：' + (e && e.code === 1 ? '未授权位置权限' : '无法获取位置') + '，可手动点选'),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
  );
}

async function loadGeofence() {
  const r = await api('/api/att/geofence');
  const gf = (r.ok && r.body.geofence) || { mode: 'off' };
  const mode = gf.mode || 'off';
  // 只有「刚进 tab、用户还没点过」才同步服务端模式；否则会把用户刚选的模式重置掉
  if (!gfTouched) {
    [...$('gfSeg').children].forEach((b) => b.classList.toggle('on', b.dataset.m === mode));
    ['off', 'region', 'circle'].forEach((m) => $('gfPanel-' + m).classList.toggle('show', m === mode));
  }
  $('gfCurrent').textContent = geofenceText(gf);

  const c = await api('/api/att/geo/countries');
  GF_COUNTRIES = c.ok ? c.body.countries : [];
  const list = GF_COUNTRIES.map((x) => `<option value="${x.iso}">${x.zh} ${x.name} (${x.iso})</option>`).join('');
  $('gf_country').innerHTML = list;
  if (gf.mode === 'region' && gf.sel) {
    $('gf_country').value = gf.sel.country || '';
    if (gf.sel.level) $('gf_level').value = gf.sel.level;
    if (gf.sel.country === 'CN' && gf.sel.level && gf.sel.level !== 'country') {
      await gfLoadRegions('100000');
      if (gf.sel.adcode) $('gf_region').value = String(gf.sel.adcode);
    }
  }

  // 圆形模式：地图呈现，圆心/半径直接落在图上
  const start = (gf.mode === 'circle' && gf.circle)
    ? { lat: +gf.circle.lat, lng: +gf.circle.lng, radius: +gf.circle.radius }
    : defaultPickCenter();
  ensureGfMap(start);
  if (GF_MAP) {
    GF_MAP.setPoint(start.lat, start.lng, false);
    GF_MAP.setRadius(start.radius || 300);
    gfPaint(GF_MAP.getValue());
    setTimeout(() => { GF_MAP.invalidate(); if (mode === 'circle') GF_MAP.fit(); }, 60);
  }
  if (gf.mode === 'circle' && gf.circle) {
    $('gf_radius').value = gf.circle.radius;
    $('gf_radius_range').value = Math.min(3000, gf.circle.radius);
  }
  $('gfMsg').textContent = '';
}
function geofenceText(gf) {
  if (!gf || gf.mode === 'off') return '不限（任意地点）';
  if (gf.mode === 'circle' && gf.circle) return `地图圆形：${gf.circle.lat},${gf.circle.lng} 半径${gf.circle.radius}m`;
  if (gf.mode === 'region' && gf.region) { const n = gf.region.name || (gf.sel && (gf.sel.name || gf.sel.country)) || '已设行政区'; return `行政区范围：${n}（来源 ${gf.region.source || '?'}）`; }
  return '已设置';
}
$('gfSeg') && $('gfSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  gfTouched = true;
  const m = b.dataset.m;
  [...$('gfSeg').children].forEach((x) => x.classList.toggle('on', x === b));
  ['off', 'region', 'circle'].forEach((mm) => $('gfPanel-' + mm).classList.toggle('show', mm === m));
  if (m === 'circle') {
    ensureGfMap();
    setTimeout(() => { if (GF_MAP) { GF_MAP.invalidate(); GF_MAP.fit(); } }, 80);
  }
});
// 底图切换 + 半径滑杆/数字框同步
document.addEventListener('click', (e) => {
  const b = e.target.closest('.mp-chip[data-gfbm]'); if (!b || !GF_MAP) return;
  document.querySelectorAll('.mp-chip[data-gfbm]').forEach((x) => x.classList.toggle('on', x === b));
  GF_MAP.setBasemap(b.dataset.gfbm);
});
['gf_radius', 'gf_radius_range'].forEach((id) => {
  const el = $(id);
  if (!el) return;
  el.addEventListener('input', () => {
    if (gfBusy || !GF_MAP) return;
    GF_MAP.setRadius(+el.value);
  });
});
async function gfLevelChange() {
  const country = $('gf_country').value;
  const level = $('gf_level').value;
  if (country === 'CN' && level !== 'country') { await gfLoadRegions('100000'); $('gfRegionWrap').style.display = 'block'; }
  else { $('gfRegionWrap').style.display = 'none'; $('gf_region').innerHTML = ''; }
}
async function gfLoadRegions(parent) {
  const r = await api('/api/att/geo/sub?country=CN&parent=' + parent);
  if (!r.ok) return;
  $('gf_region').innerHTML = r.body.regions.map((x) => `<option value="${x.code}">${x.name}</option>`).join('');
  $('gfRegionWrap').style.display = 'block';
}
async function applyGeofence() {
  const mode = [...$('gfSeg').children].find((b) => b.classList.contains('on')).dataset.m;
  const body = { mode };
  if (mode === 'region') {
    const country = $('gf_country').value;
    const level = $('gf_level').value;
    const region = { country, level };
    if (country === 'CN' && level !== 'country') {
      const adcode = $('gf_region').value;
      if (!adcode) { $('gfMsg').textContent = '请选择具体地区'; return; }
      region.adcode = adcode;
    }
    body.region = region;
  } else if (mode === 'circle') {
    if (!GF_MAP) { $('gfMsg').textContent = '地图未加载，请刷新后重试'; return; }
    const v = GF_MAP.getValue();
    if (!isFinite(v.lat) || !isFinite(v.lng)) { $('gfMsg').textContent = '请在地图上点选圆心'; return; }
    body.lat = v.lat; body.lng = v.lng; body.radius = v.radius;
  }
  const r = await api('/api/att/geofence', { method: 'POST', body: JSON.stringify(body) });
  if (r.ok) { $('gfMsg').textContent = '✅ 已更新'; $('gfCurrent').textContent = geofenceText(r.body.geofence); toast('打卡范围已更新'); }
  else $('gfMsg').textContent = '❌ ' + (r.body.error || '失败');
}

/* ---------- 钉钉 ---------- */
async function loadDingtalk() {
  const r = await api('/api/att/dingtalk'); if (!r.ok) return;
  const c = r.body.config;
  $('dt_wh').value = c.robotWebhook || ''; $('dt_sec').value = '';
  $('dt_status').textContent = c.hasRobot ? '✅ 已配置机器人，可推送考勤日报' : '⚠️ 未配置机器人（体验模式，推送不实际发送）';
}
async function saveDingtalk() {
  const r = await api('/api/att/dingtalk', { method: 'POST', body: JSON.stringify({ robotWebhook: $('dt_wh').value, robotSecret: $('dt_sec').value }) });
  if (r.ok) { toast('已保存'); loadDingtalk(); } else toast('保存失败');
}

/* ---------- 启动 ---------- */
async function boot() {
  renderLangSwitcher('lang-box');
  applyI18n();
  await fillCountries();
  await loadEmployees();
  // 记录页员工下拉
  const er = await api('/api/att/employees');
  if (er.ok) $('rec_emp').innerHTML = '<option value="">全部（所有人）</option>' + er.body.employees.map((e) => `<option value="${e.id}">${e.name}（${e.emp_no || '无工号'}）</option>`).join('');
  // 默认看最近 7 天（toISOString 是 UTC，早上 8 点前会差一天，这里用浏览器本地日期）
  const pad = (n) => String(n).padStart(2, '0');
  const localISO = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const now = new Date();
  $('rec_from').value = localISO(new Date(now.getTime() - 6 * 86400000));
  $('rec_to').value = localISO(now);
}
boot();
