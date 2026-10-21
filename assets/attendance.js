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
  if (b.dataset.t === 'rule') loadRules();
  if (b.dataset.t === 'hol') loadHol();
  if (b.dataset.t === 'rec') loadRec();
  if (b.dataset.t === 'gf') loadGeofence();
  if (b.dataset.t === 'dt') loadDingtalk();
});

/* ---------- 员工 ---------- */
async function loadEmployees() {
  const r = await api('/api/att/employees');
  if (!r.ok) return;
  $('empBody').innerHTML = r.body.employees.map((e) => `<tr>
    <td>${e.name}</td><td>${e.dept || '-'}</td><td>${e.emp_no || '-'}</td>
    <td>${e.face_descriptor ? '<span class="pill g">已建底库</span>' : '<span class="pill r">未录入</span>'}</td>
    <td>
      ${e.face_descriptor ? '' : `<button class="btn s" onclick="openEnroll('${e.id}','${e.name}')">录入人脸</button>`}
      <button class="btn s danger" onclick="delEmp('${e.id}')">删</button>
    </td></tr>`).join('');
}
async function addEmp() {
  const gfVal = $('e_gf').value || '';
  const geofence = gfVal ? { mode: 'region', region: { country: gfVal, level: 'country' } } : null;
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
function openEnroll(id, name) {
  enrollId = id; enrollDescriptor = null; enrollPreview = null;
  $('enrollName').textContent = '员工：' + name;
  $('enrollImg').src = ''; $('enrollFile').value = '';
  $('enrollBtn').disabled = true;
  $('enrollRetry').style.display = 'none';
  $('enrollStatus').textContent = '请上传员工证件照（正面清晰人脸）';
  $('enrollModal').style.display = 'flex';
  // 打开弹窗就开始预热模型（7.7MB），等用户选完照片时往往已经下好
  ensureModels().catch(() => {});
}
function closeModal() { $('enrollModal').style.display = 'none'; }
async function ensureModels(silent) {
  if (MODELS_OK) return true;
  if (window.__fmLoading) return window.__fmLoading;      // 登录预热与点录入同时触发时复用同一次加载
  const setText = (t) => { if (!silent) $('enrollStatus').textContent = t; };
  setText('加载人脸模型…');
  if (!silent) $('enrollRetry').style.display = 'none';
  window.__fmLoading = (async () => {
    try {
      await window.FaceModels.load({
        tinyLandmark: false,           // 后台录入用标准关键点，精度更高
        onProgress: (i, n, label) => {
          setText(i === n
            ? '加载人脸模型 ' + i + '/' + n + '（' + label + '，约 6MB，首次稍慢）…'
            : '加载人脸模型 ' + i + '/' + n + '（' + label + '）…');
        },
      });
      MODELS_OK = true;
      setText('模型已就绪，正在提取人脸特征…');
      return true;
    } catch (e) {
      if (!silent) {
        $('enrollStatus').textContent = '模型加载失败：' + (e && e.message ? e.message : '网络异常') + '（可点「重新加载模型」重试）';
        $('enrollRetry').style.display = '';
      }
      return false;
    } finally { window.__fmLoading = null; }
  })();
  return window.__fmLoading;
}
async function retryModels() {
  window.FaceModels.reset();
  if (await ensureModels()) {
    if (enrollPreview) extractEnroll();
    else $('enrollStatus').textContent = '模型已就绪，请上传员工证件照';
  }
}
function previewEnroll() {
  const f = $('enrollFile').files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = async () => { $('enrollImg').src = rd.result; enrollPreview = rd.result; extractEnroll(); };
  rd.readAsDataURL(f);
}
async function extractEnroll() {
  if (!enrollPreview) return;
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
  if (!enrollDescriptor || !enrollId) return;
  const btn = $('enrollBtn');
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
  $('r_country').onchange = () => { const c = COUNTRIES[$('r_country').value]; if (c) { $('r_tz').value = c.tz; $('r_lat').value = c.lat; $('r_lng').value = c.lng; } };
  // 员工表单：国家 + 打卡范围（用更全的 geo/countries，含中文名）
  try {
    const g = await api('/api/att/geo/countries');
    const items = (g.ok ? g.body.countries : []).filter((c) => c.iso !== 'CN');
    const list = '<option value="CN">中国 CN</option>' + items.map((c) => `<option value="${c.iso}">${c.zh} ${c.name} (${c.iso})</option>`).join('');
    if ($('e_country')) $('e_country').innerHTML = list;
    // 工号只读：提示当前国家会自动分配的编号规则
    if ($('e_country') && $('e_no')) {
      const sync = () => {
        const iso = $('e_country').value || 'CN';
        $('e_no').placeholder = '自动生成：' + iso + '0001 起';
      };
      $('e_country').addEventListener('change', sync);
      sync();
    }
    if ($('e_gf')) $('e_gf').innerHTML = '<option value="">跟随默认</option>' + list;
  } catch (_) {}
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
    return `<tr><td>${x.emp_name}</td><td>${x.type === 'check_in' ? '上班' : '下班'}</td><td>${x.ts_local}</td>
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

/* ---------- 打卡范围（默认行政区 / 圆形 / 不限） ---------- */
let GF_COUNTRIES = [];
async function loadGeofence() {
  const r = await api('/api/att/geofence');
  const gf = (r.ok && r.body.geofence) || { mode: 'off' };
  const mode = gf.mode || 'off';
  [...$('gfSeg').children].forEach((b) => b.classList.toggle('on', b.dataset.m === mode));
  ['off', 'region', 'circle'].forEach((m) => $('gfPanel-' + m).classList.toggle('show', m === mode));
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
  if (gf.mode === 'circle' && gf.circle) {
    $('gf_lat').value = gf.circle.lat; $('gf_lng').value = gf.circle.lng; $('gf_radius').value = gf.circle.radius;
  }
  $('gfMsg').textContent = '';
}
function geofenceText(gf) {
  if (!gf || gf.mode === 'off') return '不限（任意地点）';
  if (gf.mode === 'circle' && gf.circle) return `自定义圆形：${gf.circle.lat},${gf.circle.lng} 半径${gf.circle.radius}m`;
  if (gf.mode === 'region' && gf.region) { const n = gf.region.name || (gf.sel && (gf.sel.name || gf.sel.country)) || '已设行政区'; return `行政区范围：${n}（来源 ${gf.region.source || '?'}）`; }
  return '已设置';
}
$('gfSeg') && $('gfSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const m = b.dataset.m;
  [...$('gfSeg').children].forEach((x) => x.classList.toggle('on', x === b));
  ['off', 'region', 'circle'].forEach((mm) => $('gfPanel-' + mm).classList.toggle('show', mm === m));
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
    body.lat = +$('gf_lat').value; body.lng = +$('gf_lng').value; body.radius = +$('gf_radius').value;
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
  if (er.ok) $('rec_emp').innerHTML = '<option value="">全部</option>' + er.body.employees.map((e) => `<option value="${e.id}">${e.name}</option>`).join('');
  const today = new Date().toISOString().slice(0, 10);
  $('rec_from').value = today; $('rec_to').value = today;
}
boot();
