/**
 * character_module.js - 南北朝坞堡模拟器角色系统
 * 
 * 功能：管理角色的基础属性、状态、行为和生命周期
 * 优先级：⭐⭐⭐⭐⭐ (第一阶段核心模块)
 * 
 * 主要职责：
 * - 角色基础信息管理（姓名、年龄、性别等）
 * - 生理状态管理（健康、体力、需求等）
 * - 情绪状态管理（情感变化和稳定性）
 * - 角色行为队列和活动管理
 * - 德行系统集成接口
 * - 角色生命事件记录
 * - 与其他系统的交互接口
 */

import { DEFAULT_CONFIG } from './gameConfig.js';
import { Utils } from './utils_module.js';
import { VirtueSystem } from './virtue_system.js';
import { SkillSystem } from './skill_system.js';
import { AbilityTraits } from './personality_system.js';

/**
 * 生理状态类
 * 管理角色的基本生理需求和健康状态
 */
export class PhysicalState {
  constructor(config = {}) {
    // 基本生理需求 (0-100)
    this.hunger = config.hunger || 50;        // 饥饿程度 (越低越饿)
    this.thirst = config.thirst || 50;        // 口渴程度 (越低越渴)  
    this.energy = config.energy || 50;        // 体力精力
    this.cleanliness = config.cleanliness || 50; // 清洁程度
    this.temperature = config.temperature || 50; // 体温舒适度
    this.sleep = config.sleep || 50;          // 睡眠质量
    
    // 健康状态
    this.health = config.health || 80;        // 整体健康 (0-100)
    this.stamina = config.stamina || 50;      // 耐力
    this.immunity = config.immunity || 50;    // 免疫力
    
    // 生理周期
    this.lastMealTime = Date.now();
    this.lastSleepTime = Date.now();
    this.lastBathTime = Date.now();
    
    // 状态历史
    this.stateHistory = [];
    this.maxHistoryLength = 24; // 保留24小时的状态记录
  }

  /**
   * 更新生理状态
   * @param {number} deltaTime - 时间间隔（小时）
   * @param {Object} context - 环境上下文
   */
  update(deltaTime, context = {}) {
    const hoursPassed = deltaTime || 1;
    
    // 基础需求衰减
    this.hunger = Math.max(0, this.hunger - hoursPassed * 2.5);
    this.thirst = Math.max(0, this.thirst - hoursPassed * 3.0);
    this.energy = Math.max(0, this.energy - hoursPassed * 1.5);
    this.cleanliness = Math.max(0, this.cleanliness - hoursPassed * 0.8);
    
    // 根据环境调整
    if (context.weather === '炎热') {
      this.thirst = Math.max(0, this.thirst - hoursPassed * 1.0);
      this.temperature = Math.max(0, this.temperature - hoursPassed * 2.0);
    }
    
    if (context.isWorking) {
      this.energy = Math.max(0, this.energy - hoursPassed * 2.0);
      this.cleanliness = Math.max(0, this.cleanliness - hoursPassed * 1.5);
    }
    
    if (context.isResting) {
      this.energy = Math.min(100, this.energy + hoursPassed * 3.0);
      this.sleep = Math.min(100, this.sleep + hoursPassed * 4.0);
    }
    
    // 健康状态计算
    this.updateHealthStatus();
    
    // 记录状态历史
    this.recordStateHistory();
  }

  /**
   * 更新健康状态
   */
  updateHealthStatus() {
    // 基于基础需求计算健康状态
    const needsAverage = (this.hunger + this.thirst + this.energy + this.sleep) / 4;
    
    if (needsAverage < 20) {
      this.health = Math.max(0, this.health - 1);
      this.immunity = Math.max(0, this.immunity - 0.5);
    } else if (needsAverage > 70) {
      this.health = Math.min(100, this.health + 0.5);
      this.immunity = Math.min(100, this.immunity + 0.2);
    }
    
    // 体力基于健康和能量
    this.stamina = (this.health * 0.6 + this.energy * 0.4);
  }

  /**
   * 执行特定行为对生理状态的影响
   * @param {string} actionType - 行为类型
   * @param {number} efficiency - 执行效率
   */
  performAction(actionType, efficiency = 1.0) {
    const actionEffects = {
      '进食饮水': {
        hunger: 30 * efficiency,
        thirst: 40 * efficiency,
        energy: 5 * efficiency
      },
      '休息睡眠': {
        energy: 50 * efficiency,
        sleep: 60 * efficiency,
        health: 2 * efficiency
      },
      '盥洗沐浴': {
        cleanliness: 80 * efficiency,
        temperature: 20 * efficiency,
        energy: -5
      },
      '垦荒耕种': {
        energy: -15 * efficiency,
        hunger: -5 * efficiency,
        cleanliness: -10 * efficiency
      },
      '手工雕琢': {
        energy: -10 * efficiency,
        hunger: -3 * efficiency
      },
      '熔炼铸锻': {
        energy: -20 * efficiency,
        hunger: -8 * efficiency,
        cleanliness: -15 * efficiency,
        temperature: -10 * efficiency
      },
      '坞堡营造': {
        energy: -25 * efficiency,
        hunger: -10 * efficiency,
        cleanliness: -20 * efficiency
      }
    };
    
    const effects = actionEffects[actionType];
    if (effects) {
      for (const [attribute, change] of Object.entries(effects)) {
        if (this.hasOwnProperty(attribute)) {
          this[attribute] = Utils.Math.clamp(
            this[attribute] + change, 
            0, 
            100
          );
        }
      }
    }
  }

  /**
   * 记录状态历史
   */
  recordStateHistory() {
    const record = {
      timestamp: Date.now(),
      hunger: this.hunger,
      thirst: this.thirst,
      energy: this.energy,
      health: this.health,
      sleep: this.sleep
    };
    
    this.stateHistory.push(record);
    
    if (this.stateHistory.length > this.maxHistoryLength) {
      this.stateHistory.shift();
    }
  }

  /**
   * 获取生理状态摘要
   * @returns {Object} 状态摘要
   */
  getSummary() {
    const urgentNeeds = [];
    
    if (this.hunger < 20) urgentNeeds.push('饥饿');
    if (this.thirst < 20) urgentNeeds.push('口渴');
    if (this.energy < 20) urgentNeeds.push('疲惫');
    if (this.sleep < 20) urgentNeeds.push('困倦');
    if (this.cleanliness < 20) urgentNeeds.push('不洁');
    
    return {
      overallHealth: this.health,
      urgentNeeds: urgentNeeds,
      canWork: this.energy > 30 && this.health > 50,
      needsRest: this.energy < 25 || this.sleep < 25,
      needsFood: this.hunger < 30 || this.thirst < 30,
      needsCare: this.health < 30
    };
  }

