/**
 * ActionProcessor.js - 南北朝坞堡模拟器行为处理器
 * 
 * 功能：处理和执行角色的具体行动
 * 优先级：⭐⭐⭐⭐ (第三阶段核心模块)
 * 
 * 主要职责：
 * - 验证行为的可执行性
 * - 计算行为结果和影响
 * - 处理并发行为冲突
 * - 应用技能和德行影响
 * - 生成行为反馈和记忆
 * - 更新角色状态和资源
 */

import { DEFAULT_CONFIG } from './gameConfig.js';

const {
  BEHAVIOR_CATEGORIES,
  VIRTUE_SYSTEM,
  SKILL_CATEGORIES,
  LOCATIONS,
  RESOURCE_TYPES,
  BALANCE_CONFIG,
  TIME_OF_DAY
} = DEFAULT_CONFIG;

export class ActionProcessor {
  constructor(resourceSystem, memorySystem, relationshipSystem = null) {
    this.resourceSystem = resourceSystem;
    this.memorySystem = memorySystem;
    this.relationshipSystem = relationshipSystem;
    
    // 行为配置
    this.actionConfig = {
      // 行为执行时间（分钟）
      actionDuration: {
        "进食饮水": 30,
        "休息睡眠": 480, // 8小时
        "垦荒耕种": 240, // 4小时
        "手工雕琢": 180,
        "坞堡营造": 360, // 6小时
        "社集看戏": 120,
        "商铺经营": 300,
        "经义研读": 180,
        "祝祷祭祀": 60,
        "击剑格斗": 90
      },
      
      // 技能经验获得倍数
      skillExpMultiplier: {
        "垦荒耕种": 1.0,
        "手工雕琢": 1.2,
        "熔炼铸锻": 1.5,
        "经义研读": 2.0,
        "商铺经营": 0.8,
        "击剑格斗": 1.3
      },
      
      // 德行影响系数
      virtueImpactCoeff: 0.3,
      
      // 基础成功率
      baseSuccessRate: 0.7
    };
    
    // 当前执行中的行为队列
    this.activeActions = new Map(); // characterId -> actionData
    this.actionQueue = []; // 待处理的行为队列
    
    // 行为结果缓存
    this.resultCache = new Map();
    this.cacheTimeout = 100;
    
    // 统计数据
    this.stats = {
      actionsProcessed: 0,
      successfulActions: 0,
      failedActions: 0,
      averageSuccessRate: 0,
      actionsByCategory: {},
      skillGainTotal: 0,
      virtueChangesTotal: 0
    };
    
    // 行为验证器
    this.validators = new Map();
    this._initializeValidators();
    
    // 行为处理器
    this.handlers = new Map();
    this._initializeHandlers();
  }

  /**
   * 处理角色行为（主要入口方法）
   * @param {Object} character - 角色对象
   * @param {Object} action - 行为对象
   * @param {Object} context - 环境上下文
   * @returns {Object} 处理结果
   */
  processAction(character, action, context) {
    const startTime = performance.now();
    
    try {
      // 1. 验证行为可执行性
      const validation = this.validateAction(character, action, context);
      if (!validation.valid) {
        return this._createFailureResult(action, validation.reason, character);
      }
      
      // 2. 检查并发冲突
      const conflictCheck = this._checkActionConflicts(character, action);
      if (conflictCheck.hasConflict) {
        return this._handleActionConflict(character, action, conflictCheck);
      }
      
      // 3. 计算行为结果
      const outcome = this.calculateOutcome(character, action, context);
      
      // 4. 执行行为效果
      const effects = this._executeActionEffects(character, action, outcome, context);
      
      // 5. 更新角色状态
      this._updateCharacterState(character, action, effects);
      
      // 6. 生成记忆
      this._createActionMemory(character, action, outcome, context);
      
      // 7. 处理资源变化
      this._handleResourceChanges(character, action, effects);
      
      // 8. 处理关系影响
      this._handleRelationshipEffects(character, action, effects, context);
      
      // 9. 记录行为到活动队列
      this._recordActiveAction(character, action, outcome);
      
      // 10. 生成最终结果
      const result = this._createSuccessResult(action, outcome, effects, character);
      
      // 更新统计
      this._updateStats(result, performance.now() - startTime);
      
      return result;
      
    } catch (error) {
      console.error('行为处理错误:', error);
      return this._createErrorResult(action, error.message, character);
    }
  }

