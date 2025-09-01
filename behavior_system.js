/**
 * 行为系统 - 完整修复版
 * 南北朝坞堡模拟器游戏
 * 管理角色行为、决策逻辑和行为执行
 */

import { DEFAULT_CONFIG } from './gameConfig.js';
import { Utils } from './utils_module.js';

// ==================== 行为需求类 ====================
export class BehaviorRequirements {
  constructor(config = {}) {
    this.minAge = config.minAge || 0;
    this.maxAge = config.maxAge || 100;
    this.skills = config.skills || {};           // 技能要求 {skillName: minLevel}
    this.resources = config.resources || [];     // 资源要求 [{type, amount}]
    this.locations = config.locations || [];     // 地点要求
    this.weather = config.weather || [];         // 天气要求
    this.timeOfDay = config.timeOfDay || [];     // 时间要求
    this.socialRequirements = config.socialRequirements || {}; // 社交要求
    this.physicalState = config.physicalState || {}; // 身体状态要求
    this.emotionalState = config.emotionalState || {}; // 情绪状态要求
  }

  /**
   * 检查是否满足行为要求
   * @param {Object} context - 检查上下文
   * @returns {Object} 检查结果
   */
  checkRequirements(context) {
    const result = {
      canExecute: true,
      blockers: [],
      warnings: []
    };

    const character = context.character;
    if (!character) {
      result.canExecute = false;
      result.blockers.push('缺少角色信息');
      return result;
    }

    // 年龄检查
    if (character.age < this.minAge || character.age > this.maxAge) {
      result.canExecute = false;
      result.blockers.push(`年龄要求: ${this.minAge}-${this.maxAge}岁`);
    }

    // 技能检查
    for (const [skillName, minLevel] of Object.entries(this.skills)) {
      const skillLevel = character.getSkillLevel(skillName);
      if (skillLevel < minLevel) {
        result.canExecute = false;
        result.blockers.push(`需要${skillName}技能达到${minLevel}级`);
      }
    }

    // 资源检查
    for (const resource of this.resources) {
      if (context.resourceSystem && !context.resourceSystem.hasResource(resource.type, resource.amount)) {
        result.canExecute = false;
        result.blockers.push(`需要${resource.type} ${resource.amount}单位`);
      }
    }

    // 地点检查
    if (this.locations.length > 0 && !this.locations.includes(context.location)) {
      result.warnings.push(`建议在${this.locations.join('、')}执行`);
    }

    // 天气检查
    if (this.weather.length > 0 && !this.weather.includes(context.weather)) {
      result.warnings.push(`建议在${this.weather.join('、')}天气执行`);
    }

    // 时间检查
    if (this.timeOfDay.length > 0 && !this.timeOfDay.includes(context.timeOfDay)) {
      result.warnings.push(`建议在${this.timeOfDay.join('、')}执行`);
    }

    // 身体状态检查
    if (character.physicalState) {
      for (const [stateName, minValue] of Object.entries(this.physicalState)) {
        if (character.physicalState[stateName] < minValue) {
          result.warnings.push(`${stateName}状态较低`);
        }
      }
    }

    return result;
  }

  /**
   * 克隆需求对象
   * @returns {BehaviorRequirements} 克隆的需求
   */
  clone() {
    return new BehaviorRequirements({
      minAge: this.minAge,
      maxAge: this.maxAge,
      skills: { ...this.skills },
      resources: [...this.resources],
      locations: [...this.locations],
      weather: [...this.weather],
      timeOfDay: [...this.timeOfDay],
      socialRequirements: { ...this.socialRequirements },
      physicalState: { ...this.physicalState },
      emotionalState: { ...this.emotionalState }
    });
  }
}

// ==================== 行为效果类 ====================
export class BehaviorEffects {
  constructor(config = {}) {
    this.physical = config.physical || {};      // 身体状态影响
    this.emotional = config.emotional || {};    // 情绪状态影响
    this.skill = config.skill || {};            // 技能经验影响
    this.virtue = config.virtue || {};          // 德行影响
    this.social = config.social || {};          // 社交影响
    this.resource = config.resource || {};      // 资源变化
    this.special = config.special || {};        // 特殊效果
  }

  /**
   * 应用效果到角色
   * @param {Character} character - 目标角色
   * @param {Object} context - 执行上下文
   * @param {number} efficiency - 效率修正 (0-1)
   */
  apply(character, context, efficiency = 1.0) {
    // 应用身体状态变化
    if (this.physical && character.physicalState) {
      for (const [stateName, change] of Object.entries(this.physical)) {
        character.physicalState.adjustState(stateName, change * efficiency);
      }
    }

    // 应用情绪状态变化
    if (this.emotional && character.emotionalState) {
      const moodEffect = {};
      for (const [emotion, change] of Object.entries(this.emotional)) {
        moodEffect[emotion] = change * efficiency;
      }
      character.emotionalState.adjustMood(moodEffect);
    }

    // 应用技能经验
    if (this.skill && character.skillSystem) {
      for (const [skillName, experience] of Object.entries(this.skill)) {
        character.skillSystem.gainExperience(skillName, experience * efficiency);
      }
    }

    // 应用德行影响
    if (this.virtue && character.virtueSystem) {
      for (const [virtueName, change] of Object.entries(this.virtue)) {
        character.virtueSystem.adjustTrait(virtueName, change * efficiency, 'behavior');
      }
    }

    // 应用资源变化
    if (this.resource && context.resourceSystem) {
      for (const [resourceType, change] of Object.entries(this.resource)) {
        if (change > 0) {
          context.resourceSystem.addResource(resourceType, change * efficiency);
        } else {
          context.resourceSystem.consumeResource(resourceType, Math.abs(change) * efficiency);
        }
      }
    }
  }

