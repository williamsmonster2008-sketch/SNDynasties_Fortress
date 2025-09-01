/**
 * virtue_system.js - 德行系统（正确版本）
 * 
 * 功能：
 * 1. 基于南北朝十德体系：仁、义、礼、智、信、温、良、恭、俭、让
 * 2. 每德包含5个具体特质倾向，数值范围 -100 到 100
 * 3. 从 data_tables/virtue_config.json 加载配置数据
 * 4. 支持行为对德行的影响计算
 * 
 * 德行架构：
 * - 仁：相爱倾向、抑憎倾向、抑妒倾向、讨好倾向、痴情倾向
 * - 义：感恩倾向、利他倾向、勇敢倾向、担责倾向、泯仇倾向
 * - 礼：合群倾向、完美倾向、尊礼倾向、和谐倾向、规范倾向
 * - 智：主导倾向、隐私倾向、好奇倾向、空谈倾向、艺术倾向
 * - 信：信任倾向、鼓舞倾向、专注倾向、固化倾向、坚持倾向
 * - 温：抑怒倾向、抗郁倾向、抗虑倾向、温善倾向、稳重倾向
 * - 良：寡欲倾向、自信倾向、幽默倾向、敏感倾向、乐观倾向
 * - 恭：止暴倾向、兼听倾向、谦逊倾向、压力倾向、害羞倾向
 * - 俭：自律倾向、忙碌倾向、平和倾向、轻财倾向、节约倾向
 * - 让：包容倾向、淡泊倾向、出世倾向、本真倾向
 */

/**
 * 德行特质类
 * 每个特质有正负两个极端描述和数值范围 -100 到 100
 */
class VirtueTrait {
  constructor(name, options = {}) {
    this.name = name;
    this.value = options.value || 0;                    // 当前数值 (-100 到 100)
    this.weight = options.weight || 1.0;                // 权重系数
    this.stability = options.stability || 0.5;          // 稳定性 (0-1)
    this.developmentRate = options.developmentRate || 0.1; // 发展速率
    
    // 正负极端描述
    this.negative = options.negative || '负面表现';
    this.positive = options.positive || '正面表现';
    
    // 影响历史记录
    this.influences = [];
  }

  /**
   * 应用行为影响
   * @param {string} behavior - 行为名称
   * @param {number} change - 变化值
   * @param {number} intensity - 强度系数
   */
  applyInfluence(behavior, change, intensity = 1.0) {
    const actualChange = change * intensity * this.developmentRate;
    const stabilityFactor = 1.0 - this.stability;
    const finalChange = actualChange * stabilityFactor;
    
    this.value = Math.max(-100, Math.min(100, this.value + finalChange));
    
    // 记录影响历史
    this.influences.push({
      behavior: behavior,
      change: Math.round(finalChange),
      timestamp: Date.now(),
      oldValue: this.value - finalChange,
      newValue: this.value
    });
    
    // 保持历史记录在合理数量
    if (this.influences.length > 50) {
      this.influences.shift();
    }
  }

  /**
   * 获取当前倾向等级描述
   * @returns {string} 倾向描述
   */
  getTendencyDescription() {
    if (this.value > 60) {
      return this.positive + '（很强）';
    } else if (this.value > 20) {
      return this.positive + '（较强）';
    } else if (this.value < -60) {
      return this.negative + '（很强）';
    } else if (this.value < -20) {
      return this.negative + '（较强）';
    } else {
      return '表现平常';
    }
  }

  /**
   * 获取倾向等级
   * @returns {string} 等级标识
   */
  getTendencyLevel() {
    if (this.value > 80) return 'very_positive';
    if (this.value > 40) return 'positive';
    if (this.value > 10) return 'slightly_positive';
    if (this.value < -80) return 'very_negative';
    if (this.value < -40) return 'negative';
    if (this.value < -10) return 'slightly_negative';
    return 'neutral';
  }

  /**
   * 克隆特质
   * @returns {VirtueTrait} 克隆的特质对象
   */
  clone() {
    const cloned = new VirtueTrait(this.name, {
      value: this.value,
      weight: this.weight,
      stability: this.stability,
      developmentRate: this.developmentRate,
      negative: this.negative,
      positive: this.positive
    });
    cloned.influences = [...this.influences];
    return cloned;
  }
}

