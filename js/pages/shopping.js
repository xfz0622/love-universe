/* ===== 【我们的恋爱小宇宙】购物待办页面 ===== */
const ShoppingPage = {
  filter: 'all',

  render(container) {
    this.container = container;
    const items = Store.getShopping();
    const filtered = this.filter === 'all' ? items : items.filter(s => s.status === this.filter);

    const sorted = [...filtered].sort((a, b) => {
      const order = { pending: 0, ordered: 1, completed: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
      return 0;
    });

    container.innerHTML = `
      ${this._renderHeader()}
      ${this._renderFilters()}
      <div class="page-content" style="padding-top:0">
        <div id="shopping-list">
          ${this._renderList(sorted)}
        </div>
      </div>
      <button class="btn-fab" id="add-shopping-btn">+</button>
    `;

    this._bindEvents();
    Components.animateCards(this.container, '.card');
  },

  _renderHeader() {
    const pending = Store.getShopping().filter(s => s.status === 'pending').length;
    const total = Store.getShopping().reduce((s, item) => s + Number(item.budget || 0), 0);
    return `
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:var(--space-md)">
          <div style="width:4px;height:24px;background:var(--text-primary);border-radius:2px"></div>
          <div>
            <h2 class="page-header-title">购物待办</h2>
            <p class="page-header-subtitle">${pending}项待选购 · 预算总计${Utils.formatMoney(total)}</p>
          </div>
        </div>
      </div>
    `;
  },

  _renderFilters() {
    const tabs = [
      { id: 'all', label: '全部' },
      { id: 'pending', label: '待选购' },
      { id: 'ordered', label: '已下单' },
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
          <div class="empty-icon">🛒</div>
          <div class="empty-title">暂无待办</div>
          <div class="empty-desc">添加你们的购物清单</div>
        </div>
      `;
    }

    return items.map(s => {
      const statusMap = {
        pending: { label: '待选购', cls: 'tag-outline' },
        ordered: { label: '已下单', cls: 'tag-warning' },
        completed: { label: '已完成', cls: 'tag-success' }
      };
      const st = statusMap[s.status];
      const isCompleted = s.status === 'completed';
      const deadlineText = s.deadline
        ? `截止：${Utils.formatDateShort(s.deadline)}`
        : '无截止日期';

      const daysLeft = s.deadline ? Utils.daysBetween(Utils.getToday(), s.deadline) : null;
      const urgentClass = daysLeft !== null && daysLeft <= 7 && s.status === 'pending' ? 'tag-danger' : '';

      // 链接跳转按钮
      let linkBtn = '';
      if (s.link && s.link.trim()) {
        const platform = ShoppingPage._detectPlatform(s.link);
        linkBtn = `
          <button class="btn btn-sm btn-primary" style="margin-top:6px;font-size:11px;padding:3px 10px" onclick="event.stopPropagation();ShoppingPage._openLink('${s.link.replace(/'/g, "\\'")}')">
            🔗 ${platform}购买
          </button>
        `;
      }

      return `
        <div class="todo-item ${isCompleted ? 'checked' : ''}" data-id="${s.id}">
          <button class="todo-check ${isCompleted ? 'checked' : ''}"></button>
          <div class="todo-content">
            <div class="todo-text">${s.name}</div>
            <div class="todo-meta">
              ${s.purpose ? `${s.purpose} · ` : ''}${Utils.formatMoney(s.budget)}
              ${s.deadline ? ` · ${deadlineText}` : ''}
              ${daysLeft !== null && daysLeft <= 7 && s.status === 'pending' ? `<span class="tag ${urgentClass}" style="margin-left:4px">${daysLeft}天后</span>` : ''}
            </div>
            ${linkBtn}
          </div>
          <span class="tag ${st.cls}">${st.label}</span>
        </div>
      `;
    }).join('');
  },

  // 检测链接平台
  _detectPlatform(url) {
    const u = url.toLowerCase();
    if (u.includes('taobao.com') || u.includes('tmall.com')) return '淘宝';
    if (u.includes('jd.com')) return '京东';
    if (u.includes('pinduoduo.com') || u.includes('yangkeduo.com')) return '拼多多';
    if (u.includes('sunig.com')) return '苏宁';
    if (u.includes('xiaohongshu.com')) return '小红书';
    if (u.includes('douyin.com')) return '抖音';
    return '打开';
  },

  // 打开链接
  _openLink(url) {
    if (!url) return;
    // 尝试用 App URL Scheme 打开
    const u = url.toLowerCase();
    let appScheme = '';
    if (u.includes('taobao.com') || u.includes('tmall.com')) {
      appScheme = `taobao://${url.replace(/^https?:\/\//, '')}`;
    } else if (u.includes('jd.com')) {
      appScheme = `openapp.jdmobile://virtual?params=${encodeURIComponent(JSON.stringify({url}))}`;
    } else if (u.includes('pinduoduo.com') || u.includes('yangkeduo.com')) {
      appScheme = `pinduoduo://com.xunmeng.pinduoduo/${url.replace(/^https?:\/\//, '')}`;
    }

    if (appScheme && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
      const start = Date.now();
      window.location.href = appScheme;
      setTimeout(() => {
        if (Date.now() - start < 2500) {
          window.open(url, '_blank');
        }
      }, 2000);
    } else {
      window.open(url, '_blank');
    }
  },

  _bindEvents() {
    this.container.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.filter = tab.dataset.filter;
        this.render(this.container);
      });
    });

    this.container.querySelector('#add-shopping-btn').addEventListener('click', () => {
      this._showForm();
    });

    this.container.querySelectorAll('.todo-check').forEach(check => {
      check.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = check.closest('.todo-item');
        const id = item.dataset.id;
        const data = Store.getById('shopping', id);
        if (data) {
          const newStatus = data.status === 'completed' ? 'pending' : 'completed';
          Store.update('shopping', id, { status: newStatus });
          this.render(this.container);
        }
      });
    });

    this.container.querySelectorAll('.todo-item').forEach(item => {
      item.addEventListener('click', () => {
        const data = Store.getById('shopping', item.dataset.id);
        if (data) this._showForm(data);
      });
    });
  },

  _showForm(item = null) {
    const isEdit = !!item;
    const title = isEdit ? '编辑待办' : '添加待办';
    const data = item || {
      name: '', purpose: '', budget: 0, link: '', deadline: '', status: 'pending'
    };

    const bodyHTML = `
      <div class="input-group">
        <label class="input-label">物品名称</label>
        <input class="input" id="form-name" value="${data.name}" placeholder="例如：七夕礼物 - 项链">
      </div>
      <div class="input-group">
        <label class="input-label">用途</label>
        <input class="input" id="form-purpose" value="${data.purpose}" placeholder="例如：七夕礼物">
      </div>
      <div class="input-group">
        <label class="input-label">预算</label>
        <input class="input" type="number" id="form-budget" value="${data.budget}" placeholder="0">
      </div>
      <div class="input-group">
        <label class="input-label">购买链接 <span class="input-hint">支持淘宝/京东/拼多多/小红书/抖音等</span></label>
        <input class="input" id="form-link" value="${data.link}" placeholder="粘贴商品链接，保存后可一键跳转购买">
        ${data.link ? `<div class="text-xs text-muted mt-xs">已识别平台：${ShoppingPage._detectPlatform(data.link)}</div>` : ''}
      </div>
      <div class="input-group">
        <label class="input-label">截止日期</label>
        <input class="input" type="date" id="form-deadline" value="${data.deadline}">
      </div>
      <div class="input-group">
        <label class="input-label">状态</label>
        <select class="input" id="form-status">
          <option value="pending" ${data.status === 'pending' ? 'selected' : ''}>待选购</option>
          <option value="ordered" ${data.status === 'ordered' ? 'selected' : ''}>已下单</option>
          <option value="completed" ${data.status === 'completed' ? 'selected' : ''}>已完成</option>
        </select>
      </div>
    `;

    Components.showModal(title, bodyHTML, (overlay) => {
      const updates = {
        name: overlay.querySelector('#form-name').value.trim(),
        purpose: overlay.querySelector('#form-purpose').value.trim(),
        budget: parseFloat(overlay.querySelector('#form-budget').value) || 0,
        link: overlay.querySelector('#form-link').value.trim(),
        deadline: overlay.querySelector('#form-deadline').value,
        status: overlay.querySelector('#form-status').value
      };

      if (!updates.name) {
        Utils.showToast('请填写物品名称');
        return;
      }

      if (isEdit) {
        Store.update('shopping', item.id, updates);
      } else {
        Store.add('shopping', updates);
      }
      overlay.remove();
      this.render(this.container);
      Utils.showToast(isEdit ? '已更新' : '已添加');
    });
  }
};
