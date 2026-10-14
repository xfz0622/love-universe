/* ===== 【我们的恋爱小宇宙】可复用组件 ===== */

const Components = {
  /**
   * 渲染恋爱时长计数器
   */
  renderLoveCounter(container) {
    const profile = Store.getProfile();
    const days = Utils.getLoveDays(profile.togetherDate);
    const duration = Utils.formatLoveDuration(days);

    container.innerHTML = `
      <div class="love-counter">
        <div class="love-counter-days">${days}</div>
        <div class="love-counter-label">在一起的第 ${days} 天</div>
        <div class="love-counter-unit">${duration} · since ${profile.togetherDate}</div>
      </div>
    `;

    // 实时更新（每分钟刷新一次）
    if (this._counterInterval) clearInterval(this._counterInterval);
    this._counterInterval = setInterval(() => {
      const d = Utils.getLoveDays(profile.togetherDate);
      const dur = Utils.formatLoveDuration(d);
      container.querySelector('.love-counter-days').textContent = d;
      container.querySelector('.love-counter-label').textContent = `在一起的第 ${d} 天`;
      container.querySelector('.love-counter-unit').textContent = `${dur} · since ${profile.togetherDate}`;
    }, 60000);
  },

  /**
   * 渲染柱状图（CSS手绘）
   */
  renderBarChart(container, data, options = {}) {
    const { height = 140, barColor = 'var(--text-primary)', labels = [], values = [], valueFormatter = v => `¥${v}` } = options;

    if (labels.length === 0 && data) {
      labels.push(...data.map(d => d.label));
      values.push(...data.map(d => d.value));
    }

    const maxVal = Math.max(...values, 1);
    const bars = labels.map((label, i) => {
      const h = Math.max((values[i] / maxVal) * 100, 4);
      return `
        <div class="bar-item">
          <span class="bar-value">${valueFormatter(values[i])}</span>
          <div class="bar-fill-wrapper">
            <div class="bar-fill" style="height:${h}%; background:${barColor}"></div>
          </div>
          <span class="bar-label">${label}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="bar-chart" style="height:${height}px">${bars}</div>`;
  },

  /**
   * 渲染饼图（conic-gradient）
   */
  renderPieChart(container, segments) {
    // segments: [{ label, value, color }]
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (total === 0) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:var(--text-sm)">暂无数据</div>';
      return;
    }

    let cumulative = 0;
    const gradientParts = segments.map(seg => {
      const start = cumulative;
      const pct = (seg.value / total) * 100;
      cumulative += pct;
      return `${seg.color} ${start}% ${cumulative}%`;
    }).join(', ');

    const legend = segments.map(seg => {
      const pct = ((seg.value / total) * 100).toFixed(1);
      return `
        <div class="pie-legend-item">
          <span class="pie-legend-dot" style="background:${seg.color}"></span>
          ${seg.label} · ${Utils.formatMoney(seg.value)} (${pct}%)
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:var(--space-xl);justify-content:center;flex-wrap:wrap">
        <div class="pie-chart" style="background:conic-gradient(${gradientParts})"></div>
        <div class="pie-legend">${legend}</div>
      </div>
    `;
  },

  /**
   * 渲染即将到来的纪念日列表
   */
  renderUpcomingAnniversaries(container) {
    const anniversaries = Store.getUpcomingAnniversaries(3);

    if (anniversaries.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-desc">近期暂无纪念日</div></div>';
      return;
    }

    const items = anniversaries.map(a => {
      const urgencyClass = a.daysUntil <= 3 ? 'tag-warning' : a.daysUntil <= 7 ? 'tag-timeline' : '';
      const dateObj = new Date(a.nextDate);
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();
      return `
        <div class="countdown-item">
          <div class="countdown-date">
            <div class="countdown-day">${String(day).padStart(2,'0')}</div>
            <div class="countdown-month">${month}月</div>
          </div>
          <div class="countdown-info">
            <div class="countdown-name" title="${a.name}">${a.name}</div>
            <div class="countdown-days-left">${a.daysUntil === 0 ? '今天' : a.daysUntil === 1 ? '明天' : `还有${a.daysUntil}天`}</div>
          </div>
          <span class="tag ${urgencyClass || 'tag-timeline'} countdown-tag">
            ${a.daysUntil === 0 ? '今天' : a.daysUntil === 1 ? '明天' : `${a.daysUntil}天`}
          </span>
        </div>
      `;
    }).join('');

    container.innerHTML = items;
  },

  /**
   * 渲染今日Tips
   */
  renderDailyTip(container) {
    // 根据纪念日判断今天是否见面 → 选择不同 tips 库
    const anniversaries = Store.data.anniversaries || [];
    const tip = getTodayTip(anniversaries);

    // 判断当前模式
    const today = new Date().toISOString().slice(0, 10);
    const isMeetup = anniversaries.some(a => {
      if (!a.date) return false;
      const isMeet = (a.title || a.label || '').includes('见面') ||
                     (a.type || '').includes('见面') ||
                     (a.tags && a.tags.some(t => t.includes('见面')));
      return isMeet && a.date === today;
    });

    const badge = isMeetup
      ? '<span style="display:inline-block;background:var(--color-rose);color:#fff;font-size:var(--text-xs);padding:2px 8px;border-radius:10px;margin-right:6px">见面日</span>'
      : '';

    container.innerHTML = `
      <div style="padding:var(--space-sm) 0">
        <p style="font-family:var(--font-serif);font-size:var(--text-md);color:var(--text-primary);line-height:1.8;margin-bottom:0">
          ${tip}
        </p>
        <div style="margin-top:var(--space-base);display:flex;align-items:center;gap:var(--space-sm)">
          ${badge}
          <span style="font-size:var(--text-xs);color:var(--text-muted)">今日恋爱小Tips</span>
          <span style="font-size:14px">❤️</span>
        </div>
      </div>
    `;
  },

  /**
   * 渲染待购物品汇总
   */
  renderShoppingSummary(container) {
    const items = Store.getShopping().filter(s => s.status === 'pending' || s.status === 'ordered');
    const count = items.length;
    const urgent = items.filter(s => s.deadline && Utils.daysBetween(Utils.getToday(), s.deadline) <= 7).length;

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:var(--space-lg)">
        <div class="stat-card-value" style="font-size:var(--text-2xl)">${count}</div>
        <div>
          <div class="text-sm text-secondary">待处理物品</div>
          ${urgent > 0 ? `<div class="text-xs" style="color:var(--color-warning);margin-top:2px">${urgent}项临近截止</div>` : ''}
        </div>
      </div>
      <div class="progress-bar mt-md">
        <div class="progress-fill success" style="width:${Store.getShopping().filter(s=>s.status==='completed').length / Math.max(Store.getShopping().length,1) * 100}%"></div>
      </div>
    `;
  },

  /**
   * 渲染账本月度统计卡片
   */
  renderLedgerStats(container) {
    const { year, month } = Utils.getCurrentYearMonth();
    const summary = Store.getLedgerMonthlySummary(year, month);
    const recentMonths = Store.getLedgerRecentMonths(6);

    const chartData = {
      labels: recentMonths.map(m => Utils.getMonthName(m.month)),
      values: recentMonths.map(m => m.total)
    };

    container.innerHTML = `
      <div style="display:flex;align-items:baseline;gap:var(--space-sm);margin-bottom:var(--space-base)">
        <span class="stat-card-value">${Utils.formatMoney(summary.total)}</span>
        <span class="stat-card-label">${Utils.getMonthName(month)}总支出</span>
      </div>
      <div id="ledger-bar-chart"></div>
    `;

    this.renderBarChart(
      container.querySelector('#ledger-bar-chart'),
      null,
      {
        height: 120,
        barColor: 'var(--text-primary)',
        labels: chartData.labels,
        values: chartData.values,
        valueFormatter: v => v > 0 ? `¥${(v/1000).toFixed(1)}k` : '¥0'
      }
    );
  },

  /**
   * 渲染旅行相册预览
   */
  renderTravelPreview(container) {
    const travels = Store.getTravels().filter(t => t.tags && t.tags.includes('已打卡')).slice(0, 6);

    if (travels.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-desc">还没有打卡记录</div></div>';
      return;
    }

    // 手绘风格的小图标 — 粗线条简笔画
    const doodles = [
      `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 38l14-24 8 12 6-8 8 20H8z"/><circle cx="36" cy="14" r="3"/></svg>`,
      `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="18" width="10" height="24"/><rect x="20" y="10" width="10" height="32"/><rect x="32" y="22" width="8" height="20"/><path d="M6 42h36"/></svg>`,
      `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 30c4-4 8-2 12 0s8 2 12 0 8-4 12 0"/><path d="M6 38c4-4 8-2 12 0s8 2 12 0 8-4 12 0"/><circle cx="36" cy="12" r="4"/></svg>`,
      `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6v36"/><path d="M12 14h24"/><path d="M10 42h28"/><rect x="16" y="20" width="6" height="10"/><rect x="28" y="24" width="6" height="10"/></svg>`,
      `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="16" width="30" height="18" rx="3"/><path d="M36 22h6"/><path d="M36 28h6"/><circle cx="14" cy="38" r="3"/><circle cx="30" cy="38" r="3"/></svg>`,
      `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 36c6-8 12-4 18 0s12 4 18 0"/><path d="M10 28c5-6 10-3 15 0s10 3 15 0"/><circle cx="24" cy="10" r="2"/></svg>`
    ];

    const photos = travels.map((t, i) => {
      const doodle = doodles[i % doodles.length];
      return `
        <div class="photo-item" title="${t.location} · ${Utils.formatDateShort(t.startDate)}">
          <div class="img-placeholder" style="background:var(--color-travel-ghost);width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--color-travel);gap:6px">
            <div style="width:32px;height:32px">${doodle}</div>
            <span style="font-size:10px;font-family:var(--font-sans);font-weight:500;color:var(--text-secondary)">${t.location}</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="photo-grid">${photos}</div>`;
  },

  /**
   * 渲染底部导航栏
   */
  renderNavbar(container, currentPage) {
    const tabs = [
      { id: 'dashboard', icon: 'home', label: '首页', color: 'var(--color-primary)' },
      { id: 'timeline', icon: 'calendar', label: '纪念日', color: 'var(--color-timeline)' },
      { id: 'travel', icon: 'map', label: '旅行', color: 'var(--color-travel)' },
      { id: 'food', icon: 'food', label: '美食', color: 'var(--color-food)' },
      { id: 'game', icon: 'game', label: '游戏', color: 'var(--color-food)' },
      { id: 'ledger', icon: 'wallet', label: '账本', color: 'var(--color-ledger)' },
      { id: 'shopping', icon: 'cart', label: '购物', color: 'var(--color-shopping)' },
      { id: 'inspiration', icon: 'idea', label: '灵感', color: 'var(--color-tips)' }
    ];

    // 图标渲染：首页用SVG，其余用手绘PNG图标
    const iconBase = 'assets/icons';
    const icons = {
      home: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      calendar: `<img src="${iconBase}/nav_anniversary.png" width="22" height="22" alt="纪念日" style="object-fit:contain">`,
      map: `<img src="${iconBase}/nav_travel.png" width="22" height="22" alt="旅行" style="object-fit:contain">`,
      food: '<span style="font-size:20px">🍽️</span>',
      game: `<img src="${iconBase}/nav_games.png" width="22" height="22" alt="游戏" style="object-fit:contain">`,
      wallet: `<img src="${iconBase}/nav_ledger.png" width="22" height="22" alt="账本" style="object-fit:contain">`,
      cart: `<img src="${iconBase}/nav_shopping.png" width="22" height="22" alt="购物" style="object-fit:contain">`,
      idea: `<img src="${iconBase}/nav_inspiration.png" width="22" height="22" alt="灵感" style="object-fit:contain">`
    };

    const tabElements = tabs.map(t => {
      const active = currentPage === t.id;
      const color = active ? t.color : 'var(--text-muted)';
      const iconHTML = icons[t.icon];
      // PNG图标用opacity表示未激活，SVG用color
      const isPng = iconHTML.startsWith('<img');
      const styleAttr = isPng
        ? `opacity:${active ? '1' : '0.5'};filter:${active ? 'none' : 'grayscale(0.6)'}`
        : `color:${color}`;
      return `
        <button class="nav-tab ${active ? 'active' : ''}" data-page="${t.id}" style="color:${color}">
          <span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;${styleAttr}">${iconHTML}</span>
          <span class="nav-tab-label">${t.label}</span>
        </button>
      `;
    }).join('');

    container.innerHTML = tabElements;

    // 点击事件
    container.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const page = tab.dataset.page;
        App.navigateTo(page);
      });
    });
  },

  /**
   * 渲染星级评分
   */
  renderStarRating(container, rating, readonly = true) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      const active = i <= rating ? 'active' : '';
      stars += `<span class="star ${active}" data-value="${i}">★</span>`;
    }
    container.innerHTML = `<div class="star-rating">${stars}</div>`;

    if (!readonly) {
      container.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', () => {
          const val = parseInt(star.dataset.value);
          container.querySelectorAll('.star').forEach((s, idx) => {
            s.classList.toggle('active', idx < val);
          });
          container.dataset.rating = val;
        });
      });
    }
  },

  /**
   * 渲染页面顶部标题
   */
  renderPageHeader(container, title, subtitle = '', accentColor = 'var(--color-primary)') {
    container.innerHTML = `
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:var(--space-md)">
          <div style="width:4px;height:24px;background:${accentColor};border-radius:2px"></div>
          <div>
            <h2 class="page-header-title">${title}</h2>
            ${subtitle ? `<p class="page-header-subtitle">${subtitle}</p>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 渲染模态框
   */
  showModal(title, bodyHTML, onSave, onClose) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        <div class="modal-footer">
          <button class="btn btn-ghost modal-cancel">取消</button>
          <button class="btn btn-primary modal-save">保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
      if (onClose) onClose();
    };

    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('.modal-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    overlay.querySelector('.modal-save').addEventListener('click', () => {
      if (onSave) onSave(overlay);
    });

    return overlay;
  },

  /**
   * 显示确认对话框
   */
  showConfirm(title, desc, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%">
        <div class="confirm-dialog">
          <h3 class="confirm-dialog-title">${title}</h3>
          <p class="confirm-dialog-desc">${desc}</p>
          <div class="confirm-dialog-actions">
            <button class="btn btn-ghost cancel-btn">取消</button>
            <button class="btn btn-danger confirm-btn">确认</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.cancel-btn').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector('.confirm-btn').addEventListener('click', () => {
      onConfirm();
      close();
    });
  },

  /**
   * 图片裁剪器 - 微信风格：先预览完整照片，可选进入裁剪模式
   * @param {File} file - 图片文件
   * @param {Function} onCrop - 裁剪完成回调，参数为 base64 字符串
   * @param {Object} opts - { aspectRatio: 1, outputSize: 400 }
   */
  showImageCropper(file, onCrop, opts = {}) {
    const aspectRatio = opts.aspectRatio || 1;
    const outputSize = opts.outputSize || 400;

    const reader = new FileReader();
    reader.onload = (e) => {
      this._renderCropper(e.target.result, aspectRatio, outputSize, onCrop);
    };
    reader.onerror = () => {
      if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('图片读取失败，请重试');
    };
    reader.readAsDataURL(file);
  },

  /**
   * 头像裁切器（参考微信）
   * - 固定裁切框（按 aspectRatio），图片在其下方自由拖动 / 双指缩放 / 滑块缩放
   * - 松手后图片自动吸附，保证裁切框始终被图片完全覆盖（不露白）
   * - 输出的就是裁切框内的内容，坐标按原始像素精确反算
   */
  _renderCropper(imgSrc, aspectRatio, outputSize, onCrop) {
    const overlay = document.createElement('div');
    overlay.className = 'cropper-overlay';
    overlay.innerHTML = `
      <div class="cropper-container">
        <div class="cropper-header">
          <button class="cropper-close" id="cropper-cancel" aria-label="取消">×</button>
          <span class="cropper-title">裁剪头像</span>
          <button class="cropper-done" id="cropper-done">完成</button>
        </div>
        <div class="cropper-stage" id="cropper-stage">
          <img class="cropper-image" id="cropper-img" src="${imgSrc}" alt="crop" draggable="false">
          <div class="cropper-frame" id="cropper-frame">
            <div class="cropper-grid">
              <span class="g-v g-v1"></span><span class="g-v g-v2"></span>
              <span class="g-h g-h1"></span><span class="g-h g-h2"></span>
            </div>
          </div>
        </div>
        <div class="cropper-footer">
          <div class="cropper-zoom-bar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <input type="range" class="cropper-zoom-slider" id="cropper-slider" min="0" max="1" step="0.001" value="0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </div>
          <button class="btn btn-primary cropper-confirm" id="cropper-confirm">完成裁切</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const stage = overlay.querySelector('#cropper-stage');
    const img = overlay.querySelector('#cropper-img');
    const frame = overlay.querySelector('#cropper-frame');
    const slider = overlay.querySelector('#cropper-slider');

    let imgW = 0, imgH = 0;           // 图片原始像素
    let stageW = 0, stageH = 0;       // 舞台尺寸
    let fw = 0, fh = 0;               // 裁切框尺寸
    let fx = 0, fy = 0;               // 裁切框左上角（相对舞台）
    let scale = 1;                    // 当前缩放（图片显示尺寸 = 原始尺寸 * scale）
    let minScale = 1, maxScale = 4;
    let tx = 0, ty = 0;               // 图片左上角位置（相对舞台）
    let dragging = false, startX = 0, startY = 0, startTx = 0, startTy = 0;
    let pinchDist = 0, pinchScale = 1, pinchCx = 0, pinchCy = 0;

    const layout = () => {
      stageW = stage.clientWidth;
      stageH = stage.clientHeight;

      // 计算裁切框：留出边距，按 aspectRatio 适配
      const margin = 28;
      const availW = stageW - margin * 2;
      const availH = stageH - margin * 2;
      if (aspectRatio >= 1) {
        fw = Math.min(availW, availH * aspectRatio);
        fh = fw / aspectRatio;
      } else {
        fh = Math.min(availH, availW / aspectRatio);
        fw = fh * aspectRatio;
      }
      fx = (stageW - fw) / 2;
      fy = (stageH - fh) / 2;

      frame.style.width = `${fw}px`;
      frame.style.height = `${fh}px`;
      frame.style.left = `${fx}px`;
      frame.style.top = `${fy}px`;
      frame.style.borderRadius = aspectRatio === 1 ? '50%' : '8px';

      // 最小缩放：让图片刚好覆盖裁切框
      minScale = Math.max(fw / imgW, fh / imgH);
      maxScale = minScale * 4;
    };

    const clamp = () => {
      // 保证图片始终完全覆盖裁切框
      const dispW = imgW * scale;
      const dispH = imgH * scale;
      const minTx = fx + fw - dispW;
      const maxTx = fx;
      const minTy = fy + fh - dispH;
      const maxTy = fy;
      tx = Math.min(maxTx, Math.max(minTx, tx));
      ty = Math.min(maxTy, Math.max(minTy, ty));
    };

    const render = () => {
      clamp();
      const dispW = imgW * scale;
      const dispH = imgH * scale;
      img.style.width = `${dispW}px`;
      img.style.height = `${dispH}px`;
      img.style.left = `${tx}px`;
      img.style.top = `${ty}px`;
    };

    const syncSlider = () => {
      // 滑块 0~1 映射到 minScale~maxScale
      const t = maxScale > minScale ? (scale - minScale) / (maxScale - minScale) : 0;
      slider.value = String(Math.max(0, Math.min(1, t)));
    };

    const centerImage = () => {
      const dispW = imgW * scale;
      const dispH = imgH * scale;
      tx = fx + (fw - dispW) / 2;
      ty = fy + (fh - dispH) / 2;
    };

    const initImage = () => {
      imgW = img.naturalWidth;
      imgH = img.naturalHeight;
      if (!imgW || !imgH) {
        if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('图片加载失败');
        return;
      }
      layout();
      scale = minScale;      // 初始刚好铺满裁切框
      centerImage();
      syncSlider();
      render();
    };

    if (img.complete && img.naturalWidth) initImage();
    else img.onload = initImage;

    const onResize = () => {
      if (!imgW || !imgH) return;
      const prevMin = minScale;
      layout();
      // 保持相对缩放不变
      scale = Math.max(minScale, Math.min(maxScale, scale * (minScale / prevMin)));
      centerImage();
      syncSlider();
      render();
    };
    window.addEventListener('resize', onResize);

    // ===== 缩放核心：以某锚点为中心缩放，锚点保持不动 =====
    const zoomAt = (clientX, clientY, newScale) => {
      newScale = Math.max(minScale, Math.min(maxScale, newScale));
      const rect = stage.getBoundingClientRect();
      const px = clientX - rect.left;   // 锚点在舞台坐标系
      const py = clientY - rect.top;
      const ratio = newScale / scale;
      // 锚点相对图片左上角的位置按比例放大
      tx = px - (px - tx) * ratio;
      ty = py - (py - ty) * ratio;
      scale = newScale;
      render();
      syncSlider();
    };

    // ===== 鼠标拖动 =====
    stage.addEventListener('mousedown', (e) => {
      e.preventDefault();
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startTx = tx; startTy = ty;
      stage.classList.add('grabbing');
    });
    const onMouseMove = (e) => {
      if (!dragging) return;
      tx = startTx + (e.clientX - startX);
      ty = startTy + (e.clientY - startY);
      render();
    };
    const onMouseUp = () => { dragging = false; stage.classList.remove('grabbing'); };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // ===== 触摸：单指拖动，双指缩放 =====
    stage.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        dragging = true;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        startTx = tx; startTy = ty;
      } else if (e.touches.length === 2) {
        dragging = false;
        pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchScale = scale;
        pinchCx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        pinchCy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    }, { passive: true });

    stage.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && dragging) {
        e.preventDefault();
        tx = startTx + (e.touches[0].clientX - startX);
        ty = startTy + (e.touches[0].clientY - startY);
        render();
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (pinchDist > 0) {
          zoomAt(pinchCx, pinchCy, pinchScale * (dist / pinchDist));
        }
      }
    }, { passive: false });

    stage.addEventListener('touchend', () => { dragging = false; pinchDist = 0; });

    // ===== 滚轮缩放（桌面）=====
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      zoomAt(e.clientX, e.clientY, scale * factor);
    }, { passive: false });

    // ===== 滑块缩放（以裁切框中心为锚点）=====
    slider.addEventListener('input', () => {
      const t = parseFloat(slider.value);
      const newScale = minScale + (maxScale - minScale) * t;
      const rect = stage.getBoundingClientRect();
      zoomAt(rect.left + fx + fw / 2, rect.top + fy + fh / 2, newScale);
    });

    // ===== 清理 =====
    const cleanup = () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    const close = () => { cleanup(); overlay.remove(); };

    overlay.querySelector('#cropper-cancel').addEventListener('click', close);

    // ===== 完成：按裁切框反算原图坐标并输出 =====
    const confirm = () => {
      // 裁切框相对图片左上角的偏移（显示像素）
      const dx = fx - tx;
      const dy = fy - ty;
      // 换算到原图像素
      const srcX = dx / scale;
      const srcY = dy / scale;
      const srcW = fw / scale;
      const srcH = fh / scale;

      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = Math.round(outputSize / aspectRatio);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const naturalImg = new Image();
      naturalImg.onload = () => {
        ctx.drawImage(
          naturalImg,
          srcX, srcY, srcW, srcH,
          0, 0, canvas.width, canvas.height
        );
        let base64;
        try {
          base64 = canvas.toDataURL('image/jpeg', 0.92);
        } catch (err) {
          if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('裁剪失败，请重试');
          close();
          return;
        }
        close();
        if (onCrop) onCrop(base64);
      };
      naturalImg.onerror = () => {
        if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('裁剪失败，请重试');
        close();
      };
      naturalImg.src = imgSrc;
    };

    overlay.querySelector('#cropper-confirm').addEventListener('click', confirm);
    overlay.querySelector('#cropper-done').addEventListener('click', confirm);
  },

  /**
   * 卡片依次入场动画
   */
  animateCards(container, selector = '.card, .list-item', delay = 40) {
    const cards = container.querySelectorAll(selector);
    cards.forEach((card, i) => {
      card.style.animationDelay = `${i * delay}ms`;
      card.classList.add('card-stagger');
    });
  }
};
