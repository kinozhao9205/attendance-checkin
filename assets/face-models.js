/* 人脸模型加载器：多源竞速 + 逐模型进度 + 失败换源重试
 * 用途：打卡页（拍照录入 / 实时识别）与管理后台（员工录入）共用
 *
 * 为什么要多源：face-api 三个模型共约 7.7MB，GitHub Pages 在弱网/跨境下经常
 * 下到一半断流，用户看到「模型加载失败（需联网）」。这里先探本地源（有 SW 缓存），
 * 2.5 秒内没响应就并发探测 jsDelivr 各镜像，选最快的那个加载；单个模型失败会自动
 * 换下一个源重试。 */
(function () {
  'use strict';
  var LOCAL = 'assets/vendor/models';
  // 国内自有服务器（阿里云）：比 GitHub Pages 快 3 倍以上，弱网下最稳
  var DOMESTIC = 'https://www.bydtyr.com/att-api/assets/vendor/models';
  var CDN = [
    'https://gcore.jsdelivr.net/gh/kinozhao9205/attendance-checkin@main/assets/vendor/models',
    'https://cdn.jsdelivr.net/gh/kinozhao9205/attendance-checkin@main/assets/vendor/models',
    'https://fastly.jsdelivr.net/gh/kinozhao9205/attendance-checkin@main/assets/vendor/models'
  ];
  var PROBE = '/tiny_face_detector_model-weights_manifest.json';
  var picked = null;

  function timeout(p, ms) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(new Error('timeout')); }, ms);
      p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
    });
  }
  async function probe(base) {
    var t0 = Date.now();
    var r = await timeout(fetch(base + PROBE, { cache: 'no-store' }), 6000);
    if (!r.ok) throw new Error('http ' + r.status);
    await r.text();
    return Date.now() - t0;
  }

  async function pickBase() {
    if (picked) return picked;
    // 本地源优先（Service Worker 会缓存，第二次打开直接命中）
    try { await timeout(probe(LOCAL), 2500); picked = LOCAL; return picked; } catch (e) {}
    // 本地源不可用：国内自有源 + 各 CDN 并发探速，取最快的
    var rs = await Promise.all([DOMESTIC].concat(CDN).map(function (b) {
      return probe(b).then(function (t) { return { b: b, t: t }; }, function () { return null; });
    }));
    var ok = rs.filter(Boolean).sort(function (a, b) { return a.t - b.t; });
    picked = ok.length ? ok[0].b : LOCAL;
    return picked;
  }

  async function loadNet(api, name, bases) {
    var last;
    for (var i = 0; i < bases.length; i++) {
      try {
        // 单模型 90 秒没下完就换下一个源（弱网下 fetch 可能既不报错也不结束）
        await timeout(api.nets[name].loadFromUri(bases[i]), 90000);
        return bases[i];
      } catch (e) { last = e; }
    }
    throw last || new Error('model load failed');
  }

  window.FaceModels = {
    /**
     * @param {{tinyLandmark?:boolean, onProgress?:(i:number,total:number,label:string)=>void}} opts
     * @returns {Promise<string>} 实际使用的模型源
     */
    load: async function (opts) {
      opts = opts || {};
      var api = window.faceapi;
      if (!api) throw new Error('face-api 未加载');
      var base = await pickBase();
      var order = [base].concat([LOCAL, DOMESTIC].concat(CDN).filter(function (b) { return b !== base; }));
      var lmName = opts.tinyLandmark === false ? 'faceLandmark68Net' : 'faceLandmark68TinyNet';
      var steps = [
        ['tinyFaceDetector', '检测模型'],
        [lmName, '关键点模型'],
        ['faceRecognitionNet', '特征模型']
      ];
      for (var i = 0; i < steps.length; i++) {
        if (opts.onProgress) { try { opts.onProgress(i + 1, steps.length, steps[i][1]); } catch (e) {} }
        try {
          await loadNet(api, steps[i][0], order);
        } catch (e) {
          if (steps[i][0] === 'faceLandmark68TinyNet') {
            // tiny 关键点缺失/失败 → 回落标准版，不整条链路失败
            await loadNet(api, 'faceLandmark68Net', order);
            opts.tinyLandmark = false;
          } else { throw e; }
        }
      }
      return base;
    },
    reset: function () { picked = null; },
    get source() { return picked; }
  };
})();
