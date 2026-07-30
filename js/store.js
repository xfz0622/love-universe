/* ===== 【我们的恋爱小宇宙】数据层 - GitHub 同步版 ===== */

// 获取当前暗号前缀（用于数据隔离）
function _getPasscodePrefix() {
  const hash = sessionStorage.getItem('love_token');
  if (!hash) return 'love_';
  // 取 hash 前8位作为短标识，兼顾可读性和唯一性
  return 'love_' + hash.substring(0, 8) + '_';
}

// 动态生成带暗号前缀的 STORE_KEYS
function _getStoreKeys() {
  const prefix = _getPasscodePrefix();
  return {
    profile: prefix + 'profile',
    anniversaries: prefix + 'anniversaries',
    travels: prefix + 'travels',
    foods: prefix + 'foods',
    shopping: prefix + 'shopping',
    ledger: prefix + 'ledger',
    inspiration: prefix + 'inspiration'
  };
}

const DEFAULT_PROFILE = {
  id: 'profile_001',
  togetherDate: '2026-07-17',
  nicknameA: '小宇宙',
  nicknameB: '小星星',
  couplePhoto: '',
  photoUrl: '',
  declaration: '在浩瀚宇宙中相遇，从此星光有了归处。'
};

// ===== 灵感库（保持不变） =====
const DEFAULT_INSPIRATION = [
  { id: 'insp_001', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=情侣必做100件小事&type=51', screenshot: '', summary: '📋 情侣必做的100件小事清单：一起看日出、一起做饭、一起养一只猫…把普通日子过成专属浪漫。', tags: ['清单', '日常', '情侣活动'], createdAt: '' },
  { id: 'insp_002', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=情侣拍照姿势氛围感&type=51', screenshot: '', summary: '📸 情侣拍照姿势大全：9个万能模板从自拍到剪影，手把手教你拍出氛围感神仙合照。', tags: ['拍照', '日常', '氛围感'], createdAt: '' },
  { id: 'insp_003', platform: '抖音', url: 'https://www.douyin.com/search/情侣日常高甜瞬间', screenshot: '', summary: '💕 情侣高甜日常合集：从早安吻到晚安抱，那些让人心动的生活碎片，看完想立刻去拥抱TA。', tags: ['日常', '甜蜜'], createdAt: '' },
  { id: 'insp_004', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=情侣恋爱保鲜秘诀长期关系&type=51', screenshot: '', summary: '💡 长期恋爱保鲜秘诀：热恋期过后的相处之道，如何让爱情持续升温的N个实用技巧。', tags: ['技巧', '长期关系', '升温'], createdAt: '' },
  { id: 'insp_005', platform: '抖音', url: 'https://www.douyin.com/search/情侣升温小游戏', screenshot: '', summary: '🎮 情侣升温小游戏合集：真心话大冒险升级版、默契考验、双人挑战…让感情越来越好的互动游戏。', tags: ['游戏', '升温', '日常'], createdAt: '' },
  { id: 'insp_006', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=情侣vlog拍摄教程日常记录&type=51', screenshot: '', summary: '🎬 情侣Vlog拍摄教程：零基础也能拍出电影感日常，记录属于两个人的小宇宙。', tags: ['Vlog', '记录', '日常'], createdAt: '' },
  { id: 'insp_007', platform: '抖音', url: 'https://www.douyin.com/search/情侣穿搭同色系高级感', screenshot: '', summary: '👫 情侣穿搭灵感：同色系叠穿低调秀恩爱，莫兰迪配色高级不土味，出门就是行走的画报。', tags: ['穿搭', '日常', '高级感'], createdAt: '' },
  { id: 'insp_008', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=情侣居家约会创意低成本浪漫&type=51', screenshot: '', summary: '🏠 低成本居家约会创意：天台电影夜、手作陶艺、双人厨房挑战…不花钱也能浪漫满分的约会idea合集。', tags: ['约会', '周末', '低成本', '居家'], createdAt: '' },
  { id: 'insp_009', platform: '抖音', url: 'https://www.douyin.com/search/情侣周末去哪玩约会推荐', screenshot: '', summary: '🗺️ 周末约会去哪玩：小众博物馆、城市周边一日游、新开网红店探店…让每个周末都像迷你旅行。', tags: ['周末', '约会', '探店'], createdAt: '' },
  { id: 'insp_010', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=情侣周末brunch推荐氛围感&type=51', screenshot: '', summary: '🥂 周末Brunch约会指南：上海/北京/杭州氛围感餐厅推荐，从法式可丽饼到日式松饼，甜蜜从早开始。', tags: ['周末', '美食', '约会'], createdAt: '' },
  { id: 'insp_011', platform: '抖音', url: 'https://www.douyin.com/search/情侣双人运动健身一起', screenshot: '', summary: '🏃 情侣双人运动：一起跑步、一起瑜伽、一起攀岩…运动分泌的多巴胺让恋爱更甜蜜。', tags: ['周末', '运动', '户外'], createdAt: '' },
  { id: 'insp_012', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=情侣必看高分爱情电影推荐&type=51', screenshot: '', summary: '🎥 情侣必看高分爱情电影清单：窝在沙发盖同一条毯子，和TA一起看完这20部让人相信爱情的电影。', tags: ['电影', '居家', '周末'], createdAt: '' },
  { id: 'insp_013', platform: '抖音', url: 'https://www.douyin.com/search/纪念日惊喜策划攻略', screenshot: '', summary: '🎉 纪念日惊喜策划全攻略：从倒计时准备到当天执行，让TA感动到哭的完整时间线与创意方案。', tags: ['纪念日', '惊喜', '策划'], createdAt: '' },
  { id: 'insp_014', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=纪念日餐厅推荐仪式感&type=51', screenshot: '', summary: '🕯️ 纪念日仪式感餐厅：从外滩江景到胡同私房菜，精选适合纪念日的氛围感餐厅，烛光晚餐攻略。', tags: ['纪念日', '餐厅', '仪式感'], createdAt: '' },
  { id: 'insp_015', platform: '抖音', url: 'https://www.douyin.com/hashtag/1612992705397895', screenshot: '', summary: '🎀 纪念日礼物推荐：女生能记住一整年的礼物清单，实用又走心，每一件都藏着"我懂你"的小心思。', tags: ['礼物', '纪念日', '惊喜'], createdAt: '' },
  { id: 'insp_016', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=情侣手作DIY礼物教程&type=51', screenshot: '', summary: '✂️ 情侣手作DIY礼物教程：100个优点夸夸罐、手工相册、编织手绳…亲手做的礼物最戳人心。', tags: ['DIY', '礼物', '纪念日'], createdAt: '' },
  { id: 'insp_017', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=纪念日蛋糕定制创意&type=51', screenshot: '', summary: '🎂 纪念日蛋糕灵感：从复古手绘到简约韩式，为TA定制一个独一无二的纪念日蛋糕。', tags: ['纪念日', '蛋糕', '创意'], createdAt: '' },
  { id: 'insp_018', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=情人节礼物清单女生心动&type=51', screenshot: '', summary: '💝 情人节礼物终极清单：从百元心意到千元惊喜，按性格选礼物不踩雷，让TA感受到满满用心。', tags: ['情人节', '礼物', '清单'], createdAt: '' },
  { id: 'insp_019', platform: '抖音', url: 'https://www.douyin.com/search/情人节浪漫约会方案', screenshot: '', summary: '🌹 情人节约会全攻略：上午惊喜早餐→下午手作体验→晚上烛光晚餐→深夜天台看星星，完美的一天。', tags: ['情人节', '约会', '浪漫'], createdAt: '' },
  { id: 'insp_020', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=情人节情书文案走心&type=51', screenshot: '', summary: '💌 走心情书文案：不是复制粘贴的土味情话，而是只属于你们两个人的真心话，写进TA心里。', tags: ['情人节', '情书', '告白'], createdAt: '' },
  { id: 'insp_021', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=520礼物推荐小众高级&type=51', screenshot: '', summary: '💎 520小众高级礼物：拒绝烂大街，从独立设计师首饰到定制香薰，送出一份独特心意。', tags: ['520', '礼物', '小众'], createdAt: '' },
  { id: 'insp_022', platform: '抖音', url: 'https://www.douyin.com/search/520告白创意方案', screenshot: '', summary: '💬 520告白创意方案：不一定要多隆重，但一定要够特别，10个让人无法拒绝的告白方式。', tags: ['520', '告白', '创意'], createdAt: '' },
  { id: 'insp_023', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=七夕礼物推荐情侣走心&type=51', screenshot: '', summary: '🎋 七夕礼物走心推荐：从国风首饰到星空投影灯，中国情人节就该送有东方浪漫的礼物。', tags: ['七夕', '礼物', '走心'], createdAt: '' },
  { id: 'insp_024', platform: '抖音', url: 'https://www.douyin.com/search/七夕约会穿搭氛围感', screenshot: '', summary: '👘 七夕约会穿搭：改良旗袍、新中式情侣装，穿出东方浪漫的高级感，拍照超出片。', tags: ['七夕', '穿搭', '约会'], createdAt: '' },
  { id: 'insp_025', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=七夕浪漫约会餐厅推荐&type=51', screenshot: '', summary: '🏮 七夕约会餐厅推荐：从露台星空到园林私宴，最具中国式浪漫的约会餐厅精选。', tags: ['七夕', '餐厅', '约会'], createdAt: '' },
  { id: 'insp_026', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=七夕DIY手作礼物心意&type=51', screenshot: '', summary: '🧵 七夕手作礼物灵感：手编红绳、手绘团扇、刺绣香囊…亲手做的东方浪漫，胜过千言万语。', tags: ['七夕', 'DIY', '礼物'], createdAt: '' },
  { id: 'insp_027', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=圣诞节约会穿搭氛围感&type=51', screenshot: '', summary: '🎄 圣诞节约会指南：红绿配色穿搭、圣诞集市打卡、交换礼物攻略，打造最有仪式感的圣诞夜。', tags: ['圣诞', '约会', '穿搭', '冬季'], createdAt: '' },
  { id: 'insp_028', platform: '抖音', url: 'https://www.douyin.com/search/跨年夜情侣怎么过', screenshot: '', summary: '🎆 跨年夜浪漫计划：从烟花倒计时到新年第一顿早餐，和TA一起迎接新年的N种方式。', tags: ['跨年', '仪式感', '冬季'], createdAt: '' },
  { id: 'insp_029', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=冬季情侣温泉旅行推荐&type=51', screenshot: '', summary: '♨️ 冬季情侣温泉旅行：从箱根到腾冲，精选最适合冬天的温泉目的地，泡汤看雪才是冬天的正确打开方式。', tags: ['冬季', '温泉', '旅行'], createdAt: '' },
  { id: 'insp_030', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=情侣冬季居家温暖约会&type=51', screenshot: '', summary: '🕯️ 冬季居家温暖约会：煮红酒、烤红薯、裹同一条毯子看剧…冬天的浪漫全在房间里。', tags: ['冬季', '居家', '温暖'], createdAt: '' },
  { id: 'insp_031', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=情侣旅行小众目的地推荐&type=51', screenshot: '', summary: '✈️ 国内情侣小众旅行地推荐：温岭石塘小箬村、广西钦州粉海豚、平潭岛蓝眼泪…避开人潮享受二人世界。', tags: ['旅行', '目的地', '户外'], createdAt: '' },
  { id: 'insp_032', platform: '抖音', url: 'https://www.douyin.com/search/春天情侣踏青野餐攻略', screenshot: '', summary: '🧺 春日踏青野餐攻略：野餐篮必备清单+出片穿搭+选址技巧，春天就是要在草地上晒太阳谈恋爱。', tags: ['春游', '野餐', '户外', '拍照'], createdAt: '' },
  { id: 'insp_033', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=夏天情侣海边旅行拍照&type=51', screenshot: '', summary: '🌊 夏日海边情侣游：比基尼穿搭、沙滩拍照姿势、防晒好物…和TA一起去海边撒狗粮。', tags: ['海边', '夏天', '旅行', '拍照'], createdAt: '' },
  { id: 'insp_034', platform: '抖音', url: 'https://www.douyin.com/search/秋天情侣拍照银杏枫叶', screenshot: '', summary: '🍂 秋日情侣拍照圣地：银杏大道、红枫林、芦苇荡…秋天的每一帧都是电影海报级别的浪漫。', tags: ['秋天', '拍照', '户外'], createdAt: '' },
  { id: 'insp_035', platform: '小红书', url: 'https://www.xiaohongshu.com/search_result?keyword=情侣旅行攻略打包清单&type=51', screenshot: '', summary: '🧳 情侣旅行打包清单：从证件到应急药品，超全不遗漏的旅行准备指南，出发前必看。', tags: ['旅行', '清单', '攻略'], createdAt: '' },
];

// 初始化所有 inspiration 的 createdAt
DEFAULT_INSPIRATION.forEach(i => { if (!i.createdAt) i.createdAt = Utils.getToday(); });

// ===== 数据仓库 - GitHub 同步版 =====
const Store = {
  data: {},
  _serverVersion: 0,
  _syncInProgress: false,
  _autoSaveTimeout: null,
  _initialized: false,

  // 初始化
  async init() {
    if (this._initialized) return;

    // 🔄 数据迁移：旧版 key（无暗号前缀）→ 新版 key（带暗号前缀）
    this._migrateFromLegacyKeys();

    // 🚀 先用本地数据立即渲染，GitHub 同步放到后台
    this.data = this._loadFromLocalStorage();
    if (!this.data.profile || !this.data.profile.togetherDate) {
      this._initDefaultData();
    }
    // 确保数据完整 + 自动生成内置纪念日
    this._ensureDefaults();
    this.saveAll();
    this._initialized = true;

    // 后台静默同步 GitHub（不阻塞渲染）
    this._backgroundSync();

    // 定期检查远程更新
    this._startPolling();
  },

  // 后台静默同步：拉取 GitHub 数据并合并
  async _backgroundSync() {
    try {
      const remoteData = await GitHubSync.initRepo();

      if (remoteData && remoteData.profile) {
        const localVersion = this.data._version || 0;
        const remoteVersion = remoteData._version || 0;

        // 如果远程数据没有版本号（旧格式），先推送本地数据赋予版本号
        if (!remoteData._version) {
          this._schedulePush();
          return;
        }

        if (remoteVersion > localVersion) {
          // 远程版本更新，静默合并（对方做了修改）
          // 保留本地手动添加的纪念日（非 auto_ 前缀）
          const manualAnniversaries = (this.data.anniversaries || []).filter(
            a => !a.id || !a.id.startsWith('auto_')
          );
          this.data = remoteData;
          // 合并：远程内置 + 本地手动
          this.data.anniversaries = [
            ...(remoteData.anniversaries || []).filter(a => a.id && a.id.startsWith('auto_')),
            ...manualAnniversaries
          ];
          this._ensureDefaults();
          this._syncInspirationPool(remoteData);
          this.saveAll();
          console.log('📥 后台同步完成 v' + remoteVersion);
          if (typeof App !== 'undefined' && App.currentPage === 'dashboard') {
            App.refresh();
          }
        } else if (remoteVersion < localVersion) {
          // 本地更新，推送到 GitHub
          this._schedulePush();
        }
        // remoteVersion === localVersion: 无需操作，本地数据优先
      } else if (!remoteData) {
        // 首次使用，推送本地数据
        await GitHubSync.push(this.data);
        console.log('✅ 初始数据已上传 GitHub');
      }
    } catch (e) {
      console.warn('后台同步失败（不影响使用）:', e.message);
    }
  },

  _initDefaultData() {
    this.data = {
      profile: { ...DEFAULT_PROFILE },
      anniversaries: [],
      travels: [],
      foods: [],
      shopping: [],
      ledger: [],
      inspiration: [...DEFAULT_INSPIRATION]
    };
  },

  // 确保关键集合不为空（远程数据可能不完整）
  _ensureDefaults() {
    const defaultMap = {
      profile: { ...DEFAULT_PROFILE },
      inspiration: [...DEFAULT_INSPIRATION],
      anniversaries: [],
      travels: [],
      foods: [],
      shopping: [],
      ledger: []
    };
    for (const [key, fallback] of Object.entries(defaultMap)) {
      if (!this.data[key] || (Array.isArray(this.data[key]) && this.data[key].length === 0 && fallback.length > 0)) {
        // 数组为空时用默认值填充（仅针对有默认数据的集合）
        if (Array.isArray(this.data[key]) && this.data[key].length === 0 && fallback.length > 0) {
          this.data[key] = [...fallback];
          console.log(`📦 已补充默认${key}数据 (${fallback.length}条)`);
        } else if (!this.data[key]) {
          this.data[key] = fallback;
        }
      }
    }
    // 自动生成内置纪念日
    this._ensureBuiltinAnniversaries();
  },

  // 基于在一起日期自动生成内置纪念日（100天、周年、节日等）
  _ensureBuiltinAnniversaries() {
    const together = this.data.profile?.togetherDate;
    if (!together) return;

    const togetherDate = new Date(together + 'T00:00:00');
    if (isNaN(togetherDate.getTime())) return;

    // 检测 togetherDate 是否变化
    const prefix = _getPasscodePrefix();
    const lastTogether = localStorage.getItem(prefix + 'builtin_together_date');
    if (lastTogether && lastTogether !== together) {
      this.data.anniversaries = (this.data.anniversaries || []).filter(
        a => !a.id || !a.id.startsWith('auto_')
      );
      console.log('🔄 在一起日期已变更，重新生成内置纪念日');
    }
    localStorage.setItem(prefix + 'builtin_together_date', together);

    // 检查版本号，版本升级时重新生成
    const BUILTIN_VERSION = 3;
    const lastVersion = parseInt(localStorage.getItem(prefix + 'builtin_version') || '0', 10);
    if (lastVersion < BUILTIN_VERSION) {
      this.data.anniversaries = (this.data.anniversaries || []).filter(
        a => !a.id || !a.id.startsWith('auto_')
      );
      console.log('🔄 内置纪念日版本升级，重新生成');
    }
    localStorage.setItem(prefix + 'builtin_version', BUILTIN_VERSION);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 已有的内置纪念日 ID（不重复创建）
    const existingIds = new Set((this.data.anniversaries || []).map(a => a.id));
    const existingDates = new Set((this.data.anniversaries || []).map(a => a.date));

    const builtins = [];

    // 工具函数：从在一起日期加 N 天
    const addDays = (date, n) => {
      const d = new Date(date);
      d.setDate(d.getDate() + n);
      return d;
    };

    // 格式化日期 YYYY-MM-DD
    const fmt = (d) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // 计算天数差
    const daysBetween = (d1, d2) => Math.round((d2 - d1) / 86400000);

    // ===== 1. 日纪念日：仅 100 天 =====
    const dayMilestones = [
      { days: 100, label: '💯 100天纪念日' }
    ];

    for (const m of dayMilestones) {
      const date = addDays(togetherDate, m.days);
      // 只添加未来的纪念日
      if (date >= today) {
        const id = `auto_days_${m.days}`;
        const dateStr = fmt(date);
        if (!existingIds.has(id) && !existingDates.has(dateStr)) {
          builtins.push({
            id,
            name: m.label,
            date: dateStr,
            repeatCycle: 'single',
            remindDays: 7,
            status: 'active'
          });
        }
      }
    }

    // ===== 2. 周年纪念日（1-10年） =====
    for (let yr = 1; yr <= 10; yr++) {
      const annivDate = new Date(togetherDate);
      annivDate.setFullYear(annivDate.getFullYear() + yr);
      if (annivDate >= today) {
        const id = `auto_year_${yr}`;
        const dateStr = fmt(annivDate);
        if (!existingIds.has(id) && !existingDates.has(dateStr)) {
          builtins.push({
            id,
            name: yr === 1 ? '一周年纪念日 ❤️' : `${yr}周年纪念日`,
            date: dateStr,
            repeatCycle: 'single',
            remindDays: 14,
            status: 'active'
          });
        }
      }
    }

    // ===== 3. 常见节日节点 =====
    // 情人节（每年2月14日）
    for (let y = today.getFullYear(); y <= today.getFullYear() + 3; y++) {
      const valentine = new Date(y, 1, 14); // 2月14日
      if (valentine >= today && valentine > togetherDate) {
        const id = `auto_valentine_${y}`;
        const dateStr = fmt(valentine);
        if (!existingIds.has(id) && !existingDates.has(dateStr)) {
          builtins.push({
            id,
            name: y === today.getFullYear() && valentine >= today ? '💝 情人节' : `${y}年情人节`,
            date: dateStr,
            repeatCycle: 'yearly',
            remindDays: 7,
            status: 'active'
          });
        }
        break; // 每年重复，只需加一次
      }
    }

    // 520（每年5月20日）
    for (let y = today.getFullYear(); y <= today.getFullYear() + 3; y++) {
      const wuerling = new Date(y, 4, 20);
      if (wuerling >= today && wuerling > togetherDate) {
        const id = `auto_520_${y}`;
        const dateStr = fmt(wuerling);
        if (!existingIds.has(id) && !existingDates.has(dateStr)) {
          builtins.push({
            id,
            name: '💌 520',
            date: dateStr,
            repeatCycle: 'yearly',
            remindDays: 7,
            status: 'active'
          });
        }
        break;
      }
    }

    // 七夕（2026=8/19, 2027=8/8, 2028=8/26）
    const qixiDates = { 2026: '08-19', 2027: '08-08', 2028: '08-26' };
    for (let y = today.getFullYear(); y <= today.getFullYear() + 3; y++) {
      if (qixiDates[y]) {
        const qxDate = new Date(`${y}-${qixiDates[y]}T00:00:00`);
        if (qxDate >= today && qxDate > togetherDate) {
          const id = `auto_qixi_${y}`;
          const dateStr = fmt(qxDate);
          if (!existingIds.has(id) && !existingDates.has(dateStr)) {
            builtins.push({
              id,
              name: '🎋 七夕',
              date: dateStr,
              repeatCycle: 'yearly',
              remindDays: 10,
              status: 'active'
            });
          }
          break;
        }
      }
    }

    // 圣诞节（每年12月25日）
    for (let y = today.getFullYear(); y <= today.getFullYear() + 3; y++) {
      const christmas = new Date(y, 11, 25);
      if (christmas >= today && christmas > togetherDate) {
        const id = `auto_christmas_${y}`;
        const dateStr = fmt(christmas);
        if (!existingIds.has(id) && !existingDates.has(dateStr)) {
          builtins.push({
            id,
            name: '🎄 圣诞节',
            date: dateStr,
            repeatCycle: 'yearly',
            remindDays: 14,
            status: 'active'
          });
        }
        break;
      }
    }

    // 跨年夜（每年12月31日）
    for (let y = today.getFullYear(); y <= today.getFullYear() + 3; y++) {
      const newYearEve = new Date(y, 11, 31);
      if (newYearEve >= today && newYearEve > togetherDate) {
        const id = `auto_newyear_${y}`;
        const dateStr = fmt(newYearEve);
        if (!existingIds.has(id) && !existingDates.has(dateStr)) {
          builtins.push({
            id,
            name: '🎆 跨年夜',
            date: dateStr,
            repeatCycle: 'yearly',
            remindDays: 7,
            status: 'active'
          });
        }
        break;
      }
    }

    if (builtins.length > 0) {
      // 按日期排序
      builtins.sort((a, b) => a.date.localeCompare(b.date));
      this.data.anniversaries = [...(this.data.anniversaries || []), ...builtins];
      console.log(`📅 已自动生成 ${builtins.length} 个内置纪念日`);
    }
  },

  // 从远程数据同步灵感池（支持远程更新推送新内容）
  _syncInspirationPool(remoteData) {
    if (remoteData && remoteData._inspirationPool && remoteData._inspirationPool.length > 0) {
      const remotePool = remoteData._inspirationPool;
      // 用远程灵感池替换本地默认数据（但保留用户自己添加的条目）
      const userItems = (this.data.inspiration || []).filter(
        i => !i.id || !i.id.startsWith('insp_')
      );
      this.data.inspiration = [...remotePool, ...userItems];
      console.log(`📦 灵感池已同步: ${remotePool.length}条远程 + ${userItems.length}条自定义`);
    }
  },

  /**
   * 从旧版 key（无暗号前缀 love_profile/love_anniversaries/...）迁移到新版 key
   * 迁移后保留旧 key（不删除），因为同一设备可能有多个暗号的数据
   * 每个暗号首次登录时自动迁移一次
   */
  _migrateFromLegacyKeys() {
    const prefix = _getPasscodePrefix();
    const migratedFlag = prefix + 'migrated_from_legacy';
    if (localStorage.getItem(migratedFlag)) return; // 已迁移过

    const legacyKeys = [
      'love_profile', 'love_anniversaries', 'love_travels', 'love_foods',
      'love_shopping', 'love_ledger', 'love_inspiration'
    ];

    let migrated = false;
    for (const legacyKey of legacyKeys) {
      const data = localStorage.getItem(legacyKey);
      if (data !== null) {
        // 映射到新 key: love_profile → love_<hash8>_profile
        const suffix = legacyKey.replace('love_', '');
        const newKey = prefix + suffix;
        // 只有新 key 不存在时才迁移（避免覆盖已存在的数据）
        if (!localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, data);
          migrated = true;
        }
      }
    }

    // 迁移其他辅助 key
    const auxLegacy = [
      ['love_data_version', prefix + 'data_version'],
      ['love_builtin_together_date', prefix + 'builtin_together_date'],
      ['love_builtin_version', prefix + 'builtin_version'],
      ['love_couple_photo', prefix + 'couple_photo']
    ];
    for (const [oldKey, newKey] of auxLegacy) {
      const data = localStorage.getItem(oldKey);
      if (data !== null && !localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, data);
        migrated = true;
      }
    }

    if (migrated) {
      console.log('🔄 数据已从旧格式迁移到暗号隔离存储');
    }
    // 标记已迁移（即使没有数据也标记，避免每次都检查）
    localStorage.setItem(migratedFlag, '1');
  },

  _loadFromLocalStorage() {
    const keys = _getStoreKeys();
    const data = {
      profile: Utils.loadFromStorage(keys.profile, { ...DEFAULT_PROFILE }),
      anniversaries: Utils.loadFromStorage(keys.anniversaries, []),
      travels: Utils.loadFromStorage(keys.travels, []),
      foods: Utils.loadFromStorage(keys.foods, []),
      shopping: Utils.loadFromStorage(keys.shopping, []),
      ledger: Utils.loadFromStorage(keys.ledger, []),
      inspiration: Utils.loadFromStorage(keys.inspiration, [...DEFAULT_INSPIRATION])
    };
    // 恢复版本号
    const savedVersion = localStorage.getItem(_getPasscodePrefix() + 'data_version');
    if (savedVersion) data._version = parseInt(savedVersion, 10);
    return data;
  },

  // 定期轮询检查对方更新（每30秒）
  _startPolling() {
    setInterval(async () => {
      try {
        const remote = await GitHubSync.pull();
        if (remote && remote._version > (this.data._version || 0)) {
          const localVersion = this.data._version || 0;
          // 保留本地手动纪念日
          const manualAnniversaries = (this.data.anniversaries || []).filter(
            a => !a.id || !a.id.startsWith('auto_')
          );
          this.data = remote;
          this.data.anniversaries = [
            ...(remote.anniversaries || []).filter(a => a.id && a.id.startsWith('auto_')),
            ...manualAnniversaries
          ];
          this.saveAll();
          console.log('🔄 检测到TA的更新 v' + remote._version);
          if (localVersion > 0) {
            Utils.showToast('TA的数据已同步 ✨');
            // 触发页面刷新
            if (typeof App !== 'undefined' && App.refresh) {
              App.refresh();
            }
          }
        }
      } catch (e) { /* ignore */ }
    }, 30000);
  },

  // 同步到 GitHub
  async syncToGitHub() {
    if (this._syncInProgress) return;
    this._syncInProgress = true;
    try {
      const ok = await GitHubSync.push(this.data);
      if (ok) {
        this._serverVersion = this.data._version || 0;
      }
    } catch (e) {
      console.warn('GitHub 同步失败:', e.message);
    } finally {
      this._syncInProgress = false;
    }
  },

  _schedulePush() {
    if (this._autoSaveTimeout) clearTimeout(this._autoSaveTimeout);
    this._autoSaveTimeout = setTimeout(() => {
      this.syncToGitHub();
    }, 1000);
  },

  saveAll() {
    const keys = _getStoreKeys();
    Object.entries(keys).forEach(([key, storageKey]) => {
      Utils.saveToStorage(storageKey, this.data[key]);
    });
    // 持久化版本号，防止后台同步时被旧远程数据覆盖
    if (this.data._version) {
      localStorage.setItem(_getPasscodePrefix() + 'data_version', this.data._version);
    }
  },

  // ===== 数据访问 =====
  getProfile() { return this.data.profile; },
  getAnniversaries() { return this.data.anniversaries; },
  getTravels() { return this.data.travels; },
  getFoods() { return this.data.foods; },
  getShopping() { return this.data.shopping; },
  getLedger() { return this.data.ledger; },
  getInspiration() { return this.data.inspiration; },

  updateProfile(updates) {
    this.data.profile = { ...this.data.profile, ...updates };
    this.saveAll();
    this._schedulePush();
  },

  add(collection, item) {
    item.id = Utils.generateId();
    item.createdAt = item.createdAt || Utils.getToday();
    this.data[collection].push(item);
    this.saveCollection(collection);
    this._schedulePush();
    return item;
  },

  update(collection, id, updates) {
    const idx = this.data[collection].findIndex(i => i.id === id);
    if (idx === -1) return false;
    this.data[collection][idx] = { ...this.data[collection][idx], ...updates };
    this.saveCollection(collection);
    this._schedulePush();
    return true;
  },

  remove(collection, id) {
    const idx = this.data[collection].findIndex(i => i.id === id);
    if (idx === -1) return false;
    this.data[collection].splice(idx, 1);
    this.saveCollection(collection);
    this._schedulePush();
    return true;
  },

  getById(collection, id) {
    return this.data[collection].find(i => i.id === id) || null;
  },

  saveCollection(collection) {
    const keys = _getStoreKeys();
    Utils.saveToStorage(keys[collection], this.data[collection]);
  },

  getUpcomingAnniversaries(limit = 3) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (this.data.anniversaries || [])
      .filter(a => a.status !== 'completed')
      .map(a => {
        const nextDate = Utils.getNextAnniversaryDate(a);
        const daysUntil = Utils.getDaysUntil(nextDate);
        return { ...a, nextDate: Utils.formatDate(nextDate), daysUntil };
      })
      .filter(a => a.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, limit);
  },

  getRemindAnniversaries() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (this.data.anniversaries || [])
      .filter(a => a.status !== 'completed' && a.remindDays > 0)
      .map(a => {
        const nextDate = Utils.getNextAnniversaryDate(a);
        const daysUntil = Utils.getDaysUntil(nextDate);
        return { ...a, nextDate: Utils.formatDate(nextDate), daysUntil };
      })
      .filter(a => a.daysUntil >= 0 && a.daysUntil <= a.remindDays)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  },

  getLedgerMonthlySummary(year, month) {
    const items = Utils.filterByMonth(this.data.ledger || [], year, month);
    const total = items.reduce((sum, i) => sum + Number(i.amount), 0);
    const categorySummary = Utils.categorySummary(items);
    const hisTotal = items.filter(i => i.payer === '他').reduce((s, i) => s + Number(i.amount), 0);
    const herTotal = items.filter(i => i.payer === '她').reduce((s, i) => s + Number(i.amount), 0);
    return { year, month, total, categorySummary, hisTotal, herTotal, count: items.length };
  },

  getLedgerRecentMonths(months = 6) {
    const result = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push(this.getLedgerMonthlySummary(d.getFullYear(), d.getMonth()));
    }
    return result;
  },

  getCouplePhoto() {
    if (this.data.profile && this.data.profile.couplePhoto) {
      return this.data.profile.couplePhoto;
    }
    const stored = localStorage.getItem(_getPasscodePrefix() + 'couple_photo');
    if (stored) return stored;
    return 'assets/couple.jpg';
  },

  setCouplePhoto(base64) {
    localStorage.setItem(_getPasscodePrefix() + 'couple_photo', base64);
    if (this.data.profile) {
      this.data.profile.couplePhoto = base64;
      this.saveCollection('profile');
      this._schedulePush();
    }
  }
};
