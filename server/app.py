# -*- coding: utf-8 -*-
"""
表达力训练器 本地后端(单文件,仅标准库 http.server + agent_gw + 可选 faster-whisper)。

- GET  /api/health     -> {"ok": true, "llm": bool, "asr": "ready"|"loading"|"unavailable"}
- POST /api/analyze    -> 调 kimi-for-coding 做质性分析;任何失败返回 HTTP 200 + {"ok": false}
- POST /api/transcribe -> 接收原始音频字节,ffmpeg 转 16kHz 单声道 wav 后 faster-whisper
                          转写(language="zh", word_timestamps=True, vad_filter=True);
                          返回 {"ok": true, "segments": [...], "words": [...]}
- 其余路径             -> 静态托管 dist/(SPA fallback 到 index.html)

启动:venv/Scripts/python.exe server/app.py   (绑定 127.0.0.1:8788)
鉴权:KIMI_API_KEY 环境变量,或 ~/.kimi/agent-gw.json;无 key 时 LLM 不可用,应用照常可跑。
ASR :需 pip install faster-whisper;模型默认 small,可用 WHISPER_MODEL 覆盖,
      缓存在项目 models/ 目录;模型不可用时 /api/transcribe 返回 ok:false,前端自动降级。
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT / "dist"
MODELS_DIR = ROOT / "models"
HOST = "127.0.0.1"
PORT = 8788
MODEL = "kimi-for-coding"
LLM_TIMEOUT = 90  # 秒
WHISPER_MODEL_NAME = os.environ.get("WHISPER_MODEL", "small")

DEFAULT_FFMPEG = (
    r"C:\Users\Administrator\AppData\Local\Programs\ffmpeg-chatcut\bin\ffmpeg.exe"
)


def find_ffmpeg() -> str | None:
    """env FFMPEG_PATH > 已知安装路径 > PATH。"""
    env = os.environ.get("FFMPEG_PATH")
    if env and Path(env).is_file():
        return env
    if Path(DEFAULT_FFMPEG).is_file():
        return DEFAULT_FFMPEG
    return shutil.which("ffmpeg")


FFMPEG = find_ffmpeg()

# ── LLM 提供方抽象 ──
# 优先级:
#   1. OpenAI 兼容接口:env AI_BASE_URL+AI_API_KEY+AI_MODEL(兼容 OPENAI_* 同名变量)
#   2. 配置文件 server/ai.config.json {"provider","base_url","api_key","model"}
#   3. Kimi agent-gw:KIMI_API_KEY 或 ~/.kimi/agent-gw.json 自动探测
#   4. 都没有 → 本地模式(llm:false,前端自动用启发式兜底)
import urllib.request

llm_client = None
llm_init_error = None
llm_lock = threading.Lock()
llm_provider = None  # "openai-compatible" | "kimi-agent-gw" | None
openai_cfg = None  # {"base_url","api_key","model"}
llm_source = None  # "env" | "file" | "agent-gw" | None

AI_CONFIG_PATH = ROOT / "server" / "ai.config.json"


def _load_ai_config_file() -> dict:
    if not AI_CONFIG_PATH.is_file():
        return {}
    try:
        return json.loads(AI_CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _apply_openai_config(base_url: str, api_key: str, model: str, source: str):
    global llm_provider, openai_cfg, llm_source, llm_init_error
    llm_provider = "openai-compatible"
    openai_cfg = {"base_url": base_url, "api_key": api_key, "model": model}
    llm_source = source
    llm_init_error = None


def _init_llm_provider():
    global llm_client, llm_init_error, llm_provider, llm_source

    env_base = os.environ.get("AI_BASE_URL") or os.environ.get("OPENAI_BASE_URL")
    env_key = os.environ.get("AI_API_KEY") or os.environ.get("OPENAI_API_KEY") or ""
    env_model = os.environ.get("AI_MODEL") or os.environ.get("OPENAI_MODEL")
    cfg = _load_ai_config_file()

    # 1. 环境变量(最高优先)
    if env_base and env_model:
        _apply_openai_config(env_base, env_key, env_model, "env")
        return

    # 2. 配置文件
    if cfg.get("provider") == "openai" and cfg.get("base_url") and cfg.get("model"):
        _apply_openai_config(
            str(cfg["base_url"]), str(cfg.get("api_key") or ""), str(cfg["model"]), "file"
        )
        return

    # 3. Kimi agent-gw(配置文件显式指定或自动探测)
    try:
        from agent_gw import AgentGwClient

        llm_client = AgentGwClient(timeout=LLM_TIMEOUT)
        llm_provider = "kimi-agent-gw"
        llm_source = "agent-gw"
    except Exception as exc:  # ValueError(无 key)、ImportError(未装 SDK)等
        llm_init_error = f"{type(exc).__name__}: {exc}"


_init_llm_provider()


def _openai_chat(messages: list, max_tokens: int) -> str:
    """标准库 urllib 调 OpenAI 兼容 /chat/completions;失败抛异常。
    优先带 response_format=json_object(DeepSeek 等支持,保证 JSON 合法);
    服务不支持(400)时自动降级重试不带。"""
    base = openai_cfg["base_url"].rstrip("/")
    if not base.endswith("/v1"):
        base += "/v1"
    url = base + "/chat/completions"

    def post(payload: dict) -> str:
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {openai_cfg['api_key']}",
            },
        )
        with urllib.request.urlopen(req, timeout=LLM_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"]

    payload = {"model": openai_cfg["model"], "messages": messages, "max_tokens": max_tokens}
    try:
        return post({**payload, "response_format": {"type": "json_object"}})
    except urllib.error.HTTPError as exc:
        if exc.code != 400:
            raise
        return post(payload)


def llm_chat(messages: list, max_tokens: int) -> str:
    """统一 LLM 调用入口,返回 content 字符串;无可用提供方或调用失败抛异常。"""
    if llm_provider == "openai-compatible":
        return _openai_chat(messages, max_tokens)
    if llm_provider == "kimi-agent-gw":
        with llm_lock:  # requests.Session 非严格线程安全
            resp = llm_client.chat_completion(
                model=MODEL, messages=messages, max_tokens=max_tokens
            )
        return resp["choices"][0]["message"]["content"]
    raise ValueError(f"llm unavailable: {llm_init_error or '未配置 AI 提供方'}")

# ── faster-whisper:可选组件,启动时后台线程预载模型 ──
whisper_model = None
whisper_error = None
asr_status = "unavailable"  # "loading" | "ready" | "unavailable"
whisper_lock = threading.Lock()
try:
    from faster_whisper import WhisperModel

    asr_status = "loading"
except Exception as exc:
    whisper_error = f"{type(exc).__name__}: {exc}"


def preload_whisper():
    global whisper_model, whisper_error, asr_status
    try:
        model = WhisperModel(
            WHISPER_MODEL_NAME,
            device="cpu",
            compute_type="int8",
            download_root=str(MODELS_DIR),
        )
        whisper_model = model
        asr_status = "ready"
    except Exception as exc:
        whisper_error = f"{type(exc).__name__}: {exc}"
        asr_status = "unavailable"


CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".map": "application/json; charset=utf-8",
}

SYSTEM_PROMPT = """你是一位严格而友善的口头表达教练,正在点评一段一分钟口头表达的文字稿。全部使用中文。

