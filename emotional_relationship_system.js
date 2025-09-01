/**
 * emotional_relationship_system.js - 南北朝坞堡模拟器情感关系系统（重构版）
 * 
 * 功能：专注于角色间的情感关系管理，基于多维度数值自动判定关系状态
 * 特点：与血缘关系和社会身份分离，纯粹管理情感层面的关系
 * 
 * 架构定位：三层关系架构的第三层
 * - 第一层：血缘关系（FamilySystem）
 * - 第二层：社会身份（SocialIdentitySystem）
 * - 第三层：情感关系（EmotionalRelationshipSystem）← 当前模块
 * 
 * 重构变化：
 * ✅ 移除了 kinship 维度（血缘关系交由 FamilySystem 管理）
 * ✅ 移除了身份相关的关系类型（师父、同事等交由 SocialIdentitySystem 管理）
 * ✅ 专注于纯情感维度：好感度、信任度、亲密度、爱恋度等
 * ✅ 基于情感维度组合自动判定关系状态
 */

import { Utils } from './utils_module.js';
import { DEFAULT_CONFIG } from './gameConfig.js';

/**
 * 情感关系状态枚举（纯情感，无身份混合）
 */
export const EmotionalRelationState = {
  // 基础关系状态
  STRANGER: 'stranger',                    // 陌生人
  ACQUAINTANCE: 'acquaintance',           // 熟人
  FRIEND: 'friend',                       // 朋友
  CLOSE_FRIEND: 'close_friend',           // 密友
  
  // 负面关系状态
  DISLIKE: 'dislike',                     // 不喜欢
  ENEMY: 'enemy',                         // 仇敌
  HOSTILE: 'hostile',                     // 敌意
  
  // 正面关系状态
  ADMIRATION: 'admiration',               // 崇拜
  REVERENCE: 'reverence',                 // 敬仰
  TRUST_BOND: 'trust_bond',               // 信任纽带
  
  // 浪漫关系状态
  ATTRACTION: 'attraction',               // 吸引/暧昧
  LOVE: 'love',                          // 恋爱
  DEEP_LOVE: 'deep_love',                // 深爱
  PASSIONATE_LOVE: 'passionate_love',     // 热恋
  
  // 特殊关系状态
  COMPLICATED: 'complicated',             // 复杂关系
  CONFLICTED: 'conflicted',              // 矛盾关系
  DEPENDENT: 'dependent',                // 依赖关系
  PROTECTIVE: 'protective'                // 保护关系
};

/**
 * 互动类型枚举
 */
export const EmotionalInteractionType = {
  CONVERSATION: 'conversation',           // 对话交流
  COOPERATION: 'cooperation',            // 合作
  CONFLICT: 'conflict',                  // 冲突
  HELP: 'help',                         // 帮助
  GIFT_GIVING: 'gift_giving',           // 赠礼
  ROMANCE: 'romance',                   // 浪漫互动
  TEACHING: 'teaching',                 // 教导
  TRADE: 'trade',                       // 交易
  COMPETITION: 'competition',           // 竞争
  GOSSIP: 'gossip',                    // 闲谈八卦
  COMFORT: 'comfort',                  // 安慰
  BETRAYAL: 'betrayal',                // 背叛
  FORGIVENESS: 'forgiveness'           // 宽恕
};

/**
 * 单个情感关系类
 */
class EmotionalRelationship {
  constructor(fromCharacterId, toCharacterId, config = {}) {
    this.fromCharacterId = fromCharacterId;
    this.toCharacterId = toCharacterId;
    this.id = `${fromCharacterId}_${toCharacterId}`;
    
    // ========== 核心情感维度 (0-100) ==========
    this.familiarity = config.familiarity || 0;    // 熟识度
    this.affection = config.affection || 50;       // 好感度 (-100 到 100)
    this.trust = config.trust || 50;               // 信任度
    this.respect = config.respect || 50;           // 尊敬度
    this.intimacy = config.intimacy || 0;          // 亲密度
    this.romance = config.romance || 0;            // 爱恋度
    this.lust = config.lust || 0;                  // 欲念度
    this.dependency = config.dependency || 0;      // 依赖度
    
    // ========== 扩展情感维度 ==========
    this.loyalty = config.loyalty || 50;          // 忠诚度
    this.jealousy = config.jealousy || 0;         // 嫉妒度
    this.fear = config.fear || 0;                 // 恐惧度
    this.gratitude = config.gratitude || 0;      // 感激度
    this.resentment = config.resentment || 0;     // 怨恨度
    this.protectiveness = config.protectiveness || 0; // 保护欲
    
    // ========== 关系状态 ==========
    this.emotionalState = config.emotionalState || EmotionalRelationState.STRANGER;
    this.previousState = null;
    this.stateHistory = [];
    this.stateChangeReasons = [];
    
    // ========== 关系属性 ==========
    this.isActive = config.isActive !== false;
    this.isSymmetric = config.isSymmetric !== false;
    this.stability = config.stability || 50;      // 关系稳定度
    this.volatility = config.volatility || 20;    // 关系波动性
    
    // ========== 时间信息 ==========
    this.establishedDate = config.establishedDate || Date.now();
    this.lastInteraction = config.lastInteraction || 0;
    this.lastStateChange = Date.now();
    
    // ========== 互动历史 ==========
    this.interactions = [];
    this.emotionalEvents = [];
    this.maxInteractionHistory = 50;
    this.maxEventHistory = 20;
    
    // ========== 关系衰减设置 ==========
    this.decayRates = {
      familiarity: config.decayRates?.familiarity || 0.05,
      affection: config.decayRates?.affection || 0.02,
      trust: config.decayRates?.trust || 0.01,
      romance: config.decayRates?.romance || 0.08,
      lust: config.decayRates?.lust || 0.15,
      intimacy: config.decayRates?.intimacy || 0.03
    };
    
    // 初始化关系状态
    this.updateEmotionalState();
    
    console.log(`情感关系建立: ${fromCharacterId} -> ${toCharacterId} (${this.emotionalState})`);
  }
  