  /**
   * 验证行为可执行性
   * @param {Object} character - 角色对象
   * @param {Object} action - 行为对象
   * @param {Object} context - 环境上下文
   * @returns {Object} 验证结果
   */
  validateAction(character, action, context) {
    const actionName = action.action;
    const location = action.location;
    
    // 基础验证
    const basicValidation = this._validateBasicRequirements(character, action, context);
    if (!basicValidation.valid) {
      return basicValidation;
    }
    
    // 使用专用验证器
    const validator = this.validators.get(actionName);
    if (validator) {
      const customValidation = validator(character, action, context);
      if (!customValidation.valid) {
        return customValidation;
      }
    }
    
    // 地点验证
    const locationValidation = this._validateLocation(character, action, context);
    if (!locationValidation.valid) {
      return locationValidation;
    }
    
    // 资源验证
    const resourceValidation = this._validateResources(character, action);
    if (!resourceValidation.valid) {
      return resourceValidation;
    }
    
    // 技能验证
    const skillValidation = this._validateSkills(character, action);
    if (!skillValidation.valid) {
      return skillValidation;
    }
    
    // 时间验证
    const timeValidation = this._validateTiming(action, context);
    if (!timeValidation.valid) {
      return timeValidation;
    }
    
    return { valid: true, reason: "所有验证通过" };
  }

  /**
   * 计算行为结果
   * @param {Object} character - 角色对象
   * @param {Object} action - 行为对象
   * @param {Object} context - 环境上下文
   * @returns {Object} 行为结果
   */
  calculateOutcome(character, action, context) {
    const actionName = action.action;
    
    // 检查缓存
    const cacheKey = this._generateOutcomeCacheKey(character, action, context);
    if (this.resultCache.has(cacheKey)) {
      return this.resultCache.get(cacheKey);
    }
    
    // 计算基础成功率
    let successRate = this.actionConfig.baseSuccessRate;
    
    // 技能影响
    const skillInfluence = this._calculateSkillInfluence(character, action);
    successRate += skillInfluence.bonus;
    
    // 德行影响
    const virtueInfluence = this._calculateVirtueInfluence(character, action);
    successRate += virtueInfluence.bonus * this.actionConfig.virtueImpactCoeff;
    
    // 环境影响
    const environmentInfluence = this._calculateEnvironmentInfluence(action, context);
    successRate += environmentInfluence.bonus;
    
    // 角色状态影响
    const statusInfluence = this._calculateStatusInfluence(character, action);
    successRate += statusInfluence.bonus;
    
    // 记忆和经验影响
    const experienceInfluence = this._calculateExperienceInfluence(character, action);
    successRate += experienceInfluence.bonus;
    
    // 确保成功率在合理范围内
    successRate = Math.max(0.05, Math.min(0.95, successRate));
    
    // 判定成功失败
    const isSuccess = Math.random() < successRate;
    
    // 计算效果强度
    const effectIntensity = this._calculateEffectIntensity(
      character, action, isSuccess, successRate
    );
    
    // 计算具体效果
    const specificEffects = this._calculateSpecificEffects(
      character, action, effectIntensity, context
    );
    
    const outcome = {
      success: isSuccess,
      successRate,
      effectIntensity,
      skillInfluence,
      virtueInfluence,
      environmentInfluence,
      statusInfluence,
      experienceInfluence,
      specificEffects,
      timestamp: context.currentTime || Date.now()
    };
    
    // 缓存结果
    this.resultCache.set(cacheKey, outcome);
    
    return outcome;
  }

  /**
   * 应用行为效果到角色
   * @param {Object} character - 角色对象
   * @param {Object} effects - 效果对象
   */
  applyEffects(character, effects) {
    try {
      // 应用属性变化
      if (effects.attributeChanges) {
        for (const [attr, change] of Object.entries(effects.attributeChanges)) {
          if (character[attr] !== undefined) {
            character[attr] = Math.max(0, character[attr] + change);
          }
        }
      }
      
      // 应用需求变化
      if (effects.needsChanges) {
        character.needs = character.needs || {};
        for (const [need, change] of Object.entries(effects.needsChanges)) {
          character.needs[need] = Math.max(0, Math.min(100, 
            (character.needs[need] || 50) + change
          ));
        }
      }
      
      // 应用技能变化
      if (effects.skillChanges) {
        character.skills = character.skills || {};
        for (const [skill, change] of Object.entries(effects.skillChanges)) {
          const currentLevel = character.skills[skill] || 0;
          character.skills[skill] = Math.max(0, Math.min(100, currentLevel + change));
        }
      }
      
      // 应用德行变化
      if (effects.virtueChanges) {
        character.virtues = character.virtues || {};
        for (const [virtue, change] of Object.entries(effects.virtueChanges)) {
          const currentLevel = character.virtues[virtue] || 50;
          character.virtues[virtue] = Math.max(0, Math.min(100, currentLevel + change));
        }
      }
      
      // 应用健康变化
      if (effects.healthChange) {
        character.health = Math.max(0, Math.min(100, 
          (character.health || 100) + effects.healthChange
        ));
      }
      
      // 应用情绪变化
      if (effects.moodChange) {
        character.mood = Math.max(-100, Math.min(100, 
          (character.mood || 0) + effects.moodChange
        ));
      }
      
    } catch (error) {
      console.error('应用效果失败:', error);
    }
  }

