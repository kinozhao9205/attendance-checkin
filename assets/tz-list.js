/* 时区选项表（IANA 时区 ID → 中文说明）
 * 只用于下拉选择，不用手填。UTC 偏移在页面里按当前日期实时计算（含夏令时）。
 * 需要新增时区：往对应分组的 items 里加一行 ['America/New_York', '美国 · 纽约'] 即可。 */
window.TZ_GROUPS = [
  { name: '亚洲', items: [
    ['Asia/Shanghai', '中国 · 北京 / 上海'],
    ['Asia/Hong_Kong', '中国香港'],
    ['Asia/Macau', '中国澳门'],
    ['Asia/Taipei', '中国台湾 · 台北'],
    ['Asia/Tokyo', '日本 · 东京'],
    ['Asia/Seoul', '韩国 · 首尔'],
    ['Asia/Singapore', '新加坡'],
    ['Asia/Kuala_Lumpur', '马来西亚 · 吉隆坡'],
    ['Asia/Bangkok', '泰国 · 曼谷'],
    ['Asia/Jakarta', '印度尼西亚 · 雅加达'],
    ['Asia/Manila', '菲律宾 · 马尼拉'],
    ['Asia/Ho_Chi_Minh', '越南 · 胡志明市'],
    ['Asia/Hanoi', '越南 · 河内'],
    ['Asia/Phnom_Penh', '柬埔寨 · 金边'],
    ['Asia/Vientiane', '老挝 · 万象'],
    ['Asia/Yangon', '缅甸 · 仰光'],
    ['Asia/Dhaka', '孟加拉 · 达卡'],
    ['Asia/Kolkata', '印度 · 加尔各答'],
    ['Asia/Kathmandu', '尼泊尔 · 加德满都'],
    ['Asia/Colombo', '斯里兰卡 · 科伦坡'],
    ['Asia/Karachi', '巴基斯坦 · 卡拉奇'],
    ['Asia/Dubai', '阿联酋 · 迪拜'],
    ['Asia/Riyadh', '沙特 · 利雅得'],
    ['Asia/Qatar', '卡塔尔 · 多哈'],
    ['Asia/Kuwait', '科威特'],
    ['Asia/Tehran', '伊朗 · 德黑兰'],
    ['Asia/Baghdad', '伊拉克 · 巴格达'],
    ['Asia/Jerusalem', '以色列 · 耶路撒冷'],
    ['Asia/Istanbul', '土耳其 · 伊斯坦布尔'],
    ['Asia/Tashkent', '乌兹别克斯坦 · 塔什干'],
    ['Asia/Samarkand', '乌兹别克斯坦 · 撒马尔罕'],
    ['Asia/Almaty', '哈萨克斯坦 · 阿拉木图'],
    ['Asia/Aqtobe', '哈萨克斯坦 · 阿克托别'],
    ['Asia/Bishkek', '吉尔吉斯斯坦 · 比什凯克'],
    ['Asia/Dushanbe', '塔吉克斯坦 · 杜尚别'],
    ['Asia/Ashgabat', '土库曼斯坦 · 阿什哈巴德'],
    ['Asia/Baku', '阿塞拜疆 · 巴库'],
    ['Asia/Tbilisi', '格鲁吉亚 · 第比利斯'],
    ['Asia/Yerevan', '亚美尼亚 · 埃里温'],
    ['Asia/Kabul', '阿富汗 · 喀布尔'],
  ] },
  { name: '欧洲', items: [
    ['Europe/London', '英国 · 伦敦'],
    ['Europe/Dublin', '爱尔兰 · 都柏林'],
    ['Europe/Lisbon', '葡萄牙 · 里斯本'],
    ['Europe/Madrid', '西班牙 · 马德里'],
    ['Europe/Paris', '法国 · 巴黎'],
    ['Europe/Amsterdam', '荷兰 · 阿姆斯特丹'],
    ['Europe/Brussels', '比利时 · 布鲁塞尔'],
    ['Europe/Zurich', '瑞士 · 苏黎世'],
    ['Europe/Berlin', '德国 · 柏林'],
    ['Europe/Munich', '德国 · 慕尼黑'],
    ['Europe/Vienna', '奥地利 · 维也纳'],
    ['Europe/Rome', '意大利 · 罗马'],
    ['Europe/Copenhagen', '丹麦 · 哥本哈根'],
    ['Europe/Stockholm', '瑞典 · 斯德哥尔摩'],
    ['Europe/Oslo', '挪威 · 奥斯陆'],
    ['Europe/Helsinki', '芬兰 · 赫尔辛基'],
    ['Europe/Warsaw', '波兰 · 华沙'],
    ['Europe/Prague', '捷克 · 布拉格'],
    ['Europe/Budapest', '匈牙利 · 布达佩斯'],
    ['Europe/Athens', '希腊 · 雅典'],
    ['Europe/Bucharest', '罗马尼亚 · 布加勒斯特'],
    ['Europe/Kyiv', '乌克兰 · 基辅'],
    ['Europe/Moscow', '俄罗斯 · 莫斯科'],
    ['Europe/Minsk', '白俄罗斯 · 明斯克'],
  ] },
  { name: '美洲', items: [
    ['America/New_York', '美国 · 纽约（东部）'],
    ['America/Chicago', '美国 · 芝加哥（中部）'],
    ['America/Denver', '美国 · 丹佛（山地）'],
    ['America/Los_Angeles', '美国 · 洛杉矶（太平洋）'],
    ['America/Anchorage', '美国 · 安克雷奇'],
    ['Pacific/Honolulu', '美国 · 夏威夷'],
    ['America/Toronto', '加拿大 · 多伦多'],
    ['America/Vancouver', '加拿大 · 温哥华'],
    ['America/Mexico_City', '墨西哥 · 墨西哥城'],
    ['America/Bogota', '哥伦比亚 · 波哥大'],
    ['America/Lima', '秘鲁 · 利马'],
    ['America/Santiago', '智利 · 圣地亚哥'],
    ['America/Sao_Paulo', '巴西 · 圣保罗'],
    ['America/Argentina/Buenos_Aires', '阿根廷 · 布宜诺斯艾利斯'],
  ] },
  { name: '非洲', items: [
    ['Africa/Cairo', '埃及 · 开罗'],
    ['Africa/Casablanca', '摩洛哥 · 卡萨布兰卡'],
    ['Africa/Lagos', '尼日利亚 · 拉各斯'],
    ['Africa/Accra', '加纳 · 阿克拉'],
    ['Africa/Nairobi', '肯尼亚 · 内罗毕'],
    ['Africa/Addis_Ababa', '埃塞俄比亚 · 亚的斯亚贝巴'],
    ['Africa/Dar_es_Salaam', '坦桑尼亚 · 达累斯萨拉姆'],
    ['Africa/Johannesburg', '南非 · 约翰内斯堡'],
    ['Africa/Algiers', '阿尔及利亚 · 阿尔及尔'],
  ] },
  { name: '大洋洲', items: [
    ['Australia/Sydney', '澳大利亚 · 悉尼'],
    ['Australia/Melbourne', '澳大利亚 · 墨尔本'],
    ['Australia/Brisbane', '澳大利亚 · 布里斯班'],
    ['Australia/Perth', '澳大利亚 · 珀斯'],
    ['Pacific/Auckland', '新西兰 · 奥克兰'],
    ['Pacific/Fiji', '斐济 · 苏瓦'],
  ] },
  { name: '其它', items: [
    ['UTC', '协调世界时 UTC±0'],
  ] },
];