  /**
   * 基于情感维度自动更新关系状态
   */
  updateEmotionalState() {
    const previousState = this.emotionalState;
    
    // 复杂关系判定（多维度冲突）
    if (this.hasConflictingEmotions()) {
      this.emotionalState = EmotionalRelationState.COMPLICATED;
    }
    // 深度负面关系
    else if (this.affection < -60 && this.trust < 20 && this.resentment > 60) {
      this.emotionalState = EmotionalRelationState.ENEMY;
    }
    else if (this.affection < -20 && this.fear > 50) {
      this.emotionalState = EmotionalRelationState.HOSTILE;
    }
    else if (this.affection < 20 && this.familiarity > 30) {
      this.emotionalState = EmotionalRelationState.DISLIKE;
    }
    // 深度正面关系
    else if (this.romance > 70 && this.intimacy > 60 && this.affection > 80) {
      if (this.lust > 60) {
        this.emotionalState = EmotionalRelationState.PASSIONATE_LOVE;
      } else {
        this.emotionalState = EmotionalRelationState.DEEP_LOVE;
      }
    }
    else if (this.romance > 50 && this.affection > 60) {
      this.emotionalState = EmotionalRelationState.LOVE;
    }
    else if (this.romance > 30 || this.lust > 40) {
      this.emotionalState = EmotionalRelationState.ATTRACTION;
    }
    // 崇拜和敬仰
    else if (this.respect > 80 && this.admiration > 70) {
      this.emotionalState = EmotionalRelationState.REVERENCE;
    }
    else if (this.respect > 60 && this.affection > 50 && this.dependency > 40) {
      this.emotionalState = EmotionalRelationState.ADMIRATION;
    }
    // 友谊关系
    else if (this.affection > 80 && this.trust > 70 && this.intimacy > 60) {
      this.emotionalState = EmotionalRelationState.CLOSE_FRIEND;
    }
    else if (this.affection > 60 && this.trust > 50 && this.familiarity > 50) {
      this.emotionalState = EmotionalRelationState.FRIEND;
    }
    // 特殊关系
    else if (this.dependency > 70) {
      this.emotionalState = EmotionalRelationState.DEPENDENT;
    }
    else if (this.protectiveness > 60 && this.affection > 50) {
      this.emotionalState = EmotionalRelationState.PROTECTIVE;
    }
    else if (this.trust > 80 && this.loyalty > 70) {
      this.emotionalState = EmotionalRelationState.TRUST_BOND;
    }
    // 基础关系
    else if (this.familiarity > 30) {
      this.emotionalState = EmotionalRelationState.ACQUAINTANCE;
    }
    else {
      this.emotionalState = EmotionalRelationState.STRANGER;
    }
    
    // 记录状态变化
    if (previousState !== this.emotionalState) {
      this.recordStateChange(previousState, this.emotionalState, '情感维度变化');
    }
  }
  
  /**
   * 检查是否存在情感冲突
   * @returns {boolean} 是否有冲突情感
   */
  hasConflictingEmotions() {
    // 爱恨交织
    if (this.affection > 50 && this.resentment > 40) return true;
    if (this.romance > 40 && this.fear > 30) return true;
    if (this.trust > 60 && this.jealousy > 50) return true;
    
    // 依赖与独立冲突
    if (this.dependency > 60 && this.respect < 30) return true;
    
    // 亲密与疏离冲突
    if (this.intimacy > 50 && this.affection < 20) return true;
    
    return false;
  }
  
