@echo off
cd /d "%~dp0"
title 表达力训练器

if not exist "dist\index.html" (
  if exist "node_modules" if exist "venv\Scripts\python.exe" (
    echo 检测到网页文件缺失,正在自动重新构建……
    call npm run build
  )
)
if not exist "dist\index.html" goto needinstall
if not exist "venv\Scripts\python.exe" goto needinstall

curl -s --max-time 2 http://127.0.0.1:8788/api/health >nul 2>nul
if not errorlevel 1 (
  echo 训练器已经在运行了,直接帮你打开页面……
  start "" http://127.0.0.1:8788
  timeout /t 3 >nul
  exit /b 0
)

echo 正在启动训练器^(会弹出一个最小化的黑色小窗口,请勿关闭^)……
start "表达力训练器服务(请勿关闭)" /min venv\Scripts\python.exe server\app.py

set /a N=0
:wait
curl -s --max-time 2 http://127.0.0.1:8788/api/health >nul 2>nul
if not errorlevel 1 goto ready
set /a N+=1
if %N% geq 30 goto busy
timeout /t 1 >nul
goto wait

:busy
echo 等了 30 秒还没起来。可能是 8788 端口被别的程序占用了。
echo 先帮你打开页面看看——说不定其实已经启动了:
start "" http://127.0.0.1:8788
echo 如果页面打不开,把那个黑色小窗口里的内容拍下来,找懂技术的朋友看看。
timeout /t 5 >nul
exit /b 0

:ready
echo 已启动!浏览器即将打开 http://127.0.0.1:8788
echo 本窗口可以关;那个最小化的黑色窗口要留着,关了训练器就停了。
start "" http://127.0.0.1:8788
timeout /t 3 >nul
exit /b 0

:needinstall
echo 还没有安装过。请先双击"一键安装.bat",装完再来启动我。
pause
exit /b 1
