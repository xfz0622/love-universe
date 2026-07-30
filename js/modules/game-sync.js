/* ===== 【我们的恋爱小宇宙】Supabase 实时通信 ===== */
window.GameSync = {
  _supabase: null,
  _channel: null,
  _roomId: null,
  _listeners: {},

  get supabase() {
    if (!this._supabase) {
      if (typeof supabase === 'undefined') {
        console.error('Supabase SDK 未加载');
        return null;
      }
      this._supabase = supabase.createClient(
        APP_CONFIG.supabase.url,
        APP_CONFIG.supabase.anonKey
      );
    }
    return this._supabase;
  },

  // 加入游戏房间（用暗号 hash 作为房间ID）
  async joinRoom(roomId) {
    this._roomId = roomId;
    if (!this.supabase) return false;

    // 离开之前的频道
    if (this._channel) {
      await this._channel.unsubscribe();
    }

    // 创建新频道
    this._channel = this.supabase.channel(`game:${roomId}`, {
      config: { broadcast: { self: false } }
    });

    // 监听消息
    this._channel.on('broadcast', { event: 'game_action' }, (payload) => {
      const data = payload.payload;
      if (this._listeners[data.type]) {
        this._listeners[data.type].forEach(fn => fn(data));
      }
      if (this._listeners['*']) {
        this._listeners['*'].forEach(fn => fn(data));
      }
    });

    // 订阅
    const status = await this._channel.subscribe();
    console.log('🎮 已加入游戏房间:', roomId, status);
    return status === 'SUBSCRIBED';
  },

  // 发送游戏动作
  send(type, data = {}) {
    if (!this._channel) return false;
    this._channel.send({
      type: 'broadcast',
      event: 'game_action',
      payload: { type, ...data, from: this._getUserId(), time: Date.now() }
    });
    return true;
  },

  // 注册消息监听
  on(type, fn) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(fn);
  },

  // 移除监听
  off(type, fn) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(f => f !== fn);
  },

  // 离开房间
  async leaveRoom() {
    if (this._channel) {
      await this._channel.unsubscribe();
      this._channel = null;
    }
  },

  _getUserId() {
    return (window.Auth && Auth.getToken()) ? Auth.getToken().substring(0, 8) : 'unknown';
  }
};