/**
 * 德行系统类（每个角色独有一个实例）
 * 管理角色完整的十德体系和50个德行特质
 */
class VirtueSystem {
  constructor(characterId, config = {}) {
    this.characterId = characterId;
    this.config = null; // 从外部加载的配置
    
    // 十德分类存储 (Map)
    this.virtueCategories = new Map();

    // 德行数值存储 (Map) - 添加这行
    this.virtues = new Map();
    
    // 所有特质快速访问 (Map)
    this.traits = new Map();
    
    // 行为影响映射
    this.behaviorEffects = new Map();
    
    // 德行发展参数
    this.developmentConfig = {
      baseGrowthRate: config.baseGrowthRate || 1.0,
      experienceBonus: config.experienceBonus || 0.2,
      ageInfluence: config.ageInfluence || 0.1,
      environmentInfluence: config.environmentInfluence || 0.3
    };
    
    console.log(`✅ VirtueSystem 为角色 ${characterId} 初始化完成`);
  }

  /**
   * 加载德行系统配置
   * @param {DataTableManager} dataTableManager - 数据表管理器
   */
  async loadConfiguration(dataTableManager) {
    try {
      if (!dataTableManager) {
        console.warn('⚠️ DataTableManager 未提供，使用默认配置');
        this.config = this._getDefaultConfig();
      } else {
        this.config = await dataTableManager.getVirtueSystemConfig();
        
        if (!this.config) {
          console.warn('⚠️ 未能加载 virtue_config.json，使用默认配置');
          this.config = this._getDefaultConfig();
        }
      }

      // 根据配置初始化德行系统
      this._initializeVirtueStructure();
      this._setupBehaviorEffects();
      
      console.log(`✅ 角色 ${this.characterId} 德行系统配置加载完成`);
      
    } catch (error) {
      console.error('❌ 加载德行系统配置失败:', error);
      this.config = this._getDefaultConfig();
      this._initializeVirtueStructure();
    }
  }

  /**
   * 初始化德行结构
   */
  _initializeVirtueStructure() {
    if (!this.config || !this.config.virtueCategories) {
      console.error('❌ 德行配置数据无效');
      return;
    }

    // 遍历十德分类
    for (const [categoryKey, categoryData] of Object.entries(this.config.virtueCategories)) {
      const traits = [];
      
      // 创建该德行下的所有特质
      for (const traitConfig of categoryData.traits) {
        const trait = new VirtueTrait(traitConfig.name, {
          value: this._generateInitialValue(traitConfig),
          weight: traitConfig.weight || 1.0,
          stability: traitConfig.stability || 0.5,
          negative: traitConfig.negative,
          positive: traitConfig.positive,
          developmentRate: traitConfig.developmentRate || 0.1
        });
        
        // 添加到快速访问映射
        this.traits.set(traitConfig.name, trait);
        traits.push(trait);
      }
      
      // 存储德行分类
      this.virtueCategories.set(categoryKey, {
        name: categoryData.name,
        description: categoryData.description,
        color: categoryData.color,
        importance: categoryData.importance,
        traits: traits
      });
    }

    console.log(`✅ 德行结构初始化完成，包含 ${this.virtueCategories.size} 个德行分类，${this.traits.size} 个特质`);
  }

