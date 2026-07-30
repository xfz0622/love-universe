/* ===== 【我们的恋爱小宇宙】灵感素材库页面 ===== */
const InspirationPage = {
  filter: 'all',
  _dailyItems: null, // 缓存的今日精选
  _calendarContext: null, // 日历上下文缓存

  /**
   * 智能每日精选：根据日历上下文（节日/纪念日/季节/周末）优先匹配相关灵感
   * 每天展示 6-8 条，其中至少一半与当前场景相关
   */
  _getDailySelection() {
    if (this._dailyItems) return this._dailyItems;

    const allItems = Store.getInspiration();
    if (allItems.length === 0) { this._dailyItems = []; return []; }

    const contexts = Utils.getCalendarContext();
    const today = Utils.getToday();
    const dateHash = this._hashDate(today);

    // 收集所有场景标签（去重）
    const sceneTags = new Set();
    for (const ctx of contexts) {
      for (const tag of ctx.tags) sceneTags.add(tag);
    }

    // 给每条灵感打分：标签匹配越多分越高，日期哈希用来打破平局
    const scored = allItems.map(item => {
      let score = 0;
      for (const tag of (item.tags || [])) {
        if (sceneTags.has(tag)) score += 2; // 场景匹配加权
      }
      // 日期哈希微调（打散同分项）
      score += ((this._hashDate(item.id + today) % 10) / 10);
      return { item, score };
    });

    // 按分数降序排列
    scored.sort((a, b) => b.score - a.score);

    const targetCount = Math.min(5, allItems.length);
    const matchCount = Math.min(Math.max(3, Math.ceil(targetCount * 0.6)), targetCount); // 至少3条场景匹配

    // 取前 matchCount 条高分 + 从剩余中随机补足到 targetCount
    const selected = scored.slice(0, matchCount).map(s => s.item);
    const remaining = scored.slice(matchCount).map(s => s.item);

    // 用日期哈希从剩余中选
    const needed = targetCount - selected.length;
    for (let i = 0; i < needed && remaining.length > 0; i++) {
      const idx = (dateHash + i * 7) % remaining.length;
      selected.push(remaining.splice(idx, 1)[0]);
    }

    this._dailyItems = selected;
    this._calendarContext = contexts; // 缓存上下文给render用
    return selected;
  },

  _hashDate(dateStr) {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  },

  render(container) {
    this.container = container;
    // 同一日历天不清空缓存，保证一天内多次进入灵感页看到相同内容
    const today = Utils.getToday();
    if (this._lastRenderDate !== today) {
      this._dailyItems = null;
      this._lastRenderDate = today;
    }

    const items = Store.getInspiration();
    const platforms = [...new Set(items.map(i => i.platform))];
    const dailyItems = this._getDailySelection();
    const dailyCount = dailyItems.length;

    // 筛选：在今日精选范围内筛选
    let filtered;
    if (this.filter === 'all') {
      filtered = dailyItems;
    } else {
      filtered = dailyItems.filter(i => i.platform === this.filter || (i.tags || []).includes(this.filter));
    }

    container.innerHTML = `
      ${this._renderHeader()}
      ${this._renderFilters(platforms)}
      <div class="page-content" style="padding-top:0">
        ${this._renderDailyInspiration()}
        ${dailyCount === 0 ? this._renderDefaultSuggestions() : ''}
        <div id="inspiration-list" style="margin-top:var(--space-base)">
          ${this._renderList(filtered)}
        </div>
      </div>
      <button class="btn-fab" id="add-inspiration-btn">+</button>
    `;

    this._bindEvents();
    Components.animateCards(this.container, '.card');
  },

  _renderHeader() {
    const total = Store.getInspiration().length;
    const dailyCount = this._getDailySelection().length;
    const todayLabel = Utils.formatDateCN(new Date());
    const ctx = this._calendarContext || [];

    // 当前最紧急的场景
    let sceneBadge = '';
    if (ctx.length > 0) {
      const top = ctx[0];
      const label = top.daysUntil === 0 ? `今天是${top.scene}` : top.daysUntil <= 3 ? `⏰ ${top.scene}还有${top.daysUntil}天` : `📅 ${top.scene}还有${top.daysUntil}天`;
      sceneBadge = `<span class="tag tag-primary" style="font-size:11px">${label}</span>`;
    }

    return `
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:var(--space-md)">
          <div style="width:4px;height:24px;background:var(--color-tips);border-radius:2px"></div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:var(--space-sm)">
              <h2 class="page-header-title">灵感素材库</h2>
              ${sceneBadge}
            </div>
            <p class="page-header-subtitle">素材池${total}条 · 今日精选${dailyCount}条 · ${todayLabel}</p>
          </div>
        </div>
      </div>
    `;
  },

  _renderFilters(platforms) {
    const tabs = [
      { id: 'all', label: '全部' },
      ...platforms.map(p => ({ id: p, label: p }))
    ];
    const tabsHTML = tabs.map(t => `
      <button class="filter-tab ${this.filter === t.id ? 'active' : ''}" data-filter="${t.id}">${t.label}</button>
    `).join('');
    return `<div class="filter-tabs">${tabsHTML}</div>`;
  },

  /**
   * 当素材池为空时，展示默认推荐入口（小红书/抖音直达链接）
   */
  _renderDefaultSuggestions() {
    const today = new Date();
    const month = today.getMonth();
    const seasonScenes = {
      2: '春日踏青', 3: '春日踏青', 4: '春日踏青',
      5: '初夏旅行', 6: '夏日海边', 7: '夏日海边', 8: '夏日海边',
      9: '秋日拍照', 10: '秋日拍照', 11: '深秋居家',
      0: '冬日温泉', 1: '冬日温泉'
    };
    const scene = seasonScenes[month] || '情侣日常';
    const scenes = [
      { label: '🏠 居家约会', kw: '情侣居家约会创意低成本浪漫' },
      { label: '📸 情侣拍照', kw: '情侣拍照姿势氛围感' },
      { label: '🎁 礼物灵感', kw: '情侣走心礼物推荐小众高级' },
      { label: scene, kw: `情侣${scene}约会推荐` },
    ];

    const cardsHTML = scenes.map(s => `
      <div class="card card-hoverable card-accent-tips mb-sm" style="cursor:pointer" onclick="InspirationPage._quickJump('${s.kw}')">
        <div class="card-body" style="padding:var(--space-md);display:flex;align-items:center;gap:var(--space-sm);font-size:var(--text-sm)">
          <span>${s.label}</span>
          <span style="margin-left:auto;color:var(--color-primary);font-size:var(--text-xs)">📕 小红书 →</span>
        </div>
      </div>
    `).join('');

    return `
      <div style="margin-bottom:var(--space-base)">
        <div style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-md)">
          <div style="width:3px;height:18px;background:var(--color-tips);border-radius:2px"></div>
          <span style="font-size:var(--text-sm);color:var(--text-secondary);font-weight:600">今日推荐探索</span>
        </div>
        ${cardsHTML}
        <div class="text-xs text-muted" style="text-align:center;margin-top:var(--space-sm)">
          💡 点击上方卡片直达小红书搜索 · 也可点击右下角 + 手动添加灵感
        </div>
      </div>
    `;
  },

  /**
   * 快速跳转到小红书搜索
   */
  _quickJump(keyword) {
    const url = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&type=51`;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const schemeUrl = `xhsdiscover://search/result?keyword=${encodeURIComponent(keyword)}`;
      this._tryOpenApp(schemeUrl, url);
    } else {
      window.open(url, '_blank');
    }
  },

  _renderDailyInspiration() {
    const tips = DAILY_TIPS;
    const idx = Utils.getDailyTipIndex(tips.length);
    const tip = tips[idx];
    const secondIdx = (idx + 7) % tips.length;
    const tip2 = tips[secondIdx];
    const dailyCount = this._getDailySelection().length;
    const xhsCount = this._getDailySelection().filter(i => i.platform === '小红书').length;
    const dyCount = this._getDailySelection().filter(i => i.platform === '抖音').length;
    const ctx = this._calendarContext || [];

    // 当前场景说明
    let sceneInfo = '';
    if (ctx.length > 0) {
      const top = ctx.filter(c => c.urgency !== 'seasonal').slice(0, 2);
      if (top.length > 0) {
        const labels = top.map(c => c.daysUntil === 0 ? `今天是「${c.scene}」` : `「${c.scene}」还有${c.daysUntil}天`).join('，');
        sceneInfo = `<div class="text-xs text-muted mt-sm" style="line-height:1.6">📅 ${labels} — 以下灵感已为你贴心筛选</div>`;
      }
    }

    return `
      <div class="card" style="background:#FAFAFA;margin-bottom:var(--space-base);border:none">
        <div class="flex items-center gap-sm mb-base">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.5">
            <path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
          </svg>
          <span class="card-title">今日恋爱灵感</span>
        </div>
        <p style="font-family:var(--font-serif);font-size:var(--text-md);color:var(--text-primary);line-height:1.9;margin-bottom:var(--space-md)">
          ${tip}
        </p>
        <div class="divider-light"></div>
        <p style="font-size:var(--text-sm);color:var(--text-secondary);line-height:1.8;margin-top:var(--space-md)">
          💫 ${tip2}
        </p>
        ${sceneInfo}
        <div class="text-xs text-muted mt-base">
          每日更新 · 今日精选${dailyCount}条灵感 · 📕${xhsCount}条小红书 + 🎵${dyCount}条抖音
        </div>
      </div>
    `;
  },

  _renderList(items) {
    if (items.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">💡</div>
          <div class="empty-title">还没有灵感收藏</div>
          <div class="empty-desc">收藏小红书/抖音的恋爱灵感，点击即可跳转App查看</div>
        </div>
      `;
    }

    return items.map(item => {
      const platformIcon = item.platform === '小红书' ? '📕' : '🎵';
      const tagsHTML = (item.tags || []).map(tag =>
        `<span class="tag tag-tips">${tag}</span>`
      ).join(' ');

      const hasLink = item.url && item.url.trim().length > 0;
      const jumpHint = hasLink
        ? `<span style="font-size:var(--text-xs);color:var(--color-primary);display:flex;align-items:center;gap:2px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            打开${item.platform}
          </span>`
        : '';

      return `
        <div class="card card-hoverable card-accent-tips mb-base" data-id="${item.id}" data-has-link="${hasLink}" data-url="${item.url || ''}" data-platform="${item.platform}">
          <div class="card-header">
            <div class="flex items-center gap-sm">
              <span style="font-size:1.2rem">${platformIcon}</span>
              <span class="card-subtitle">${item.platform}</span>
            </div>
            <span class="text-xs text-muted">${Utils.formatDateShort(item.createdAt)}</span>
          </div>
          <div class="card-body">${item.summary}</div>
          <div class="card-footer">
            <div class="flex gap-sm flex-wrap">${tagsHTML}</div>
            ${jumpHint}
          </div>
        </div>
      `;
    }).join('');
  },

  _bindEvents() {
    this.container.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.filter = tab.dataset.filter;
        this.render(this.container);
      });
    });

    this.container.querySelector('#add-inspiration-btn').addEventListener('click', () => {
      this._showForm();
    });

    this.container.querySelectorAll('.card[data-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        const item = Store.getById('inspiration', card.dataset.id);
        if (!item) return;

        const hasLink = card.dataset.hasLink === 'true';
        const url = card.dataset.url;
        const platform = card.dataset.platform;

        if (hasLink && url) {
          // 尝试用App URL Scheme跳转
          this._openInApp(platform, url);
        } else {
          // 没有链接则进入编辑
          this._showForm(item);
        }
      });

      // 长按卡片进入编辑（移动端）
      let longPressTimer;
      card.addEventListener('touchstart', () => {
        longPressTimer = setTimeout(() => {
          const item = Store.getById('inspiration', card.dataset.id);
          if (item) this._showForm(item);
        }, 600);
      });
      card.addEventListener('touchend', () => clearTimeout(longPressTimer));
      card.addEventListener('touchmove', () => clearTimeout(longPressTimer));
    });
  },

  /**
   * 尝试用App URL Scheme打开小红书/抖音
   * 移动端优先用scheme，PC端用网页版兜底
   */
  _openInApp(platform, url) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (platform === '小红书') {
      if (isMobile) {
        // 手机端：尝试用小红书 App 搜索 scheme 打开
        const keywordMatch = url.match(/keyword=([^&]+)/);
        const keyword = keywordMatch ? decodeURIComponent(keywordMatch[1]) : '情侣';
        const schemeUrl = `xhsdiscover://search/result?keyword=${encodeURIComponent(keyword)}`;
        this._tryOpenApp(schemeUrl, 'https://www.xiaohongshu.com');
      } else {
        // PC 端：直接打开网页版搜索
        window.open(url, '_blank');
      }
    } else if (platform === '抖音') {
      if (isMobile) {
        // 手机端：尝试用抖音 App URL Scheme 唤起
        const schemeUrl = this._buildDouyinScheme(url);
        const fallbackUrl = url.startsWith('http') ? url : `https://www.douyin.com/video/${url}`;
        this._tryOpenApp(schemeUrl, fallbackUrl);
      } else {
        const webUrl = url.startsWith('http') ? url : `https://www.douyin.com/video/${url}`;
        window.open(webUrl, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  },

  /**
   * 根据抖音网页链接构造 App URL Scheme
   * 支持: douyin.com/search/xxx → snssdk1128://search?keyword=xxx
   *       douyin.com/hashtag/xxx → snssdk1128://hashtag?id=xxx
   *       v.douyin.com/xxx → 直接作为 fallback（短链会自动跳转）
   */
  _buildDouyinScheme(url) {
    // 搜索页: https://www.douyin.com/search/关键词
    const searchMatch = url.match(/douyin\.com\/search\/(.+)/);
    if (searchMatch) {
      const keyword = decodeURIComponent(searchMatch[1]);
      return `snssdk1128://search?keyword=${encodeURIComponent(keyword)}`;
    }
    // 话题页: https://www.douyin.com/hashtag/数字ID
    const hashtagMatch = url.match(/douyin\.com\/hashtag\/(\d+)/);
    if (hashtagMatch) {
      return `snssdk1128://hashtag?id=${hashtagMatch[1]}`;
    }
    // 其他情况直接用原始 URL（Universal Link 会尝试唤起 App）
    return url;
  },

  /**
   * 尝试唤起App，超时后降级到网页版
   * iOS Safari 用 smart app banner 或 universal link
   * Android 用 intent:// 或直接 location.href
   */
  _tryOpenApp(appUrl, fallbackUrl) {
    const startTime = Date.now();
    const timeout = 2500;

    // 记录页面隐藏时间（App切换成功会触发）
    let hiddenTime = 0;
    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenTime = Date.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange, { once: false });

    // 尝试跳转
    window.location.href = appUrl;

    // 超时降级：如果2.5秒后还在当前页面，说明App没装，跳网页版
    setTimeout(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      // 如果页面从未隐藏过（App没被唤起），降级到网页版
      if (hiddenTime === 0 || Date.now() - hiddenTime < 100) {
        window.open(fallbackUrl, '_blank');
      }
    }, timeout);
  },

  _showForm(item = null) {
    const isEdit = !!item;
    const title = isEdit ? '编辑灵感' : '添加灵感';
    const data = item || {
      platform: '小红书', url: '', screenshot: '', summary: '', tags: [], createdAt: Utils.getToday()
    };

    const tagOptions = ['清单', '情侣活动', '穿搭', '冬季', '约会', '低成本', '拍照', '居家', '纪念日', '惊喜', '旅行', '目的地', '礼物', '指南', '美食'];
    const tagsHTML = tagOptions.map(tag => {
      const checked = (data.tags || []).includes(tag) ? 'checked' : '';
      return `
        <label style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;margin-bottom:8px;cursor:pointer;font-size:var(--text-sm);color:var(--text-secondary)">
          <input type="checkbox" value="${tag}" ${checked} style="accent-color:var(--text-primary)"> ${tag}
        </label>
      `;
    }).join('');

    const bodyHTML = `
      <div class="input-group">
        <label class="input-label">来源平台</label>
        <select class="input" id="form-platform">
          <option value="小红书" ${data.platform === '小红书' ? 'selected' : ''}>小红书</option>
          <option value="抖音" ${data.platform === '抖音' ? 'selected' : ''}>抖音</option>
        </select>
      </div>
      <div class="input-group">
        <label class="input-label">链接</label>
        <input class="input" id="form-url" value="${data.url}" placeholder="粘贴小红书/抖音链接">
      </div>
      <div class="input-group">
        <label class="input-label">内容摘要</label>
        <textarea class="input" id="form-summary" placeholder="简要描述内容...">${data.summary}</textarea>
      </div>
      <div class="input-group">
        <label class="input-label">标签</label>
        <div style="padding-top:4px">${tagsHTML}</div>
      </div>
    `;

    Components.showModal(title, bodyHTML, (overlay) => {
      const tags = [];
      overlay.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => tags.push(cb.value));

      const updates = {
        platform: overlay.querySelector('#form-platform').value,
        url: overlay.querySelector('#form-url').value.trim(),
        summary: overlay.querySelector('#form-summary').value.trim(),
        tags
      };

      if (!updates.summary) {
        Utils.showToast('请填写内容摘要');
        return;
      }

      if (isEdit) {
        Store.update('inspiration', item.id, updates);
      } else {
        Store.add('inspiration', updates);
      }
      overlay.remove();
      this.render(this.container);
      Utils.showToast(isEdit ? '已更新' : '已添加');
    });
  }
};
