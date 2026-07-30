/* ===== 【我们的恋爱小宇宙】登录认证 - 纯前端版 ===== */

const Auth = {
  _passwords: {}, // { hash: { name, createdAt } }

  // 计算 SHA-256 hash
  _hash(pw) {
    // 使用 SubtleCrypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(pw);
    return crypto.subtle.digest('SHA-256', data).then(buf => {
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    });
  },

  isLoggedIn() {
    return !!sessionStorage.getItem('love_token');
  },

  getToken() {
    return sessionStorage.getItem('love_token');
  },

  // 从 GitHub 拉取密码表
  async loadPasswords() {
    try {
      const { owner, repo, apiBase, token } = APP_CONFIG.github;
      const resp = await fetch(`${apiBase}/repos/${owner}/${repo}/contents/passwords.json`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        cache: 'no-store'
      });
      if (!resp.ok) {
        // 没有密码文件，初始化
        this._passwords = {};
        return;
      }
      const item = await resp.json();
      const binary = atob(item.content);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const decoded = new TextDecoder('utf-8').decode(bytes);
      const data = JSON.parse(decoded);
      this._passwords = data.passwords || {};
      return item.sha; // 返回 SHA 用于后续更新
    } catch (e) {
      console.warn('加载密码表失败:', e.message);
      this._passwords = {};
    }
  },

  // 登录：本地验证密码
  async login(password) {
    const hash = await this._hash(password);

    // 检查密码表
    const match = Object.entries(this._passwords).find(([, d]) => d.hash === hash);
    if (match) {
      sessionStorage.setItem('love_token', hash);
      sessionStorage.setItem('love_name', match[0]);
      // 记住最近登录的暗号（用于登录页显示合照等）
      localStorage.setItem('love_last_hash', hash.substring(0, 8));
      return { ok: true, name: match[0], hash };
    }
    return { ok: false, error: '暗号不对哦，再试一次吧 💕' };
  },

  // 注册新密码（写入 GitHub）
  async register(newPassword, confirmPassword) {
    if (newPassword !== confirmPassword) {
      return { ok: false, error: '两次输入的暗号不一致' };
    }
    if (newPassword.length < 4) {
      return { ok: false, error: '暗号至少需要4位' };
    }

    const hash = await this._hash(newPassword);

    // 检查是否重复
    for (const [name, d] of Object.entries(this._passwords)) {
      if (d.hash === hash) {
        return { ok: false, error: `这个暗号已经被使用了` };
      }
    }

    // 生成名称
    const name = `用户${Object.keys(this._passwords).length + 1}`;
    this._passwords[name] = { hash, createdAt: new Date().toISOString().slice(0, 10) };

    // 保存到 GitHub
    await this._savePasswords();

    return { ok: true, message: '新暗号注册成功！' };
  },

  // 修改密码
  async change(oldPassword, newPassword, newName) {
    if (newPassword.length < 4) {
      return { ok: false, error: '新暗号至少需要4位' };
    }

    const oldHash = await this._hash(oldPassword);
    const newHash = await this._hash(newPassword);

    // 找到旧密码
    const oldEntry = Object.entries(this._passwords).find(([, d]) => d.hash === oldHash);
    if (!oldEntry) {
      return { ok: false, error: '当前暗号不对' };
    }

    // 检查新暗号是否被使用
    for (const [n, d] of Object.entries(this._passwords)) {
      if (n !== oldEntry[0] && d.hash === newHash) {
        return { ok: false, error: '新暗号已被使用' };
      }
    }

    const name = newName || oldEntry[0];
    delete this._passwords[oldEntry[0]];
    this._passwords[name] = { hash: newHash, createdAt: oldEntry[1].createdAt };

    await this._savePasswords();

    // 清除旧登录态
    sessionStorage.removeItem('love_token');

    return { ok: true, message: '暗号修改成功！请用新暗号重新登录' };
  },

  // 保存密码表到 GitHub
  async _savePasswords() {
    try {
      const { owner, repo, apiBase, token } = APP_CONFIG.github;
      const data = { passwords: this._passwords };
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

      // 获取当前 SHA
      let sha = null;
      try {
        const resp = await fetch(`${apiBase}/repos/${owner}/${repo}/contents/passwords.json`, {
          headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (resp.ok) {
          const item = await resp.json();
          sha = item.sha;
        }
      } catch (e) { /* 首次创建 */ }

      const body = {
        message: `🔐 更新密码表`,
        content,
        branch: APP_CONFIG.github.branch
      };
      if (sha) body.sha = sha;

      await fetch(`${apiBase}/repos/${owner}/${repo}/contents/passwords.json`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      console.warn('保存密码表失败:', e.message);
    }
  },

  logout() {
    sessionStorage.removeItem('love_token');
    sessionStorage.removeItem('love_name');
    location.reload();
  },

  // ===== 页面渲染 =====
  renderLoginPage(container) {
    // 登录页合照：优先用带暗号前缀的（如果有最近登录过的暗号），否则用旧 key 兜底
    const lastHash = localStorage.getItem('love_last_hash');
    const prefixedKey = lastHash ? 'love_' + lastHash + '_couple_photo' : null;
    const savedPhoto = (prefixedKey && localStorage.getItem(prefixedKey)) || localStorage.getItem('love_couple_photo') || 'assets/couple.jpg';
    container.innerHTML = `
      <div class="login-page">
        <div class="login-card">
          <div class="login-doodle">
            <div class="login-couple-photo" id="login-couple-photo" title="点击更换合照">
              <img src="${savedPhoto}" alt="我们">
              <div class="photo-change-hint">点击更换</div>
            </div>
            <input type="file" id="login-photo-input" accept="image/*" style="display:none">
          </div>

          <div class="login-label">our little universe</div>
          <h1 class="login-title">我们的恋爱小宇宙</h1>
          <p class="login-desc">输入你们的专属暗号，进入只有两个人的世界</p>

          <div class="login-form">
            <div class="input-group">
              <input class="input login-input" id="login-password" type="password" placeholder="输入暗号..." autocomplete="off">
            </div>
            <button class="btn btn-primary login-btn" id="login-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              进入小宇宙
            </button>
          </div>

          <div class="login-error" id="login-error" style="display:none"></div>
          <div style="margin-top:var(--space-md);text-align:center">
            <button type="button" class="btn btn-ghost btn-sm" id="btn-register-password" style="font-size:12px">注册新暗号</button>
          </div>
        </div>
      </div>
    `;

    this._bindLoginEvents(container);
    this._bindPasswordLinks(container);
  },

  _bindPasswordLinks(container) {
    container.querySelector('#btn-register-password').addEventListener('click', () => this._showPasswordRegister());
  },

  _showPasswordChange() {
    const bodyHTML = `
      <div class="input-group">
        <label class="input-label">当前暗号</label>
        <input class="input" type="password" id="form-old-pw" placeholder="输入现在的暗号">
      </div>
      <div class="input-group">
        <label class="input-label">新暗号</label>
        <input class="input" type="password" id="form-new-pw" placeholder="输入新暗号（至少4位）">
      </div>
      <div class="input-group">
        <label class="input-label">给这个暗号起个名字</label>
        <input class="input" id="form-pw-name" placeholder="例如：小宇宙、小星星">
      </div>
    `;

    Components.showModal('修改暗号', bodyHTML, async (overlay) => {
      const oldPassword = overlay.querySelector('#form-old-pw').value.trim();
      const newPassword = overlay.querySelector('#form-new-pw').value.trim();
      const name = overlay.querySelector('#form-pw-name').value.trim();

      if (!oldPassword || !newPassword) { Utils.showToast('请填写完整'); return; }
      if (newPassword.length < 4) { Utils.showToast('新暗号至少需要4位'); return; }

      const result = await this.change(oldPassword, newPassword, name);
      if (result.ok) {
        overlay.remove();
        // 清除旧暗号的所有 localStorage 数据（含新旧两种 key 格式）
        const oldHash = sessionStorage.getItem('love_token');
        if (oldHash) {
          const oldPrefix = 'love_' + oldHash.substring(0, 8) + '_';
          ['profile','anniversaries','travels','foods','shopping','ledger','inspiration',
           'data_version','builtin_together_date','builtin_version','couple_photo','migrated_from_legacy']
            .forEach(s => localStorage.removeItem(oldPrefix + s));
        }
        // 兼容：也清除旧格式 key
        ['love_profile','love_anniversaries','love_travels','love_foods','love_shopping','love_ledger','love_inspiration',
         'love_data_version','love_builtin_together_date','love_builtin_version','love_couple_photo']
          .forEach(k => localStorage.removeItem(k));
        Utils.showToast(result.message);
      } else {
        Utils.showToast(result.error);
      }
    });
  },

  _showPasswordRegister() {
    const bodyHTML = `
      <div class="input-group">
        <label class="input-label">新暗号</label>
        <input class="input" type="password" id="form-new-pw" placeholder="设置一个新暗号（至少4位）">
      </div>
      <div class="input-group">
        <label class="input-label">确认暗号</label>
        <input class="input" type="password" id="form-confirm-pw" placeholder="再输入一次确认">
      </div>
      <div class="text-xs text-muted">💡 每个暗号都有独立的空间</div>
    `;

    Components.showModal('注册新暗号', bodyHTML, async (overlay) => {
      const newPassword = overlay.querySelector('#form-new-pw').value.trim();
      const confirmPassword = overlay.querySelector('#form-confirm-pw').value.trim();

      if (!newPassword || !confirmPassword) { Utils.showToast('请填写完整'); return; }
      if (newPassword.length < 4) { Utils.showToast('新暗号至少需要4位'); return; }
      if (newPassword !== confirmPassword) { Utils.showToast('两次输入的暗号不一致'); return; }

      const result = await this.register(newPassword, confirmPassword);
      if (result.ok) {
        overlay.remove();
        Utils.showToast(result.message);
      } else {
        Utils.showToast(result.error);
      }
    });
  },

  _bindLoginEvents(container) {
    const input = container.querySelector('#login-password');
    const btn = container.querySelector('#login-btn');
    const errorEl = container.querySelector('#login-error');

    let attempts = 0;

    const doLogin = async () => {
      const password = input.value.trim();
      if (!password) {
        errorEl.textContent = '请输入暗号';
        errorEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '验证中...';

      // 先加载密码表
      await this.loadPasswords();
      const result = await this.login(password);

      if (result.ok) {
        errorEl.style.display = 'none';
        const triggerInit = () => {
          if (typeof App !== 'undefined' && App.initAfterLogin) {
            App.initAfterLogin();
          } else {
            setTimeout(triggerInit, 50);
          }
        };
        triggerInit();
      } else {
        attempts++;
        errorEl.textContent = result.error;
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          ${attempts >= 3 ? '等一下再试' : '再试一次'}
        `;

        if (attempts >= 3) {
          input.disabled = true;
          btn.disabled = true;
          setTimeout(() => {
            attempts = 0;
            input.disabled = false;
            btn.disabled = false;
            btn.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              进入小宇宙
            `;
            errorEl.textContent = '试太多次了，等30秒再试吧';
          }, 30000);
        }
      }
    };

    btn.addEventListener('click', doLogin);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });

    setTimeout(() => input.focus(), 300);
    this._bindPhotoChange(container);
  },

  _bindPhotoChange(container) {
    const photo = container.querySelector('#login-couple-photo');
    const fileInput = container.querySelector('#login-photo-input');
    if (!photo || !fileInput) return;

    photo.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        localStorage.setItem('love_couple_photo', base64);
        const img = photo.querySelector('img');
        if (img) img.src = base64;
        photo.classList.add('photo-updated');
        setTimeout(() => photo.classList.remove('photo-updated'), 500);
        if (typeof Store !== 'undefined' && Store.setCouplePhoto) {
          Store.setCouplePhoto(base64);
        }
      };
      reader.readAsDataURL(file);
    });
  }
};