  /**
   * 处理情感互动
   * @param {string} interactionType - 互动类型
   * @param {Object} context - 互动上下文
   * @returns {Object} 互动结果
   */
  processEmotionalInteraction(interactionType, context = {}) {
    const result = {
      success: true,
      changes: {},
      events: [],
      stateChanged: false,
      previousState: this.emotionalState
    };
    
    // 记录互动
    const interaction = {
      type: interactionType,
      context: context,
      timestamp: Date.now(),
      intensity: context.intensity || 1.0,
      success: context.success !== false,
      mood: context.mood || 'neutral'
    };
    
    this.interactions.push(interaction);
    if (this.interactions.length > this.maxInteractionHistory) {
      this.interactions.shift();
    }
    
    // 应用情感变化
    const changes = this.calculateEmotionalChanges(interactionType, interaction);
    this.applyEmotionalChanges(changes, result);
    
    // 更新最后互动时间
    this.lastInteraction = Date.now();
    
    // 更新关系状态
    const oldState = this.emotionalState;
    this.updateEmotionalState();
    
    if (oldState !== this.emotionalState) {
      result.stateChanged = true;
      result.events.push({
        type: 'emotional_state_changed',
        from: oldState,
        to: this.emotionalState,
        trigger: interactionType
      });
    }
    
    return result;
  }
  
  /**
   * 计算情感变化
   * @param {string} interactionType - 互动类型
   * @param {Object} interaction - 互动详情
   * @returns {Object} 情感变化值
   */
  calculateEmotionalChanges(interactionType, interaction) {
    const intensity = interaction.intensity;
    const success = interaction.success;
    const mood = interaction.mood;
    
    // 基础情感变化模板
    const baseChanges = {
      [EmotionalInteractionType.CONVERSATION]: {
        familiarity: 2 * intensity,
        affection: success ? 1 * intensity : -0.5 * intensity
      },
      [EmotionalInteractionType.COOPERATION]: {
        familiarity: 3 * intensity,
        affection: success ? 4 * intensity : -2 * intensity,
        trust: success ? 3 * intensity : -1 * intensity,
        respect: success ? 2 * intensity : 0
      },
      [EmotionalInteractionType.CONFLICT]: {
        familiarity: 1 * intensity,
        affection: -5 * intensity,
        trust: -3 * intensity,
        resentment: 3 * intensity,
        respect: success ? 1 * intensity : -2 * intensity
      },
      [EmotionalInteractionType.HELP]: {
        familiarity: 2 * intensity,
        affection: 5 * intensity,
        trust: 4 * intensity,
        gratitude: 4 * intensity,
        dependency: 1 * intensity
      },
      [EmotionalInteractionType.GIFT_GIVING]: {
        familiarity: 1 * intensity,
        affection: 6 * intensity,
        trust: 2 * intensity,
        gratitude: 3 * intensity
      },
      [EmotionalInteractionType.ROMANCE]: {
        familiarity: 2 * intensity,
        affection: 4 * intensity,
        intimacy: 6 * intensity,
        romance: 8 * intensity,
        lust: 3 * intensity
      },
      [EmotionalInteractionType.BETRAYAL]: {
        affection: -10 * intensity,
        trust: -15 * intensity,
        resentment: 8 * intensity,
        loyalty: -5 * intensity
      },
      [EmotionalInteractionType.FORGIVENESS]: {
        affection: 3 * intensity,
        trust: 2 * intensity,
        resentment: -5 * intensity,
        gratitude: 4 * intensity
      },
      [EmotionalInteractionType.COMFORT]: {
        affection: 4 * intensity,
        trust: 3 * intensity,
        intimacy: 3 * intensity,
        gratitude: 3 * intensity,
        dependency: 2 * intensity
      }
    };
    
    let changes = baseChanges[interactionType] || {};
    
    // 心情修正
    const moodModifier = {
      'happy': 1.2,
      'sad': 0.8,
      'angry': 1.5,
      'neutral': 1.0,
      'excited': 1.3,
      'depressed': 0.6
    };
    
    const modifier = moodModifier[mood] || 1.0;
    const modifiedChanges = {};
    
    for (const [dimension, value] of Object.entries(changes)) {
      modifiedChanges[dimension] = value * modifier;
    }
    
    return modifiedChanges;
  }
  
  /**
   * 应用情感变化
   * @param {Object} changes - 情感变化值
   * @param {Object} result - 结果对象
   */
  applyEmotionalChanges(changes, result) {
    for (const [dimension, change] of Object.entries(changes)) {
      const oldValue = this[dimension];
      let newValue = oldValue + change;
      
      // 应用维度限制
      newValue = this.clampDimension(dimension, newValue);
      
      // 记录变化
      if (Math.abs(newValue - oldValue) > 0.1) {
        result.changes[dimension] = {
          from: Math.round(oldValue),
          to: Math.round(newValue),
          change: Math.round(newValue - oldValue)
        };
        
        this[dimension] = newValue;
      }
    }
  }
  
