// 游戏配置文件

// ==================== 时间系统配置 ====================
export const TIME_CONFIG = {
  SECONDS_PER_DAY: 225,           // 现实时间225秒为游戏中一天
  DAYS_PER_SOLAR_TERM: 3,        // 每个节气3天
  SOLAR_TERMS_PER_MONTH: 2,      // 每月2个节气
  MONTHS_PER_SEASON: 3,          // 每季3个月
  SEASONS_PER_YEAR: 4,           // 每年4季
  TIME_STEPS_PER_DAY: 6,         // 每天6个时辰
  UPDATE_INTERVAL: {
    FAST: 500,                   // 快速模式：0.5秒
    NORMAL: 1000,                // 正常模式：1秒
    SLOW: 2000                   // 慢速模式：2秒
  }
};

// ==================== 时辰系统配置 ====================
export const TIME_OF_DAY = {
  PERIODS: ["黎明", "上午", "正午", "下午", "黄昏", "夜晚"],
  DESCRIPTIONS: {
    "黎明": { hour: "5-7时", description: "鸡鸣时分，万物苏醒" },
    "上午": { hour: "7-11时", description: "朝阳初升，劳作时光" },
    "正午": { hour: "11-13时", description: "日当中天，午休小憩" },
    "下午": { hour: "13-17时", description: "午后斜阳，继续劳作" },
    "黄昏": { hour: "17-19时", description: "夕阳西下，归家用餐" },
    "夜晚": { hour: "19-5时", description: "月明星稀，安眠时分" }
  }
};

// ==================== 节气系统配置 ====================
export const SOLAR_TERMS = {
  "春季": {
    terms: ["立春", "雨水", "惊蛰", "春分", "清明", "谷雨"],
    climate: "温和湿润",
    description: "万物复苏，农事渐忙",
    effects: {
      temperature: "warming",
      rainfall: "increasing",
      growthRate: 1.2
    }
  },
  "夏季": {
    terms: ["立夏", "小满", "芒种", "夏至", "小暑", "大暑"],
    climate: "炎热多雨",
    description: "烈日炎炎，作物旺盛",
    effects: {
      temperature: "hot",
      rainfall: "frequent",
      growthRate: 1.5
    }
  },
  "秋季": {
    terms: ["立秋", "处暑", "白露", "秋分", "寒露", "霜降"],
    climate: "凉爽干燥",
    description: "秋高气爽，收获季节",
    effects: {
      temperature: "cooling",
      rainfall: "decreasing",
      growthRate: 1.0
    }
  },
  "冬季": {
    terms: ["立冬", "小雪", "大雪", "冬至", "小寒", "大寒"],
    climate: "寒冷干燥",
    description: "天寒地冻，农闲时节",
    effects: {
      temperature: "cold",
      rainfall: "rare",
      growthRate: 0.3
    }
  }
};

// ==================== 天气系统配置 ====================
export const WEATHER_SYSTEM = {
  TYPES: ["晴朗", "多云", "阴天", "小雨", "大雨", "雷雨", "雾天", "雪天"],
  PROBABILITIES: {
    "春季": {
      "晴朗": 0.4, "多云": 0.3, "小雨": 0.2, "大雨": 0.05, "雷雨": 0.03, "阴天": 0.02
    },
    "夏季": {
      "晴朗": 0.35, "多云": 0.25, "小雨": 0.15, "大雨": 0.1, "雷雨": 0.1, "阴天": 0.05
    },
    "秋季": {
      "晴朗": 0.5, "多云": 0.3, "阴天": 0.1, "小雨": 0.08, "雾天": 0.02
    },
    "冬季": {
      "晴朗": 0.3, "多云": 0.3, "阴天": 0.2, "雪天": 0.15, "雾天": 0.05
    }
  },
  EFFECTS: {
    "晴朗": { workEfficiency: 1.0, mood: 5, visibility: "excellent" },
    "多云": { workEfficiency: 0.95, mood: 0, visibility: "good" },
    "阴天": { workEfficiency: 0.9, mood: -3, visibility: "fair" },
    "小雨": { workEfficiency: 0.8, mood: -5, visibility: "poor", waterBonus: 5 },
    "大雨": { workEfficiency: 0.6, mood: -10, visibility: "very_poor", waterBonus: 15 },
    "雷雨": { workEfficiency: 0.4, mood: -15, visibility: "very_poor", waterBonus: 20, danger: true },
    "雾天": { workEfficiency: 0.7, mood: -2, visibility: "poor" },
    "雪天": { workEfficiency: 0.5, mood: -8, visibility: "poor", coldDanger: true }
  }
};

