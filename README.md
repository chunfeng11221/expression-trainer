# 表达力训练器

一分钟口头表达训练:拿到题目 → 准备 15 秒 → 录音 1 分钟 → 语音转文字 → AI 分析口癖/观点/结构/内容 → 具体反馈 → 同题再说一次 → 对比两次变化。

## 启动(生产模式,单进程)

```bash
npm install
python -m venv venv
# faster-whisper 用于本地语音转写;agent_gw 仅在走 Kimi agent-gw 时才需要
venv/Scripts/python.exe -m pip install faster-whisper https://cdn.kimi.com/agentgw/pysdk/v0.2.6/agent_gw-0.2.6-py3-none-any.whl
npm run build
npm run server     # 启动 Python 后端,托管 dist/ + /api
```

浏览器打开 http://127.0.0.1:8788(`npm start` = build + server 一步完成)。

## 启动(开发模式)

```bash
npm run dev        # 终端 1:vite dev server,/api 已配置 proxy 到 8788
npm run server     # 终端 2:Python 后端
```

推荐使用 Chrome / Edge:录音(MediaRecorder)与实时转写(Web Speech API)依赖浏览器能力。

## 接入 AI(三种方式,任选其一;不配也能跑)

后端 `server/app.py` 的 LLM 提供方按优先级选择:**环境变量 > 配置文件 > Kimi agent-gw 自动探测 > 本地模式**。分析与思考提示两条调用共用同一抽象,prompt、缓存、失败降级行为不变。

**方式一:环境变量(OpenAI 兼容接口,推荐)**

任何兼容 OpenAI `/chat/completions` 的服务都能接(OpenAI、DeepSeek、Moonshot、通义、Ollama、LM Studio……)。支持 `AI_*` 或事实标准 `OPENAI_*` 变量名;`base_url` 末尾带不带 `/v1` 都可以。

```bash
# DeepSeek
export AI_BASE_URL=https://api.deepseek.com
export AI_API_KEY=sk-你的key
export AI_MODEL=deepseek-chat

# Moonshot(月之暗面)
export AI_BASE_URL=https://api.moonshot.cn/v1
export AI_API_KEY=sk-你的key
export AI_MODEL=moonshot-v1-8k

# OpenAI
export AI_BASE_URL=https://api.openai.com
export AI_API_KEY=sk-你的key
export AI_MODEL=gpt-4o-mini

# 本地 Ollama(api_key 任意填)
export AI_BASE_URL=http://localhost:11434/v1
export AI_API_KEY=ollama
export AI_MODEL=qwen2.5:7b
```

**方式二:配置文件(适合不会设环境变量的人)**

复制 `server/ai.config.example.json` 为 `server/ai.config.json`(已 gitignore,不会提交 key),改成你的服务:

```json
{"provider": "openai", "base_url": "https://api.deepseek.com", "api_key": "sk-你的key", "model": "deepseek-chat"}
```

`provider` 也可填 `"kimi"` 强制走 Kimi agent-gw。

**方式三:什么都不配(本地模式)**

没有可用 AI 时应用照常可用:分析与思考提示静默降级为本地启发式,录音、Whisper 转写、历史、对比、进步表格全部不受影响。Kimi agent-gw 用户仍可放 `~/.kimi/agent-gw.json` 或设 `KIMI_API_KEY`(自动探测,无需其他配置)。

接入后可通过 `GET /api/health` 确认:`provider` 字段为 `"openai-compatible"` / `"kimi-agent-gw"` / `null`。

## 架构:混合分析 + 双路转写(全部优雅降级)

**转写(两条路,自动选最优):**

1. 录音结束后,若后端 `/api/health` 显示 `asr: "ready"`,音频上传到 `POST /api/transcribe`,由 faster-whisper(默认 `small`,CPU/int8)转写,返回分段与**词级时间戳**——口癖时间、观点出现时间、最长停顿(相邻词间隙 >0.8s)全部用真实值。
2. Whisper 不可用/失败 → 回退浏览器 Web Speech 实时转写稿(录音时边说边显示的那套,意外 onend 自动重启)。
3. 再不行 → 内置 mock 文字稿(`src/data/mockAnalysis.ts`),流程始终可演示。

