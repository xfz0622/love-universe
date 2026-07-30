/* ===== 【我们的恋爱小宇宙】小游戏中心 ===== */
const GamePage = {
  _currentGame: null,

  render(container) {
    SFX.tap();
    this._currentGame = null;
    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-back" onclick="App.navigateTo('dashboard')">←</button>
        <h2>小游戏</h2>
        <div style="width:40px"></div>
      </div>
      <div class="game-lobby">
        <p class="game-lobby-desc">和TA一起玩游戏，输的人接受惩罚</p>
        <div class="game-cards">
          <div class="game-card card-stagger" onclick="GamePage.startGame('dice')">
            <div class="game-card-inner">
              <div class="game-card-icon game-icon-dice"></div>
              <div class="game-card-info">
                <h3 class="game-card-title">摇骰子</h3>
                <p class="game-card-desc">联机比大小，摇骰盅开盖，点数大的人赢</p>
              </div>
              <div class="game-card-arrow">→</div>
            </div>
          </div>
          <div class="game-card card-stagger" onclick="GamePage.startGame('math24')">
            <div class="game-card-inner">
              <div class="game-card-icon game-icon-math"></div>
              <div class="game-card-info">
                <h3 class="game-card-title">算24点</h3>
                <p class="game-card-desc">联机竞速，点击数字和运算符凑24，先算出来就赢</p>
              </div>
              <div class="game-card-arrow">→</div>
            </div>
          </div>
          <div class="game-card card-stagger" onclick="GamePage.startGame('truthdare')">
            <div class="game-card-inner">
              <div class="game-card-icon game-icon-wheel"></div>
              <div class="game-card-info">
                <h3 class="game-card-title">真心话大冒险</h3>
                <p class="game-card-desc">转盘随机选题，不敢做的接受惩罚，让感情升温</p>
              </div>
              <div class="game-card-arrow">→</div>
            </div>
          </div>
          <div class="game-card card-stagger" onclick="GamePage.startGame('mental')">
            <div class="game-card-inner">
              <div class="game-card-icon game-icon-bolt"></div>
              <div class="game-card-info">
                <h3 class="game-card-title">口算对战</h3>
                <p class="game-card-desc">联机PK口算速度，选难度比谁算得快</p>
              </div>
              <div class="game-card-arrow">→</div>
            </div>
          </div>
        </div>
      </div>
    `;
    Components.animateCards(container);
  },

  startGame(game) {
    SFX.tap();
    this._currentGame = game;
    const container = document.getElementById('page-content') || document.getElementById('dashboard-content');
    if (!container) return;
    const roomId = (Auth.getToken() || '').substring(0, 12) || 'default';
    GameSync.joinRoom(roomId);

    switch (game) {
      case 'dice': this._renderDice(container); break;
      case 'math24': this._renderMath24(container); break;
      case 'truthdare': this._renderTruthDare(container); break;
      case 'mental': this._renderMental(container); break;
    }
  },

  backToLobby() {
    SFX.tap();
    GameSync.leaveRoom();
    const container = document.getElementById('page-content') || document.getElementById('dashboard-content');
    if (container) this.render(container);
  },

  // ==================== 摇骰子（联机比大小） ====================
  _diceState: { myNums: null, oppNums: null, cupOpen: false, shaking: false, round: 0 },

  _renderDice(container) {
    this._diceState = { myNums: null, oppNums: null, cupOpen: false, shaking: false, round: 0 };

    container.innerHTML = `
      <div class="game-page game-page-dark">
        <div class="game-header">
          <button class="game-header-btn" onclick="GamePage.backToLobby()">←</button>
          <span class="game-header-title">摇骰子</span>
          <div style="width:36px"></div>
        </div>
        <div class="game-content" style="text-align:center">
          <div id="dice-opp-status" style="height:24px;color:rgba(255,255,255,0.5);font-size:13px;margin-bottom:12px;font-weight:500">等待TA加入...</div>

          <div class="dice-area">
            <button class="dice-shake-btn" id="dice-shake-btn" onclick="GamePage._diceRoll()">摇</button>
            <div class="dice-stage" id="dice-stage">
              <div class="dice-cup-container" id="dice-cup-container" onclick="GamePage._diceToggle()">
                <div class="dice-tray" id="dice-tray">
                  <div class="dice-tray-label">?</div>
                </div>
                <div class="dice-cup" id="dice-cup">
                  <div class="cup-top"></div>
                  <div class="cup-body">
                    <div class="cup-rim"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="dice-result" style="min-height:36px;margin-top:16px;font-size:20px;font-weight:700"></div>
          <div style="color:rgba(255,255,255,0.25);font-size:11px;margin-top:6px">点击骰盅开盖查看点数</div>
        </div>
      </div>
    `;

    GameSync.on('dice_roll', (data) => {
      this._diceState.oppNums = data.nums;
      document.getElementById('dice-opp-status').textContent = 'TA摇了骰子';
    });
    GameSync.on('dice_open', (data) => {
      this._diceState.oppNums = data.nums;
      document.getElementById('dice-opp-status').textContent = 'TA开了盅';
      this._diceCheckResult();
    });
    GameSync.on('dice_again', () => {
      this._diceState = { myNums: null, oppNums: null, cupOpen: false, shaking: false, round: this._diceState.round + 1 };
      this._diceUpdateUI();
    });
  },

  _diceRoll() {
    SFX.shake();
    const s = this._diceState;
    if (s.shaking) return;
    s.shaking = true;
    s.cupOpen = false;
    s.myNums = Array.from({length: 5}, () => Math.floor(Math.random() * 6) + 1);

    const btn = document.getElementById('dice-shake-btn');
    if (btn) btn.disabled = true;
    document.getElementById('dice-opp-status').textContent = '你摇了骰子';
    GameSync.send('dice_roll', { nums: s.myNums });

    const cup = document.getElementById('dice-cup');
    const cc = document.getElementById('dice-cup-container');
    if (cup) cup.classList.remove('cup-lifted');
    if (cc) cc.classList.add('shaking');
    document.getElementById('dice-result').textContent = '';
    document.getElementById('dice-tray').innerHTML = '<div class="dice-tray-label">?</div>';

    setTimeout(() => {
      if (cc) cc.classList.remove('shaking');
      s.shaking = false;
      if (btn) btn.disabled = false;
    }, 2000);
  },

  _diceToggle() {
    SFX.cupOpen();
    const s = this._diceState;
    if (s.shaking) return;
    if (!s.myNums) return; // 还没摇过

    if (!s.cupOpen) {
      s.cupOpen = true;
      document.getElementById('dice-cup').classList.add('cup-lifted');
      this._diceRenderDots();
      GameSync.send('dice_open', { nums: s.myNums });
      this._diceCheckResult();
    } else {
      s.cupOpen = false;
      document.getElementById('dice-cup').classList.remove('cup-lifted');
      document.getElementById('dice-tray').innerHTML = '<div class="dice-tray-label">?</div>';
      document.getElementById('dice-result').textContent = '';
    }
  },

  _diceRenderDots() {
    const tray = document.getElementById('dice-tray');
    if (!tray) return;
    tray.innerHTML = this._diceState.myNums.map(n => `
      <div class="dice-dot">
        ${this._diceDotsSVG(n)}
      </div>
    `).join('');
  },

  _diceDotsSVG(n) {
    const dots = { 1: [[1,1]], 2: [[0,0],[2,2]], 3: [[0,0],[1,1],[2,2]], 4: [[0,0],[0,2],[2,0],[2,2]], 5: [[0,0],[0,2],[1,1],[2,0],[2,2]], 6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]] };
    // 标准骰子：1点和4点为红色，其余为暗蓝色
    const colorClass = (n === 1 || n === 4) ? 'red' : 'blue';
    return `<svg viewBox="0 0 3 3" style="width:100%;height:100%">${(dots[n]||[]).map(([r,c]) => `<circle cx="${c+0.5}" cy="${r+0.5}" r="0.38" class="${colorClass}"/>`).join('')}</svg>`;
  },

  _diceCheckResult() {
    const s = this._diceState;
    if (!s.myNums || !s.oppNums) return;
    const mySum = s.myNums.reduce((a, b) => a + b, 0);
    const oppSum = s.oppNums.reduce((a, b) => a + b, 0);
    setTimeout(() => {
      if (mySum > oppSum) SFX.win(); else if (mySum < oppSum) SFX.lose();
    }, 200);
    const winner = mySum > oppSum ? '你赢了！' : mySum < oppSum ? '你输了' : '平局';
    document.getElementById('dice-result').innerHTML = `你 <b>${mySum}</b> : <b>${oppSum}</b> TA &nbsp; ${winner}`;
    // 显示再来按钮
    const area = document.querySelector('.dice-area');
    if (area && !document.getElementById('dice-again-btn')) {
      const btn = document.createElement('button');
      btn.id = 'dice-again-btn';
      btn.className = 'dice-again-btn';
      btn.textContent = '再来';
      btn.onclick = () => { btn.remove(); GamePage._diceAgain(); };
      area.appendChild(btn);
    }
  },

  _diceAgain() {
    SFX.tap();
    this._diceState = { myNums: null, oppNums: null, cupOpen: false, shaking: false, round: this._diceState.round + 1 };
    this._diceUpdateUI();
    GameSync.send('dice_again', {});
  },

  _diceUpdateUI() {
    const btn = document.getElementById('dice-shake-btn');
    if (btn) btn.disabled = false;
    const cup = document.getElementById('dice-cup');
    if (cup) cup.classList.remove('cup-lifted');
    const cc = document.getElementById('dice-cup-container');
    if (cc) cc.classList.remove('shaking');
    const tray = document.getElementById('dice-tray');
    if (tray) tray.innerHTML = '<div class="dice-tray-label">?</div>';
    const result = document.getElementById('dice-result');
    if (result) result.textContent = '';
    const status = document.getElementById('dice-opp-status');
    if (status) status.textContent = '等待TA加入...';
    const again = document.getElementById('dice-again-btn');
    if (again) again.remove();
  },

  // ==================== 算24点（单人/联机） ====================
  _math24State: { mode: null, cards: [], solution: '', myScore: 0, oppScore: 0, solved: false, oppSolved: false, steps: [], firstCard: null, op: null },

  _renderMath24(container) {
    this._math24State = { mode: null, cards: [], solution: '', myScore: 0, oppScore: 0, solved: false, oppSolved: false, steps: [], firstCard: null, op: null };
    this._math24ShowLobby(container);

    GameSync.on('m24_start', (data) => {
      if (this._math24State.mode !== 'online') return;
      this._math24State.cards = data.cards;
      this._math24State.solved = false;
      this._math24State.oppSolved = false;
      this._math24State.steps = [];
      this._math24State.firstCard = null;
      this._math24State.op = null;
      this._math24RenderBattle();
    });
    GameSync.on('m24_solved', (data) => {
      if (this._math24State.mode !== 'online') return;
      this._math24State.oppSolved = true;
      this._math24State.oppScore++;
      SFX.lose();
      this._math24UpdateScore();
      this._math24SetOppStatus('你的伴侣先答一步 💡');
      const resultEl = document.getElementById('m24-result');
      if (resultEl) resultEl.textContent = 'TA的解法：' + data.expr;
      this._math24DisableInput();
      setTimeout(() => this._math24NextQuestion(), 2500);
    });
    GameSync.on('m24_next', (data) => {
      if (this._math24State.mode !== 'online') return;
      this._math24State.cards = data.cards;
      this._math24State.solved = false;
      this._math24State.oppSolved = false;
      this._math24State.steps = [];
      this._math24State.firstCard = null;
      this._math24State.op = null;
      this._math24RenderBattle();
    });
  },

  _math24ShowLobby(container) {
    container.innerHTML = `
      <div class="game-page game-page-light">
        <div class="game-header">
          <button class="game-header-btn" onclick="GamePage.backToLobby()">←</button>
          <span class="game-header-title">算24点</span>
          <div style="width:36px"></div>
        </div>
        <div class="game-content" style="text-align:center">
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:28px">用4张牌凑出24，顺序：数字 → 运算符 → 数字</p>

          <div class="math24-lobby-card">
            <div style="font-size:14px;margin-bottom:12px;font-weight:600;color:var(--text-secondary)">选择模式</div>
            <div style="display:flex;gap:10px;justify-content:center">
              <button class="mental-mode-btn" id="m24m-solo" onclick="GamePage._math24SetMode('solo')">单人练习</button>
              <button class="mental-mode-btn" id="m24m-online" onclick="GamePage._math24SetMode('online')">联机对战</button>
            </div>
          </div>

          <div id="m24-online-options" style="display:none">
            <button class="btn" onclick="GamePage._math24Create()" style="width:100%;margin-bottom:10px;padding:14px;border-radius:14px;background:linear-gradient(135deg,#00B894,#00A381);color:#fff;font-size:15px;font-weight:700;border:none;box-shadow:0 4px 16px rgba(0,184,148,0.3)">创建房间</button>
            <div style="display:flex;gap:10px;align-items:center">
              <input class="input" id="m24-join-code" placeholder="4位房间号" maxlength="4" style="text-align:center;font-size:22px;letter-spacing:10px;border-radius:14px;font-weight:700">
              <button class="btn" onclick="GamePage._math24Join()" style="white-space:nowrap;padding:14px 24px;border-radius:14px;font-weight:600">加入</button>
            </div>
          </div>
          <button class="btn" id="m24-solo-start" onclick="GamePage._math24StartSolo()" style="display:none;width:100%;padding:14px;border-radius:14px;background:linear-gradient(135deg,#00B894,#00A381);color:#fff;font-size:15px;font-weight:700;border:none;box-shadow:0 4px 16px rgba(0,184,148,0.3)">开始练习</button>
        </div>
      </div>
    `;
  },

  _math24SetMode(m) {
    SFX.tap();
    this._math24State.mode = m;
    document.querySelectorAll('#m24m-solo, #m24m-online').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('m24m-' + m);
    if (btn) btn.classList.add('active');
    const onlineOpts = document.getElementById('m24-online-options');
    const soloStart = document.getElementById('m24-solo-start');
    if (onlineOpts) onlineOpts.style.display = m === 'online' ? 'block' : 'none';
    if (soloStart) soloStart.style.display = m === 'solo' ? 'block' : 'none';
  },

  _math24StartSolo() {
    SFX.tap();
    this._math24State.mode = 'solo';
    this._math24StartBattle();
  },

  _math24Create() {
    SFX.tap();
    this._math24State.isHost = true;
    this._math24State.roomCode = String(Math.floor(1000 + Math.random() * 9000));
    this._math24ShowRoom();
  },

  _math24Join() {
    SFX.tap();
    const code = document.getElementById('m24-join-code')?.value.trim();
    if (!code || code.length !== 4) { Utils.showToast('请输入4位房间号'); return; }
    this._math24State.isHost = false;
    this._math24State.roomCode = code;
    this._math24ShowRoom();
    GameSync.joinRoom(code);
    GameSync.send('m24_joined', {});
  },

  _math24ShowRoom() {
    const container = document.getElementById('page-content') || document.getElementById('dashboard-content');
    if (!container) return;
    container.innerHTML = `
      <div class="game-page game-page-light">
        <div class="game-header">
          <button class="game-header-btn" onclick="GamePage._math24ShowLobby(document.getElementById('page-content')||document.getElementById('dashboard-content'))">←</button>
          <span class="game-header-title">算24点</span>
          <div style="width:36px"></div>
        </div>
        <div class="game-content" style="text-align:center;padding-top:50px">
          <div style="font-size:56px;margin-bottom:12px">🃏</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px">房间号</div>
          <div style="font-size:44px;font-weight:800;letter-spacing:14px;margin-bottom:28px;color:#00B894">${this._math24State.roomCode}</div>
          <div id="m24-room-status" style="font-size:15px;color:var(--text-muted);margin-bottom:28px;font-weight:500">
            ${this._math24State.isHost ? '等待TA加入...' : '已加入房间，等待开始...'}
          </div>
          ${this._math24State.isHost ? '<button class="btn" id="m24-start-btn" onclick="GamePage._math24StartBattle()" style="width:220px;padding:14px;border-radius:14px;background:linear-gradient(135deg,#00B894,#00A381);color:#fff;font-size:16px;font-weight:700;border:none;box-shadow:0 4px 16px rgba(0,184,148,0.3)" disabled>开始对战</button>' : ''}
        </div>
      </div>
    `;
    GameSync.joinRoom(this._math24State.roomCode);
  },

  _math24UpdateRoomInfo() {
    const status = document.getElementById('m24-room-status');
    const btn = document.getElementById('m24-start-btn');
    if (status) status.textContent = 'TA已加入，点击开始！';
    if (btn) btn.disabled = false;
  },

  _math24StartBattle() {
    SFX.tap();
    const cards = this._math24Gen();
    this._math24State.cards = cards.cards;
    this._math24State.solution = cards.solution;
    this._math24State.solved = false;
    this._math24State.oppSolved = false;
    this._math24State.steps = [];
    this._math24State.firstCard = null;
    this._math24State.op = null;
    const container = document.getElementById('page-content') || document.getElementById('dashboard-content');
    this._math24RenderBattle(container);
    if (this._math24State.mode === 'online') {
      GameSync.send('m24_start', { cards: cards.cards });
    }
  },

  _math24Gen() {
    let cards, solution;
    do { cards = Array.from({length:4}, () => Math.floor(Math.random()*10)+1); solution = this._math24Find(cards); } while (!solution);
    return { cards, solution };
  },

  _math24Find(nums) {
    const ops = ['+','-','*','/'];
    const calc = (a,b,op) => { switch(op){ case'+':return a+b; case'-':return a-b; case'*':return a*b; case'/':return b!==0?a/b:NaN; } };
    const perm = (arr) => { if(arr.length<=1) return [arr]; const r=[]; for(let i=0;i<arr.length;i++){ const rest=[...arr.slice(0,i),...arr.slice(i+1)]; for(const p of perm(rest)) r.push([arr[i],...p]); } return r; };
    for(const [a,b,c,d] of perm(nums)){
      for(const o1 of ops) for(const o2 of ops) for(const o3 of ops){
        const exprs = [
          [calc(calc(calc(a,b,o1),c,o2),d,o3), `(({a}${o1}{b})${o2}{c})${o3}{d}`],
          [calc(calc(a,calc(b,c,o2),o1),d,o3), `(${a}${o1}(${b}${o2}${c}))${o3}${d}`],
          [calc(a,calc(calc(b,c,o2),d,o3),o1), `${a}${o1}((${b}${o2}${c})${o3}${d})`],
          [calc(a,calc(b,calc(c,d,o3),o2),o1), `${a}${o1}(${b}${o2}(${c}${o3}${d}))`],
          [calc(calc(a,b,o1),calc(c,d,o3),o2), `(${a}${o1}${b})${o2}(${c}${o3}${d})`]
        ];
        for(const [val,expr] of exprs){ if(Math.abs(val-24)<0.0001) return expr+'=24'; }
      }
    }
    return null;
  },

  _math24RenderBattle(container) {
    if (!container) container = document.getElementById('page-content') || document.getElementById('dashboard-content');
    if (!container) return;
    const solo = this._math24State.mode === 'solo';
    container.innerHTML = `
      <div class="game-page game-page-light">
        <div class="game-header">
          <button class="game-header-btn" onclick="GamePage._math24ShowLobby(document.getElementById('page-content')||document.getElementById('dashboard-content'))">←</button>
          <span class="game-header-title">算24点</span>
          <div style="width:36px"></div>
        </div>
        <div class="game-content" style="text-align:center">
          <div class="m24-score-bar">
            <span>你 <b id="m24-my-score" style="color:#00B894;font-size:18px">0</b> 分</span>
            <span style="color:var(--text-muted)">|</span>
            ${solo ? '<span style="color:var(--text-muted)">单人练习</span>' : '<span>TA <b id="m24-opp-score" style="color:#FF6B8A;font-size:18px">0</b> 分</span>'}
          </div>
          <div id="m24-opp-status" style="height:22px;font-size:13px;color:#FF6B8A;margin-bottom:14px;font-weight:600"></div>

          <div id="m24-cards" style="display:flex;justify-content:center;gap:16px;margin-bottom:28px;min-height:100px;align-items:center">
            <span style="color:var(--text-muted);font-size:14px">题目加载中...</span>
          </div>

          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">选数字 → 选运算符 → 再选数字</div>
          <div id="m24-ops" style="display:flex;justify-content:center;gap:12px;margin-bottom:18px">
            ${['+','−','×','÷'].map(op => `<button class="m24-op-btn" id="m24-op-${op}" onclick="GamePage._math24ClickOp('${op}')">${op}</button>`).join('')}
          </div>

          <div id="m24-steps"></div>

          <div style="display:flex;gap:10px;justify-content:center">
            <button class="btn btn-ghost btn-sm" onclick="GamePage._math24Undo()" style="border-radius:12px;padding:10px 18px">撤销</button>
            <button class="btn btn-ghost btn-sm" onclick="GamePage._math24StartBattle()" style="border-radius:12px;padding:10px 18px">换题</button>
          </div>
          <div id="m24-result"></div>
        </div>
      </div>
    `;
    this._math24RenderCards();
    this._math24UpdateScore();
  },

  _math24RenderCards() {
    const div = document.getElementById('m24-cards');
    if (!div) return;
    const state = this._math24State;
    const ids = state.cards.map((c, i) => ({ val: c, id: 'c' + Date.now() + i + '_' + c }));
    state._cardIds = ids;
    div.innerHTML = ids.map(({val, id}) => {
      const isSelected = state.firstCard && state.firstCard.dataset.id === id;
      return `
        <div class="m24-card ${isSelected ? 'selected' : ''}" data-id="${id}" data-val="${val}" onclick="GamePage._math24ClickCard(this)">
          <span class="m24-card-num">${val}</span>
        </div>
      `;
    }).join('');
    // 恢复 firstCard 引用
    if (state.firstCard) {
      const el = div.querySelector(`[data-id="${state.firstCard.dataset.id}"]`);
      if (el) state.firstCard = el;
    }
  },

  _math24ClickCard(el) {
    SFX.tap();
    const state = this._math24State;
    if (state.solved || state.oppSolved) return;

    // 无选中数字：选中它
    if (!state.firstCard) {
      state.firstCard = el;
      el.classList.add('selected');
      return;
    }

    // 已选运算符：执行运算
    if (state.op) {
      if (el === state.firstCard) { // 取消
        state.firstCard.classList.remove('selected');
        state.firstCard = null;
        state.op = null;
        this._math24UnhighlightOp();
        return;
      }
      this._math24ApplyOp(state.firstCard, el, state.op);
      state.firstCard = null;
      state.op = null;
      this._math24UnhighlightOp();
      return;
    }

    // 已选数字未选运算符：切换数字
    if (state.firstCard) {
      state.firstCard.classList.remove('selected');
      if (el === state.firstCard) {
        state.firstCard = null;
      } else {
        state.firstCard = el;
        el.classList.add('selected');
      }
    }
  },

  _math24ClickOp(op) {
    SFX.tap();
    const state = this._math24State;
    if (state.solved || state.oppSolved) return;
    if (!state.firstCard) { Utils.showToast('先选一个数字'); return; }
    state.op = op;
    document.querySelectorAll('.m24-op-btn').forEach(b => b.classList.remove('selected'));
    const btn = document.getElementById('m24-op-' + op);
    if (btn) btn.classList.add('selected');
  },

  _math24UnhighlightOp() {
    document.querySelectorAll('.m24-op-btn').forEach(b => b.classList.remove('selected'));
  },

  _math24ApplyOp(aEl, bEl, op) {
    const a = parseInt(aEl.dataset.val), b = parseInt(bEl.dataset.val);
    let result, expr;
    switch(op) {
      case '+': result = a + b; expr = `${a}+${b}=${result}`; break;
      case '−': result = a - b; expr = `${a}−${b}=${result}`; break;
      case '×': result = a * b; expr = `${a}×${b}=${result}`; break;
      case '÷':
        if (b === 0 || a % b !== 0) {
          Utils.showToast('不能整除，换种算法');
          return;
        }
        result = a / b; expr = `${a}÷${b}=${result}`; break;
    }

    // 记录步骤
    this._math24State.steps.push(expr);
    document.getElementById('m24-steps').textContent = this._math24State.steps.join('  →  ');

    // 合并：保留 aEl，删除 bEl
    aEl.dataset.val = result;
    aEl.querySelector('.m24-card-num').textContent = result;
    aEl.classList.remove('selected');
    bEl.remove();

    // 只剩一个数字，检查结果
    const remaining = document.querySelectorAll('.m24-card');
    if (remaining.length === 1 && parseInt(remaining[0].dataset.val) === 24) {
      this._math24Win(expr);
    } else if (remaining.length === 1) {
      SFX.wrong();
      const resultEl = document.getElementById('m24-result');
      if (resultEl) resultEl.textContent = '结果是 ' + remaining[0].dataset.val + '，再试一次';
      setTimeout(() => {
        this._math24State.steps = [];
        this._math24RenderCards();
        const stepsEl = document.getElementById('m24-steps');
        const resEl = document.getElementById('m24-result');
        if (stepsEl) stepsEl.textContent = '';
        if (resEl) resEl.textContent = '';
      }, 1500);
    }
  },

  _math24Win(expr) {
    SFX.correct();
    const state = this._math24State;
    if (state.solved || state.oppSolved) return;
    state.solved = true;
    state.myScore++;
    this._math24UpdateScore();
    const resultEl = document.getElementById('m24-result');
    if (resultEl) resultEl.textContent = '你算出来了！' + expr;
    this._math24SetOppStatus(state.mode === 'online' ? '你抢答成功' : '答对了！');
    if (state.mode === 'online') {
      GameSync.send('m24_solved', { expr });
    }
    this._math24DisableInput();
    setTimeout(() => this._math24NextQuestion(), 2000);
  },

  _math24NextQuestion() {
    this._math24StartBattle();
  },

  _math24DisableInput() {
    document.querySelectorAll('.m24-card, .m24-op-btn').forEach(el => {
      el.style.opacity = '0.6';
      el.style.pointerEvents = 'none';
    });
  },

  _math24UpdateScore() {
    const my = document.getElementById('m24-my-score');
    const opp = document.getElementById('m24-opp-score');
    if (my) my.textContent = this._math24State.myScore;
    if (opp) opp.textContent = this._math24State.oppScore;
  },

  _math24SetOppStatus(text) {
    const el = document.getElementById('m24-opp-status');
    if (el) el.textContent = text;
  },

  // 撤销：清除当前选中的数字/运算符
  _math24Undo() {
    SFX.tap();
    const state = this._math24State;
    state.firstCard = null;
    state.op = null;
    this._math24UnhighlightOp();
    document.querySelectorAll('.m24-card.selected').forEach(c => c.classList.remove('selected'));
  },

  _math24StartTimer() {},
  _math24StopTimer() {},

  // ==================== 真心话大冒险（单机） ====================
  _tdPool: {
    truth: [
      "上一次想TA想到哭是什么时候？", "你最喜欢TA身体的哪个部位？", "说一件你瞒着TA但无伤大雅的小事。",
      "你第一次对TA心动是在哪个瞬间？", "如果有一天你们分手了，你觉得最可能的原因是什么？",
      "你觉得TA最吸引你的地方是什么？", "你做过最疯狂的一件关于TA的事是什么？",
      "你最想和TA一起做但还没做的事是什么？", "你觉得你们吵架的时候，谁更爱冷战？",
      "说一个只有你们两个人知道的秘密回忆。", "你最喜欢的亲密时刻是什么？",
      "你觉得TA什么时候最可爱？", "你希望TA改掉的一个习惯是什么？",
      "你最吃醋的一次是什么时候？", "你们第一次接吻的时候你在想什么？",
      "你最想对TA说但一直没说出口的话是什么？", "你觉得自己在恋爱中最需要改进的地方是什么？",
      "如果明天世界末日，你今天会和TA做什么？", "你暗恋过TA的朋友吗？", "你觉得TA穿什么最好看？"
    ],
    dare: [
      "给对方发一段30秒的深情表白语音。", "用TA的照片发一条朋友圈，配文：这是我对象。",
      "唱一首情歌给TA听。", "把你们最甜的一张合照设为手机锁屏。",
      "给对方写一首三行情诗，现在就发。", "做10个俯卧撑，边做边喊TA的名字。",
      "给对方点一份外卖惊喜。", "模仿TA最搞笑的一个表情拍照发过去。",
      "现在立刻拍一张鬼脸自拍发给TA。", "打电话给TA说「我有个秘密…就是我超爱你」。",
      "跳一段15秒的舞录视频发给TA。", "用方言说一段情话给TA听。",
      "给TA取10个不同的爱称，一个个念出来。", "闭上眼睛想象TA在面前，说出你最想和TA做的事。",
      "给TA发一句：今晚梦到我，不然明天找你算账。", "对TA说一句超肉麻的话，不许笑场。",
      "现在对TA大声说三遍「我超爱你」。", "用最嗲的声音叫TA的名字十遍。",
      "对着镜子夸自己三句话，录下来发给TA。", "给TA发一段不超过15秒的可爱舞蹈。"
    ],
    punish: [
      "发一个红包给TA（金额你定）", "下次见面给TA按摩10分钟", "唱一首完整的歌录给TA",
      "写一篇200字的情书", "下次见面承包所有家务", "下次见面给TA做一顿饭",
      "给TA连续说10遍「我爱你」", "拍一张最丑的自拍发给TA",
      "下次见面请TA吃一顿大餐", "发一条朋友圈公开表白TA"
    ]
  },

  _renderTruthDare(container) {
    container.innerHTML = `
      <div class="game-page game-page-light">
        <div class="game-header">
          <button class="game-header-btn" onclick="GamePage.backToLobby()">←</button>
          <span class="game-header-title">真心话大冒险</span>
          <button class="game-header-btn" onclick="GamePage._tdAddCustom()">＋</button>
        </div>
        <div class="game-content" style="text-align:center;padding-top:16px">
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:22px">选择真心话或大冒险，不敢做就接受惩罚吧</p>

          <div id="td-card" class="td-card">
            <div class="td-empty">
              <div class="td-empty-icon">?</div>
              <div style="font-size:15px;color:var(--text-muted)">点击下方按钮开始</div>
            </div>
          </div>

          <div style="display:flex;gap:12px;margin-bottom:12px">
            <button class="td-btn td-btn-truth" onclick="GamePage._tdPick('truth')">
              <div class="td-btn-icon">?</div>
              <span>真心话</span>
            </button>
            <button class="td-btn td-btn-dare" onclick="GamePage._tdPick('dare')">
              <div class="td-btn-icon">!</div>
              <span>大冒险</span>
            </button>
          </div>
          <button class="td-punish-btn" onclick="GamePage._tdPick('punish')">
            不敢做，接受惩罚
          </button>
        </div>
      </div>
    `;
  },

  _tdPick(type) {
    SFX.flip();
    const labels = { truth: '真心话', dare: '大冒险', punish: '惩罚' };
    const colors = { truth: '#FF6B8A', dare: '#FF9F43', punish: '#666' };
    const themes = { truth: 'truth-theme', dare: 'dare-theme', punish: 'punish-theme' };
    const emojis = { truth: '?', dare: '!', punish: 'X' };
    const pool = this._tdPool[type];
    const item = pool[Math.floor(Math.random() * pool.length)];

    const card = document.getElementById('td-card');
    card.className = 'td-card ' + themes[type];
    card.innerHTML = `
      <div style="text-align:center">
        <div class="td-label" style="background:${colors[type]}">${emojis[type]} ${labels[type]}</div>
        <div class="td-text">${item}</div>
      </div>
    `;
    // 卡片弹入动画
    card.style.animation = 'none';
    card.offsetHeight;
    card.style.animation = 'bounceIn 0.5s cubic-bezier(0.16,1,0.3,1)';
  },

  _tdAddCustom() {
    SFX.tap();
    Components.showModal('添加题目', `
      <div class="input-group">
        <label class="input-label">类型</label>
        <select class="input" id="td-custom-type">
          <option value="truth">真心话</option><option value="dare">大冒险</option><option value="punish">惩罚</option>
        </select>
      </div>
      <div class="input-group">
        <label class="input-label">内容</label>
        <input class="input" id="td-custom-text" placeholder="输入题目内容...">
      </div>
    `, (overlay) => {
      const type = overlay.querySelector('#td-custom-type').value;
      const text = overlay.querySelector('#td-custom-text').value.trim();
      if (!text) { Utils.showToast('请输入内容'); return; }
      this._tdPool[type].push(text);
      overlay.remove();
      Utils.showToast('已添加');
    });
  },

  // ==================== 口算对战（联机+单人） ====================
  _mentalState: { mode: null, difficulty: null, roomCode: '', isHost: false, myScore: 0, oppScore: 0, round: 0, totalRounds: 10, answered: false, oppAnswered: false, question: null, answer: 0, input: '', oppReady: false, ready: false },

  _renderMental(container) {
    this._mentalState = { mode: null, difficulty: null, roomCode: '', isHost: false, myScore: 0, oppScore: 0, round: 0, totalRounds: 10, answered: false, oppAnswered: false, question: null, answer: 0, input: '', oppReady: false, ready: false };
    this._mentalShowLobby(container);
  },

  _mentalShowLobby(container) {
    container.innerHTML = `
      <div class="game-page game-page-light">
        <div class="game-header">
          <button class="game-header-btn" onclick="GamePage.backToLobby()">←</button>
          <span class="game-header-title">口算对战</span>
          <div style="width:36px"></div>
        </div>
        <div class="game-content" style="text-align:center">
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:20px">选难度和模式，比谁算得又快又准</p>

          <div class="math24-lobby-card">
            <div style="font-size:14px;margin-bottom:12px;font-weight:600;color:var(--text-secondary)">难度</div>
            <div style="display:flex;gap:10px;justify-content:center">
              <button class="mental-diff-btn" id="md-easy" onclick="GamePage._mentalSetDiff('easy')">📗 1-3年级<br><small>加减乘除</small></button>
              <button class="mental-diff-btn" id="md-hard" onclick="GamePage._mentalSetDiff('hard')">📕 4-6年级<br><small>混合运算</small></button>
            </div>
          </div>

          <div class="math24-lobby-card">
            <div style="font-size:14px;margin-bottom:12px;font-weight:600;color:var(--text-secondary)">题目数量</div>
            <div style="display:flex;gap:12px;justify-content:center;align-items:center">
              <button class="btn btn-ghost btn-sm" onclick="GamePage._mentalAdjustCount(-5)" style="border-radius:12px;width:44px;height:44px;font-size:20px">−</button>
              <input class="input" id="m-total-count" value="10" readonly style="width:70px;text-align:center;font-size:22px;font-weight:700;border-radius:14px;background:#F5F5FF;border:2px solid #E0E0F0">
              <button class="btn btn-ghost btn-sm" onclick="GamePage._mentalAdjustCount(5)" style="border-radius:12px;width:44px;height:44px;font-size:20px">＋</button>
            </div>
          </div>

          <div class="math24-lobby-card">
            <div style="font-size:14px;margin-bottom:12px;font-weight:600;color:var(--text-secondary)">模式</div>
            <div style="display:flex;gap:10px;justify-content:center">
              <button class="mental-mode-btn" id="mm-solo" onclick="GamePage._mentalSetMode('solo')">单人练习</button>
              <button class="mental-mode-btn" id="mm-online" onclick="GamePage._mentalSetMode('online')">联机对战</button>
            </div>
          </div>

          <div id="m-online-options" style="display:none">
            <button class="btn" onclick="GamePage._mentalCreate()" style="width:100%;margin-bottom:10px;padding:14px;border-radius:14px;background:linear-gradient(135deg,#6C5CE7,#5A4BD1);color:#fff;font-size:15px;font-weight:700;border:none;box-shadow:0 4px 16px rgba(108,92,231,0.3)">🏠 创建房间</button>
            <div style="display:flex;gap:10px;align-items:center">
              <input class="input" id="m-join-code" placeholder="4位房间号" maxlength="4" style="text-align:center;font-size:22px;letter-spacing:10px;border-radius:14px;font-weight:700">
              <button class="btn" onclick="GamePage._mentalJoin()" style="white-space:nowrap;padding:14px 24px;border-radius:14px;font-weight:600">加入</button>
            </div>
          </div>
          <button class="btn" id="m-solo-start" onclick="GamePage._mentalStartSolo()" style="display:none;width:100%;padding:14px;border-radius:14px;background:linear-gradient(135deg,#6C5CE7,#5A4BD1);color:#fff;font-size:15px;font-weight:700;border:none;box-shadow:0 4px 16px rgba(108,92,231,0.3)">🚀 开始练习</button>
        </div>
      </div>
    `;

    GameSync.on('mental_joined', () => {
      this._mentalState.oppReady = true;
      if (this._mentalState.isHost) this._mentalUpdateRoomInfo();
    });
    GameSync.on('mental_start', (data) => {
      this._mentalState.question = data.q;
      this._mentalState.answer = data.a;
      this._mentalState.round = 0;
      this._mentalState.myScore = 0;
      this._mentalState.oppScore = 0;
      this._mentalState.totalRounds = data.totalRounds || 10;
      this._mentalState.answered = false;
      this._mentalState.oppAnswered = false;
      this._mentalState.input = '';
      const container = document.getElementById('page-content') || document.getElementById('dashboard-content');
      this._mentalShowBattle(container);
    });
    GameSync.on('mental_answer', (data) => {
      if (this._mentalState.mode !== 'online') return;
      // 对方先答对了
      if (data.correct && !this._mentalState.answered) {
        this._mentalState.oppAnswered = true;
        this._mentalState.oppScore++;
        this._mentalUpdateScore();
        SFX.lose();
        const status = document.getElementById('m-opp-status');
        if (status) status.textContent = '你的伴侣先答一步 💡';
        const msg = document.getElementById('m-result-msg');
        if (msg) msg.textContent = 'TA答对了';
        this._mentalDisableInput();
        setTimeout(() => this._mentalNextQuestion(), 1800);
      }
    });
    GameSync.on('mental_next', (data) => {
      this._mentalState.question = data.q;
      this._mentalState.answer = data.a;
      this._mentalState.answered = false;
      this._mentalState.oppAnswered = false;
      this._mentalState.input = '';
      this._mentalState.round++;
      this._mentalUpdateBattle();
      this._mentalEnableInput();
    });
    GameSync.on('mental_end', (data) => {
      this._mentalShowResult(data.myScore, data.oppScore);
    });
  },

  _mentalAdjustCount(delta) {
    SFX.tap();
    const input = document.getElementById('m-total-count');
    if (!input) return;
    let v = parseInt(input.value) || 10;
    v = Math.max(5, Math.min(50, v + delta));
    input.value = v;
    this._mentalState.totalRounds = v;
  },

  _mentalSetMode(m) {
    SFX.tap();
    this._mentalState.mode = m;
    document.querySelectorAll('.mental-mode-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('mm-' + m)?.classList.add('active');
    document.getElementById('m-online-options').style.display = m === 'online' ? 'block' : 'none';
    document.getElementById('m-solo-start').style.display = m === 'solo' ? 'block' : 'none';
  },

  _mentalStartSolo() {
    SFX.tap();
    if (!this._mentalState.difficulty) { Utils.showToast('请先选择难度'); return; }
    this._mentalState.mode = 'solo';
    this._mentalState.round = 0;
    this._mentalState.myScore = 0;
    this._mentalState.answered = false;
    this._mentalState.input = '';
    const countInput = document.getElementById('m-total-count');
    this._mentalState.totalRounds = countInput ? (parseInt(countInput.value) || 10) : 10;
    const q = this._mentalGenQuestion();
    this._mentalState.question = q.q;
    this._mentalState.answer = q.a;
    const container = document.getElementById('page-content') || document.getElementById('dashboard-content');
    this._mentalShowBattle(container);
  },

  _mentalSetDiff(d) {
    SFX.tap();
    this._mentalState.difficulty = d;
    document.querySelectorAll('.mental-diff-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('md-' + d)?.classList.add('active');
  },

  _mentalCreate() {
    SFX.tap();
    if (!this._mentalState.difficulty) { Utils.showToast('请先选择难度'); return; }
    this._mentalState.isHost = true;
    this._mentalState.roomCode = String(Math.floor(1000 + Math.random() * 9000));
    this._mentalState.ready = true;
    const countInput = document.getElementById('m-total-count');
    this._mentalState.totalRounds = countInput ? (parseInt(countInput.value) || 10) : 10;
    this._mentalShowRoom();
  },

  _mentalJoin() {
    SFX.tap();
    if (!this._mentalState.difficulty) { Utils.showToast('请先选择难度'); return; }
    const code = document.getElementById('m-join-code').value.trim();
    if (code.length !== 4) { Utils.showToast('请输入4位房间号'); return; }
    this._mentalState.roomCode = code;
    this._mentalState.isHost = false;
    this._mentalState.ready = true;
    this._mentalShowRoom();
    GameSync.send('mental_joined', {});
  },

  _mentalShowRoom() {
    const container = document.getElementById('page-content') || document.getElementById('dashboard-content');
    if (!container) return;
    container.innerHTML = `
      <div class="game-page game-page-light">
        <div class="game-header">
          <button class="game-header-btn" onclick="GamePage._mentalShowLobby(document.getElementById('page-content')||document.getElementById('dashboard-content'))">←</button>
          <span class="game-header-title">口算对战</span>
          <div style="width:36px"></div>
        </div>
        <div class="game-content" style="text-align:center;padding-top:50px">
          <div style="font-size:56px;margin-bottom:12px">🏠</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px">房间号</div>
          <div style="font-size:44px;font-weight:800;letter-spacing:14px;margin-bottom:28px;color:#6C5CE7" id="m-room-code">${this._mentalState.roomCode}</div>
          <div id="m-room-status" style="font-size:15px;color:var(--text-muted);margin-bottom:28px;font-weight:500">
            ${this._mentalState.isHost ? '等待TA加入...' : '已加入房间，等待开始...'}
          </div>
          ${this._mentalState.isHost ? '<button class="btn" id="m-start-btn" onclick="GamePage._mentalStartBattle()" style="width:220px;padding:14px;border-radius:14px;background:linear-gradient(135deg,#6C5CE7,#5A4BD1);color:#fff;font-size:16px;font-weight:700;border:none;box-shadow:0 4px 16px rgba(108,92,231,0.3)" disabled>⚡ 开始对战</button>' : ''}
          <div style="margin-top:14px;font-size:12px;color:var(--text-muted)">难度：${this._mentalState.difficulty === 'easy' ? '1-3年级' : '4-6年级'} · 共${this._mentalState.totalRounds}题</div>
        </div>
      </div>
    `;
    if (this._mentalState.isHost && this._mentalState.oppReady) {
      document.getElementById('m-start-btn').disabled = false;
      document.getElementById('m-room-status').textContent = 'TA已加入，点击开始！';
    }
  },

  _mentalUpdateRoomInfo() {
    document.getElementById('m-room-status').textContent = 'TA已加入，点击开始！';
    const btn = document.getElementById('m-start-btn');
    if (btn) btn.disabled = false;
  },

  _mentalStartBattle() {
    SFX.tap();
    const q = this._mentalGenQuestion();
    this._mentalState.question = q.q;
    this._mentalState.answer = q.a;
    this._mentalState.round = 0;
    this._mentalState.myScore = 0;
    this._mentalState.oppScore = 0;
    this._mentalState.answered = false;
    this._mentalState.oppAnswered = false;
    this._mentalState.input = '';

    const container = document.getElementById('page-content') || document.getElementById('dashboard-content');
    this._mentalShowBattle(container);
    GameSync.send('mental_start', { q: q.q, a: q.a, totalRounds: this._mentalState.totalRounds });
  },

  _mentalGenQuestion() {
    const diff = this._mentalState.difficulty;
    let a, b, op, answer;
    if (diff === 'easy') {
      // 1-3年级：20以内加减法 + 表内乘法
      const r = Math.random();
      if (r < 0.35) { op = '+'; a = Math.floor(Math.random()*19)+1; b = Math.floor(Math.random()*(20-a))+1; answer = a+b; }
      else if (r < 0.7) { op = '−'; a = Math.floor(Math.random()*19)+2; b = Math.floor(Math.random()*a)+1; answer = a-b; }
      else { op = '×'; a = Math.floor(Math.random()*9)+1; b = Math.floor(Math.random()*9)+1; answer = a*b; }
    } else {
      // 4-6年级：混合运算
      const r = Math.random();
      if (r < 0.25) { op = '+'; a = Math.floor(Math.random()*90)+10; b = Math.floor(Math.random()*90)+10; answer = a+b; }
      else if (r < 0.5) { op = '−'; a = Math.floor(Math.random()*90)+20; b = Math.floor(Math.random()*a)+1; answer = a-b; }
      else if (r < 0.75) { op = '×'; a = Math.floor(Math.random()*20)+5; b = Math.floor(Math.random()*9)+2; answer = a*b; }
      else { op = '÷'; b = Math.floor(Math.random()*9)+2; answer = Math.floor(Math.random()*9)+2; a = answer * b; }
    }
    return { q: `${a} ${op} ${b} = ?`, a: answer, op };
  },

  _mentalShowBattle(container) {
    const solo = this._mentalState.mode === 'solo';
    const total = this._mentalState.totalRounds;
    container.innerHTML = `
      <div class="game-page game-page-light">
        <div class="game-header">
          <button class="game-header-btn" onclick="GamePage._mentalShowLobby(document.getElementById('page-content')||document.getElementById('dashboard-content'))">←</button>
          <span class="game-header-title">口算对战</span>
          <div style="width:36px"></div>
        </div>
        <div class="game-content" style="text-align:center">
          <div class="mental-score-bar">
            <span>得分 <b id="m-my-score" style="color:#6C5CE7;font-size:18px">0</b></span>
            <span class="divider">|</span>
            <span>第 <b id="m-round" style="font-size:16px">1</b>/${total} 题</span>
            ${solo ? '' : '<span class="divider">|</span><span>TA <b id="m-opp-score" style="color:#FF6B8A;font-size:18px">0</b></span>'}
          </div>
          ${solo ? '' : '<div id="m-opp-status"></div>'}

          <div id="m-question" style="white-space:nowrap">
            ${this._mentalState.question}
          </div>

          <div id="m-my-input">
            ${this._mentalState.input || '?'}
          </div>

          <div id="m-result-msg" style="min-height:28px;font-size:15px;margin-bottom:10px;font-weight:600"></div>

          <div class="m-numpad" id="m-numpad">
            ${[1,2,3,4,5,6,7,8,9,'C',0,'✓'].map(k => `
              <button class="m-num-btn ${k==='✓'?'m-submit':k==='C'?'m-clear':''}" onclick="GamePage._mentalInput('${k}')">${k}</button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  _mentalInput(key) {
    if (this._mentalState.answered || this._mentalState.oppAnswered) return;
    if (key !== '✓') SFX.tap();
    const solo = this._mentalState.mode === 'solo';
    if (key === 'C') { this._mentalState.input = ''; this._mentalUpdateBattle(); return; }
    if (key === '✓') {
      SFX.submit();
      const val = parseInt(this._mentalState.input);
      if (isNaN(val)) return;
      const correct = val === this._mentalState.answer;
      if (correct) {
        SFX.correct();
        this._mentalState.answered = true;
        this._mentalState.myScore++;
        this._mentalUpdateScore();
        const msg = document.getElementById('m-result-msg');
        if (msg) msg.textContent = solo ? '答对了！' : '你抢答成功！';
        this._mentalUpdateBattle();

        if (!solo) {
          // 联机：先答对，通知对方
          GameSync.send('mental_answer', { correct: true });
        }

        const roundComplete = this._mentalState.round >= this._mentalState.totalRounds - 1;
        if (roundComplete) {
          setTimeout(() => {
            if (!solo) GameSync.send('mental_end', { myScore: this._mentalState.myScore, oppScore: this._mentalState.oppScore });
            this._mentalShowResult(this._mentalState.myScore, this._mentalState.oppScore);
          }, 1500);
        } else {
          setTimeout(() => this._mentalNextQuestion(), 1200);
        }
      } else {
        SFX.wrong();
        document.getElementById('m-result-msg').textContent = '不对，再算算';
        this._mentalState.input = '';
        this._mentalUpdateBattle();
      }
      return;
    }
    if (this._mentalState.input.length < 5) this._mentalState.input += key;
    this._mentalUpdateBattle();
  },

  _mentalUpdateBattle() {
    const inputEl = document.getElementById('m-my-input');
    if (inputEl) inputEl.textContent = this._mentalState.input || '?';
  },

  _mentalUpdateScore() {
    const my = document.getElementById('m-my-score');
    if (my) my.textContent = this._mentalState.myScore;
    const opp = document.getElementById('m-opp-score');
    if (opp) opp.textContent = this._mentalState.oppScore;
  },

  _mentalDisableInput() {
    const pad = document.getElementById('m-numpad');
    if (pad) pad.style.pointerEvents = 'none';
    if (pad) pad.style.opacity = '0.6';
  },

  _mentalEnableInput() {
    const pad = document.getElementById('m-numpad');
    if (pad) { pad.style.pointerEvents = ''; pad.style.opacity = ''; }
  },

  _mentalNextQuestion() {
    if (this._mentalState.round >= this._mentalState.totalRounds - 1) return;
    this._mentalState.round++;
    this._mentalState.answered = false;
    this._mentalState.oppAnswered = false;
    this._mentalState.input = '';

    const q = this._mentalGenQuestion();
    this._mentalState.question = q.q;
    this._mentalState.answer = q.a;

    document.getElementById('m-question').textContent = q.q;
    document.getElementById('m-round').textContent = this._mentalState.round + 1;
    document.getElementById('m-my-input').textContent = '?';
    document.getElementById('m-result-msg').textContent = '';
    const oppStatus = document.getElementById('m-opp-status');
    if (oppStatus) oppStatus.textContent = '';
    this._mentalEnableInput();

    if (this._mentalState.mode !== 'solo' && this._mentalState.isHost) {
      GameSync.send('mental_next', { q: q.q, a: q.a });
    }
  },

  _mentalShowResult(myScore, oppScore) {
    SFX.finish(myScore > oppScore);
    const container = document.getElementById('page-content') || document.getElementById('dashboard-content');
    if (!container) return;
    const solo = this._mentalState.mode === 'solo';
    const total = this._mentalState.totalRounds;
    const rate = myScore / total;
    const winner = solo ? (rate >= 0.9 ? '🏆 天才！' : rate >= 0.7 ? '🎉 太棒了！' : rate >= 0.5 ? '👍 还不错！' : '💪 继续加油！')
      : (myScore > oppScore ? '🏆 你赢了！' : myScore < oppScore ? '😅 你输了' : '🤝 平局！');
    const emoji = solo ? (rate >= 0.9 ? '🌟' : rate >= 0.7 ? '🎉' : rate >= 0.5 ? '👍' : '💪') : (myScore > oppScore ? '🏆' : myScore < oppScore ? '😅' : '🤝');
    const bgColor = solo ? (rate >= 0.9 ? 'linear-gradient(135deg, #6C5CE7, #A29BFE)' : rate >= 0.7 ? 'linear-gradient(135deg, #00B894, #55EFC4)' : rate >= 0.5 ? 'linear-gradient(135deg, #FF9F43, #FECA57)' : 'linear-gradient(135deg, #636E72, #B2BEC3)')
      : (myScore > oppScore ? 'linear-gradient(135deg, #6C5CE7, #A29BFE)' : myScore < oppScore ? 'linear-gradient(135deg, #FF6B8A, #FFB8D0)' : 'linear-gradient(135deg, #636E72, #B2BEC3)');
    container.innerHTML = `
      <div class="game-page game-page-light">
        <div class="game-header">
          <button class="game-header-btn" onclick="GamePage._mentalShowLobby(document.getElementById('page-content')||document.getElementById('dashboard-content'))">←</button>
          <span class="game-header-title">口算对战</span>
          <div style="width:36px"></div>
        </div>
        <div class="game-content" style="text-align:center;padding-top:32px">
          <div style="width:80px;height:80px;border-radius:50%;background:${bgColor};display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:40px;box-shadow:0 8px 30px rgba(0,0,0,0.12)">${emoji}</div>
          <div style="font-size:22px;font-weight:800;margin-bottom:6px">${winner}</div>
          <div style="font-size:48px;font-weight:800;margin-bottom:6px;background:${bgColor};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${myScore} / ${total}</div>
          ${solo ? '<div style="font-size:14px;color:var(--text-muted);margin-bottom:28px">答对 ' + myScore + ' 题，正确率 ' + Math.round(rate*100) + '%</div>' : '<div style="font-size:16px;font-weight:600;margin-bottom:28px;color:var(--text-secondary)">你 <span style="color:#6C5CE7;font-size:20px">' + myScore + '</span> : <span style="color:#FF6B8A;font-size:20px">' + oppScore + '</span> TA</div>'}
          <button class="btn" onclick="GamePage._mentalShowLobby(document.getElementById('page-content')||document.getElementById('dashboard-content'))" style="width:220px;padding:14px;border-radius:16px;background:linear-gradient(135deg,#6C5CE7,#5A4BD1);color:#fff;font-size:16px;font-weight:700;border:none;box-shadow:0 4px 16px rgba(108,92,231,0.3);cursor:pointer">再来一局</button>
        </div>
      </div>
    `;
  }
};
