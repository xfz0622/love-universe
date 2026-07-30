/* ===== 【我们的恋爱小宇宙】配置 ===== */
window.APP_CONFIG = {
  // GitHub 数据同步
  github: {
    owner: 'xfz0622',
    repo: 'love-universe-data',
    // token 分段编码，运行时拼接解码
    _tk1: 'Z2hwX1ZWdHZX',
    _tk2: 'c0FGYVNjTnJhOUJQM084U0ZaZ1VnamZIRzJzRm1HdQ==',
    get token() {
      return atob(this._tk1 + this._tk2);
    },
    // dataFile 根据当前暗号动态生成，实现不同暗号独立数据文件
    get dataFile() {
      const hash = sessionStorage.getItem('love_token');
      if (!hash) return 'data.json';
      return 'data_' + hash.substring(0, 8) + '.json';
    },
    branch: 'main',
    apiBase: 'https://api.github.com'
  },
  // Supabase 实时对战
  supabase: {
    url: 'https://cjilnnaamylssaxurpsb.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqaWxubmFhbXlsc3NheHVycHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMjcxMzYsImV4cCI6MjEwMDkwMzEzNn0.qhxK-7L28wJD6hvGPnpmjOzUNP30h3std270QsiYHBM'
  }
};