  adjustState(adjustments) {
    try {
        if (!adjustments || typeof adjustments !== 'object') return;

        // 安全地调整各项状态
        const safeAdjust = (current, adjustment, min = 0, max = 100) => {
            if (typeof adjustment !== 'number') return current;
            return Math.max(min, Math.min(max, (current || 50) + adjustment));
        };

        // 应用调整
        if (adjustments.hunger !== undefined) {
            this.hunger = safeAdjust(this.hunger, adjustments.hunger);
        }
        if (adjustments.thirst !== undefined) {
            this.thirst = safeAdjust(this.thirst, adjustments.thirst);
        }
        if (adjustments.energy !== undefined) {
            this.energy = safeAdjust(this.energy, adjustments.energy);
        }
        if (adjustments.health !== undefined) {
            this.health = safeAdjust(this.health, adjustments.health);
        }
        if (adjustments.stamina !== undefined) {
            this.stamina = safeAdjust(this.stamina, adjustments.stamina);
        }
        if (adjustments.cleanliness !== undefined) {
            this.cleanliness = safeAdjust(this.cleanliness, adjustments.cleanliness);
        }
        if (adjustments.temperature !== undefined) {
            this.temperature = safeAdjust(this.temperature, adjustments.temperature);
        }
        if (adjustments.sleep !== undefined) {
            this.sleep = safeAdjust(this.sleep, adjustments.sleep);
        }

        // 记录状态变化
        this.recordStateChange(adjustments);
        
    } catch (error) {
        console.warn('⚠️ 调整生理状态失败:', error.message);
    }
}

recordStateChange(adjustments) {
  try {
      const record = {
          timestamp: Date.now(),
          adjustments: { ...adjustments },
          stateAfter: {
              hunger: this.hunger,
              thirst: this.thirst,
              energy: this.energy,
              health: this.health,
              stamina: this.stamina
          }
      };
      
      if (!this.stateHistory) {
          this.stateHistory = [];
      }
      
      this.stateHistory.push(record);
      
      // 保持历史记录在合理范围内
      if (this.stateHistory.length > this.maxHistoryLength) {
          this.stateHistory = this.stateHistory.slice(-this.maxHistoryLength);
      }
  } catch (error) {
      console.warn('⚠️ 记录状态变化失败:', error.message);
  }
}


  /**
   * 克隆生理状态
   * @returns {PhysicalState} 克隆的状态
   */
  clone() {
    return new PhysicalState({
      hunger: this.hunger,
      thirst: this.thirst,
      energy: this.energy,
      cleanliness: this.cleanliness,
      temperature: this.temperature,
      sleep: this.sleep,
      health: this.health,
      stamina: this.stamina,
      immunity: this.immunity
    });
  }
}

/**
 * 情绪状态类
 * 管理角色的情感状态和心理健康
 */
export class EmotionalState {
  constructor(config = {}) {
    // 基础情绪 (0-100)
    this.happiness = config.happiness || 50;    // 快乐
    this.sadness = config.sadness || 20;        // 悲伤
    this.anger = config.anger || 20;            // 愤怒
    this.fear = config.fear || 20;              // 恐惧
    this.anxiety = config.anxiety || 30;        // 焦虑
    this.shame = config.shame || 20;            // 羞耻
    this.boredom = config.boredom || 30;        // 无聊
    this.loneliness = config.loneliness || 30;  // 孤独
    
    // 情绪稳定性
    this.emotionalStability = config.emotionalStability || 50;
    
    // 情绪历史
    this.emotionHistory = [];
    this.maxHistoryLength = 48; // 保留48小时的情绪记录
  }

  /**
   * 更新情绪状态
   * @param {number} deltaTime - 时间间隔
   * @param {Object} context - 情绪上下文
   */
  update(deltaTime, context = {}) {
    const hoursPassed = deltaTime || 1;
    
    // 情绪自然回归
    this.happiness = this.naturalRegression(this.happiness, 50, hoursPassed * 0.5);
    this.sadness = this.naturalRegression(this.sadness, 20, hoursPassed * 0.3);
    this.anger = this.naturalRegression(this.anger, 20, hoursPassed * 0.4);
    this.anxiety = this.naturalRegression(this.anxiety, 25, hoursPassed * 0.3);
    this.boredom = this.naturalRegression(this.boredom, 30, hoursPassed * 0.2);
    this.loneliness = this.naturalRegression(this.loneliness, 25, hoursPassed * 0.2);
    
    // 根据生理状态调整情绪
    if (context.physicalState) {
      this.adjustEmotionByPhysicalState(context.physicalState);
    }
    
    // 根据社交情况调整情绪
    if (context.socialContext) {
      this.adjustEmotionBySocialContext(context.socialContext);
    }
    
    // 记录情绪历史
    this.recordEmotionalState();
  }

  /**
   * 情绪自然回归函数
   * @param {number} current - 当前值
   * @param {number} target - 目标值
   * @param {number} rate - 回归速度
   * @returns {number} 调整后的值
   */
  naturalRegression(current, target, rate) {
    const difference = target - current;
    const change = difference * rate * 0.1;
    return Utils.Math.clamp(current + change, 0, 100);
  }

  /**
   * 根据生理状态调整情绪
   * @param {PhysicalState} physicalState - 生理状态
   */
  adjustEmotionByPhysicalState(physicalState) {
    // 健康状况影响情绪
    if (physicalState.health < 30) {
      this.sadness = Math.min(100, this.sadness + 2);
      this.anxiety = Math.min(100, this.anxiety + 1);
    }
    
    // 饥饿和口渴影响情绪
    if (physicalState.hunger < 20 || physicalState.thirst < 20) {
      this.anger = Math.min(100, this.anger + 3);
      this.anxiety = Math.min(100, this.anxiety + 2);
      this.happiness = Math.max(0, this.happiness - 2);
    }
    
    // 疲劳影响情绪
    if (physicalState.energy < 20) {
      this.boredom = Math.min(100, this.boredom + 2);
      this.anger = Math.min(100, this.anger + 1);
    }
    
    // 良好状态提升情绪
    if (physicalState.health > 80 && physicalState.energy > 70) {
      this.happiness = Math.min(100, this.happiness + 1);
    }
  }

  /**
   * 根据社交环境调整情绪
   * @param {Object} socialContext - 社交上下文
   */
  adjustEmotionBySocialContext(socialContext) {
    if (socialContext.isAlone) {
      this.loneliness = Math.min(100, this.loneliness + 1);
      this.boredom = Math.min(100, this.boredom + 1);
    } else {
      this.loneliness = Math.max(0, this.loneliness - 2);
    }
    
    if (socialContext.hasConflict) {
      this.anger = Math.min(100, this.anger + 5);
      this.sadness = Math.min(100, this.sadness + 2);
    }
    
    if (socialContext.hasPositiveInteraction) {
      this.happiness = Math.min(100, this.happiness + 3);
      this.loneliness = Math.max(0, this.loneliness - 3);
    }
  }

  /**
   * 调整情绪
   * @param {Object} moodEffect - 情绪影响
   */
  adjustMood(moodEffect) {
    for (const [emotion, change] of Object.entries(moodEffect)) {
      if (this.hasOwnProperty(emotion)) {
        this[emotion] = Utils.Math.clamp(
          this[emotion] + change,
          0,
          100
        );
      }
    }
  }