  /**
   * 限制维度数值范围
   * @param {string} dimension - 维度名称
   * @param {number} value - 数值
   * @returns {number} 限制后的数值
   */
  clampDimension(dimension, value) {
    // 好感度可以为负值
    if (dimension === 'affection' || dimension === 'resentment') {
      return Math.max(-100, Math.min(100, value));
    }
    
    // 其他维度为0-100
    return Math.max(0, Math.min(100, value));
  }
  
  /**
   * 记录状态变化
   * @param {string} fromState - 原状态
   * @param {string} toState - 新状态
   * @param {string} reason - 变化原因
   */
  recordStateChange(fromState, toState, reason = '') {
    this.previousState = fromState;
    this.lastStateChange = Date.now();
    
    const stateChange = {
      from: fromState,
      to: toState,
      reason: reason,
      timestamp: Date.now(),
      dimensions: this.exportDimensions()
    };
    
    this.stateHistory.push(stateChange);
    if (this.stateHistory.length > 10) {
      this.stateHistory.shift();
    }
    
    console.log(`情感状态变化: ${this.id} ${fromState} -> ${toState} (${reason})`);
  }
  
  /**
   * 获取关系强度
   * @returns {number} 关系强度 (0-100)
   */
  getEmotionalStrength() {
    // 权重配置
    const weights = {
      familiarity: 0.15,
      affection: 0.25,
      trust: 0.20,
      intimacy: 0.15,
      romance: 0.10,
      respect: 0.10,
      loyalty: 0.05
    };
    
    let strength = 0;
    for (const [dimension, weight] of Object.entries(weights)) {
      const value = Math.max(0, this[dimension]); // 负值不计入强度
      strength += value * weight;
    }
    
    return Math.round(strength);
  }
  
  /**
   * 获取关系状态显示名称
   * @returns {string} 显示名称
   */
  getEmotionalStateDisplayName() {
    const stateNames = {
      [EmotionalRelationState.STRANGER]: '陌生人',
      [EmotionalRelationState.ACQUAINTANCE]: '熟人',
      [EmotionalRelationState.FRIEND]: '朋友',
      [EmotionalRelationState.CLOSE_FRIEND]: '密友',
      [EmotionalRelationState.DISLIKE]: '不喜',
      [EmotionalRelationState.ENEMY]: '仇敌',
      [EmotionalRelationState.HOSTILE]: '敌意',
      [EmotionalRelationState.ADMIRATION]: '崇拜',
      [EmotionalRelationState.REVERENCE]: '敬仰',
      [EmotionalRelationState.TRUST_BOND]: '信任',
      [EmotionalRelationState.ATTRACTION]: '暧昧',
      [EmotionalRelationState.LOVE]: '恋爱',
      [EmotionalRelationState.DEEP_LOVE]: '深爱',
      [EmotionalRelationState.PASSIONATE_LOVE]: '热恋',
      [EmotionalRelationState.COMPLICATED]: '复杂',
      [EmotionalRelationState.CONFLICTED]: '矛盾',
      [EmotionalRelationState.DEPENDENT]: '依赖',
      [EmotionalRelationState.PROTECTIVE]: '保护'
    };
    
    return stateNames[this.emotionalState] || this.emotionalState;
  }
  
  /**
   * 导出情感维度数据
   * @returns {Object} 维度数据
   */
  exportDimensions() {
    return {
      familiarity: Math.round(this.familiarity),
      affection: Math.round(this.affection),
      trust: Math.round(this.trust),
      respect: Math.round(this.respect),
      intimacy: Math.round(this.intimacy),
      romance: Math.round(this.romance),
      lust: Math.round(this.lust),
      dependency: Math.round(this.dependency),
      loyalty: Math.round(this.loyalty),
      jealousy: Math.round(this.jealousy),
      fear: Math.round(this.fear),
      gratitude: Math.round(this.gratitude),
      resentment: Math.round(this.resentment),
      protectiveness: Math.round(this.protectiveness)
    };
  }
  
  /**
   * 导出关系数据
   * @returns {Object} 关系数据
   */
  exportData() {
    return {
      id: this.id,
      fromCharacterId: this.fromCharacterId,
      toCharacterId: this.toCharacterId,
      emotionalState: this.emotionalState,
      emotionalStateDisplayName: this.getEmotionalStateDisplayName(),
      strength: this.getEmotionalStrength(),
      dimensions: this.exportDimensions(),
      isActive: this.isActive,
      stability: Math.round(this.stability),
      establishedDate: this.establishedDate,
      lastInteraction: this.lastInteraction,
      daysSinceInteraction: Math.floor((Date.now() - this.lastInteraction) / (1000 * 60 * 60 * 24)),
      recentInteractions: this.interactions.slice(-3),
      stateHistory: this.stateHistory.slice(-3)
    };
  }
  
