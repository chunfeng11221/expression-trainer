@echo off
cd /d "%~dp0"
title 表达力训练器 - 一键安装

echo ==========================================
echo   表达力训练器  一键安装
echo ==========================================
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo [缺少 Node.js]
  echo 请先去这里下载安装^(选 LTS 版,一路下一步^):
  echo   https://nodejs.org/zh-cn/download
  echo 装完后关掉这个窗口,重新双击"一键安装.bat"。
  pause
  exit /b 1
)
echo [1/6] Node.js 已找到

for /f "tokens=1 delims=v." %%v in ('node -v') do set NODEMAJOR=%%v
if %NODEMAJOR% lss 18 (
  echo [Node.js 版本太旧] 需要 18 或更新版本,你当前的是:
  node -v
  echo 请去 https://nodejs.org/zh-cn/download 下载新版 LTS,装完重试。
  pause
  exit /b 1
)

set PYEXE=
where py >nul 2>nul && py -3 --version >nul 2>nul && set PYEXE=py -3
if not defined PYEXE (
  where python >nul 2>nul && python --version >nul 2>nul && set PYEXE=python
)
if not defined PYEXE (
  where python3 >nul 2>nul && python3 --version >nul 2>nul && set PYEXE=python3
)
if not defined PYEXE (
  echo [缺少 Python]
  echo 请先去这里下载安装:
  echo   https://www.python.org/downloads/
  echo 安装时一定勾选 "Add python.exe to PATH"^(安装第一页底部^)!
  echo 注意:Windows 应用商店跳出来的"python"不是真 Python,别用它。
  echo 装完后关掉这个窗口,重新双击"一键安装.bat"。
  pause
  exit /b 1
)
echo [2/6] Python 已找到

echo [3/6] 安装网页依赖^(npm install,第一次要几分钟^)...
call npm install --registry=https://registry.npmmirror.com
if errorlevel 1 goto fail

echo [4/6] 创建 Python 环境并安装组件^(第一次较久^)...
if not exist "venv\Scripts\python.exe" (
  %PYEXE% -m venv venv
  if errorlevel 1 goto fail
) else (
  echo 检测到已有 Python 环境,跳过创建
)
venv\Scripts\python.exe -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple faster-whisper
if errorlevel 1 goto fail
venv\Scripts\python.exe -m pip install https://cdn.kimi.com/agentgw/pysdk/v0.2.6/agent_gw-0.2.6-py3-none-any.whl
if errorlevel 1 goto fail

echo [5/6] 下载语音识别模型^(约460MB,几分钟,只需下一次^)...
echo 如果卡在这里超过 10 分钟,可以按 Ctrl+C 再按 Y 跳过,以后首次录音时会自动重试。
set HF_ENDPOINT=https://hf-mirror.com
set HF_HUB_DISABLE_XET=1
venv\Scripts\python.exe -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8', download_root='models'); print('语音模型就绪')"
if errorlevel 1 (
  echo 模型这次没下成^(多是网络问题^)。不影响现在使用,首次录音转写时会自动重试。
)

echo [6/6] 构建网页...
call npm run build
if errorlevel 1 goto fail

echo.
echo ==========================================
echo   安装完成!以后每次用,双击"启动训练器.bat"即可
echo ==========================================
pause
exit /b 0

:fail
echo.
echo xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
echo   安装中断:往上翻,最后一行英文是原因。
echo   常见原因:网络不通^(换个网络重试^)、杀毒软件拦截。
echo xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
pause
exit /b 1
