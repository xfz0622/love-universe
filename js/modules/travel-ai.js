/* ===== 【我们的恋爱小宇宙】AI 旅行助手 v2 ===== */
// v2: 联网搜索开关 + 超时控制 + 自动重试 + 友好错误提示
const TravelAI = {
  _history: [],
  _busy: false,

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
      throw new Error(data.error || `请求失败(${resp.status})`);
    }
    return { content: data.content || '', sources: data.sources || [] };
  },

  // ===== 打开助手面板 =====
  open() {
    if (document.querySelector('#travel-ai-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'travel-ai-overlay';
    overlay.className = 'tai-overlay';
    overlay.innerHTML = `
      <div class="tai-panel">
        <div class="tai-header">
          <button class="tai-back" id="tai-close">×</button>
          <span class="tai-title">✨ AI 旅行助手</span>
          <span style="width:32px"></span>
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
          <div class="tai-chat" id="tai-chat-list">
            <div class="tai-msg tai-msg-ai">你好呀～ 我是你们的旅行搭子 🌏 想去哪玩、有什么难题，尽管问我！</div>
          </div>
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
    this._bindTabs(overlay);
    this._bindGuide(overlay);
    this._bindChat(overlay);
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
          if (window.TravelPage && TravelPage._fillFromAI) {
            TravelPage._fillFromAI({ destination, days, itinerary: this._lastGuide });
          }
        });
      } catch (e) {
        out.innerHTML = `<div class="tai-error">😢 ${this._esc(e.message)}</div><div class="tai-hint">提示：网络不好可关掉联网开关试试；也可切换到 WiFi 再试</div>`;
      } finally {
        this._busy = false;
        btn.disabled = false;
        btn.textContent = '✨ 生成攻略';
      }
    });
  },

  _bindChat(overlay) {
    const input = overlay.querySelector('#tai-chat-text');
    const send = overlay.querySelector('#tai-send');
    const list = overlay.querySelector('#tai-chat-list');

    const pushMsg = (role, text) => {
      const div = document.createElement('div');
      div.className = 'tai-msg ' + (role === 'user' ? 'tai-msg-user' : 'tai-msg-ai');
      div.innerHTML = role === 'user' ? this._esc(text) : this._md(text);
      list.appendChild(div);
      list.scrollTop = list.scrollHeight;
      return div;
    };

    const doSend = async () => {
      if (this._busy) return;
      const text = input.value.trim();
      if (!text) return;
      const web = overlay.querySelector('#tai-chat-web').checked;
      input.value = '';
      pushMsg('user', text);
      this._history.push({ role: 'user', content: text });

      this._busy = true;
      send.disabled = true;
      const pending = pushMsg('assistant', web ? '🔍 正在联网查资料…' : '…');

      try {
        const { content, sources } = await this._call({ mode: 'chat', messages: this._history, web });
        this._history.push({ role: 'assistant', content });
        let html = this._md(content);
        if (sources.length) {
          html += `<div class="tai-sources"><div class="tai-sources-title">🔗 来源</div>${sources.map(s => `<a class="tai-source" href="${s.link}" target="_blank" rel="noopener">${this._esc(s.title)}</a>`).join('')}</div>`;
        }
        pending.innerHTML = html;
      } catch (e) {
        pending.innerHTML = `<span style="color:var(--text-secondary)">😢 ${this._esc(e.message)}</span>`;
      } finally {
        this._busy = false;
        send.disabled = false;
        list.scrollTop = list.scrollHeight;
      }
    };

    send.addEventListener('click', doSend);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSend(); });
    setTimeout(() => input.focus(), 200);
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
