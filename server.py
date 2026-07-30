"""
【我们的恋爱小宇宙】共享后端服务
- 多暗号验证 + 暗号级数据隔离
- 每个暗号独立的数据空间
- 静态文件服务
"""

import json
import hashlib
import os
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="恋爱小宇宙 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"
PASSWORDS_FILE = DATA_DIR / "passwords.json"
STATIC_DIR = Path(__file__).parent
DEFAULT_PASSWORD = "20260717"

# ---- 暗号管理 ----
def load_passwords():
    if PASSWORDS_FILE.exists():
        try:
            with open(PASSWORDS_FILE, "r") as f:
                data = json.load(f)
            return data.get("passwords", {})
        except:
            pass
    default_hash = hashlib.sha256(DEFAULT_PASSWORD.encode()).hexdigest()
    return {"主人": {"hash": default_hash, "createdAt": "2026-07-17"}}

def save_passwords(passwords):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = str(PASSWORDS_FILE) + ".tmp"
    with open(tmp, "w") as f:
        json.dump({"passwords": passwords}, f, ensure_ascii=False, indent=2)
    os.replace(tmp, PASSWORDS_FILE)

def verify_password(input_pw: str) -> str | None:
    """验证暗号，返回对应的 hash（用于定位数据文件），失败返回 None"""
    passwords = load_passwords()
    input_hash = hashlib.sha256(input_pw.encode()).hexdigest()
    for name, data in passwords.items():
        if data["hash"] == input_hash:
            return input_hash
    return None

def get_data_file(pw_hash: str) -> Path:
    """根据暗号 hash 获取数据文件路径"""
    return DATA_DIR / f"data_{pw_hash[:12]}.json"

# ---- 从请求中提取用户身份 ----
def get_user_hash(req: Request) -> str:
    """从 Authorization header 中提取 token（即暗号 hash），用于定位数据文件"""
    auth = req.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        # token 就是 login 时返回的 hash
        return token
    raise HTTPException(status_code=401, detail="请先登录")

# ---- 数据读写 ----
def load_data(pw_hash: str):
    """加载指定暗号的数据文件"""
    data_file = get_data_file(pw_hash)
    if not data_file.exists():
        # 检查这个 hash 是否在密码表中（老用户数据文件丢失 vs 真正新用户）
        passwords = load_passwords()
        is_registered = any(d["hash"] == pw_hash for d in passwords.values())
        return {
            "version": 0,
            "_newUser": not is_registered,  # 只有真正的新用户才标记
            "_dataLost": is_registered      # 老用户数据文件丢失时标记
        }
    with open(data_file, "r") as f:
        return json.load(f)

def save_data(pw_hash: str, data: dict):
    """保存指定暗号的数据文件（原子写入）"""
    data_file = get_data_file(pw_hash)
    data_file.parent.mkdir(parents=True, exist_ok=True)
    data["version"] = data.get("version", 0) + 1
    tmp = str(data_file) + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, data_file)

# ---- API ----
@app.post("/api/auth")
async def login(req: Request):
    body = await req.json()
    password = body.get("password", "")
    pw_hash = verify_password(password)
    if pw_hash:
        # 读取该暗号的头像
        couple_photo = ""
        try:
            data = load_data(pw_hash)
            profile = data.get("profile", {})
            couple_photo = profile.get("couplePhoto", "")
        except:
            pass
        return {"ok": True, "token": pw_hash, "couplePhoto": couple_photo}
    raise HTTPException(status_code=401, detail="暗号不对哦，再试一次吧 💕")

@app.get("/api/passwords")
async def get_passwords():
    passwords = load_passwords()
    names = list(passwords.keys())
    return {"ok": True, "names": names, "count": len(names)}

