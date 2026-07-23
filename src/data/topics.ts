import type { Topic } from '../types/training'

export const TOPICS: Topic[] = [
  // 日常
  { id: 'daily-1', title: '你最近改变过的一个习惯是什么?', category: '日常', difficulty: '简单' },
  { id: 'daily-2', title: '有什么东西被人们严重高估了?', category: '日常', difficulty: '普通' },
  { id: 'daily-3', title: '你做过最正确的一次放弃是什么?', category: '日常', difficulty: '普通' },
  { id: 'daily-4', title: '介绍一个你反复推荐给别人的工具或方法', category: '日常', difficulty: '简单' },
  { id: 'daily-5', title: '最近一次让你真心开心的小事是什么?', category: '日常', difficulty: '简单' },
  { id: 'daily-6', title: '如果能给一年前的自己一个建议,你会说什么?', category: '日常', difficulty: '普通' },
  { id: 'daily-7', title: '你最想养成但一直没养成的习惯是什么?', category: '日常', difficulty: '简单' },
  { id: 'daily-8', title: '你是怎么应对信息过载的?', category: '日常', difficulty: '普通' },
  { id: 'daily-9', title: '描述一个你愿意反复去的城市角落', category: '日常', difficulty: '简单' },
  { id: 'daily-10', title: '朋友向你倾诉烦恼,你会怎么回应?', category: '日常', difficulty: '普通' },
  { id: 'daily-11', title: '讲一次你解决棘手问题的经历', category: '日常', difficulty: '普通' },
  // 观点
  { id: 'opinion-1', title: '努力一定会带来回报吗?', category: '观点', difficulty: '普通' },
  { id: 'opinion-2', title: '一个人是否应该相信权威?', category: '观点', difficulty: '困难' },
  { id: 'opinion-3', title: '短视频是在传播知识,还是制造知识感?', category: '观点', difficulty: '困难' },
  { id: 'opinion-4', title: '独处是一种能力,还是一种逃避?', category: '观点', difficulty: '普通' },
  { id: 'opinion-5', title: '好运和实力,哪个更重要?', category: '观点', difficulty: '普通' },
  { id: 'opinion-6', title: '"稳定的工作"是在保护人,还是限制人?', category: '观点', difficulty: '困难' },
  { id: 'opinion-7', title: '要不要在意外界对你的评价?', category: '观点', difficulty: '普通' },
  { id: 'opinion-8', title: '人工智能会让人更聪明,还是更懒?', category: '观点', difficulty: '困难' },
  { id: 'opinion-9', title: '犯错应该被原谅吗?', category: '观点', difficulty: '普通' },
  { id: 'opinion-10', title: '过程重要,还是结果重要?', category: '观点', difficulty: '简单' },
  { id: 'opinion-11', title: '年轻人应该先攒钱,还是先投资自己?', category: '观点', difficulty: '普通' },
  { id: 'opinion-12', title: '"听话"是一种优点吗?', category: '观点', difficulty: '普通' },
  { id: 'opinion-13', title: '做事应该先做计划,还是先做起来再说?', category: '观点', difficulty: '简单' },
  // 工作
  { id: 'work-1', title: '向团队汇报一个项目延期', category: '工作', difficulty: '普通' },
  { id: 'work-13', title: '用一分钟向大家介绍"表达力训练器"这个产品', category: '工作', difficulty: '普通' },
  { id: 'work-2', title: '解释一次工作失误', category: '工作', difficulty: '困难' },
  { id: 'work-3', title: '向领导提出一个不同意见', category: '工作', difficulty: '困难' },
  { id: 'work-4', title: '汇报一个近期完成的项目', category: '工作', difficulty: '简单' },
  { id: 'work-5', title: '向领导申请更多资源支持你的项目', category: '工作', difficulty: '普通' },
  { id: 'work-6', title: '跨部门合作时对方不配合,你会怎么沟通?', category: '工作', difficulty: '困难' },
  { id: 'work-7', title: '在会议上即兴总结前一阶段的讨论', category: '工作', difficulty: '普通' },
  { id: 'work-8', title: '向新同事介绍你的岗位职责', category: '工作', difficulty: '简单' },
  { id: 'work-9', title: '拒绝一个不属于你职责范围的请求', category: '工作', difficulty: '困难' },
  { id: 'work-10', title: '汇报一个数据不达预期的结果', category: '工作', difficulty: '普通' },
  { id: 'work-11', title: '向客户解释一次线上事故的原因和处理结果', category: '工作', difficulty: '困难' },
  { id: 'work-12', title: '项目出问题后,在复盘会上说明情况', category: '工作', difficulty: '困难' },
  // 解释
  { id: 'explain-1', title: '向普通人解释什么是人工智能', category: '解释', difficulty: '普通' },
  { id: 'explain-2', title: '向小学生解释什么是通货膨胀', category: '解释', difficulty: '困难' },
  { id: 'explain-3', title: '解释为什么运动后体重可能暂时增加', category: '解释', difficulty: '普通' },
  { id: 'explain-4', title: '向长辈解释什么是移动支付', category: '解释', difficulty: '简单' },
  { id: 'explain-5', title: '向父母解释什么是"云存储"', category: '解释', difficulty: '简单' },
  { id: 'explain-6', title: '向初中生解释为什么天空是蓝色的', category: '解释', difficulty: '普通' },
  { id: 'explain-7', title: '向同事解释什么是"复利"', category: '解释', difficulty: '普通' },
  { id: 'explain-8', title: '向外国朋友解释中国人说的"人情"', category: '解释', difficulty: '困难' },
  { id: 'explain-9', title: '向小学生解释为什么我们要睡觉', category: '解释', difficulty: '简单' },
  { id: 'explain-10', title: '解释为什么越着急的时候越容易出错', category: '解释', difficulty: '普通' },
  { id: 'explain-11', title: '解释为什么手机用久了会变卡', category: '解释', difficulty: '简单' },
  { id: 'explain-12', title: '向小学生解释为什么会下雨', category: '解释', difficulty: '简单' },
  { id: 'explain-13', title: '解释为什么天气预报有时候会不准', category: '解释', difficulty: '普通' },
  { id: 'explain-14', title: '解释为什么人会一而再地拖延', category: '解释', difficulty: '普通' },
  { id: 'explain-15', title: '解释为什么路上没有事故也会堵车', category: '解释', difficulty: '困难' },
  { id: 'explain-16', title: '解释为什么同样的错误人会犯第二次', category: '解释', difficulty: '困难' },
  // 申论
  { id: 'essay-1', title: '如何改善年轻人的数字信息环境?', category: '申论', difficulty: '困难' },
  { id: 'essay-2', title: '人工智能会对普通劳动者产生哪些影响?', category: '申论', difficulty: '困难' },
  { id: 'essay-3', title: '如何看待城市公共空间商业化?', category: '申论', difficulty: '普通' },
  { id: 'essay-4', title: '谈谈你对"终身学习"的理解', category: '申论', difficulty: '普通' },
  { id: 'essay-5', title: '如何看待外卖骑手的时间被算法压缩?', category: '申论', difficulty: '困难' },
  { id: 'essay-6', title: '老旧小区加装电梯,低层住户不同意怎么办?', category: '申论', difficulty: '困难' },
  { id: 'essay-7', title: '谈谈"躺平"现象背后的社会原因', category: '申论', difficulty: '普通' },
  { id: 'essay-8', title: '博物馆免费开放,利大于弊吗?', category: '申论', difficulty: '普通' },
  { id: 'essay-9', title: '如何提升农村老人的数字生活质量?', category: '申论', difficulty: '困难' },
  { id: 'essay-10', title: '网络谣言为什么传播得快?应该怎么治理?', category: '申论', difficulty: '困难' },
  { id: 'essay-11', title: '老旧小区停车难,有什么解决办法?', category: '申论', difficulty: '普通' },
]

export const CATEGORIES = ['日常', '观点', '工作', '解释', '申论'] as const

/** 「随心记」模式的伪题目:不出题、不准备、不限时 */
export const FREE_TOPIC: Topic = {
  id: 'free',
  title: '随心记',
  category: '随心记',
  difficulty: '简单',
}

export function isFreeTopic(topic: Pick<Topic, 'id' | 'category'>): boolean {
  return topic.id === 'free' || topic.category === '随心记'
}

export function getTopicById(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id)
}

export function getRandomTopic(): Topic {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)]
}