  /**
   * 生成特质初始值
   * @param {Object} traitConfig - 特质配置
   * @returns {number} 初始值
   */
  _generateInitialValue(traitConfig) {
    if (traitConfig.initialRange) {
      const [min, max] = traitConfig.initialRange;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return 0; // 默认中性
  }

  /**
   * 设置行为效果
   */
  _setupBehaviorEffects() {
    if (!this.config || !this.config.behaviorEffects) return;

    for (const [behavior, effects] of Object.entries(this.config.behaviorEffects)) {
      this.behaviorEffects.set(behavior, effects);
    }
  }

  /**
   * 获取默认配置（备用）
   */
  _getDefaultConfig() {
    return {
      virtueCategories: {
        "仁": {
          name: "仁德",
          description: "仁者爱人，关乎情感与人际",
          color: "#FF6B6B",
          importance: 9,
          traits: [
            { name: "相爱倾向", negative: "不易坠入爱河", positive: "容易产生爱意", weight: 1.0, stability: 0.6, initialRange: [-20, 20] },
            { name: "抑憎倾向", negative: "易生仇恨", positive: "不易憎恨", weight: 1.2, stability: 0.7, initialRange: [-30, 30] },
            { name: "抑妒倾向", negative: "容易嫉妒", positive: "不易嫉妒", weight: 1.1, stability: 0.6, initialRange: [-25, 25] },
            { name: "讨好倾向", negative: "不友好攻击", positive: "友好讨好", weight: 1.0, stability: 0.5, initialRange: [-30, 30] },
            { name: "痴情倾向", negative: "没有感情依恋", positive: "强烈情感纽带", weight: 1.3, stability: 0.8, initialRange: [-20, 20] }
          ]
        },
        "义": {
          name: "义德",
          description: "义者宜也，关乎道德与责任",
          color: "#4ECDC4",
          importance: 10,
          traits: [
            { name: "感恩倾向", negative: "不知感恩", positive: "知恩图报", weight: 1.1, stability: 0.5, initialRange: [-25, 25] },
            { name: "利他倾向", negative: "不喜欢帮助", positive: "热衷帮助", weight: 1.2, stability: 0.6, initialRange: [-30, 30] },
            { name: "勇敢倾向", negative: "胆小怯懦", positive: "异常勇敢", weight: 1.4, stability: 0.7, initialRange: [-40, 40] },
            { name: "担责倾向", negative: "讨厌义务", positive: "强烈责任感", weight: 1.3, stability: 0.6, initialRange: [-35, 35] },
            { name: "泯仇倾向", negative: "心怀报复", positive: "积极原谅", weight: 1.1, stability: 0.5, initialRange: [-25, 25] }
          ]
        },
        "礼": {
          name: "礼德",
          description: "礼者理也，关乎秩序与规范",
          color: "#45B7D1",
          importance: 8,
          traits: [
            { name: "合群倾向", negative: "认为独处重要", positive: "喜欢集体生活", weight: 1.0, stability: 0.5, initialRange: [-30, 30] },
            { name: "完美倾向", negative: "不重视细节", positive: "注重细节完美", weight: 1.2, stability: 0.6, initialRange: [-25, 25] },
            { name: "尊礼倾向", negative: "相当粗俗", positive: "非常有礼貌", weight: 1.1, stability: 0.6, initialRange: [-30, 30] },
            { name: "和谐倾向", negative: "热衷制造混乱", positive: "追求和谐融洽", weight: 1.0, stability: 0.5, initialRange: [-25, 25] },
            { name: "规范倾向", negative: "不在意整理", positive: "痴迷秩序结构", weight: 1.1, stability: 0.7, initialRange: [-30, 30] }
          ]
        },
        "智": {
          name: "智德",
          description: "智者知也，关乎认知与学习",
          color: "#96CEB4",
          importance: 9,
          traits: [
            { name: "主导倾向", negative: "不会发表观点", positive: "强烈主导欲望", weight: 1.2, stability: 0.6, initialRange: [-35, 35] },
            { name: "隐私倾向", negative: "过于热衷分享", positive: "过于注重隐私", weight: 1.0, stability: 0.5, initialRange: [-20, 20] },
            { name: "好奇倾向", negative: "缺乏好奇心", positive: "极度好奇", weight: 1.3, stability: 0.4, initialRange: [-25, 25] },
            { name: "空谈倾向", negative: "关注实际例子", positive: "喜欢抽象讨论", weight: 1.0, stability: 0.6, initialRange: [-20, 20] },
            { name: "艺术倾向", negative: "对艺术无动于衷", positive: "沉浸艺术美丽", weight: 1.1, stability: 0.7, initialRange: [-30, 30] }
          ]
        },
        "信": {
          name: "信德",  
          description: "信者诚也，关乎诚信与坚持",
          color: "#FFEAA7",
          importance: 9,
          traits: [
            { name: "信任倾向", negative: "认为别人阴险", positive: "天真盲目信任", weight: 1.2, stability: 0.5, initialRange: [-30, 30] },
            { name: "鼓舞倾向", negative: "消极传染他人", positive: "快乐鼓舞他人", weight: 1.0, stability: 0.4, initialRange: [-25, 25] },
            { name: "专注倾向", negative: "完全心不在焉", positive: "一心一意专注", weight: 1.3, stability: 0.6, initialRange: [-35, 35] },
            { name: "固化倾向", negative: "经常改变主意", positive: "思想固执", weight: 1.1, stability: 0.7, initialRange: [-25, 25] },
            { name: "坚持倾向", negative: "遇困难就放弃", positive: "徒劳也坚持", weight: 1.4, stability: 0.6, initialRange: [-40, 40] }
          ]
        }
        // 注：这里只展示部分德行，实际应包含十德完整配置
      },
      behaviorEffects: {
        "帮助他人": {
          "仁": { "相爱倾向": 2, "抑憎倾向": 1 },
          "义": { "感恩倾向": 3, "利他倾向": 2 }
        },
        "垦荒耕种": {
          "俭": { "忙碌倾向": 2, "自律倾向": 1 },
          "信": { "坚持倾向": 1 }
        },
        "追求伴侣": {
          "仁": { "相爱倾向": 3, "痴情倾向": 2 },
          "恭": { "害羞倾向": -1 },
          "良": { "自信倾向": 1 }
        }
      }
    };
  }

  /**
   * 获取主导德行（数值最高的3个德行分类）
   * @returns {Array} 主导德行列表
   */
  getDominantVirtues() {
    const virtueScores = [];
    
    for (const [categoryKey, categoryData] of this.virtueCategories) {
      let totalScore = 0;
      
      for (const trait of categoryData.traits) {
        totalScore += Math.abs(trait.value);
      }
      
      const averageScore = Math.round(totalScore / categoryData.traits.length);
      virtueScores.push({
        virtue: categoryKey,
        name: categoryData.name,
        score: averageScore,
        color: categoryData.color
      });
    }
    
    return virtueScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 1); // 只返回最高的一个
  }

  
  /**
   * 获取性格特质（突出的8个特质）
   * @returns {Array} 性格特质列表
   */
  getPersonalityTraits() {
    const personalityTraits = [];
    
    for (const [traitName, trait] of this.traits) {
      if (Math.abs(trait.value) >= 30) { // 只显示有明显倾向的特质
        personalityTraits.push({
          name: traitName,
          value: trait.value,
          level: trait.getTendencyLevel(),
          description: trait.getTendencyDescription()
        });
      }
    }
    
    // 按绝对值大小排序，取前8个
    return personalityTraits
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 8);
  }

  /**
   * 应用行为对德行的影响
   * @param {string} behavior - 行为名称
   * @param {number} intensity - 影响强度 (0.1-2.0)
   */
  applyBehaviorEffect(behavior, intensity = 1.0) {
    const effects = this.behaviorEffects.get(behavior);
    if (!effects) {
      console.warn(`⚠️ 行为 "${behavior}" 没有德行影响配置`);
      return {};
    }
    
    const changes = {};
    
    // 遍历德行分类的影响
    for (const [virtueCategory, traitEffects] of Object.entries(effects)) {
      for (const [traitName, change] of Object.entries(traitEffects)) {
        const trait = this.traits.get(traitName);
        if (trait) {
          const oldValue = trait.value;
          trait.applyInfluence(behavior, change, intensity);
          
          changes[traitName] = {
            old: oldValue,
            new: trait.value,
            change: Math.round((trait.value - oldValue) * 10) / 10
          };
        }
      }
    }
    
    console.log(`✅ 角色 ${this.characterId} 执行行为 "${behavior}"，德行变化:`, changes);
    return changes;
  }

  /**
   * 获取整体德行评分
   * @returns {Object} 德行评分信息
   */
  getOverallRating() {
    let totalPositive = 0;
    let totalNegative = 0;
    let traitCount = 0;
    
    for (const [traitName, trait] of this.traits) {
      if (trait.value > 0) {
        totalPositive += trait.value * trait.weight;
      } else {
        totalNegative += Math.abs(trait.value) * trait.weight;
      }
      traitCount++;
    }
    
    const overallScore = totalPositive - totalNegative;
    const averageScore = overallScore / traitCount;
    
    let rating = 'ordinary_person';
    let ratingDisplay = '普通人';
    
    if (averageScore >= 30) {
      rating = 'virtue_exemplar';
      ratingDisplay = '德行典范';
    } else if (averageScore >= 15) {
      rating = 'moral_leader';
      ratingDisplay = '品德良好';
    } else if (averageScore >= 5) {
      rating = 'decent_person';
      ratingDisplay = '为人端正';
    } else if (averageScore <= -30) {
      rating = 'morally_corrupt';
      ratingDisplay = '品德败坏';
    } else if (averageScore <= -15) {
      rating = 'problematic_person';
      ratingDisplay = '行为有问题';
    }
    
    return {
      rating: rating,
      ratingDisplay: ratingDisplay,
      overallScore: Math.round(averageScore),
      positiveScore: Math.round(totalPositive / traitCount),
      negativeScore: Math.round(totalNegative / traitCount)
    };
  }

  /**
   * 导出德行数据（用于保存）
   * @returns {Object} 德行数据
   */
  exportData() {
    const data = {
      characterId: this.characterId,
      traits: {},
      virtueCategories: {}
    };
    
    // 导出特质数据
    for (const [traitName, trait] of this.traits) {
      data.traits[traitName] = {
        value: trait.value,
        weight: trait.weight,
        stability: trait.stability,
        developmentRate: trait.developmentRate
      };
    }
    
    // 导出德行分类信息
    for (const [categoryKey, categoryData] of this.virtueCategories) {
      data.virtueCategories[categoryKey] = {
        name: categoryData.name,
        importance: categoryData.importance
      };
    }
    
    return data;
  }

  /**
   * 导入德行数据（用于加载存档）
   * @param {Object} data - 德行数据
   */
  importData(data) {
    if (!data || !data.traits) return;
    
    // 导入特质数据
    for (const [traitName, traitData] of Object.entries(data.traits)) {
      const trait = this.traits.get(traitName);
      if (trait) {
        trait.value = traitData.value || 0;
        trait.weight = traitData.weight || 1.0;
        trait.stability = traitData.stability || 0.5;
        trait.developmentRate = traitData.developmentRate || 0.1;
      }
    }
    
    console.log(`✅ 角色 ${this.characterId} 德行数据导入完成`);
  }

  /**
   * 获取特定特质的值
   * @param {string} traitName - 特质名称
   * @returns {number} 特质值 (-100 到 100)
   */
  getTraitValue(traitName) {
    const trait = this.traits.get(traitName);
    return trait ? trait.value : 0;
  }

  /**
   * 获取德行相关的行为偏好
   * @param {string} behavior - 行为名称
   * @returns {number} 偏好程度 (-1 到 1)
   */
  getBehaviorPreference(behavior) {
    const relevantTraits = this._getRelevantTraitsForBehavior(behavior);
    
    if (relevantTraits.size === 0) return 0;
    
    let totalPreference = 0;
    let totalWeight = 0;
    
    for (const [traitName, relevance] of relevantTraits) {
      const trait = this.traits.get(traitName);
      if (trait) {
        totalPreference += (trait.value / 100) * relevance * trait.weight;
        totalWeight += trait.weight;
      }
    }
    
    return totalWeight > 0 ? Math.max(-1, Math.min(1, totalPreference / totalWeight)) : 0;
  }

  /**
   * 获取与行为相关的特质
   * @param {string} behavior - 行为名称
   * @returns {Map} 相关特质和相关度
   */
  _getRelevantTraitsForBehavior(behavior) {
    const relevantTraits = new Map();
    
    // 基于行为类型确定相关特质
    const behaviorTraitMapping = {
      // 生产类
      '垦荒耕种': { '忙碌倾向': 0.8, '坚持倾向': 0.6, '自律倾向': 0.5 },
      '手工雕琢': { '完美倾向': 0.9, '专注倾向': 0.8, '艺术倾向': 0.7 },
      
      // 社交类
      '追求伴侣': { '相爱倾向': 0.9, '自信倾向': 0.6, '害羞倾向': -0.7 },
      '觅求好友': { '合群倾向': 0.8, '讨好倾向': 0.6, '隐私倾向': -0.5 },
      
      // 学习类
      '经义研读': { '好奇倾向': 0.8, '专注倾向': 0.7, '空谈倾向': 0.6 },
      '工艺革新': { '好奇倾向': 0.9, '艺术倾向': 0.6, '完美倾向': 0.5 },
      
      // 娱乐类
      '饮酒聚宴': { '合群倾向': 0.8, '幽默倾向': 0.6, '自律倾向': -0.5 },
      '踏青出游': { '艺术倾向': 0.7, '合群倾向': 0.5, '平和倾向': 0.6 },
      
      // 宗教类
      '求神拜佛': { '出世倾向': 0.8, '本真倾向': 0.6, '温善倾向': 0.5 },
      '占卜起卦': { '好奇倾向': 0.6, '出世倾向': 0.5, '空谈倾向': 0.4 },
      
      // 犯罪类
      '偷窃劫掠': { '利他倾向': -0.8, '担责倾向': -0.7, '轻财倾向': -0.6 },
      '邻里斗殴': { '止暴倾向': -0.9, '抑怒倾向': -0.8, '和谐倾向': -0.7 }
    };
    
    const mapping = behaviorTraitMapping[behavior];
    if (mapping) {
      for (const [traitName, relevance] of Object.entries(mapping)) {
        relevantTraits.set(traitName, relevance);
      }
    }
    
    return relevantTraits;
  }

  /**
   * 计算与另一个德行系统的兼容性
   * @param {VirtueSystem} otherVirtueSystem - 另一个德行系统
   * @returns {number} 兼容性分数 (0-100)
   */
  calculateCompatibility(otherVirtueSystem) {
    if (!otherVirtueSystem || !otherVirtueSystem.traits) {
      return 50; // 默认中等兼容性
    }
    
    let compatibilitySum = 0;
    let comparisonCount = 0;
    
    for (const [traitName, trait] of this.traits) {
      const otherTrait = otherVirtueSystem.traits.get(traitName);
      if (otherTrait) {
        // 计算特质兼容性
        const difference = Math.abs(trait.value - otherTrait.value);
        const compatibility = Math.max(0, 100 - difference);
        
        compatibilitySum += compatibility * trait.weight;
        comparisonCount += trait.weight;
      }
    }
    
    return comparisonCount > 0 ? Math.round(compatibilitySum / comparisonCount) : 50;
  }

  /**
   * 获取德行发展建议
   * @returns {Array} 发展建议列表
   */
  getDevelopmentSuggestions() {
    const suggestions = [];
    
    // 检查极端特质
    for (const [traitName, trait] of this.traits) {
      if (Math.abs(trait.value) > 80) {
        suggestions.push({
          type: 'extreme_trait',
          trait: traitName,
          value: trait.value,
          suggestion: trait.value > 0 ? 
            `${traitName}过于强烈，建议适度调节` : 
            `${traitName}过于负面，建议改善`
        });
      }
    }
    
    // 检查德行不平衡
    const virtueScores = this.getDominantVirtues();
    const highestScore = virtueScores[0]?.score || 0;
    const lowestScore = virtueScores[virtueScores.length - 1]?.score || 0;
    
    if (highestScore - lowestScore > 40) {
      suggestions.push({
        type: 'virtue_imbalance',
        suggestion: '德行发展不均衡，建议全面发展各项德行'
      });
    }
    
    // 基于年龄的建议
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'general_advice',
        suggestion: '继续保持良好的德行修养，通过日常行为提升品德'
      });
    }
    
    return suggestions;
  }

  /**
   * 获取系统状态（用于调试和监控）
   * @returns {Object} 系统状态信息
   */
  getSystemState() {
    return {
      characterId: this.characterId,
      totalTraits: this.traits.size,
      totalVirtueCategories: this.virtueCategories.size,
      dominantVirtues: this.getDominantVirtues(),
      personalityTraits: this.getPersonalityTraits(),
      overallRating: this.getOverallRating(),
      configLoaded: !!this.config,
      lastUpdated: Date.now()
    };
  }
}