  /**
   * 处理行为失败
   * @param {Object} character - 角色对象
   * @param {Object} action - 行为对象
   * @param {string} failure_reason - 失败原因
   * @returns {Object} 失败处理结果
   */
  handleFailure(character, action, failure_reason) {
    // 创建失败记忆
    if (this.memorySystem) {
      this.memorySystem.addMemory(character.id, {
        type: 'failure',
        action: action.action,
        location: action.location,
        reason: failure_reason,
        description: `尝试${action.action}失败：${failure_reason}`
      }, 0.3, -0.2); // 中等重要性，轻微负面情感
    }
    
    // 轻微的负面影响
    const failureEffects = {
      moodChange: -5,
      needsChanges: {
        energy: -2
      }
    };
    
    this.applyEffects(character, failureEffects);
    
    return {
      success: false,
      reason: failure_reason,
      effects: failureEffects,
      message: `${character.name}尝试${action.action}失败：${failure_reason}`
    };
  }

  /**
   * 获取行为要求
   * @param {string} actionName - 行为名称
   * @returns {Object} 行为要求
   */
  getActionRequirements(actionName) {
    const requirements = {
      energy: 10,
      resources: {},
      skills: {},
      tools: false,
      location: null,
      timeSlots: [],
      prerequisites: []
    };
    
    // 根据行为类型设置要求
    for (const [category, config] of Object.entries(BEHAVIOR_CATEGORIES)) {
      if (config.actions.includes(actionName)) {
        requirements.energy = config.energyCost || 10;
        requirements.timeSlots = Array.isArray(config.timeSlots) ? 
          config.timeSlots : Object.keys(config.timeSlots || {});
        break;
      }
    }
    
    // 特定行为的特殊要求
    switch (actionName) {
      case "垦荒耕种":
        requirements.resources = { tools: 1 };
        requirements.skills = { "垦荒耕种": 10 };
        requirements.location = "农田";
        break;
        
      case "手工雕琢":
        requirements.resources = { wood: 2, tools: 1 };
        requirements.skills = { "手工雕琢": 15 };
        requirements.location = "工坊";
        break;
        
      case "熔炼铸锻":
        requirements.resources = { metal: 1, wood: 3, tools: 1 };
        requirements.skills = { "熔炼铸锻": 20 };
        requirements.location = "工坊";
        break;
        
      case "坞堡营造":
        requirements.resources = { stone: 5, wood: 3, tools: 1 };
        requirements.skills = { "坞堡营造": 25 };
        requirements.location = "城墙";
        break;
        
      case "商铺经营":
        requirements.resources = { cloth: 1 };
        requirements.location = "市集";
        break;
        
      case "经义研读":
        requirements.skills = { "经义研读": 5 };
        requirements.location = "祠堂";
        break;
    }
    
    return requirements;
  }

  // ==================== 私有方法 ====================

  /**
   * 初始化验证器
   */
  _initializeValidators() {
    // 生理需求验证器
    this.validators.set("进食饮水", (character, action, context) => {
      if (!this.resourceSystem.hasResource('food', 1)) {
        return { valid: false, reason: "没有足够的食物" };
      }
      return { valid: true };
    });
    
    this.validators.set("休息睡眠", (character, action, context) => {
      if (character.needs?.energy > 80) {
        return { valid: false, reason: "精力充沛，暂时不需要休息" };
      }
      return { valid: true };
    });
    
    // 生产活动验证器
    this.validators.set("垦荒耕种", (character, action, context) => {
      if (context.weather?.type === '雪天') {
        return { valid: false, reason: "雪天无法耕种" };
      }
      if (!this.resourceSystem.hasResource('tools', 1)) {
        return { valid: false, reason: "缺少农具" };
      }
      return { valid: true };
    });
    
    this.validators.set("熔炼铸锻", (character, action, context) => {
      if (!this.resourceSystem.hasResource('metal', 1)) {
        return { valid: false, reason: "缺少金属原料" };
      }
      if (!this.resourceSystem.hasResource('wood', 3)) {
        return { valid: false, reason: "缺少燃料木材" };
      }
      return { valid: true };
    });
    
    // 社交活动验证器
    this.validators.set("觅求好友", (character, action, context) => {
      const locationPeople = context.locationPopulation?.[action.location] || [];
      if (locationPeople.length <= 1) {
        return { valid: false, reason: "此地无其他人可以交友" };
      }
      return { valid: true };
    });
  }

