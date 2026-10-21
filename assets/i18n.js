/* 多语言支持：中文 / English / O'zbekcha（三语，全站统一）
 * 移植自「海外员工打卡程序」，与考勤后台共用同一套 key。 */
const I18N = {
  zh: {
    /* 通用 */
    app_title: '考勤系统', login: '登录', logout: '退出', admin_login: '管理员登录', employee_login: '员工登录',
    username: '用户名', password: '密码', employee_no: '工号', pin: '打卡密码', name: '姓名',
    save: '保存', cancel: '取消', edit: '编辑', delete: '删除', close: '关闭',
    query: '查询', all: '全部', today: '今天', date: '日期', status: '状态', lang: '语言',
    loading: '加载中...', save_ok: '保存成功', save_fail: '保存失败', settings: '设置',
    /* 登录页 */
    login_failed: '账号或密码错误', too_many: '登录尝试过于频繁，请稍后再试', fields_required: '请填写完整',
    net_error: '网络异常：无法连接打卡服务器，请检查网络后重试（账号密码无误也会出现此提示）',
    net_timeout: '连接超时：网络不稳定或无法访问服务器，请稍后重试',
    need_login: '登录已过期，请重新登录',
    login_hint_emp: '使用工号与打卡密码登录，随后进行人脸识别打卡',
    login_hint_admin: '仅限考勤管理员使用，登录后可管理员工与打卡数据',
    logging_in: '登录中…', get_app: '下载手机客户端',
    pwd_show: '显示密码', pwd_hide: '隐藏密码',
    /* 员工打卡页 */
    emp_title: '员工打卡', enter_punch: '进入打卡', punch_in: '上班打卡', punch_out: '下班打卡',
    /* 自助注册 + 首次人脸录入 */
    reg_link: '没有账号？自助注册', reg_back_login: '已有账号？返回登录',
    reg_title: '自助注册', reg_empno_hint: '留空自动生成',
    reg_pin2: '确认打卡密码', reg_country: '所在国家', reg_tz: '时区', reg_optional: '选填',
    reg_submit: '注册并进入打卡', reg_pin_mismatch: '两次输入的密码不一致',
    reg_ok: '注册成功！请牢记工号与打卡密码', enroll_title: '首次使用：拍照录入人脸',
    enroll_desc: '首次打卡前请录入人脸底库：点击下方按钮拍一张清晰正脸照片，系统自动识别，只保存特征值、不上传照片。',
    enroll_btn: '拍照录入人脸', enroll_ok: '人脸录入成功，可以开始打卡了', enroll_fail: '人脸录入失败',
    enroll_photo_wait: '请拍照：把脸放在画面中间，光线充足', enroll_reading: '正在识别照片…',
    enroll_saving: '照片已识别，正在保存…', enroll_retry_hint: '未通过，请重新拍照',
    enroll_photo_bad: '照片里没有清晰正脸，请正对镜头、光线充足后重拍',
    enroll_photo_hint: '无需开启实时摄像头，点下方按钮拍照即可录入',
    photo_bad: '图片读取失败，请重新拍照', face_pending: '待录入人脸',
    phone: '手机号（选填）', change_pin_ok: '密码修改成功',
    dd_login: '钉钉一键登录', dd_fail: '钉钉登录失败',
    recognizing: '识别中…', punch_ok_in: '上班打卡成功', punch_ok_out: '下班打卡成功',
    punch_done: '今日打卡完成', please_out: '请于下班时再次打卡', waiting_out: '等待下班打卡',
    /* 覆盖最后一次下班打卡 */
    punch_again: '重新打卡', overwrite_title: '覆盖下班打卡？',
    overwrite_body: '今日已完成两次打卡。是否用本次打卡覆盖最后一次下班时间 {t}？',
    overwrite_ask: '请确认是否覆盖最后一次下班打卡', overwrite_ok: '确认覆盖',
    overwrite_done: '已覆盖下班打卡', overwrite_cancel: '已取消，保留原来的下班打卡',
    overwrite_times: '（该日下班卡已覆盖 {n} 次）',
    punch_fail: '打卡失败', camera_error: '无法访问摄像头，请检查权限（需 HTTPS）',
    face_not_found: '未检测到人脸，请正对摄像头', face_mismatch: '人脸不匹配，请本人操作',
    bad_descriptor: '人脸数据异常，请重新录入', already_done: '今日已完成两次打卡',
    out_of_range: '您不在允许的打卡范围内', location_required: '无法获取定位，请开启定位权限',
    location_error: '定位失败，请开启定位权限', privacy_line: '人脸信息不会被存储或挪作他用，点击查看',
    privacy_link: '隐私协议', privacy_title: '人脸信息隐私协议', privacy_ok: '我已阅读并同意',
    privacy_decline: '不同意，退出', install_btn: '安装到主屏幕',
    install_ios: '点击浏览器底部「分享」→「添加到主屏幕」，即可像 App 一键打卡',
    install_android: '安装到主屏幕，下次像 App 一样一键打卡',
    install_hint: 'iOS 用户：请点击 Safari 底部「分享」，选择「添加到主屏幕」。\n安卓 Chrome：可直接安装。',
    model_ready: '人脸识别就绪', loading_model: '正在加载人脸识别模型，首次约需 10-30 秒…',
    whoami: '身份', time_plan: '今日班次',
    /* 管理员后台 */
    admin_title: '考勤管理后台', change_pwd: '修改密码', change_pwd_title: '修改管理员密码',
    old_pwd: '原密码', new_pwd: '新密码', new_pwd_hint: '新密码（至少 8 位，需同时包含字母和数字）',
    confirm_change: '确认修改', pwd_required: '请填写原密码和新密码', pwd_ok: '密码修改成功',
    employees: '员工列表', add_employee: '添加员工', save_employee: '保存员工', clear: '清空',
    col_no: '工号', col_name: '姓名', col_tz: '时区/国家', col_work: '上下班时间', col_face: '人脸', col_op: '操作',
    col_hours: '工作时长',
    face_set: '已录入', face_none: '未录入', work_start: '上班时间', work_end: '下班时间',
    upload_photo: '上传证件照（用于人脸识别，仅提取特征值存储，不保存照片）',
    stats_title: '打卡统计（每天两次自动汇总）', month: '月份', export_csv: '导出CSV', no_data: '无数据',
    total_records: '总记录', normal: '正常', late: '迟到', early: '早退', late_early: '迟到早退', abnormal: '异常',
    need_no_name: '请输入工号和姓名', need_password: '新员工需设置打卡密码',
    extracting_face: '正在提取人脸特征…', no_face_in_photo: '照片中未检测到清晰人脸，请换一张正面证件照',
    confirm_del: '确定删除该员工？', del_ok: '已删除',
    /* 打卡范围设置 */
    gf_title: '打卡范围设置', gf_mode: '范围模式', gf_off: '不限（任意地点）', gf_region: '行政区范围', gf_circle: '自定义圆形',
    gf_country: '国家', gf_level: '级别', gf_province: '省', gf_city: '市', gf_district: '区',
    gf_state: '州/省', gf_nation: '整个国家', gf_apply: '应用打卡范围', gf_current: '当前范围',
    gf_not_set: '未设置', gf_none_hint: '未设置行政区范围，当前为不限模式（任意地点都可打卡）',
    gf_loading: '加载中…', gf_center: '圆心', gf_radius: '半径（米）', gf_lat: '纬度', gf_lng: '经度',
    gf_pick_country: '请选择国家/地区', gf_pick_level: '请选择级别', gf_pick_region: '请选择地区',
    gf_no_regions: '该国家暂无州/省级数据，请选择「整个国家」或改用自定义圆形',
    gf_applied: '打卡范围已更新', gf_apply_failed: '设置失败',
    gf_source: '来源', meters: '米',
    /* 默认范围 / 员工级范围 / 时区 / 北京时间 */
    gf_default_title: '默认打卡范围',
    gf_default_hint: '员工未单独设置打卡范围时，沿用这里的默认配置。每位员工的打卡范围可在下面「添加/编辑员工」里单独设置。',
    emp_gf_label: '打卡范围（针对该员工）',
    gf_follow_default: '跟随默认设置',
    gf_circle_incomplete: '请把圆心经纬度和半径填写完整',
    col_gf: '打卡范围',
    tz_search: '时区搜索',
    bj_time: '北京',
    bj_same: '与北京同时', bj_faster: '比北京快 {h} 小时', bj_slower: '比北京慢 {h} 小时',
    cam_align: '请将面部对准取景框',
    local_time: '当地', tz_hint: 'UTC 偏移以格林尼治为基准，与北京的时差是另一个基准，两者并不矛盾',
    admin_console: '管理后台', emp_punch_entry: '员工打卡', punch_both: '当地',
    tz_g_asia: '亚洲', tz_g_europe: '欧洲', tz_g_americas: '美洲', tz_g_africa: '非洲',
    tz_g_oceania: '大洋洲', tz_g_atlantic: '大西洋', tz_g_indian: '印度洋',
    tz_g_antarctic: '南极洲', tz_g_arctic: '北极', tz_g_other: '其他',
    /* 打卡位置（仅管理员可见） */
    col_geo: '位置', geo_view: '位置', geo_title: '打卡位置',
    geo_none: '本次打卡没有留下定位记录', geo_coord: '坐标',
    geo_center_dist: '距打卡中心 {d}', geo_addr: '地址',
    geo_addr_loading: '解析地址中…', geo_addr_fail: '未能解析地址，可点下方地图查看',
    geo_open_amap: '高德地图', geo_open_gmaps: 'Google 地图', geo_open_osm: 'OpenStreetMap',
    geo_hint: '坐标来自员工打卡时的手机定位（WGS84），仅管理员可见',
    geo_overwritten: '被覆盖的下班点', geo_no_gps: '无定位记录'
  },
  en: {
    app_title: 'Attendance System', login: 'Login', logout: 'Logout', admin_login: 'Admin Login', employee_login: 'Employee Login',
    username: 'Username', password: 'Password', employee_no: 'Employee No.', pin: 'PIN', name: 'Name',
    save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', close: 'Close',
    query: 'Search', all: 'All', today: 'Today', date: 'Date', status: 'Status', lang: 'Language',
    loading: 'Loading...', save_ok: 'Saved', save_fail: 'Save failed', settings: 'Settings',
    login_failed: 'Wrong account or password', too_many: 'Too many attempts, try again later', fields_required: 'Please fill in all fields',
    net_error: 'Network error: cannot reach the attendance server. Check your connection and retry (correct credentials still show this if the network is down)',
    net_timeout: 'Connection timed out: unstable network or server unreachable, please retry later',
    need_login: 'Session expired, please login again',
    login_hint_emp: 'Sign in with your employee no. and PIN, then verify your face to punch',
    login_hint_admin: 'For attendance administrators only — manage employees and records',
    logging_in: 'Signing in…', get_app: 'Download mobile app',
    pwd_show: 'Show password', pwd_hide: 'Hide password',
    emp_title: 'Employee Attendance', enter_punch: 'Enter', punch_in: 'Check In', punch_out: 'Check Out',
    /* Self registration + first face enrollment */
    reg_link: 'No account? Register', reg_back_login: 'Have an account? Sign in',
    reg_title: 'Self Registration', reg_empno_hint: 'Leave empty to auto-generate',
    reg_pin2: 'Confirm PIN', reg_country: 'Country', reg_tz: 'Time zone', reg_optional: 'optional',
    reg_submit: 'Register & Start', reg_pin_mismatch: 'PINs do not match',
    reg_ok: 'Registered! Keep your employee ID and PIN safe', enroll_title: 'First time: enroll your face with a photo',
    enroll_desc: 'Before your first punch, take one clear frontal photo with the button below. Recognition runs automatically and only the feature values are stored — the photo is never uploaded.',
    enroll_btn: 'Take a photo', enroll_ok: 'Face enrolled. You can punch now', enroll_fail: 'Face enrollment failed',
    enroll_photo_wait: 'Take a photo: centre your face, good lighting', enroll_reading: 'Analyzing photo…',
    enroll_saving: 'Photo recognized, saving…', enroll_retry_hint: 'Not accepted, please retake',
    enroll_photo_bad: 'No clear frontal face in the photo. Face the lens in good light and retake',
    enroll_photo_hint: 'No live camera needed — just tap the button and take a photo',
    photo_bad: 'Cannot read the image, please retake', face_pending: 'Face not enrolled',
    phone: 'Phone (optional)', change_pin_ok: 'PIN changed',
    dd_login: 'DingTalk Login', dd_fail: 'DingTalk login failed',
    recognizing: 'Recognizing…', punch_ok_in: 'Checked in', punch_ok_out: 'Checked out',
    punch_done: 'Done for today', please_out: 'Please check out after work', waiting_out: 'Waiting for check-out',
    punch_again: 'Punch again', overwrite_title: 'Overwrite check-out?',
    overwrite_body: 'You have already punched twice today. Replace the last check-out time {t} with this punch?',
    overwrite_ask: 'Confirm whether to overwrite the last check-out', overwrite_ok: 'Overwrite',
    overwrite_done: 'Check-out overwritten', overwrite_cancel: 'Cancelled — the original check-out is kept',
    overwrite_times: '({n} overwrite(s) that day)',
    punch_fail: 'Punch failed', camera_error: 'Cannot access camera, check permission (HTTPS required)',
    face_not_found: 'No face detected, please face the camera', face_mismatch: 'Face does not match, use your own face',
    bad_descriptor: 'Invalid face data, please re-enroll', already_done: 'You have already punched twice today',
    out_of_range: 'You are outside the allowed punch area', location_required: 'Cannot get location, enable location permission',
    location_error: 'Location failed, enable location permission', privacy_line: 'Facial data is never stored or misused, tap to view',
    privacy_link: 'Privacy Policy', privacy_title: 'Face Data Privacy Policy', privacy_ok: 'I have read and agree',
    privacy_decline: 'Decline & exit', install_btn: 'Install to Home Screen',
    install_ios: 'Tap "Share" at the bottom → "Add to Home Screen" to punch like an app',
    install_android: 'Install to Home Screen and punch like an app next time',
    install_hint: 'iOS: tap Share in Safari, then "Add to Home Screen".\nAndroid Chrome: tap install.',
    model_ready: 'Face recognition ready', loading_model: 'Loading face model, first time takes 10-30s…',
    whoami: 'Identity', time_plan: "Today's shift",
    admin_title: 'Attendance Admin', change_pwd: 'Change Password', change_pwd_title: 'Change Admin Password',
    old_pwd: 'Old password', new_pwd: 'New password', new_pwd_hint: 'New password (min 8 chars, letters and digits)',
    confirm_change: 'Confirm', pwd_required: 'Enter old and new password', pwd_ok: 'Password changed',
    employees: 'Employees', add_employee: 'Add Employee', save_employee: 'Save Employee', clear: 'Clear',
    col_no: 'No.', col_name: 'Name', col_tz: 'Timezone / Country', col_work: 'Work hours', col_face: 'Face', col_op: 'Actions',
    col_hours: 'Work duration',
    face_set: 'Enrolled', face_none: 'Not set', work_start: 'Work start', work_end: 'Work end',
    upload_photo: 'Upload ID photo (features only, photo is never stored)',
    stats_title: 'Statistics (auto-summed, twice daily)', month: 'Month', export_csv: 'Export CSV', no_data: 'No data',
    total_records: 'Total', normal: 'Normal', late: 'Late', early: 'Early leave', late_early: 'Late & Early', abnormal: 'Abnormal',
    need_no_name: 'Enter employee no. and name', need_password: 'New employee needs a PIN',
    extracting_face: 'Extracting facial features…', no_face_in_photo: 'No clear face found, please use another ID photo',
    confirm_del: 'Delete this employee?', del_ok: 'Deleted',
    gf_title: 'Punch Area Settings', gf_mode: 'Mode', gf_off: 'Anywhere (unrestricted)', gf_region: 'Administrative region', gf_circle: 'Custom circle',
    gf_country: 'Country', gf_level: 'Level', gf_province: 'Province', gf_city: 'City', gf_district: 'District',
    gf_state: 'State/Province', gf_nation: 'Whole country', gf_apply: 'Apply punch area', gf_current: 'Current area',
    gf_not_set: 'Not set', gf_none_hint: 'No region set — currently unrestricted (punch anywhere)',
    gf_loading: 'Loading…', gf_center: 'Center', gf_radius: 'Radius (m)', gf_lat: 'Latitude', gf_lng: 'Longitude',
    gf_pick_country: 'Select country/region', gf_pick_level: 'Select level', gf_pick_region: 'Select region',
    gf_no_regions: 'No state/province data for this country — choose "Whole country" or use a custom circle',
    gf_applied: 'Punch area updated', gf_apply_failed: 'Failed to apply',
    gf_source: 'Source', meters: 'm',
    gf_default_title: 'Default punch area',
    gf_default_hint: 'Used when an employee has no punch area of their own. Each employee can override it in the form below.',
    emp_gf_label: 'Punch area (this employee)',
    gf_follow_default: 'Follow default',
    gf_circle_incomplete: 'Please fill in the centre coordinates and radius',
    col_gf: 'Punch area',
    tz_search: 'Search timezone',
    bj_time: 'BJ',
    bj_same: 'same as Beijing', bj_faster: '{h} h ahead of Beijing', bj_slower: '{h} h behind Beijing',
    cam_align: 'Align your face inside the frame',
    local_time: 'Local', tz_hint: 'UTC offset is measured from Greenwich; the difference to Beijing uses another baseline — both are correct',
    admin_console: 'Admin console', emp_punch_entry: 'Employee punch', punch_both: 'Local',
    tz_g_asia: 'Asia', tz_g_europe: 'Europe', tz_g_americas: 'Americas', tz_g_africa: 'Africa',
    tz_g_oceania: 'Oceania', tz_g_atlantic: 'Atlantic', tz_g_indian: 'Indian Ocean',
    tz_g_antarctic: 'Antarctica', tz_g_arctic: 'Arctic', tz_g_other: 'Other',
    col_geo: 'Location', geo_view: 'Location', geo_title: 'Punch Location',
    geo_none: 'No location was recorded for this punch', geo_coord: 'Coordinates',
    geo_center_dist: '{d} from punch centre', geo_addr: 'Address',
    geo_addr_loading: 'Resolving address…', geo_addr_fail: 'Address unavailable — open the map below',
    geo_open_amap: 'Amap', geo_open_gmaps: 'Google Maps', geo_open_osm: 'OpenStreetMap',
    geo_hint: "Coordinates come from the employee's phone GPS at punch time (WGS84), admin-only",
    geo_overwritten: 'Overwritten check-out points', geo_no_gps: 'No location'
  },
  uz: {
    app_title: 'Davomat Tizimi', login: 'Kirish', logout: 'Chiqish', admin_login: 'Administrator kirishi', employee_login: 'Xodim kirishi',
    username: 'Foydalanuvchi', password: 'Parol', employee_no: 'Xodim raqami', pin: 'Parol (PIN)', name: 'Ism',
    save: 'Saqlash', cancel: 'Bekor qilish', edit: 'Tahrirlash', delete: "O'chirish", close: 'Yopish',
    query: 'Qidirish', all: 'Barchasi', today: 'Bugun', date: 'Sana', status: 'Holat', lang: 'Til',
    loading: 'Yuklanmoqda...', save_ok: 'Saqlandi', save_fail: 'Saqlashda xatolik', settings: 'Sozlamalar',
    login_failed: "Login yoki parol noto'g'ri", too_many: "Juda ko'p urinish, keyinroq qayta urinib ko'ring", fields_required: "Barcha maydonlarni to'ldiring",
    net_error: "Tarmoq xatosi: davomat serveriga ulanib bo'lmadi, internetni tekshirib qayta urinib ko'ring",
    net_timeout: "Ulanish vaqti tugadi: tarmoq beqaror yoki serverga kirib bo'lmaydi, keyinroq qayta urinib ko'ring",
    need_login: 'Sessiya tugadi, qayta kiring',
    login_hint_emp: "Xodim raqami va PIN bilan kiring, so'ng yuz orqali belgilang",
    login_hint_admin: "Faqat davomat administratori uchun — xodimlar va yozuvlarni boshqaradi",
    logging_in: 'Kirilmoqda…', get_app: 'Mobil ilovani yuklab olish',
    pwd_show: "Parolni ko'rsatish", pwd_hide: "Parolni yashirish",
    emp_title: 'Xodim davomati', enter_punch: 'Kirish', punch_in: 'Ishga kirish', punch_out: 'Ishdan chiqish',
    /* O'z-o'zidan ro'yxatdan o'tish + yuzni birinchi ro'yxatga olish */
    reg_link: "Akkaunt yo'qmi? Ro'yxatdan o'tish", reg_back_login: "Akkaunt bormi? Kirish",
    reg_title: "O'z-o'zidan ro'yxatdan o'tish", reg_empno_hint: "Bo'sh qoldirsangiz avtomatik yaratiladi",
    reg_pin2: 'Parolni tasdiqlang', reg_country: 'Mamlakat', reg_tz: 'Vaqt zonasi', reg_optional: 'ixtiyoriy',
    reg_submit: "Ro'yxatdan o'tib kirish", reg_pin_mismatch: "Parollar mos kelmadi",
    reg_ok: "Ro'yxatdan o'tdingiz! Xodim raqami va parolni saqlab qo'ying", enroll_title: "Birinchi marta: suratga olib yuzni ro'yxatga olish",
    enroll_desc: "Birinchi belgilashdan oldin quyidagi tugma orqali aniq old yuzdan bitta surat oling. Tanish avtomatik bajariladi, faqat xususiyat qiymatlari saqlanadi — surat yuklanmaydi.",
    enroll_btn: "Suratga olish", enroll_ok: "Yuz qayd etildi. Endi belgilashingiz mumkin", enroll_fail: "Yuzni qayd etish amalga oshmadi",
    enroll_photo_wait: "Suratga oling: yuzingiz markazda, yorug'lik yetarli bo'lsin", enroll_reading: 'Surat tahlil qilinmoqda…',
    enroll_saving: 'Surat aniqlandi, saqlanmoqda…', enroll_retry_hint: "Qabul qilinmadi, qayta suratga oling",
    enroll_photo_bad: "Suratda aniq old yuz topilmadi. Kameraga qarab, yorug'likda qayta suratga oling",
    enroll_photo_hint: "Real vaqtda kamera shart emas — tugmani bosib suratga oling",
    photo_bad: "Rasmni o'qib bo'lmadi, qayta suratga oling", face_pending: "Yuz ro'yxatga olinmagan",
    phone: 'Telefon (ixtiyoriy)', change_pin_ok: 'Parol o‘zgartirildi',
    dd_login: 'DingTalk orqali kirish', dd_fail: 'DingTalk orqali kirish amalga oshmadi',
    recognizing: 'Tekshirilmoqda…', punch_ok_in: 'Ishga kirish belgilandi', punch_ok_out: 'Ishdan chiqish belgilandi',
    punch_done: 'Bugun tugadi', please_out: 'Ishdan chiqqanda yana belgilang', waiting_out: 'Ishdan chiqishni kutmoqda',
    punch_again: 'Qayta belgilash', overwrite_title: 'Ishdan chiqishni almashtirish?',
    overwrite_body: "Bugun ikki marta belgilangan. Oxirgi ishdan chiqish vaqtini ({t}) shu belgi bilan almashtirasizmi?",
    overwrite_ask: "Oxirgi ishdan chiqishni almashtirishni tasdiqlang", overwrite_ok: 'Almashtirish',
    overwrite_done: 'Ishdan chiqish almashtirildi', overwrite_cancel: 'Bekor qilindi — asl belgi saqlanadi',
    overwrite_times: "(o'sha kun {n} marta almashtirilgan)",
    punch_fail: 'Belgilashda xatolik', camera_error: "Kamerani ochib bo'lmadi, ruxsatni tekshiring (HTTPS kerak)",
    face_not_found: 'Yuz aniqlanmadi, kameraga qarang', face_mismatch: "Yuz mos kelmadi, o'zingizni skanerlang",
    bad_descriptor: "Yuz ma'lumotida xato, qayta ro'yxatdan o'ting", already_done: 'Bugun allaqachon ikki marta belgilangan',
    out_of_range: "Ruxsat etilgan hududdan tashqaridasiz", location_required: "Joylashuv olinmadi, ruxsat bering",
    location_error: "Joylashuv xatosi, ruxsat bering", privacy_line: "Yuz ma'lumotlari saqlanmaydi va boshqa maqsadda ishlatilmaydi, ko'rish uchun bosing",
    privacy_link: 'Maxfiylik shartnomasi', privacy_title: "Yuz Ma'lumotlari Maxfiylik Siyosati", privacy_ok: "O'qib chiqdim va roziman",
    privacy_decline: 'Rad etish va chiqish', install_btn: "Asosiy ekranga o'rnatish",
    install_ios: 'Pastdagi "Ulashish" → "Asosiy ekranga qo\'shish" tugmasini bosing',
    install_android: "Asosiy ekranga o'rnating, keyingi safar ilova kabi belgilang",
    install_hint: 'iOS: Safari\'da "Ulashish" → "Asosiy ekranga qo\'shish".\nAndroid Chrome: o\'rnatish tugmasini bosing.',
    model_ready: 'Yuzni aniqlash tayyor', loading_model: 'Yuz modeli yuklanmoqda, birinchi marta 10-30 soniya…',
    whoami: 'Shaxs', time_plan: 'Bugungi smena',
    admin_title: 'Davomat boshqaruvi', change_pwd: "Parolni o'zgartirish", change_pwd_title: "Administrator parolini o'zgartirish",
    old_pwd: 'Eski parol', new_pwd: 'Yangi parol', new_pwd_hint: "Yangi parol (kamida 8 belgi, harf va raqam)",
    confirm_change: 'Tasdiqlash', pwd_required: 'Eski va yangi parolni kiriting', pwd_ok: "Parol o'zgartirildi",
    employees: 'Xodimlar', add_employee: "Xodim qo'shish", save_employee: 'Xodimni saqlash', clear: 'Tozalash',
    col_no: 'Raqam', col_name: 'Ism', col_tz: 'Vaqt mintaqasi / Davlat', col_work: 'Ish vaqti', col_face: 'Yuz', col_op: 'Amallar',
    col_hours: 'Ish davomiyligi',
    face_set: "Ro'yxatda", face_none: "Yo'q", work_start: 'Ishga kirish', work_end: 'Ishdan chiqish',
    upload_photo: "Hujjat rasmini yuklang (faqat xususiyatlar saqlanadi, surat saqlanmaydi)",
    stats_title: 'Statistika (kuniga ikki marta avtomatik)', month: 'Oy', export_csv: 'CSV yuklab olish', no_data: "Ma'lumot yo'q",
    total_records: 'Jami', normal: 'Normal', late: 'Kechikkan', early: 'Erta chiqqan', late_early: 'Kechikkan va erta', abnormal: 'Anomaliya',
    need_no_name: 'Raqam va ismni kiriting', need_password: 'Yangi xodimga PIN kerak',
    extracting_face: 'Yuz xususiyatlari olinmoqda…', no_face_in_photo: "Rasmda aniq yuz topilmadi, boshqa rasm yuklang",
    confirm_del: "Xodimni o'chirishni tasdiqlaysizmi?", del_ok: "O'chirildi",
    gf_title: 'Belgilash hududi sozlamalari', gf_mode: 'Rejim', gf_off: 'Cheklanmagan', gf_region: 'Ma\'muriy hudud', gf_circle: 'Doira shaklida',
    gf_country: 'Davlat', gf_level: 'Daraja', gf_province: 'Viloyat', gf_city: 'Shahar', gf_district: 'Tuman',
    gf_state: 'Shtat/Viloyat', gf_nation: 'Butun davlat', gf_apply: 'Hududni qo\'llash', gf_current: 'Joriy hudud',
    gf_not_set: "O'rnatilmagan", gf_none_hint: "Hudud o'rnatilmagan — hozir cheklanmagan (istalgan joyda belgilash mumkin)",
    gf_loading: 'Yuklanmoqda…', gf_center: 'Markaz', gf_radius: 'Radius (m)', gf_lat: 'Kenglik', gf_lng: 'Uzunlik',
    gf_pick_country: 'Davlatni tanlang', gf_pick_level: 'Darajani tanlang', gf_pick_region: 'Hududni tanlang',
    gf_no_regions: 'Bu davlat uchun viloyat ma\'lumotlari yo\'q — "Butun davlat" yoki doira rejimini tanlang',
    gf_applied: 'Hudud yangilandi', gf_apply_failed: 'Qo\'llashda xatolik',
    gf_source: 'Manba', meters: 'm',
    gf_default_title: 'Standart hudud',
    gf_default_hint: "Xodim o'z hududini belgilamagan bo'lsa, shu sozlama qo'llanadi. Har bir xodim uchun hududni quyidagi shaklda alohida belgilash mumkin.",
    emp_gf_label: 'Belgilash hududi (shu xodim uchun)',
    gf_follow_default: 'Standartga rioya qilish',
    gf_circle_incomplete: "Markaz koordinatalari va radiusni to'ldiring",
    col_gf: 'Hudud',
    tz_search: 'Vaqt mintaqasini qidirish',
    bj_time: 'Pekin',
    bj_same: 'Pekin bilan bir xil', bj_faster: 'Pekindan {h} soat oldinda', bj_slower: 'Pekindan {h} soat orqada',
    cam_align: 'Yuzingizni ramka ichiga joylashtiring',
    local_time: 'Mahalliy', tz_hint: "UTC siljishi Grinvichga nisbatan; Pekin bilan farq boshqa asosda — ikkalasi ham to'g'ri",
    admin_console: 'Administrator paneli', emp_punch_entry: 'Xodim belgisi', punch_both: 'Mahalliy',
    tz_g_asia: 'Osiyo', tz_g_europe: 'Yevropa', tz_g_americas: 'Amerika', tz_g_africa: 'Afrika',
    tz_g_oceania: 'Okeaniya', tz_g_atlantic: 'Atlantika', tz_g_indian: 'Hind okeani',
    tz_g_antarctic: 'Antarktida', tz_g_arctic: 'Arktika', tz_g_other: 'Boshqa',
    col_geo: 'Joylashuv', geo_view: 'Joylashuv', geo_title: 'Belgilash joylashuvi',
    geo_none: "Bu belgi uchun joylashuv qayd etilmagan", geo_coord: 'Koordinatalar',
    geo_center_dist: 'Markazdan {d}', geo_addr: 'Manzil',
    geo_addr_loading: 'Manzil aniqlanmoqda…', geo_addr_fail: "Manzil aniqlanmadi — quyidagi xaritani oching",
    geo_open_amap: 'Amap', geo_open_gmaps: 'Google Maps', geo_open_osm: 'OpenStreetMap',
    geo_hint: "Koordinatalar xodim telefonining GPS idan olingan (WGS84), faqat administrator uchun",
    geo_overwritten: 'Almashtirilgan chiqish nuqtalari', geo_no_gps: 'Joylashuv yo\'q'
  }
};

