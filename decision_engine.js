/**
 * DecisionEngine.js - 南北朝坞堡模拟器决策引擎 - 最终修复版本
 * 
 * 功能：基于角色状态、需求、德行等进行智能决策
 * 优先级：⭐⭐⭐⭐⭐ (第三阶段最高优先级)
 * 
 * 最终修复说明：
 * - 修正数据一致性问题，严格过滤未配置行为
 * - 完善所有行为分类判断方法
 * - 增强配置验证和错误处理
 * - 确保100%的行为都有对应配置
 */

import { DEFAULT_CONFIG } from './gameConfig.js';

const {
  BEHAVIOR_CATEGORIES,
  DAILY_SCHEDULE,
  VIRTUE_SYSTEM,
  LOCATIONS,
  BALANCE_CONFIG
} = DEFAULT_CONFIG;

export class DecisionEngine {
  constructor(resourceSystem = null, memorySystem = null) {
    this.resourceSystem = resourceSystem;
    this.memorySystem = memorySystem;
    
    // 决策权重配置
    this.decisionWeights = {
      // 基本需求权重（马斯洛需求层次）
      survival: 10.0,      // 生存需求（食物、水、睡眠）
      safety: 8.0,         // 安全需求（居所、健康）
      social: 6.0,         // 社交需求（关系、归属感）
      esteem: 4.0,         // 尊重需求（成就、认可）
      fulfillment: 2.0,    // 自我实现（创造、超越）
      
      // 德行影响权重
      virtue_influence: 0.3,
      
      // 时间和环境因素
      time_appropriateness: 0.4,
      weather_influence: 0.2,
      location_suitability: 0.3,
      
      // 记忆和经验影响
      memory_influence: 0.2,
      habit_strength: 0.3,
      
      // 风险评估
      danger_aversion: 0.5,
      energy_conservation: 0.3
    };
    
    // 决策缓存（避免重复计算）
    this.decisionCache = new Map();
    this.cacheTimeout = 100; // 游戏时间单位
    
    // 统计数据
    this.stats = {
      decisionsTotal: 0,
      decisionsByCategory: {},
      averageDecisionTime: 0,
      cacheHitRate: 0
    };
    
    // 缓存配置的行为集合
    this.configuredActions = new Set();
    this.actionCategoryMap = new Map();
    
    // 初始化配置验证和行为映射
    this._initializeActionMappings();
    this._validateConfigurations();
  }

  /**
   * 初始化行为映射
   */
  _initializeActionMappings() {
    // 构建配置行为集合和分类映射
    Object.entries(BEHAVIOR_CATEGORIES).forEach(([category, config]) => {
      if (config.actions) {
        config.actions.forEach(action => {
          this.configuredActions.add(action);
          this.actionCategoryMap.set(action, category);
        });
      }
    });
    
    console.log(`决策引擎加载了 ${this.configuredActions.size} 个配置行为`);
  }

  /**
   * 验证配置完整性
   */
  _validateConfigurations() {
    if (!BEHAVIOR_CATEGORIES || !LOCATIONS || !DAILY_SCHEDULE) {
      console.error('决策引擎初始化失败：缺少必要配置');
      return false;
    }
    
    // 收集地点中的所有行为
    const locationActions = new Set();
    Object.values(LOCATIONS).forEach(location => {
      if (location.availableActions) {
        location.availableActions.forEach(action => locationActions.add(action));
      }
    });
    
    // 检查不匹配的行为
    const unmatchedActions = [];
    for (const action of locationActions) {
      if (!this.configuredActions.has(action)) {
        unmatchedActions.push(action);
      }
    }
    
    if (unmatchedActions.length > 0) {
      console.warn(`发现 ${unmatchedActions.length} 个未配置的地点行为:`, unmatchedActions);
      console.warn('这些行为将被自动过滤，不会出现在决策选项中');
    }
    
    console.log(`配置验证完成 - 可用行为: ${Array.from(locationActions).filter(action => this.configuredActions.has(action)).length}/${locationActions.size}`);
    
    return true;
  }

  /**
   * 主要决策方法：为角色选择下一个行为
   * @param {Object} character - 角色对象
   * @param {Object} context - 环境上下文
   * @returns {Object} 决策结果
   */
  makeDecision(character, context) {
    const startTime = performance.now();
    
    try {
      // 检查缓存
      const cacheKey = this._generateCacheKey(character, context);
      if (this.decisionCache.has(cacheKey)) {
        this.stats.cacheHitRate++;
        return this.decisionCache.get(cacheKey);
      }

      // 1. 评估所有可选行为（仅包含配置的行为）
      const availableOptions = this._getAvailableActions(character, context);
      
      if (availableOptions.length === 0) {
        console.warn('没有找到任何可用的配置行为');
        return this._getEmergencyDecision(character, context);
      }
      
      // 2. 为每个选项打分
      const scoredOptions = this.evaluateOptions(character, context, availableOptions);
      
      // 3. 处理特殊情况和约束
      const filteredOptions = this._applyConstraints(character, context, scoredOptions);
      
      // 4. 选择最佳行为
      const finalDecision = this._selectBestOption(character, filteredOptions);
      
      // 5. 生成决策解释
      const decision = {
        action: finalDecision.action,
        location: finalDecision.location,
        score: finalDecision.score,
        confidence: finalDecision.confidence,
        reasoning: finalDecision.reasoning,
        timestamp: context.currentTime,
        alternatives: scoredOptions.slice(0, 3) // 保存前3个备选方案
      };
      
      // 缓存决策结果
      this.decisionCache.set(cacheKey, decision);
      
      // 更新统计数据
      this._updateStats(decision, performance.now() - startTime);
      
      return decision;
      
    } catch (error) {
      console.error('决策引擎错误:', error);
      // 返回默认安全行为
      return this._getEmergencyDecision(character, context);
    }
  }