  /**
   * 获取主导情绪
   * @returns {string} 主导情绪名称
   */
  getDominantEmotion() {
    const emotions = {
      happiness: this.happiness,
      sadness: this.sadness,
      anger: this.anger,
      fear: this.fear,
      anxiety: this.anxiety,
      boredom: this.boredom,
      loneliness: this.loneliness
    };

    let maxEmotion = 'happiness';
    let maxValue = this.happiness;

    for (const [emotion, value] of Object.entries(emotions)) {
      if (value > maxValue) {
        maxEmotion = emotion;
        maxValue = value;
      }
    }

    return maxEmotion;
  }

  /**
   * 获取情绪稳定性
   * @returns {number} 稳定性评分 (0-100)
   */
  getEmotionalStability() {
    const negativeEmotions = this.sadness + this.anger + this.fear + this.anxiety + this.shame;
    const totalEmotions = negativeEmotions + this.happiness;
    
    if (totalEmotions === 0) return 50;
    
    const stability = (this.happiness / totalEmotions) * 100;
    return Utils.Math.clamp(stability, 0, 100);
  }

  /**
   * 记录情绪状态
   */
  recordEmotionalState() {
    const record = {
      timestamp: Date.now(),
      dominantEmotion: this.getDominantEmotion(),
      stability: this.getEmotionalStability(),
      happiness: this.happiness,
      negativeTotal: this.sadness + this.anger + this.fear + this.anxiety
    };
    
    this.emotionHistory.push(record);
    
    if (this.emotionHistory.length > this.maxHistoryLength) {
      this.emotionHistory.shift();
    }
  }

  /**
   * 获取情绪摘要
   * @returns {Object} 情绪摘要
   */
  getSummary() {
    return {
      dominantEmotion: this.getDominantEmotion(),
      stability: this.getEmotionalStability(),
      happiness: this.happiness,
      sadness: this.sadness,
      anger: this.anger,
      anxiety: this.anxiety,
      loneliness: this.loneliness,
      boredom: this.boredom,
      recentHistory: this.emotionHistory.slice(-3)
    };
  }

  /**
   * 克隆情绪状态
   * @returns {EmotionalState} 克隆的状态
   */
  clone() {
    return new EmotionalState({
      happiness: this.happiness,
      sadness: this.sadness,
      anger: this.anger,
      fear: this.fear,
      anxiety: this.anxiety,
      shame: this.shame,
      boredom: this.boredom,
      loneliness: this.loneliness,
      emotionalStability: this.emotionalStability
    });
  }
}

/**
 * 人物基础类
 * 南北朝坞堡中的NPC角色
 */
class Character {
  constructor(config = {}) {
    // 基础信息
    this.characterId = config.characterId || config.id || Utils.String.generateId();
    this.id = config.id || this.characterId;
    this.name = config.name || this.generateRandomName(config.gender);
    this.age = config.age || Utils.Math.randomInt(16, 60);
    this.gender = config.gender || (Math.random() > 0.5 ? '男' : '女');
    this.birthDate = config.birthDate || Date.now() - (this.age * 365 * 24 * 60 * 60 * 1000);

    // 添加家族相关字段
    this.family = {
      bloodRelations: new Map(),
      familyMembers: new Map()
    };
    this.familyName = config.familyName || null;
    this.originalFamily = config.originalFamily || null;
    this.currentFamily = config.currentFamily || null;
    this.socialClass = config.socialClass || null;
    this.generationLevel = config.generationLevel || null;
    this.familyRole = config.familyRole || null;
    this.vitalStatus = config.vitalStatus || 'living';
    this.bloodlineTitle = config.bloodlineTitle || null;

    // 婚姻信息
    this.spouseId = config.spouseId || null;
    this.marriageStatus = config.marriageStatus || 'single';
    this.hasSpouse = config.hasSpouse || false;

    // 外观属性
    this.appearance = {
      height: config.height || Utils.Math.randomInt(150, 180),
      weight: config.weight || Utils.Math.randomInt(45, 80),
      beauty: config.beauty || Utils.Math.randomInt(30, 70)
    };
    
    // 角色职业和社会地位
    this.role = config.role || 'resident';
    this.socialStatus = config.socialStatus || 'commoner';
    this.occupation = config.occupation || null;
    
    // 状态系统
    this.physicalState = new PhysicalState(config.physicalState);
    this.emotionalState = new EmotionalState(config.emotionalState);

    // 能力特质系统
    this.abilityTraits = new AbilityTraits(this.generateAbilityTraits());

    // 行为偏好记录
    this.actionPreferences = new Map();
    this.behaviorHistory = [];
    
    // 位置和活动
    this.currentLocation = config.location || '住宅区';
    this.currentActivity = config.activity || null;
    this.activityStartTime = null;
    
    // 行为队列
    this.actionQueue = [];
    this.currentAction = null;
    
    // 目标和计划
    this.currentGoals = config.goals || [];
    this.longTermGoals = [];
    this.priorities = {
      survival: 80,
      social: 60,
      achievement: 40,
      leisure: 30
    };
    
    // 统计数据
    this.statistics = {
      totalActions: 0,
      workDays: 0,
      socialInteractions: 0,
      healthEvents: 0,
      learningTime: 0,
      birthsWitnessed: 0,
      deathsWitnessed: 0
    };
    
    // 生活事件记录
    this.lifeEvents = [];
    this.maxLifeEvents = 100;
    
    // 系统集成接口
    this.virtueSystem = null;
    this.skillSystem = null;
    this.memorySystem = null;
    // 标记需要三层关系系统初始化
    this._needsThreeLayerRelationships = true;
    this._relationshipSystemsInitialized = false;
    this.relationshipSystem = null; // 保持兼容性

    // 初始化能力特质系统
    this.abilityTraits = this.generateAbilityTraits();

    // 行为偏好记录
    this.actionPreferences = new Map();
    this.behaviorHistory = [];
    
    // 性格缓存
    this.personalityCache = null;
    this.personalityCacheTime = 0;
    
    // 初始化事件系统
    this.eventListeners = new Map();

    // 创建子系统
    this.createSubSystems();
    
    console.log(`角色创建完成: ${this.name} (${this.gender}, ${this.age}岁)`);
  }

  // ==================== 基础信息管理 ====================

  /**
   * 生成随机姓名
   * @param {string} gender - 性别
   * @returns {string} 随机姓名
   */
  generateRandomName(gender) {
    const nameConfig = DEFAULT_CONFIG.CHARACTER_GENERATION?.NAMES;
    if (!nameConfig) {
      // 备用姓名生成
      const surnames = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周'];
      const maleNames = ['伟', '强', '明', '华', '军', '建', '国', '平', '涛', '磊'];
      const femaleNames = ['丽', '娟', '芳', '静', '敏', '霞', '燕', '红', '梅', '玲'];
      
      const surname = Utils.Array.randomChoice(surnames);
      const firstName = gender === '男' ? 
        Utils.Array.randomChoice(maleNames) : 
        Utils.Array.randomChoice(femaleNames);
      
      return surname + firstName;
    }
    
    const surname = Utils.Array.randomChoice(nameConfig.surnames);
    const firstNames = gender === '男' ? 
      nameConfig.maleFirstNames : 
      nameConfig.femaleFirstNames;
    const firstName = Utils.Array.randomChoice(firstNames);
    
    return surname + firstName;
  }

