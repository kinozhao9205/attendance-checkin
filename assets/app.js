/* 排期人员管理系统 · 主控台 */
(function () {
  'use strict';
  const { esc, iso, startOfDay } = window.ganttUtil;
  const DAY = 86400000;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const TOKEN = localStorage.getItem('pq_token') || new URLSearchParams(location.search).get('token') || '';
  if (TOKEN) localStorage.setItem('pq_token', TOKEN);

  const S = {
    user: null, board: null, view: 'project', range: 21, dayWidth: 46,
    tab: 'gantt', history: null, conflictFilter: 'all',
  };

  async function api(method, url, body) {
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(url + sep + 'token=' + encodeURIComponent(TOKEN), {
      method, headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await res.json().catch(() => ({ ok: false, error: '响应解析失败' }));
    if (j.ok === false) { const e = new Error(j.error || '请求失败'); Object.assign(e, j); throw e; }
    return j;
  }
  const toast = (msg, type) => {
    const t = document.createElement('div');
    t.className = 'toast ' + (type || ''); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  };
  const fmt = (ts, withTime) => {
    if (!ts) return '—';
    const d = new Date(ts); const p = (n) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()}` + (withTime ? ` ${p(d.getHours())}:${p(d.getMinutes())}` : '');
  };
  const fullFmt = (ts) => ts ? new Date(ts).toLocaleString('zh-CN', { hour12: false }) : '—';
  const STATUS = { onsite: ['驻场', 'ok'], onroad: ['在途', 'info'], leave: ['休假', 'warn'], planning: ['待排', 'mute'], unloading: ['装卸货', 'warn'], idle: ['空闲', 'mute'], standby: ['待命', 'mute'], running: ['行驶中', 'info'], maintenance: ['维修', 'danger'] };

  /* ============ 启动 ============ */
  async function boot() {
    if (!TOKEN) { location.href = '/login.html'; return; }
    try {
      const me = await api('GET', '/api/auth/me');
      S.user = me.user;
      $('#userChip').innerHTML = `<span class="avatar">${esc(S.user.name.slice(0, 1))}</span>
        <span style="font-weight:600">${esc(S.user.name)}</span>
        <span class="tag mute">${esc(S.user.role === 'driver' ? '司机' : S.user.role === 'dispatcher' ? '调度' : '成员')}</span>`;
      $('#btnMobile').onclick = () => { window.open(S.user.role === 'driver' ? '/driver.html' : '/site.html', '_blank'); };
      $('#btnLogout').onclick = async () => { await api('POST', '/api/auth/logout'); localStorage.removeItem('pq_token'); location.href = '/login.html'; };
      await refresh();
      bind();
      $('#loading').remove();
    } catch (e) {
      if (/未登录/.test(e.message)) { localStorage.removeItem('pq_token'); location.href = '/login.html'; return; }
      $('#loading').innerHTML = `<div style="color:#e34d59">加载失败：${esc(e.message)}</div>`;
    }
  }

  async function refresh() {
    S.board = (await api('GET', '/api/board')).board ? (await api('GET', '/api/board')) : null;
    S.board = await api('GET', '/api/board');
    renderKPI(); renderTabs();
    if (S.tab === 'gantt') renderGantt();
  }

  /* ============ 顶部 KPI ============ */
  function renderKPI() {
    const b = S.board;
    const now = Date.now();
    const onroad = b.assignments.filter((a) => a.status === 'onroad' && new Date(a.start_ts) <= now && new Date(a.end_ts) >= now).length;
    const onsite = b.assignments.filter((a) => a.status === 'onsite' && new Date(a.start_ts) <= now && new Date(a.end_ts) >= now).length;
    const blocks = b.conflicts.filter((c) => c.level === 'block').length;
    const locked = b.trailers.filter((t) => t.status === 'unloading' || t.status === 'maintenance').length;
    const pending = b.shipments.filter((s) => s.status !== 'signed').length;
    $('#kpi').innerHTML = [
      ['进行中项目', b.projects.filter((p) => p.status === 'active').length, ''],
      ['当前驻场', onsite, 'ok'],
      ['当前在途', onroad, ''],
      ['阻断级冲突', blocks, blocks ? 'danger' : 'ok'],
      ['锁定资源', locked, locked ? 'warn' : ''],
      ['待签收出库单', pending, pending ? 'warn' : ''],
    ].map((k) => `<div class="kpi"><div class="k">${k[0]}</div><div class="v ${k[2]}">${k[1]}</div></div>`).join('');
  }

  /* ============ Tab 切换 ============ */
  function bind() {
    $$('.tab').forEach((t) => t.onclick = () => {
      $$('.tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active'); S.tab = t.dataset.tab; renderTabs();
    });
    $('#viewSeg').onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#viewSeg button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active'); S.view = b.dataset.v; renderGantt();
    };
    $('#rangeSeg').onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#rangeSeg button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active'); S.range = +b.dataset.d; renderGantt();
    };
    $('#zoomSeg').onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#zoomSeg button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active'); S.dayWidth = +b.dataset.w; renderGantt();
    };
    $('#btnRefresh').onclick = refresh;
    $('#btnInsert').onclick = openInsert;
    $('#btnSyncCtrip').onclick = async () => {
      try { const r = await api('POST', '/api/ctrip/sync', {}); toast(`携程同步完成：新增 ${r.created}，更新 ${r.updated}，自动排期 ${r.autoScheduled} 条`, 'ok'); await refresh(); }
      catch (e) { toast('同步失败：' + e.message, 'err'); }
    };
  }

  function renderTabs() {
    const b = S.board;
    const blocks = b.conflicts.filter((c) => c.level === 'block').length;
    const badge = $('#tabBadge');
    if (badge) { badge.textContent = b.conflicts.length; badge.className = 'badge' + (blocks ? '' : ' warn'); }
    const tool = $('#toolbar');
    const ganttTool = `
      <div class="seg" id="viewSeg">
        <button data-v="project" class="${S.view === 'project' ? 'active' : ''}">项目视角</button>
        <button data-v="staff" class="${S.view === 'staff' ? 'active' : ''}">人员视角</button>
      </div>
      <div class="seg" id="rangeSeg">
        <button data-d="14" class="${S.range === 14 ? 'active' : ''}">2周</button>
        <button data-d="21" class="${S.range === 21 ? 'active' : ''}">3周</button>
        <button data-d="35" class="${S.range === 35 ? 'active' : ''}">5周</button>
      </div>
      <div class="seg" id="zoomSeg">
        <button data-w="32" class="${S.dayWidth === 32 ? 'active' : ''}">紧凑</button>
        <button data-w="46" class="${S.dayWidth === 46 ? 'active' : ''}">标准</button>
        <button data-w="64" class="${S.dayWidth === 64 ? 'active' : ''}">宽松</button>
      </div>
      <button class="btn primary" id="btnInsert">+ 临时插单</button>`;
    tool.innerHTML = S.tab === 'gantt' ? ganttTool : (S.tab === 'shipments'
      ? `<button class="btn primary" id="btnMockJdy">模拟简道云提交出库单</button>` : '');
    if (S.tab === 'gantt') { bind(); }
    if (S.tab === 'shipments') { $('#btnMockJdy').onclick = mockJdy; }

    const main = $('#main');
    if (S.tab === 'gantt') { main.innerHTML = `<div class="card"><div class="card-b nopad" id="ganttBox"></div></div>${legendHtml()}`; renderGantt(); }
    else if (S.tab === 'fleet') main.innerHTML = fleetHtml();
    else if (S.tab === 'conflicts') main.innerHTML = conflictsHtml();
    else if (S.tab === 'shipments') { main.innerHTML = `<div class="card"><div class="card-b nopad" id="shipBox"></div></div>`; renderShipments(); }
    else if (S.tab === 'timeline') { main.innerHTML = timelineHtml(); loadSnapshots(); }
    else if (S.tab === 'settings') { main.innerHTML = settingsHtml(); loadSettings(); }
  }

  function legendHtml() {
    return `<div class="card"><div class="card-b" style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
      <span class="hint">图例：</span>
      <span><i class="dot-sm" style="background:#00a870"></i>驻场</span>
      <span><i class="dot-sm" style="background:#2f6fed"></i>在途</span>
      <span><i class="dot-sm" style="background:#ff7d00"></i>休假</span>
      <span><i class="dot-sm" style="background:#e34d59"></i>冲突/锁定</span>
      <span class="hint" style="margin-left:auto">提示：拖动色块改期，上下拖动可跨行改派/换项目；冲突色块会红色闪烁，点击可查看详情</span>
    </div></div>`;
  }

  /* ============ 甘特图 ============ */
  function renderGantt() {
    const b = S.board; const box = $('#ganttBox'); if (!box) return;
    const rs = startOfDay(new Date(Date.now() - 3 * DAY));
    const re = startOfDay(new Date(Date.now() + S.range * DAY));
    // 回溯模式：用历史快照的数据渲染（只读）
    const src = S.history ? S.history.payload : S.board;
    const staffName = (id) => ((b.staff.find((s) => s.id === id) || {}).name || '');
    const projOf = (id) => b.projects.find((p) => p.id === id) || {};
    const conflictMap = {};
    b.conflicts.forEach((c) => { if (c.meta && c.meta.assignmentId) conflictMap[c.meta.assignmentId] = c; if (c.entityId) conflictMap[c.entityId] = conflictMap[c.entityId] || c; });

    let rows, bars;
    if (S.view === 'project') {
      rows = b.projects.map((p) => ({ id: p.id, title: p.name, sub: `${p.brand || '—'} · ${p.city || '—'}`, color: p.color || '#2f6fed' }));
      bars = b.assignments.filter((a) => a.project_id).map((a) => ({
        id: a.id, rowId: a.project_id, start: a.start_ts, end: a.end_ts,
        label: `${a.staff_name || ''}${a.role ? '·' + a.role : ''}`,
        cls: a.status === 'onroad' ? 'onroad' : a.status === 'leave' ? 'leave' : a.status === 'planning' ? 'planning' : 'onsite',
        conflict: !!conflictMap[a.id] && conflictMap[a.id].level === 'block',
        tip: `${a.staff_name}｜${a.project_name}\n${fullFmt(a.start_ts)} → ${fullFmt(a.end_ts)}\n状态：${(STATUS[a.status] || ['—'])[0]}`,
        data: a,
      }));
    } else {
      rows = b.staff.map((s) => ({ id: s.id, title: s.name, sub: `${s.dept || '—'} · ${s.role || '—'}`, color: s.color || '#6172f3' }));
      bars = b.assignments.map((a) => ({
        id: a.id, rowId: a.staff_id, start: a.start_ts, end: a.end_ts,
        label: a.project_id ? `${a.project_name || ''}` : (a.role || '在途'),
        cls: a.status === 'onroad' ? 'onroad' : a.status === 'leave' ? 'leave' : a.status === 'planning' ? 'planning' : 'onsite',
        conflict: !!conflictMap[a.id] && conflictMap[a.id].level === 'block',
        tip: `${a.staff_name}｜${a.project_name || a.role}\n${fullFmt(a.start_ts)} → ${fullFmt(a.end_ts)}\n来源：${a.source === 'ctrip' ? '携程商旅自动同步' : '手工排期'}`,
        data: a,
      }));
      // 空闲行也要显示：无排期的人员留空即可
    }
    if (S.history) { rows = rows; }

    window.__gantt = new Gantt(box, {
      view: S.view, dayWidth: S.dayWidth, rowHeight: 44,
      rows, bars, rangeStart: rs, rangeEnd: re,
      onBarClick: (bar) => openBarDetail(bar, conflictMap[bar.id]),
      onDrop: (bar, preview, done) => handleDrop(bar, preview, done),
    });
    bind();
  }

  /* ---- 拖拽落位：先校验，再要求填写变更原因 ---- */
  async function handleDrop(bar, preview, done) {
    const a = bar.data;
    const payload = S.view === 'staff'
      ? { entity: 'assignment', entityId: a.id, staffId: preview.rowId, startTs: preview.start, endTs: preview.end }
      : { entity: 'assignment', entityId: a.id, staffId: a.staff_id, startTs: preview.start, endTs: preview.end };
    let chk = { blocks: [], warns: [] };
    try { chk = await api('POST', '/api/check-move', payload); } catch (e) { }
    openModal({
      title: '排期变更确认',
      body: `
        <div class="alert info">${esc(a.staff_name)}｜${esc(a.project_name || a.role)}<br>
        原时间：${fullFmt(a.start_ts)} → ${fullFmt(a.end_ts)}<br>
        新时间：<b>${fullFmt(preview.start)} → ${fullFmt(preview.end)}</b>
        ${S.view === 'staff' && preview.rowId !== a.staff_id ? `<br>改派至：<b>${esc((S.board.staff.find((s) => s.id === preview.rowId) || {}).name || '')}</b>` : ''}
        ${S.view === 'project' && preview.rowId !== a.project_id ? `<br>调至项目：<b>${esc((S.board.projects.find((p) => p.id === preview.rowId) || {}).name || '')}</b>` : ''}
        </div>
        ${chk.blocks.length ? `<div class="alert danger"><b>⚠ 调度阻断</b><br>${chk.blocks.map((x) => '· ' + esc(x.message)).join('<br>')}<br><span style="font-size:12px">如需强制调度，请在下方填写变更原因后提交，系统将记录留痕。</span></div>` : ''}
        ${chk.warns.length ? `<div class="alert warn">提示：${chk.warns.map((x) => esc(x.message)).join('；')}</div>` : ''}
        <div class="field"><label>变更原因（必填，用于事后复盘与定责）</label>
          <textarea id="mvReason" rows="2" placeholder="例：客户临时要求提前进场 / 航班延误改期"></textarea></div>`,
      okText: chk.blocks.length ? '强制调度' : '确认变更',
      danger: chk.blocks.length,
      onOk: async (close) => {
        const reason = $('#mvReason').value.trim();
        if (!reason) { toast('必须填写变更原因', 'err'); return false; }
        try {
          const body = S.view === 'staff'
            ? { start_ts: preview.start, end_ts: preview.end, staff_id: preview.rowId, reason, force: !!chk.blocks.length }
            : { start_ts: preview.start, end_ts: preview.end, project_id: preview.rowId, reason, force: !!chk.blocks.length };
          await api('PATCH', '/api/assignments/' + a.id, body);
          toast('排期已更新，已生成快照留痕', 'ok');
          close(); await refresh();
        } catch (e) { toast(e.message, 'err'); return false; }
      },
      onClose: () => done(true),
    });
  }

  function openBarDetail(bar, cf) {
    const a = bar.data;
    const veh = S.board.vehicleAssignments.filter((v) => v.project_id === a.project_id);
    const trips = S.board.trips.filter((t) => t.staff_id === a.staff_id);
    openModal({
      title: '排期详情',
      body: `
        <div class="alert ${cf ? 'danger' : 'info'}">
          <b>${esc(a.staff_name)}</b> · ${esc(a.role || '')}<br>
          项目：${esc(a.project_name || '在途/其他')}（${esc(a.city || '—')}）<br>
          时间：${fullFmt(a.start_ts)} → ${fullFmt(a.end_ts)}<br>
          状态：${(STATUS[a.status] || ['—'])[0]}　来源：${a.source === 'ctrip' ? '携程商旅自动同步' : '手工排期'}
        </div>
        ${cf ? `<div class="alert danger"><b>冲突：${esc(cf.title)}</b><br>${esc(cf.detail)}
          ${(cf.actions || []).length ? `<div class="ci-actions">${cf.actions.map((x) => `<button class="btn sm danger" data-act="${x.type}" data-id="${a.id}" data-trip="${x.tripId || ''}">${esc(x.label)}</button>`).join('')}</div>` : ''}</div>` : ''}
        <div class="card"><div class="card-h"><h3>关联车辆</h3></div><div class="card-b" style="padding:10px 14px">
          ${veh.length ? veh.map((v) => `<div style="padding:4px 0"><b>${esc(v.vehicle_plate || '—')}</b> / 挂车 ${esc(v.trailer_plate || '—')} · 司机 ${esc(v.driver_name || '—')} · ${esc(v.status)}</div>`).join('') : '<span class="hint">暂无车辆任务</span>'}
        </div></div>
        <div class="card"><div class="card-h"><h3>该员工差旅行程（携程）</h3></div><div class="card-b" style="padding:10px 14px">
          ${trips.length ? trips.map((t) => `<div style="padding:4px 0">${t.type === 'flight' ? '✈' : t.type === 'train' ? '🚄' : '🏨'} ${esc(t.order_no)} ${esc(t.from_city)}→${esc(t.to_city)}　${fullFmt(t.depart_ts)}</div>`).join('') : '<span class="hint">暂无行程</span>'}
        </div></div>`,
      okText: '关闭', noCancel: true,
      onOk: (close) => { close(); },
    });
    $$('[data-act="sync_ctrip"]').forEach((b) => b.onclick = async () => {
      try { await api('POST', '/api/conflicts/sync-trip', { tripId: b.dataset.trip, assignmentId: b.dataset.id, reason: '按携程行程自动让位' }); toast('已同步携程行程，排期自动拆分', 'ok'); closeModal(); await refresh(); }
      catch (e) { toast(e.message, 'err'); }
    });
  }

  function openInsert() {
    const b = S.board;
    openModal({
      title: '临时插单（需填写变更原因）',
      body: `
        <div class="field"><label>员工</label><select id="insStaff">${b.staff.map((s) => `<option value="${s.id}">${esc(s.name)}（${esc(s.role || '')}）</option>`).join('')}</select></div>
        <div class="field"><label>项目</label><select id="insProj"><option value="">— 在途/非项目 —</option>${b.projects.map((p) => `<option value="${p.id}">${esc(p.name)}（${esc(p.city)}）</option>`).join('')}</select></div>
        <div style="display:flex;gap:10px">
          <div class="field" style="flex:1"><label>开始时间</label><input type="datetime-local" id="insStart"></div>
          <div class="field" style="flex:1"><label>结束时间</label><input type="datetime-local" id="insEnd"></div>
        </div>
        <div class="field"><label>状态</label><select id="insStatus"><option value="onsite">驻场</option><option value="onroad">在途</option><option value="leave">休假</option></select></div>
        <div class="field"><label>变更原因（必填）</label><textarea id="insReason" rows="2" placeholder="例：客户临时加场，需增派 1 人支援"></textarea></div>`,
      onOk: async (close) => {
        const reason = $('#insReason').value.trim();
        if (!reason) { toast('必须填写变更原因', 'err'); return false; }
        const toIso = (v) => v ? new Date(v).toISOString().replace('Z', '+00:00') : '';
        try {
          await api('POST', '/api/assignments', {
            staff_id: $('#insStaff').value, project_id: $('#insProj').value,
            start_ts: toIso($('#insStart').value) || iso(new Date()),
            end_ts: toIso($('#insEnd').value) || iso(new Date(Date.now() + 3 * DAY)),
            status: $('#insStatus').value, reason,
          });
          toast('插单成功，已留痕', 'ok'); close(); await refresh();
        } catch (e) {
          if (e.blocks) { toast('插单被阻断：' + e.blocks.map((x) => x.message).join('；'), 'err'); return false; }
          toast(e.message, 'err'); return false;
        }
      },
    });
    const now = new Date(), later = new Date(Date.now() + 3 * DAY);
    const lv = (d) => iso(d).slice(0, 16);
    $('#insStart').value = lv(now); $('#insEnd').value = lv(later);
  }

  /* ============ 车辆 / 挂车看板 ============ */
  function fleetHtml() {
    return `<div class="card"><div class="card-h"><h3>车辆与挂车动态看板</h3><div class="spacer"></div>
      <span class="hint">状态实时来自排期 + 简道云出库单签收</span></div>
      <div class="vehicle-grid" id="fleetGrid"></div></div>
      <div class="card"><div class="card-h"><h3>挂车 / 展具箱</h3></div><div class="card-b nopad">
        <table class="grid"><thead><tr><th>挂车牌照</th><th>类型</th><th>状态</th><th>关联项目</th><th>锁定原因</th><th>操作</th></tr></thead>
        <tbody>${S.board.trailers.map((t) => {
      const proj = S.board.projects.find((p) => p.id === t.project_id);
      const st = STATUS[t.status] || ['—', 'mute'];
      return `<tr><td class="mono"><b>${esc(t.plate)}</b></td><td>${esc(t.type)}</td>
          <td><span class="tag ${t.status === 'unloading' || t.status === 'maintenance' ? 'danger' : st[1]}">${st[0]}</span></td>
          <td>${esc(proj ? proj.name : '—')}</td><td style="color:var(--danger)">${esc(t.lock_reason || '')}</td>
          <td><button class="btn sm" data-trl="${t.id}">${t.status === 'idle' ? '设为卸货' : '解锁为空闲'}</button></td></tr>`;
    }).join('')}</tbody></table></div></div>`;
  }

  function bindFleet() {
    const b = S.board;
    $('#fleetGrid').innerHTML = b.vehicles.map((v) => {
      const st = STATUS[v.status] || ['—', 'mute'];
      const lock = b.trailers.find((t) => t.id === v.trailer_id && (t.status === 'unloading' || t.status === 'maintenance'));
      return `<div class="vcard ${lock ? 'locked' : ''}">
        <div class="vtop"><span class="plate">${esc(v.plate)}</span>
          <span class="tag ${v.status === 'maintenance' ? 'danger' : v.status === 'running' ? 'info' : v.status === 'unloading' ? 'warn' : 'mute'}">${st[0]}</span>
          <div style="flex:1"></div><span class="hint">${esc(v.type || '')}</span></div>
        <div class="vrow"><span>司机</span><b>${esc(v.driver_name || '未绑定')}</b></div>
        <div class="vrow"><span>挂车</span><b>${esc(v.trailer_plate || '未绑定')}</b></div>
        <div class="vrow"><span>服务项目</span><b>${esc(v.project_name || '—')}</b></div>
        <div class="vrow"><span>当前位置</span><b>${esc(v.location || '—')}</b></div>
        <div class="vrow"><span>预计到达</span><b>${v.eta ? fullFmt(v.eta) : '—'}</b></div>
        ${lock ? `<div style="margin-top:8px;font-size:12px;color:var(--danger)">🔒 ${esc(lock.lock_reason || '资源锁定中，禁止调度')}</div>` : ''}
      </div>`;
    }).join('');
    $$('[data-trl]').forEach((btn) => btn.onclick = async () => {
      const t = S.board.trailers.find((x) => x.id === btn.dataset.trl);
      const next = t.status === 'idle' ? 'unloading' : 'idle';
      await api('PATCH', '/api/trailers/' + t.id, { status: next, lock_reason: next === 'unloading' ? '现场卸货中，未签收，资源锁定' : '', reason: '看板手动切换' });
      toast('挂车状态已更新', 'ok'); await refresh(); renderTabs();
    });
  }

  /* ============ 冲突中心 ============ */
  function conflictsHtml() {
    const b = S.board;
    return `<div class="card"><div class="card-h"><h3>智能冲突检测</h3><div class="spacer"></div>
      <span class="hint">阻断级 ${b.conflicts.filter((c) => c.level === 'block').length} 条 · 预警级 ${b.conflicts.filter((c) => c.level === 'warn').length} 条</span></div>
      <div class="card-b nopad" id="cfBox"></div></div>`;
  }
  function bindConflicts() {
    const b = S.board; const box = $('#cfBox'); if (!box) return;
    if (!b.conflicts.length) { box.innerHTML = `<div class="empty">✅ 当前无冲突，资源调度健康</div>`; return; }
    box.innerHTML = b.conflicts.map((c) => `
      <div class="conflict-item ${c.level}">
        <div class="ci-icon ${c.level}">${c.level === 'block' ? '!' : '⚠'}</div>
        <div class="ci-body">
          <div class="ci-title">${esc(c.title)} <span class="tag ${c.level === 'block' ? 'danger' : 'warn'}">${c.level === 'block' ? '阻断' : '预警'}</span></div>
          <div class="ci-detail">${esc(c.detail)}</div>
          <div class="ci-actions">
            ${(c.actions || []).map((a) => `<button class="btn sm ${c.level === 'block' ? 'danger' : ''}" data-sync="${a.tripId || ''}" data-asg="${c.meta.assignmentId || ''}">${esc(a.label)}</button>`).join('')}
            <button class="btn sm" data-locate="${c.entityId}">定位到排期</button>
          </div>
        </div>
      </div>`).join('');
    $$('[data-sync]').forEach((btn) => btn.onclick = async () => {
      try { await api('POST', '/api/conflicts/sync-trip', { tripId: btn.dataset.sync, assignmentId: btn.dataset.asg, reason: '一键同步携程行程' }); toast('已同步，排期按行程自动拆分', 'ok'); await refresh(); renderTabs(); }
      catch (e) { toast(e.message, 'err'); }
    });
    $$('[data-locate]').forEach((btn) => btn.onclick = () => {
      S.tab = 'gantt'; $$('.tab').forEach((x) => x.classList.toggle('active', x.dataset.tab === 'gantt')); renderTabs();
      setTimeout(() => { const el = document.querySelector(`.bar[data-id="${btn.dataset.locate}"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('selected'); } }, 120);
    });
  }

  /* ============ 出库单 ============ */
  function renderShipments() {
    const b = S.board;
    const stMap = { pending: ['待出库', 'mute'], in_transit: ['在途', 'info'], arrived: ['已到达待签收', 'warn'], signed: ['已签收', 'ok'] };
    $('#shipBox').innerHTML = `<table class="grid"><thead><tr>
      <th>出库单号</th><th>项目</th><th>车辆 / 挂车</th><th>物资明细</th><th>状态</th><th>预计到达</th><th>签收</th><th>操作</th></tr></thead><tbody>
      ${b.shipments.map((s) => {
      const st = stMap[s.status] || ['—', 'mute'];
      let items = []; try { items = JSON.parse(s.items); } catch (e) { }
      return `<tr>
        <td class="mono"><b>${esc(s.order_no)}</b><div class="hint">简道云 ${esc(s.jdy_id || '')}</div></td>
        <td>${esc(s.project_name || '—')}<div class="hint">${esc(s.city || '')}</div></td>
        <td>${esc(s.vehicle_plate || '未派车')}<div class="hint">${esc(s.trailer_plate || '')}</div></td>
        <td>${items.slice(0, 3).map((i) => `${esc(i.name)} ×${i.qty}${esc(i.unit || '')}`).join('，')}${items.length > 3 ? '…' : ''}</td>
        <td><span class="tag ${st[1]}">${st[0]}</span></td>
        <td>${s.eta_ts ? fullFmt(s.eta_ts) : '—'}</td>
        <td>${s.signed_ts ? `<span class="tag ok">${esc(s.signed_by || '')}</span><div class="hint">${fullFmt(s.signed_ts)}</div>` : '<span class="tag warn">未签收</span>'}</td>
        <td>${s.status === 'signed' ? `<button class="btn sm" data-push="${s.id}">回写简道云</button>` : `<button class="btn sm primary" data-sign="${s.id}">确认收货</button>`}</td>
      </tr>`;
    }).join('')}</tbody></table>`;
    $$('[data-sign]').forEach((btn) => btn.onclick = () => openSign(btn.dataset.sign));
    $$('[data-push]').forEach((btn) => btn.onclick = async () => {
      const r = await api('POST', `/api/shipments/${btn.dataset.push}/pushback`, {});
      toast(r.mode === 'mock' ? '已记录回写动作（配置 apiKey 后真实回写）' : '已回写简道云', 'ok');
    });
  }
  function openSign(id) {
    const s = S.board.shipments.find((x) => x.id === id);
    let items = []; try { items = JSON.parse(s.items); } catch (e) { }
    openModal({
      title: '现场确认收货',
      body: `<div class="alert info">${esc(s.order_no)}｜${esc(s.project_name || '')}<br>物资：${items.map((i) => esc(i.name) + ' ×' + i.qty).join('，')}</div>
        <div class="field"><label>签收人</label><input id="sgBy" value="${esc(S.user.name)}"></div>
        <div class="field"><label>备注</label><textarea id="sgNote" rows="2" placeholder="现场点货说明"></textarea></div>`,
      onOk: async (close) => {
        await api('POST', `/api/shipments/${id}/sign`, { by: $('#sgBy').value, reason: $('#sgNote').value || '现场确认收货', photos: [] });
        toast('签收成功，挂车自动解锁并回写简道云', 'ok'); close(); await refresh(); renderTabs();
      },
    });
  }
  async function mockJdy() {
    await api('POST', '/api/jdy/mock-submit', {});
    toast('已模拟简道云推送出库单', 'ok'); await refresh(); renderTabs();
  }

  /* ============ 时光机 ============ */
  function timelineHtml() {
    return `<div class="card"><div class="card-h"><h3>排期时光机</h3><div class="spacer"></div>
      <span class="hint">拖拽滑块回溯任意时刻的排期状态</span></div><div class="card-b">
        <div class="tm-slider">
          <label class="hint" style="min-width:70px">时间轴</label>
          <input type="range" id="tmRange" min="0" max="0" value="0">
          <span id="tmLabel" class="mono" style="min-width:150px">—</span>
        </div>
        <div class="toolbar">
          <label class="fld">精确时间<input type="datetime-local" id="tmExact"></label>
          <button class="btn" id="tmGo">回溯到该时刻</button>
          <button class="btn" id="tmNow">回到当前</button>
          <div class="spacer"></div>
          <span class="hint" id="tmTip">共 0 个快照</span>
        </div>
        <div id="tmBanner"></div>
      </div></div>
      <div class="card"><div class="card-h"><h3>版本与差异</h3><div class="spacer"></div><span class="hint">点击任意快照查看与当前状态的差异</span></div>
      <div class="card-b nopad"><div class="snap-list" id="snapList"></div></div></div>
      <div class="card"><div class="card-h"><h3>变更留痕（最近 30 条）</h3></div><div class="card-b nopad" id="chgBox"></div></div>`;
  }
  let snaps = [];
  async function loadSnapshots() {
    const r = await api('GET', '/api/snapshots?limit=60');
    snaps = r.snapshots;
    const rg = $('#tmRange');
    rg.max = Math.max(0, snaps.length - 1); rg.value = Math.max(0, snaps.length - 1);
    $('#tmTip').textContent = `共 ${snaps.length} 个快照`;
    const upd = () => {
      const s = snaps[+rg.value];
      $('#tmLabel').textContent = s ? new Date(s.created_at).toLocaleString('zh-CN', { hour12: false }) : '—';
    };
    rg.oninput = upd; upd();
    rg.onchange = () => { const s = snaps[+rg.value]; if (s) backTo(s.created_at); };
    $('#tmGo').onclick = () => { const v = $('#tmExact').value; if (v) backTo(new Date(v).toISOString()); else toast('请选择时间', 'err'); };
    $('#tmNow').onclick = () => { S.history = null; renderTabs(); };
    $('#snapList').innerHTML = snaps.map((s) => `<div class="snap-item" data-snap="${s.id}">
      <div style="flex:1"><div style="font-weight:600">${esc(s.reason || '系统快照')}</div>
      <div class="st">${new Date(s.created_at).toLocaleString('zh-CN', { hour12: false })} · 操作人 ${esc(s.actor || '—')}</div></div>
      <button class="btn sm">查看差异</button></div>`).join('');
    $$('[data-snap]').forEach((el) => el.onclick = (e) => {
      if (e.target.tagName === 'BUTTON') { showDiff(el.dataset.snap); return; }
      const s = snaps.find((x) => x.id === el.dataset.snap); backTo(s.created_at);
    });
    const chg = await api('GET', '/api/changes');
    $('#chgBox').innerHTML = `<table class="grid"><thead><tr><th>时间</th><th>操作人</th><th>对象</th><th>动作</th><th>变更原因</th></tr></thead><tbody>
      ${chg.changes.slice(0, 30).map((c) => `<tr><td class="mono">${new Date(c.created_at).toLocaleString('zh-CN', { hour12: false })}</td>
      <td>${esc(c.actor)}</td><td>${esc(c.entity)}</td><td>${esc(c.action)}</td><td>${esc(c.reason || '—')}</td></tr>`).join('')}
      </tbody></table>`;
  }
  async function backTo(ts) {
    try {
      const r = await api('GET', '/api/snapshots/at?ts=' + encodeURIComponent(ts));
      S.history = r.snapshot;
      S.tab = 'gantt'; $$('.tab').forEach((x) => x.classList.toggle('active', x.dataset.tab === 'gantt'));
      renderTabs();
      $('#tmBanner').innerHTML = '';
      $('#ganttBox').parentElement.insertAdjacentHTML('beforebegin',
        `<div class="alert warn" style="margin:12px 16px 0">🕓 <b>回溯模式</b>：正在查看 <b>${new Date(r.snapshot.created_at).toLocaleString('zh-CN', { hour12: false })}</b> 的排期快照（${esc(r.snapshot.reason || '系统快照')}），只读。
         <button class="btn sm" id="exitHist" style="margin-left:8px">返回当前</button></div>`);
      $('#exitHist').onclick = () => { S.history = null; renderTabs(); };
    } catch (e) { toast(e.message, 'err'); }
  }
  async function showDiff(id) {
    const d = await api('GET', '/api/snapshots/' + id + '/diff');
    const label = { assignments: '人员排期', vehicle_assignments: '车辆排期', vehicles: '车辆', trailers: '挂车', shipments: '出库单', trips: '行程' };
    const nameOf = (t, r) => {
      if (!r) return '';
      if (t === 'assignments') return `${(S.board.staff.find((s) => s.id === r.staff_id) || {}).name || ''} @ ${(S.board.projects.find((p) => p.id === r.project_id) || {}).name || '在途'}`;
      if (t === 'vehicle_assignments' || t === 'vehicles') return r.plate || r.vehicle_plate || r.id;
      if (t === 'trailers') return r.plate || r.id;
      if (t === 'shipments') return r.order_no || r.id;
      return r.id;
    };
    openModal({
      title: '版本差异对比',
      wide: true,
      body: `<div class="alert info">快照时间：${new Date(d.snapshot.created_at).toLocaleString('zh-CN', { hour12: false })} · 操作人 ${esc(d.snapshot.actor || '—')}<br>变更原因：${esc(d.snapshot.reason || '—')}</div>
        ${d.changes.length ? d.changes.slice(0, 60).map((c) => `<div class="diff-row">
          <span class="k">${label[c.table] || c.table}</span>
          <span style="min-width:130px">${esc(nameOf(c.table, c.after || c.before))}</span>
          <span class="tag ${c.type === 'added' ? 'ok' : c.type === 'removed' ? 'danger' : 'info'}">${c.type === 'added' ? '新增' : c.type === 'removed' ? '删除' : '修改'}</span>
          <span style="flex:1">${c.type === 'modified'
          ? Object.entries(c.diff).slice(0, 4).map(([k, v]) => `<span class="k" style="display:inline-block;min-width:0">${esc(k)}: <span class="b">${esc(String(v.before || '空').slice(0, 24))}</span> → <span class="a">${esc(String(v.after || '空').slice(0, 24))}</span></span>`).join('　')
          : ''}</span></div>`).join('')
        : '<div class="empty">该快照与当前状态完全一致</div>'}`,
      okText: '关闭', noCancel: true, onOk: (close) => close(),
    });
  }

  /* ============ 集成设置 ============ */
  function settingsHtml() {
    return `<div class="card"><div class="card-h"><h3>集成配置</h3><div class="spacer"></div>
      <span class="hint">未配置凭证时系统自动走体验模式，功能完整可演示</span></div><div class="card-b" id="setBox"></div></div>`;
  }
  async function loadSettings() {
    const [d, c, j] = await Promise.all([api('GET', '/api/auth/config'), api('GET', '/api/ctrip/config'), api('GET', '/api/jdy/config')]);
    $('#setBox').innerHTML = `
      <div class="alert ${d.mode === 'real' ? 'info' : 'warn'}">钉钉登录：<b>${d.mode === 'real' ? '已接入真实应用' : '体验模式（一键选择身份登录）'}</b></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
        <label class="fld">AppKey<input id="dtKey" value="${esc(d.config.appKey)}" placeholder="ding..."></label>
        <label class="fld">AppSecret<input id="dtSecret" value="${esc(d.config.appSecret)}" placeholder="..."></label>
        <label class="fld">CorpId<input id="dtCorp" value="${esc(d.config.corpId)}"></label>
        <label class="fld">回调域名<input id="dtHost" value="${esc(d.config.callbackHost)}" placeholder="https://your-domain.com"></label>
      </div>
      <div style="margin:12px 0"><button class="btn primary" id="saveDing">保存钉钉配置</button></div>
      <hr style="border:none;border-top:1px solid var(--border-2);margin:18px 0">
      <div class="alert ${c.config.mode === 'real' ? 'info' : 'warn'}">携程商旅：<b>${c.config.mode === 'real' ? '已接入真实接口' : '体验模式（本地订单库）'}</b>　上次同步：${esc(c.config.lastSyncAt ? new Date(c.config.lastSyncAt).toLocaleString('zh-CN', { hour12: false }) : '尚未同步')}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
        <label class="fld">API Base<input id="ctBase" value="${esc(c.config.apiBase)}"></label>
        <label class="fld">订单接口路径<input id="ctPath" value="${esc(c.config.orderPath)}"></label>
        <label class="fld">CorpId<input id="ctCorp" value="${esc(c.config.corpId)}"></label>
        <label class="fld">AppKey<input id="ctKey" value="${esc(c.config.apiKey)}"></label>
        <label class="fld">AppSecret<input id="ctSec" value="${esc(c.config.apiSecret)}"></label>
      </div>
      <div style="margin:12px 0;display:flex;gap:9px"><button class="btn primary" id="saveCtrip">保存携程配置</button><button class="btn" id="syncCtrip2">立即同步订单</button></div>
      <hr style="border:none;border-top:1px solid var(--border-2);margin:18px 0">
      <div class="alert ${j.config.mode === 'real' ? 'info' : 'warn'}">简道云：<b>${j.config.mode === 'real' ? '已接入真实 API' : '体验模式（本地模拟推送）'}</b></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
        <label class="fld">API Key<input id="jdyKey" value="${esc(j.config.apiKey)}"></label>
        <label class="fld">AppId<input id="jdyApp" value="${esc(j.config.appId)}"></label>
        <label class="fld">出库单 EntryId<input id="jdyEntry" value="${esc(j.config.entryId)}"></label>
        <label class="fld">Webhook Token<input id="jdyTok" value="${esc(j.config.webhookToken)}"></label>
      </div>
      <div style="margin:12px 0"><button class="btn primary" id="saveJdy">保存简道云配置</button></div>
      <div class="hint" style="margin-top:6px">Webhook 地址：<span class="mono">POST ${location.origin}/api/jdy/webhook?token=${esc(j.config.webhookToken || 'heyday2026')}</span></div>`;
    $('#saveDing').onclick = async () => {
      await api('POST', '/api/auth/config', { appKey: $('#dtKey').value, appSecret: $('#dtSecret').value, corpId: $('#dtCorp').value, callbackHost: $('#dtHost').value });
      toast('钉钉配置已保存', 'ok'); loadSettings();
    };
    $('#saveCtrip').onclick = async () => {
      await api('POST', '/api/ctrip/config', { apiBase: $('#ctBase').value, orderPath: $('#ctPath').value, corpId: $('#ctCorp').value, apiKey: $('#ctKey').value, apiSecret: $('#ctSec').value });
      toast('携程配置已保存', 'ok'); loadSettings();
    };
    $('#saveJdy').onclick = async () => {
      await api('POST', '/api/jdy/config', { apiKey: $('#jdyKey').value, appId: $('#jdyApp').value, entryId: $('#jdyEntry').value, webhookToken: $('#jdyTok').value });
      toast('简道云配置已保存', 'ok'); loadSettings();
    };
    $('#syncCtrip2').onclick = async () => {
      const r = await api('POST', '/api/ctrip/sync', {});
      toast(`同步完成：新增 ${r.created} / 更新 ${r.updated} / 自动排期 ${r.autoScheduled}`, 'ok'); await refresh();
    };
  }

  /* ============ 弹窗 ============ */
  function openModal({ title, body, okText = '确认', danger, noCancel, onOk, onClose, wide }) {
    const m = document.createElement('div');
    m.className = 'mask'; m.id = 'modal';
    m.innerHTML = `<div class="modal" style="${wide ? 'width:760px' : ''}">
      <div class="modal-h"><span>${esc(title)}</span><div class="spacer"></div><button class="x-btn" data-x>×</button></div>
      <div class="modal-b">${body}</div>
      <div class="modal-f">${noCancel ? '' : `<button class="btn" data-x>取消</button>`}
        <button class="btn ${danger ? 'danger' : 'primary'}" id="mOk">${esc(okText)}</button></div></div>`;
    document.body.appendChild(m);
    const close = () => { m.remove(); if (onClose) onClose(); };
    m.querySelectorAll('[data-x]').forEach((b) => b.onclick = close);
    m.onclick = (e) => { if (e.target === m) close(); };
    $('#mOk').onclick = async () => { if (onOk) await onOk(close); };
    window.closeModal = close;
  }

  boot();
})();