  /**
   * 评估所有可选行为选项
   * @param {Object} character - 角色对象
   * @param {Object} context - 环境上下文
   * @param {Array} availableOptions - 可选行为列表
   * @returns {Array} 打分后的选项列表
   */
  evaluateOptions(character, context, availableOptions) {
    const evaluatedOptions = [];
    
    for (const option of availableOptions) {
      const score = this._calculateOptionScore(character, context, option);
      const confidence = this._calculateConfidence(character, option, score);
      const reasoning = this._generateReasoning(character, option, score);
      
      evaluatedOptions.push({
        ...option,
        score,
        confidence,
        reasoning
      });
    }
    
    // 按分数排序
    return evaluatedOptions.sort((a, b) => b.score - a.score);
  }

  /**
   * 计算行为选项的综合得分
   * @param {Object} character - 角色对象
   * @param {Object} context - 环境上下文
   * @param {Object} option - 行为选项
   * @returns {number} 综合得分
   */
  _calculateOptionScore(character, context, option) {
    let totalScore = 0;
    
    // 1. 基本需求满足度评分
    const needsScore = this._evaluateNeedsSatisfaction(character, option);
    totalScore += needsScore;
    
    // 2. 德行特质影响评分
    const virtueScore = this._evaluateVirtueInfluence(character, option);
    totalScore += virtueScore * this.decisionWeights.virtue_influence;
    
    // 3. 时间适宜性评分
    const timeScore = this._evaluateTimeAppropriateness(context, option);
    totalScore += timeScore * this.decisionWeights.time_appropriateness;
    
    // 4. 环境适宜性评分
    const environmentScore = this._evaluateEnvironmentSuitability(context, option);
    totalScore += environmentScore * this.decisionWeights.weather_influence;
    
    // 5. 技能和能力评分
    const abilityScore = this._evaluateAbilityMatch(character, option);
    totalScore += abilityScore;
    
    // 6. 社交因素评分
    const socialScore = this._evaluateSocialFactors(character, context, option);
    totalScore += socialScore;
    
    // 7. 记忆和经验影响
    if (this.memorySystem) {
      const memoryScore = this._evaluateMemoryInfluence(character, option);
      totalScore += memoryScore * this.decisionWeights.memory_influence;
    }
    
    // 8. 风险评估
    const riskPenalty = this._evaluateRisk(character, option);
    totalScore -= riskPenalty;
    
    return Math.max(0, totalScore); // 确保得分不为负数
  }

  /**
   * 评估行为对需求的满足程度
   * @param {Object} character - 角色对象
   * @param {Object} option - 行为选项
   * @returns {number} 需求满足评分
   */
  _evaluateNeedsSatisfaction(character, option) {
    let score = 0;
    
    // 🔧 安全检查和获取完整角色对象
    if (!character) {
      console.warn('⚠️ character 为空');
      return 0;
    }
    
    // 如果传入的是 characterId (字符串),则获取完整对象
    if (typeof character === 'string') {
      character = this.gameEngine?.characters?.get(character);
      if (!character) {
        console.warn('⚠️ 无法找到角色:', character);
        return 0;
      }
    }
    
    // 检查必需的状态对象
    if (!character.physicalState || !character.emotionalState) {
      console.warn('⚠️ 角色缺少状态对象:', character.name);
      return 0;
    }
    
    const action = option.action;
    
    // 1. 饥饿需求 (hunger > 60 时紧急)
    const hunger = character.physicalState.hunger;
    if (hunger > 60 && action === '进食饮水') {
      score += 50 + (hunger - 60) * 2;
    }
    
    // 2. 口渴需求 (thirst > 60 时紧急)
    const thirst = character.physicalState.thirst;
    if (thirst > 60 && action === '进食饮水') {
      score += 50 + (thirst - 60) * 2;
    }
    
    // 3. 疲劳需求 (energy < 30 时需要休息)
    const energy = character.physicalState.energy;
    if (energy < 30 && action === '休息睡眠') {
      score += 80 + (30 - energy) * 2; // 最高110分
    }
    
    // 4. 卫生需求 (每天需要盥洗)
    if (action === '盥洗沐浴') {
      score += 20; // 基础卫生需求
    }
    
    // 5. 孤独需求 (loneliness > 50 时需要社交)
    const loneliness = character.emotionalState.loneliness;
    if (loneliness > 50 && this._isSocialAction(action)) {
      score += 40 + (loneliness - 50) * 1.5;
    }
    
    // 6. 压力需求 (stress > 60 时需要放松)
    const stress = character.emotionalState.stress || 0;
    if (stress > 60) {
      if (action === '休息睡眠' || action === '踏青出游') {
        score += 30 + (stress - 60);
      }
    }
    
    return score;
  }