  /**
   * 初始化行为处理器
   */
  _initializeHandlers() {
    // 这里可以为特定行为添加专门的处理逻辑
    this.handlers.set("商铺经营", (character, action, outcome, context) => {
      // 商业行为的特殊处理逻辑
      const tradeBonus = character.skills?.["商业贸易"] || 0;
      outcome.specificEffects.incomeBonus = tradeBonus * 0.1;
    });
    
    this.handlers.set("祝祷祭祀", (character, action, outcome, context) => {
      // 宗教活动的特殊处理
      const virtueBonus = (character.virtues?.礼 || 50) / 100;
      outcome.specificEffects.spiritualGain = virtueBonus * 10;
    });
  }

  /**
   * 基础需求验证
   */
  _validateBasicRequirements(character, action, context) {
    // 体力检查
    const energyRequired = this.actionConfig.actionDuration[action.action] / 60 * 5 || 10;
    if ((character.needs?.energy || 50) < energyRequired * 0.3) {
      return { valid: false, reason: "体力不足" };
    }
    
    // 健康检查
    if ((character.health || 100) < 20 && this._isPhysicalAction(action.action)) {
      return { valid: false, reason: "健康状况不允许进行体力活动" };
    }
    
    // 基本存活需求检查
    if ((character.needs?.hunger || 50) < 10) {
      if (action.action !== "进食饮水") {
        return { valid: false, reason: "饥饿难耐，需要先进食" };
      }
    }
    
    if ((character.needs?.thirst || 50) < 10) {
      if (action.action !== "进食饮水" && action.action !== "汲水") {
        return { valid: false, reason: "口渴难耐，需要先饮水" };
      }
    }
    
    return { valid: true };
  }

  /**
   * 地点验证
   */
  _validateLocation(character, action, context) {
    const location = action.location;
    const locationConfig = LOCATIONS[location];
    
    if (!locationConfig) {
      return { valid: false, reason: "未知的地点" };
    }
    
    if (!locationConfig.availableActions.includes(action.action)) {
      return { valid: false, reason: `在${location}无法进行${action.action}` };
    }
    
    // 容量检查
    const currentPeople = context.locationPopulation?.[location]?.length || 0;
    if (currentPeople >= locationConfig.capacity) {
      return { valid: false, reason: `${location}人员已满` };
    }
    
    return { valid: true };
  }

  /**
   * 资源验证
   */
  _validateResources(character, action) {
    const requirements = this.getActionRequirements(action.action);
    
    for (const [resourceType, amount] of Object.entries(requirements.resources)) {
      if (!this.resourceSystem.hasResource(resourceType, amount)) {
        const resourceName = RESOURCE_TYPES[resourceType]?.name || resourceType;
        return { 
          valid: false, 
          reason: `缺少${resourceName}（需要${amount}，现有${this.resourceSystem.getResourceAmount(resourceType)}）` 
        };
      }
    }
    
    return { valid: true };
  }

  /**
   * 技能验证
   */
  _validateSkills(character, action) {
    const requirements = this.getActionRequirements(action.action);
    
    for (const [skillName, minLevel] of Object.entries(requirements.skills)) {
      const currentLevel = character.skills?.[skillName] || 0;
      if (currentLevel < minLevel) {
        return { 
          valid: false, 
          reason: `${skillName}技能不足（需要${minLevel}，当前${currentLevel}）` 
        };
      }
    }
    
    return { valid: true };
  }

  /**
   * 时间验证
   */
  _validateTiming(action, context) {
    const requirements = this.getActionRequirements(action.action);
    const currentTimeSlot = context.timeOfDay;
    
    if (requirements.timeSlots.length > 0 && 
        !requirements.timeSlots.includes(currentTimeSlot)) {
      return { 
        valid: false, 
        reason: `${action.action}不适合在${currentTimeSlot}进行` 
      };
    }
    
    return { valid: true };
  }

