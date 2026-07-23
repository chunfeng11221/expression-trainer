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
  // 公考面试(题干抄自真实面试资料蒸馏的精选题;带"……"提取缺损的题未收录)
  { id: 'gk-1', title: '现在人工智能发展迅速,你怎么看?', category: '公考面试', difficulty: '简单', subtype: '社会现象' },
  { id: 'gk-2', title: '2025年春晚,国产机器人与人共舞、惊艳世界,对此你怎么看?', category: '公考面试', difficulty: '简单', subtype: '社会现象' },
  { id: 'gk-3', title: '近期,"脆皮年轻人"成为网络热词,意指那些看似健康却容易突然受伤或生病的年轻群体。对于此事件网上有很多人都表示当下的年轻人太矫情了。对此,你怎么看?', category: '公考面试', difficulty: '简单', subtype: '社会现象' },
  { id: 'gk-4', title: '如今,"零工经济"蓬勃发展,越来越多的人选择通过兼职、自由职业等零工方式就业,像外卖骑手、网约车司机、自媒体创作者等。对于"零工经济"这一现象,你怎么看?', category: '公考面试', difficulty: '普通', subtype: '社会现象' },
  { id: 'gk-5', title: '近日,武大某研究生考上嘉峪关选调生后,因为不满分配,自身又难以忍受基层工作环境,在网上发文吐槽嘉峪关,并选择离职,引发网友热议。对此,你怎么看?', category: '公考面试', difficulty: '普通', subtype: '社会现象' },
  { id: 'gk-6', title: '"鸡排哥"靠6元鸡排搭配600元情绪价值出圈,"尧仔炒粉"因放弃黄金时段流量,专程为受伤顾客制作炒粉而走红,晓华理发店、开封"王婆说媒"也曾风靡一时,他们开启了"一个人点燃一座城"新模式,为当地带来显著文旅效益,对此,请谈谈你的认识。', category: '公考面试', difficulty: '普通', subtype: '社会现象' },
  { id: 'gk-7', title: '某地政府出台政策,对生育二孩、三孩的家庭给予购房补贴,以鼓励生育,缓解人口老龄化问题,对此,你怎么看?', category: '公考面试', difficulty: '普通', subtype: '社会现象' },
  { id: 'gk-8', title: '近期,多地推行"社区嵌入式服务设施建设",将养老、托育、社区食堂等融入居民日常生活圈。有人支持"小而美"的社区服务,也有人认为"麻雀虽小五脏俱全"难以实现。对此,你怎么看?', category: '公考面试', difficulty: '普通', subtype: '社会现象' },
  { id: 'gk-9', title: '为进一步推进"无废城市"建设,促进垃圾分类全面落地,某地推行了"垃圾定时定点"投放的工作。但一段时间以后,上班族普遍反映投放时间与通勤冲突,小区垃圾堆积现象时有发生。对此,你怎么看?', category: '公考面试', difficulty: '普通', subtype: '社会现象' },
  { id: 'gk-10', title: '《中共中央关于制定国民经济和社会发展第十五个五年规划的建议》提出,要综合整治"内卷式"竞争,并提出反"内卷"根本在于强"创新"的理解。对此谈一谈你的理解?', category: '公考面试', difficulty: '困难', subtype: '社会现象' },
  { id: 'gk-11', title: '近期,各地频发大火,森林和草原成为了易发火灾的地方,这对当地群众人身安全和财产带来了很大影响。县政府安排你到村子里驻村防火,你会怎么开展工作?', category: '公考面试', difficulty: '普通', subtype: '计划组织' },
  { id: 'gk-12', title: '我市支持贫困地区发展,与一些省市形成对口帮扶。帮扶地区有特色茶叶、水果、蔬菜等需要对外销售,准备在我市范围内开展展销。该活动由你负责,你会如何开展?', category: '公考面试', difficulty: '普通', subtype: '计划组织' },
  { id: 'gk-13', title: '《关于进一步规范建筑施工企业用工年龄管理的通知》要求:禁止以任何形式招录或使用60周岁以上男性、50周岁以上女性人员,进入施工现场从事建筑施工作业,但是仍有违规情况。主管部门要组织全区专项整治,如果交给你负责,你如果组织?', category: '公考面试', difficulty: '困难', subtype: '计划组织' },
  { id: 'gk-14', title: '市里有一个新建成的采摘园项目,集采摘、观光、研学为一体,十一黄金周来临之际,领导安排你负责开园工作。你准备如何组织?', category: '公考面试', difficulty: '普通', subtype: '计划组织' },
  { id: 'gk-15', title: '县里要举行"乡村数字化治理"典型征集活动。领导让你起草通知,通知重点包括几个部分?', category: '公考面试', difficulty: '困难', subtype: '计划组织' },
  { id: 'gk-16', title: '近期,乌海市海勃湾区海北街道黄河社区推出"出摊办公"服务模式,将社区服务从窗口延伸至居民小区,解决群众办事难题。领导安排你带领辖区内各社区负责人到该社区进行考察学习,你会如何组织?', category: '公考面试', difficulty: '简单', subtype: '计划组织' },
  { id: 'gk-17', title: '近期,某市地铁APP因在乘车码页面设置"摇一摇"广告引发争议。乘客反映在通勤高峰扫码过闸时,因手机轻微晃动便跳转至广告页面,严重阻碍通行效率,舆论批评此举将公共服务场景变为"流量猎场"。若你是市交通部门工作人员,领导要求你策划一次公共服务类APP用户体验优化专项行动,请谈谈你的工作思路。', category: '公考面试', difficulty: '普通', subtype: '计划组织' },
  { id: 'gk-18', title: '近期,一些"伪科普"短视频在网络泛滥,严重误导了公众。为响应国家关于规范医疗科普的号召,你市卫健委计划开展一场以"辨识真科普,健康不迷路"为主题的宣传周活动。如果领导将此项工作交给你来负责,你会如何组织?', category: '公考面试', difficulty: '普通', subtype: '计划组织' },
  { id: 'gk-19', title: '某村樱桃受疫情影响严重滞销,没人采摘。假如你是村干部,你会怎么做?', category: '公考面试', difficulty: '普通', subtype: '应急应变' },
  { id: 'gk-20', title: '作为市场监督管理局工作人员,有群众举报在网上买裤子,商家承诺五星好评返还10元现金,但实际返还的是满60减10元的代金券,你会怎么处理?', category: '公考面试', difficulty: '普通', subtype: '应急应变' },
  { id: 'gk-21', title: '某省红十字会,把爱心人士捐赠的N95口罩,拨给了某民营医院,引起网友热议,领导让你负责调查、处理。请问你怎么办?', category: '公考面试', difficulty: '困难', subtype: '应急应变' },
  { id: 'gk-22', title: '你是社区工作人员,现在社区里面60岁以上的老人,对于接种疫苗持有抵触情绪,担心疫苗的副作用。如果你是工作人员,你将怎么劝说,请现场模拟。', category: '公考面试', difficulty: '困难', subtype: '情景模拟' },
  { id: 'gk-23', title: '在团队协作中,"鞭打快牛"现象普遍存在:效率高的成员往往承担超额任务,而进度迟缓者工作量却相对轻松。这种分配失衡不仅影响个体积极性,更可能损害团队整体效能。你如何看待这一现象?', category: '公考面试', difficulty: '普通', subtype: '人际关系' },
  { id: 'gk-24', title: '夯苗,也被称为"蹲苗",是一种农业管理技术。主要就是控制水,控制肥,抑制生长,促使根系向下生长。有人说干部人才的培养,也要做好"蹲苗",请你谈谈你的看法?', category: '公考面试', difficulty: '普通', subtype: '态度观点' },
  { id: 'gk-25', title: '习总书记强调的青年干部的7种能力,包括政治能力、调查研究能力、科学决策能力、改革攻坚能力、应急处突能力、群众工作能力、抓落实能力。你认为哪个最重要?', category: '公考面试', difficulty: '普通', subtype: '态度观点' },
  { id: 'gk-26', title: '破窗理论认为,如果有人打坏了一个建筑物的窗户玻璃,而这扇窗户又得不到及时的维修,别人就可能受到某些暗示性的纵容去打烂更多的窗户玻璃。这给你的工作带来哪些启示?', category: '公考面试', difficulty: '普通', subtype: '其他' },
  { id: 'gk-27', title: '做工作就像过河,船和桥就是方法。谈谈你认为什么是好的工作方法?', category: '公考面试', difficulty: '普通', subtype: '态度观点' },
  { id: 'gk-28', title: '请结合基层工作实际,阐述你对"既要治标,更要治本"这一工作方法的理解。', category: '公考面试', difficulty: '普通', subtype: '态度观点' },
  { id: 'gk-29', title: '2024年,这个陆域面积仅占全国1.1%的沿海省份,创造了全国6.5%的生产总值,人均GDP突破12万元,城乡居民收入分别连续22年和38年居全国各省区首位。这给你什么启示?', category: '公考面试', difficulty: '普通', subtype: '其他' },
  { id: 'gk-30', title: '结合漫画谈谈你的理解。(漫画:一位将军跪在地上,围绕一支插在墙上的箭矢,一圈一圈画出箭靶)', category: '公考面试', difficulty: '困难', subtype: '其他' },
  { id: 'gk-31', title: '领导人要求:要把红色基因传承下去,确保红色江山后继有人、代代相传。请在"红色基因"、"红色故事"、"红色底色"三个方面,任选一个角度作演讲。', category: '公考面试', difficulty: '普通', subtype: '其他' },
]

export const CATEGORIES = ['日常', '观点', '工作', '解释', '公考面试'] as const

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

/** 「公考面试」题(含历史数据里的旧分类名「申论」)→ 面试模式(思考/作答节奏与文案) */
export function isInterviewTopic(topic: Partial<Pick<Topic, 'category'>>): boolean {
  return topic.category === '公考面试' || (topic.category as string) === '申论'
}

export function getTopicById(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id)
}

export function getRandomTopic(): Topic {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)]
}