  /**
   * 克隆效果对象
   * @returns {BehaviorEffects} 克隆的效果
   */
  clone() {
    return new BehaviorEffects({
      physical: { ...this.physical },
      emotional: { ...this.emotional },
      skill: { ...this.skill },
      virtue: { ...this.virtue },
      social: { ...this.social },
      resource: { ...this.resource },
      special: { ...this.special }
    });
  }
}

// ==================== 行为类 ====================
export class Behavior {
  constructor(name, config = {}) {
    this.name = name;
    this.displayName = config.displayName || name;
    this.description = config.description || '';
    this.category = config.category || '未分类';
    
    // 基础属性
    this.duration = config.duration || 1; // 持续时间（小时）
    this.energyCost = config.energyCost || 10;
    this.priority = config.priority || 'medium'; // low, medium, high, critical
    this.riskLevel = config.riskLevel || 'low'; // low, medium, high, very_high
    
    // 要求和效果
    this.requirements = new BehaviorRequirements(config.requirements || {});
    this.effects = new BehaviorEffects(config.effects || {});
    
    // 行为关系
    this.mutuallyExclusive = config.mutuallyExclusive || []; // 互斥行为
    this.prerequisites = config.prerequisites || [];         // 前置行为
    this.tags = config.tags || [];                          // 行为标签
    
    // 动态修正器
    this.modifiers = new Map();
    
    // 统计数据
    this.statistics = {
      timesExecuted: 0,
      timesSucceeded: 0,
      timesFailed: 0,
      totalDuration: 0,
      averageSuccessRate: 0
    };
  }

  /**
   * 检查行为要求
   * @param {Object} context - 执行上下文
   * @returns {Object} 检查结果
   */
  checkRequirements(context) {
    return this.requirements.checkRequirements(context);
  }

  /**
   * 计算成功率
   * @param {Object} context - 执行上下文
   * @returns {number} 成功率 (0-1)
   */
  calculateSuccessRate(context) {
    let baseRate = 0.7; // 基础成功率
    const character = context.character;

    if (!character) return 0.3;

    // 技能影响
    if (this.requirements.skills) {
      for (const [skillName, requiredLevel] of Object.entries(this.requirements.skills)) {
        const skillLevel = character.getSkillLevel ? character.getSkillLevel(skillName) : 0;
        const skillBonus = Math.min((skillLevel - requiredLevel + 10) / 20, 0.3);
        baseRate += skillBonus;
      }
    }

    // 身体状态影响
    if (character.physicalState) {
      const energyFactor = character.physicalState.energy / 100;
      const healthFactor = character.physicalState.health / 100;
      baseRate *= (energyFactor * 0.3 + healthFactor * 0.2 + 0.5);
    }

    // 情绪状态影响
    if (character.emotionalState) {
      const moodBonus = (character.emotionalState.happiness - 50) / 200;
      const anxietyPenalty = character.emotionalState.anxiety / 200;
      baseRate += moodBonus - anxietyPenalty;
    }

    // 应用修正器
    for (const modifierValue of this.modifiers.values()) {
      baseRate += modifierValue;
    }

    // 天气和地点影响
    if (context.weather && this.requirements.weather.includes(context.weather)) {
      baseRate += 0.1;
    }

    if (context.location && this.requirements.locations.includes(context.location)) {
      baseRate += 0.1;
    }

    return Math.max(0.1, Math.min(1.0, baseRate));
  }

  /**
   * 执行行为
   * @param {Character} character - 执行角色
   * @param {Object} context - 执行上下文
   * @returns {Object} 执行结果
   */
  execute(character, context) {
    // 检查要求
    const requirementCheck = this.checkRequirements(context);
    if (!requirementCheck.canExecute) {
      return {
        success: false,
        reason: requirementCheck.blockers.join(', '),
        behavior: this.name,
        character: character.id,
        timestamp: Date.now()
      };
    }

    // 消耗体力
    if (character.physicalState) {
      character.physicalState.adjustState('energy', -this.energyCost);
    }

    // 计算成功率并判断成功
    const successRate = this.calculateSuccessRate(context);
    const isSuccess = Math.random() < successRate;
    
    // 应用效果
    const efficiency = isSuccess ? 1.0 : 0.3; // 失败时效果打折
    this.effects.apply(character, context, efficiency);
    
    // 更新统计
    this.updateStatistics(isSuccess);
    
    // 记录执行结果
    const result = {
      success: isSuccess,
      behavior: this.name,
      character: character.id,
      duration: this.duration,
      efficiency: efficiency,
      successRate: successRate,
      timestamp: Date.now()
    };
    
    // 添加失败原因
    if (!isSuccess) {
      result.failureReason = this.generateFailureReason(context);
    }
    
    return result;
  }

  /**
   * 生成失败原因
   * @param {Object} context - 执行上下文
   * @returns {string} 失败原因
   */
  generateFailureReason(context) {
    const character = context.character;
    const reasons = [];
    
    if (character.physicalState?.energy < 30) {
      reasons.push('体力不足');
    }
    
    if (character.physicalState?.health < 50) {
      reasons.push('健康状况不佳');
    }
    
    if (character.emotionalState?.anxiety > 70) {
      reasons.push('过于焦虑');
    }
    
    if (context.weather && !this.requirements.weather.includes(context.weather)) {
      reasons.push('天气不利');
    }
    
    if (reasons.length === 0) {
      reasons.push('运气不佳');
    }
    
    return reasons.join('，');
  }

  /**
   * 更新统计数据
   * @param {boolean} success - 是否成功
   */
  updateStatistics(success) {
    this.statistics.timesExecuted++;
    this.statistics.totalDuration += this.duration;
    
    if (success) {
      this.statistics.timesSucceeded++;
    } else {
      this.statistics.timesFailed++;
    }
    
    // 更新平均成功率
    this.statistics.averageSuccessRate = 
      this.statistics.timesSucceeded / this.statistics.timesExecuted;
  }

  /**
   * 添加修正器
   * @param {string} name - 修正器名称
   * @param {number} value - 修正值
   */
  addModifier(name, value) {
    this.modifiers.set(name, value);
  }