const LANGS = ['zh', 'en', 'uz'];
const LANG_LABELS = { zh: '中文', en: 'EN', uz: 'UZ' };
// 首次进入：按手机/浏览器系统语言自动选择（zh/en/uz），之后以用户手动选择为准
let currentLang = localStorage.getItem('att_lang');
if (!currentLang || !LANGS.includes(currentLang)) {
  const nav = String((typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage)) || '').toLowerCase();
  currentLang = nav.indexOf('uz') === 0 ? 'uz' : (nav.indexOf('en') === 0 ? 'en' : (nav.indexOf('zh') === 0 ? 'zh' : 'zh'));
  try { localStorage.setItem('att_lang', currentLang); } catch (e) {}
}

function tr(key, fallback) {
  const dict = I18N[currentLang] || I18N.zh;
  return dict[key] || I18N.zh[key] || fallback || key;
}

/* 把「相对北京」的分钟差格式化为本地化文案 */
function fmtHours(min) {
  const h = Math.abs(min) / 60;
  return String(Math.round(h * 100) / 100);
}
function bjDiffText(min) {
  if (min === null || min === undefined || min === '') return '';
  const n = Number(min);
  if (!isFinite(n)) return '';
  if (n === 0) return tr('bj_same');
  return tr(n > 0 ? 'bj_faster' : 'bj_slower').replace('{h}', fmtHours(n));
}

/* 由 IANA 时区名计算相对 UTC 的分钟偏移（跨浏览器兼容写法） */
function tzOffsetMinutes(tz, date) {
  if (!tz) return 0;
  try {
    const now = date || new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    return Math.round((tzDate - utcDate) / 60000);
  } catch (e) { return 0; }
}

function applyI18n() {
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : currentLang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = tr(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = tr(el.dataset.i18nTitle); });
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === currentLang));
  document.dispatchEvent(new CustomEvent('langchange'));
}

function setLang(l) {
  if (!LANGS.includes(l)) return;
  currentLang = l;
  localStorage.setItem('att_lang', l);
  applyI18n();
}

/* 渲染三段式语言切换器：中文 | EN | UZ */
function renderLangSwitcher(containerId) {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = '';
  LANGS.forEach(l => {
    const b = document.createElement('button');
    b.className = 'lang-btn' + (l === currentLang ? ' active' : '');
    b.dataset.lang = l;
    b.type = 'button';
    b.textContent = LANG_LABELS[l];
    b.onclick = () => setLang(l);
    box.appendChild(b);
  });
}