**分析(等待式,一次定稿):**

1. 确定性指标(字数、语速、口癖、停顿、观点时间)**永远本地算**,毫秒级。
2. 转写完成后进入"分析中"状态,等待 `POST /api/analyze`(kimi-for-coding,LLM 只出质性内容:四项评分、诊断、最好/最差两点、改进提纲)返回后**直接展示 AI 结果**(标记"AI 分析")。
3. LLM 失败/超时/无 key → 静默改用本地启发式结果再展示(标记"本地分析"),应用始终可用;不再有"先本地后 AI"的两段式展示。
4. `transcriptQuote` 若不是文字稿原文子串会被丢弃(保留条目)。

**配置:**

- LLM 接入:见上文"接入 AI"一节;无可用提供方时后端进入"本地模式",应用照常可用。
- Whisper 模型:默认 `small`,env `WHISPER_MODEL` 覆盖;缓存在项目 `models/`;模型下载慢可设 `HF_ENDPOINT=https://hf-mirror.com`。
- ffmpeg:env `FFMPEG_PATH` > 已知安装路径 > PATH(用于把 MediaRecorder 的 webm 转成 16kHz 单声道 wav)。

## 页面与数据

| 路由 | 说明 |
| --- | --- |
| `/` | 开始页(随机开始/选择题目,页脚有"训练历史 / 进步表格"入口) |
| `/topics` | 题库 46 道(日常/观点/工作/解释/申论,标注难度) |
| `/train` | 训练状态机:准备倒计时 → 录音 → 转写/分析 |
| `/result` | 分析结果(先本地后 AI 覆盖) |
| `/compare` | 同题两次回答对比 |
| `/history` | 训练历史列表(倒序,同组两次有"查看对比"入口) |
| `/history/:attemptId` | 历史详情(复用结果页组件,录音从 IndexedDB 回放,可删除单条) |
| `/history/compare/:sessionId` | 历史中的同题对比 |
| `/progress` | 表达力提升表格(摘要条/趋势折线/逐次记录带升降指示) |
| `/settings` | 回答时间/准备时间/场景/受众 |

**持久化:**

- localStorage:训练设置、当前 session、最近一次训练的两条 attempt、训练历史(上限 100 条,超出或写满配额时淘汰最旧)。
- IndexedDB(`expression-trainer/audio`):每条历史的录音 Blob,按条目 id 存取;删除历史条目时连带删除;自动淘汰的旧条目音频不主动清理(IndexedDB 配额独立,占用可忽略)。
- 内存:当前训练的音频(即时回放用)。

## 关键文件

| 位置 | 作用 |
| --- | --- |
| `server/app.py` | 后端:`/api/health`、`/api/analyze`、`/api/transcribe`、静态托管 dist/ |
| `src/services/aiAnalysisService.ts` | `analyzeLocal()`(毫秒级 baseline)+ `requestAiAnalysis()`(后台 LLM 覆盖合并) |
| `src/services/analysisService.ts` | 本地启发式分析;支持 Whisper 词级时间戳(口癖/观点/停顿真实值) |
| `src/services/transcriptionService.ts` | Web Speech 实时转写 + `checkAsrReady()`/`transcribeAudio()`(Whisper 上传) |
| `src/services/recordingService.ts` | MediaRecorder 录音 + AnalyserNode 音量电平 |
| `src/data/mockAnalysis.ts` | 转写全链路失败时的模拟文字稿(第一/第二次) |
| `src/utils/storage.ts` | settings/session/attempt 持久化 + 训练历史(100 条上限,配额淘汰) |
| `src/utils/audioStore.ts` | 录音 Blob 的 IndexedDB 存取(put/get/delete) |
| `src/components/ResultSections.tsx` | 结果内容区块,结果页与历史详情页共用 |