【输出格式】只输出一个 JSON 对象,不要输出 markdown 代码围栏以外的任何文字、解释或前后缀:
{"scores":{"viewpoint":int,"structure":int,"content":int,"fluency":int},
 "summary":"一句话诊断",
 "strengths":[{"title":"","description":"","suggestion":"","transcriptQuote":""}],
 "improvements":[{"title":"","description":"","suggestion":"","transcriptQuote":""}],
 "improvedOutline":["..."],
 "detectedStructure":""}

【评分锚点(0-100 整数,四个维度通用,含义按题型解释)】
- 90-100:可以直接讲给真实听众,只有瑕疵没有硬伤
- 75-89:主干成立,有 1-2 个明显可改之处
- 60-74:能听但明显粗糙,关键要素缺失或组织混乱
- 低于 60:内容空洞、离题、逻辑断裂或信息严重不足——该低就低,不要和稀泥

【数据一致性硬约束(我会提供准确的本地统计)】
- 口癖 ≥8 次 → fluency 不高于 70;≥15 次 → 不高于 60
- 核心观点/核心信息出现在 2/3 时长之后 → viewpoint 不高于 65;完全没出现 → 不高于 55
- 无例子也无数字 → content 不高于 70;空话套话密集 → 不高于 60
- 无明确结尾 → structure 不高于 70
- 语速低于 120 或高于 320 字/分钟 → fluency 不高于 65