  /**
   * 关系自然衰减
   * @param {number} deltaTime - 时间间隔（天）
   */
  decay(deltaTime) {
    if (!this.isActive) return;
    
    const daysSinceInteraction = (Date.now() - this.lastInteraction) / (1000 * 60 * 60 * 24);
    
    // 超过一定时间未互动开始衰减
    if (daysSinceInteraction > 7) {
      const decayMultiplier = Math.min(1.0, (daysSinceInteraction - 7) / 30);
      
      this.familiarity = Math.max(0, this.familiarity - this.decayRates.familiarity * decayMultiplier);
      this.trust = Math.max(0, this.trust - this.decayRates.trust * decayMultiplier);
      this.romance = Math.max(0, this.romance - this.decayRates.romance * decayMultiplier);
      this.lust = Math.max(0, this.lust - this.decayRates.lust * decayMultiplier);
      this.intimacy = Math.max(0, this.intimacy - this.decayRates.intimacy * decayMultiplier);
      
      // 好感度衰减较慢且可能趋向中性值
      const affectionTarget = this.affection > 50 ? 50 : this.affection < 50 ? 50 : this.affection;
      this.affection += (affectionTarget - this.affection) * this.decayRates.affection * decayMultiplier;
      
      // 更新状态
      this.updateEmotionalState();
    }
  }
}

/**
 * 情感关系系统类
 * 管理单个角色的所有情感关系
 */
export class EmotionalRelationshipSystem {
  constructor(characterId, config = {}) {
    this.characterId = characterId;
    this.relationships = new Map(); // key: otherCharacterId, value: EmotionalRelationship
    
    // 系统配置
    this.maxActiveRelationships = config.maxActiveRelationships || 30;
    this.emotionalDecayEnabled = config.emotionalDecayEnabled !== false;
    this.autoStateUpdate = config.autoStateUpdate !== false;
    
    // 情感偏好和特质
    this.emotionalTraits = {
      extroversion: config.extroversion || 0.5,      // 外向性
      trustfulness: config.trustfulness || 0.5,      // 信任倾向
      romanticism: config.romanticism || 0.5,        // 浪漫倾向
      loyalty: config.loyalty || 0.7,               // 忠诚度
      jealousy: config.jealousy || 0.3,             // 嫉妒倾向
      forgiveness: config.forgiveness || 0.5,        // 宽恕度
      emotionalStability: config.emotionalStability || 0.6 // 情感稳定性
    };
    
    // 统计信息
    this.statistics = {
      totalRelationships: 0,
      activeRelationships: 0,
      friendships: 0,
      romanticRelationships: 0,
      conflicts: 0,
      averageAffection: 50,
      emotionalRange: 0
    };
    
    // 缓存
    this.networkAnalysisCache = null;
    this.networkAnalysisCacheTime = 0;
    
    this.initialize();
  }
  
  /**
   * 初始化情感关系系统
   */
  initialize() {
    console.log(`情感关系系统初始化完成: ${this.characterId}`);
  }
  
  /**
   * 建立情感关系
   * @param {string} otherCharacterId - 对方角色ID
   * @param {Object} config - 关系配置
   * @returns {EmotionalRelationship} 创建的情感关系
   */
  establishEmotionalRelationship(otherCharacterId, config = {}) {
    if (this.relationships.has(otherCharacterId)) {
      return this.relationships.get(otherCharacterId);
    }
    
    const relationship = new EmotionalRelationship(this.characterId, otherCharacterId, config);
    this.relationships.set(otherCharacterId, relationship);
    
    this.updateStatistics();
    
    console.log(`建立情感关系: ${this.characterId} -> ${otherCharacterId} (${relationship.emotionalState})`);
    
    return relationship;
  }
  
  /**
   * 获取情感关系
   * @param {string} otherCharacterId - 对方角色ID
   * @returns {EmotionalRelationship|null} 情感关系
   */
  getEmotionalRelationship(otherCharacterId) {
    return this.relationships.get(otherCharacterId) || null;
  }
  
  /**
   * 处理情感互动
   * @param {string} otherCharacterId - 对方角色ID
   * @param {string} interactionType - 互动类型
   * @param {Object} context - 互动上下文
   * @returns {Object} 互动结果
   */
  processEmotionalInteraction(otherCharacterId, interactionType, context = {}) {
    let relationship = this.getEmotionalRelationship(otherCharacterId);
    
    // 如果关系不存在，创建新关系
    if (!relationship) {
      relationship = this.establishEmotionalRelationship(otherCharacterId);
    }
    
    // 处理互动
    const result = relationship.processEmotionalInteraction(interactionType, context);
    
    // 更新统计
    if (result.stateChanged) {
      this.updateStatistics();
    }
    
    // 清除缓存
    this.networkAnalysisCache = null;
    
    return {
      ...result,
      relationship: relationship.exportData()
    };
  }
  
