/* ===== 【我们的恋爱小宇宙】AI 旅行助手 v3 ===== */
// v3: 修复「加入行程」失效 + 聊天记录持久化 + 对话内也能加入行程
// v2: 联网搜索开关 + 超时控制 + 自动重试 + 友好错误提示
const TravelAI = {
  _history: [],
  _busy: false,

  // ===== 聊天记录持久化（按用户哈希隔离）=====
  get _storeKey() {
    const token = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('love_token')) || 'default';
    const h = String(token).slice(0, 8);
    return `love_${h}_ai_chat_history`;
  },

  _loadHistory() {
    try {
      const raw = localStorage.getItem(this._storeKey);
      const arr = raw ? JSON.parse(raw) : [];
      this._history = Array.isArray(arr) ? arr : [];
    } catch (e) {
      this._history = [];
    }
    return this._history;
  },

  _saveHistory() {
    try {
      // 只保留最近 40 条，避免体积过大
      this._history = this._history.slice(-40);
      localStorage.setItem(this._storeKey, JSON.stringify(this._history));
    } catch (e) { /* 忽略存储失败 */ }
  },

  clearHistory() {
    this._history = [];
    try { localStorage.removeItem(this._storeKey); } catch (e) {}
  },

  get _endpoint() {
    const cfg = window.APP_CONFIG && window.APP_CONFIG.supabase;
    if (!cfg || !cfg.url) return '';
    return `${cfg.url}/functions/v1/travel-ai`;
  },

  _headers() {
    const cfg = window.APP_CONFIG && window.APP_CONFIG.supabase;
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.anonKey}`,
      'apikey': cfg.anonKey
    };
  },

  // 带超时的单次请求
  _fetchOnce(url, payload, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(payload),
      signal: controller.signal
    }).finally(() => clearTimeout(timer));
  },

  // 自动重试一次（网络类失败），总超时上限内
  async _call(payload) {
    const url = this._endpoint;
    if (!url) throw new Error('未配置 Supabase');
    const timeoutMs = 90000; // 90秒：AI 生成攻略需要较长时间

    let resp, lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        resp = await this._fetchOnce(url, payload, timeoutMs);
        break;
      } catch (e) {
        lastErr = e;
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 1200)); // 等1.2秒重试
        }
      }
    }
    if (!resp) {
      if (lastErr && lastErr.name === 'AbortError') {
        throw new Error('请求超时了（AI想太久），再试一次或换个说法');
      }
      throw new Error('网络连接不稳定，请检查网络后重试');
    }

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.error) {
      // 余额/额度不足 → 抛特殊标记，由调用方弹出充值提醒
      const code = data.code || '';
      if (code === 'INSUFFICIENT_BALANCE' || code === 'RATE_LIMITED') {
        const err = new Error(data.error || '额度不足');
        err.needRecharge = code === 'INSUFFICIENT_BALANCE';
        err.rateLimited = code === 'RATE_LIMITED';
        throw err;
      }
      throw new Error(data.error || `请求失败(${resp.status})`);
    }
    return { content: data.content || '', sources: data.sources || [] };
  },

  // ===== 充值/额度提醒弹窗 =====
  _showRechargeNotice(msg, isRateLimit) {
    if (document.querySelector('#tai-recharge')) return;
    const overlay = document.createElement('div');
    overlay.id = 'tai-recharge';
    overlay.className = 'tai-recharge-overlay';
    const title = isRateLimit ? '⏳ 搜索太频繁啦' : '💳 联网额度用完了';
    const body = isRateLimit
      ? '刚才请求有点密集，等一两分钟再试就好啦～<br>也可以先关掉「联网搜索」开关继续用。'
      : '免费额度用完啦，联网搜索暂时不可用了。<br><br><b>两个办法：</b><br>1️⃣ 先关掉「联网搜索」开关，照样能生成攻略（不花钱）<br>2️⃣ 去智谱开放平台充值，就能继续联网搜最新攻略啦';
    overlay.innerHTML = `
      <div class="tai-recharge-card">
        <div class="tai-recharge-icon">${isRateLimit ? '⏳' : '💳'}</div>
        <div class="tai-recharge-title">${title}</div>
        <div class="tai-recharge-body">${body}</div>
        ${isRateLimit ? '' : '<a class="tai-recharge-link" href="https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys" target="_blank" rel="noopener">👉 前往智谱开放平台充值</a>'}
        <button class="tai-recharge-ok" id="tai-recharge-ok">知道啦</button>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#tai-recharge-ok').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  },

  // ===== 打开助手面板 =====
  open() {
    if (document.querySelector('#travel-ai-overlay')) return;
    this._loadHistory();
    const overlay = document.createElement('div');
    overlay.id = 'travel-ai-overlay';
    overlay.className = 'tai-overlay';
    overlay.innerHTML = `
      <div class="tai-panel">
        <div class="tai-header">
          <button class="tai-back" id="tai-close">×</button>
          <span class="tai-title">✨ AI 旅行助手</span>
          <button class="tai-clear" id="tai-clear" title="清空聊天记录">🗑️</button>
        </div>
        <div class="tai-tabs">
          <button class="tai-tab active" data-tab="guide">生成攻略</button>
          <button class="tai-tab" data-tab="chat">AI 对话</button>
        </div>

        <!-- 生成攻略 -->
        <div class="tai-body" id="tai-panel-guide">
          <div class="tai-form">
            <div class="input-group">
              <label class="input-label">目的地</label>
              <input class="input" id="tai-dest" placeholder="例如：大理 / 东京 / 三亚">
            </div>
            <div class="input-group">
              <label class="input-label">天数 <span class="input-hint">可留空</span></label>
              <input class="input" id="tai-days" type="number" min="1" max="30" placeholder="例如：5">
            </div>
            <div class="input-group">
              <label class="input-label">偏好 <span class="input-hint">可留空</span></label>
              <input class="input" id="tai-extra" placeholder="例如：预算中等、喜欢自然风光、想拍照">
            </div>
            <label class="tai-web-toggle">
              <input type="checkbox" id="tai-guide-web">
              <span>🔍 联网搜索（参考小红书/抖音等最新攻略）</span>
            </label>
            <button class="btn btn-primary" id="tai-gen" style="width:100%">✨ 生成攻略</button>
          </div>
          <div class="tai-output" id="tai-guide-out" style="display:none"></div>
        </div>

        <!-- AI 对话 -->
        <div class="tai-body" id="tai-panel-chat" style="display:none">
          <div class="tai-chat" id="tai-chat-list"></div>
          <label class="tai-web-toggle" style="padding:6px 2px">
            <input type="checkbox" id="tai-chat-web">
            <span>🔍 联网搜索</span>
          </label>
          <div class="tai-chat-input">
            <input class="input" id="tai-chat-text" placeholder="问点关于旅行的事…" autocomplete="off">
            <button class="tai-send" id="tai-send">发送</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#tai-close').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#tai-clear').addEventListener('click', () => {
      if (!confirm('确定清空所有聊天记录吗？')) return;
      this.clearHistory();
      const list = overlay.querySelector('#tai-chat-list');
      if (list) {
        list.innerHTML = '';
        list.appendChild(this._welcomeMsg());
      }
      Utils.showToast('聊天记录已清空');
    });
    this._bindTabs(overlay);
    this._bindGuide(overlay);
    this._bindChat(overlay);

    // 有历史记录时，默认直接进「AI 对话」，方便接着聊
    if (this._history.length > 0) {
      const chatTab = overlay.querySelector('.tai-tab[data-tab="chat"]');
      if (chatTab) chatTab.click();
    }
  },

  _welcomeMsg() {
    const div = document.createElement('div');
    div.className = 'tai-msg tai-msg-ai';
    div.textContent = '你好呀～ 我是你们的旅行搭子 🌏 想去哪玩、有什么难题，尽管问我！';
    return div;
  },

  _bindTabs(overlay) {
    overlay.querySelectorAll('.tai-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.tai-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const name = tab.dataset.tab;
        overlay.querySelector('#tai-panel-guide').style.display = name === 'guide' ? '' : 'none';
        overlay.querySelector('#tai-panel-chat').style.display = name === 'chat' ? '' : 'none';
      });
    });
  },

  _bindGuide(overlay) {
    const btn = overlay.querySelector('#tai-gen');
    const out = overlay.querySelector('#tai-guide-out');
    btn.addEventListener('click', async () => {
      if (this._busy) return;
      const destination = overlay.querySelector('#tai-dest').value.trim();
      const days = overlay.querySelector('#tai-days').value.trim();
      const extra = overlay.querySelector('#tai-extra').value.trim();
      const web = overlay.querySelector('#tai-guide-web').checked;
      if (!destination) { Utils.showToast('请填写目的地'); return; }

      this._busy = true;
      btn.disabled = true;
      btn.textContent = web ? '联网搜索+生成中…（约需半分钟）' : '生成中…';
      out.style.display = '';
      out.innerHTML = `<div class="tai-loading"><span class="tai-dot"></span><span class="tai-dot"></span><span class="tai-dot"></span> ${web ? '正在全网搜攻略并规划…' : '正在为你们规划…'}</div>`;

      try {
        const { content, sources } = await this._call({ mode: 'guide', destination, days, extra, web });
        this._lastGuide = content;
        const sourcesHTML = sources.length ? `
          <div class="tai-sources">
            <div class="tai-sources-title">🔗 参考来源</div>
            ${sources.map(s => `<a class="tai-source" href="${s.link}" target="_blank" rel="noopener">${this._esc(s.title)}</a>`).join('')}
          </div>` : '';
        out.innerHTML = `
          <div class="tai-md">${this._md(content)}</div>
          ${sourcesHTML}
          <div class="tai-actions">
            <button class="btn btn-primary btn-sm" id="tai-fill" style="flex:1">📥 填充到新行程</button>
            <button class="btn btn-ghost btn-sm" id="tai-copy" style="flex:1">📋 复制</button>
          </div>
        `;
        out.querySelector('#tai-copy').addEventListener('click', () => {
          navigator.clipboard?.writeText(this._lastGuide || '').then(
            () => Utils.showToast('已复制'),
            () => Utils.showToast('复制失败，请长按选择')
          );
        });
        out.querySelector('#tai-fill').addEventListener('click', () => {
          overlay.remove();
          this._fillToTravel({ destination, days, itinerary: this._lastGuide });
        });
      } catch (e) {
        if (e.needRecharge || e.rateLimited) {
          out.innerHTML = `<div class="tai-error">${e.needRecharge ? '💳 联网额度用完啦' : '⏳ 搜索太频繁'}</div><div class="tai-hint">可先关掉「联网搜索」开关继续生成，或稍后再试</div>`;
          this._showRechargeNotice(e.message, e.rateLimited);
        } else {
          out.innerHTML = `<div class="tai-error">😢 ${this._esc(e.message)}</div><div class="tai-hint">提示：网络不好可关掉联网开关试试；也可切换到 WiFi 再试</div>`;
        }
      } finally {
        this._busy = false;
        btn.disabled = false;
        btn.textContent = '✨ 生成攻略';
      }
    });
  },

  // 把 AI 内容填充到「添加旅行记录」表单（兼容不同页面暴露方式）
  _fillToTravel({ destination, days, itinerary }) {
    const page = (window.TravelPage) ||
                 (window.App && App.pages && App.pages.travel) ||
                 (typeof TravelPage !== 'undefined' ? TravelPage : null);
    if (page && typeof page._fillFromAI === 'function') {
      page._fillFromAI({ destination, days, itinerary });
    } else {
      Utils.showToast('页面未就绪，请刷新后重试');
    }
  },

  _bindChat(overlay) {
    const input = overlay.querySelector('#tai-chat-text');
    const send = overlay.querySelector('#tai-send');
    const list = overlay.querySelector('#tai-chat-list');

    // 渲染单条 AI 消息（含「加入行程」按钮）
    const renderAI = (container, text, opts = {}) => {
      let html = this._md(text);
      html += `<div class="tai-msg-actions">
          <button class="tai-mini-btn" data-act="add">📥 加入行程</button>
          <button class="tai-mini-btn" data-act="copy">📋 复制</button>
        </div>`;
      container.innerHTML = html;
      const addBtn = container.querySelector('[data-act="add"]');
      const copyBtn = container.querySelector('[data-act="copy"]');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const dest = opts.destination || this._guessDestination(text);
          overlay.remove();
          this._fillToTravel({ destination: dest, days: '', itinerary: text });
        });
      }
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard?.writeText(text).then(
            () => Utils.showToast('已复制'),
            () => Utils.showToast('复制失败，请长按选择')
          );
        });
      }
      return container;
    };

    const pushMsg = (role, text, opts = {}) => {
      const div = document.createElement('div');
      div.className = 'tai-msg ' + (role === 'user' ? 'tai-msg-user' : 'tai-msg-ai');
      if (role === 'user') {
        div.innerHTML = this._esc(text);
      } else {
        renderAI(div, text, opts);
      }
      list.appendChild(div);
      list.scrollTop = list.scrollHeight;
      return div;
    };

    // 恢复历史记录
    list.innerHTML = '';
    if (this._history.length === 0) {
      list.appendChild(this._welcomeMsg());
    } else {
      this._history.forEach(m => {
        const div = document.createElement('div');
        div.className = 'tai-msg ' + (m.role === 'user' ? 'tai-msg-user' : 'tai-msg-ai');
        if (m.role === 'user') div.innerHTML = this._esc(m.content);
        else renderAI(div, m.content, { destination: m.destination });
        list.appendChild(div);
      });
      list.scrollTop = list.scrollHeight;
    }

    const doSend = async () => {
      if (this._busy) return;
      const text = input.value.trim();
      if (!text) return;
      const web = overlay.querySelector('#tai-chat-web').checked;
      input.value = '';
      pushMsg('user', text);
      this._history.push({ role: 'user', content: text });
      this._saveHistory();

      this._busy = true;
      send.disabled = true;
      const pending = pushMsg('assistant', web ? '🔍 正在联网查资料…' : '…');

      try {
        const payloadMsgs = this._history.map(m => ({ role: m.role, content: m.content }));
        const { content, sources } = await this._call({ mode: 'chat', messages: payloadMsgs, web });
        const guessedDest = text.length <= 20 ? text : '';
        this._history.push({ role: 'assistant', content, destination: guessedDest });
        this._saveHistory();
        let html = this._md(content);
        if (sources.length) {
          html += `<div class="tai-sources"><div class="tai-sources-title">🔗 来源</div>${sources.map(s => `<a class="tai-source" href="${s.link}" target="_blank" rel="noopener">${this._esc(s.title)}</a>`).join('')}</div>`;
        }
        html += `<div class="tai-msg-actions">
            <button class="tai-mini-btn" data-act="add">📥 加入行程</button>
            <button class="tai-mini-btn" data-act="copy">📋 复制</button>
          </div>`;
        pending.innerHTML = html;
        const addBtn = pending.querySelector('[data-act="add"]');
        const copyBtn = pending.querySelector('[data-act="copy"]');
        if (addBtn) {
          addBtn.addEventListener('click', () => {
            const dest = text.length <= 20 ? text : '';
            overlay.remove();
            this._fillToTravel({ destination: dest, days: '', itinerary: content });
          });
        }
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            navigator.clipboard?.writeText(content).then(
              () => Utils.showToast('已复制'),
              () => Utils.showToast('复制失败，请长按选择')
            );
          });
        }
      } catch (e) {
        if (e.needRecharge || e.rateLimited) {
          pending.innerHTML = `<span style="color:var(--text-secondary)">${e.needRecharge ? '💳 联网额度用完啦' : '⏳ 搜索太频繁'}</span>`;
          this._showRechargeNotice(e.message, e.rateLimited);
        } else {
          pending.innerHTML = `<span style="color:var(--text-secondary)">😢 ${this._esc(e.message)}</span>`;
        }
        // 失败的这轮不进历史
        this._history.pop();
        this._history.pop();
      } finally {
        this._busy = false;
        send.disabled = false;
        list.scrollTop = list.scrollHeight;
      }
    };

    send.addEventListener('click', doSend);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSend(); });
    setTimeout(() => input.scrollIntoView && input.focus(), 200);
  },

  // 从 AI 文本里猜目的地（用于「加入行程」预填地点）
  _guessDestination(text) {
    const m = String(text).match(/【(.+?)】/);
    if (m) return m[1].slice(0, 20);
    const t = String(text).replace(/[#*>\-]/g, '').trim();
    const mm = t.match(/^([\u4e00-\u9fa5]{2,6})(旅行|旅游|攻略|行程|自由行)/);
    if (mm) return mm[1];
    return '';
  },

  _md(text) {
    const esc = this._esc(text);
    return esc
      .replace(/^### (.*)$/gm, '<h4>$1</h4>')
      .replace(/^## (.*)$/gm, '<h3>$1</h3>')
      .replace(/^# (.*)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^[-*] (.*)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>');
  },

  _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};

window.TravelAI = TravelAI;
