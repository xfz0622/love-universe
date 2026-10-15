/* ===== 【我们的恋爱小宇宙】应用入口 & 路由管理 ===== */

// ===== 免暗号自动登录 =====
// 已去掉暗号（密码）步骤：打开网页即直接以「主人」身份进入，只保留主人的内容库。
// 主人 hash 与 data/passwords.json 中一致，用于维持原有数据文件与本地存储的隔离。
const APP_OWNER = {
  name: '主人',
  hash: '83602df50cd83038f848cae763e13a4b8ad97c3824565853cc5c0a23453efd95'
};
function ensureLoggedIn() {
  if (sessionStorage.getItem('love_token')) return true;
  try {
    sessionStorage.setItem('love_token', APP_OWNER.hash);
    sessionStorage.setItem('love_name', APP_OWNER.name);
    return true;
  } catch (e) {
    console.warn('自动登录失败:', e.message);
    return false;
  }
}

const App = {
  currentPage: 'dashboard',
  pages: {},

  async init() {
    const app = document.getElementById('app');
    if (!app) return;

    // 免暗号：未登录时自动以主人身份登录，跳过登录页
    if (!ensureLoggedIn()) {
      Auth.renderLoginPage(app);
      this._hideSkeleton();
      return;
    }

    // 注册页面
    this.pages = {
      dashboard: DashboardPage,
      timeline: TimelinePage,
      travel: TravelPage,
      food: FoodPage,
      game: GamePage,
      shopping: ShoppingPage,
      ledger: LedgerPage,
      inspiration: InspirationPage
    };

    const hash = window.location.hash.replace('#', '');
    if (hash && this.pages[hash]) {
      this.currentPage = hash;
    }

    // 初始化本地数据（立即完成），然后渲染
    try {
      await Store.init();
    } catch (e) {
      console.warn('Store初始化失败，使用默认数据:', e.message);
    }

    this.render();

    // 监听hash变化
    window.addEventListener('hashchange', async () => {
      const newHash = window.location.hash.replace('#', '');
      if (newHash && this.pages[newHash]) {
        this.currentPage = newHash;
        this.render();
      }
    });

    // GitHub 同步已经在 Store 内部处理了轮询，这里不再重复

    // 检查纪念日提醒
    this.checkReminders();

    // 每小时检查一次
    setInterval(() => this.checkReminders(), 3600000);

    // 清理计时器
    window.addEventListener('beforeunload', () => {
      if (Components._counterInterval) clearInterval(Components._counterInterval);
    });

    // 页面关闭/切到后台前，尽量把未同步的改动推送到 GitHub
    window.addEventListener('beforeunload', () => {
      try { if (Store && Store.flushPush) Store.flushPush(); } catch (e) {}
    });
    // 移动端更可靠：切到后台时也推一次
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        try { if (Store && Store.flushPush) Store.flushPush(); } catch (e) {}
      }
    });
  },

  // 登录成功后重新初始化
  async initAfterLogin() {
    await this.init();
  },

  // 刷新当前页面（用于数据更新后重渲染）
  refresh() {
    this.render();
  },

  navigateTo(page) {
    if (this.currentPage === page) return;
    this.currentPage = page;
    window.location.hash = page;
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // 隐藏骨架屏
  _hideSkeleton() {
    const app = document.getElementById('app');
    if (app) app.style.display = '';
    const skeleton = document.getElementById('app-skeleton');
    if (skeleton) {
      skeleton.classList.add('hide');
      setTimeout(() => skeleton.remove(), 400);
    }
  },

  render() {
    const app = document.getElementById('app');
    if (!app) return;

    // 隐藏骨架屏
    this._hideSkeleton();

    // 免暗号：若仍无登录态则自动登录（正常情况下 init 已处理），不显示登录页
    if (!ensureLoggedIn()) {
      Auth.renderLoginPage(app);
      return;
    }

    const page = this.pages[this.currentPage];
    if (!page) {
      this.navigateTo('dashboard');
      return;
    }

    // 对于仪表盘，完全替换内容（包含hero区）
    if (this.currentPage === 'dashboard') {
      app.innerHTML = `
        <div id="dashboard-content" class="page-enter" style="padding-bottom: calc(var(--navbar-height) + var(--space-xl)); position: relative; z-index: 1;"></div>
        <nav class="navbar" id="navbar" style="z-index: 200;"></nav>
      `;

      page.render(document.getElementById('dashboard-content'));
      Components.renderNavbar(document.getElementById('navbar'), this.currentPage);
    } else {
      // 非仪表盘页面：标准结构
      app.innerHTML = `
        <div class="page-content page-enter" id="page-content" style="position: relative; z-index: 1;"></div>
        <nav class="navbar" id="navbar" style="z-index: 200;"></nav>
      `;

      page.render(document.getElementById('page-content'));
      Components.renderNavbar(document.getElementById('navbar'), this.currentPage);
    }
  },

  checkReminders() {
    if (!('Notification' in window)) return;

    const remindItems = Store.getRemindAnniversaries();
    if (remindItems.length === 0) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      remindItems.forEach(item => {
        const msg = item.daysUntil === 0
          ? `今天是「${item.name}」！别忘了哦`
          : `「${item.name}」还有 ${item.daysUntil} 天`;

        const notifyKey = `notify_${item.id}_${Utils.getToday()}`;
        if (!localStorage.getItem(notifyKey)) {
          new Notification('我们的恋爱小宇宙', {
            body: msg,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23BFA8A8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
            tag: item.id,
            requireInteraction: item.daysUntil <= 3
          });
          localStorage.setItem(notifyKey, '1');
        }
      });
    }
  }
};

// ===== 启动应用 =====
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