@app.post("/api/passwords/register")
async def register_password(req: Request):
    """注册新暗号：新暗号 + 确认暗号"""
    body = await req.json()
    new_password = body.get("newPassword", "")
    confirm_password = body.get("confirmPassword", "")

    if not new_password or len(new_password) < 4:
        raise HTTPException(status_code=400, detail="新暗号至少需要4位")
    if confirm_password and new_password != confirm_password:
        raise HTTPException(status_code=400, detail="两次输入的暗号不一致")

    passwords = load_passwords()
    new_hash = hashlib.sha256(new_password.encode()).hexdigest()

    # 检查暗号是否重复
    for existing_name, data in passwords.items():
        if data["hash"] == new_hash:
            raise HTTPException(status_code=400, detail=f"这个暗号已经被「{existing_name}」使用了，换一个吧")

    # 用暗号本身作为名字（用户不需要额外起名）
    passwords[new_password] = {"hash": new_hash, "createdAt": time.strftime("%Y-%m-%d")}
    save_passwords(passwords)
    return {"ok": True, "message": "新暗号注册成功！"}

@app.post("/api/passwords/change")
async def change_password(req: Request):
    body = await req.json()
    old_password = body.get("oldPassword", "")
    new_password = body.get("newPassword", "")

    old_hash = verify_password(old_password)
    if not old_hash:
        raise HTTPException(status_code=403, detail="旧暗号不正确")
    if not new_password or len(new_password) < 4:
        raise HTTPException(status_code=400, detail="新暗号至少需要4位")

    passwords = load_passwords()
    new_hash = hashlib.sha256(new_password.encode()).hexdigest()

    # 找到旧暗号对应的记录
    matched_name = None
    for n, d in passwords.items():
        if d["hash"] == old_hash:
            matched_name = n
            break

    if not matched_name:
        raise HTTPException(status_code=400, detail="找不到这个暗号")

    # 检查新暗号是否重复
    for n, d in passwords.items():
        if n != matched_name and d["hash"] == new_hash:
            raise HTTPException(status_code=400, detail=f"这个暗号已经被「{n}」使用了，换一个吧")

    # 更新暗号 hash
    passwords[matched_name]["hash"] = new_hash
    save_passwords(passwords)

    # 迁移数据文件（旧 hash → 新 hash）
    old_file = get_data_file(old_hash)
    new_file = get_data_file(new_hash)
    if old_file.exists():
        os.replace(str(old_file), str(new_file))

    return {"ok": True, "message": "暗号修改成功！"}

@app.get("/api/data")
async def get_data(req: Request):
    pw_hash = get_user_hash(req)
    data = load_data(pw_hash)
    is_new = data.pop("_newUser", False)
    is_data_lost = data.pop("_dataLost", False)
    return JSONResponse({
        "ok": True,
        "version": data.get("version", 0),
        "data": data,
        "isNewUser": is_new,
        "isDataLost": is_data_lost
    })

@app.post("/api/sync")
async def sync_data(req: Request):
    pw_hash = get_user_hash(req)
    body = await req.json()
    local_version = body.get("version", 0)
    local_data = body.get("data", {})

    server_data = load_data(pw_hash)
    server_version = server_data.get("version", 0)

    if local_version > 0 and local_version < server_version:
        return JSONResponse({
            "ok": True,
            "merged": True,
            "version": server_version,
            "data": server_data,
            "message": "已同步TA的最新更新"
        })

    local_data["version"] = max(server_version, local_version) + 1
    save_data(pw_hash, local_data)

    return JSONResponse({
        "ok": True,
        "merged": False,
        "version": local_data["version"],
        "message": "保存成功"
    })

@app.get("/api/check-update")
async def check_update(req: Request, version: int = 0):
    pw_hash = get_user_hash(req)
    server_data = load_data(pw_hash)
    server_version = server_data.get("version", 0)
    if server_version > version:
        return JSONResponse({"updated": True, "version": server_version})
    return JSONResponse({"updated": False, "version": server_version})

# ---- 静态文件 ----
@app.get("/")
async def index():
    return FileResponse(STATIC_DIR / "index.html")

@app.get("/manifest.json")
async def manifest():
    return FileResponse(STATIC_DIR / "manifest.json")

@app.get("/sw.js")
async def service_worker():
    return FileResponse(STATIC_DIR / "sw.js")

app.mount("/css", StaticFiles(directory=STATIC_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=STATIC_DIR / "js"), name="js")
app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

if __name__ == "__main__":
    passwords = load_passwords()
    print(f"✨ 我们的恋爱小宇宙 API 启动中...")
    print(f"   已注册暗号: {len(passwords)}个 — {', '.join(passwords.keys())}")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