  /**
   * 检查行为冲突
   */
  _checkActionConflicts(character, action) {
    const activeAction = this.activeActions.get(character.id);
    
    if (activeAction && !activeAction.canInterrupt) {
      return {
        hasConflict: true,
        conflictType: 'busy',
        activeAction: activeAction.action,
        remainingTime: activeAction.endTime - Date.now()
      };
    }
    
    // 检查资源冲突（多人使用同一资源）
    const requirements = this.getActionRequirements(action.action);
    for (const [resourceType, amount] of Object.entries(requirements.resources)) {
      const available = this.resourceSystem.getAvailableResourceAmount(resourceType);
      if (available < amount) {
        return {
          hasConflict: true,
          conflictType: 'resource',
          resource: resourceType,
          needed: amount,
          available: available
        };
      }
    }
    
    return { hasConflict: false };
  }

  /**
   * 计算技能影响
   */
  _calculateSkillInfluence(character, action) {
    let bonus = 0;
    let details = {};
    
    // 主要技能影响
    const requiredSkills = this.getActionRequirements(action.action).skills;
    for (const [skillName, minLevel] of Object.entries(requiredSkills)) {
      const skillLevel = character.skills?.[skillName] || 0;
      const skillBonus = (skillLevel - minLevel) * 0.005; // 超出最低要求的技能加成
      bonus += Math.max(0, skillBonus);
      details[skillName] = skillLevel;
    }
    
    // 相关技能影响
    const relatedSkills = this._getRelatedSkills(action.action);
    for (const skillName of relatedSkills) {
      const skillLevel = character.skills?.[skillName] || 0;
      const skillBonus = skillLevel * 0.002; // 相关技能的轻微加成
      bonus += skillBonus;
    }
    
    return { bonus, details };
  }

  /**
   * 计算德行影响
   */
  _calculateVirtueInfluence(character, action) {
    let bonus = 0;
    let details = {};
    
    const virtues = character.virtues || {};
    
    // 德行与行为的匹配度影响
    const virtueActionMatrix = {
      "垦荒耕种": { "俭": 0.3, "温": 0.2 },
      "照顾婴孺": { "仁": 0.4, "温": 0.3 },
      "商铺经营": { "信": 0.3, "智": 0.2 },
      "祝祷祭祀": { "礼": 0.4, "恭": 0.3 },
      "击剑格斗": { "义": 0.3, "温": -0.2 },
      "经义研读": { "智": 0.4, "恭": 0.2 },
      "手工雕琢": { "俭": 0.3, "良": 0.2 }
    };
    
    const actionVirtues = virtueActionMatrix[action.action] || {};
    for (const [virtueName, influence] of Object.entries(actionVirtues)) {
      const virtueValue = virtues[virtueName] || 50;
      const normalizedValue = (virtueValue - 50) / 50; // 转换为-1到1范围
      const virtueBonus = normalizedValue * influence;
      bonus += virtueBonus;
      details[virtueName] = { value: virtueValue, influence: virtueBonus };
    }
    
    return { bonus, details };
  }

  /**
   * 计算环境影响
   */
  _calculateEnvironmentInfluence(action, context) {
    let bonus = 0;
    let details = {};
    
    // 天气影响
    if (context.weather) {
      const weatherEffects = {
        "垦荒耕种": { "晴天": 0.2, "雨天": -0.3, "雪天": -0.8 },
        "坞堡营造": { "晴天": 0.3, "雨天": -0.5, "雪天": -0.7 },
        "社集看戏": { "晴天": 0.1, "雨天": -0.2, "雪天": -0.4 },
        "经义研读": { "雨天": 0.1, "雪天": 0.2 } // 坏天气适合读书
      };
      
      const actionWeatherEffects = weatherEffects[action.action] || {};
      const weatherBonus = actionWeatherEffects[context.weather.type] || 0;
      bonus += weatherBonus;
      details.weather = { type: context.weather.type, bonus: weatherBonus };
    }
    
    // 季节影响
    if (context.season) {
      const seasonalEffects = {
        "垦荒耕种": { "春季": 0.3, "夏季": 0.2, "秋季": 0.1, "冬季": -0.5 },
        "野外狩猎": { "春季": 0.1, "夏季": -0.1, "秋季": 0.2, "冬季": 0.3 },
        "水产捕捞": { "春季": 0.2, "夏季": 0.3, "秋季": 0.1, "冬季": -0.2 }
      };
      
      const actionSeasonEffects = seasonalEffects[action.action] || {};
      const seasonBonus = actionSeasonEffects[context.season] || 0;
      bonus += seasonBonus;
      details.season = { type: context.season, bonus: seasonBonus };
    }
    
    return { bonus, details };
  }

