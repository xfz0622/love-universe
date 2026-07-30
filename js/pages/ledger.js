/* ===== 【我们的恋爱小宇宙】恋爱账本页面 ===== */
const LedgerPage = {
  viewMode: 'list',
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),

  render(container) {
    this.container = container;
    const summary = Store.getLedgerMonthlySummary(this.currentYear, this.currentMonth);
    const items = Utils.filterByMonth(Store.getLedger(), this.currentYear, this.currentMonth);
    const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `
      ${this._renderHeader(summary)}
      ${this._renderMonthPicker()}
      <div class="page-content" style="padding-top:0">
        ${this._renderSummaryCards(summary)}
        <div id="ledger-content">
          ${this.viewMode === 'list' ? this._renderList(sorted) : this._renderChart()}
        </div>
      </div>
      <button class="btn-fab" id="add-ledger-btn">+</button>
    `;

    this._bindEvents();
    Components.animateCards(this.container, '.list-item');
  },

  _renderHeader(summary) {
    return `
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:var(--space-md)">
          <div style="width:4px;height:24px;background:var(--text-primary);border-radius:2px"></div>
          <div>
            <h2 class="page-header-title">恋爱账本</h2>
            <p class="page-header-subtitle">${summary.count}笔记录 · 共${Utils.formatMoney(summary.total)}</p>
          </div>
        </div>
      </div>
    `;
  },

  _renderMonthPicker() {
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.push({ month: i, label: Utils.getMonthName(i) });
    }

    const monthHTML = months.map(m => `
      <button class="filter-tab ${m.month === this.currentMonth && this.currentYear === new Date().getFullYear() - 0 ? 'active' : ''}" data-month="${m.month}" data-year="${this.currentYear}">${m.label}</button>
    `).join('');

    return `
      <div style="display:flex;align-items:center;gap:var(--space-sm);padding:0 var(--content-padding);margin-bottom:var(--space-sm)">
        <button class="btn btn-icon btn-ghost" id="prev-month" style="flex-shrink:0">◂</button>
        <div class="filter-tabs flex-1" style="padding:0;margin-bottom:0" id="month-tabs">
          ${monthHTML}
        </div>
        <button class="btn btn-icon btn-ghost" id="next-month" style="flex-shrink:0">▸</button>
        <button class="btn btn-sm btn-ghost" id="toggle-view" style="flex-shrink:0">
          ${this.viewMode === 'list' ? '📊' : '📋'}
        </button>
      </div>
    `;
  },

  _renderSummaryCards(summary) {
    const catNames = {
      '旅行': '✈️', '美食': '🍽️', '礼物': '🎁', '日用品': '🏠'
    };
    const catEntries = Object.entries(summary.categorySummary);
    const catTags = catEntries.map(([cat, amt]) => {
      const pct = summary.total > 0 ? ((amt / summary.total) * 100).toFixed(1) : 0;
      return `
        <div style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-xs) 0">
          <span>${catNames[cat] || '📌'} ${cat}</span>
          <span class="font-medium text-sm">${Utils.formatMoney(amt)}</span>
          <span class="text-xs text-muted">${pct}%</span>
        </div>
      `;
    }).join('');

    return `
      <div class="card mb-base" style="margin:0 var(--content-padding) var(--space-base);border-left:3px solid var(--text-primary)">
        <div class="flex justify-between" style="margin-bottom:var(--space-md);text-align:center;gap:var(--space-sm)">
          <div style="flex:1;min-width:0">
            <div class="text-xs text-muted">他</div>
            <div class="font-semibold" style="font-size:var(--text-sm)">${Utils.formatMoney(summary.hisTotal)}</div>
          </div>
          <div style="flex:1;min-width:0">
            <div class="text-xs text-muted">总计</div>
            <div class="font-semibold" style="font-size:var(--text-md)">${Utils.formatMoney(summary.total)}</div>
          </div>
          <div style="flex:1;min-width:0">
            <div class="text-xs text-muted">她</div>
            <div class="font-semibold" style="font-size:var(--text-sm)">${Utils.formatMoney(summary.herTotal)}</div>
          </div>
        </div>
        <div class="divider-light"></div>
        ${catTags}
      </div>
    `;
  },

  _renderList(items) {
    if (items.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">💰</div>
          <div class="empty-title">本月暂无记录</div>
          <div class="empty-desc">开始记录你们的共同开销吧</div>
        </div>
      `;
    }

    return items.map(l => {
      const d = new Date(l.date);
      const day = String(d.getDate()).padStart(2, '0');
      const hasReceipt = l.receipt && l.receipt.trim();

      return `
        <div class="list-item" data-id="${l.id}">
          <div style="width:40px;height:40px;border-radius:var(--radius-sm);background:var(--color-primary-ghost);display:flex;align-items:center;justify-content:center;font-size:var(--text-sm);font-weight:var(--weight-semibold);color:var(--text-secondary);flex-shrink:0">
            ${day}
          </div>
          <div class="list-item-content">
            <div class="list-item-title">${l.category}</div>
            <div class="list-item-desc">${l.payer}付款${hasReceipt ? ' · 🧾有收据' : ''}</div>
          </div>
          <div class="list-item-meta">
            <div class="list-item-amount">${Utils.formatMoney(l.amount)}</div>
            <div class="list-item-date">${l.category}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  _renderChart() {
    const summary = Store.getLedgerMonthlySummary(this.currentYear, this.currentMonth);
    const catEntries = Object.entries(summary.categorySummary);

    const colors = {
      '旅行': '#1A1A1A',
      '美食': '#4D4D4D',
      '礼物': '#808080',
      '日用品': '#B3B3B3'
    };

    const segments = catEntries.map(([cat, amt]) => ({
      label: cat,
      value: amt,
      color: colors[cat] || '#BBAA9E'
    }));

    if (segments.length === 0) {
      return '<div class="empty-state"><div class="empty-desc">本月暂无数据</div></div>';
    }

    const pieContainer = document.createElement('div');
    Components.renderPieChart(pieContainer, segments);

    const recentMonths = Store.getLedgerRecentMonths(6);
    const barData = {
      labels: recentMonths.map(m => Utils.getMonthName(m.month)),
      values: recentMonths.map(m => m.total)
    };

    const barContainer = document.createElement('div');
    Components.renderBarChart(barContainer, null, {
      height: 160,
      barColor: 'var(--text-primary)',
      labels: barData.labels,
      values: barData.values,
      valueFormatter: v => v > 0 ? `¥${(v/1000).toFixed(1)}k` : '¥0'
    });

    return `
      <div class="card mb-base">
        <div class="card-title mb-base">本月分类占比</div>
        ${pieContainer.innerHTML}
      </div>
      <div class="card">
        <div class="card-title mb-base">近6个月趋势</div>
        ${barContainer.innerHTML}
      </div>
    `;
  },

  _bindEvents() {
    this.container.querySelector('#prev-month').addEventListener('click', () => {
      if (this.currentMonth === 0) { this.currentMonth = 11; this.currentYear--; }
      else { this.currentMonth--; }
      this.render(this.container);
    });

    this.container.querySelector('#next-month').addEventListener('click', () => {
      if (this.currentMonth === 11) { this.currentMonth = 0; this.currentYear++; }
      else { this.currentMonth++; }
      this.render(this.container);
    });

    this.container.querySelector('#toggle-view').addEventListener('click', () => {
      this.viewMode = this.viewMode === 'list' ? 'chart' : 'list';
      this.render(this.container);
    });

    this.container.querySelectorAll('.filter-tab[data-month]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentMonth = parseInt(tab.dataset.month);
        this.currentYear = parseInt(tab.dataset.year);
        this.render(this.container);
      });
    });

    this.container.querySelector('#add-ledger-btn').addEventListener('click', () => {
      this._showForm();
    });

    this.container.querySelectorAll('.list-item[data-id]').forEach(item => {
      item.addEventListener('click', () => {
        const data = Store.getById('ledger', item.dataset.id);
        if (data) this._showForm(data);
      });
    });
  },

  _showForm(item = null) {
    const isEdit = !!item;
    const title = isEdit ? '编辑账目' : '添加账目';
    const data = item || {
      date: Utils.getToday(), category: '美食', amount: 0, payer: '他', relatedTravel: '', receipt: ''
    };

    const receiptPreviewHTML = data.receipt ? `
      <div style="position:relative;display:inline-block;margin-top:8px">
        <img src="${data.receipt}" style="max-width:200px;max-height:150px;object-fit:contain;border-radius:8px;border:1px solid var(--border-light)" onerror="this.style.display='none'">
        <button id="remove-receipt" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--text-primary);color:#fff;border:none;font-size:12px;line-height:1;cursor:pointer">×</button>
      </div>
    ` : '';

    const categories = ['旅行', '美食', '礼物', '日用品'];
    const catOptions = categories.map(c =>
      `<option value="${c}" ${data.category === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    const bodyHTML = `
      <div class="input-group">
        <label class="input-label">日期</label>
        <input class="input" type="date" id="form-date" value="${data.date}">
      </div>
      <div class="input-group">
        <label class="input-label">分类</label>
        <select class="input" id="form-category">${catOptions}</select>
      </div>
      <div class="input-group">
        <label class="input-label">金额</label>
        <input class="input" type="number" id="form-amount" value="${data.amount}" placeholder="0" step="0.01">
      </div>
      <div class="input-group">
        <label class="input-label">付款人</label>
        <select class="input" id="form-payer">
          <option value="他" ${data.payer === '他' ? 'selected' : ''}>他</option>
          <option value="她" ${data.payer === '她' ? 'selected' : ''}>她</option>
        </select>
      </div>
      <div class="input-group">
        <label class="input-label">关联行程（可选）</label>
        <select class="input" id="form-travel">
          <option value="">不关联</option>
          ${Store.getTravels().map(t => `<option value="${t.id}" ${data.relatedTravel === t.id ? 'selected' : ''}>${t.location}</option>`).join('')}
        </select>
      </div>
      <div class="input-group">
        <label class="input-label">收据照片 <span class="input-hint">从相册选择</span></label>
        <div style="display:flex;gap:var(--space-sm);align-items:center;flex-wrap:wrap">
          <label id="receipt-upload-label" style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border:2px dashed var(--border-color);border-radius:8px;cursor:pointer;transition:all var(--transition-fast);flex-shrink:0">
            <span style="font-size:24px;color:var(--text-muted)">+</span>
            <input type="file" id="receipt-file-input" accept="image/*" style="display:none">
          </label>
          <div id="receipt-preview">${receiptPreviewHTML}</div>
        </div>
        <input type="hidden" id="form-receipt" value="${data.receipt || ''}">
      </div>
    `;

    Components.showModal(title, bodyHTML, (overlay) => {
      const updates = {
        date: overlay.querySelector('#form-date').value,
        category: overlay.querySelector('#form-category').value,
        amount: parseFloat(overlay.querySelector('#form-amount').value) || 0,
        payer: overlay.querySelector('#form-payer').value,
        relatedTravel: overlay.querySelector('#form-travel').value,
        receipt: overlay.querySelector('#form-receipt').value.trim()
      };

      if (!updates.date || updates.amount <= 0) {
        Utils.showToast('请填写日期和金额');
        return;
      }

      if (isEdit) {
        Store.update('ledger', item.id, updates);
      } else {
        Store.add('ledger', updates);
      }
      overlay.remove();
      this.render(this.container);
      Utils.showToast(isEdit ? '已更新' : '已添加');
    });

    // 绑定收据上传和删除
    const fileInput = document.querySelector('#receipt-file-input');
    const receiptHidden = document.querySelector('#form-receipt');
    const receiptPreview = document.querySelector('#receipt-preview');

    const removeBtn = document.querySelector('#remove-receipt');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        receiptHidden.value = '';
        receiptPreview.innerHTML = '';
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          receiptHidden.value = e.target.result;
          receiptPreview.innerHTML = `
            <div style="position:relative;display:inline-block">
              <img src="${e.target.result}" style="max-width:200px;max-height:150px;object-fit:contain;border-radius:8px;border:1px solid var(--border-light)">
              <button id="remove-receipt" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--text-primary);color:#fff;border:none;font-size:12px;line-height:1;cursor:pointer">×</button>
            </div>
          `;
          document.querySelector('#remove-receipt').addEventListener('click', () => {
            receiptHidden.value = '';
            receiptPreview.innerHTML = '';
          });
        };
        reader.readAsDataURL(file);
      });
    }
  }
};