【写法要求】
- summary 固定句式:先肯定一个真实优点,再指出最关键的一个问题,一两句话,80 字以内。
- strengths 恰好 2 条(做得最好的两点);improvements 恰好 2 条(最关键的问题,不要罗列一堆)。
- title 12 字以内;description 和 suggestion 各 60 字以内且必须具体。
- suggestion 必须可操作:说清具体怎么改;禁止"注意一下""多加练习"这类正确的废话。
- transcriptQuote 必须是用户文字稿的原文子串,逐字摘录,不要改写、不要补标点;找不到合适引用时给空字符串。
- improvedOutline 最多 5 条,每条 30 字以内,基于用户原有观点重组出更清晰的第二次提纲;不替用户换观点,不给完美范文。
- detectedStructure 从「观点—理由—例子—总结 / 问题—原因—解决办法 / 现象—分析—结论 / 背景—行动—结果 / 无明显结构」中选一个,或用不超过 12 个字简短描述。"""


# 题型化评判标准(维度名不变,但"观点"的含义按题型解释)
CATEGORY_RUBRICS = {
    "观点": "本题是观点表达题。观点维度评判:立场是否明确、一致、出现不过晚;内容维度看是否有理由+例子+个人判断。",
    "解释": "本题是概念解释题。观点维度评判:核心定义/结论是否尽早给出(\"这是什么\"),不评判立场;内容维度看是否通俗、有无类比和例子、有无术语堆砌;结构维度看\"是什么→为什么/怎么用→总结\"。",
    "工作": "本题是工作汇报/介绍题(含产品介绍)。观点维度评判:结论/核心信息是否先行,不评判立场;内容维度看是否有具体事实、数据、措施;结构维度看\"背景→问题→措施→结果\"。",
    "日常": "本题是日常话题题。观点维度评判:是否有明确的个人答案,不评判立场;内容维度看是否有具体经历和细节。",
    "申论": "本题是公共议题题。观点维度评判:是否有明确主张;内容维度看是否有现象分析+可行建议。",
}


def build_user_prompt(payload: dict) -> str:
    metrics = payload.get("metrics") or {}
    category = str(payload.get("category") or "通用")
    rubric = CATEGORY_RUBRICS.get(
        category,
        "按通用口头表达标准评判:核心信息明确、结构清晰、内容具体、表达流畅。",
    )
    lines = [
        f"题目:{payload.get('topic', '')}",
        f"题型:{category};场景:{payload.get('scenario', '')};受众:{payload.get('audience', '')}",
        f"表达时长:{payload.get('durationSeconds', '')} 秒",
        "",
        f"评判标准:{rubric}",
        "四个维度名称不变(观点/结构/内容/流畅度),但\"观点\"的含义必须按上述题型标准解释。",
        "summary 和 improvements 的措辞要贴题型:介绍/工作类谈\"核心信息是否讲清、信息是否具体\",不要谈\"立场是否明确\"。",
        "",
        "本地统计指标(已由程序准确计算,请采信):",
        f"- 总字数:{metrics.get('totalCharacters')}",
        f"- 平均语速:{metrics.get('wordsPerMinute')} 字/分钟",
        f"- 口癖总数:{metrics.get('fillerWordCount')} 次,高频口癖:{metrics.get('topFillers')}",
        f"- 核心观点首次出现:第 {metrics.get('viewpointFirstAppearedAt')} 秒(null 表示未检测到)",
        f"- 具体例子数量:{metrics.get('exampleCount')}",
        f"- 最长停顿:{metrics.get('longestPauseSeconds')} 秒",
        f"- 是否有明确结尾:{metrics.get('hasConclusion')}",
        "",
        "用户的文字稿(方括号内为大致时间):",
        payload.get("transcript", ""),
        "",
        "请开始点评,只输出 JSON。",
    ]
    return "\n".join(str(x) for x in lines)


def extract_json(text: str) -> dict:
    """健壮解析:剥离 ```json 围栏,截取第一个 { 到最后一个 },再 json.loads。"""
    cleaned = re.sub(r"```(?:json)?", "", text)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("LLM 输出中没有 JSON 对象")
    return json.loads(cleaned[start : end + 1])