  /**
   * 计算角色状态影响
   */
  _calculateStatusInfluence(character, action) {
    let bonus = 0;
    let details = {};
    
    const needs = character.needs || {};
    const health = character.health || 100;
    const mood = character.mood || 0;
    
    // 健康影响
    if (health < 50 && this._isPhysicalAction(action.action)) {
      const healthPenalty = (50 - health) * 0.01;
      bonus -= healthPenalty;
      details.health = { value: health, penalty: healthPenalty };
    }
    
    // 情绪影响
    const moodBonus = mood * 0.003;
    bonus += moodBonus;
    details.mood = { value: mood, bonus: moodBonus };
    
    // 体力影响
    const energy = needs.energy || 50;
    if (energy < 30) {
      const energyPenalty = (30 - energy) * 0.01;
      bonus -= energyPenalty;
      details.energy = { value: energy, penalty: energyPenalty };
    }
    
    return { bonus, details };
  }

  /**
   * 计算经验影响
   */
  _calculateExperienceInfluence(character, action) {
    let bonus = 0;
    let details = {};
    
    if (this.memorySystem) {
      const experience = this.memorySystem.getActionExperience(character.id, action.action);
      const experienceBonus = experience * 0.002;
      bonus += experienceBonus;
      details.experience = { value: experience, bonus: experienceBonus };
      
      // 相关记忆影响
      const relevantMemories = this.memorySystem.getRelevantMemories(character.id, {
        action: action.action,
        location: action.location
      });
      
      let memoryInfluence = 0;
      for (const memory of relevantMemories.slice(0, 3)) { // 只考虑最相关的3个记忆
        memoryInfluence += memory.emotional_impact * memory.importance * 0.05;
      }
      
      bonus += memoryInfluence;
      details.memory = { influence: memoryInfluence, memoryCount: relevantMemories.length };
    }
    
    return { bonus, details };
  }

  /**
   * 计算效果强度
   */
  _calculateEffectIntensity(character, action, isSuccess, successRate) {
    let intensity = isSuccess ? 1.0 : 0.3;
    
    // 技能水平影响效果强度
    const requirements = this.getActionRequirements(action.action);
    for (const [skillName, minLevel] of Object.entries(requirements.skills)) {
      const skillLevel = character.skills?.[skillName] || 0;
      const skillRatio = skillLevel / 100;
      intensity += skillRatio * 0.3;
    }
    
    // 成功率影响效果强度（高成功率时效果更稳定）
    intensity += (successRate - 0.5) * 0.2;
    
    return Math.max(0.1, Math.min(2.0, intensity));
  }

  /**
   * 计算具体效果
   */
  _calculateSpecificEffects(character, action, effectIntensity, context) {
    const effects = {
      needsChanges: {},
      skillChanges: {},
      virtueChanges: {},
      resourceChanges: {},
      moodChange: 0,
      healthChange: 0,
      experienceGain: 0
    };
    
    const actionName = action.action;
    
    // 基于行为类型的效果
    switch (actionName) {
      case "进食饮水":
        effects.needsChanges.hunger = 30 * effectIntensity;
        effects.needsChanges.thirst = 25 * effectIntensity;
        effects.moodChange = 5 * effectIntensity;
        effects.resourceChanges.food = -1;
        effects.resourceChanges.water = -1;
        break;
        
      case "休息睡眠":
        effects.needsChanges.energy = 40 * effectIntensity;
        effects.healthChange = 5 * effectIntensity;
        effects.moodChange = 10 * effectIntensity;
        break;
        
      case "垦荒耕种":
        effects.skillChanges["垦荒耕种"] = 2 * effectIntensity;
        effects.virtueChanges["俭"] = 1 * effectIntensity;
        effects.needsChanges.energy = -20;
        effects.resourceChanges.food = 5 * effectIntensity;
        effects.experienceGain = 3 * effectIntensity;
        break;
        
      case "手工雕琢":
        effects.skillChanges["手工雕琢"] = 3 * effectIntensity;
        effects.virtueChanges["俭"] = 1 * effectIntensity;
        effects.needsChanges.energy = -15;
        effects.resourceChanges.wood = -2;
        effects.resourceChanges.cloth = 2 * effectIntensity;
        effects.experienceGain = 4 * effectIntensity;
        break;
        
      case "商铺经营":
        effects.skillChanges["商业贸易"] = 2 * effectIntensity;
        effects.virtueChanges["信"] = 1 * effectIntensity;
        effects.needsChanges.energy = -10;
        effects.needsChanges.social = 15 * effectIntensity;
        effects.moodChange = 8 * effectIntensity;
        effects.experienceGain = 3 * effectIntensity;
        break;
        
      case "经义研读":
        effects.skillChanges["经义研读"] = 4 * effectIntensity;
        effects.virtueChanges["智"] = 2 * effectIntensity;
        effects.virtueChanges["礼"] = 1 * effectIntensity;
        effects.needsChanges.energy = -8;
        effects.moodChange = 5 * effectIntensity;
        effects.experienceGain = 5 * effectIntensity;
        break;
        
      case "祝祷祭祀":
        effects.virtueChanges["礼"] = 2 * effectIntensity;
        effects.virtueChanges["恭"] = 1 * effectIntensity;
        effects.moodChange = 15 * effectIntensity;
        effects.needsChanges.social = 10 * effectIntensity;
        break;
        
      case "觅求好友":
        effects.needsChanges.social = 20 * effectIntensity;
        effects.virtueChanges["仁"] = 1 * effectIntensity;
        effects.moodChange = 12 * effectIntensity;
        effects.experienceGain = 2 * effectIntensity;
        break;
    }
    
    return effects;
  }

