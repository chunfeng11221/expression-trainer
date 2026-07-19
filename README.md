# 表达力训练器

给自己 1 分钟,把话说清楚。一道题 → 准备 15 秒 → 对着麦克风说 1 分钟 → AI 从观点/结构/内容/流畅度给出具体反馈 → 照着建议再说一次 → 看到前后对比。

<!-- 截图位置 -->

## 三步开始用(Windows)

> **不想装环境?** 去 [Releases](../../releases) 下载免安装版,解压双击即用。
>
> 装完之后怎么用、每个页面怎么看,见 **[使用指南.md](使用指南.md)**(完整操作流程)。

**① 双击 `一键安装.bat`**(只有第一次需要)
会自动装好所有组件,第一次要下载约 460MB 的语音识别模型,耐心等几分钟。中途如果提示"缺少 Node.js / Python",照着窗口里的地址装好再双击一次就行。

**② 双击 `启动训练器.bat`**
会弹出一个最小化的黑色小窗口(**别关,关了训练器就停了**),然后自动帮你打开浏览器页面。

**③ 在首页粘贴你的 API Key**
第一次打开时首页会有一张"接入 AI"卡片:默认选中 DeepSeek,粘贴 key → 点「保存并测试」→ 完成。
> 没有 key 也能直接练:点「随机开始」就能用,只是分析由本地规则完成,没有那么细致。

## API Key 从哪来

推荐 **DeepSeek**(便宜好用,充 5-10 块钱能练很久):

1. 打开 https://platform.deepseek.com/ 注册登录
2. 左侧「充值」充几块钱
3. 左侧「API keys」→ 创建,复制 `sk-` 开头的那串
4. 粘到首页卡片里,保存并测试

也支持 Moonshot、Kimi(agent-gw),或任何 OpenAI 兼容接口(设置页选"自定义"填地址和模型名,比如本地 Ollama 的 `http://localhost:11434/v1`)。key 保存在你自己电脑的 `server/ai.config.json`,不会上传。

## 常见问题

**Q:第一次用,语音识别模型要下载吗?**
安装脚本已经帮你下好了。如果当时网络不好没下成,会在第一次录音转写时自动重试;转写不了也能用浏览器实时字幕兜底,不影响练习。

**Q:实时字幕不出来?**
实时字幕用的是 Chrome/Edge 的浏览器能力。录音时没字幕不影响最终分析(分析靠本地 Whisper 模型)。建议把默认浏览器换成 Chrome 或 Edge。

**Q:Windows 防火墙弹窗?**
第一次启动服务时 Windows 可能问"是否允许 Python 访问网络",选「允许」即可(服务只监听本机 127.0.0.1,不对外开放)。

**Q:提示 8788 端口被占用?**
多半是训练器已经在跑了,直接在浏览器打开 http://127.0.0.1:8788 就行。

**Q:保存 key 时提示"余额不足"?**
去 DeepSeek 平台充几块钱再点一次「保存并测试」。提示"Key 不正确"则检查是否复制完整(以 sk- 开头,前后没有空格)。

**Q:安装卡在某一步怎么办?**
- 卡在 npm install / pip 安装:脚本已默认走国内镜像(npmmirror、清华 PyPI);还慢就换个网络(如手机热点)重试,重试是安全的,已装好的不会重复装。
- 卡在"下载语音识别模型":直接按 Ctrl+C 再按 Y 跳过,之后首次录音转写时会自动重试下载。
- 提示 Python 相关错误:通常是装 Python 时没勾"Add python.exe to PATH",卸载重装并勾选即可。

**Q:项目放在中文/带空格的路径下可以吗?**
可以,已兼容(比如 `D:\kimi code\`)。

**Q:不配 AI 能用到什么程度?**
录音、转写、口癖统计、基础评分、历史、进步表格全部可用;AI 只是让点评更细致、更贴题型。随时补配,key 即配即用不用重启。

## 开发者区

**技术栈**:Vite + React 19 + TypeScript + React Router(前端);Python 标准库 http.server 单文件后端 `server/app.py`(托管 `dist/` + API);faster-whisper 本地转写(词级时间戳);Web Speech API 实时字幕;LLM 走 OpenAI 兼容接口或 Kimi agent-gw。

**目录结构**:
```
一键安装.bat / 启动训练器.bat   小白入口
server/app.py                  后端(API + 静态托管)
server/ai.config.example.json  AI 配置示例(真实配置 ai.config.json 已 gitignore)
src/pages/  src/services/  src/utils/  src/components/  src/data/
```

**API 一览**(均 127.0.0.1:8788):

| 端点 | 说明 |
| --- | --- |
| `GET /api/health` | `{ok, llm, provider, asr}` |
| `GET /api/config` | 当前 AI 配置(key 只回末 4 位) |
| `POST /api/config` | 保存 AI 配置并热切换(不重启) |
| `POST /api/config/test` | 用传入/已存配置发最小请求测连通 |
| `POST /api/analyze` | 表达分析(带五类题型 rubric、分数锚点与数据硬约束) |
| `POST /api/prep-hints` | 准备阶段的针对性思考提示(服务端缓存) |
| `POST /api/transcribe` | faster-whisper 转写,返回分段 + 词级时间戳 |

**LLM 提供方优先级**(启动时):环境变量(`AI_*` 或 `OPENAI_*`)> `server/ai.config.json` > Kimi agent-gw 自动探测 > 本地模式。界面保存立即热切换生效,但重启后环境变量仍优先。

**本地模式**:无可用 AI 时,分析与提示静默降级为 `src/services/analysisService.ts` 的确定性启发式;录音、转写、历史、对比、进步表格全部不受影响。

**开发模式**:`npm run dev`(终端 1,/api 已 proxy 到 8788)+ `npm run server`(终端 2)。