def clamp_score(value) -> int:
    try:
        n = int(round(float(value)))
    except (TypeError, ValueError):
        n = 60
    return max(0, min(100, n))


def sanitize_feedback(items, kind: str) -> list:
    """校验并截断到 2 条;字段缺失的条目丢弃。"""
    if not isinstance(items, list):
        raise ValueError(f"{kind} 不是数组")
    out = []
    for item in items:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        description = str(item.get("description") or "").strip()
        suggestion = str(item.get("suggestion") or "").strip()
        if not title or not description:
            continue
        out.append(
            {
                "title": title,
                "description": description,
                "suggestion": suggestion,
                "transcriptQuote": str(item.get("transcriptQuote") or "").strip(),
            }
        )
        if len(out) >= 2:
            break
    if not out:
        raise ValueError(f"{kind} 没有有效条目")
    return out


def validate_result(data: dict) -> dict:
    if not isinstance(data, dict):
        raise ValueError("LLM 输出不是 JSON 对象")
    raw_scores = data.get("scores")
    if not isinstance(raw_scores, dict):
        raise ValueError("scores 缺失")
    scores = {
        key: clamp_score(raw_scores.get(key))
        for key in ("viewpoint", "structure", "content", "fluency")
    }
    summary = str(data.get("summary") or "").strip()
    if not summary:
        raise ValueError("summary 为空")
    outline = data.get("improvedOutline")
    if not isinstance(outline, list):
        raise ValueError("improvedOutline 不是数组")
    outline = [str(x).strip() for x in outline if str(x).strip()][:5]
    if len(outline) < 3:
        raise ValueError("improvedOutline 条目不足")
    return {
        "scores": scores,
        "summary": summary,
        "strengths": sanitize_feedback(data.get("strengths"), "strengths"),
        "improvements": sanitize_feedback(data.get("improvements"), "improvements"),
        "improvedOutline": outline,
        "detectedStructure": str(data.get("detectedStructure") or "无明显结构").strip()[:20],
    }


def call_llm(payload: dict) -> dict:
    """返回 {"ok": True, "result": ...} 或 {"ok": False, "reason": ...}。"""
    if llm_provider is None:
        return {"ok": False, "reason": f"llm unavailable: {llm_init_error or '未配置 AI 提供方'}"}
    started = time.time()
    try:
        # 非推理模型(DeepSeek 等)不需要为推理 token 预留大 max_tokens
        mt = 6000 if llm_provider == "kimi-agent-gw" else 2000
        content = llm_chat(
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_prompt(payload)},
            ],
            max_tokens=mt,
        )
        result = validate_result(extract_json(content))
        return {
            "ok": True,
            "result": result,
            "elapsedSeconds": round(time.time() - started, 1),
        }
    except Exception as exc:
        return {"ok": False, "reason": f"{type(exc).__name__}: {exc}"}


# ── faster-whisper 转写 ──

AUDIO_SUFFIXES = {
    "audio/webm": ".webm",
    "audio/mp4": ".mp4",
    "audio/m4a": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/ogg": ".ogg",
}