  /**
   * 执行行为效果
   */
  _executeActionEffects(character, action, outcome, context) {
    const effects = outcome.specificEffects;
    
    // 应用效果到角色
    this.applyEffects(character, effects);
    
    // 消耗资源
    for (const [resourceType, amount] of Object.entries(effects.resourceChanges || {})) {
      if (amount < 0) {
        this.resourceSystem.consumeResource(resourceType, Math.abs(amount), action.action);
      } else {
        this.resourceSystem.addResource(resourceType, amount, 70, `${action.action}产出`);
      }
    }
    
    return effects;
  }

  /**
   * 更新角色状态
   */
  _updateCharacterState(character, action, effects) {
    // 更新最后活动时间
    character.lastAction = {
      action: action.action,
      location: action.location,
      timestamp: Date.now(),
      success: effects.success !== false
    };
    
    // 更新角色位置
    character.currentLocation = action.location;
  }

  /**
   * 创建行为记忆
   */
  _createActionMemory(character, action, outcome, context) {
    if (!this.memorySystem) return;
    
    const importance = outcome.success ? 0.4 : 0.6; // 失败的记忆往往更深刻
    const emotionalImpact = outcome.success ? 
      (outcome.effectIntensity - 1) * 0.3 : 
      -(1 - outcome.effectIntensity) * 0.4;
    
    this.memorySystem.addMemory(character.id, {
      type: 'action',
      action: action.action,
      location: action.location,
      success: outcome.success,
      successRate: outcome.successRate,
      effectIntensity: outcome.effectIntensity,
      skill: this._getPrimarySkillForAction(action.action),
      description: this._generateActionDescription(action, outcome)
    }, importance, emotionalImpact, context);
  }

  /**
   * 处理关系影响
   */
  _handleRelationshipEffects(character, action, effects, context) {
    if (!this.relationshipSystem) return;
    
    // 社交行为影响关系
    const socialActions = ["觅求好友", "社集看戏", "饮酒聚宴", "商铺经营"];
    if (socialActions.includes(action.action)) {
      const locationPeople = context.locationPopulation?.[action.location] || [];
      for (const person of locationPeople) {
        if (person.id !== character.id) {
          this.relationshipSystem.modifyRelationship(
            character.id, person.id, 'familiarity', 2
          );
        }
      }
    }
  }

  /**
   * 记录活动行为
   */
  _recordActiveAction(character, action, outcome) {
    const duration = this.actionConfig.actionDuration[action.action] || 180;
    this.activeActions.set(character.id, {
      action: action.action,
      location: action.location,
      startTime: Date.now(),
      endTime: Date.now() + duration * 60 * 1000, // 转换为毫秒
      canInterrupt: this._canInterruptAction(action.action),
      outcome: outcome
    });
  }

  /**
   * 辅助方法
   */
  _isPhysicalAction(actionName) {
    const physicalActions = [
      "垦荒耕种", "拓地伐林", "采石挖矿", "坞堡营造", 
      "击剑格斗", "野外狩猎", "道路修筑", "水产捕捞"
    ];
    return physicalActions.includes(actionName);
  }

  _getRelatedSkills(actionName) {
    const skillRelations = {
      "垦荒耕种": ["畜牧养殖", "园艺栽培"],
      "手工雕琢": ["刨锯木作", "纺织缝纫"],
      "商铺经营": ["摆摊交易", "货物转运"],
      "坞堡营造": ["住宅修建", "道路修筑"]
    };
    return skillRelations[actionName] || [];
  }