  /**
   * 获取特定状态的关系
   * @param {string} emotionalState - 情感状态
   * @returns {EmotionalRelationship[]} 关系列表
   */
  getRelationshipsByState(emotionalState) {
    const relationships = [];
    
    for (const relationship of this.relationships.values()) {
      if (relationship.isActive && relationship.emotionalState === emotionalState) {
        relationships.push(relationship);
      }
    }
    
    return relationships.sort((a, b) => b.getEmotionalStrength() - a.getEmotionalStrength());
  }
  
  /**
   * 获取所有朋友
   * @returns {EmotionalRelationship[]} 朋友关系列表
   */
  getFriends() {
    const friends = this.getRelationshipsByState(EmotionalRelationState.FRIEND);
    const closeFriends = this.getRelationshipsByState(EmotionalRelationState.CLOSE_FRIEND);
    return [...closeFriends, ...friends];
  }
  
  /**
   * 获取所有恋爱关系
   * @returns {EmotionalRelationship[]} 恋爱关系列表
   */
  getRomanticRelationships() {
    const love = this.getRelationshipsByState(EmotionalRelationState.LOVE);
    const deepLove = this.getRelationshipsByState(EmotionalRelationState.DEEP_LOVE);
    const passionateLove = this.getRelationshipsByState(EmotionalRelationState.PASSIONATE_LOVE);
    const attraction = this.getRelationshipsByState(EmotionalRelationState.ATTRACTION);
    
    return [...deepLove, ...passionateLove, ...love, ...attraction];
  }
  
  /**
   * 获取所有敌对关系
   * @returns {EmotionalRelationship[]} 敌对关系列表
   */
  getEnemies() {
    const enemies = this.getRelationshipsByState(EmotionalRelationState.ENEMY);
    const hostile = this.getRelationshipsByState(EmotionalRelationState.HOSTILE);
    const dislike = this.getRelationshipsByState(EmotionalRelationState.DISLIKE);
    
    return [...enemies, ...hostile, ...dislike];
  }
  
  /**
   * 获取所有活跃关系
   * @param {Object} filters - 过滤条件
   * @returns {EmotionalRelationship[]} 关系列表
   */
  getAllRelationships(filters = {}) {
    let relationships = Array.from(this.relationships.values());
    
    // 应用过滤器
    if (filters.isActive !== undefined) {
      relationships = relationships.filter(rel => rel.isActive === filters.isActive);
    }
    
    if (filters.emotionalState) {
      relationships = relationships.filter(rel => rel.emotionalState === filters.emotionalState);
    }
    
    if (filters.minStrength) {
      relationships = relationships.filter(rel => 
        rel.getEmotionalStrength() >= filters.minStrength);
    }
    
    if (filters.minAffection !== undefined) {
      relationships = relationships.filter(rel => rel.affection >= filters.minAffection);
    }
    
    // 按强度排序
    return relationships.sort((a, b) => b.getEmotionalStrength() - a.getEmotionalStrength());
  }
  
  /**
   * 分析情感网络
   * @returns {Object} 分析结果
   */
  analyzeEmotionalNetwork() {
    // 检查缓存
    if (this.networkAnalysisCache && 
        Date.now() - this.networkAnalysisCacheTime < 300000) {
      return this.networkAnalysisCache;
    }
    
    const analysis = {
      totalConnections: this.relationships.size,
      activeConnections: 0,
      strongConnections: 0,
      emotionalStates: {},
      affectionDistribution: {},
      trustDistribution: {},
      averageEmotionalStrength: 0,
      emotionalRange: 0,
      socialInfluence: 0,
      emotionalStability: 0
    };
    
    let totalStrength = 0;
    let totalAffection = 0;
    let affectionValues = [];
    let activeRelationships = this.getAllRelationships({ isActive: true });
    
    analysis.activeConnections = activeRelationships.length;
    
    // 分析每个关系
    for (const relationship of activeRelationships) {
      const strength = relationship.getEmotionalStrength();
      totalStrength += strength;
      totalAffection += relationship.affection;
      affectionValues.push(relationship.affection);
      
      if (strength > 60) analysis.strongConnections++;
      
      // 情感状态分布
      const state = relationship.emotionalState;
      analysis.emotionalStates[state] = (analysis.emotionalStates[state] || 0) + 1;
      
      // 好感度分布
      const affectionRange = Math.floor(relationship.affection / 20) * 20;
      const affectionKey = `${affectionRange}-${affectionRange + 19}`;
      analysis.affectionDistribution[affectionKey] = 
        (analysis.affectionDistribution[affectionKey] || 0) + 1;
      
      // 信任度分布
      const trustRange = Math.floor(relationship.trust / 20) * 20;
      const trustKey = `${trustRange}-${trustRange + 19}`;
      analysis.trustDistribution[trustKey] = 
        (analysis.trustDistribution[trustKey] || 0) + 1;
    }
    
    // 计算平均值和统计量
    if (analysis.activeConnections > 0) {
      analysis.averageEmotionalStrength = totalStrength / analysis.activeConnections;
      analysis.averageAffection = totalAffection / analysis.activeConnections;
      
      // 情感范围（好感度的标准差）
      const affectionMean = analysis.averageAffection;
      const variance = affectionValues.reduce((sum, val) => 
        sum + Math.pow(val - affectionMean, 2), 0) / affectionValues.length;
      analysis.emotionalRange = Math.sqrt(variance);
      
      // 社会影响力（基于强连接数量）
      analysis.socialInfluence = Math.min(100, analysis.strongConnections * 8);
      
      // 情感稳定性（基于关系稳定度）
      let totalStability = 0;
      for (const relationship of activeRelationships) {
        totalStability += relationship.stability;
      }
      analysis.emotionalStability = totalStability / analysis.activeConnections;
    }
    
    // 缓存结果
    this.networkAnalysisCache = analysis;
    this.networkAnalysisCacheTime = Date.now();
    
    return analysis;
  }
  
