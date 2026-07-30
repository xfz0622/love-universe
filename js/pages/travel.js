/* ===== 【我们的恋爱小宇宙】旅行记录页面 ===== */
const TravelPage = {
  filter: 'all',

  render(container) {
    this.container = container;
    const travels = Store.getTravels();
    const filtered = this.filter === 'all'
      ? travels
      : travels.filter(t => t.tags && t.tags.includes(this.filter));

    const sorted = [...filtered].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    container.innerHTML = `
      ${this._renderHeader()}
      ${this._renderFilters()}
      <div class="page-content" style="padding-top:0">
        <div id="travel-list">
          ${this._renderList(sorted)}
        </div>
      </div>
      <button class="btn-fab" id="add-travel-btn">+</button>
    `;

    this._bindEvents();
    Components.animateCards(this.container, '.card');
  },

  _renderHeader() {
    const doneCount = Store.getTravels().filter(t => t.tags && t.tags.includes('已打卡')).length;
    const wishCount = Store.getTravels().filter(t => t.tags && t.tags.includes('想去')).length;
    return `
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:var(--space-md)">
          <div style="width:4px;height:24px;background:var(--text-primary);border-radius:2px"></div>
          <div>
            <h2 class="page-header-title">旅行记录</h2>
            <p class="page-header-subtitle">已打卡${doneCount}次 · ${wishCount}个想去的地方</p>
          </div>
        </div>
      </div>
    `;
  },

  _renderFilters() {
    const tabs = [
      { id: 'all', label: '全部' },
      { id: '已打卡', label: '已打卡' },
      { id: '想去', label: '想去' }
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
          <div class="empty-icon">✈️</div>
          <div class="empty-title">还没有旅行记录</div>
          <div class="empty-desc">记录你们的每一次旅途</div>
        </div>
      `;
    }

    return items.map(t => {
      const isWish = t.tags && t.tags.includes('想去');
      const borderColor = isWish ? 'var(--border-color)' : 'var(--text-primary)';
      const bgColor = isWish ? 'var(--color-primary-ghost)' : 'var(--bg-card)';
      const photos = t.photos || [];

      // 照片预览或首字母占位
      let photoHTML = '';
      if (photos.length > 0) {
        photoHTML = `<img src="${photos[0]}" alt="${t.location}" style="width:100%;height:100%;object-fit:cover">`;
      } else {
        photoHTML = `<span style="font-size:1.8rem;color:var(--text-muted)">${t.location.charAt(0)}</span>`;
      }

      const tagsHTML = t.tags.map(tag => {
        const tagClass = tag === '想去' ? 'tag-outline' : 'tag-primary';
        return `<span class="tag ${tagClass}">${tag}</span>`;
      }).join(' ');

      const costText = t.cost > 0 ? Utils.formatMoney(t.cost) : '待定';

      return `
        <div class="card card-hoverable mb-base" style="border-left:3px solid ${borderColor};background:${bgColor}" data-id="${t.id}">
          <div class="flex gap-base">
            <div class="img-container" style="width:80px;height:80px;flex-shrink:0;border-radius:var(--radius-sm);background:var(--color-primary-ghost);display:flex;align-items:center;justify-content:center;overflow:hidden">
              ${photoHTML}
            </div>
            <div class="flex-1" style="min-width:0">
              <div class="flex items-center justify-between mb-sm">
                <span class="font-medium" style="font-size:var(--text-md)">${t.location}</span>
                <span style="font-size:var(--text-xs);color:var(--text-muted)">${Utils.formatDateShort(t.startDate)}</span>
              </div>
              <div class="text-xs text-secondary mb-sm">
                ${t.startDate} ~ ${t.endDate}
              </div>
              <div class="flex items-center justify-between">
                <div class="flex gap-sm flex-wrap">${tagsHTML}</div>
                <span class="font-semibold text-sm">${costText}</span>
              </div>
              ${t.notes ? `<div class="text-xs text-muted mt-sm" style="line-height:1.5">${t.notes.substring(0, 60)}${t.notes.length > 60 ? '...' : ''}</div>` : ''}
              ${photos.length > 1 ? `<div class="text-xs text-muted mt-sm">📷 ${photos.length}张照片</div>` : ''}
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

    this.container.querySelector('#add-travel-btn').addEventListener('click', () => {
      this._showForm();
    });

    this.container.querySelectorAll('.card[data-id]').forEach(card => {
      card.addEventListener('click', () => {
        const item = Store.getById('travels', card.dataset.id);
        if (item) this._showForm(item);
      });
    });
  },

  _showForm(item = null) {
    const isEdit = !!item;
    const title = isEdit ? '编辑旅行记录' : '添加旅行记录';
    const data = item || {
      location: '', startDate: '', endDate: '', itinerary: '',
      photos: [], cost: 0, notes: '', tags: ['已打卡']
    };

    const photos = data.photos || [];
    const photosPreview = photos.map((p, i) => `
      <div style="position:relative;display:inline-block;margin-right:8px;margin-bottom:8px">
        <img src="${p}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--border-light)">
        <button class="photo-remove-btn" data-idx="${i}" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--text-primary);color:#fff;border:none;font-size:12px;line-height:1;cursor:pointer">×</button>
      </div>
    `).join('');

    const tagsOptions = ['已打卡', '想去', '浪漫', '海边', '自然风光', '美食', '城市', '海外', '文化', '极光'];
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
        <label class="input-label">地点</label>
        <input class="input" id="form-location" value="${data.location}" placeholder="例如：大理">
      </div>
      <div style="display:flex;gap:var(--space-sm)">
        <div class="input-group flex-1">
          <label class="input-label">开始日期</label>
          <input class="input" type="date" id="form-start" value="${data.startDate}">
        </div>
        <div class="input-group flex-1">
          <label class="input-label">结束日期</label>
          <input class="input" type="date" id="form-end" value="${data.endDate}">
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">行程攻略</label>
        <textarea class="input" id="form-itinerary" placeholder="记录你们的行程安排...">${data.itinerary}</textarea>
      </div>
      <div class="input-group">
        <label class="input-label">消费金额</label>
        <input class="input" type="number" id="form-cost" value="${data.cost}" placeholder="0">
      </div>
      <div class="input-group">
        <label class="input-label">个人感想</label>
        <textarea class="input" id="form-notes" placeholder="写下你的感受...">${data.notes}</textarea>
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

    Components.showModal(title, bodyHTML, (overlay) => {
      const tags = [];
      overlay.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => tags.push(cb.value));
      if (tags.length === 0) tags.push('已打卡');

      let photosData = [];
      try {
        photosData = JSON.parse(overlay.querySelector('#form-photos-json').value);
      } catch (e) { photosData = []; }

      const updates = {
        location: overlay.querySelector('#form-location').value.trim(),
        startDate: overlay.querySelector('#form-start').value,
        endDate: overlay.querySelector('#form-end').value,
        itinerary: overlay.querySelector('#form-itinerary').value.trim(),
        cost: parseFloat(overlay.querySelector('#form-cost').value) || 0,
        notes: overlay.querySelector('#form-notes').value.trim(),
        photos: photosData,
        tags
      };

      if (!updates.location || !updates.startDate) {
        Utils.showToast('请填写地点和日期');
        return;
      }

      if (isEdit) {
        Store.update('travels', item.id, updates);
      } else {
        Store.add('travels', updates);
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
  }
};