def transcribe_audio(raw: bytes, content_type: str) -> dict:
    """原始音频字节 -> {"ok": True, "segments": [...], "words": [...]} 或 ok:false。"""
    if asr_status == "loading":
        return {"ok": False, "reason": "asr loading: 模型仍在加载,请稍后重试"}
    if asr_status != "ready" or whisper_model is None:
        return {"ok": False, "reason": f"asr unavailable: {whisper_error}"}
    if FFMPEG is None:
        return {"ok": False, "reason": "ffmpeg 未找到"}
    if not raw:
        return {"ok": False, "reason": "音频为空"}

    suffix = AUDIO_SUFFIXES.get((content_type or "").split(";")[0].strip().lower(), ".bin")
    tmp_in = None
    tmp_wav = None
    started = time.time()
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
            f.write(raw)
            tmp_in = f.name
        tmp_wav = tmp_in + ".wav"
        # MediaRecorder 的 webm 常缺时长元数据,统一转 16kHz 单声道 wav 修正
        proc = subprocess.run(
            [FFMPEG, "-y", "-i", tmp_in, "-ar", "16000", "-ac", "1", "-f", "wav", tmp_wav],
            capture_output=True,
            timeout=120,
        )
        if proc.returncode != 0:
            return {"ok": False, "reason": f"ffmpeg 转换失败: {proc.stderr.decode('utf-8', 'ignore')[-200:]}"}

        with whisper_lock:
            segments_iter, _info = whisper_model.transcribe(
                tmp_wav,
                language="zh",
                word_timestamps=True,
                vad_filter=True,
            )
            segments = []
            words = []
            for seg in segments_iter:
                text = (seg.text or "").strip()
                if not text:
                    continue
                segments.append(
                    {
                        "start": round(float(seg.start), 2),
                        "end": round(float(seg.end), 2),
                        "text": text,
                    }
                )
                for w in seg.words or []:
                    word = (w.word or "").strip()
                    if not word:
                        continue
                    words.append(
                        {
                            "w": word,
                            "start": round(float(w.start), 2),
                            "end": round(float(w.end), 2),
                        }
                    )
        if not segments:
            return {"ok": False, "reason": "未识别到语音内容"}
        return {
            "ok": True,
            "segments": segments,
            "words": words,
            "elapsedSeconds": round(time.time() - started, 1),
        }
    except Exception as exc:
        return {"ok": False, "reason": f"{type(exc).__name__}: {exc}"}
    finally:
        for p in (tmp_in, tmp_wav):
            if p:
                try:
                    os.unlink(p)
                except OSError:
                    pass


PREP_HINTS_PROMPT = """你是一位口头表达教练。用户即将就一道题目做一分钟口头表达,请给出 3-4 条思考提示,帮助他在 15 秒内组织思路。
严格要求:
1. 只输出一个 JSON 数组,例如 ["提示一","提示二","提示三"],不要输出任何其他文字。
2. 每条提示不超过 30 字。
3. 提示只能是思考角度、提问或切入方向(例如"先想清楚:你见过努力但没回报的例子吗?")。
4. 严禁给出答案、立场、论点、提纲或演讲稿内容——不要替用户思考,只提醒他该想什么。
5. 结合题目类型与受众,提示要具体、有针对性,不要放之四海皆准的套话。
6. 每条尽量用提问形式,或以"先想清楚/先回忆/先确认"开头;不要写成指令或结论。"""

# prep-hints 内存缓存:同 topic+settings 不重复调 LLM
prep_hints_cache: dict = {}


def call_prep_hints(payload: dict) -> dict:
    if llm_provider is None:
        return {"ok": False, "reason": f"llm unavailable: {llm_init_error or '未配置 AI 提供方'}"}
    topic = str(payload.get("topic") or "").strip()
    if not topic:
        return {"ok": False, "reason": "topic 为空"}
    key = (
        topic,
        str(payload.get("category") or ""),
        str(payload.get("scenario") or ""),
        str(payload.get("audience") or ""),
    )
    if key in prep_hints_cache:
        return prep_hints_cache[key]
    user = (
        f"题目:{topic}\n题型:{key[1] or '通用'};场景:{key[2] or '汇报'};受众:{key[3] or '普通观众'}\n"
        "请给出思考提示,只输出 JSON 数组。"
    )
    try:
        content = llm_chat(
            [
                {"role": "system", "content": PREP_HINTS_PROMPT},
                {"role": "user", "content": user},
            ],
            max_tokens=2000 if llm_provider == "kimi-agent-gw" else 1000,
        )
        cleaned = re.sub(r"```(?:json)?", "", content)
        start = cleaned.find("[")
        end = cleaned.rfind("]")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("输出中没有 JSON 数组")
        hints = json.loads(cleaned[start : end + 1])
        if not isinstance(hints, list):
            raise ValueError("不是数组")
        hints = [str(h).strip()[:40] for h in hints if str(h).strip()][:4]
        if len(hints) < 3:
            raise ValueError("提示不足 3 条")
        result = {"ok": True, "hints": hints}
        prep_hints_cache[key] = result
        return result
    except Exception as exc:
        return {"ok": False, "reason": f"{type(exc).__name__}: {exc}"}