  /**
   * 更新统计信息
   */
  updateStatistics() {
    const allRelationships = this.getAllRelationships();
    const activeRelationships = this.getAllRelationships({ isActive: true });
    
    this.statistics.totalRelationships = allRelationships.length;
    this.statistics.activeRelationships = activeRelationships.length;
    
    // 统计不同类型的关系
    this.statistics.friendships = 
      this.getRelationshipsByState(EmotionalRelationState.FRIEND).length +
      this.getRelationshipsByState(EmotionalRelationState.CLOSE_FRIEND).length;
    
    this.statistics.romanticRelationships = this.getRomanticRelationships().length;
    this.statistics.conflicts = this.getEnemies().length;
    
    // 计算平均好感度
    if (activeRelationships.length > 0) {
      const totalAffection = activeRelationships.reduce((sum, rel) => sum + rel.affection, 0);
      this.statistics.averageAffection = totalAffection / activeRelationships.length;
      
      // 情感范围
      const affectionValues = activeRelationships.map(rel => rel.affection);
      const max = Math.max(...affectionValues);
      const min = Math.min(...affectionValues);
      this.statistics.emotionalRange = max - min;
    }
  }
  
  /**
   * 系统更新（处理衰减等）
   * @param {number} deltaTime - 时间间隔（天）
   */
  update(deltaTime) {
    if (!this.emotionalDecayEnabled) return;
    
    let stateChangedCount = 0;
    
    // 处理关系衰减
    for (const relationship of this.relationships.values()) {
      const oldState = relationship.emotionalState;
      relationship.decay(deltaTime);
      
      if (oldState !== relationship.emotionalState) {
        stateChangedCount++;
      }
    }
    
    // 清理长期无效的关系
    this.cleanupInactiveRelationships();
    
    // 如果有状态变化，更新统计
    if (stateChangedCount > 0) {
      this.updateStatistics();
      this.networkAnalysisCache = null;
    }
  }
  
  /**
   * 清理无效关系
   */
  cleanupInactiveRelationships() {
    const cutoffTime = Date.now() - (365 * 24 * 60 * 60 * 1000); // 一年
    const toRemove = [];
    
    for (const [characterId, relationship] of this.relationships.entries()) {
      // 清理长期无互动且情感强度很低的陌生人关系
      if (!relationship.isActive && 
          relationship.emotionalState === EmotionalRelationState.STRANGER &&
          relationship.getEmotionalStrength() < 5 &&
          relationship.lastInteraction < cutoffTime) {
        toRemove.push(characterId);
      }
    }
    
    for (const characterId of toRemove) {
      this.relationships.delete(characterId);
      console.log(`清理无效情感关系: ${this.characterId} -> ${characterId}`);
    }
    
    if (toRemove.length > 0) {
      this.updateStatistics();
    }
  }
  
  /**
   * 获取情感关系建议
   * @param {string} otherCharacterId - 对方角色ID
   * @returns {Array} 建议列表
   */
  getEmotionalInteractionSuggestions(otherCharacterId) {
    const relationship = this.getEmotionalRelationship(otherCharacterId);
    if (!relationship) {
      return [{
        type: EmotionalInteractionType.CONVERSATION,
        reason: '初次接触，建立熟识',
        priority: 'high'
      }];
    }
    
    const suggestions = [];
    const state = relationship.emotionalState;
    const dimensions = relationship.exportDimensions();
    
    // 基于当前状态给出建议
    switch (state) {
      case EmotionalRelationState.STRANGER:
        suggestions.push({
          type: EmotionalInteractionType.CONVERSATION,
          reason: '增加熟识度',
          priority: 'high'
        });
        break;
        
      case EmotionalRelationState.ACQUAINTANCE:
        if (dimensions.affection < 60) {
          suggestions.push({
            type: EmotionalInteractionType.HELP,
            reason: '提升好感度',
            priority: 'medium'
          });
        }
        break;
        
      case EmotionalRelationState.FRIEND:
        if (dimensions.trust < 70) {
          suggestions.push({
            type: EmotionalInteractionType.COOPERATION,
            reason: '增强信任',
            priority: 'medium'
          });
        }
        break;
        
      case EmotionalRelationState.ATTRACTION:
        suggestions.push({
          type: EmotionalInteractionType.ROMANCE,
          reason: '发展浪漫关系',
          priority: 'low'
        });
        break;
        
      case EmotionalRelationState.ENEMY:
        if (dimensions.resentment > 50) {
          suggestions.push({
            type: EmotionalInteractionType.FORGIVENESS,
            reason: '化解仇怨',
            priority: 'low'
          });
        }
        break;
        
      case EmotionalRelationState.COMPLICATED:
        suggestions.push({
          type: EmotionalInteractionType.CONVERSATION,
          reason: '澄清复杂关系',
          priority: 'medium'
        });
        break;
    }
    
    return suggestions;
  }
  
