/* 地图选点组件（Leaflet + Esri 全球底图）
 * 用途：设置「打卡范围」的圆心与半径，所见即所得地看到距离圈。
 * 底图用 Esri World Street Map / World Imagery —— 全球覆盖、WGS84 坐标系，
 * 与后端存的经纬度一致（不像高德瓦片是 GCJ-02，会有几百米偏移）。
 *
 * 用法一（内嵌）：
 *   var picker = MapPick.create(document.getElementById('gfMap'), {
 *     lat, lng, radius, onChange: function (v) { ... }
 *   });
 *   picker.setPoint(41.31, 69.28);  picker.setRadius(300);  picker.invalidate();
 *
 * 用法二（弹窗，用于表单里临时选点）：
 *   MapPick.openModal({ lat, lng, radius, title, onOk: function (v) { ... } });
 */
(function () {
  'use strict';

  var LAYERS = {
    street: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attr: 'Esri · World Street Map', maxZoom: 19,
    },
    sat: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attr: 'Esri · World Imagery', maxZoom: 19,
    },
  };

  function pinIcon() {
    return L.divIcon({
      className: 'mp-pin-wrap',
      html: '<div class="mp-pin"><i></i></div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
  }

  function fmtMeters(m) {
    m = Math.round(+m || 0);
    return m >= 1000 ? (m / 1000).toFixed(m % 1000 === 0 ? 0 : 1) + ' 公里' : m + ' 米';
  }

  /* ---------- 内嵌地图实例 ---------- */
  function create(el, opts) {
    opts = opts || {};
    if (typeof L === 'undefined') {
      el.innerHTML = '<div class="mp-fallback">地图组件未加载（assets/vendor/leaflet/leaflet.js），请刷新重试</div>';
      return null;
    }
    var lat = +opts.lat, lng = +opts.lng;
    if (!isFinite(lat) || !isFinite(lng)) { lat = 31.2304; lng = 121.4737; }
    var radius = Math.max(30, +opts.radius || 300);

    var map = L.map(el, { zoomControl: true, attributionControl: true, worldCopyJump: true })
      .setView([lat, lng], opts.zoom || 16);

    var baseKey = opts.basemap || 'street';
    var tile = L.tileLayer(LAYERS[baseKey].url, {
      maxZoom: LAYERS[baseKey].maxZoom, attribution: LAYERS[baseKey].attr,
    }).addTo(map);

    var marker = L.marker([lat, lng], { icon: pinIcon(), draggable: true, keyboard: false }).addTo(map);
    // interactive:false —— 让点击穿透到地图，圆圈里点哪都能改圆心
    var circle = L.circle([lat, lng], {
      radius: radius, color: '#2f6fed', weight: 2, opacity: 0.9,
      fillColor: '#2f6fed', fillOpacity: 0.16, interactive: false,
    }).addTo(map);

    function emit() {
      if (typeof opts.onChange === 'function') {
        opts.onChange({ lat: +lat.toFixed(6), lng: +lng.toFixed(6), radius: Math.round(radius) });
      }
    }
    function apply(pan) {
      var ll = [lat, lng];
      marker.setLatLng(ll);
      circle.setLatLng(ll);
      circle.setRadius(radius);
      if (pan) map.setView(ll, Math.max(map.getZoom(), 16));
    }

    map.on('click', function (e) {
      lat = e.latlng.lat; lng = e.latlng.lng;
      apply(false); emit();
    });
    marker.on('drag', function () {
      var p = marker.getLatLng(); lat = p.lat; lng = p.lng;
      circle.setLatLng([lat, lng]);
    });
    marker.on('dragend', function () { apply(false); emit(); });

    var api = {
      map: map,
      getValue: function () { return { lat: +lat.toFixed(6), lng: +lng.toFixed(6), radius: Math.round(radius) }; },
      setPoint: function (la, ln, pan) {
        if (isFinite(la) && isFinite(ln)) { lat = +la; lng = +ln; apply(!!pan); emit(); }
      },
      setRadius: function (r) { radius = Math.max(30, +r || 300); circle.setRadius(radius); emit(); },
      setBasemap: function (k) {
        if (!LAYERS[k] || k === baseKey) return;
        map.removeLayer(tile); baseKey = k;
        tile = L.tileLayer(LAYERS[k].url, { maxZoom: LAYERS[k].maxZoom, attribution: LAYERS[k].attr }).addTo(map);
      },
      fit: function () {
        try { map.fitBounds(circle.getBounds(), { padding: [30, 30], maxZoom: 17 }); } catch (e) {}
      },
      invalidate: function () { try { map.invalidateSize(); } catch (e) {} },
      destroy: function () { try { map.remove(); } catch (e) {} },
    };
    return api;
  }

  /* ---------- 弹窗选点 ---------- */
  var modal = null, inst = null, cb = null;

  function buildModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'mp-modal';
    modal.id = 'mpModal';
    modal.innerHTML = [
      '<div class="mp-box">',
      '  <div class="mp-head">',
      '    <strong id="mpTitle">在地图上选择打卡范围</strong>',
      '    <span class="mp-x" id="mpClose">×</span>',
      '  </div>',
      '  <div class="mp-bar">',
      '    <button type="button" class="mp-chip on" data-bm="street">街道</button>',
      '    <button type="button" class="mp-chip" data-bm="sat">卫星</button>',
      '    <button type="button" class="mp-chip" id="mpLocate">📍 定位到我</button>',
      '    <span class="mp-tip">点击地图或拖动图钉设置圆心</span>',
      '  </div>',
      '  <div class="mp-map" id="mpMap"></div>',
      '  <div class="mp-foot">',
      '    <div class="mp-row">',
      '      <span class="mp-label">允许半径</span>',
      '      <input type="range" id="mpRange" min="30" max="3000" step="10" value="300">',
      '      <input type="number" id="mpRadius" min="30" max="20000" step="10" value="300">',
      '      <span class="mp-unit">米</span>',
      '    </div>',
      '    <div class="mp-coord" id="mpCoord">—</div>',
      '    <div class="mp-actions">',
      '      <button type="button" class="btn ghost" id="mpCancel">取消</button>',
      '      <button type="button" class="btn" id="mpOk">确定这个范围</button>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('');
    document.body.appendChild(modal);

    modal.querySelector('#mpClose').onclick = close;
    modal.querySelector('#mpCancel').onclick = close;
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

    modal.querySelector('.mp-bar').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.bm) {
        modal.querySelectorAll('.mp-chip[data-bm]').forEach(function (x) { x.classList.toggle('on', x === b); });
        if (inst) inst.setBasemap(b.dataset.bm);
        return;
      }
      if (b.id === 'mpLocate') locate(inst, function (msg) { modal.querySelector('#mpCoord').textContent = msg; });
    });

    function syncRadius(v) {
      v = Math.max(30, Math.min(20000, +v || 300));
      modal.querySelector('#mpRadius').value = v;
      modal.querySelector('#mpRange').value = Math.min(3000, v);
      if (inst) { inst.setRadius(v); paint(inst.getValue()); }
    }
    modal.querySelector('#mpRange').oninput = function () { syncRadius(this.value); };
    modal.querySelector('#mpRadius').oninput = function () { syncRadius(this.value); };
    modal.querySelector('#mpOk').onclick = function () {
      var v = inst ? inst.getValue() : null;
      var f = cb; close();
      if (v && typeof f === 'function') f(v);
    };
    return modal;
  }

  function paint(v) {
    if (!v || !modal) return;
    modal.querySelector('#mpCoord').innerHTML =
      '圆心 <b>' + v.lat.toFixed(6) + ', ' + v.lng.toFixed(6) + '</b>' +
      '　半径 <b>' + fmtMeters(v.radius) + '</b>';
  }

  function locate(target, say) {
    if (!target) return;
    if (!navigator.geolocation) { say('当前浏览器不支持定位'); return; }
    say('正在定位…');
    navigator.geolocation.getCurrentPosition(function (p) {
      target.setPoint(p.coords.latitude, p.coords.longitude, true);
      paint(target.getValue());
    }, function (err) {
      say('定位失败：' + (err && err.code === 1 ? '未授权位置权限' : '无法获取位置') + '，可手动点选');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  }

  function close() {
    if (!modal) return;
    modal.style.display = 'none';
    if (inst) { inst.destroy(); inst = null; }
  }

  function openModal(opts) {
    opts = opts || {};
    buildModal();
    cb = opts.onOk;
    modal.querySelector('#mpTitle').textContent = opts.title || '在地图上选择打卡范围';
    modal.querySelector('.mp-chip[data-bm="street"]').classList.add('on');
    modal.querySelector('.mp-chip[data-bm="sat"]').classList.remove('on');
    modal.style.display = 'flex';
    var r = Math.max(30, +opts.radius || 300);
    modal.querySelector('#mpRadius').value = r;
    modal.querySelector('#mpRange').value = Math.min(3000, r);
    setTimeout(function () {
      inst = create(modal.querySelector('#mpMap'), {
        lat: opts.lat, lng: opts.lng, radius: r,
        onChange: function (v) { paint(v); },
      });
      inst.invalidate();
      inst.fit();
      paint(inst.getValue());
    }, 60);
  }

  window.MapPick = { create: create, openModal: openModal, close: close, fmtMeters: fmtMeters };
})();