  /**
   * 评估德行特质对行为的影响
   * @param {Object} character - 角色对象
   * @param {Object} option - 行为选项
   * @returns {number} 德行影响得分
   */
  _evaluateVirtueInfluence(character, option) {
    let score = 0;
    const virtues = character.virtues || {};
    const action = option.action;
    
    // 仁德影响社交和帮助行为
    if (virtues.仁 && this._isSocialAction(action)) {
      score += virtues.仁 / 20;
    }
    
    // 义德影响工作和责任行为
    if (virtues.义 && this._isWorkAction(action)) {
      score += virtues.义 / 25;
    }
    
    // 礼德影响礼仪和文化行为
    if (virtues.礼 && this._isCulturalAction(action)) {
      score += virtues.礼 / 30;
    }
    
    // 智德影响学习和创新行为
    if (virtues.智 && this._isLearningAction(action)) {
      score += virtues.智 / 20;
    }
    
    // 勇德影响冒险和挑战行为
    if (virtues.勇 && this._isAdventurousAction(action)) {
      score += virtues.勇 / 25;
    }
    
    return score;
  }

  /**
   * 评估时间适宜性
   * @param {Object} context - 环境上下文
   * @param {Object} option - 行为选项
   * @returns {number} 时间适宜性得分
   */
  _evaluateTimeAppropriateness(context, option) {
    const timeOfDay = context.timeOfDay || '上午';
    const action = option.action;
    
    // 使用配置中的日程安排
    const schedule = DAILY_SCHEDULE[timeOfDay];
    if (schedule) {
      // 优先级行为得高分
      if (schedule.priority && schedule.priority.includes(action)) {
        return 3.0;
      }
      
      // 可选行为得中等分
      if (schedule.optional && schedule.optional.includes(action)) {
        return 1.5;
      }
    }
    
    // 特定时间限制的行为
    const category = this._getActionCategory(action);
    const categoryConfig = BEHAVIOR_CATEGORIES[category];
    
    if (categoryConfig && categoryConfig.timeSlots) {
      if (Array.isArray(categoryConfig.timeSlots)) {
        return categoryConfig.timeSlots.includes(timeOfDay) ? 2.0 : -1.0;
      } else if (typeof categoryConfig.timeSlots === 'object') {
        // 处理生理需求类的特殊时间安排
        const actionTimeSlots = categoryConfig.timeSlots[action];
        if (actionTimeSlots) {
          return actionTimeSlots.includes(timeOfDay) ? 2.0 : -1.0;
        }
      }
    }
    
    // 默认适宜性
    return 0.5;
  }

  /**
   * 评估环境适宜性
   * @param {Object} context - 环境上下文
   * @param {Object} option - 行为选项
   * @returns {number} 环境适宜性得分
   */
  _evaluateEnvironmentSuitability(context, option) {
    const weather = context.weather?.type || '晴朗';
    const season = context.season || '春季';
    const action = option.action;
    const location = option.location;
    
    let score = 0;
    
    // 天气影响
    if (weather === '雨天' || weather === '大雨' || weather === '雷雨') {
      if (this._isIndoorAction(action, location)) {
        score += 2;
      } else if (this._isOutdoorAction(action, location)) {
        score -= 3;
      }
    } else if (weather === '晴朗') {
      if (this._isOutdoorAction(action, location)) {
        score += 1;
      }
    } else if (weather === '雪天') {
      if (this._isIndoorAction(action, location)) {
        score += 1;
      } else {
        score -= 2;
      }
    }
    
    // 季节影响
    const locationConfig = LOCATIONS[location];
    if (locationConfig && locationConfig.seasonalBonus) {
      const seasonalMultiplier = locationConfig.seasonalBonus[season] || 1.0;
      score += (seasonalMultiplier - 1.0) * 2;
    }
    
    // 特定季节的农业活动
    if (season === '春季' && this._isAgriculturalAction(action)) {
      score += 2;
    } else if (season === '冬季' && this._isIndoorAction(action, location)) {
      score += 1;
    }
    
    return score;
  }

  /**
   * 评估技能和能力匹配度
   * @param {Object} character - 角色对象
   * @param {Object} option - 行为选项
   * @returns {number} 能力匹配得分
   */
  _evaluateAbilityMatch(character, option) {
    let score = 0;
    const skills = character.skills || {};
    const action = option.action;
    
    // 获取行为所需技能
    const requiredSkill = this._getRequiredSkillForAction(action);
    if (requiredSkill) {
      const skillLevel = skills[requiredSkill] || 0;
      score += skillLevel / 20; // 技能越高，得分越高
    }
    
    // 体力和健康状况影响
    const energy = character.needs?.energy || 50;
    const health = character.health || 100;
    
    if (this._isPhysicalAction(action)) {
      if (energy < 30 || health < 50) {
        score -= 2; // 体力不足时避免体力活动
      } else {
        score += energy / 50; // 体力充沛时增加体力活动倾向
      }
    }
    
    return score;
  }

