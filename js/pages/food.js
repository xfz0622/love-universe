/* ===== 【我们的恋爱小宇宙】美食打卡页面 ===== */
const FoodPage = {
  filter: 'all',

  render(container) {
    this.container = container;
    const foods = Store.getFoods();
    const cuisines = [...new Set(foods.map(f => f.cuisine))];
    const filtered = this.filter === 'all' ? foods : foods.filter(f => f.cuisine === this.filter || (f.tags && f.tags.includes(this.filter)));

    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `
      ${this._renderHeader()}
      ${this._renderFilters(cuisines)}
      <div class="page-content" style="padding-top:0">
        <div id="food-list">
          ${this._renderList(sorted)}
        </div>
      </div>
      <button class="btn-fab" id="add-food-btn">+</button>
    `;

    this._bindEvents();
    Components.animateCards(this.container, '.card');
  },

  _renderHeader() {
    const count = Store.getFoods().length;
    const totalCost = Store.getFoods().reduce((s, f) => s + Number(f.cost), 0);
    const avgRating = count > 0
      ? (Store.getFoods().reduce((s, f) => s + f.rating, 0) / count).toFixed(1)
      : 0;
    return `
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:var(--space-md)">
          <div style="width:4px;height:24px;background:var(--text-primary);border-radius:2px"></div>
          <div>
            <h2 class="page-header-title">美食打卡</h2>
            <p class="page-header-subtitle">${count}家餐厅 · 均分${avgRating} · 共${Utils.formatMoney(totalCost)}</p>
          </div>
        </div>
      </div>
    `;
  },

  _renderFilters(cuisines) {
    const tabs = [
      { id: 'all', label: '全部' },
      ...cuisines.map(c => ({ id: c, label: c }))
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
          <div class="empty-icon">🍽️</div>
          <div class="empty-title">还没有美食记录</div>
          <div class="empty-desc">记录你们一起吃过的每一顿美味</div>
        </div>
      `;
    }

    return items.map(f => {
      const stars = '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating);
      const tagsHTML = (f.tags || []).map(tag => `<span class="tag tag-primary">${tag}</span>`).join(' ');
      const photos = f.photos || [];
      const hasPhoto = photos.length > 0;

      return `
        <div class="card card-hoverable mb-base" data-id="${f.id}" style="border-left:3px solid var(--text-primary)">
          <div class="flex gap-base">
            ${hasPhoto ? `
              <div class="img-container" style="width:72px;height:72px;flex-shrink:0;border-radius:var(--radius-sm);overflow:hidden">
                <img src="${photos[0]}" alt="${f.name}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.display='none'">
              </div>
            ` : ''}
            <div class="flex-1" style="min-width:0">
              <div class="flex items-center justify-between mb-xs">
                <span class="font-medium" style="font-size:var(--text-md)">${f.name}</span>
                <span class="font-semibold text-sm">${Utils.formatMoney(f.cost)}</span>
              </div>
              <div class="text-xs text-secondary mb-xs">${f.cuisine} · ${f.address}</div>
              <div style="font-size:var(--text-sm);color:var(--text-primary);margin-bottom:4px">${stars}</div>
              ${f.recommended ? `<div class="text-xs text-secondary mb-xs">推荐：${f.recommended}</div>` : ''}
              <div class="flex items-center justify-between">
                <div class="flex gap-sm flex-wrap">${tagsHTML}</div>
                <span class="text-xs text-muted">${Utils.formatDateShort(f.date)}</span>
              </div>
              ${photos.length > 1 ? `<div class="text-xs text-muted mt-xs">📷 ${photos.length}张照片</div>` : ''}
            </div>
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

    this.container.querySelector('#add-food-btn').addEventListener('click', () => {
      this._showForm();
    });

    this.container.querySelectorAll('.card[data-id]').forEach(card => {
      card.addEventListener('click', () => {
        const item = Store.getById('foods', card.dataset.id);
        if (item) this._showForm(item);
      });
    });
  },

  _showForm(item = null) {
    const isEdit = !!item;
    const title = isEdit ? '编辑美食记录' : '添加美食记录';
    const data = item || {
      name: '', address: '', date: '', cuisine: '',
      cost: 0, recommended: '', photos: [], rating: 4, tags: []
    };

    const photos = data.photos || [];
    const photosPreview = photos.map((p, i) => `
      <div style="position:relative;display:inline-block;margin-right:8px;margin-bottom:8px">
        <img src="${p}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--border-light)" onerror="this.style.display='none'">
        <button data-idx="${i}" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--text-primary);color:#fff;border:none;font-size:12px;line-height:1;cursor:pointer">×</button>
      </div>
    `).join('');

    const cuisines = ['日料', '台州菜', '火锅', '法餐', '本帮面', '烧鸟', '粤菜', '川菜', '韩料', '意餐', '泰餐', '烧烤', '甜品', '咖啡', '其他'];
    const cuisineOptions = cuisines.map(c =>
      `<option value="${c}" ${data.cuisine === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    const tagsOptions = ['约会', '纪念日', '情人节', '日常', '米其林', '老字号', '景观餐厅', '居酒屋', '重口味', '周末'];
    const tagsHTML = tagsOptions.map(tag => {
      const checked = (data.tags || []).includes(tag) ? 'checked' : '';
      return `
        <label style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;margin-bottom:8px;cursor:pointer;font-size:var(--text-sm);color:var(--text-secondary)">
          <input type="checkbox" value="${tag}" ${checked} style="accent-color:var(--text-primary)"> ${tag}
        </label>
      `;
    }).join('');

    const bodyHTML = `
      <div class="input-group">
        <label class="input-label">餐厅名称</label>
        <input class="input" id="form-name" value="${data.name}" placeholder="例如：鮨·松">
      </div>
      <div class="input-group">
        <label class="input-label">地址</label>
        <input class="input" id="form-address" value="${data.address}" placeholder="餐厅地址">
      </div>
      <div style="display:flex;gap:var(--space-sm)">
        <div class="input-group flex-1">
          <label class="input-label">用餐日期</label>
          <input class="input" type="date" id="form-date" value="${data.date}">
        </div>
        <div class="input-group flex-1">
          <label class="input-label">消费金额</label>
          <input class="input" type="number" id="form-cost" value="${data.cost}" placeholder="0">
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">菜系</label>
        <select class="input" id="form-cuisine">
          <option value="">选择菜系</option>
          ${cuisineOptions}
        </select>
      </div>
      <div class="input-group">
        <label class="input-label">推荐菜品</label>
        <input class="input" id="form-recommended" value="${data.recommended}" placeholder="例如：蓝鳍金枪鱼大腩、海胆军舰卷">
      </div>
      <div class="input-group">
        <label class="input-label">评分</label>
        <div id="star-rating-input"></div>
      </div>
      <div class="input-group">
        <label class="input-label">照片 <span class="input-hint">从相册选择，支持多张</span></label>
        <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;align-items:center">
          <label id="photo-upload-label" style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border:2px dashed var(--border-color);border-radius:8px;cursor:pointer;transition:all var(--transition-fast)">
            <span style="font-size:24px;color:var(--text-muted)">+</span>
            <input type="file" id="photo-file-input" accept="image/*" multiple style="display:none">
          </label>
          <div id="photos-preview" style="display:flex;flex-wrap:wrap;gap:8px">${photosPreview}</div>
        </div>
        <input type="hidden" id="form-photos-json" value='${JSON.stringify(photos)}'>
      </div>
      <div class="input-group">
        <label class="input-label">标签</label>
        <div style="padding-top:4px">${tagsHTML}</div>
      </div>
    `;

    const overlay = Components.showModal(title, bodyHTML, (overlay) => {
      const tags = [];
      overlay.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => tags.push(cb.value));

      const ratingEl = overlay.querySelector('#star-rating-input');
      const rating = parseInt(ratingEl.dataset.rating) || data.rating || 4;

      let photosData = [];
      try {
        photosData = JSON.parse(overlay.querySelector('#form-photos-json').value);
      } catch (e) { photosData = []; }

      const updates = {
        name: overlay.querySelector('#form-name').value.trim(),
        address: overlay.querySelector('#form-address').value.trim(),
        date: overlay.querySelector('#form-date').value,
        cuisine: overlay.querySelector('#form-cuisine').value,
        cost: parseFloat(overlay.querySelector('#form-cost').value) || 0,
        recommended: overlay.querySelector('#form-recommended').value.trim(),
        rating,
        photos: photosData,
        tags
      };

      if (!updates.name || !updates.date) {
        Utils.showToast('请填写名称和日期');
        return;
      }

      if (isEdit) {
        Store.update('foods', item.id, updates);
      } else {
        Store.add('foods', updates);
      }
      overlay.remove();
      this.render(this.container);
      Utils.showToast(isEdit ? '已更新' : '已添加');
    });

    // 绑定照片上传
    const fileInput = document.querySelector('#photo-file-input');
    const previewDiv = document.querySelector('#photos-preview');
    const hiddenInput = document.querySelector('#form-photos-json');

    const refreshPhotos = () => {
      let currentPhotos = [];
      try { currentPhotos = JSON.parse(hiddenInput.value); } catch(e) {}
      previewDiv.innerHTML = currentPhotos.map((p, i) => `
        <div style="position:relative;display:inline-block">
          <img src="${p}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--border-light)" onerror="this.style.display='none'">
          <button data-idx="${i}" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--text-primary);color:#fff;border:none;font-size:12px;line-height:1;cursor:pointer">×</button>
        </div>
      `).join('');
      previewDiv.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          let photos = JSON.parse(hiddenInput.value);
          photos.splice(parseInt(btn.dataset.idx), 1);
          hiddenInput.value = JSON.stringify(photos);
          refreshPhotos();
        });
      });
    };

    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files);
      if (files.length === 0) return;
      let photos = JSON.parse(hiddenInput.value);
      let loaded = 0;
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          photos.push(e.target.result);
          loaded++;
          if (loaded === files.length) {
            hiddenInput.value = JSON.stringify(photos);
            refreshPhotos();
          }
        };
        reader.readAsDataURL(file);
      });
      fileInput.value = '';
    });

    // 渲染星级评分输入
    Components.renderStarRating(
      overlay.querySelector('#star-rating-input'),
      data.rating || 4,
      false
    );
  }
};
