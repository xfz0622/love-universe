/* ===== 【我们的恋爱小宇宙】AI 旅行助手 ===== */
// 通过 Supabase Edge Function (travel-ai) 中转智谱 GLM，密钥不暴露在前端
const TravelAI = {
  _history: [],          // 对话历史
  _busy: false,

  // Supabase Edge Function 地址
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

  async _call(payload) {
    const url = this._endpoint;
    if (!url) throw new Error('未配置 Supabase');
    const resp = await fetch(url, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(payload)
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.error) {
      throw new Error(data.error || `请求失败(${resp.status})`);
    }
    return data.content || '';
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
            <button class="btn btn-primary" id="tai-gen" style="width:100%">✨ 生成攻略</button>
          </div>
          <div class="tai-output" id="tai-guide-out" style="display:none"></div>
        </div>

        <!-- AI 对话 -->
        <div class="tai-body" id="tai-panel-chat" style="display:none">
          <div class="tai-chat" id="tai-chat-list">
            <div class="tai-msg tai-msg-ai">你好呀～ 我是你们的旅行搭子 🌏 想去哪玩、有什么难题，尽管问我！</div>
          </div>
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
      if (!destination) { Utils.showToast('请填写目的地'); return; }

      this._busy = true;
      btn.disabled = true;
      btn.textContent = '生成中…';
      out.style.display = '';
      out.innerHTML = `<div class="tai-loading"><span class="tai-dot"></span><span class="tai-dot"></span><span class="tai-dot"></span> 正在为你们规划…</div>`;

      try {
        const content = await this._call({ mode: 'guide', destination, days, extra });
        this._lastGuide = content;
        out.innerHTML = `
          <div class="tai-md">${this._md(content)}</div>
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
        out.innerHTML = `<div class="tai-error">😢 ${this._esc(e.message)}</div>`;
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
      input.value = '';
      pushMsg('user', text);
      this._history.push({ role: 'user', content: text });

      this._busy = true;
      send.disabled = true;
      const pending = pushMsg('assistant', '…');

      try {
        const content = await this._call({ mode: 'chat', messages: this._history });
        this._history.push({ role: 'assistant', content });
        pending.innerHTML = this._md(content);
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

  // 极简 Markdown → HTML（标题/加粗/列表/换行）
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