  /**
   * 评估社交因素
   * @param {Object} character - 角色对象
   * @param {Object} context - 环境上下文
   * @param {Object} option - 行为选项
   * @returns {number} 社交因素得分
   */
  _evaluateSocialFactors(character, context, option) {
    let score = 0;
    const location = option.location;
    
    // 地点人口密度影响
    const locationPopulation = context.locationPopulation?.[location]?.length || 0;
    
    if (this._isSocialAction(option.action)) {
      // 社交行为倾向于人多的地方
      score += Math.min(locationPopulation / 5, 2);
    } else if (this._isConcentrationAction(option.action)) {
      // 需要专注的行为倾向于人少的地方
      score += Math.max(2 - locationPopulation / 3, 0);
    }
    
    // 关系影响（如果有关系系统）
    if (character.relationships) {
      const friendsInLocation = this._getFriendsInLocation(character, context, location);
      if (friendsInLocation > 0 && this._isSocialAction(option.action)) {
        score += friendsInLocation * 0.5;
      }
    }
    
    return score;
  }

  /**
   * 评估记忆和经验影响
   * @param {Object} character - 角色对象
   * @param {Object} option - 行为选项
   * @returns {number} 记忆影响得分
   */
  _evaluateMemoryInfluence(character, option) {
    if (!this.memorySystem) {
        console.log('⚠️ 记忆系统不可用，跳过记忆影响评估');
        return 0;
    }
    
    let score = 0;
    const action = option.action;
    const location = option.location;
    
    try {
        // 1. 获取该行为的成功经验
        if (typeof this.memorySystem.getActionSuccessRate === 'function') {
            const successRate = this.memorySystem.getActionSuccessRate(character, action);
            score += (successRate - 0.5) * 2; // 成功率高的行为得分更高
            console.log(`📊 ${character.name || character.id || '角色'} 对 ${action} 的成功率: ${(successRate * 100).toFixed(1)}%`);
        } else {
            console.warn('⚠️ getActionSuccessRate 方法不存在');
        }
        
        // 2. 获取地点的正面记忆
        if (typeof this.memorySystem.getLocationSentiment === 'function') {
            const locationMemory = this.memorySystem.getLocationSentiment(character, location);
            score += locationMemory / 50; // 正面记忆增加得分
            console.log(`🏠 ${character.name || character.id || '角色'} 对 ${location} 的情感: ${locationMemory.toFixed(1)}`);
        } else {
            console.warn('⚠️ getLocationSentiment 方法不存在');
        }
        
        // 3. 习惯强度影响
        if (typeof this.memorySystem.getHabitStrength === 'function') {
            const habitStrength = this.memorySystem.getHabitStrength(character, action);
            const habitWeight = this.decisionWeights.habit_strength || 0.3;
            score += habitStrength * habitWeight;
            console.log(`🔄 ${character.name || character.id || '角色'} 对 ${action} 的习惯强度: ${(habitStrength * 100).toFixed(1)}%`);
        } else {
            console.warn('⚠️ getHabitStrength 方法不存在');
        }
        
        console.log(`🧠 ${character.name || character.id || '角色'} 记忆影响总分: ${score.toFixed(2)}`);
        
    } catch (error) {
        console.error('❌ 评估记忆影响时出错:', error.message);
        console.error('错误详情:', error.stack);
        
        // 使用备用逻辑
        const experience = character.statistics?.totalActions || 0;
        const baseSuccessRate = Math.min(0.3 + experience * 0.01, 0.8);
        score = (baseSuccessRate - 0.5) * 2;
        console.log(`🔧 使用备用记忆评估逻辑，得分: ${score.toFixed(2)}`);
    }
    
     return score;
  }

  /**
   * 评估风险因素
   * @param {Object} character - 角色对象
   * @param {Object} option - 行为选项
   * @returns {number} 风险惩罚值
   */
  _evaluateRisk(character, option) {
    let risk = 0;
    const action = option.action;
    const location = option.location;
    
    // 行为本身的危险性
    const actionRisk = this._getActionRiskLevel(action);
    risk += actionRisk;
    
    // 地点危险性
    const locationConfig = LOCATIONS[location];
    if (locationConfig && locationConfig.danger) {
      risk += locationConfig.danger * 5;
    }
    
    // 健康状况风险
    const health = character.health || 100;
    if (health < 50 && this._isPhysicalAction(action)) {
      risk += (50 - health) / 25;
    }
    
    // 社会风险（德行低的角色更容易做危险行为）
    const averageVirtue = this._getAverageVirtue(character);
    if (averageVirtue < 30) {
      risk *= 0.7; // 德行低的角色风险偏好更高
    }
    
    return risk * this.decisionWeights.danger_aversion;
  }