  /**
   * 获取年龄分类
   * @returns {Object} 年龄分类配置
   */
  getAgeCategory() {
    const ageRanges = DEFAULT_CONFIG.CHARACTER_GENERATION?.AGE_RANGES || {
      child: { min: 0, max: 12, name: '幼童' },
      teenager: { min: 13, max: 17, name: '少年' },
      adult: { min: 18, max: 59, name: '成人' },
      elder: { min: 60, max: 100, name: '长者' }
    };
    
    for (const [category, range] of Object.entries(ageRanges)) {
      if (this.age >= range.min && this.age <= range.max) {
        return { category, ...range };
      }
    }
    
    return ageRanges.adult;
  }

  /**
   * 设置德行系统
   * @param {VirtueSystem} virtueSystem - 德行系统实例
   */
  setVirtueSystem(virtueSystem) {
    this.virtueSystem = virtueSystem;
    console.log(`${this.name} 的德行系统已连接`);
  }

  /**
   * 设置技能系统
   * @param {SkillSystem} skillSystem - 技能系统实例
   */
  setSkillSystem(skillSystem) {
    this.skillSystem = skillSystem;
    console.log(`${this.name} 的技能系统已连接`);
  }

  // ==================== 行为和活动管理 ====================

  /**
   * 添加行为到队列
   * @param {Object} action - 行为对象
   */
  addAction(action) {
    const actionData = {
      type: action.type,
      duration: action.duration || 1,
      remainingTime: action.duration || 1,
      priority: action.priority || 1,
      efficiency: action.efficiency || 1.0,
      location: action.location || this.currentLocation,
      ...action
    };
    
    this.actionQueue.push(actionData);
    
    // 按优先级排序
    this.actionQueue.sort((a, b) => b.priority - a.priority);
    
    console.log(`${this.name} 添加行为: ${action.type}`);
  }

  /**
   * 处理行为队列
   * @param {number} deltaTime - 时间间隔
   */
  processActionQueue(deltaTime) {
    if (this.currentAction) {
      // 处理当前行为
      this.currentAction.remainingTime -= deltaTime;
      
      if (this.currentAction.remainingTime <= 0) {
        this.completeAction(this.currentAction);
        this.currentAction = null;
      }
    }
    
    // 从队列中取出下一个行为
    if (!this.currentAction && this.actionQueue.length > 0) {
      this.currentAction = this.actionQueue.shift();
      this.startAction(this.currentAction);
    }
  }

  /**
   * 开始执行行为
   * @param {Object} action - 行为对象
   */
  startAction(action) {
    console.log(`${this.name} 开始执行: ${action.type}`);
    this.currentActivity = action.type;
    this.activityStartTime = Date.now();
    this.statistics.totalActions++;
    
    // 移动到指定地点
    if (action.location && action.location !== this.currentLocation) {
      this.moveTo(action.location);
    }
    
    // 触发行为开始事件
    this.emitEvent('actionStarted', { character: this, action });
  }

  /**
   * 完成行为
   * @param {Object} action - 行为对象
   */
  completeAction(action) {
    console.log(`${this.name} 完成了: ${action.type}`);
    
    // 应用行为效果
    this.applyActionEffects(action);
    
    // 更新统计
    this.updateStatistics(action);
    
    // 记录生活事件
    this.recordLifeEvent({
      type: 'action_completed',
      action: action.type,
      timestamp: Date.now(),
      location: this.currentLocation,
      duration: action.duration,
      efficiency: action.efficiency
    });
    
    this.currentActivity = null;
    this.activityStartTime = null;
    
    // 触发行为完成事件
    this.emitEvent('actionCompleted', { character: this, action });
  }

  /**
   * 应用行为效果
   * @param {Object} action - 行为对象
   */
  applyActionEffects(action) {
    // 生理效果
    this.physicalState.performAction(action.type, action.efficiency || 1.0);
    
    // 情绪效果
    if (action.moodEffect) {
      this.emotionalState.adjustMood(action.moodEffect);
    }
    
    // 德行影响
    if (this.virtueSystem && action.virtueEffect) {
      for (const [virtue, change] of Object.entries(action.virtueEffect)) {
        this.virtueSystem.influenceByBehavior(action.type, change);
      }
    }
    
    // 技能经验
    if (this.skillSystem && action.skillGain) {
      this.skillSystem.gainExperience(action.type, action.skillGain);
    }
  }

  /**
   * 移动到指定地点
   * @param {string} location - 目标地点
   */
  moveTo(location) {
    const previousLocation = this.currentLocation;
    this.currentLocation = location;
    
    console.log(`${this.name} 从 ${previousLocation} 移动到 ${location}`);
    
    // 记录移动事件
    this.recordLifeEvent({
      type: 'movement',
      from: previousLocation,
      to: location,
      timestamp: Date.now()
    });
    
    // 触发移动事件
    this.emitEvent('characterMoved', {
      character: this,
      from: previousLocation,
      to: location
    });
  }

  // ==================== 状态更新和管理 ====================

  /**
   * 更新角色状态
   * @param {number} deltaTime - 时间间隔
   * @param {Object} environment - 环境信息
   */
  update(deltaTime, environment = {}) {
    // 更新生理状态
    const physicalContext = {
      ...environment,
      isResting: this.currentActivity === '休息睡眠',
      isWorking: this.isWorkingActivity(this.currentActivity)
    };
    this.physicalState.update(deltaTime, physicalContext);
    
    // 更新情绪状态
    const emotionalContext = {
      ...environment,
      physicalState: this.physicalState,
      socialContext: this.getSocialContext()
    };
    this.emotionalState.update(deltaTime, emotionalContext);
    
    // 处理行为队列
    this.processActionQueue(deltaTime);
    
    // 年龄增长
    this.ageGrowth(deltaTime);
    
    // 清除过期的个性缓存
    if (Date.now() - this.personalityCacheTime > 300000) { // 5分钟
      this.personalityCache = null;
    }
  }

