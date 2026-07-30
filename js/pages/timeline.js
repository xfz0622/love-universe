/* ===== 【我们的恋爱小宇宙】纪念日页面 ===== */
const TimelinePage = {
  filter: 'all', // all | active | completed

  render(container) {
    this.container = container;
    const anniversaries = Store.getAnniversaries();
    const filtered = this.filter === 'all'
      ? anniversaries
      : anniversaries.filter(a => a.status === this.filter);

    // 排序：按下次日期
    const sorted = [...filtered].map(a => {
      const nextDate = Utils.getNextAnniversaryDate(a);
      const daysUntil = Utils.getDaysUntil(nextDate);
      return { ...a, nextDate: Utils.formatDate(nextDate), daysUntil };
    }).sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return a.daysUntil - b.daysUntil;
    });

    container.innerHTML = `
      ${this._renderHeader()}
      ${this._renderFilters()}
      <div class="page-content" style="padding-top:0">
        <div id="timeline-list">
          ${this._renderList(sorted)}
        </div>
      </div>
      <button class="btn-fab" id="add-anniversary-btn">+</button>
    `;

    this._bindEvents();
    Components.animateCards(this.container, '.timeline-card');
  },

  _renderHeader() {
    const activeCount = Store.getAnniversaries().filter(a => a.status === 'active').length;
    return `
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:var(--space-md)">
          <div style="width:4px;height:24px;background:var(--color-timeline);border-radius:2px"></div>
          <div>
            <h2 class="page-header-title">纪念日清单</h2>
            <p class="page-header-subtitle">${activeCount}个进行中 · 珍惜每一个值得纪念的日子</p>
          </div>
        </div>
      </div>
    `;
  },

  _renderFilters() {
    const tabs = [
      { id: 'all', label: '全部' },
      { id: 'active', label: '进行中' },
      { id: 'completed', label: '已完成' }
    ];
    const tabsHTML = tabs.map(t => `
      <button class="filter-tab ${this.filter === t.id ? 'active' : ''}" data-filter="${t.id}">${t.label}</button>
    `).join('');
    return `<div class="filter-tabs">${tabsHTML}</div>`;
  },

  _renderList(items) {
    if (items.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <div class="empty-title">暂无纪念日</div>
          <div class="empty-desc">点击右下角 + 添加你们的专属纪念日</div>
        </div>
      `;
    }

    return items.map(a => {
      const dateObj = new Date(a.nextDate || a.date);
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();
      const statusTag = a.status === 'completed'
        ? '<span class="tag tag-success">已完成</span>'
        : a.daysUntil <= 3
          ? '<span class="tag tag-warning">临近</span>'
          : '<span class="tag tag-timeline">进行中</span>';

      const daysText = a.status === 'completed'
        ? '已完成'
        : a.daysUntil === 0 ? '今天' : a.daysUntil === 1 ? '明天' : `还有${a.daysUntil}天`;

      const repeatLabel = a.repeatCycle === 'yearly' ? '每年' : '单次';

      return `
        <div class="card card-hoverable card-accent-timeline mb-base" data-id="${a.id}">
          <div class="card-header">
            <div class="flex items-center gap-md">
              <div style="text-align:center;min-width:40px">
                <div style="font-family:var(--font-sans);font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--color-timeline);line-height:1">${String(day).padStart(2,'0')}</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted)">${month}月</div>
              </div>
              <div>
                <div class="card-title">${a.name}</div>
                <div class="card-subtitle">${repeatLabel}重复 · 提前${a.remindDays}天提醒</div>
              </div>
            </div>
            ${statusTag}
          </div>
          <div class="card-body">
            <span style="color:var(--color-timeline);font-weight:var(--weight-medium)">${daysText}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  _bindEvents() {
    // 筛选标签
    this.container.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.filter = tab.dataset.filter;
        this.render(this.container);
      });
    });

    // 添加按钮
    this.container.querySelector('#add-anniversary-btn').addEventListener('click', () => {
      this._showForm();
    });

    // 卡片点击
    this.container.querySelectorAll('.card[data-id]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const item = Store.getById('anniversaries', id);
        if (item) this._showForm(item);
      });
    });
  },

  _showForm(item = null) {
    const isEdit = !!item;
    const title = isEdit ? '编辑纪念日' : '添加纪念日';
    const data = item || { name: '', date: '', repeatCycle: 'yearly', remindDays: 7, status: 'active' };

    const bodyHTML = `
      <div class="input-group">
        <label class="input-label">纪念日名称</label>
        <input class="input" id="form-name" value="${data.name}" placeholder="例如：在一起纪念日">
      </div>
      <div class="input-group">
        <label class="input-label">日期</label>
        <input class="input" type="date" id="form-date" value="${data.date}">
      </div>
      <div class="input-group">
        <label class="input-label">重复周期</label>
        <select class="input" id="form-repeat">
          <option value="yearly" ${data.repeatCycle === 'yearly' ? 'selected' : ''}>每年重复</option>
          <option value="single" ${data.repeatCycle === 'single' ? 'selected' : ''}>仅此一次</option>
        </select>
      </div>
      <div class="input-group">
        <label class="input-label">提前提醒天数</label>
        <input class="input" type="number" id="form-remind" value="${data.remindDays}" min="0" max="30">
      </div>
      <div class="input-group">
        <label class="input-label">状态</label>
        <select class="input" id="form-status">
          <option value="active" ${data.status === 'active' ? 'selected' : ''}>进行中</option>
          <option value="completed" ${data.status === 'completed' ? 'selected' : ''}>已完成</option>
        </select>
      </div>
    `;

    Components.showModal(title, bodyHTML, (overlay) => {
      const updates = {
        name: overlay.querySelector('#form-name').value.trim(),
        date: overlay.querySelector('#form-date').value,
        repeatCycle: overlay.querySelector('#form-repeat').value,
        remindDays: parseInt(overlay.querySelector('#form-remind').value) || 7,
        status: overlay.querySelector('#form-status').value
      };

      if (!updates.name || !updates.date) {
        Utils.showToast('请填写名称和日期');
        return;
      }

      if (isEdit) {
        Store.update('anniversaries', item.id, updates);
      } else {
        Store.add('anniversaries', updates);
      }
      overlay.remove();
      this.render(this.container);
      Utils.showToast(isEdit ? '已更新' : '已添加');
    });
  }
};