  /**
   * 移除修正器
   * @param {string} name - 修正器名称
   */
  removeModifier(name) {
    this.modifiers.delete(name);
  }

  /**
   * 获取行为状态
   * @returns {Object} 行为状态
   */
  getState() {
    return {
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      category: this.category,
      duration: this.duration,
      energyCost: this.energyCost,
      priority: this.priority,
      riskLevel: this.riskLevel,
      statistics: { ...this.statistics },
      modifiers: Object.fromEntries(this.modifiers),
      tags: [...this.tags]
    };
  }

  /**
   * 克隆行为
   * @returns {Behavior} 克隆的行为
   */
  clone() {
    const cloned = new Behavior(this.name, {
      displayName: this.displayName,
      description: this.description,
      category: this.category,
      duration: this.duration,
      energyCost: this.energyCost,
      priority: this.priority,
      riskLevel: this.riskLevel,
      requirements: this.requirements.clone(),
      effects: this.effects.clone(),
      mutuallyExclusive: [...this.mutuallyExclusive],
      prerequisites: [...this.prerequisites],
      tags: [...this.tags]
    });
    
    // 复制修正器
    for (const [name, value] of this.modifiers) {
      cloned.modifiers.set(name, value);
    }
    
    // 复制统计数据
    cloned.statistics = { ...this.statistics };
    
    return cloned;
  }
}

// ==================== 行为系统类 ====================
export class BehaviorSystem {
  constructor(config = {}) {
    this.behaviors = new Map();           // 所有行为定义
    this.activeBehaviors = new Map();     // 当前执行中的行为
    this.behaviorHistory = [];            // 行为历史记录
    
    // 系统配置
    this.maxConcurrentBehaviors = config.maxConcurrentBehaviors || 3;
    this.maxHistoryLength = config.maxHistoryLength || 1000;
    this.autoCleanup = config.autoCleanup !== false;
    
    // 行为分析
    this.behaviorAnalytics = {
      executionCount: new Map(),
      successCount: new Map(),
      failureCount: new Map(),
      averageDuration: new Map()
    };
    
    // 全局修正器
    this.globalModifiers = new Map();
    
    this.initialize();
  }

  /**
   * 初始化行为系统
   */
  initialize() {
    this.createDefaultBehaviors();
    this.setupBehaviorRelations();
    
    console.log('行为系统初始化完成');
  }

  /**
   * 创建默认行为
   */
  createDefaultBehaviors() {
    const behaviorCategories = DEFAULT_CONFIG?.BEHAVIOR_CATEGORIES;
    
    if (!behaviorCategories) {
      console.warn('未找到行为配置，使用默认行为');
      this.createFallbackBehaviors();
      return;
    }
    
    for (const [categoryName, categoryConfig] of Object.entries(behaviorCategories)) {
      for (const actionName of categoryConfig.actions) {
        const behaviorConfig = this.generateBehaviorConfig(actionName, categoryName, categoryConfig);
        const behavior = new Behavior(actionName, behaviorConfig);
        this.behaviors.set(actionName, behavior);
      }
    }
    
    console.log(`创建了 ${this.behaviors.size} 个行为定义`);
  }

  /**
   * 创建备用行为（当配置缺失时）
   */
  createFallbackBehaviors() {
    const fallbackBehaviors = [
      {
        name: '休息睡眠',
        category: '生理需求类',
        duration: 8,
        energyCost: 0,
        effects: { physical: { energy: 50, sleep: 60 } }
      },
      {
        name: '进食饮水',
        category: '生理需求类',
        duration: 1,
        energyCost: 0,
        effects: { physical: { hunger: 40, thirst: 50 } }
      },
      {
        name: '垦荒耕种',
        category: '生产类',
        duration: 6,
        energyCost: 25,
        effects: { skill: { 农业: 5 }, resource: { food: 10 } }
      }
    ];
    
    for (const config of fallbackBehaviors) {
      const behavior = new Behavior(config.name, config);
      this.behaviors.set(config.name, behavior);
    }
  }

  /**
   * 生成行为配置
   * @param {string} actionName - 行为名称
   * @param {string} categoryName - 分类名称
   * @param {Object} categoryConfig - 分类配置
   * @returns {Object} 行为配置
   */
  generateBehaviorConfig(actionName, categoryName, categoryConfig) {
    const config = {
      category: categoryName,
      duration: 2, // 默认2小时
      energyCost: categoryConfig.energyCost || 15,
      priority: this.getPriorityByCategory(categoryName)
    };
    
    // 根据具体行为名称设置特定配置
    const specificConfig = this.getSpecificBehaviorConfig(actionName);
    Object.assign(config, specificConfig);
    
    return config;
  }

  /**
   * 根据分类获取优先级
   * @param {string} categoryName - 分类名称
   * @returns {string} 优先级
   */
  getPriorityByCategory(categoryName) {
    const priorityMap = {
      '生理需求类': 'critical',
      '生产类': 'high',
      '建设类': 'high',
      '社交责任类': 'medium',
      '娱乐类': 'low',
      '研究学习类': 'medium',
      '宗教类': 'low',
      '犯罪类': 'low'
    };
    
    return priorityMap[categoryName] || 'medium';
  }

