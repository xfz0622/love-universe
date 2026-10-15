/* ===== 【我们的恋爱小宇宙】GitHub 数据同步 ===== */
window.GitHubSync = {
  _config: null,
  _sha: null,
  _syncInProgress: false,
  _timeout: 15000, // 15秒超时（数据文件已3MB+，5秒在手机网络上不够）

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

  // 带超时的 fetch
  async _fetch(url, opts = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this._timeout);
    try {
      const resp = await fetch(url, { ...opts, signal: controller.signal });
      return resp;
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error('请求超时');
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  },

  // 读取数据文件（兼容大文件：>1MB 时 GitHub 不返回 base64 内容，需用 raw 方式二次读取）
  async _readFile(dataFile, noStore) {
    const { owner, repo, apiBase } = this.config;
    const url = `${apiBase}/repos/${owner}/${repo}/contents/${dataFile}`;
    const headers = noStore ? { ...this._headers(), 'cache-control': 'no-cache' } : this._headers();

    // 第一步：拿 sha + 元信息
    const resp = await this._fetch(url, { headers, cache: noStore ? 'no-store' : 'default' });
    if (resp.status === 404) return { sha: null, data: null };
    if (!resp.ok) throw new Error(`读取失败: ${resp.status}`);
    const item = await resp.json();
    const sha = item.sha;

    let text;
    if (item.encoding === 'base64' && item.content) {
      // 小文件：直接解 base64
      const binary = atob(item.content.replace(/\s/g, ''));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      text = new TextDecoder('utf-8').decode(bytes);
    } else {
      // 大文件（encoding=none）：改用 Git Blobs API 读取（支持到100MB，浏览器实测可靠）
      const blobResp = await this._fetch(`${apiBase}/repos/${owner}/${repo}/git/blobs/${sha}`, {
        headers: this._headers()
      });
      if (!blobResp.ok) throw new Error(`读取大文件失败: ${blobResp.status}`);
      const blob = await blobResp.json();
      const binary = atob((blob.content || '').replace(/\s/g, ''));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      text = new TextDecoder('utf-8').decode(bytes);
    }

    return { sha, data: JSON.parse(text) };
  },

  // 确保仓库和文件存在
  async initRepo() {
    const { owner, repo, dataFile, apiBase } = this.config;

    let resp = await this._fetch(`${apiBase}/repos/${owner}/${repo}`, {
      headers: this._headers()
    });

    if (resp.status === 404) {
      console.log('📦 创建私有仓库...');
      resp = await this._fetch(`${apiBase}/user/repos`, {
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

    const { sha, data } = await this._readFile(dataFile, false);
    this._sha = sha;
    if (data) {
      console.log('📥 已加载远程数据, version:', data._version || 0);
      return data;
    }
    console.log('📝 首次使用，创建初始数据');
    return null;
  },

  // 从 GitHub 拉取数据
  async pull() {
    if (this._syncInProgress) return null;
    this._syncInProgress = true;
    try {
      const { dataFile } = this.config;
      const { sha, data } = await this._readFile(dataFile, true);
      this._sha = sha;
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
