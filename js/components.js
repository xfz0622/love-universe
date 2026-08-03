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
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgSrc = e.target.result;
      this._renderPhotoEditor(imgSrc, aspectRatio, outputSize, onCrop, isMobile);
    };
    reader.readAsDataURL(file);
  },

  /**
   * 第一阶段：照片预览模式（显示完整照片，底部工具栏）
   */
  _renderPhotoEditor(imgSrc, aspectRatio, outputSize, onCrop, isMobile) {
    const overlay = document.createElement('div');
    overlay.className = 'photo-editor-overlay';
    overlay.innerHTML = `
      <div class="photo-editor-header">
        <button class="photo-editor-back">取消</button>
        <span class="photo-editor-title">编辑照片</span>
        <button class="photo-editor-done" style="font-weight:600">确定</button>
      </div>
      <div class="photo-editor-body" id="photo-editor-body">
        <div class="photo-editor-viewport" id="photo-editor-vp">
          <img id="photo-editor-img" src="${imgSrc}" alt="preview">
        </div>
      </div>
      <div class="photo-editor-toolbar">
        <button class="photo-tool-btn" id="photo-tool-crop">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2v14a2 2 0 002 2h14"/><path d="M18 22V8a2 2 0 00-2-2H2"/>
          </svg>
          <span>裁切</span>
        </button>
        <button class="photo-tool-btn" id="photo-tool-rotate">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          <span>旋转</span>
        </button>
        <button class="photo-tool-btn" id="photo-tool-reset">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>
          </svg>
          <span>还原</span>
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    const img = overlay.querySelector('#photo-editor-img');
    const vp = overlay.querySelector('#photo-editor-vp');
    const self = this;

    let rotation = 0;
    let imgNaturalW = 0, imgNaturalH = 0;
    let isCropMode = false;

    // ===== 初始化：完整显示照片 =====
    const fitImage = () => {
      if (!imgNaturalW || !imgNaturalH) return;
      const vpW = vp.clientWidth;
      const vpH = vp.clientHeight;
      const imgRatio = imgNaturalW / imgNaturalH;
      let w, h;
      if (rotation % 180 === 0) {
        if (vpW / vpH > imgRatio) { h = vpH; w = h * imgRatio; }
        else { w = vpW; h = w / imgRatio; }
      } else {
        const rRatio = 1 / imgRatio;
        if (vpW / vpH > rRatio) { h = vpH; w = h * rRatio; }
        else { w = vpW; h = w / rRatio; }
      }
      img.style.width = `${w}px`;
      img.style.height = `${h}px`;
      img.style.transform = `rotate(${rotation}deg)`;
    };

    if (img.complete) {
      imgNaturalW = img.naturalWidth;
      imgNaturalH = img.naturalHeight;
      fitImage();
    } else {
      img.onload = () => {
        imgNaturalW = img.naturalWidth;
        imgNaturalH = img.naturalHeight;
        fitImage();
      };
    }

    window.addEventListener('resize', fitImage);

    // ===== 工具栏按钮 =====
    const close = () => {
      window.removeEventListener('resize', fitImage);
      overlay.remove();
    };

    // 取消
    overlay.querySelector('.photo-editor-back').addEventListener('click', close);

    // 确定：直接输出当前可见区域（完整照片或裁剪结果）
    overlay.querySelector('.photo-editor-done').addEventListener('click', () => {
      if (isCropMode) {
        // 裁剪模式：触发裁剪器确定
        const cropConfirm = overlay.querySelector('.cropper-confirm');
        if (cropConfirm) cropConfirm.click();
        return;
      }
      // 预览模式：输出完整照片
      const canvas = document.createElement('canvas');
      if (rotation % 180 === 0) {
        canvas.width = outputSize;
        canvas.height = Math.round(outputSize / (imgNaturalW / imgNaturalH));
      } else {
        canvas.width = outputSize;
        canvas.height = Math.round(outputSize / (imgNaturalH / imgNaturalW));
      }
      const ctx = canvas.getContext('2d');
      const naturalImg = new Image();
      naturalImg.onload = () => {
        if (rotation > 0) {
          ctx.translate(canvas.width/2, canvas.height/2);
          ctx.rotate(rotation * Math.PI / 180);
          ctx.drawImage(naturalImg, -canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
        } else {
          ctx.drawImage(naturalImg, 0, 0, canvas.width, canvas.height);
        }
        const base64 = canvas.toDataURL('image/jpeg', 0.9);
        close();
        if (onCrop) onCrop(base64);
      };
      naturalImg.src = imgSrc;
    });

    // 旋转
    overlay.querySelector('#photo-tool-rotate').addEventListener('click', () => {
      rotation = (rotation + 90) % 360;
      fitImage();
    });

    // 还原
    overlay.querySelector('#photo-tool-reset').addEventListener('click', () => {
      rotation = 0;
      fitImage();
    });

    // ===== 裁切按钮：进入裁剪模式 =====
    overlay.querySelector('#photo-tool-crop').addEventListener('click', () => {
      if (isCropMode) return;
      isCropMode = true;
      // 隐藏工具栏
      overlay.querySelector('.photo-editor-toolbar').style.display = 'none';
      // 替换 body 内容为裁剪器
      const body = overlay.querySelector('.photo-editor-body');
      self._renderCropMode(body, imgSrc, aspectRatio, outputSize, onCrop, () => {
        // 退出裁剪模式回调
        isCropMode = false;
        overlay.querySelector('.photo-editor-toolbar').style.display = '';
        // 恢复预览模式
        body.innerHTML = `
          <div class="photo-editor-viewport" id="photo-editor-vp">
            <img id="photo-editor-img" src="${imgSrc}" alt="preview">
          </div>
        `;
        const newImg = body.querySelector('#photo-editor-img');
        newImg.onload = () => {
          imgNaturalW = newImg.naturalWidth;
          imgNaturalH = newImg.naturalHeight;
          fitImage();
        };
        // 重新绑定 vp/img 引用
        // 注意：这里 img 和 vp 还是旧的引用，但 fitImage 用的是 id 查找
      }, () => {
        // 裁剪完成回调：替换 imgSrc 为裁剪结果
        // 简化：直接关闭
        close();
      });
    });
  },

  /**
   * 第二阶段：裁剪模式（替换 body 内容）
   */
  _renderCropMode(bodyEl, imgSrc, aspectRatio, outputSize, onCrop, onExitCrop, onCropDone) {
    bodyEl.innerHTML = `
      <div class="cropper-viewport" id="cropper-vp">
        <img class="cropper-image" id="cropper-img" src="${imgSrc}" alt="crop">
        <div class="cropper-mask"></div>
      </div>
      <div class="cropper-footer">
        <div class="cropper-zoom-bar">
          <span class="cropper-zoom-label">缩放</span>
          <input type="range" class="cropper-zoom-slider" id="cropper-slider" min="0.5" max="3" step="0.01" value="1">
        </div>
        <div class="cropper-actions">
          <button class="btn btn-ghost cropper-cancel">取消裁切</button>
          <button class="btn btn-primary cropper-confirm">完成裁切</button>
        </div>
      </div>
    `;

    const overlay = bodyEl.closest('.photo-editor-overlay');
    const img = bodyEl.querySelector('#cropper-img');
    const viewport = bodyEl.querySelector('#cropper-vp');
    const slider = bodyEl.querySelector('#cropper-slider');

    let scale = 1;
    let offsetX = 0, offsetY = 0;
    let isDragging = false;
    let startX, startY, startOffX, startOffY;
    let lastDist = 0;
    let imgNaturalW, imgNaturalH;

    const clampOffset = () => {
      if (!imgNaturalW || !imgNaturalH) return;
      const vpW = viewport.clientWidth;
      const vpH = viewport.clientHeight;
      const w = imgNaturalW * scale;
      const h = imgNaturalH * scale;
      const maxX = Math.max(0, (w - vpW) / 2);
      const maxY = Math.max(0, (h - vpH) / 2);
      offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
      offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
    };

    const updateTransform = () => {
      clampOffset();
      img.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    };

    const initImage = () => {
      imgNaturalW = img.naturalWidth;
      imgNaturalH = img.naturalHeight;
      if (!imgNaturalW || !imgNaturalH) return;
      const vpW = viewport.clientWidth || viewport.parentElement.clientWidth;
      const vpH = viewport.clientHeight || viewport.parentElement.clientHeight;
      scale = Math.min(vpW / imgNaturalW, vpH / imgNaturalH);
      if (scale < 0.5) scale = 0.5;
      if (scale > 3) scale = 3;
      slider.value = scale;
      offsetX = 0;
      offsetY = 0;

      const mask = bodyEl.querySelector('.cropper-mask');
      if (mask) {
        const imgRatio = imgNaturalW / imgNaturalH;
        const maxMaskSize = Math.min(vpW, vpH) * 0.85;
        if (imgRatio >= 1) {
          mask.style.width = `${maxMaskSize}px`;
          mask.style.height = `${maxMaskSize / imgRatio}px`;
        } else {
          mask.style.height = `${maxMaskSize}px`;
          mask.style.width = `${maxMaskSize * imgRatio}px`;
        }
      }
      updateTransform();
    };

    if (img.complete) { initImage(); } else { img.onload = initImage; }

    slider.addEventListener('input', () => { scale = parseFloat(slider.value); updateTransform(); });

    viewport.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      startOffX = offsetX; startOffY = offsetY;
    });

    const onMouseMove = (e) => {
      if (!isDragging) return;
      offsetX = startOffX + (e.clientX - startX);
      offsetY = startOffY + (e.clientY - startY);
      updateTransform();
    };
    const onMouseUp = () => { isDragging = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        startOffX = offsetX; startOffY = offsetY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && isDragging) {
        e.preventDefault();
        offsetX = startOffX + (e.touches[0].clientX - startX);
        offsetY = startOffY + (e.touches[0].clientY - startY);
        updateTransform();
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (lastDist > 0) {
          scale *= dist / lastDist;
          scale = Math.max(0.5, Math.min(3, scale));
          slider.value = scale;
          updateTransform();
        }
        lastDist = dist;
      }
    }, { passive: false });

    viewport.addEventListener('touchend', () => { isDragging = false; lastDist = 0; });
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      scale += e.deltaY > 0 ? -0.05 : 0.05;
      scale = Math.max(0.5, Math.min(3, scale));
      slider.value = scale;
      updateTransform();
    });

    const cleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    bodyEl.querySelector('.cropper-cancel').addEventListener('click', () => {
      cleanup();
      if (onExitCrop) onExitCrop();
    });

    bodyEl.querySelector('.cropper-confirm').addEventListener('click', () => {
      cleanup();
      const vpW = viewport.clientWidth;
      const vpH = viewport.clientHeight;
      const mask = bodyEl.querySelector('.cropper-mask');
      const maskW = mask ? parseFloat(mask.style.width) || mask.offsetWidth : Math.min(vpW, vpH) * 0.85;
      const maskH = mask ? parseFloat(mask.style.height) || mask.offsetHeight : Math.min(vpW, vpH) * 0.85;
      const cropSize = Math.min(maskW, maskH);
      const cropW = aspectRatio >= 1 ? cropSize : cropSize * aspectRatio;
      const cropH = cropSize / aspectRatio;

      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = Math.round(outputSize / aspectRatio);
      const ctx = canvas.getContext('2d');

      const imgW = imgNaturalW * scale;
      const imgH = imgNaturalH * scale;
      const imgLeft = (vpW - imgW) / 2 + offsetX;
      const imgTop = (vpH - imgH) / 2 + offsetY;
      const cropLeft = (vpW - cropW) / 2;
      const cropTop = (vpH - cropH) / 2;

      const srcX = (cropLeft - imgLeft) / scale;
      const srcY = (cropTop - imgTop) / scale;
      const srcW = cropW / scale;
      const srcH = cropH / scale;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputSize, Math.round(outputSize / aspectRatio));
      const base64 = canvas.toDataURL('image/jpeg', 0.9);

      // 回到预览模式并更新图片
      if (onExitCrop) onExitCrop();

      if (onCrop) onCrop(base64);
    });
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