  /**
   * 获取特定行为配置
   * @param {string} actionName - 行为名称
   * @returns {Object} 特定配置
   */
  getSpecificBehaviorConfig(actionName) {
    const specificConfigs = {
      // 生理需求类
      '进食饮水': {
        duration: 1,
        energyCost: 0,
        priority: 'critical',
        effects: {
          physical: { hunger: 40, thirst: 50, energy: 5 }
        }
      },
      
      '休息睡眠': {
        duration: 8,
        energyCost: 0,
        priority: 'critical',
        requirements: {
          timeOfDay: ['夜晚', '黄昏'],
          locations: ['住宅区']
        },
        effects: {
          physical: { energy: 60, sleep: 80, health: 5 }
        }
      },
      
      '盥洗沐浴': {
        duration: 1,
        energyCost: 5,
        requirements: {
          locations: ['住宅区', '河边'],
          resources: [{ type: 'water', amount: 5 }]
        },
        effects: {
          physical: { cleanliness: 80, temperature: 20 },
          emotional: { happiness: 10 }
        }
      },
      
      // 生产类
      '垦荒耕种': {
        duration: 6,
        energyCost: 30,
        requirements: {
          locations: ['农田', '荒地'],
          skills: { 农业: 1 }
        },
        effects: {
          physical: { energy: -20, muscle: 2 },
          skill: { 农业: 3 },
          resource: { food: 15 }
        }
      },
      
      '手工雕琢': {
        duration: 4,
        energyCost: 20,
        requirements: {
          locations: ['工坊'],
          skills: { 手工: 5 }
        },
        effects: {
          skill: { 手工: 5, 艺术: 2 },
          emotional: { satisfaction: 15 }
        }
      },
      
      // 社交类
      '追求伴侣': {
        duration: 2,
        energyCost: 10,
        requirements: {
          minAge: 16,
          maxAge: 60
        },
        effects: {
          emotional: { happiness: 20, anxiety: 10 },
          social: { romance: 15 }
        }
      },
      
      '赡养老人': {
        duration: 3,
        energyCost: 15,
        effects: {
          virtue: { 利他倾向: 3, 温善倾向: 2 },
          emotional: { satisfaction: 10 }
        }
      }
    };
    
    return specificConfigs[actionName] || {};
  }

  /**
   * 设置行为关系
   */
  setupBehaviorRelations() {
    // 设置互斥行为
    const sleepBehavior = this.behaviors.get('休息睡眠');
    if (sleepBehavior) {
      sleepBehavior.mutuallyExclusive = ['垦荒耕种', '手工雕琢', '追求伴侣'];
    }
    
    // 设置前置行为
    const advancedBehaviors = ['经义研读', '工艺革新'];
    for (const behaviorName of advancedBehaviors) {
      const behavior = this.behaviors.get(behaviorName);
      if (behavior) {
        behavior.prerequisites = ['休息睡眠'];
      }
    }
  }

  /**
   * 获取行为
   * @param {string} behaviorName - 行为名称
   * @returns {Behavior|null} 行为对象
   */
  getBehavior(behaviorName) {
    return this.behaviors.get(behaviorName) || null;
  }