  /**
   * 导出系统数据
   * @returns {Object} 系统数据
   */
  exportData() {
    const activeRelationships = this.getAllRelationships({ isActive: true });
    
    return {
      characterId: this.characterId,
      totalRelationships: this.relationships.size,
      activeRelationships: activeRelationships.length,
      relationships: activeRelationships.map(rel => rel.exportData()),
      statistics: { ...this.statistics },
      emotionalTraits: { ...this.emotionalTraits },
      networkAnalysis: this.analyzeEmotionalNetwork()
    };
  }
  
  /**
   * 导入系统数据
   * @param {Object} data - 导入的数据
   */
  importData(data) {
    this.relationships.clear();
    
    if (data.relationships) {
      data.relationships.forEach(relData => {
        if (relData.isActive) {
          const relationship = new EmotionalRelationship(
            relData.fromCharacterId,
            relData.toCharacterId,
            {
              ...relData.dimensions,
              emotionalState: relData.emotionalState,
              isActive: relData.isActive,
              establishedDate: relData.establishedDate,
              lastInteraction: relData.lastInteraction
            }
          );
          
          this.relationships.set(relData.toCharacterId, relationship);
        }
      });
    }
    
    if (data.emotionalTraits) {
      this.emotionalTraits = { ...data.emotionalTraits };
    }
    
    this.updateStatistics();
    console.log(`情感关系系统数据导入完成: ${this.characterId}`);
  }
  
  /**
   * 获取情感关系摘要
   * @returns {Object} 关系摘要
   */
  getEmotionalSummary() {
    const summary = {
      totalConnections: this.relationships.size,
      strongestRelationships: [],
      weakestRelationships: [],
      recentInteractions: [],
      emotionalHighlights: []
    };
    
    const activeRelationships = this.getAllRelationships({ isActive: true });
    
    // 最强关系（前3个）
    summary.strongestRelationships = activeRelationships
      .slice(0, 3)
      .map(rel => ({
        characterId: rel.toCharacterId,
        state: rel.getEmotionalStateDisplayName(),
        strength: rel.getEmotionalStrength()
      }));
    
    // 最弱关系（后3个，排除陌生人）
    summary.weakestRelationships = activeRelationships
      .filter(rel => rel.emotionalState !== EmotionalRelationState.STRANGER)
      .slice(-3)
      .map(rel => ({
        characterId: rel.toCharacterId,
        state: rel.getEmotionalStateDisplayName(),
        strength: rel.getEmotionalStrength()
      }));
    
    // 近期互动
    const allInteractions = [];
    for (const relationship of activeRelationships) {
      const recentInteractions = relationship.interactions.slice(-2);
      allInteractions.push(...recentInteractions.map(interaction => ({
        characterId: relationship.toCharacterId,
        type: interaction.type,
        timestamp: interaction.timestamp
      })));
    }
    
    summary.recentInteractions = allInteractions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
    
    // 情感亮点
    const romanticCount = this.getRomanticRelationships().length;
    const friendCount = this.getFriends().length;
    const enemyCount = this.getEnemies().length;
    
    if (romanticCount > 0) {
      summary.emotionalHighlights.push(`${romanticCount}段浪漫关系`);
    }
    if (friendCount > 0) {
      summary.emotionalHighlights.push(`${friendCount}位朋友`);
    }
    if (enemyCount > 0) {
      summary.emotionalHighlights.push(`${enemyCount}个敌对关系`);
    }
    
    return summary;
  }

  /**
   * 为角色创建情感管理器（静态方法）
   * @param {string} characterId - 角色ID
   * @param {Object} config - 配置
   * @returns {EmotionalRelationshipSystem} 情感系统实例
   */
  createCharacterEmotionalManager(characterId, config = {}) {
    return new EmotionalRelationshipSystem(characterId, config);
  }
}

export default EmotionalRelationshipSystem;