// ==================== 德行系统配置 ====================
export const VIRTUE_SYSTEM = {
  "仁": {
    name: "仁德",
    description: "仁者爱人，关乎情感与人际",
    traits: [
      { name: "相爱倾向", negative: "不易坠入爱河", positive: "容易产生爱意", weight: 1.0 },
      { name: "抑憎倾向", negative: "易生仇恨", positive: "不易憎恨", weight: 1.2 },
      { name: "抑妒倾向", negative: "易生嫉妒", positive: "不易嫉妒", weight: 1.1 },
      { name: "讨好倾向", negative: "言语攻击", positive: "友善待人", weight: 0.9 },
      { name: "痴情倾向", negative: "情感淡漠", positive: "情感依恋", weight: 0.8 }
    ]
  },
  "义": {
    name: "义德",
    description: "义者宜也，关乎道德与责任",
    traits: [
      { name: "感恩倾向", negative: "不知感恩", positive: "知恩图报", weight: 1.1 },
      { name: "利他倾向", negative: "自私自利", positive: "乐于助人", weight: 1.3 },
      { name: "勇敢倾向", negative: "胆小怯懦", positive: "勇敢无畏", weight: 1.2 },
      { name: "担责倾向", negative: "逃避责任", positive: "责任感强", weight: 1.4 },
      { name: "泯仇倾向", negative: "记仇报复", positive: "宽恕原谅", weight: 1.0 }
    ]
  },
  "礼": {
    name: "礼德",
    description: "礼者理也，关乎秩序与规范",
    traits: [
      { name: "合群倾向", negative: "喜欢独处", positive: "喜欢群体", weight: 1.0 },
      { name: "完美倾向", negative: "粗心大意", positive: "追求完美", weight: 0.9 },
      { name: "尊礼倾向", negative: "粗俗无礼", positive: "彬彬有礼", weight: 1.1 },
      { name: "和谐倾向", negative: "喜欢纷争", positive: "追求和谐", weight: 1.2 },
      { name: "规范倾向", negative: "杂乱无章", positive: "井井有条", weight: 0.8 }
    ]
  },
  "智": {
    name: "智德", 
    description: "智者知也，关乎学识与思辨",
    traits: [
      { name: "主导倾向", negative: "沉默寡言", positive: "主导欲强", weight: 1.0 },
      { name: "隐私倾向", negative: "过度分享", positive: "注重隐私", weight: 0.7 },
      { name: "好奇倾向", negative: "缺乏好奇", positive: "极度好奇", weight: 1.1 },
      { name: "空谈倾向", negative: "务实具体", positive: "抽象思维", weight: 0.6 },
      { name: "艺术倾向", negative: "无感艺术", positive: "热爱艺术", weight: 0.8 }
    ]
  },
  "信": {
    name: "信德",
    description: "信者诚也，关乎诚信与坚持",
    traits: [
      { name: "信任倾向", negative: "多疑猜忌", positive: "轻信他人", weight: 1.0 },
      { name: "鼓舞倾向", negative: "消极悲观", positive: "乐观鼓舞", weight: 1.2 },
      { name: "专注倾向", negative: "心不在焉", positive: "专心致志", weight: 1.1 },
      { name: "固化倾向", negative: "随波逐流", positive: "固执己见", weight: 0.8 },
      { name: "坚持倾向", negative: "轻易放弃", positive: "坚持不懈", weight: 1.3 }
    ]
  },
  "温": {
    name: "温德",
    description: "温者和也，关乎情绪与心境",
    traits: [
      { name: "抑怒倾向", negative: "易怒暴躁", positive: "温和克制", weight: 1.2 },
      { name: "抗郁倾向", negative: "情绪低落", positive: "情绪高昂", weight: 1.1 },
      { name: "抗虑倾向", negative: "焦虑不安", positive: "冷静沉着", weight: 1.1 },
      { name: "温善倾向", negative: "性格残忍", positive: "心软善良", weight: 1.3 },
      { name: "稳重倾向", negative: "轻率冲动", positive: "深思熟虑", weight: 1.0 }
    ]
  },
  "良": {
    name: "良德",
    description: "良者善也，关乎品格与修养",
    traits: [
      { name: "寡欲倾向", negative: "欲望强烈", positive: "清心寡欲", weight: 0.9 },
      { name: "自信倾向", negative: "缺乏自信", positive: "自信满满", weight: 1.0 },
      { name: "幽默倾向", negative: "木讷乏味", positive: "风趣幽默", weight: 0.8 },
      { name: "敏感倾向", negative: "情感迟钝", positive: "善解人意", weight: 1.1 },
      { name: "乐观倾向", negative: "悲观绝望", positive: "乐观向上", weight: 1.2 }
    ]
  },
  "恭": {
    name: "恭德",
    description: "恭者敬也，关乎谦逊与恭敬",
    traits: [
      { name: "止暴倾向", negative: "好斗暴力", positive: "和平主义", weight: 1.2 },
      { name: "兼听倾向", negative: "固执己见", positive: "善于听取", weight: 1.0 },
      { name: "谦逊倾向", negative: "傲慢自大", positive: "谦虚低调", weight: 1.1 },
      { name: "压力倾向", negative: "不堪重负", positive: "抗压力强", weight: 1.0 },
      { name: "害羞倾向", negative: "厚颜无耻", positive: "羞涩腼腆", weight: 0.7 }
    ]
  },
  "俭": {
    name: "俭德",
    description: "俭者约也，关乎节制与勤俭",
    traits: [
      { name: "自律倾向", negative: "放纵无度", positive: "严于律己", weight: 1.2 },
      { name: "忙碌倾向", negative: "懒散怠惰", positive: "勤奋忙碌", weight: 1.3 },
      { name: "平和倾向", negative: "寻求刺激", positive: "安于平淡", weight: 0.8 },
      { name: "轻财倾向", negative: "贪婪吝啬", positive: "视财如土", weight: 0.9 },
      { name: "节约倾向", negative: "挥霍浪费", positive: "勤俭节约", weight: 1.1 }
    ]
  },
  "让": {
    name: "让德",
    description: "让者退也，关乎谦让与超脱",
    traits: [
      { name: "包容倾向", negative: "狭隘偏执", positive: "宽容大度", weight: 1.1 },
      { name: "淡泊倾向", negative: "野心勃勃", positive: "淡泊名利", weight: 0.8 },
      { name: "出世倾向", negative: "世俗功利", positive: "超然物外", weight: 0.6 },
      { name: "本真倾向", negative: "虚荣浮华", positive: "返璞归真", weight: 0.9 }
    ]
  }
};

