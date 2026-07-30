/* ===== 【我们的恋爱小宇宙】工具函数 ===== */
const Utils = {
  /**
   * 格式化日期为 YYYY-MM-DD
   */
  formatDate(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  /**
   * 格式化日期为中文格式
   */
  formatDateCN(date) {
    const d = new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  },

  /**
   * 格式化日期为简短中文
   */
  formatDateShort(date) {
    const d = new Date(date);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  },

  /**
   * 格式化金额
   */
  formatMoney(amount) {
    return `¥${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  /**
   * 计算两个日期的天数差
   */
  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2 || new Date());
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  },

  /**
   * 获取恋爱时长（天）
   */
  getLoveDays(togetherDate) {
    return this.daysBetween(togetherDate);
  },

  /**
   * 格式化恋爱时长文案
   */
  formatLoveDuration(days) {
    if (days <= 0) return '今天';
    if (days === 1) return '1天';
    if (days < 30) return `${days}天`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      const remain = days % 30;
      return remain > 0 ? `${months}个月${remain}天` : `${months}个月`;
    }
    const years = Math.floor(days / 365);
    const remainDays = days % 365;
    const remainMonths = Math.floor(remainDays / 30);
    if (remainMonths > 0) return `${years}年${remainMonths}个月`;
    return `${years}年`;
  },

  /**
   * 获取纪念日的下次日期（处理每年重复）
   */
  getNextAnniversaryDate(anniversary) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const origDate = new Date(anniversary.date);
    const thisYear = new Date(today.getFullYear(), origDate.getMonth(), origDate.getDate());

    if (anniversary.repeatCycle === 'yearly') {
      if (thisYear >= today) return thisYear;
      return new Date(today.getFullYear() + 1, origDate.getMonth(), origDate.getDate());
    }
    // single: return original date
    return origDate;
  },

  /**
   * 获取距离纪念日的剩余天数
   */
  getDaysUntil(nextDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(nextDate);
    target.setHours(0, 0, 0, 0);
    return Math.floor((target - today) / (1000 * 60 * 60 * 24));
  },

  /**
   * 生成唯一ID
   */
  generateId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * 按月份筛选账本数据
   */
  filterByMonth(items, year, month) {
    return items.filter(item => {
      const d = new Date(item.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  },

  /**
   * 获取当前年月
   */
  getCurrentYearMonth() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  },

  /**
   * 获取月份名称
   */
  getMonthName(month) {
    const names = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    return names[month];
  },

  /**
   * 分类金额汇总
   */
  categorySummary(items) {
    const summary = {};
    items.forEach(item => {
      const cat = item.category || '其他';
      summary[cat] = (summary[cat] || 0) + Number(item.amount);
    });
    return summary;
  },

  /**
   * 显示Toast提示
   */
  showToast(message, duration = 2000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * 从localStorage安全读取
   */
  loadFromStorage(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  },

  /**
   * 安全写入localStorage
   */
  saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 获取今日日期字符串 YYYY-MM-DD
   */
  getToday() {
    return this.formatDate(new Date());
  },

  /**
   * 基于日期哈希获取每日Tips索引
   */
  getDailyTipIndex(totalTips) {
    const today = this.getToday();
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = ((hash << 5) - hash) + today.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % totalTips;
  },

  /**
   * 获取日历上下文 — 分析当前日期附近的节日、纪念日
   * 返回场景标签数组，用于灵感推荐
   */
  getCalendarContext() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-11
    const day = today.getDate();
    const contexts = [];

    // ===== 固定节日（公历） =====
    const fixedHolidays = [
      { name: '情人节', date: '02-14', scene: '情人节', leadDays: 14, tags: ['礼物', '约会', '浪漫'] },
      { name: '520', date: '05-20', scene: '520', leadDays: 7, tags: ['礼物', '告白', '浪漫'] },
      { name: '跨年夜', date: '12-31', scene: '跨年', leadDays: 14, tags: ['跨年', '旅行', '仪式感'] },
      { name: '元旦', date: '01-01', scene: '新年', leadDays: 7, tags: ['新年', '计划', '旅行'] },
      { name: '圣诞节', date: '12-25', scene: '圣诞', leadDays: 14, tags: ['圣诞', '礼物', '约会'] },
      { name: '万圣节', date: '10-31', scene: '万圣节', leadDays: 7, tags: ['万圣节', '约会', '创意'] },
      { name: '双11', date: '11-11', scene: '双11', leadDays: 7, tags: ['购物', '礼物', '清单'] },
    ];

    for (const h of fixedHolidays) {
      const [hm, hd] = h.date.split('-').map(Number);
      const holidayDate = new Date(year, hm - 1, hd);
      const daysUntil = this.getDaysUntil(holidayDate);
      if (daysUntil >= 0 && daysUntil <= h.leadDays) {
        contexts.push({
          scene: h.scene,
          daysUntil,
          urgency: daysUntil <= 3 ? 'urgent' : daysUntil <= 7 ? 'soon' : 'upcoming',
          tags: h.tags
        });
      }
    }

    // ===== 农历节日（每年精确日期硬编码，覆盖2026-2028） =====
    // 数据来源：MoonCal农历引擎 + 万年历核对
    const lunarHolidays = [
      // 2026年
      { name: '七夕', date: '2026-08-19', leadDays: 10, tags: ['七夕', '礼物', '约会', '浪漫'] },
      { name: '中秋节', date: '2026-10-06', leadDays: 7, tags: ['中秋', '礼物', '团圆'] },
      // 2027年
      { name: '除夕', date: '2027-02-05', leadDays: 7, tags: ['除夕', '跨年', '仪式感'] },
      { name: '春节', date: '2027-02-06', leadDays: 21, tags: ['春节', '旅行', '计划', '礼物'] },
      { name: '元宵节', date: '2027-02-20', leadDays: 7, tags: ['元宵', '约会', '浪漫'] },
      { name: '七夕', date: '2027-08-08', leadDays: 10, tags: ['七夕', '礼物', '约会', '浪漫'] },
      { name: '中秋节', date: '2027-09-15', leadDays: 7, tags: ['中秋', '礼物', '团圆'] },
      // 2028年
      { name: '除夕', date: '2028-01-25', leadDays: 7, tags: ['除夕', '跨年', '仪式感'] },
      { name: '春节', date: '2028-01-26', leadDays: 21, tags: ['春节', '旅行', '计划', '礼物'] },
      { name: '元宵节', date: '2028-02-09', leadDays: 7, tags: ['元宵', '约会', '浪漫'] },
      { name: '七夕', date: '2028-08-26', leadDays: 10, tags: ['七夕', '礼物', '约会', '浪漫'] },
      { name: '中秋节', date: '2028-10-03', leadDays: 7, tags: ['中秋', '礼物', '团圆'] },
    ];
    for (const h of lunarHolidays) {
      const lunarDate = new Date(h.date + 'T00:00:00');
      const daysUntil = this.getDaysUntil(lunarDate);
      if (daysUntil >= 0 && daysUntil <= h.leadDays) {
        contexts.push({
          scene: h.name,
          daysUntil,
          urgency: daysUntil <= 3 ? 'urgent' : daysUntil <= 7 ? 'soon' : 'upcoming',
          tags: h.tags
        });
      }
    }

    // ===== 用户纪念日（从 Store 读取） =====
    try {
      if (typeof Store !== 'undefined' && Store.data && Store.data.anniversaries) {
        const anniversaries = Store.data.anniversaries.filter(a => a.status === 'active');
        for (const a of anniversaries) {
          const nextDate = this.getNextAnniversaryDate(a);
          const daysUntil = this.getDaysUntil(nextDate);
          if (daysUntil >= 0 && daysUntil <= (a.remindDays || 14)) {
            contexts.push({
              scene: a.name,
              daysUntil,
              urgency: daysUntil <= 3 ? 'urgent' : daysUntil <= 7 ? 'soon' : 'upcoming',
              tags: ['纪念日', '惊喜', '礼物', '浪漫']
            });
          }
        }
      }
    } catch(e) { /* Store 未加载，跳过 */ }

    // ===== 季节/月份场景 =====
    const seasonScenes = {
      2: { scene: '春天', tags: ['春游', '踏青', '户外'] },
      3: { scene: '春天', tags: ['春游', '踏青', '户外'] },
      4: { scene: '春天', tags: ['春游', '踏青', '户外'] },
      5: { scene: '初夏', tags: ['户外', '旅行', '拍照'] },
      6: { scene: '夏天', tags: ['海边', '旅行', '避暑'] },
      7: { scene: '夏天', tags: ['海边', '旅行', '避暑'] },
      8: { scene: '夏天', tags: ['海边', '旅行', '避暑'] },
      9: { scene: '秋天', tags: ['秋游', '拍照', '户外'] },
      10: { scene: '秋天', tags: ['秋游', '拍照', '户外'] },
      11: { scene: '深秋', tags: ['居家', '电影', '美食'] },
      0: { scene: '冬天', tags: ['冬季', '居家', '温泉'] },
      1: { scene: '冬天', tags: ['冬季', '居家', '温泉'] },
    };
    const season = seasonScenes[month];
    if (season) {
      contexts.push({
        scene: season.scene,
        daysUntil: 0,
        urgency: 'seasonal',
        tags: season.tags
      });
    }

    // ===== 周末判断 =====
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 5) { // 周五
      contexts.push({ scene: '周末', daysUntil: 1, urgency: 'soon', tags: ['周末', '约会', '探店'] });
    } else if (dayOfWeek === 6 || dayOfWeek === 0) { // 周六日
      contexts.push({ scene: '周末', daysUntil: 0, urgency: 'now', tags: ['周末', '约会', '探店'] });
    }

    // 按紧急程度排序
    const urgencyOrder = { urgent: 0, soon: 1, upcoming: 2, now: 3, seasonal: 4 };
    contexts.sort((a, b) => (urgencyOrder[a.urgency] || 9) - (urgencyOrder[b.urgency] || 9));

    return contexts;
  }
};

// 兼容导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