/* 当前时刻的 UTC 偏移文本，如 UTC+8 / UTC-5 / UTC+5:30（自动跟随夏令时） */
window.tzOffsetText = function (tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(new Date());
    const v = (parts.find((p) => p.type === 'timeZoneName') || {}).value || '';
    const m = v.match(/GMT([+-]\d{1,2}(?::\d{2})?)?/);
    if (!m) return '';
    return 'UTC' + (m[1] || '+0');
  } catch (e) { return ''; }
};

/* 生成 <optgroup> 结构的时区下拉 HTML；selected 为当前值 */
window.tzOptionsHTML = function (selected) {
  const groups = window.TZ_GROUPS || [];
  const has = groups.some((g) => g.items.some((it) => it[0] === selected));
  return groups.map((g) => '<optgroup label="' + g.name + '">' + g.items.map((it) => {
    const off = window.tzOffsetText(it[0]);
    return '<option value="' + it[0] + '"' + (it[0] === selected ? ' selected' : '') + '>' +
      it[1] + ' · ' + it[0] + (off ? '（' + off + '）' : '') + '</option>';
  }).join('') + '</optgroup>').join('') +
    (!has && selected ? '<optgroup label="当前值"><option value="' + selected + '" selected>' + selected + '</option></optgroup>' : '');
};

/* 国家 ISO → 常用时区（选国家时自动带出默认时区） */
window.TZ_BY_COUNTRY = {
  CN: 'Asia/Shanghai', HK: 'Asia/Hong_Kong', MO: 'Asia/Macau', TW: 'Asia/Taipei',
  UZ: 'Asia/Tashkent', KZ: 'Asia/Almaty', KG: 'Asia/Bishkek', TJ: 'Asia/Dushanbe', TM: 'Asia/Ashgabat',
  RU: 'Europe/Moscow', US: 'America/New_York', CA: 'America/Toronto', MX: 'America/Mexico_City',
  JP: 'Asia/Tokyo', KR: 'Asia/Seoul', SG: 'Asia/Singapore', MY: 'Asia/Kuala_Lumpur', TH: 'Asia/Bangkok',
  ID: 'Asia/Jakarta', PH: 'Asia/Manila', VN: 'Asia/Ho_Chi_Minh', MM: 'Asia/Yangon', BD: 'Asia/Dhaka',
  IN: 'Asia/Kolkata', PK: 'Asia/Karachi', AE: 'Asia/Dubai', SA: 'Asia/Riyadh', QA: 'Asia/Qatar',
  TR: 'Asia/Istanbul', IL: 'Asia/Jerusalem', IR: 'Asia/Tehran', GB: 'Europe/London', DE: 'Europe/Berlin',
  FR: 'Europe/Paris', NL: 'Europe/Amsterdam', BE: 'Europe/Brussels', CH: 'Europe/Zurich', AT: 'Europe/Vienna',
  IT: 'Europe/Rome', ES: 'Europe/Madrid', PT: 'Europe/Lisbon', IE: 'Europe/Dublin', DK: 'Europe/Copenhagen',
  SE: 'Europe/Stockholm', NO: 'Europe/Oslo', FI: 'Europe/Helsinki', PL: 'Europe/Warsaw', CZ: 'Europe/Prague',
  HU: 'Europe/Budapest', GR: 'Europe/Athens', RO: 'Europe/Bucharest', UA: 'Europe/Kyiv', BY: 'Europe/Minsk',
  EG: 'Africa/Cairo', MA: 'Africa/Casablanca', NG: 'Africa/Lagos', GH: 'Africa/Accra', KE: 'Africa/Nairobi',
  ET: 'Africa/Addis_Ababa', TZ: 'Africa/Dar_es_Salaam', ZA: 'Africa/Johannesburg', DZ: 'Africa/Algiers',
  AU: 'Australia/Sydney', NZ: 'Pacific/Auckland', FJ: 'Pacific/Fiji',
};