// ==================== 行为分类系统配置 ====================
export const BEHAVIOR_CATEGORIES = {
  "生产类": {
    name: "生产劳作",
    actions: [
      "拓地伐林", "采石挖矿", "水产捕捞", "野外狩猎", 
      "垦荒耕种", "畜牧养殖", "熔炼铸锻", "手工雕琢", 
      "刨锯木作", "纺织缝纫", "酒醋酿作"
    ],
    priority: "high",
    timeSlots: ["上午", "下午"],
    energyCost: 30,
    skillGain: 0.5,
    resourceProduction: true
  },
  "建设类": {
    name: "建设营造",
    actions: ["住宅修建", "坞堡营造", "道路修筑", "水渠挖掘"],
    priority: "medium",
    timeSlots: ["上午", "下午"],
    energyCost: 40,
    skillGain: 0.3,
    durability: true
  },
  "商业类": {
    name: "商业贸易",
    actions: ["摆摊交易", "货物转运", "商铺经营"],
    priority: "medium",
    timeSlots: ["上午", "下午", "黄昏"],
    energyCost: 20,
    socialInteraction: true
  },
  "研究学习类": {
    name: "学术研究",
    actions: ["经义研读", "工艺革新", "艺术创作"],
    priority: "low",
    timeSlots: ["上午", "下午", "黄昏"],
    energyCost: 15,
    skillGain: 0.8,
    innovation: true
  },
  "生理需求类": {
    name: "生理需求",
    actions: ["进食饮水", "休息睡眠", "盥洗沐浴", "男欢女爱", "更衣小解", "求医用药"],
    priority: "critical",
    timeSlots: {
      "进食饮水": ["黎明", "正午", "黄昏"],
      "休息睡眠": ["夜晚"],
      "盥洗沐浴": ["黎明", "黄昏"],
      "更衣小解": ["黎明", "上午", "下午", "黄昏"],
      "男欢女爱": ["夜晚"],
      "求医用药": ["上午", "下午"]
    },
    energyCost: 0,
    immediate: true
  },
  "娱乐类": {
    name: "娱乐休闲",
    actions: ["踏青出游", "饮酒聚宴", "赌博对弈", "起舞弄乐", "击剑格斗", "社集看戏"],
    priority: "low",
    timeSlots: ["下午", "黄昏", "夜晚"],
    energyCost: 5,
    moodBonus: 15,
    socialInteraction: true
  },
  "社交责任类": {
    name: "社交责任",
    actions: ["赡养老人", "照顾婴孺", "追求伴侣", "觅求好友"],
    priority: "medium",
    timeSlots: ["黎明", "下午", "黄昏", "夜晚"],
    energyCost: 10,
    relationshipBuilding: true
  },
  "礼仪类": {
    name: "礼仪庆典",
    actions: ["节日拜会", "祝祷祭祀", "拜师收徒", "婚丧嫁娶", "庆生祝寿", "结亲聚义"],
    priority: "special",
    timeSlots: ["上午", "下午"],
    energyCost: 15,
    culturalSignificance: true,
    groupActivity: true
  },
  "宗教类": {
    name: "宗教修行",
    actions: ["占卜起卦", "求神拜佛", "修身出家", "穷经悟道"],
    priority: "low",
    timeSlots: ["黎明", "黄昏", "夜晚"],
    energyCost: 5,
    spiritualGrowth: true
  },
  "犯罪类": {
    name: "违法犯罪",
    actions: ["亲族复仇", "邻里斗殴", "通奸偷情", "偷窃劫掠", "杀人夺命"],
    priority: "deviant",
    timeSlots: ["夜晚"],
    energyCost: 20,
    dangerous: true,
    socialPenalty: true
  }
};