  /**
   * 应用约束条件
   * @param {Object} character - 角色对象
   * @param {Object} context - 环境上下文
   * @param {Array} scoredOptions - 打分后的选项
   * @returns {Array} 过滤后的选项
   */
  _applyConstraints(character, context, scoredOptions) {
    return scoredOptions.filter(option => {
      // 基本约束检查
      if (!this._checkBasicConstraints(character, option)) {
        return false;
      }
      
      // 资源约束检查
      if (!this._checkResourceConstraints(character, option)) {
        return false;
      }
      
      // 地点约束检查
      if (!this._checkLocationConstraints(context, option)) {
        return false;
      }
      
      // 时间约束检查
      if (!this._checkTimeConstraints(context, option)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * 选择最佳选项
   * @param {Object} character - 角色对象
   * @param {Array} filteredOptions - 过滤后的选项
   * @returns {Object} 最佳选项
   */
  _selectBestOption(character, filteredOptions) {
    if (filteredOptions.length === 0) {
      // 没有可选项时返回默认安全行为
      return {
        action: "休息睡眠",
        location: "住宅区",
        score: 0,
        confidence: 0.1,
        reasoning: "无其他可选行为，选择安全的休息"
      };
    }
    
    // 引入随机性避免行为过于单调
    const topOptions = filteredOptions.slice(0, Math.min(3, filteredOptions.length));
    const weights = topOptions.map((option, index) => Math.pow(option.score, 2) / Math.pow(index + 1, 0.5));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    let randomValue = Math.random() * totalWeight;
    for (let i = 0; i < topOptions.length; i++) {
      randomValue -= weights[i];
      if (randomValue <= 0) {
        return topOptions[i];
      }
    }
    
    return topOptions[0]; // 备选方案
  }

  /**
   * 生成决策推理解释
   * @param {Object} character - 角色对象
   * @param {Object} option - 行为选项
   * @param {number} score - 选项得分
   * @returns {string} 推理解释
   */
  _generateReasoning(character, option, score) {
    const reasons = [];
    
    // 基于得分生成推理
    if (score > 5) {
      reasons.push("高度符合当前需求");
    } else if (score > 3) {
      reasons.push("较为符合现状");
    } else if (score > 1) {
      reasons.push("基本可行");
    } else {
      reasons.push("优先级较低");
    }
    
    // 添加具体原因
    const needs = character.needs || {};
    if (needs.hunger < 30 && this._isNutritionAction(option.action)) {
      reasons.push("急需补充食物");
    }
    if (needs.energy < 20 && this._isRestAction(option.action)) {
      reasons.push("体力不足需要休息");
    }
    
    return reasons.join("，");
  }

  /**
   * 计算决策信心度
   * @param {Object} character - 角色对象
   * @param {Object} option - 行为选项
   * @param {number} score - 选项得分
   * @returns {number} 信心度(0-1)
   */
  _calculateConfidence(character, option, score) {
    let confidence = Math.min(score / 10, 1.0); // 基础信心度
    
    // 技能匹配度影响信心
    const requiredSkill = this._getRequiredSkillForAction(option.action);
    if (requiredSkill) {
      const skillLevel = character.skills?.[requiredSkill] || 0;
      confidence += (skillLevel / 100) * 0.3;
    }
    
    // 经验影响信心
    if (this.memorySystem) {
      const experience = this.memorySystem.getActionExperience(character, option.action);
      confidence += Math.min(experience / 100, 0.2);
    }
    
    return Math.min(confidence, 1.0);
  }

  // ==================== 辅助方法 - 最终修复版本 ====================

   /**
   * 获取可用行为列表 - 修复版本,从 LocationManager 获取
   */
  _getAvailableActions(character, context) {
    const availableActions = [];
    
    // 🔧 从 LocationManager 获取真实地点数据
    const locationManager = this.gameEngine?.gameState?.locationManager;
    if (!locationManager) {
      console.warn('⚠️ LocationManager 不可用');
      return availableActions;
    }
    
    const locations = locationManager.getAllLocations();
    
    // 遍历所有地点的可用行为
    for (const [locationId, location] of locations) {
      if (location.availableActions && location.availableActions.length > 0) {
        for (const action of location.availableActions) {
          // 只包含配置中存在的行为
          if (this.configuredActions.has(action)) {
            availableActions.push({
              action: action,
              location: locationId,
              locationName: location.name,
              category: this._getActionCategory(action)
            });
          }
        }
      }
    }
    
    console.log(`✅ 找到 ${availableActions.length} 个可用行为`);
    return availableActions;
  }

  /**
   * 获取行为所属类别 - 最终修复版本，使用缓存映射
   */
  _getActionCategory(action) {
    return this.actionCategoryMap.get(action) || "未分类";
  }

  /**
   * 获取行为所需技能 - 最终修复版本，只包含实际可用的行为
   */
  _getRequiredSkillForAction(action) {
    // 仅包含在配置和地点中都存在的行为的技能映射
    const skillMapping = {
      // 农田行为
      "垦荒耕种": "垦荒耕种",
      "畜牧养殖": "畜牧养殖",
      
      // 工坊行为
      "手工雕琢": "手工雕琢",
      "熔炼铸锻": "熔炼铸锻",
      "纺织缝纫": "纺织缝纫",
      "刨锯木作": "刨锯木作",
      
      // 山林行为
      "拓地伐林": "拓地伐林",
      "野外狩猎": "野外狩猎",
      
      // 河边行为
      "水产捕捞": "水产捕捞",
      
      // 市集行为
      "摆摊交易": "商业贸易",
      "商铺经营": "商业贸易",
      "货物转运": "商业贸易",
      
      // 祠堂行为
      "经义研读": "经义研读",
      
      // 城墙行为
      "坞堡营造": "坞堡营造",
      "击剑格斗": "击剑格斗",
      
      // 矿场行为
      "采石挖矿": "采石挖矿"
    };
    
    return skillMapping[action] || null;
  }

  /**
   * 获取行为体力消耗
   */
  _getEnergyCostForAction(action) {
    const category = this._getActionCategory(action);
    const categoryConfig = BEHAVIOR_CATEGORIES[category];
    return categoryConfig?.energyCost || 10;
  }

  /**
   * 获取行为风险等级
   */
  _getActionRiskLevel(action) {
    // 基于配置的危险性评估
    const category = this._getActionCategory(action);
    const categoryConfig = BEHAVIOR_CATEGORIES[category];
    
    if (categoryConfig && categoryConfig.dangerous) {
      return 3; // 危险行为
    }
    
    // 特定行为的风险等级
    const riskLevels = {
      "野外狩猎": 2,
      "采石挖矿": 2,
      "拓地伐林": 1,
      "击剑格斗": 2,
      "坞堡营造": 1
    };
    
    return riskLevels[action] || 0;
  }

  /**
   * 行为类型判断方法 - 最终修复版本
   */
  _isNutritionAction(action) {
    return action === "进食饮水";
  }
  
  _isHydrationAction(action) {
    return action === "进食饮水";
  }
  
  _isRestAction(action) {
    return action === "休息睡眠";
  }
  
  _isHygieneAction(action) {
    return action === "盥洗沐浴";
  }
  
  _isSafetyAction(action) {
    const safetyActions = ["坞堡营造", "求医用药"];
    return safetyActions.includes(action);
  }
  
  _isSocialAction(action) {
    // 基于实际可用的社交行为
    const socialActions = [
      "觅求好友",        // 市集
      "饮酒聚宴",        // 广场
      "社集看戏",        // 广场
      "起舞弄乐",        // 广场
      "摆摊交易",        // 市集
      "商铺经营",        // 市集
      "节日拜会",        // 广场
      "婚丧嫁娶",        // 祠堂
      "照顾婴孺"         // 住宅区
    ];
    return socialActions.includes(action);
  }
  
  _isAchievementAction(action) {
    const achievementActions = [
      "经义研读",        // 祠堂
      "手工雕琢",        // 工坊
      "熔炼铸锻",        // 工坊
      "纺织缝纫",        // 工坊
      "刨锯木作"         // 工坊
    ];
    return achievementActions.includes(action);
  }
  
  _isWorkAction(action) {
    const workActions = [
      "垦荒耕种",        // 农田
      "畜牧养殖",        // 农田
      "手工雕琢",        // 工坊
      "熔炼铸锻",        // 工坊
      "纺织缝纫",        // 工坊
      "刨锯木作",        // 工坊
      "坞堡营造",        // 城墙
      "拓地伐林",        // 山林
      "采石挖矿",        // 矿场
      "水产捕捞"         // 河边
    ];
    return workActions.includes(action);
  }
  
  _isCulturalAction(action) {
    const culturalActions = [
      "祝祷祭祀",        // 祠堂
      "经义研读",        // 祠堂
      "婚丧嫁娶",        // 祠堂
      "节日拜会",        // 广场
      "社集看戏",        // 广场
      "起舞弄乐"         // 广场
    ];
    return culturalActions.includes(action);
  }
  
  _isLearningAction(action) {
    const learningActions = [
      "经义研读"         // 祠堂
    ];
    return learningActions.includes(action);
  }
  
  _isAdventurousAction(action) {
    const adventurousActions = [
      "野外狩猎",        // 山林
      "采石挖矿",        // 矿场
      "击剑格斗",        // 城墙
      "拓地伐林"         // 山林
    ];
    return adventurousActions.includes(action);
  }
  
  _isPhysicalAction(action) {
    const physicalActions = [
      "垦荒耕种",        // 农田
      "拓地伐林",        // 山林
      "采石挖矿",        // 矿场
      "坞堡营造",        // 城墙
      "击剑格斗",        // 城墙
      "野外狩猎",        // 山林
      "水产捕捞",        // 河边
      "熔炼铸锻"         // 工坊
    ];
    return physicalActions.includes(action);
  }
  
  _isFlexibleTimeAction(action) {
    const flexibleActions = [
      "手工雕琢",        // 工坊
      "纺织缝纫",        // 工坊
      "觅求好友",        // 市集
      "摆摊交易",        // 市集
      "商铺经营"         // 市集
    ];
    return flexibleActions.includes(action);
  }
  
  _isIndoorAction(action, location) {
    const indoorLocations = ["住宅区", "工坊", "祠堂"];
    return indoorLocations.includes(location);
  }
  
  _isOutdoorAction(action, location) {
    const outdoorLocations = ["农田", "山林", "河边", "市集", "广场", "城墙", "矿场"];
    return outdoorLocations.includes(location);
  }
  
  _isAgriculturalAction(action) {
    const agriculturalActions = ["垦荒耕种", "畜牧养殖"];
    return agriculturalActions.includes(action);
  }
  
  _isConcentrationAction(action) {
    const concentrationActions = [
      "经义研读",        // 祠堂
      "手工雕琢",        // 工坊
      "熔炼铸锻",        // 工坊
      "纺织缝纫"         // 工坊
    ];
    return concentrationActions.includes(action);
  }

  /**
   * 获取角色平均德行
   */
  _getAverageVirtue(character) {
    const virtues = character.virtues || {};
    const values = Object.values(virtues);
    return values.length > 0 ? 
      values.reduce((sum, val) => sum + val, 0) / values.length : 50;
  }

  /**
   * 获取地点内的朋友数量
   */
  _getFriendsInLocation(character, context, location) {
    if (!character.relationships || !context.locationPopulation) {
      return 0;
    }
    
    const peopleInLocation = context.locationPopulation[location] || [];
    let friendCount = 0;
    
    for (const person of peopleInLocation) {
      if (character.relationships[person.id] && 
          character.relationships[person.id].type === 'friend' &&
          character.relationships[person.id].strength > 50) {
        friendCount++;
      }
    }
    
    return friendCount;
  }

  /**
   * 约束检查方法
   */
  _checkBasicConstraints(character, option) {
    // 体力检查
    const energy = character.needs?.energy || 50;
    const energyCost = this._getEnergyCostForAction(option.action);
    return energy >= energyCost * 0.5; // 至少需要一半的体力
  }
  
  _checkResourceConstraints(character, option) {
    // 工具需求检查
    const locationConfig = LOCATIONS[option.location];
    if (locationConfig && locationConfig.toolsRequired) {
      return character.inventory?.tools > 0;
    }
    return true;
  }
  
  _checkLocationConstraints(context, option) {
    // 地点容量检查
    const locationConfig = LOCATIONS[option.location];
    if (!locationConfig) return false;
    
    const currentPeople = context.locationPopulation?.[option.location]?.length || 0;
    return currentPeople < (locationConfig.capacity || 100);
  }
  
  _checkTimeConstraints(context, option) {
    const timeOfDay = context.timeOfDay;
    const action = option.action;
    
    // 检查行为分类的时间限制
    const category = this._getActionCategory(action);
    const categoryConfig = BEHAVIOR_CATEGORIES[category];
    
    if (categoryConfig && categoryConfig.timeSlots) {
      if (Array.isArray(categoryConfig.timeSlots)) {
        return categoryConfig.timeSlots.includes(timeOfDay);
      } else if (typeof categoryConfig.timeSlots === 'object') {
        // 处理生理需求类的特殊时间安排
        const actionTimeSlots = categoryConfig.timeSlots[action];
        if (actionTimeSlots) {
          return actionTimeSlots.includes(timeOfDay);
        }
      }
    }
    
    // 基本时间约束
    const restrictedActions = {
      "休息睡眠": ["夜晚"],
      "祝祷祭祀": ["黎明", "黄昏"]
    };
    
    const timeRestriction = restrictedActions[action];
    if (timeRestriction) {
      return timeRestriction.includes(timeOfDay);
    }
    
    return true;
  }

  /**
   * 紧急决策（错误处理）
   */
  _getEmergencyDecision(character, context) {
    return {
      action: "休息睡眠",
      location: "住宅区",
      score: 0,
      confidence: 0.1,
      reasoning: "系统错误或无可用行为，采用安全决策",
      timestamp: context.currentTime,
      alternatives: []
    };
  }

  /**
   * 缓存相关方法
   */
  _generateCacheKey(character, context) {
    const keyParts = [
      character.id,
      context.timeOfDay,
      context.weather?.type || 'unknown',
      Math.floor(character.needs?.hunger / 10) || 5,
      Math.floor(character.needs?.energy / 10) || 5
    ];
    return keyParts.join('_');
  }

  /**
   * 更新统计数据
   */
  _updateStats(decision, processingTime) {
    this.stats.decisionsTotal++;
    
    const category = this._getActionCategory(decision.action);
    this.stats.decisionsByCategory[category] = 
      (this.stats.decisionsByCategory[category] || 0) + 1;
    
    this.stats.averageDecisionTime = 
      (this.stats.averageDecisionTime * (this.stats.decisionsTotal - 1) + processingTime) / 
      this.stats.decisionsTotal;
  }

  /**
   * 清理过期缓存
   */
  clearExpiredCache(currentTime) {
    for (const [key, decision] of this.decisionCache.entries()) {
      if (currentTime - decision.timestamp > this.cacheTimeout) {
        this.decisionCache.delete(key);
      }
    }
  }

  /**
   * 获取决策统计信息
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.decisionCache.size,
      cacheHitRate: this.stats.decisionsTotal > 0 ? 
        this.stats.cacheHitRate / this.stats.decisionsTotal : 0,
      configuredActionsCount: this.configuredActions.size
    };
  }

  /**
   * 重置统计数据
   */
  resetStats() {
    this.stats = {
      decisionsTotal: 0,
      decisionsByCategory: {},
      averageDecisionTime: 0,
      cacheHitRate: 0
    };
    this.decisionCache.clear();
  }

  /**
   * 获取所有配置的行为
   */
  getConfiguredActions() {
    return Array.from(this.configuredActions);
  }

  /**
   * 获取最终配置验证结果
   */
  getFinalValidationResult() {
    const locationActions = new Set();
    Object.values(LOCATIONS).forEach(location => {
      if (location.availableActions) {
        location.availableActions.forEach(action => locationActions.add(action));
      }
    });
    
    const matchedActions = [];
    const unmatchedActions = [];
    
    for (const action of locationActions) {
      if (this.configuredActions.has(action)) {
        matchedActions.push(action);
      } else {
        unmatchedActions.push(action);
      }
    }
    
    return {
      summary: {
        totalConfiguredActions: this.configuredActions.size,
        totalLocationActions: locationActions.size,
        matchedActions: matchedActions.length,
        unmatchedActions: unmatchedActions.length,
        dataConsistencyRate: `${Math.round((matchedActions.length / locationActions.size) * 100)}%`
      },
      details: {
        configuredActions: Array.from(this.configuredActions).sort(),
        locationActions: Array.from(locationActions).sort(),
        matchedActions: matchedActions.sort(),
        unmatchedActions: unmatchedActions.sort()
      },
      recommendations: unmatchedActions.length > 0 ? [
        `发现 ${unmatchedActions.length} 个未配置的地点行为`,
        "建议在 gameConfig.js 的 BEHAVIOR_CATEGORIES 中添加这些行为的分类",
        "或者从相应地点的 availableActions 中移除这些行为"
      ] : [
        "配置完全一致，无需修复"
      ]
    };
  }

  /**
   * 设置决策权重（用于调试和优化）
   */
  setDecisionWeights(newWeights) {
    this.decisionWeights = { ...this.decisionWeights, ...newWeights };
  }

  /**
   * 获取决策权重
   */
  getDecisionWeights() {
    return { ...this.decisionWeights };
  }

  /**
   * 启用/禁用缓存
   */
  setCacheEnabled(enabled) {
    if (!enabled) {
      this.decisionCache.clear();
    }
    this.cacheEnabled = enabled;
  }

  /**
   * 设置缓存超时时间
   */
  setCacheTimeout(timeout) {
    this.cacheTimeout = timeout;
  }

  /**
   * 获取决策详细信息（用于调试）
   */
  getDecisionDetails(character, context) {
    const availableOptions = this._getAvailableActions(character, context);
    const scoredOptions = this.evaluateOptions(character, context, availableOptions);
    const filteredOptions = this._applyConstraints(character, context, scoredOptions);
    
    return {
      totalOptions: availableOptions.length,
      scoredOptions: scoredOptions.length,
      filteredOptions: filteredOptions.length,
      topOptions: filteredOptions.slice(0, 5),
      characterNeeds: character.needs,
      characterVirtues: character.virtues,
      contextInfo: {
        timeOfDay: context.timeOfDay,
        weather: context.weather?.type,
        season: context.season
      },
      configurationStatus: {
        configuredActionsCount: this.configuredActions.size,
        availableActionsCount: availableOptions.length
      }
    };
  }

  /**
   * 批量决策（用于多角色同时决策）
   */
  makeBatchDecisions(characters, context) {
    const decisions = new Map();
    
    for (const character of characters) {
      if (character.isAlive) {
        try {
          const decision = this.makeDecision(character, context);
          decisions.set(character.id, decision);
        } catch (error) {
          console.error(`角色 ${character.name} 决策失败:`, error);
          decisions.set(character.id, this._getEmergencyDecision(character, context));
        }
      }
    }
    
    return decisions;
  }

  /**
   * 验证决策结果
   */
  validateDecision(decision, character, context) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    // 检查必需字段
    if (!decision.action) {
      validation.isValid = false;
      validation.errors.push("缺少行为字段");
    }
    
    if (!decision.location) {
      validation.isValid = false;
      validation.errors.push("缺少地点字段");
    }
    
    // 检查行为是否在配置中
    if (decision.action && !this.configuredActions.has(decision.action)) {
      validation.isValid = false;
      validation.errors.push(`行为 "${decision.action}" 未在配置中定义`);
    }
    
    // 检查行为是否在可用列表中
    const availableOptions = this._getAvailableActions(character, context);
    const isActionAvailable = availableOptions.some(
      option => option.action === decision.action && option.location === decision.location
    );
    
    if (!isActionAvailable) {
      validation.isValid = false;
      validation.errors.push("选择的行为不在当前可用列表中");
    }
    
    // 检查约束条件
    if (decision.action && decision.location) {
      if (!this._checkBasicConstraints(character, decision)) {
        validation.warnings.push("不满足基本约束条件");
      }
      
      if (!this._checkTimeConstraints(context, decision)) {
        validation.warnings.push("不符合时间约束");
      }
    }
    
    return validation;
  }

  /**
   * 获取系统健康状态
   */
  getSystemHealth() {
    const validationResult = this.getFinalValidationResult();
    const stats = this.getStats();
    
    return {
      status: validationResult.summary.unmatchedActions === 0 ? 'healthy' : 'warning',
      configurationHealth: {
        consistency: validationResult.summary.dataConsistencyRate,
        issues: validationResult.summary.unmatchedActions,
        totalActions: validationResult.summary.totalLocationActions
      },
      performanceHealth: {
        decisionsProcessed: stats.decisionsTotal,
        averageDecisionTime: `${stats.averageDecisionTime.toFixed(2)}ms`,
        cacheHitRate: `${(stats.cacheHitRate * 100).toFixed(1)}%`,
        cacheSize: stats.cacheSize
      },
      recommendations: validationResult.recommendations
    };
  }
}

export default DecisionEngine;
      