  /**
   * 获取可用行为
   * @param {Object} context - 上下文
   * @returns {Array} 可用行为列表
   */
  getAvailableBehaviors(context) {
    const availableBehaviors = [];
    
    for (const behavior of this.behaviors.values()) {
      const requirementCheck = behavior.checkRequirements(context);
      
      if (requirementCheck.canExecute) {
        // 检查是否与当前执行的行为冲突
        if (!this.hasConflictingBehavior(behavior, context.character?.id)) {
          availableBehaviors.push({
            behavior: behavior,
            successRate: behavior.calculateSuccessRate(context),
            warnings: requirementCheck.warnings
          });
        }
      }
    }
    
    // 按成功率和优先级排序
    availableBehaviors.sort((a, b) => {
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const aPriority = priorityOrder[a.behavior.priority] || 2;
      const bPriority = priorityOrder[b.behavior.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return b.successRate - a.successRate;
    });
    
    return availableBehaviors;
  }

  /**
   * 检查是否有冲突行为
   * @param {Behavior} behavior - 要检查的行为
   * @param {string} characterId - 角色ID
   * @returns {boolean} 是否有冲突
   */
  hasConflictingBehavior(behavior, characterId) {
    if (!characterId) return false;
    
    const activeBehaviorsList = this.activeBehaviors.get(characterId) || [];
    
    for (const activeBehavior of activeBehaviorsList) {
      // 检查互斥行为
      if (behavior.mutuallyExclusive.includes(activeBehavior.name)) {
        return true;
      }
      
      // 检查是否达到最大并发数
      if (activeBehaviorsList.length >= this.maxConcurrentBehaviors) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 开始执行行为
   * @param {string} behaviorName - 行为名称
   * @param {Object} context - 执行上下文
   * @returns {Object} 执行结果
   */
  startBehavior(behaviorName, context) {
    const behavior = this.behaviors.get(behaviorName);
    if (!behavior) {
      return { success: false, reason: '行为不存在' };
    }
    
    const characterId = context.character?.id;
    if (!characterId) {
      return { success: false, reason: '缺少角色信息' };
    }
    
    // 检查是否有冲突
    if (this.hasConflictingBehavior(behavior, characterId)) {
      return { success: false, reason: '与当前行为冲突' };
    }
    
    // 执行行为
    const result = behavior.execute(context.character, context);
    
    if (result.success) {
      // 添加到活动行为列表
      const activeBehaviorsList = this.activeBehaviors.get(characterId) || [];
      activeBehaviorsList.push({
        name: behaviorName,
        startTime: Date.now(),
        duration: behavior.duration,
        character: characterId
      });
      this.activeBehaviors.set(characterId, activeBehaviorsList);
    }
    
    // 记录行为历史
    this.recordBehaviorHistory(behaviorName, characterId, result);
    
    // 更新统计
    this.updateBehaviorAnalytics(behaviorName, result);
    
    return result;
  }

  /**
   * 停止执行行为
   * @param {string} behaviorName - 行为名称
   * @param {string} characterId - 角色ID
   * @returns {boolean} 是否成功停止
   */
  stopBehavior(behaviorName, characterId) {
    const activeBehaviorsList = this.activeBehaviors.get(characterId) || [];
    const behaviorIndex = activeBehaviorsList.findIndex(b => b.name === behaviorName);
    
    if (behaviorIndex >= 0) {
      activeBehaviorsList.splice(behaviorIndex, 1);
      if (activeBehaviorsList.length === 0) {
        this.activeBehaviors.delete(characterId);
      }
      return true;
    }
    
    return false;
  }

  /**
   * 记录行为历史
   * @param {string} behaviorName - 行为名称
   * @param {string} characterId - 角色ID
   * @param {Object} result - 执行结果
   */
  recordBehaviorHistory(behaviorName, characterId, result) {
    const record = {
      behaviorName: behaviorName,
      characterId: characterId,
      timestamp: Date.now(),
      result: result,
      success: result.success
    };
    
    this.behaviorHistory.push(record);
    
    // 保持历史记录在合理范围内
    if (this.behaviorHistory.length > this.maxHistoryLength) {
      this.behaviorHistory.shift();
    }
  }

  /**
   * 更新行为分析统计
   * @param {string} behaviorName - 行为名称
   * @param {Object} result - 执行结果
   */
  updateBehaviorAnalytics(behaviorName, result) {
    // 执行次数
    this.behaviorAnalytics.executionCount.set(
      behaviorName,
      (this.behaviorAnalytics.executionCount.get(behaviorName) || 0) + 1
    );
    
    // 成功/失败次数
    if (result.success) {
      this.behaviorAnalytics.successCount.set(
        behaviorName,
        (this.behaviorAnalytics.successCount.get(behaviorName) || 0) + 1
      );
    } else {
      this.behaviorAnalytics.failureCount.set(
        behaviorName,
        (this.behaviorAnalytics.failureCount.get(behaviorName) || 0) + 1
      );
    }
    
    // 平均持续时间
    const behavior = this.behaviors.get(behaviorName);
    if (behavior) {
      const currentAvg = this.behaviorAnalytics.averageDuration.get(behaviorName) || 0;
      const count = this.behaviorAnalytics.executionCount.get(behaviorName);
      const newAvg = (currentAvg * (count - 1) + behavior.duration) / count;
      this.behaviorAnalytics.averageDuration.set(behaviorName, newAvg);
    }
  }

  /**
   * 获取行为统计
   * @param {string} behaviorName - 行为名称（可选）
   * @returns {Object} 统计数据
   */
  getBehaviorStatistics(behaviorName = null) {
    if (behaviorName) {
      return {
        name: behaviorName,
        executions: this.behaviorAnalytics.executionCount.get(behaviorName) || 0,
        successes: this.behaviorAnalytics.successCount.get(behaviorName) || 0,
        failures: this.behaviorAnalytics.failureCount.get(behaviorName) || 0,
        averageDuration: this.behaviorAnalytics.averageDuration.get(behaviorName) || 0,
        successRate: this.calculateBehaviorSuccessRate(behaviorName)
      };
    }
    
    // 返回所有行为的统计
    const allStats = {};
    for (const [name] of this.behaviors) {
      allStats[name] = this.getBehaviorStatistics(name);
    }
    
    return allStats;
  }

  /**
   * 计算行为成功率
   * @param {string} behaviorName - 行为名称
   * @returns {number} 成功率 (0-1)
   */
  calculateBehaviorSuccessRate(behaviorName) {
    const executions = this.behaviorAnalytics.executionCount.get(behaviorName) || 0;
    const successes = this.behaviorAnalytics.successCount.get(behaviorName) || 0;
    
    return executions > 0 ? successes / executions : 0;
  }

  /**
   * 推荐行为
   * @param {Object} context - 上下文
   * @param {number} count - 推荐数量
   * @returns {Array} 推荐行为列表
   */
  recommendBehaviors(context, count = 5) {
    const availableBehaviors = this.getAvailableBehaviors(context);
    const character = context.character;
    
    if (!character) return [];
    
    // 根据角色状态调整推荐
    const recommendations = availableBehaviors.map(item => {
      const behavior = item.behavior;
      let score = item.successRate * 100;
      
      // 基于角色需求调整分数
      if (character.physicalState) {
        // 优先推荐满足紧急需求的行为
        if (character.physicalState.hunger < 30 && behavior.effects.physical?.hunger > 0) {
          score += 50;
        }
        if (character.physicalState.energy < 30 && behavior.effects.physical?.energy > 0) {
          score += 40;
        }
        if (character.physicalState.health < 50 && behavior.effects.physical?.health > 0) {
          score += 30;
        }
      }
      
      // 基于情绪状态调整
      if (character.emotionalState) {
        if (character.emotionalState.loneliness > 70 && behavior.effects.social) {
          score += 25;
        }
        if (character.emotionalState.boredom > 60 && behavior.category === '娱乐类') {
          score += 20;
        }
      }
      
      // 基于优先级调整
      const priorityBonus = {
        'critical': 30,
        'high': 20,
        'medium': 10,
        'low': 0
      };
      score += priorityBonus[behavior.priority] || 0;
      
      return {
        ...item,
        recommendationScore: score,
        reasoning: this.generateRecommendationReasoning(behavior, character)
      };
    });
    
    // 按推荐分数排序并返回前N个
    return recommendations
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, count);
  }

  /**
   * 生成推荐理由
   * @param {Behavior} behavior - 行为对象
   * @param {Character} character - 角色对象
   * @returns {string} 推荐理由
   */
  generateRecommendationReasoning(behavior, character) {
    const reasons = [];
    
    // 基于生理需求
    if (character.physicalState) {
      if (character.physicalState.hunger < 30 && behavior.effects.physical?.hunger > 0) {
        reasons.push('缓解饥饿');
      }
      if (character.physicalState.energy < 30 && behavior.effects.physical?.energy > 0) {
        reasons.push('恢复体力');
      }
    }
    
    // 基于情绪状态
    if (character.emotionalState) {
      if (character.emotionalState.loneliness > 70 && behavior.effects.social) {
        reasons.push('减少孤独感');
      }
      if (character.emotionalState.happiness < 40 && behavior.effects.emotional?.happiness > 0) {
        reasons.push('提升心情');
      }
    }
    
    // 基于行为类型
    if (behavior.category === '生产类') {
      reasons.push('提升生产技能');
    }
    if (behavior.category === '社交责任类') {
      reasons.push('履行社会责任');
    }
    
    return reasons.length > 0 ? reasons.join('，') : '有助于个人发展';
  }

  /**
   * 添加全局修正器
   * @param {string} name - 修正器名称
   * @param {number} value - 修正值
   */
  addGlobalModifier(name, value) {
    this.globalModifiers.set(name, value);
    
    // 应用到所有行为
    for (const behavior of this.behaviors.values()) {
      behavior.addModifier(`global_${name}`, value);
    }
  }

  /**
   * 移除全局修正器
   * @param {string} name - 修正器名称
   */
  removeGlobalModifier(name) {
    this.globalModifiers.delete(name);
    
    // 从所有行为中移除
    for (const behavior of this.behaviors.values()) {
      behavior.removeModifier(`global_${name}`);
    }
  }

  /**
   * 获取角色当前活动行为
   * @param {string} characterId - 角色ID
   * @returns {Array} 活动行为列表
   */
  getCharacterActiveBehaviors(characterId) {
    return this.activeBehaviors.get(characterId) || [];
  }

  /**
   * 更新活动行为（处理完成的行为）
   * @param {number} currentTime - 当前时间戳
   */
  updateActiveBehaviors(currentTime = Date.now()) {
    for (const [characterId, activeBehaviorsList] of this.activeBehaviors) {
      // 过滤掉已完成的行为
      const ongoingBehaviors = activeBehaviorsList.filter(activeBehavior => {
        const elapsedHours = (currentTime - activeBehavior.startTime) / (1000 * 60 * 60);
        return elapsedHours < activeBehavior.duration;
      });
      
      if (ongoingBehaviors.length === 0) {
        this.activeBehaviors.delete(characterId);
      } else {
        this.activeBehaviors.set(characterId, ongoingBehaviors);
      }
    }
  }

  /**
   * 触发行为事件
   * @param {string} eventType - 事件类型
   * @param {Object} eventData - 事件数据
   */
  emitBehaviorEvent(eventType, eventData) {
    // 这里可以与游戏引擎的事件系统集成
    console.log(`行为事件: ${eventType}`, eventData);
  }

  /**
   * 清理过期数据
   */
  cleanup() {
    if (!this.autoCleanup) return;
    
    const currentTime = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
    
    // 清理过期的行为历史
    this.behaviorHistory = this.behaviorHistory.filter(
      record => currentTime - record.timestamp < maxAge
    );
    
    // 清理已完成的激活行为
    this.updateActiveBehaviors(currentTime);
  }

  /**
   * 获取系统状态
   * @returns {Object} 系统状态
   */
  getState() {
    const state = {
      behaviorCount: this.behaviors.size,
      activeCharacters: this.activeBehaviors.size,
      historyLength: this.behaviorHistory.length,
      globalModifiers: Object.fromEntries(this.globalModifiers),
      recentHistory: this.behaviorHistory.slice(-20),
      analytics: {
        mostExecuted: this.getMostExecutedBehaviors(5),
        highestSuccessRate: this.getHighestSuccessRateBehaviors(5),
        averageExecutionTime: this.getAverageExecutionTime()
      }
    };
    
    return state;
  }

  /**
   * 获取最常执行的行为
   * @param {number} count - 数量
   * @returns {Array} 行为列表
   */
  getMostExecutedBehaviors(count = 5) {
    const executions = Array.from(this.behaviorAnalytics.executionCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count);
    
    return executions.map(([name, count]) => ({ name, count }));
  }

  /**
   * 获取成功率最高的行为
   * @param {number} count - 数量
   * @returns {Array} 行为列表
   */
  getHighestSuccessRateBehaviors(count = 5) {
    const behaviors = Array.from(this.behaviors.keys())
      .map(name => ({
        name,
        successRate: this.calculateBehaviorSuccessRate(name),
        executions: this.behaviorAnalytics.executionCount.get(name) || 0
      }))
      .filter(item => item.executions > 0)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, count);
    
    return behaviors;
  }

  /**
   * 获取平均执行时间
   * @returns {number} 平均执行时间（小时）
   */
  getAverageExecutionTime() {
    const durations = Array.from(this.behaviorAnalytics.averageDuration.values());
    return durations.length > 0 ? 
      durations.reduce((sum, duration) => sum + duration, 0) / durations.length : 0;
  }

  /**
   * 设置系统状态
   * @param {Object} state - 系统状态
   */
  setState(state) {
    if (state.globalModifiers) {
      this.globalModifiers = new Map(Object.entries(state.globalModifiers));
    }
    
    if (state.recentHistory) {
      this.behaviorHistory = [...state.recentHistory];
    }
    
    console.log('行为系统状态已恢复');
  }

  /**
   * 克隆行为系统
   * @returns {BehaviorSystem} 克隆的系统
   */
  clone() {
    const cloned = new BehaviorSystem({
      maxConcurrentBehaviors: this.maxConcurrentBehaviors,
      maxHistoryLength: this.maxHistoryLength,
      autoCleanup: this.autoCleanup
    });
    
    // 复制行为定义
    for (const [behaviorName, behavior] of this.behaviors) {
      cloned.behaviors.set(behaviorName, behavior.clone());
    }
    
    // 复制全局修正器
    cloned.globalModifiers = new Map(this.globalModifiers);
    
    return cloned;
  }

  /**
   * 销毁行为系统
   */
  destroy() {
    this.behaviors.clear();
    this.activeBehaviors.clear();
    this.behaviorHistory = [];
    this.behaviorAnalytics = {
      executionCount: new Map(),
      successCount: new Map(),
      failureCount: new Map(),
      averageDuration: new Map()
    };
    this.globalModifiers.clear();
    
    console.log('行为系统已销毁');
  }
}

// ==================== 行为工具函数 ====================
export const BehaviorUtils = {
  /**
   * 分析行为模式
   * @param {BehaviorSystem} behaviorSystem - 行为系统
   * @param {string} characterId - 角色ID
   * @param {number} days - 分析天数
   * @returns {Object} 行为模式分析
   */
  analyzeBehaviorPattern(behaviorSystem, characterId, days = 30) {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const characterHistory = behaviorSystem.behaviorHistory.filter(
      record => record.characterId === characterId && record.timestamp > cutoffTime
    );
    
    const analysis = {
      totalBehaviors: characterHistory.length,
      favoriteCategories: {},
      timeDistribution: {},
      successRate: 0,
      productivity: 0,
      socialness: 0
    };
    
    let successCount = 0;
    let productiveBehaviors = 0;
    let socialBehaviors = 0;
    
    for (const record of characterHistory) {
      const behavior = behaviorSystem.getBehavior(record.behaviorName);
      if (!behavior) continue;
      
      // 分类统计
      const category = behavior.category;
      analysis.favoriteCategories[category] = (analysis.favoriteCategories[category] || 0) + 1;
      
      // 成功率统计
      if (record.result.success) {
        successCount++;
      }
      
      // 生产性行为统计
      if (['生产类', '建设类', '研究学习类'].includes(category)) {
        productiveBehaviors++;
      }
      
      // 社交行为统计
      if (['社交责任类', '娱乐类'].includes(category)) {
        socialBehaviors++;
      }
    }
    
    if (characterHistory.length > 0) {
      analysis.successRate = Math.round((successCount / characterHistory.length) * 100);
      analysis.productivity = Math.round((productiveBehaviors / characterHistory.length) * 100);
      analysis.socialness = Math.round((socialBehaviors / characterHistory.length) * 100);
    }
    
    return analysis;
  },

  /**
   * 计算行为兼容性
   * @param {Behavior} behavior1 - 行为1
   * @param {Behavior} behavior2 - 行为2
   * @returns {number} 兼容性分数 (0-1)
   */
  calculateBehaviorCompatibility(behavior1, behavior2) {
    let compatibility = 1.0;
    
    // 互斥行为完全不兼容
    if (behavior1.mutuallyExclusive.includes(behavior2.name) ||
        behavior2.mutuallyExclusive.includes(behavior1.name)) {
      return 0;
    }
    
    // 同类行为兼容性较高
    if (behavior1.category === behavior2.category) {
      compatibility += 0.2;
    }
    
    // 优先级差异影响兼容性
    const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    const priority1 = priorityOrder[behavior1.priority] || 2;
    const priority2 = priorityOrder[behavior2.priority] || 2;
    const priorityDiff = Math.abs(priority1 - priority2);
    compatibility -= priorityDiff * 0.1;
    
    // 体力消耗冲突
    const totalEnergyCost = behavior1.energyCost + behavior2.energyCost;
    if (totalEnergyCost > 50) {
      compatibility -= 0.3;
    }
    
    return Math.max(0, Math.min(1, compatibility));
  },

  /**
   * 优化行为序列
   * @param {Array} behaviors - 行为列表
   * @param {Object} constraints - 约束条件
   * @returns {Array} 优化后的行为序列
   */
  optimizeBehaviorSequence(behaviors, constraints = {}) {
    const maxDuration = constraints.maxDuration || 12; // 最大持续时间（小时）
    const maxEnergy = constraints.maxEnergy || 100;    // 最大体力消耗
    
    // 按优先级和效率排序
    const sortedBehaviors = behaviors.sort((a, b) => {
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // 计算效率（效果/成本比）
      const aEfficiency = (a.effects ? Object.keys(a.effects).length : 1) / (a.energyCost || 1);
      const bEfficiency = (b.effects ? Object.keys(b.effects).length : 1) / (b.energyCost || 1);
      
      return bEfficiency - aEfficiency;
    });
    
    // 贪心算法选择行为
    const optimizedSequence = [];
    let totalDuration = 0;
    let totalEnergy = 0;
    
    for (const behavior of sortedBehaviors) {
      if (totalDuration + behavior.duration <= maxDuration &&
          totalEnergy + behavior.energyCost <= maxEnergy) {
        
        // 检查与已选行为的兼容性
        const isCompatible = optimizedSequence.every(selected => 
          BehaviorUtils.calculateBehaviorCompatibility(behavior, selected) > 0.5
        );
        
        if (isCompatible) {
          optimizedSequence.push(behavior);
          totalDuration += behavior.duration;
          totalEnergy += behavior.energyCost;
        }
      }
    }
    
    return optimizedSequence;
  },

  /**
   * 生成行为建议
   * @param {Character} character - 角色对象
   * @param {Object} context - 上下文
   * @returns {Object} 行为建议
   */
  generateBehaviorSuggestions(character, context) {
    const suggestions = {
      urgent: [],      // 紧急行为
      recommended: [], // 推荐行为
      optional: []     // 可选行为
    };
    
    // 检查紧急需求
    if (character.physicalState) {
      if (character.physicalState.hunger < 20) {
        suggestions.urgent.push({
          behavior: '进食饮水',
          reason: '饥饿程度过高',
          priority: 'critical'
        });
      }
      
      if (character.physicalState.energy < 15) {
        suggestions.urgent.push({
          behavior: '休息睡眠',
          reason: '体力严重不足',
          priority: 'critical'
        });
      }
    }
    
    // 基于角色特征推荐
    if (character.virtueSystem) {
      const virtueTraits = character.virtueSystem.getAllTraits();
      
      // 勤奋的角色推荐生产行为
      if (virtueTraits['忙碌倾向'] > 60) {
        suggestions.recommended.push({
          behavior: '垦荒耕种',
          reason: '符合勤奋特质',
          priority: 'medium'
        });
      }
      
      // 社交型角色推荐社交行为
      if (virtueTraits['合群倾向'] > 60) {
        suggestions.recommended.push({
          behavior: '追求伴侣',
          reason: '符合社交特质',
          priority: 'medium'
        });
      }
    }
    
    return suggestions;
  }
};

// ==================== 行为决策引擎 ====================
export class BehaviorDecisionEngine {
  constructor(behaviorSystem) {
    this.behaviorSystem = behaviorSystem;
    this.decisionHistory = [];
    this.learningRate = 0.1;
    this.explorationRate = 0.2;
  }