// ==================== 日常作息配置 ====================
export const DAILY_SCHEDULE = {
  "黎明": {
    name: "晨起时分",
    priority: ["盥洗沐浴", "进食饮水", "更衣小解"],
    optional: ["祝祷祭祀", "照顾婴孺", "赡养老人"],
    weather_affected: false,
    energy_restoration: 5
  },
  "上午": {
    name: "晨工时光",
    priority: ["垦荒耕种", "拓地伐林", "手工雕琢", "住宅修建", "商铺经营"],
    optional: ["经义研读", "工艺革新", "觅求好友"],
    weather_affected: true,
    productivity_peak: true
  },
  "正午": {
    name: "午休小憩",
    priority: ["进食饮水", "短暂休息"],
    optional: ["社集看戏", "赌博对弈"],
    weather_affected: false,
    rest_period: true
  },
  "下午": {
    name: "午后劳作",
    priority: ["垦荒耕种", "水产捕捞", "纺织缝纫", "坞堡营造"],
    optional: ["追求伴侣", "踏青出游", "艺术创作"],
    weather_affected: true,
    productivity_moderate: true
  },
  "黄昏": {
    name: "归家时分",
    priority: ["进食饮水", "盥洗沐浴", "照顾婴孺"],
    optional: ["饮酒聚宴", "起舞弄乐", "觅求好友"],
    weather_affected: false,
    social_time: true
  },
  "夜晚": {
    name: "安眠时光",
    priority: ["休息睡眠"],
    optional: ["男欢女爱", "赌博对弈", "穷经悟道"],
    weather_affected: false,
    quiet_activities: true
  }
};

