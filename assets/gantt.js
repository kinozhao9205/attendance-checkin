/* 双向甘特图组件：项目视角 / 人员视角，支持拖拽改期、跨行改派、冲突标红 */
(function (global) {
  'use strict';
  const DAY = 86400000;

  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

  class Gantt {
    constructor(el, opts) {
      this.el = el;
      this.o = Object.assign({
        view: 'project', dayWidth: 46, rowHeight: 44,
        rows: [], bars: [], rangeStart: null, rangeEnd: null,
        onBarClick: null, onDrop: null, onRowClick: null,
      }, opts);
      this.render();
    }

    setData(o) { Object.assign(this.o, o); this.render(); }

    render() {
      const o = this.o;
      const rs = startOfDay(o.rangeStart), re = startOfDay(o.rangeEnd);
      const days = Math.max(1, Math.round((re - rs) / DAY) + 1);
      const dw = o.dayWidth, rh = o.rowHeight;
      const totalW = days * dw;
      const today = startOfDay(new Date());

      // ---- 表头 ----
      const months = []; let cur = new Date(rs);
      while (cur <= re) {
        const key = cur.getFullYear() + '-' + (cur.getMonth() + 1);
        let last = months[months.length - 1];
        if (!last || last.key !== key) { last = { key, label: `${cur.getFullYear()}年${cur.getMonth() + 1}月`, n: 0 }; months.push(last); }
        last.n++; cur = new Date(cur.getTime() + DAY);
      }
      const daysHtml = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(rs.getTime() + i * DAY);
        const wk = d.getDay() === 0 || d.getDay() === 6;
        const isToday = d.getTime() === today.getTime();
        daysHtml.push(`<div class="day${wk ? ' weekend' : ''}${isToday ? ' today' : ''}"><span class="dnum">${d.getDate()}</span>${'日一二三四五六'[d.getDay()]}</div>`);
      }

      // ---- 行 ----
      const leftRows = o.rows.map((r) => `
        <div class="grow" data-row="${r.id}" style="height:${rh}px">
          ${r.color ? `<span class="gdot" style="background:${r.color}"></span>` : ''}
          <div style="min-width:0">
            <div class="gtitle">${esc(r.title)}</div>
            ${r.sub ? `<div class="gsub">${esc(r.sub)}</div>` : ''}
          </div>
        </div>`).join('');

      const grid = [];
      for (let r = 0; r < o.rows.length; r++) {
        for (let i = 0; i < days; i++) {
          const d = new Date(rs.getTime() + i * DAY);
          const wk = d.getDay() === 0 || d.getDay() === 6;
          grid.push(`<div class="cell${wk ? ' weekend' : ''}" style="height:${rh}px"></div>`);
        }
      }

      const bodyH = o.rows.length * rh;
      const rowIndex = {}; o.rows.forEach((r, i) => { rowIndex[r.id] = i; });

      this.el.innerHTML = `
        <div class="gantt-wrap" style="--dw:${dw}px">
          <div class="gantt-label">
            <div class="gantt-head" style="height:64px;display:flex;align-items:flex-end;padding:0 12px 6px;
                 border-bottom:1px solid var(--border);font-size:12px;color:var(--muted);font-weight:700">
              ${o.view === 'project' ? '项目 / 品牌 · 地点' : '员工 / 岗位'}
            </div>
            <div class="lrows">${leftRows}</div>
          </div>
          <div class="gantt-scroll">
            <div class="gantt-inner" style="width:${totalW}px">
              <div class="gantt-head" style="height:64px">
                <div class="months">${months.map((m) => `<div class="month" style="width:${m.n * dw}px">${m.label}</div>`).join('')}</div>
                <div class="days">${daysHtml.join('')}</div>
              </div>
              <div class="gbody" style="position:relative;height:${bodyH}px">
                <div class="rowgrid" style="flex-wrap:wrap;width:${totalW}px;height:${bodyH}px">${grid.join('')}</div>
                <div class="bars" style="position:absolute;inset:0"></div>
                ${today >= rs && today <= re ? `<div class="today-line" style="left:${((today - rs) / DAY) * dw + ((new Date().getHours() / 24) * dw)}px;height:${bodyH + 64}px;top:-64px"></div>` : ''}
              </div>
            </div>
          </div>
        </div>`;

      // ---- 色块 ----
      const box = this.el.querySelector('.bars');
      this.barEls = {};
      o.bars.forEach((b) => {
        const ri = rowIndex[b.rowId];
        if (ri === undefined) return;
        const s = new Date(b.start), e = new Date(b.end);
        const x = ((s - rs) / DAY) * dw;
        let w = ((e - s) / DAY) * dw;
        if (w < 18) w = 18;
        const div = document.createElement('div');
        div.className = 'bar ' + (b.cls || 'onsite') + (b.conflict ? ' conflict' : '');
        div.style.left = Math.max(0, x) + 'px';
        div.style.width = w + 'px';
        div.style.top = ri * rh + 9 + 'px';
        div.dataset.id = b.id;
        div.title = b.tip || b.label;
        div.innerHTML = `<span class="bar-txt">${esc(b.label)}</span>`;
        div.addEventListener('mousedown', (ev) => this._dragStart(ev, b, div, x, w));
        div.addEventListener('click', (ev) => { if (!this._moved && o.onBarClick) o.onBarClick(b); });
        box.appendChild(div);
        this.barEls[b.id] = div;
      });

      // 滚动到今天
      const sc = this.el.querySelector('.gantt-scroll');
      if (sc && today >= rs && today <= re) sc.scrollLeft = Math.max(0, ((today - rs) / DAY) * dw - 180);

      this.el.querySelectorAll('.grow').forEach((r) => {
        r.addEventListener('click', () => { if (o.onRowClick) o.onRowClick(o.rows.find((x) => x.id === r.dataset.row)); });
      });
    }

    _dragStart(ev, bar, el, origX, origW) {
      if (ev.button !== 0) return;
      ev.preventDefault();
      this._moved = false;
      const dw = this.o.dayWidth, rh = this.o.rowHeight, rs = startOfDay(this.o.rangeStart);
      const sx = ev.clientX, sy = ev.clientY;
      const s0 = new Date(bar.start).getTime(), e0 = new Date(bar.end).getTime();
      const startRowIdx = this.o.rows.findIndex((r) => r.id === bar.rowId);
      el.classList.add('dragging');
      el.style.zIndex = 30;
      let preview = { start: bar.start, end: bar.end, rowId: bar.rowId };

      const move = (e) => {
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this._moved = true;
        const dDays = Math.round(dx / dw);
        const ns = s0 + dDays * DAY, ne = e0 + dDays * DAY;
        el.style.left = Math.max(0, ((ns - rs) / DAY) * dw) + 'px';
        const rowShift = Math.round(dy / rh);
        const idx = Math.max(0, Math.min(this.o.rows.length - 1, startRowIdx + rowShift));
        el.style.top = idx * rh + 9 + 'px';
        preview = { start: iso(new Date(ns)), end: iso(new Date(ne)), rowId: this.o.rows[idx].id, rowIdx: idx };
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        el.classList.remove('dragging');
        el.style.zIndex = '';
        if (!this._moved) return;
        if (this.o.onDrop) this.o.onDrop(bar, preview, (cancel) => { if (cancel !== false) this.render(); });
        else this.render();
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    }
  }

  function iso(d) {
    const p = (n) => String(n).padStart(2, '0');
    const off = -d.getTimezoneOffset(), sg = off >= 0 ? '+' : '-', ao = Math.abs(off);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00${sg}${p(Math.floor(ao / 60))}:${p(ao % 60)}`;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  global.Gantt = Gantt;
  global.ganttUtil = { iso, esc, startOfDay, DAY };
})(window);