  /**
   * 为角色选择最佳行为
   * @param {Character} character - 角色对象
   * @param {Object} context - 上下文
   * @returns {string|null} 选择的行为名称
   */
  selectOptimalBehavior(character, context) {
    const availableBehaviors = this.behaviorSystem.getAvailableBehaviors(context);
    
    if (availableBehaviors.length === 0) {
      return null;
    }
    
    // 获取行为建议
    const suggestions = BehaviorUtils.generateBehaviorSuggestions(character, context);
    
    // 优先处理紧急行为
    if (suggestions.urgent.length > 0) {
      const urgentBehavior = suggestions.urgent[0];
      return urgentBehavior.behavior;
    }
    
    // ε-贪心策略：平衡探索和利用
    if (Math.random() < this.explorationRate) {
      // 探索：随机选择
      const randomIndex = Math.floor(Math.random() * availableBehaviors.length);
      return availableBehaviors[randomIndex].behavior.name;
    } else {
      // 利用：选择最优行为
      const scored = availableBehaviors.map(item => ({
        ...item,
        score: this.calculateBehaviorScore(item.behavior, character, context)
      }));
      
      scored.sort((a, b) => b.score - a.score);
      return scored[0].behavior.name;
    }
  }

  /**
   * 计算行为评分
   * @param {Behavior} behavior - 行为对象
   * @param {Character} character - 角色对象
   * @param {Object} context - 上下文
   * @returns {number} 行为评分
   */
  calculateBehaviorScore(behavior, character, context) {
    let score = 0;
    
    // 基础成功率权重
    score += behavior.calculateSuccessRate(context) * 50;
    
    // 优先级权重
    const priorityWeights = { 'critical': 40, 'high': 30, 'medium': 20, 'low': 10 };
    score += priorityWeights[behavior.priority] || 20;
    
    // 需求满足度权重
    if (character.physicalState && behavior.effects.physical) {
      for (const [stateName, effect] of Object.entries(behavior.effects.physical)) {
        const currentState = character.physicalState[stateName] || 50;
        const needLevel = 100 - currentState;
        if (effect > 0 && needLevel > 30) {
          score += needLevel * 0.5;
        }
      }
    }
    
    // 技能发展权重
    if (character.skillSystem && behavior.effects.skill) {
      for (const [skillName, experience] of Object.entries(behavior.effects.skill)) {
        const skillLevel = character.getSkillLevel ? character.getSkillLevel(skillName) : 0;
        if (skillLevel < 50) { // 优先发展低等级技能
          score += experience * (50 - skillLevel) * 0.1;
        }
      }
    }
    
    // 历史表现权重
    const behaviorStats = this.behaviorSystem.getBehaviorStatistics(behavior.name);
    if (behaviorStats.executions > 0) {
      score += behaviorStats.successRate * 20;
    }
    
    return score;
  }