  _getPrimarySkillForAction(actionName) {
    const skillMapping = {
      "垦荒耕种": "垦荒耕种",
      "手工雕琢": "手工雕琢",
      "熔炼铸锻": "熔炼铸锻",
      "商铺经营": "商业贸易",
      "经义研读": "经义研读",
      "坞堡营造": "坞堡营造"
    };
    return skillMapping[actionName] || null;
  }

  _canInterruptAction(actionName) {
    const nonInterruptibleActions = ["休息睡眠", "熔炼铸锻", "祝祷祭祀"];
    return !nonInterruptibleActions.includes(actionName);
  }

  _generateActionDescription(action, outcome) {
    const success = outcome.success ? "成功" : "失败";
    const intensity = outcome.effectIntensity > 1.2 ? "出色地" : 
                     outcome.effectIntensity < 0.8 ? "勉强" : "";
    return `在${action.location}${intensity}${success}进行了${action.action}`;
  }

  _generateOutcomeCacheKey(character, action, context) {
    return `${character.id}_${action.action}_${action.location}_${context.timeOfDay}`;
  }

  _createSuccessResult(action, outcome, effects, character) {
    return {
      success: true,
      action: action.action,
      location: action.location,
      character: character.name,
      outcome,
      effects,
      message: `${character.name}成功在${action.location}进行了${action.action}`,
      timestamp: Date.now()
    };
  }

  _createFailureResult(action, reason, character) {
    return {
      success: false,
      action: action.action,
      location: action.location,
      character: character.name,
      reason,
      message: `${character.name}无法进行${action.action}：${reason}`,
      timestamp: Date.now()
    };
  }

  _createErrorResult(action, error, character) {
    return {
      success: false,
      action: action.action,
      character: character.name,
      error,
      message: `处理${character.name}的${action.action}时发生错误：${error}`,
      timestamp: Date.now()
    };
  }

  _handleActionConflict(character, action, conflict) {
    if (conflict.conflictType === 'busy') {
      return this._createFailureResult(action, 
        `正在进行${conflict.activeAction}，还需${Math.ceil(conflict.remainingTime / 60000)}分钟`,
        character
      );
    } else if (conflict.conflictType === 'resource') {
      return this._createFailureResult(action, 
        `${RESOURCE_TYPES[conflict.resource]?.name}不足`,
        character
      );
    }
    
    return this._createFailureResult(action, "未知冲突", character);
  }

  _updateStats(result, processingTime) {
    this.stats.actionsProcessed++;
    
    if (result.success) {
      this.stats.successfulActions++;
    } else {
      this.stats.failedActions++;
    }
    
    this.stats.averageSuccessRate = this.stats.successfulActions / this.stats.actionsProcessed;
    
    const category = this._getActionCategory(result.action);
    this.stats.actionsByCategory[category] = (this.stats.actionsByCategory[category] || 0) + 1;
    
    if (result.effects?.experienceGain) {
      this.stats.skillGainTotal += result.effects.experienceGain;
    }
    
    if (result.effects?.virtueChanges) {
      this.stats.virtueChangesTotal += Object.values(result.effects.virtueChanges).length;
    }
  }

  _getActionCategory(actionName) {
    for (const [category, config] of Object.entries(BEHAVIOR_CATEGORIES)) {
      if (config.actions.includes(actionName)) {
        return category;
      }
    }
    return "未分类";
  }

  // ==================== 公共工具方法 ====================

  /**
   * 获取角色当前活动
   */
  getCurrentActivity(characterId) {
    return this.activeActions.get(characterId);
  }

  /**
   * 中断角色当前活动
   */
  interruptActivity(characterId, reason = "手动中断") {
    const activity = this.activeActions.get(characterId);
    if (activity && activity.canInterrupt) {
      this.activeActions.delete(characterId);
      return true;
    }
    return false;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      activeActions: this.activeActions.size,
      cacheSize: this.resultCache.size
    };
  }

  /**
   * 清理过期缓存和活动
   */
  cleanup() {
    const now = Date.now();
    
    // 清理完成的活动
    for (const [characterId, activity] of this.activeActions.entries()) {
      if (now > activity.endTime) {
        this.activeActions.delete(characterId);
      }
    }
    
    // 清理过期缓存
    if (this.resultCache.size > 1000) {
      this.resultCache.clear();
    }
  }
}

export default ActionProcessor;