# ── AI 配置 API(界面内配置 key,运行时热切换,日志永不打印 key)──


def _mask_key(key: str) -> str | None:
    if not key:
        return None
    return f"…{key[-4:]}" if len(key) > 4 else "…"


def get_config_payload() -> dict:
    return {
        "ok": True,
        "provider": llm_provider,
        "source": llm_source,
        "base_url": openai_cfg["base_url"] if openai_cfg else None,
        "model": openai_cfg["model"] if openai_cfg else None,
        "key_tail": _mask_key(openai_cfg["api_key"]) if openai_cfg else None,
        "env_override": bool(
            (os.environ.get("AI_BASE_URL") or os.environ.get("OPENAI_BASE_URL"))
            and (os.environ.get("AI_MODEL") or os.environ.get("OPENAI_MODEL"))
        ),
    }


def save_config(payload: dict) -> dict:
    """写入 server/ai.config.json 并热切换 provider(不重启)。"""
    global llm_client, llm_init_error
    provider = str(payload.get("provider") or "openai")
    if provider == "kimi":
        try:
            from agent_gw import AgentGwClient

            llm_client = AgentGwClient(timeout=LLM_TIMEOUT)
            globals()["llm_provider"] = "kimi-agent-gw"
            globals()["llm_source"] = "agent-gw"
            llm_init_error = None
            prep_hints_cache.clear()
            return {"ok": True}
        except Exception as exc:
            return {"ok": False, "reason": f"agent-gw 不可用: {type(exc).__name__}: {exc}"}
    base_url = str(payload.get("base_url") or "").strip()
    api_key = str(payload.get("api_key") or "").strip()
    model = str(payload.get("model") or "").strip()
    if not base_url or not model:
        return {"ok": False, "reason": "base_url 和 model 必填"}
    if not api_key:
        # 没填新 key 时沿用已保存的(避免界面回显掩码覆盖真 key)
        api_key = (openai_cfg or {}).get("api_key", "")
    cfg = {"provider": "openai", "base_url": base_url, "api_key": api_key, "model": model}
    try:
        AI_CONFIG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as exc:
        return {"ok": False, "reason": f"写入配置失败: {exc}"}
    _apply_openai_config(base_url, api_key, model, "file")
    prep_hints_cache.clear()
    return {"ok": True}


