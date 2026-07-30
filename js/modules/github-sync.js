/* ===== 【我们的恋爱小宇宙】GitHub 数据同步 ===== */
window.GitHubSync = {
  _config: null,
  _sha: null, // 当前文件 SHA（用于更新）
  _syncInProgress: false,

  get config() {
    if (!this._config) this._config = APP_CONFIG.github;
    return this._config;
  },

  _headers() {
    return {
      'Authorization': `token ${this.config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  },

  // 确保仓库和文件存在
  async initRepo() {
    const { owner, repo, dataFile, apiBase } = this.config;

    // 检查仓库是否存在，不存在则创建
    let resp = await fetch(`${apiBase}/repos/${owner}/${repo}`, {
      headers: this._headers()
    });

    if (resp.status === 404) {
      console.log('📦 创建私有仓库...');
      resp = await fetch(`${apiBase}/user/repos`, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify({
          name: repo,
          private: true,
          description: '恋爱小宇宙数据同步',
          auto_init: true
        })
      });
      if (!resp.ok) {
        console.error('创建仓库失败:', await resp.json());
        throw new Error('创建仓库失败');
      }
      console.log('✅ 仓库已创建');
    }

    // 获取 data.json 的 SHA
    resp = await fetch(`${apiBase}/repos/${owner}/${repo}/contents/${dataFile}`, {
      headers: this._headers()
    });

    if (resp.ok) {
      const item = await resp.json();
      this._sha = item.sha;
      const binary = atob(item.content);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoded = new TextDecoder('utf-8').decode(bytes);
      const data = JSON.parse(decoded);
      console.log('📥 已加载远程数据, version:', data._version || 0);
      return data;
    } else if (resp.status === 404) {
      console.log('📝 首次使用，创建初始数据');
      return null;
    } else {
      throw new Error(`读取仓库失败: ${resp.status}`);
    }
  },

  // 从 GitHub 拉取数据
  async pull() {
    if (this._syncInProgress) return null;
    this._syncInProgress = true;
    try {
      const { owner, repo, dataFile, apiBase } = this.config;
      const resp = await fetch(`${apiBase}/repos/${owner}/${repo}/contents/${dataFile}`, {
        headers: this._headers(),
        cache: 'no-store'
      });

      if (resp.status === 404) return null;
      if (!resp.ok) throw new Error(`拉取失败: ${resp.status}`);

      const item = await resp.json();
      this._sha = item.sha;
      // GitHub 返回 base64，用 Uint8Array 解码 utf-8
      const binary = atob(item.content);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoded = new TextDecoder('utf-8').decode(bytes);
      const data = JSON.parse(decoded);
      return data;
    } catch (e) {
      console.warn('GitHub pull 失败:', e.message);
      return null;
    } finally {
      this._syncInProgress = false;
    }
  },

  // 推送到 GitHub
  async push(data) {
    if (this._syncInProgress) return false;
    this._syncInProgress = true;
    try {
      const { owner, repo, dataFile, apiBase } = this.config;

      // 更新版本号
      data._version = (data._version || 0) + 1;
      data._updatedAt = new Date().toISOString();
      data._updatedBy = window.Auth ? Auth.getToken()?.substring(0, 8) : 'unknown';

      const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
      const body = {
        message: `💾 v${data._version} - ${data._updatedBy}`,
        content: content,
        branch: this.config.branch
      };

      if (this._sha) {
        body.sha = this._sha;
      }

      const resp = await fetch(`${apiBase}/repos/${owner}/${repo}/contents/${dataFile}`, {
        method: 'PUT',
        headers: this._headers(),
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const err = await resp.json();
        console.error('推送失败:', err);
        return false;
      }

      const result = await resp.json();
      this._sha = result.content.sha;
      console.log('✅ 已同步到 GitHub, v' + data._version);
      return true;
    } catch (e) {
      console.warn('GitHub push 失败:', e.message);
      return false;
    } finally {
      this._syncInProgress = false;
    }
  }
};