// 德行系统工具函数
export const VirtueSystemUtils = {
  /**
   * 生成基于社会阶层的德行配置
   * @param {string} socialClass - 社会阶层
   * @returns {Object} 德行配置
   */
  generateByClass(socialClass) {
    const classProfiles = {
      'nobility': { // 贵族
        '尊礼倾向': [40, 80],
        '完美倾向': [30, 70],
        '谦逊倾向': [-30, 20],
        '艺术倾向': [40, 80],
        '主导倾向': [30, 70]
      },
      'scholar': { // 学者
        '好奇倾向': [50, 90],
        '专注倾向': [40, 80],
        '空谈倾向': [20, 60],
        '出世倾向': [10, 50],
        '完美倾向': [30, 70]
      },
      'merchant': { // 商人
        '轻财倾向': [-60, -20],
        '主导倾向': [30, 70],
        '合群倾向': [40, 80],
        '信任倾向': [10, 50],
        '坚持倾向': [40, 80]
      },
      'farmer': { // 农民
        '忙碌倾向': [50, 90],
        '节约倾向': [40, 80],
        '坚持倾向': [40, 80],
        '平和倾向': [20, 60],
        '自律倾向': [30, 70]
      },
      'artisan': { // 工匠
        '完美倾向': [60, 90],
        '专注倾向': [50, 90],
        '艺术倾向': [40, 80],
        '忙碌倾向': [40, 80],
        '自律倾向': [30, 70]
      }
    };
    
    const profile = classProfiles[socialClass] || {};
    const config = {};
    
    for (const [trait, range] of Object.entries(profile)) {
      const [min, max] = range;
      config[trait] = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    return config;
  },

  /**
   * 生成基于性格类型的德行配置
   * @param {string} personalityType - 性格类型
   * @returns {Object} 德行配置
   */
  generateByPersonality(personalityType) {
    const personalityProfiles = {
      'extrovert': { // 外向型
        '合群倾向': [40, 80],
        '讨好倾向': [30, 70],
        '害羞倾向': [-50, -10],
        '主导倾向': [20, 60],
        '鼓舞倾向': [30, 70]
      },
      'introvert': { // 内向型
        '隐私倾向': [40, 80],
        '害羞倾向': [20, 60],
        '合群倾向': [-40, 20],
        '专注倾向': [40, 80],
        '平和倾向': [30, 70]
      },
      'analytical': { // 分析型
        '好奇倾向': [50, 90],
        '专注倾向': [60, 90],
        '固化倾向': [30, 70],
        '完美倾向': [40, 80],
        '空谈倾向': [20, 60]
      },
      'creative': { // 创造型
        '艺术倾向': [60, 90],
        '好奇倾向': [40, 80],
        '固化倾向': [-40, 20],
        '敏感倾向': [40, 80],
        '出世倾向': [20, 60]
      }
    };
    
    const profile = personalityProfiles[personalityType] || {};
    const config = {};
    
    for (const [trait, range] of Object.entries(profile)) {
      const [min, max] = range;
      config[trait] = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    return config;
  },

  /**
   * 计算德行兼容性矩阵
   * @param {Array} virtueSystemList - 德行系统列表
   * @returns {Array} 兼容性矩阵
   */
  calculateCompatibilityMatrix(virtueSystemList) {
    const matrix = [];
    
    for (let i = 0; i < virtueSystemList.length; i++) {
      const row = [];
      for (let j = 0; j < virtueSystemList.length; j++) {
        if (i === j) {
          row.push(100);
        } else {
          const compatibility = virtueSystemList[i].calculateCompatibility(virtueSystemList[j]);
          row.push(compatibility);
        }
      }
      matrix.push(row);
    }
    
    return matrix;
  }
};

export { VirtueTrait, VirtueSystem };
export default VirtueSystem;
// 移除 VirtueSystemUtils 的导出，因为它已经在文件中间定义并导出了