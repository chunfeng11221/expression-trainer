/**
 * 「表达课」概念卡数据。
 * 全部内容逐条出自黄执中表达课 44 节的蒸馏笔记
 * (.tools/huang-course/notes-表达课-上.md、notes-表达课-下.md),不杜撰。
 * source 用笔记里的视频讲次标注。
 */

export type CourseModule = '动机' | '听众' | '框架与衔接' | '核心句' | '杠点' | '好问题与具象' | '训练方法'

export interface CourseConcept {
  id: string
  module: CourseModule
  name: string
  /** 一句话讲清是什么 */
  oneLiner: string
  /** 一句可操作建议 */
  howToUse: string
  /** 出自哪一讲(笔记里的视频标题) */
  source: string
}

export const COURSE_MODULES: CourseModule[] = [
  '动机',
  '听众',
  '框架与衔接',
  '核心句',
  '杠点',
  '好问题与具象',
  '训练方法',
]

export const COURSE_CONCEPTS: CourseConcept[] = [
  // ── 动机 ──
  {
    id: 'motivation',
    module: '动机',
    name: '表达动机',
    oneLiner: '动机=我相信什么、我在意什么、我想改变什么;动机大于知识,大于技巧。',
    howToUse: '开口前先回答"我为什么非讲不可"——动机的爽感,是压过紧张痛感的唯一办法。',
    source: '视频3 · 动机:化解压力的根本解',
  },
  {
    id: 'self-interview',
    module: '动机',
    name: '自我访谈五问',
    oneLiner: '像记者采访自己:谁对我影响最大、什么让我真生气、想跟唱反调的人争什么、最惨痛的教训、我凭什么讲这些。',
    howToUse: '纸分两半,左边直接写看法,右边用五问重写——右边的素材会明显更多。',
    source: '视频4 · 自我访问五问:挖素材',
  },
  {
    id: 'motivation-outward',
    module: '动机',
    name: '动机向外推',
    oneLiner: '向内找是沉浸自我,越讲越窄;向外推是"这经历改变了我什么、能给你什么"。',
    howToUse: '每段经历讲完补一句"所以对你的意义是……",把故事推到听众那一边。',
    source: '视频4/7 · 动机向外推',
  },
  // ── 听众 ──
  {
    id: 'audience-purposes',
    module: '听众',
    name: '听众七大目的',
    oneLiner: '听众无非想学习、想获得启发、想得到乐趣、想看到你、想遇同好、想看新鲜事、想早点离开。',
    howToUse: '开口前先暗猜这场听众排前两位的是什么,表达要做"你想说"与"听众想听"的交集。',
    source: '视频8 · 听众七大目的',
  },
  {
    id: 'audience-adapt',
    module: '听众',
    name: '三种听众顺应',
    oneLiner: '不能满足所有人时找出真听众:权力顺应(顺有决定权的)、多数顺应(顺最大比例)、底层顺应(让最弱的也听懂)。',
    howToUse: '先问"这场谁说了算、谁占多数、谁最可能听不懂",再决定例子讲给谁听。',
    source: '视频9 · 听众顺应与引导预期',
  },
  // ── 框架与衔接 ──
  {
    id: 'framework-time',
    module: '框架与衔接',
    name: '过去—现在—未来',
    oneLiner: '即兴谈看法、致辞、感言的万能框架;过去问"为什么"(什么经历造就这感受),未来问"我希望"(希望听众如何行动)。',
    howToUse: '即兴题先定这三段,比例不必 1:1:1;曼德拉、乔布斯的名篇都是这个结构。',
    source: '视频13/16 · 三套自用框架、过去现在未来两问法',
  },
  {
    id: 'framework-umbrella',
    module: '框架与衔接',
    name: '空雨伞(背景→问题→方案)',
    oneLiner: '来自日本麦肯锡:先讲背景(空),再指问题(雨),再给方案(伞)。',
    howToUse: '可换序、可调比例;没有方案时,只讲背景或只分析问题也成立。',
    source: '视频13 · 三套自用框架',
  },
  {
    id: 'framework-3c',
    module: '框架与衔接',
    name: '3C(问题出现→有人觉得→但我觉得)',
    oneLiner: '源自大前研一:抛出问题,摆出"有人觉得"的社会共识,再用"但我觉得"形成鲜明对比。',
    howToUse: '"但我觉得"必须和"有人觉得"对着来,对照越强,说服力越倍。',
    source: '视频13 · 三套自用框架',
  },
  {
    id: 'transition',
    module: '框架与衔接',
    name: '衔接路标',
    oneLiner: '"刚才路过、此处位置、前方将要"三种路标;设问是最弹性的路标,停顿也是路标。',
    howToUse: '每换一点给听众一个路标;判断标准:听众跟上你的难度越高,跟上你的意愿就越低。',
    source: '视频14 · 衔接(路标)',
  },
  // ── 核心句 ──
  {
    id: 'core-filter',
    module: '核心句',
    name: '表达者的职责是筛选',
    oneLiner: '"知无不言、言无不尽"是偷懒;表达者要筛选信息,为听众的注意力负责。',
    howToUse: '写完稿子先删一轮:唱高调的、不用你说我也知道的、做不到的,先删。',
    source: '视频18 · 筛选信息,不是提供信息',
  },
  {
    id: 'core-sentence',
    module: '核心句',
    name: '核心句(找核心靠减法)',
    oneLiner: '"如果这个主题我只能讲一句话,那句话是什么?"找核心靠减法,不靠指定。',
    howToUse: '把要点逐条判"可剔除、可合并、排序较低",最后剩下的那句就是核心句。',
    source: '视频19 · 找核心靠减法,不靠指定',
  },
  // ── 杠点 ──
  {
    id: 'objection-selling',
    module: '杠点',
    name: '杠点即卖点',
    oneLiner: '质疑不是坏事,对抗是吸引元素;预测听众会在哪抬杠,主动说破、主动回应。',
    howToUse: '写提纲时列出三个最可能被抬杠的点,每点先想好一句回应。',
    source: '视频23 · 杠点同时也是卖点',
  },
  {
    id: 'claim-rebuttal',
    module: '杠点',
    name: '主张三要素与反驳三技巧',
    oneLiner: '主张=议题+结论+理由;反驳"A 是好的因为 A 造成 B":A 未必造成 B、没有 A 也有 B、B 不重要。',
    howToUse: '自检空话(逃避结论)与咏叹(只会重复结论);凡有意义的话都有可能错。',
    source: '视频24 · 主张与反驳',
  },
  // ── 好问题与具象 ──
  {
    id: 'good-question',
    module: '好问题与具象',
    name: '好问题四标准',
    oneLiner: '内容的价值来自"它是某个问题的答案";好问题要具体、被忽略、对听众有影响、能被解决。',
    howToUse: '开讲前先写下"我这段回答的是哪个问题",四标准符合任意两项即及格。',
    source: '视频27 · 内容价值来自"它是某个问题的答案"',
  },
  {
    id: 'concrete-thinking',
    module: '好问题与具象',
    name: '具象思考',
    oneLiner: '不用大词、不谈大道理、不迷恋大问题;两把手术刀:"具体指的是什么""不用这个词怎么描述"。',
    howToUse: '稿子里每个大词都问一遍"它具体指什么",答不上就换成具体的事。',
    source: '视频28 · 具象思考',
  },
  {
    id: 'concrete-expression',
    module: '好问题与具象',
    name: '具象表达',
    oneLiner: '用行为与场景代替形容与评论:"电影精彩"不如"出来爆米花还剩八分满"。',
    howToUse: '把稿子里的形容词圈出来,逐条改成一个动作或一个画面。',
    source: '视频29 · 具象表达',
  },
  // ── 训练方法 ──
  {
    id: 'practice-framework',
    module: '训练方法',
    name: '框架即兴练习',
    oneLiner: '随机抽题,用过去现在未来、空雨伞、3C 各讲一遍;卡住就用简单的元素倒逼剩下的元素。',
    howToUse: '框架要熟不要多,三套好过三十套——同一题换框架各练一遍,练到脱口而出。',
    source: '视频13 · 直播连麦即兴练习',
  },
  {
    id: 'practice-paper',
    module: '训练方法',
    name: '纸面二分练习',
    oneLiner: '纸分左右,左边写"我对 X 的看法",右边用自我访谈五问重写,对比两边的素材量。',
    howToUse: '觉得"没东西可讲"时做这个练习,右边的五问会逼出你忽略的经历。',
    source: '视频4 · 自我访问练习',
  },
]

export function getConceptById(id: string): CourseConcept | undefined {
  return COURSE_CONCEPTS.find((c) => c.id === id)
}