// ==================== 地点系统配置 ====================
export const LOCATIONS = {
  "住宅区": {
    name: "住宅区",
    type: "residential",
    capacity: 50,
    description: "居民们的住所，家庭生活的中心",
    availableActions: ["进食饮水", "休息睡眠", "盥洗沐浴", "照顾婴孺", "男欢女爱"],
    comfort: 80,
    safety: 90
  },
  "农田": {
    name: "农田",
    type: "production",
    capacity: 20,
    description: "肥沃的耕地，粮食的来源",
    availableActions: ["垦荒耕种", "畜牧养殖"],
    weatherSensitive: true,
    seasonalBonus: { "春季": 1.2, "夏季": 1.5, "秋季": 1.3, "冬季": 0.3 }
  },
  "工坊": {
    name: "工坊",
    type: "production",
    capacity: 15,
    description: "手工作业的场所，技艺传承之地",
    availableActions: ["手工雕琢", "熔炼铸锻", "纺织缝纫", "刨锯木作"],
    skillBonus: 0.2,
    toolsRequired: true
  },
  "山林": {
    name: "山林",
    type: "resource",
    capacity: 10,
    description: "茂密的森林，木材和猎物的来源",
    availableActions: ["拓地伐林", "野外狩猎", "采药"],
    danger: 0.1,
    seasonalVariation: true
  },
  "河边": {
    name: "河边",
    type: "resource",
    capacity: 10,
    description: "清澈的河流，水源和鱼类的来源",
    availableActions: ["水产捕捞", "盥洗沐浴", "汲水"],
    waterSource: true,
    seasonal_flow: true
  },
  "市集": {
    name: "市集",
    type: "social",
    capacity: 30,
    description: "商贾云集之地，贸易往来的中心",
    availableActions: ["摆摊交易", "商铺经营", "货物转运", "觅求好友"],
    commercial: true,
    bustling: true
  },
  "祠堂": {
    name: "祠堂",
    type: "cultural",
    capacity: 25,
    description: "祭祀祖先的神圣场所，文化传承之地",
    availableActions: ["祝祷祭祀", "经义研读", "求医用药", "婚丧嫁娶"],
    sacred: true,
    cultural_significance: "high"
  },
  "广场": {
    name: "广场",
    type: "social",
    capacity: 40,
    description: "公共聚会场所，社交活动的中心",
    availableActions: ["社集看戏", "起舞弄乐", "饮酒聚宴", "节日拜会"],
    public: true,
    gathering_place: true
  },
  "城墙": {
    name: "城墙",
    type: "defense",
    capacity: 20,
    description: "坞堡的防御工事，安全的保障",
    availableActions: ["坞堡营造", "站岗放哨", "击剑格斗"],
    defensive: true,
    strategic: true
  },
  "矿场": {
    name: "矿场",
    type: "resource",
    capacity: 8,
    description: "开采石料金属的场所",
    availableActions: ["采石挖矿"],
    danger: 0.2,
    hardLabor: true,
    resourceRich: true
  }
};

// ==================== 资源系统配置 ====================
export const RESOURCE_TYPES = {
  "food": {
    name: "粮食",
    description: "维持生命的基本食物",
    category: "consumable",
    dailyConsumption: 1.5,
    storageDecay: 0.01,
    critical_threshold: 20
  },
  "water": {
    name: "水源",
    description: "清洁的饮用水",
    category: "consumable",
    dailyConsumption: 2.0,
    storageDecay: 0.02,
    critical_threshold: 15
  },
  "wood": {
    name: "木材",
    description: "建设和燃料的重要材料",
    category: "material",
    uses: ["construction", "fuel", "tools"],
    renewable: true
  },
  "stone": {
    name: "石料",
    description: "坚固的建筑材料",
    category: "material",
    uses: ["construction", "tools", "weapons"],
    durable: true
  },
  "cloth": {
    name: "布匹",
    description: "制作衣物的纺织品",
    category: "material",
    uses: ["clothing", "bedding"],
    comfort: true
  },
  "metal": {
    name: "金属",
    description: "珍贵的金属材料",
    category: "material",
    uses: ["tools", "weapons", "currency"],
    valuable: true
  },
  "medicine": {
    name: "草药",
    description: "治疗疾病的药材",
    category: "consumable",
    uses: ["healing", "prevention"],
    rare: true
  },
  "tools": {
    name: "工具",
    description: "提高劳作效率的器具",
    category: "equipment",
    durability: 100,
    efficiency_bonus: 0.2
  }
};

// ==================== 技能系统配置 ====================
export const SKILL_CATEGORIES = {
  "农业技能": {
    skills: ["垦荒耕种", "畜牧养殖", "园艺栽培"],
    importance: "critical",
    base_efficiency: 1.0
  },
  "手工技能": {
    skills: ["手工雕琢", "纺织缝纫", "熔炼铸锻", "刨锯木作"],
    importance: "high",
    base_efficiency: 0.8
  },
  "建筑技能": {
    skills: ["住宅修建", "坞堡营造", "道路修筑"],
    importance: "high",
    base_efficiency: 0.9
  },
  "采集技能": {
    skills: ["拓地伐林", "采石挖矿", "水产捕捞", "野外狩猎"],
    importance: "medium",
    base_efficiency: 0.7
  },
  "社交技能": {
    skills: ["商业贸易", "外交谈判", "教学传授"],
    importance: "medium",
    base_efficiency: 0.6
  },
  "文化技能": {
    skills: ["经义研读", "艺术创作", "医药治疗"],
    importance: "low",
    base_efficiency: 0.5
  }
};