def test_config(payload: dict) -> dict:
    """用传入(或已存)配置发最小请求,返回成败。不持久化任何内容。"""
    base_url = str(payload.get("base_url") or (openai_cfg or {}).get("base_url") or "").strip()
    api_key = str(payload.get("api_key") or (openai_cfg or {}).get("api_key") or "").strip()
    model = str(payload.get("model") or (openai_cfg or {}).get("model") or "").strip()
    if not base_url or not model:
        return {"ok": False, "reason": "请先填写 base_url 和 model"}
    base = base_url.rstrip("/")
    if not base.endswith("/v1"):
        base += "/v1"
    body = json.dumps(
        {
            "model": model,
            "messages": [{"role": "user", "content": "回复 JSON:{\"ok\":true}"}],
            "max_tokens": 50,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        base + "/chat/completions",
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        content = data["choices"][0]["message"]["content"]
        if not content:
            raise ValueError("返回内容为空")
        return {"ok": True, "model": model}
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8", "ignore")[:150]
        except Exception:
            pass
        return {"ok": False, "reason": f"HTTP {exc.code}: {detail or exc.reason}"}
    except Exception as exc:
        return {"ok": False, "reason": f"{type(exc).__name__}: {exc}"}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    # 转写耗时较长(CPU small 模型 60s 音频约 20-60s),读超时放宽
    timeout = 180

    def log_message(self, fmt, *args):  # noqa: A003
        sys.stderr.write("[server] %s %s\n" % (self.command, self.path))

    # ── helpers ──
    def send_json(self, obj, status: int = 200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 64 * 1024 * 1024:
            raise ValueError("请求体为空或过大")
        return self.rfile.read(length)

    # ── routes ──
    def do_GET(self):
        if self.path == "/api/health":
            self.send_json(
                {
                    "ok": True,
                    "llm": llm_provider is not None,
                    "provider": llm_provider,
                    "asr": asr_status,
                }
            )
            return
        if self.path == "/api/config":
            self.send_json(get_config_payload())
            return
        if self.path.startswith("/api/"):
            self.send_json({"ok": False, "reason": "not found"}, status=404)
            return
        self.serve_static()

    def do_POST(self):
        if self.path == "/api/analyze":
            try:
                payload = json.loads(self.read_body().decode("utf-8"))
            except Exception as exc:
                self.send_json({"ok": False, "reason": f"bad request: {exc}"})
                return
            if not str(payload.get("transcript") or "").strip():
                self.send_json({"ok": False, "reason": "transcript 为空"})
                return
            self.send_json(call_llm(payload))
            return
        if self.path == "/api/prep-hints":
            try:
                payload = json.loads(self.read_body().decode("utf-8"))
            except Exception as exc:
                self.send_json({"ok": False, "reason": f"bad request: {exc}"})
                return
            self.send_json(call_prep_hints(payload))
            return
        if self.path == "/api/config":
            try:
                payload = json.loads(self.read_body().decode("utf-8"))
            except Exception as exc:
                self.send_json({"ok": False, "reason": f"bad request: {exc}"})
                return
            self.send_json(save_config(payload))
            return
        if self.path == "/api/config/test":
            try:
                payload = json.loads(self.read_body().decode("utf-8"))
            except Exception as exc:
                self.send_json({"ok": False, "reason": f"bad request: {exc}"})
                return
            self.send_json(test_config(payload))
            return
        if self.path == "/api/transcribe":
            try:
                raw = self.read_body()
            except Exception as exc:
                self.send_json({"ok": False, "reason": f"bad request: {exc}"})
                return
            self.send_json(transcribe_audio(raw, self.headers.get("Content-Type") or ""))
            return
        self.send_json({"ok": False, "reason": "not found"}, status=404)

    # ── static / SPA ──
    def serve_static(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        if path == "/":
            path = "/index.html"
        candidate = (DIST_DIR / path.lstrip("/")).resolve()
        if not str(candidate).startswith(str(DIST_DIR.resolve())) or not candidate.is_file():
            candidate = DIST_DIR / "index.html"
            if not candidate.is_file():
                self.send_json(
                    {"ok": False, "reason": "dist/ 不存在,请先运行 npm run build"},
                    status=404,
                )
                return
        ctype = CONTENT_TYPES.get(candidate.suffix.lower(), "application/octet-stream")
        data = candidate.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main():
    if llm_provider == "openai-compatible":
        mode = f"LLM: OpenAI 兼容接口({openai_cfg['base_url']}, 模型 {openai_cfg['model']})"
    elif llm_provider == "kimi-agent-gw":
        mode = f"LLM: Kimi agent-gw({MODEL})"
    else:
        mode = f"LLM 不可用({llm_init_error}),本地启发式兜底"
    print(f"表达力训练器后端启动: http://{HOST}:{PORT}  [{mode}]", flush=True)
    print(f"ffmpeg: {FFMPEG or '未找到'}", flush=True)
    if asr_status == "loading":
        print(f"ASR: 后台加载 faster-whisper 模型 {WHISPER_MODEL_NAME} ...", flush=True)
        threading.Thread(target=preload_whisper, daemon=True).start()
    else:
        print(f"ASR 不可用: {whisper_error}", flush=True)
    if not DIST_DIR.is_dir():
        print("提示: dist/ 不存在,静态页面将 404;请先运行 npm run build", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
