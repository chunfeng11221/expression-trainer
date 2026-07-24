package com.expressiontrainer.app;

import com.getcapacitor.BridgeActivity;

/**
 * 麦克风授权说明(录音的关键路径):
 * WebView 里 getUserMedia 会触发 WebChromeClient.onPermissionRequest。
 * Capacitor 8 默认装的 BridgeWebChromeClient 已经处理了这个回调——
 * 对 AUDIO_CAPTURE 请求先弹系统级 RECORD_AUDIO 运行时授权,通过后 grant 给 WebView。
 * 因此这里不需要自定义 WebChromeClient(覆盖了反而会弄丢文件选择等框架行为),
 * 前提仅仅是 AndroidManifest.xml 里声明了 RECORD_AUDIO(已声明)。
 */
public class MainActivity extends BridgeActivity {}
