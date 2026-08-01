/* ===== 【我们的恋爱小宇宙】首页仪表盘 — 手绘线稿风 ===== */
const DashboardPage = {
  render(container) {
    const profile = Store.getProfile();
    const remindAnniversaries = Store.getRemindAnniversaries();

    let notificationHTML = '';
    if (remindAnniversaries.length > 0) {
      const r = remindAnniversaries[0];
      const msg = r.daysUntil === 0
        ? `今天是「${r.name}」！`
        : `「${r.name}」还有 ${r.daysUntil} 天`;
      notificationHTML = `
        <div class="notification-banner" onclick="App.navigateTo('timeline')">
          <div class="notification-banner-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-timeline)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <span class="notification-banner-text">${msg}</span>
          <span class="tag tag-warning notification-banner-tag">查看</span>
        </div>
      `;
    }

    container.innerHTML = `
      <!-- 顶部横幅 — 手绘线条风格 -->
      <div class="dashboard-hero">
        <!-- 手绘装饰：太阳 doodle -->
        <svg class="hero-doodle hero-doodle-sun" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="32" cy="32" r="14"/>
          <path d="M32 8v-4M32 60v-4M8 32H4m56 0h-4"/>
          <path d="M15 15l-3-3m40 40l-3-3M49 15l3-3M15 49l-3 3"/>
        </svg>
        <!-- 手绘装饰：云朵 doodle -->
        <svg class="hero-doodle hero-doodle-cloud" viewBox="0 0 56 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 26c-2 0-4-2-4-4s2-4 4-4c.5-3 3-6 6-6s5.5 2.5 6 5.5c2.5 0 4.5 2 4.5 4.5s-2 4-4.5 4H8z"/>
        </svg>
        <!-- 手绘装饰：小星星 -->
        <svg class="hero-doodle hero-doodle-star" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 4l3 9h9l-7 5 3 9-8-5-8 5 3-9-7-5h9z"/>
        </svg>
        <!-- 手绘装饰：小心心 -->
        <svg class="hero-doodle hero-doodle-heart" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 24S4 16 4 9.5C4 5.5 7 3 10 3c2 0 3.5 1 4 2 .5-1 2-2 4-2 3 0 6 2.5 6 6.5C24 16 14 24 14 24z"/>
        </svg>

        <div class="hero-label">our little universe</div>
        <h1 class="hero-title">我们的恋爱小宇宙</h1>
        <p class="hero-subtitle">${profile.declaration}</p>

        <!-- 双人头像 — 点击可更换 -->
        <div class="hero-avatars">
          <div class="hero-couple-photo" id="hero-couple-photo" title="点击更换合照">
            <img src="${Store.getCouplePhoto()}" alt="我们">
            <div class="photo-change-hint">点击更换</div>
          </div>
          <input type="file" id="hero-photo-input" accept="image/*" style="display:none">
        </div>

        <!-- 恋爱时长计数器 -->
        <div id="love-counter"></div>
        <!-- 设置入口 -->
        <div style="margin-top:var(--space-md)">
          <button class="btn btn-ghost btn-sm" id="btn-change-password" style="font-size:12px;color:var(--text-muted)">
            ⚙️ 修改暗号
          </button>
        </div>
      </div>

      ${notificationHTML}

      <!-- 纪念日 + Tips 横向滚动卡片 -->
      <div style="margin-bottom:var(--space-lg);overflow:visible">
        <div class="featured-cards">
          <div class="featured-card" onclick="App.navigateTo('timeline')" style="border-color:var(--color-timeline-light)">
            <div class="featured-card-header">
              <div class="featured-card-icon" style="background:var(--color-timeline-ghost);color:var(--color-timeline)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <span class="featured-card-label">即将到来</span>
            </div>
            <div id="upcoming-anniversaries"></div>
          </div>

          <div class="featured-card" onclick="App.navigateTo('inspiration')" style="border-color:var(--color-tips-light);background:var(--color-tips-ghost)">
            <div class="featured-card-header">
              <div class="featured-card-icon" style="background:rgba(255,255,255,0.85);color:var(--color-primary)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
              </div>
              <span class="featured-card-label">今日Tips</span>
            </div>
            <div id="daily-tip"></div>
          </div>
        </div>
      </div>

      <!-- 2x2 卡片网格 -->
      <div class="dashboard-grid">
        <!-- 待购清单 -->
        <div class="dashboard-card" onclick="App.navigateTo('shopping')">
          <div class="dashboard-card-header">
            <div class="dashboard-card-icon" style="background:var(--color-shopping-ghost)">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-shopping)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            </div>
            <span class="dashboard-card-label">待购清单</span>
          </div>
          <div id="shopping-summary"></div>
        </div>

        <!-- 小游戏 -->
        <div class="dashboard-card" onclick="App.navigateTo('game')">
          <div class="dashboard-card-header">
            <div class="dashboard-card-icon" style="background:var(--color-food-ghost)">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-food)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4m-2-2v4"/><circle cx="15" cy="11" r="1" fill="currentColor"/><circle cx="18" cy="13" r="1" fill="currentColor"/></svg>
            </div>
            <span class="dashboard-card-label">小游戏</span>
          </div>
          <div style="font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--color-food);font-family:var(--font-sans)">
            3
          </div>
          <div class="text-xs text-muted mt-xs">骰子 · 24点 · 真心话大冒险</div>
        </div>

        <!-- 账本月度统计（全宽） -->
        <div class="dashboard-card dashboard-card-full" onclick="App.navigateTo('ledger')">
          <div class="dashboard-card-header">
            <div class="dashboard-card-icon" style="background:var(--color-ledger-ghost)">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-ledger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>
            </div>
            <span class="dashboard-card-label">账本月度统计</span>
          </div>
          <div id="ledger-stats"></div>
        </div>

        <!-- 旅行相册（全宽） -->
        <div class="dashboard-card dashboard-card-full" onclick="App.navigateTo('travel')">
          <div class="dashboard-card-header">
            <div class="dashboard-card-icon" style="background:var(--color-travel-ghost)">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-travel)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>
            </div>
            <span class="dashboard-card-label">旅行相册</span>
          </div>
          <div id="travel-preview"></div>
        </div>

        <!-- 快速入口 3x2 -->
        <div class="dashboard-card dashboard-card-full" style="background:transparent;box-shadow:none;border:none;padding:0">
          <div class="quick-entries">
            <button class="quick-entry" onclick="App.navigateTo('timeline')">
              <img class="quick-entry-icon" src="assets/icons/nav_anniversary.png" alt="纪念日">
              <span class="quick-entry-label">纪念日</span>
            </button>
            <button class="quick-entry" onclick="App.navigateTo('travel')">
              <img class="quick-entry-icon" src="assets/icons/nav_travel.png" alt="旅行">
              <span class="quick-entry-label">旅行</span>
            </button>
            <button class="quick-entry" onclick="App.navigateTo('game')">
              <img class="quick-entry-icon" src="assets/icons/nav_games.png" alt="游戏">
              <span class="quick-entry-label">游戏</span>
            </button>
            <button class="quick-entry" onclick="App.navigateTo('ledger')">
              <img class="quick-entry-icon" src="assets/icons/nav_ledger.png" alt="账本">
              <span class="quick-entry-label">账本</span>
            </button>
            <button class="quick-entry" onclick="App.navigateTo('shopping')">
              <img class="quick-entry-icon" src="assets/icons/nav_shopping.png" alt="购物">
              <span class="quick-entry-label">购物</span>
            </button>
            <button class="quick-entry" onclick="App.navigateTo('inspiration')">
              <img class="quick-entry-icon" src="assets/icons/nav_inspiration.png" alt="灵感">
              <span class="quick-entry-label">灵感</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // 渲染子组件
    Components.renderLoveCounter(document.getElementById('love-counter'));
    Components.renderUpcomingAnniversaries(document.getElementById('upcoming-anniversaries'));
    Components.renderDailyTip(document.getElementById('daily-tip'));
    Components.renderShoppingSummary(document.getElementById('shopping-summary'));
    Components.renderLedgerStats(document.getElementById('ledger-stats'));
    Components.renderTravelPreview(document.getElementById('travel-preview'));

    // 绑定恋爱时长计数器编辑事件
    this._bindCounterEdit();
    // 绑定头像更换事件
    this._bindPhotoChange();
    // 绑定设置按钮
    this._bindSettingsBtn();
    // 卡片入场动画
    Components.animateCards(container, '.dashboard-card, .featured-card');
  },

  _bindPhotoChange() {
    const photo = document.getElementById('hero-couple-photo');
    const input = document.getElementById('hero-photo-input');
    if (!photo || !input) return;

    photo.addEventListener('click', () => input.click());

    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      // 弹出裁剪器
      Components.showImageCropper(file, (base64) => {
        Store.setCouplePhoto(base64);
        const img = photo.querySelector('img');
        if (img) img.src = base64;
        photo.classList.add('photo-updated');
        setTimeout(() => photo.classList.remove('photo-updated'), 500);
        Utils.showToast('合照已更新');
      }, { aspectRatio: 1, outputSize: 400 });
      input.value = ''; // 清空 input 以便重复选择同一文件
    });
  },

  _bindSettingsBtn() {
    const btn = document.getElementById('btn-change-password');
    if (btn) {
      btn.addEventListener('click', () => Auth._showPasswordChange());
    }
  },

  _bindCounterEdit() {
    const counter = document.querySelector('.love-counter');
    if (counter) {
      counter.addEventListener('click', () => {
        this._showProfileEdit();
      });
    }
  },

  _showProfileEdit() {
    const profile = Store.getProfile();
    const bodyHTML = `
      <div class="input-group">
        <label class="input-label">在一起日期</label>
        <input class="input" type="date" id="form-date" value="${profile.togetherDate}">
      </div>
      <div style="display:flex;gap:var(--space-sm)">
        <div class="input-group flex-1">
          <label class="input-label">TA的昵称</label>
          <input class="input" id="form-nickname-a" value="${profile.nicknameA}" placeholder="例如：小宇宙">
        </div>
        <div class="input-group flex-1">
          <label class="input-label">你的昵称</label>
          <input class="input" id="form-nickname-b" value="${profile.nicknameB}" placeholder="例如：小星星">
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">恋爱宣言</label>
        <textarea class="input" id="form-declaration" placeholder="写下你们的恋爱宣言...">${profile.declaration}</textarea>
      </div>
    `;

    Components.showModal('编辑恋爱档案', bodyHTML, (overlay) => {
      const updates = {
        togetherDate: overlay.querySelector('#form-date').value,
        nicknameA: overlay.querySelector('#form-nickname-a').value.trim() || '小宇宙',
        nicknameB: overlay.querySelector('#form-nickname-b').value.trim() || '小星星',
        declaration: overlay.querySelector('#form-declaration').value.trim()
      };

      if (!updates.togetherDate) {
        Utils.showToast('请选择在一起日期');
        return;
      }

      Store.updateProfile(updates);
      overlay.remove();
      App.render();
      Utils.showToast('恋爱档案已更新');
    });
  }
};