  /**
   * 检查是否为工作活动
   * @param {string} activity - 活动名称
   * @returns {boolean} 是否为工作活动
   */
  isWorkingActivity(activity) {
    if (!activity) return false;
    
    const workCategories = ['生产类', '建设类', '商业类'];
    const behaviorCategories = DEFAULT_CONFIG.BEHAVIOR_CATEGORIES;
    
    if (!behaviorCategories) return false;
    
    for (const [category, config] of Object.entries(behaviorCategories)) {
      if (workCategories.includes(category) && config.actions && config.actions.includes(activity)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 获取社交环境上下文
   * @returns {Object} 社交上下文
   */
  getSocialContext() {
    // 这里需要与关系系统和位置系统集成
    // 暂时返回简单的模拟数据
    return {
      isAlone: Math.random() > 0.7,
      hasConflict: Math.random() < 0.1,
      hasPositiveInteraction: Math.random() < 0.3,
      nearbyPeople: Math.floor(Math.random() * 5)
    };
  }

  /**
   * 年龄增长
   * @param {number} deltaTime - 时间间隔
   */
  ageGrowth(deltaTime) {
    // 简单的年龄增长逻辑
    // 实际游戏中可能需要更复杂的时间系统
    const ageIncrement = deltaTime / (365 * 24); // 假设deltaTime是小时
    this.age += ageIncrement;
  }

  // ==================== 统计和记录管理 ====================

  /**
   * 更新统计数据
   * @param {Object} action - 行为对象
   */
  updateStatistics(action) {
    const category = this.getActionCategory(action.type);
    
    switch (category) {
      case '生产类':
      case '建设类':
        this.statistics.workDays += action.duration || 1;
        break;
      case '社交责任类':
      case '娱乐类':
        this.statistics.socialInteractions++;
        break;
      case '生理需求类':
        if (action.type === '求医用药') {
          this.statistics.healthEvents++;
        }
        break;
      case '研究学习类':
        this.statistics.learningTime += action.duration || 1;
        break;
    }
  }

  /**
   * 获取行为所属分类
   * @param {string} actionType - 行为类型
   * @returns {string} 行为分类
   */
  getActionCategory(actionType) {
    const behaviorCategories = DEFAULT_CONFIG.BEHAVIOR_CATEGORIES;
    
    if (!behaviorCategories) return '未知类别';
    
    for (const [category, config] of Object.entries(behaviorCategories)) {
      if (config.actions && config.actions.includes(actionType)) {
        return category;
      }
    }
    
    return '未知类别';
  }

  /**
   * 记录生活事件
   * @param {Object} event - 事件对象
   */
  recordLifeEvent(event) {
    const lifeEvent = {
      id: Utils.String.generateId(),
      timestamp: event.timestamp || Date.now(),
      type: event.type,
      description: this.generateEventDescription(event),
      ...event
    };
    
    this.lifeEvents.push(lifeEvent);
    
    // 保持事件记录在合理范围内
    if (this.lifeEvents.length > this.maxLifeEvents) {
      this.lifeEvents.shift();
    }
    
    // 触发生活事件记录事件
    this.emitEvent('lifeEventRecorded', { character: this, event: lifeEvent });
  }

  /**
   * 生成事件描述
   * @param {Object} event - 事件对象
   * @returns {string} 事件描述
   */
  generateEventDescription(event) {
    const descriptions = {
      'action_completed': `在${event.location}完成了${event.action}`,
      'movement': `从${event.from}移动到${event.to}`,
      'birth': `见证了新生命的诞生`,
      'death': `经历了生离死别`,
      'marriage': `参与了婚礼仪式`,
      'festival': `参加了节庆活动`,
      'disaster': `经历了自然灾害`,
      'achievement': `获得了重要成就`
    };
    
    return descriptions[event.type] || `发生了${event.type}事件`;
  }

  // ==================== 个性和特征分析 ====================

  /**
   * 获取个性特征（缓存版本）
   * @returns {Object} 个性特征
   */
  getPersonalityTraits() {
    const now = Date.now();
    
    // 如果缓存有效，直接返回
    if (this.personalityCache && (now - this.personalityCacheTime) < 300000) {
      return this.personalityCache;
    }
    
    // 重新计算个性特征
    const traits = this.calculatePersonalityTraits();
    
    // 更新缓存
    this.personalityCache = traits;
    this.personalityCacheTime = now;
    
    return traits;
  }

  /**
   * 计算个性特征
   * @returns {Object} 个性特征
   */
  calculatePersonalityTraits() {
    const traits = {
      dominant: [],
      secondary: [],
      summary: '',
      compatibility: {}
    };
    
    // 基于德行系统的个性特征
    if (this.virtueSystem) {
      const virtueTraits = this.virtueSystem.getPersonalityTraits();
      traits.dominant = virtueTraits.slice(0, 3);
      traits.secondary = virtueTraits.slice(3, 6);
    }
    
    // 基于行为模式的特征
    const behaviorTraits = this.analyzeBehaviorPatterns();
    traits.behavioral = behaviorTraits;
    
    // 基于情绪状态的特征
    const emotionalTraits = this.analyzeEmotionalPatterns();
    traits.emotional = emotionalTraits;
    
    // 生成个性摘要
    traits.summary = this.generatePersonalitySummary(traits);
    
    return traits;
  }

  /**
   * 分析行为模式
   * @returns {Object} 行为特征
   */
  analyzeBehaviorPatterns() {
    const patterns = {
      workOriented: this.statistics.workDays > this.statistics.socialInteractions,
      social: this.statistics.socialInteractions > 10,
      studious: this.statistics.learningTime > 50,
      healthConscious: this.statistics.healthEvents < 3,
      productive: this.statistics.totalActions > 100
    };
    
    return patterns;
  }

  /**
   * 分析情绪模式
   * @returns {Object} 情绪特征
   */
  analyzeEmotionalPatterns() {
    const emotionalSummary = this.emotionalState.getSummary();
    
    return {
      stable: emotionalSummary.stability > 70,
      optimistic: emotionalSummary.happiness > 60,
      anxious: emotionalSummary.anxiety > 60,
      social: emotionalSummary.loneliness < 30,
      energetic: emotionalSummary.boredom < 40
    };
  }

  /**
   * 生成个性摘要
   * @param {Object} traits - 特征数据
   * @returns {string} 个性摘要
   */
  generatePersonalitySummary(traits) {
    let summary = `${this.name}是一个`;
    
    if (traits.emotional?.optimistic) {
      summary += '乐观开朗的';
    } else if (traits.emotional?.anxious) {
      summary += '谨慎内敛的';
    } else {
      summary += '性格平和的';
    }
    
    if (traits.behavioral?.workOriented) {
      summary += '勤劳之人';
    } else if (traits.behavioral?.social) {
      summary += '善于交际之人';
    } else {
      summary += '普通居民';
    }
    
    return summary;
  }

  // ==================== 事件系统 ====================

  /**
   * 注册事件监听器
   * @param {string} eventType - 事件类型
   * @param {Function} callback - 回调函数
   */
  on(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(callback);
  }

  /**
   * 移除事件监听器
   * @param {string} eventType - 事件类型
   * @param {Function} callback - 回调函数
   */
  off(eventType, callback) {
    if (this.eventListeners.has(eventType)) {
      const listeners = this.eventListeners.get(eventType);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   * @param {string} eventType - 事件类型
   * @param {Object} eventData - 事件数据
   */
  emitEvent(eventType, eventData) {
    if (this.eventListeners.has(eventType)) {
      const listeners = this.eventListeners.get(eventType);
      for (const callback of listeners) {
        try {
          callback(eventData);
        } catch (error) {
          console.error(`事件处理错误 ${eventType}:`, error);
        }
      }
    }
  }

  // ==================== 状态获取和设置 ====================

  /**
   * 获取角色完整状态
   * @returns {Object} 角色状态
   */
  getState() {
    return {
      // 基础信息
      id: this.id,
      name: this.name,
      age: Math.floor(this.age),
      gender: this.gender,
      role: this.role,
      socialStatus: this.socialStatus,
      occupation: this.occupation,
      
      // 外观
      appearance: { ...this.appearance },
      
      // 位置和活动
      currentLocation: this.currentLocation,
      currentActivity: this.currentActivity,
      
      // 状态
      physicalState: this.physicalState.getSummary(),
      emotionalState: this.emotionalState.getSummary(),
      
      // 统计
      statistics: { ...this.statistics },
      
      // 目标和优先级
      currentGoals: [...this.currentGoals],
      priorities: { ...this.priorities },
      
      // 最近事件
      recentEvents: this.lifeEvents.slice(-5),
      
      // 个性特征
      personality: this.getPersonalityTraits(),
      
      // ⭐ 添加系统状态序列化
      virtueSystemState: this.virtueSystem ? this.virtueSystem.getState() : null,
      skillSystemState: this.skillSystem ? this.skillSystem.getState() : null,
      memorySystemState: this.memorySystem ? this.memorySystem.getState() : null,
      relationshipSystemState: this.relationshipSystem ? this.relationshipSystem.getState() : null
    };
  }

  /**
   * 设置角色状态
   * @param {Object} state - 角色状态
   */
  setState(state) {
    // 基础信息
    if (state.name) this.name = state.name;
    if (state.age) this.age = state.age;
    if (state.gender) this.gender = state.gender;
    if (state.role) this.role = state.role;
    if (state.socialStatus) this.socialStatus = state.socialStatus;
    if (state.occupation) this.occupation = state.occupation;
  
    // 外观
    if (state.appearance) {
      this.appearance = { ...this.appearance, ...state.appearance };
    }
    
    // 位置和活动
    if (state.currentLocation) this.currentLocation = state.currentLocation;
    if (state.currentActivity) this.currentActivity = state.currentActivity;
    
    // 目标和优先级
    if (state.currentGoals) this.currentGoals = [...state.currentGoals];
    if (state.priorities) this.priorities = { ...this.priorities, ...state.priorities };
    
    // 统计数据
    if (state.statistics) {
      this.statistics = { ...this.statistics, ...state.statistics };
    }
    
    // ⭐ 添加系统状态恢复
    if (state.virtueSystemState && this.virtueSystem) {
      this.virtueSystem.setState(state.virtueSystemState);
    } else if (state.virtueSystemState && !this.virtueSystem) {
      // 如果没有德行系统但有保存的状态，重新创建并恢复
      const VirtueSystemClass = window.gameEngine?.virtueSystem?.constructor;
      if (VirtueSystemClass) {
        this.virtueSystem = new VirtueSystemClass(this.id);
        this.virtueSystem.setState(state.virtueSystemState);
      }
    }
    

    if (state.skillSystemState && this.skillSystem) {
      this.skillSystem.setState(state.skillSystemState);
    }
    
    if (state.memorySystemState && this.memorySystem) {
      this.memorySystem.setState(state.memorySystemState);
    }
    
    if (state.relationshipSystemState && this.relationshipSystem) {
      this.relationshipSystem.setState(state.relationshipSystemState);
    }
  
    console.log(`角色状态已更新: ${this.name}`);
  }

  /**
   * 获取角色简要信息
   * @returns {Object} 简要信息
   */
  getBasicInfo() {
    return {
      id: this.id,
      name: this.name,
      age: Math.floor(this.age),
      gender: this.gender,
      location: this.currentLocation,
      activity: this.currentActivity,
      health: Math.floor(this.physicalState.health),
      mood: this.emotionalState.getDominantEmotion()
    };
  }

  /**
   * 克隆角色
   * @returns {Character} 克隆的角色
   */
  clone() {
    const clonedConfig = {
      id: this.id + '_clone',
      name: this.name,
      age: this.age,
      gender: this.gender,
      height: this.appearance.height,
      weight: this.appearance.weight,
      beauty: this.appearance.beauty,
      location: this.currentLocation,
      activity: this.currentActivity,
      goals: [...this.currentGoals],
      birthDate: this.birthDate,
      physicalState: this.physicalState.clone(),
      emotionalState: this.emotionalState.clone()
    };
    
    return new Character(clonedConfig);
  }

  /**
     * 生成能力特质
     * @returns {Object} 能力特质
     */
  generateAbilityTraits() {
    const ageCategory = this.getAgeCategory();
    const genderModifiers = this.gender === '男' ? 
      { strength_burst: 8, strength_endurance: 5, leadership: 5, empathy: -3 } :
      { dexterity: 5, empathy: 8, charisma: 3, creativity: 3 };
    
    const abilities = {};
    const baseAbilities = [
      'strength_burst', 'strength_endurance', 'dexterity', 'constitution',
      'memory', 'creativity', 'logic', 'focus',
      'charisma', 'empathy', 'leadership'
    ];
    
    for (const ability of baseAbilities) {
      let base = Utils.Math.randomInt(35, 65);
      
      // 年龄修正
      if (ageCategory.category === 'young') {
        if (['strength_burst', 'dexterity', 'creativity'].includes(ability)) base += 8;
        if (['memory', 'focus'].includes(ability)) base += 5;
      } else if (ageCategory.category === 'elderly') {
        if (['strength_burst', 'dexterity'].includes(ability)) base -= 15;
        if (['memory', 'logic', 'empathy'].includes(ability)) base += 10;
      }
      
      // 性别修正
      if (genderModifiers[ability]) {
        base += genderModifiers[ability];
      }
      
      // 社会阶层修正
      if (this.socialClass === '门阀士族') {
        if (['memory', 'creativity', 'charisma', 'leadership'].includes(ability)) base += 12;
      } else if (this.socialClass === '工匠') {
        if (['dexterity', 'creativity', 'focus'].includes(ability)) base += 15;
      } else if (this.socialClass === '胡族') {
        if (['strength_burst', 'strength_endurance', 'constitution'].includes(ability)) base += 12;
      }
      
      abilities[ability] = Utils.Math.clamp(base, 0, 100);
    }
    
    return abilities;
  }

  /**
   * 计算行为偏好
   * @param {Array} availableActions - 可用行为列表
   * @returns {Object} 行为偏好分数
   */
  calculateActionPreferences(availableActions) {
    const preferences = {};
    
    for (const action of availableActions) {
      let score = 1.0;
      
      // 物理需求影响
      score *= this.getPhysicalNeedModifier(action);
      
      // 情绪状态影响
      score *= this.getEmotionalActionModifier(action);
      
      // 能力匹配影响
      score *= this.getAbilityActionMatch(action);
      
      // 德行系统影响
      if (this.virtueSystem) {
        score *= this.getVirtueActionModifier(action);
      }
      
      // 历史偏好影响
      const historicalPreference = this.actionPreferences.get(action) || 0;
      score += historicalPreference * 0.1;
      
      preferences[action] = Math.max(0.1, score);
    }
    
    return preferences;
  }

  /**
   * 获取物理需求对行为的修正
   * @param {string} action - 行为名称
   * @returns {number} 修正系数
   */
  getPhysicalNeedModifier(action) {
    let modifier = 1.0;
    const physical = this.physicalState;
    
    // 紧急需求大幅提高相关行为偏好
    if (physical.hunger < 30 && ['进食饮水'].includes(action)) {
      modifier += (30 - physical.hunger) / 10;
    }
    if (physical.thirst < 30 && ['进食饮水'].includes(action)) {
      modifier += (30 - physical.thirst) / 10;
    }
    if (physical.energy < 25 && ['休息睡眠'].includes(action)) {
      modifier += (25 - physical.energy) / 10;
    }
    if (physical.cleanliness < 30 && ['盥洗沐浴'].includes(action)) {
      modifier += (30 - physical.cleanliness) / 10;
    }
    if (physical.health < 50 && ['医治休养', '休息睡眠'].includes(action)) {
      modifier += (50 - physical.health) / 20;
    }
    
    // 状态不佳时降低高消耗行为偏好
    if (physical.energy < 40) {
      if (['垦荒耕种', '坞堡营造', '熔炼铸锻'].includes(action)) {
        modifier *= 0.5;
      }
    }
    
    return Math.max(0.1, modifier);
  }

  /**
   * 获取情绪对行为的修正
   * @param {string} action - 行为名称
   * @returns {number} 修正系数
   */
  getEmotionalActionModifier(action) {
    let modifier = 1.0;
    const emotional = this.emotionalState;
    
    // 孤独感影响社交行为
    if (emotional.loneliness > 50) {
      if (['觅求好友', '饮酒聚宴', '追求伴侣'].includes(action)) {
        modifier += 0.5;
      }
    }
    
    // 无聊影响娱乐行为
    if (emotional.boredom > 50) {
      if (['踏青出游', '艺术创作', '起舞弄乐', '赌博对弈'].includes(action)) {
        modifier += 0.3;
      }
    }
    
    // 愤怒影响行为选择
    if (emotional.anger > 50) {
      if (['武艺精进', '独处思考'].includes(action)) {
        modifier += 0.2;
      }
      if (['觅求好友', '饮酒聚宴'].includes(action)) {
        modifier *= 0.7; // 愤怒时不太愿意社交
      }
    }
    
    // 焦虑影响行为选择
    if (emotional.anxiety > 60) {
      if (['休息睡眠', '经义研读', '独处思考'].includes(action)) {
        modifier += 0.2;
      }
      if (['赌博对弈', '追求伴侣'].includes(action)) {
        modifier *= 0.5; // 焦虑时回避风险行为
      }
    }
    
    // 快乐促进积极行为
    if (emotional.happiness > 60) {
      if (['艺术创作', '起舞弄乐', '觅求好友'].includes(action)) {
        modifier += 0.2;
      }
    }
    
    return Math.max(0.2, modifier);
  }

  /**
   * 获取能力与行为的匹配度
   * @param {string} action - 行为名称
   * @returns {number} 匹配度系数
   */
  getAbilityActionMatch(action) {
    if (!this.abilityTraits) return 1.0;
    
    const skillAbilityMap = {
      '垦荒耕种': { strength_endurance: 0.6, constitution: 0.4 },
      '拓地伐林': { strength_burst: 0.5, dexterity: 0.3, constitution: 0.2 },
      '手工雕琢': { dexterity: 0.7, creativity: 0.2, focus: 0.1 },
      '经义研读': { memory: 0.5, logic: 0.3, focus: 0.2 },
      '艺术创作': { creativity: 0.6, dexterity: 0.2, memory: 0.2 },
      '觅求好友': { charisma: 0.5, empathy: 0.3, leadership: 0.2 },
      '武艺精进': { strength_burst: 0.4, dexterity: 0.4, constitution: 0.2 },
      '熔炼铸锻': { strength_burst: 0.3, dexterity: 0.4, focus: 0.3 },
      '商业贸易': { charisma: 0.4, logic: 0.3, memory: 0.3 }
    };
    
    const relevantAbilities = skillAbilityMap[action] || {};
    let matchScore = 1.0;
    
    for (const [ability, weight] of Object.entries(relevantAbilities)) {
      const abilityValue = this.abilityTraits[ability] || 50;
      matchScore += (abilityValue - 50) / 100 * weight;
    }
    
    return Math.max(0.3, matchScore);
  }

  /**
   * 获取德行对行为的修正
   * @param {string} action - 行为名称
   * @returns {number} 修正系数
   */
  getVirtueActionModifier(action) {
    // 这里可以基于德行系统的主导特质来调整行为偏好
    // 暂时返回默认值，等德行系统更新后再完善
    return 1.0;
  }

  /**
   * 决策下一个行为
   * @param {Array} availableActions - 可用行为列表
   * @returns {string} 选择的行为
   */
  decideNextAction(availableActions) {
    if (!availableActions || availableActions.length === 0) {
      return '休息睡眠';
    }
    
    // 检查紧急生理需求
    const urgentNeeds = this.getUrgentPhysicalNeeds();
    if (urgentNeeds.length > 0) {
      const urgentAction = urgentNeeds[0].action;
      if (availableActions.includes(urgentAction)) {
        return urgentAction;
      }
    }
    
    // 基于偏好计算
    const preferences = this.calculateActionPreferences(availableActions);
    
    // 选择偏好最高的行为（带一定随机性）
    const sortedActions = availableActions.sort((a, b) => preferences[b] - preferences[a]);
    
    // 80% 概率选择最佳行为，20% 概率在前3个中随机选择
    if (Math.random() < 0.8 || sortedActions.length === 1) {
      return sortedActions[0];
    } else {
      const topChoices = sortedActions.slice(0, Math.min(3, sortedActions.length));
      return Utils.Array.randomChoice(topChoices);
    }
  }

  /**
   * 获取紧急生理需求
   * @returns {Array} 紧急需求列表
   */
  getUrgentPhysicalNeeds() {
    const needs = [];
    const physical = this.physicalState;
    
    if (physical.hunger < 20) needs.push({ action: '进食饮水', urgency: 100 - physical.hunger });
    if (physical.thirst < 20) needs.push({ action: '进食饮水', urgency: 100 - physical.thirst });
    if (physical.energy < 15) needs.push({ action: '休息睡眠', urgency: 100 - physical.energy });
    if (physical.cleanliness < 20) needs.push({ action: '盥洗沐浴', urgency: 100 - physical.cleanliness });
    if (physical.health < 30) needs.push({ action: '医治休养', urgency: 100 - physical.health });
    
    return needs.sort((a, b) => b.urgency - a.urgency);
  }

  /**
   * 应用行为结果
   * @param {string} action - 行为名称
   * @param {Object} result - 行为结果
   */
  applyActionResult(action, result) {
    // 应用物理效果（使用现有的 performAction 方法）
    if (result.physicalEffects) {
      // 可以扩展现有的 performAction 方法来支持更复杂的效果
      this.physicalState.performAction(action, result.efficiency || 1.0);
    }
    
    // 应用情绪反应
    if (result.emotionalEffects) {
      this.emotionalState.applyEmotionalReaction(action, result);
    }
    
    // 应用能力发展
    if (result.abilityGrowth) {
      this.applyAbilityGrowth(result.abilityGrowth, action);
    }
    
    // 更新行为偏好
    this.updateActionPreference(action, result.success ? 1 : -1);
    
    // 记录行为历史
    this.behaviorHistory.push({
      action: action,
      result: result,
      timestamp: Date.now()
    });
    
    // 限制历史记录长度
    if (this.behaviorHistory.length > 50) {
      this.behaviorHistory.shift();
    }
  }

  /**
   * 应用能力成长
   * @param {Object} growth - 能力成长
   * @param {string} source - 成长来源
   */
  applyAbilityGrowth(growth, source) {
    if (!this.abilityTraits) return;
    
    for (const [ability, change] of Object.entries(growth)) {
      if (this.abilityTraits.hasOwnProperty(ability)) {
        this.abilityTraits[ability] = Utils.Math.clamp(
          this.abilityTraits[ability] + change,
          0,
          100
        );
      }
    }
  }

  /**
   * 更新行为偏好
   * @param {string} action - 行为名称
   * @param {number} change - 偏好变化
   */
  updateActionPreference(action, change) {
    const current = this.actionPreferences.get(action) || 0;
    const newValue = Utils.Math.clamp(current + change, -10, 10);
    this.actionPreferences.set(action, newValue);
  }

  /**
   * 获取人格状态摘要
   * @returns {Object} 人格状态摘要
   */
  getPersonalityStatus() {
    const physicalSummary = this.physicalState.getSummary();
    const emotionalSummary = this.emotionalState.getEnhancedSummary ? 
      this.emotionalState.getEnhancedSummary() : 
      { dominant: this.emotionalState.getDominantEmotion() };
    
    const virtueTraits = this.virtueSystem ? 
      (this.virtueSystem.getDominantTraits ? this.virtueSystem.getDominantTraits().slice(0, 3) : []) : [];
    
    return {
      characterName: this.name,
      socialClass: this.socialClass,
      age: this.age,
      physical: {
        health: physicalSummary.healthLevel,
        energy: physicalSummary.energyLevel,
        urgentNeeds: this.getUrgentPhysicalNeeds().slice(0, 2)
      },
      emotional: emotionalSummary,
      abilities: {
        physical: this.abilityTraits ? 
          (this.abilityTraits.strength_burst + this.abilityTraits.dexterity + this.abilityTraits.constitution) / 3 : 50,
        mental: this.abilityTraits ? 
          (this.abilityTraits.memory + this.abilityTraits.creativity + this.abilityTraits.logic) / 3 : 50,
        social: this.abilityTraits ? 
          (this.abilityTraits.charisma + this.abilityTraits.empathy + this.abilityTraits.leadership) / 3 : 50
      },
      dominantVirtues: virtueTraits.map(t => ({
        name: t.name || '未知',
        value: t.value || 0,
        description: t.getDescription ? t.getDescription() : '未知'
      })),
      recentBehaviors: this.behaviorHistory.slice(-5).map(b => b.action)
    };
  }


  /**
   * 销毁角色
   */
  destroy() {
    // 清理资源
    this.actionQueue = [];
    this.currentAction = null;
    this.lifeEvents = [];
    this.eventListeners.clear();
    
    // 断开系统连接
    this.virtueSystem = null;
    this.skillSystem = null;
    this.memorySystem = null;
    this.relationshipSystem = null;
    
    console.log(`角色 ${this.name} 已销毁`);
  }

  /**
     * 初始化三层关系系统（兼容性方法）
     */
  initializeRelationshipSystems() {
    if (this._needsThreeLayerRelationships && 
        !this._relationshipSystemsInitialized && 
        window.gameEngine?.relationshipManager) {
      
      window.gameEngine.relationshipManager.createCharacterRelationSystems(this);
      this._relationshipSystemsInitialized = true;
      this._needsThreeLayerRelationships = false;
    }
  }

  /**
   * 获取关系（向后兼容方法）
   */
  getRelationship(otherCharacterId) {
    this.initializeRelationshipSystems();
    
    // 如果新系统可用，使用新系统
    if (this.getComplexRelationship) {
      const complex = this.getComplexRelationship(otherCharacterId);
      return {
        type: complex.primaryCategory || 'unknown',
        strength: complex.overallStrength || 0,
        displayName: complex.shortDisplay || 'unknown'
      };
    }
    
    // 向后兼容：返回默认关系
    return {
      type: 'unknown',
      strength: 0,
      displayName: 'unknown'
    };
  }

  /**
   * 获取关系类型（向后兼容方法）
   */
  getRelationshipType(otherCharacterId) {
    this.initializeRelationshipSystems();
    const relationship = this.getComplexRelationship ? 
      this.getComplexRelationship(otherCharacterId) : null;
    return relationship?.primaryCategory || 'unknown';
  }


  // ==================== 调试和开发工具 ====================

  /**
   * 获取调试信息
   * @returns {Object} 调试信息
   */
  getDebugInfo() {
    return {
      id: this.id,
      name: this.name,
      basicInfo: this.getBasicInfo(),
      detailedState: this.getState(),
      systemConnections: {
        virtue: !!this.virtueSystem,
        skill: !!this.skillSystem,
        memory: !!this.memorySystem,
        relationship: !!this.relationshipSystem
      },
      queuedActions: this.actionQueue.length,
      lifeEventsCount: this.lifeEvents.length,
      eventListenersCount: this.eventListeners.size
    };
  }

  /**
   * 输出角色报告
   */
  printReport() {
    console.log(`
=== 角色报告: ${this.name} ===
基础信息: ${this.age}岁${this.gender}性，${this.role}
当前位置: ${this.currentLocation}
当前活动: ${this.currentActivity || '无'}
健康状况: ${Math.floor(this.physicalState.health)}%
主导情绪: ${this.emotionalState.getDominantEmotion()}
行为统计: 总行为${this.statistics.totalActions}次，工作${this.statistics.workDays}天
生活事件: 共${this.lifeEvents.length}个记录
个性特征: ${this.getPersonalityTraits().summary}
系统连接: 德行${!!this.virtueSystem} 技能${!!this.skillSystem} 记忆${!!this.memorySystem}
========================
    `);
  }
  createSubSystems() {
    this.virtueSystem = new VirtueSystem(this.id);
    this.skillSystem = new SkillSystem(this.id);
    console.log(`${this.name} 的子系统已创建`);
  }
  
}


// ==================== 导出 ====================
export { Character };
export default Character;
