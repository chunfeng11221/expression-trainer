@echo off
cd /d "%~dp0"
title 表达力训练器-手机联机

if not exist "dist\index.html" goto needinstall
if not exist "venv\Scripts\python.exe" goto needinstall

rem 用与服务端相同的逻辑探测本机局域网 IP
set LANIP=
for /f %%a in ('venv\Scripts\python.exe -c "import socket;s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);s.connect(('223.5.5.5',53));print(s.getsockname()[0]);s.close()"') do set LANIP=%%a
if not defined LANIP set LANIP=本机IP未知

curl -s --max-time 2 http://127.0.0.1:8788/api/health >nul 2>nul
if not errorlevel 1 (
  echo 检测到 8788 端口已有训练器服务在运行。
  echo 如果它是用"启动训练器.bat"启动的,只监听本机,手机会连不上。
  echo 请先关掉那个最小化的黑色服务窗口,再重新双击本脚本。
  echo.
  echo 手机浏览器试试打开: http://%LANIP%:8788
  pause
  exit /b 0
)

echo 正在以联机模式启动训练器^(会弹出一个最小化的黑色小窗口,请勿关闭^)……
set HOST=0.0.0.0
start "表达力训练器服务-联机(请勿关闭)" /min venv\Scripts\python.exe server\app.py

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
echo 把那个黑色小窗口里的内容拍下来,找懂技术的朋友看看。
timeout /t 5 >nul
exit /b 0

:ready
echo.
echo ================================================
echo  已启动!手机和电脑连同一个 Wi-Fi,然后用手机
echo  浏览器打开:
echo.
echo      http://%LANIP%:8788
echo.
echo  第一次启动如果弹出 Windows 防火墙提示,
echo  请选"允许访问"^(专用网络^),否则手机连不上。
echo ================================================
echo.
echo 本窗口可以关;那个最小化的黑色窗口要留着,关了训练器就停了。
pause
exit /b 0

:needinstall
echo 还没有安装过。请先双击"一键安装.bat",装完再来启动我。
pause
exit /b 1