// ==================== 事件系统配置 ====================
export const EVENT_TYPES = {
  "natural": {
    name: "自然事件",
    events: ["丰收", "歉收", "洪涝", "干旱", "瘟疫", "地震"],
    frequency: "rare",
    impact: "major"
  },
  "social": {
    name: "社会事件", 
    events: ["外来移民", "商队到访", "盗匪袭击", "官府征税"],
    frequency: "occasional",
    impact: "moderate"
  },
  "personal": {
    name: "个人事件",
    events: ["生病", "受伤", "结婚", "生子", "死亡", "技能突破"],
    frequency: "common",
    impact: "individual"
  },
  "cultural": {
    name: "文化事件",
    events: ["节日庆典", "宗教仪式", "师父收徒", "技艺创新"],
    frequency: "regular",
    impact: "cultural"
  }
};

// ==================== 人物生成配置 ====================
export const CHARACTER_GENERATION = {
  NAMES: {
    surnames: ["李", "王", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴", "徐", "孙", "马", "朱", "胡"],
    maleNames: ["明", "华", "强", "伟", "磊", "勇", "平", "刚", "军", "辉", "峰", "鹏", "涛", "超"],
    femaleNames: ["芳", "敏", "静", "娟", "洁", "艳", "桂", "英", "丽", "红", "霞", "梅", "玲", "燕"]
  },
  AGE_RANGES: {
    young: { min: 16, max: 25, fertility: 0.8, energy: 1.2 },
    adult: { min: 26, max: 45, fertility: 1.0, energy: 1.0 },
    middle: { min: 46, max: 60, fertility: 0.3, energy: 0.8 },
    elder: { min: 61, max: 80, fertility: 0.0, energy: 0.5 }
  },
  FAMILY_STRUCTURES: [
    { type: "nuclear", size: { min: 3, max: 5 }, probability: 0.6 },
    { type: "extended", size: { min: 5, max: 8 }, probability: 0.3 },
    { type: "single", size: { min: 1, max: 2 }, probability: 0.1 }
  ]
};

// ==================== 游戏平衡配置 ====================
export const BALANCE_CONFIG = {
  SKILL_LEARNING: {
    baseLearnRate: 1.0,
    masteryThreshold: 80,
    teachingEffectiveness: 0.8,
    practiceBonus: 1.2,
    ageDecayFactor: 0.05
  },
  RELATIONSHIPS: {
    familiarityGainRate: 1.0,
    compatibilityInfluence: 0.6,
    conflictDecayRate: 0.1,
    marriageThreshold: 70,
    friendshipThreshold: 60
  },
  NEEDS: {
    hungerDecayRate: 2.0,
    thirstDecayRate: 2.5,
    sleepDecayRate: 0.8,
    cleanlinessDecayRate: 0.5,
    socialNeedThreshold: 40
  },
  HEALTH: {
    baseHealthDecay: 0.1,
    diseaseChance: 0.01,
    injuryChance: 0.005,
    recoveryRate: 1.5,
    medicalEffectiveness: 0.7
  },
  PRODUCTION: {
    baseEfficiency: 1.0,
    skillBonus: 0.02,
    weatherModifier: 0.3,
    toolBonus: 0.2,
    teamworkBonus: 0.1
  }
};

// ==================== 调试配置 ====================
export const DEBUG_CONFIG = {
  LOGGING: {
    events: true,
    decisions: false,
    relationships: false,
    performance: false
  },
  CHEATS: {
    infiniteResources: false,
    fastTime: false,
    godMode: false,
    debugUI: false
  },
  MONITORING: {
    trackBehaviorPatterns: true,
    recordDecisionMaking: false,
    monitorPerformance: true
  }
};

// ==================== 导出默认配置 ====================
export const DEFAULT_CONFIG = {
  TIME_CONFIG,
  TIME_OF_DAY,
  SOLAR_TERMS,
  WEATHER_SYSTEM,
  VIRTUE_SYSTEM,
  BEHAVIOR_CATEGORIES,
  DAILY_SCHEDULE,
  LOCATIONS,
  RESOURCE_TYPES,
  SKILL_CATEGORIES,
  EVENT_TYPES,
  CHARACTER_GENERATION,
  BALANCE_CONFIG,
  DEBUG_CONFIG
};

export default DEFAULT_CONFIG;