  /**
   * 学习和调整决策参数
   * @param {string} behaviorName - 执行的行为
   * @param {Object} result - 执行结果
   * @param {Character} character - 角色对象
   */
  learnFromResult(behaviorName, result, character) {
    const decision = {
      behaviorName: behaviorName,
      success: result.success,
      timestamp: Date.now(),
      characterId: character.id
    };
    
    this.decisionHistory.push(decision);
    
    // 简单的学习机制：调整探索率
    if (result.success) {
      this.explorationRate = Math.max(0.1, this.explorationRate - this.learningRate * 0.01);
    } else {
      this.explorationRate = Math.min(0.3, this.explorationRate + this.learningRate * 0.01);
    }
    
    // 保持决策历史在合理范围内
    if (this.decisionHistory.length > 1000) {
      this.decisionHistory.shift();
    }
  }

  /**
   * 获取决策统计
   * @returns {Object} 决策统计数据
   */
  getDecisionStatistics() {
    const recentDecisions = this.decisionHistory.slice(-100);
    const successCount = recentDecisions.filter(d => d.success).length;
    
    return {
      totalDecisions: this.decisionHistory.length,
      recentSuccessRate: recentDecisions.length > 0 ? successCount / recentDecisions.length : 0,
      currentExplorationRate: this.explorationRate,
      averageDecisionsPerCharacter: this.decisionHistory.length / (new Set(this.decisionHistory.map(d => d.characterId)).size || 1)
    };
  }
}

// ==================== 导出模块 ====================
export { BehaviorSystem as default };

// 使用示例
/*
// 创建行为系统
const behaviorSystem = new BehaviorSystem();

// 创建决策引擎
const decisionEngine = new BehaviorDecisionEngine(behaviorSystem);

// 为角色选择行为
const context = {
  character: someCharacter,
  location: '农田',
  weather: '晴朗',
  timeOfDay: '上午',
  resourceSystem: gameResourceSystem
};

const chosenBehavior = decisionEngine.selectOptimalBehavior(someCharacter, context);
if (chosenBehavior) {
  const result = behaviorSystem.startBehavior(chosenBehavior, context);
  decisionEngine.learnFromResult(chosenBehavior, result, someCharacter);
}

// 获取系统状态
const systemState = behaviorSystem.getState();
console.log('行为系统状态:', systemState);

// 分析角色行为模式
const behaviorPattern = BehaviorUtils.analyzeBehaviorPattern(behaviorSystem, someCharacter.id);
console.log('角色行为模式:', behaviorPattern);
*/