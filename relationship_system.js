/**
 * RelationshipSystem.js - 关系系统
 * 管理角色间的人际关系，包括熟识度、好感度、亲情、爱情等
 * 依赖: Utils.js, gameConfig.js
 * 输出: 人际关系管理和社交网络分析
 */

import { Utils } from './utils_module.js';
import { DEFAULT_CONFIG } from './gameConfig.js';

/**
 * 关系类型枚举
 */
export const RelationshipType = {
  STRANGER: 'stranger',        // 陌生人
  ACQUAINTANCE: 'acquaintance', // 熟人
  FRIEND: 'friend',            // 朋友
  CLOSE_FRIEND: 'close_friend', // 密友
  FAMILY: 'family',            // 家人
  SPOUSE: 'spouse',            // 配偶
  LOVER: 'lover',              // 恋人
  ENEMY: 'enemy',              // 敌人
  RIVAL: 'rival',              // 竞争对手
  MENTOR: 'mentor',            // 师父
  STUDENT: 'student',          // 学生
  COLLEAGUE: 'colleague'       // 同事
};

/**
 * 互动类型枚举
 */
export const InteractionType = {
  CONVERSATION: 'conversation',  // 对话
  COOPERATION: 'cooperation',    // 合作
  CONFLICT: 'conflict',         // 冲突
  GIFT_GIVING: 'gift_giving',   // 赠礼
  HELP: 'help',                 // 帮助
  TEACHING: 'teaching',         // 教学
  ROMANCE: 'romance',           // 浪漫
  TRADE: 'trade',              // 交易
  COMPETITION: 'competition',   // 竞争
  GOSSIP: 'gossip'             // 闲谈
};

/**
 * 单个关系类
 * 表示两个角色之间的关系
 */
class Relationship {
  constructor(characterA, characterB, config = {}) {
    this.characterA = characterA;
    this.characterB = characterB;
    this.id = `${characterA}_${characterB}`;
    
    // 关系维度 (0-100)
    this.familiarity = config.familiarity || 0;    // 熟识度
    this.affection = config.affection || 50;       // 好感度
    this.trust = config.trust || 50;               // 信任度
    this.respect = config.respect || 50;           // 尊敬度
    this.intimacy = config.intimacy || 0;          // 亲密度
    
    // 特殊关系属性
    // this.kinship = config.kinship || 0;            // 亲情度 (家庭关系)
    this.romance = config.romance || 0;            // 爱恋度
    this.lust = config.lust || 0;                  // 欲念度
    this.dependency = config.dependency || 0;      // 依赖度
    
    // 关系类型和状态
    this.primaryType = config.primaryType || RelationshipType.STRANGER;
    this.secondaryTypes = config.secondaryTypes || [];
    this.isActive = config.isActive !== false;
    this.isSymmetric = config.isSymmetric !== false; // 是否对称关系
    
    // 关系历史
    this.interactions = [];
    this.maxInteractionHistory = 50;
    this.relationshipEvents = [];
    this.maxEventHistory = 20;
    
    // 关系衰减设置
    this.decayRates = {
      familiarity: 0.05,
      affection: 0.02,
      trust: 0.01,
      romance: 0.08,
      lust: 0.15
    };
    
    // 最后互动时间
    this.lastInteraction = config.lastInteraction || 0;
    this.establishedDate = config.establishedDate || Date.now();
    
    // 关系修正因素
    this.modifiers = new Map();
    
    this.updateRelationshipType();
  }

  /**
   * 处理互动
   * @param {string} interactionType - 互动类型
   * @param {Object} context - 互动上下文
   * @returns {Object} 互动结果
   */
  processInteraction(interactionType, context = {}) {
    const result = {
      success: true,
      changes: {},
      events: [],
      typeChanged: false,
      previousType: this.primaryType
    };
    
    // 记录互动
    const interaction = {
      type: interactionType,
      timestamp: Date.now(),
      context: context,
      outcomes: {}
    };
    
    // 根据互动类型调整关系
    const changes = this.calculateInteractionEffects(interactionType, context);
    
    // 应用变化
    for (const [attribute, change] of Object.entries(changes)) {
      if (this.hasOwnProperty(attribute)) {
        const oldValue = this[attribute];
        this[attribute] = Utils.Math.clamp(this[attribute] + change, 0, 100);
        result.changes[attribute] = this[attribute] - oldValue;
        interaction.outcomes[attribute] = change;
      }
    }
    
    // 更新最后互动时间
    this.lastInteraction = Date.now();
    
    // 检查关系类型变化
    const oldType = this.primaryType;
    this.updateRelationshipType();
    
    if (oldType !== this.primaryType) {
      result.typeChanged = true;
      result.newType = this.primaryType;
      
      this.recordRelationshipEvent({
        type: 'relationship_change',
        from: oldType,
        to: this.primaryType,
        trigger: interactionType,
        timestamp: Date.now()
      });
    }
    
    // 记录互动历史
    this.recordInteraction(interaction);
    
    // 检查特殊事件
    this.checkSpecialEvents(interactionType, context, result);
    
    return result;
  }

  /**
   * 计算互动效果
   * @param {string} interactionType - 互动类型
   * @param {Object} context - 上下文
   * @returns {Object} 属性变化
   */
  calculateInteractionEffects(interactionType, context) {
    const changes = {};
    const intensity = context.intensity || 1.0;
    const success = context.success !== false;
    
    // 基础互动效果表
    const effectMap = {
      [InteractionType.CONVERSATION]: {
        familiarity: 2 * intensity,
        affection: success ? 1 * intensity : -0.5 * intensity
      },
      [InteractionType.COOPERATION]: {
        familiarity: 3 * intensity,
        affection: success ? 4 * intensity : -2 * intensity,
        trust: success ? 3 * intensity : -1 * intensity,
        respect: success ? 2 * intensity : 0
      },
      [InteractionType.CONFLICT]: {
        familiarity: 1 * intensity,
        affection: -5 * intensity,
        trust: -3 * intensity,
        respect: success ? 1 * intensity : -2 * intensity
      },
      [InteractionType.HELP]: {
        familiarity: 2 * intensity,
        affection: 5 * intensity,
        trust: 4 * intensity,
        dependency: 1 * intensity
      },
      [InteractionType.GIFT_GIVING]: {
        familiarity: 1 * intensity,
        affection: 6 * intensity,
        trust: 2 * intensity
      },
      [InteractionType.ROMANCE]: {
        familiarity: 2 * intensity,
        affection: 4 * intensity,
        intimacy: 6 * intensity,
        romance: 8 * intensity,
        lust: 3 * intensity
      },
      [InteractionType.TEACHING]: {
        familiarity: 3 * intensity,
        respect: 4 * intensity,
        dependency: 2 * intensity
      },
      [InteractionType.TRADE]: {
        familiarity: 1 * intensity,
        trust: success ? 2 * intensity : -3 * intensity
      },
      [InteractionType.COMPETITION]: {
        familiarity: 1 * intensity,
        respect: success ? 3 * intensity : -1 * intensity,
        affection: success ? 1 * intensity : -2 * intensity
      },
      [InteractionType.GOSSIP]: {
        familiarity: 1 * intensity,
        trust: -1 * intensity
      }
    };
    
    const baseChanges = effectMap[interactionType] || {};
    
    // 应用修正因素
    for (const [attribute, baseChange] of Object.entries(baseChanges)) {
      let finalChange = baseChange;
      
      // 应用关系修正
      finalChange *= this.getRelationshipModifier(attribute);
      
      // 应用上下文修正
      if (context.mood === 'happy') finalChange *= 1.2;
      if (context.mood === 'sad') finalChange *= 0.8;
      if (context.mood === 'angry') finalChange *= 0.6;
      
      // 应用环境修正
      if (context.privacy === 'private') finalChange *= 1.1;
      if (context.privacy === 'public') finalChange *= 0.9;
      
      changes[attribute] = finalChange;
    }
    
    return changes;
  }

  /**
   * 获取关系修正因子
   * @param {string} attribute - 属性名
   * @returns {number} 修正因子
   */
  getRelationshipModifier(attribute) {
    let modifier = 1.0;
    
    // 基于当前关系状态的修正
    switch (attribute) {
      case 'affection':
        // 好感度高的时候更容易增加，低的时候更容易减少
        if (this.affection > 70) modifier *= 0.8;
        if (this.affection < 30) modifier *= 1.2;
        break;
        
      case 'trust':
        // 信任度一旦降低就很难恢复
        if (this.trust < 50) modifier *= 0.7;
        break;
        
      case 'romance':
        // 浪漫关系需要一定的好感度基础
        if (this.affection < 40) modifier *= 0.5;
        break;
        
      case 'intimacy':
        // 亲密度需要信任和好感的支撑
        if (this.trust < 30 || this.affection < 30) modifier *= 0.6;
        break;
    }
    
    // 应用特殊修正因素
    if (this.modifiers.has(attribute)) {
      modifier *= this.modifiers.get(attribute);
    }
    
    return modifier;
  }

  /**
   * 更新关系类型
   */
  updateRelationshipType() {
    const oldType = this.primaryType;
    
    // 基于各维度数值确定关系类型
    if (this.kinship > 50) {
      this.primaryType = RelationshipType.FAMILY;
    } else if (this.romance > 70 && this.intimacy > 60) {
      this.primaryType = RelationshipType.SPOUSE;
    } else if (this.romance > 50) {
      this.primaryType = RelationshipType.LOVER;
    } else if (this.affection < 20 && this.trust < 20) {
      this.primaryType = RelationshipType.ENEMY;
    } else if (this.affection > 80 && this.trust > 70 && this.intimacy > 50) {
      this.primaryType = RelationshipType.CLOSE_FRIEND;
    } else if (this.affection > 60 && this.familiarity > 50) {
      this.primaryType = RelationshipType.FRIEND;
    } else if (this.familiarity > 30) {
      this.primaryType = RelationshipType.ACQUAINTANCE;
    } else {
      this.primaryType = RelationshipType.STRANGER;
    }
    
    // 更新次要关系类型
    this.updateSecondaryTypes();
  }

  /**
   * 更新次要关系类型
   */
  updateSecondaryTypes() {
    this.secondaryTypes = [];
    
    // 师徒关系
    if (this.respect > 70 && this.dependency > 40) {
      this.secondaryTypes.push(RelationshipType.MENTOR);
    }
    
    // 竞争关系
    if (this.respect > 50 && this.affection < 60 && this.familiarity > 40) {
      this.secondaryTypes.push(RelationshipType.RIVAL);
    }
    
    // 同事关系
    if (this.familiarity > 40 && this.trust > 40) {
      this.secondaryTypes.push(RelationshipType.COLLEAGUE);
    }
  }

  /**
   * 关系自然衰减
   * @param {number} deltaTime - 时间间隔（天）
   */
  decay(deltaTime) {
    if (!this.isActive) return;
    
    const daysSinceInteraction = (Date.now() - this.lastInteraction) / (1000 * 60 * 60 * 24);
    
    // 超过一定时间未互动开始衰减
    if (daysSinceInteraction > 3) {
      const decayFactor = Math.min(daysSinceInteraction / 30, 1.0); // 30天内线性衰减
      
      for (const [attribute, rate] of Object.entries(this.decayRates)) {
        if (this[attribute] !== undefined) {
          const decay = rate * decayFactor * deltaTime;
          
          // 某些属性只会衰减到一定程度
          if (attribute === 'familiarity') {
            this[attribute] = Math.max(this[attribute] - decay, 5);
          } else if (attribute === 'kinship') {
            // 亲情不会自然衰减
            continue;
          } else {
            this[attribute] = Math.max(this[attribute] - decay, 0);
          }
        }
      }
      
      // 检查关系类型是否需要更新
      this.updateRelationshipType();
    }
  }

  /**
   * 检查特殊事件
   * @param {string} interactionType - 互动类型
   * @param {Object} context - 上下文
   * @param {Object} result - 互动结果
   */
  checkSpecialEvents(interactionType, context, result) {
    // 表白事件
    if (interactionType === InteractionType.ROMANCE && this.romance > 60 && !this.hasEvent('confession')) {
      result.events.push({
        type: 'confession',
        description: '关系发展到了表白的阶段',
        significance: 'high'
      });
      this.recordRelationshipEvent({
        type: 'confession',
        timestamp: Date.now(),
        context: context
      });
    }
    
    // 结为密友事件
    if (this.affection > 80 && this.trust > 70 && !this.hasEvent('close_friendship')) {
      result.events.push({
        type: 'close_friendship',
        description: '成为了密友',
        significance: 'medium'
      });
      this.recordRelationshipEvent({
        type: 'close_friendship',
        timestamp: Date.now()
      });
    }
    
    // 决裂事件
    if (this.affection < 15 && this.trust < 15 && !this.hasEvent('fallout')) {
      result.events.push({
        type: 'fallout',
        description: '关系彻底破裂',
        significance: 'high'
      });
      this.recordRelationshipEvent({
        type: 'fallout',
        timestamp: Date.now(),
        context: context
      });
    }
  }

  /**
   * 检查是否已发生某事件
   * @param {string} eventType - 事件类型
   * @returns {boolean} 是否已发生
   */
  hasEvent(eventType) {
    return this.relationshipEvents.some(event => event.type === eventType);
  }

  /**
   * 记录关系事件
   * @param {Object} event - 事件对象
   */
  recordRelationshipEvent(event) {
    this.relationshipEvents.push({
      ...event,
      id: Utils.String.generateId()
    });
    
    if (this.relationshipEvents.length > this.maxEventHistory) {
      this.relationshipEvents.shift();
    }
  }

  /**
   * 记录互动历史
   * @param {Object} interaction - 互动对象
   */
  recordInteraction(interaction) {
    this.interactions.push({
      ...interaction,
      id: Utils.String.generateId()
    });
    
    if (this.interactions.length > this.maxInteractionHistory) {
      this.interactions.shift();
    }
  }

  /**
   * 获取关系强度
   * @returns {number} 关系强度 (0-100)
   */
  getRelationshipStrength() {
    const weights = {
      familiarity: 0.15,
      affection: 0.25,
      trust: 0.2,
      respect: 0.15,
      intimacy: 0.15,
      romance: 0.1
    };
    
    let strength = 0;
    for (const [attribute, weight] of Object.entries(weights)) {
      strength += (this[attribute] || 0) * weight;
    }
    
    return Math.round(strength);
  }

  /**
   * 获取关系描述
   * @returns {string} 关系描述
   */
  getRelationshipDescription() {
    const strength = this.getRelationshipStrength();
    const type = this.primaryType;
    
    const descriptions = {
      [RelationshipType.STRANGER]: strength > 10 ? '初识的陌生人' : '完全陌生',
      [RelationshipType.ACQUAINTANCE]: strength > 40 ? '熟悉的熟人' : '普通熟人',
      [RelationshipType.FRIEND]: strength > 70 ? '要好的朋友' : '一般朋友',
      [RelationshipType.CLOSE_FRIEND]: '亲密无间的挚友',
      [RelationshipType.FAMILY]: this.kinship > 80 ? '血浓于水的亲人' : '普通家人',
      [RelationshipType.SPOUSE]: this.romance > 80 ? '恩爱夫妻' : '普通夫妻',
      [RelationshipType.LOVER]: this.romance > 70 ? '热恋中的恋人' : '初恋情侣',
      [RelationshipType.ENEMY]: this.affection < 10 ? '不共戴天的仇敌' : '敌对关系',
      [RelationshipType.RIVAL]: '互相竞争的对手',
      [RelationshipType.MENTOR]: '受人尊敬的师父',
      [RelationshipType.STUDENT]: '悉心教导的学生'
    };
    
    return descriptions[type] || type;
  }

  /**
   * 获取互动建议
   * @returns {Array} 建议的互动类型
   */
  getInteractionSuggestions() {
    const suggestions = [];
    
    // 基于当前关系状态给出建议
    if (this.familiarity < 30) {
      suggestions.push({
        type: InteractionType.CONVERSATION,
        reason: '增加熟识度',
        priority: 'high'
      });
    }
    
    if (this.affection < 40 && this.familiarity > 20) {
      suggestions.push({
        type: InteractionType.HELP,
        reason: '提升好感度',
        priority: 'medium'
      });
    }
    
    if (this.trust < 50 && this.affection > 50) {
      suggestions.push({
        type: InteractionType.COOPERATION,
        reason: '建立信任',
        priority: 'medium'
      });
    }
    
    if (this.romance > 40 && this.intimacy < 30) {
      suggestions.push({
        type: InteractionType.ROMANCE,
        reason: '发展浪漫关系',
        priority: 'low'
      });
    }
    
    return suggestions;
  }

  /**
   * 获取关系状态
   * @returns {Object} 关系状态
   */
  getState() {
    return {
      id: this.id,
      characterA: this.characterA,
      characterB: this.characterB,
      primaryType: this.primaryType,
      secondaryTypes: [...this.secondaryTypes],
      familiarity: Math.round(this.familiarity),
      affection: Math.round(this.affection),
      trust: Math.round(this.trust),
      respect: Math.round(this.respect),
      intimacy: Math.round(this.intimacy),
      kinship: Math.round(this.kinship),
      romance: Math.round(this.romance),
      lust: Math.round(this.lust),
      dependency: Math.round(this.dependency),
      strength: this.getRelationshipStrength(),
      description: this.getRelationshipDescription(),
      isActive: this.isActive,
      lastInteraction: this.lastInteraction,
      establishedDate: this.establishedDate,
      recentInteractions: this.interactions.slice(-5),
      significantEvents: this.relationshipEvents.filter(e => e.significance === 'high'),
      suggestions: this.getInteractionSuggestions()
    };
  }

  /**
   * 克隆关系
   * @returns {Relationship} 克隆的关系
   */
  clone() {
    const cloned = new Relationship(this.characterA, this.characterB, {
      familiarity: this.familiarity,
      affection: this.affection,
      trust: this.trust,
      respect: this.respect,
      intimacy: this.intimacy,
      kinship: this.kinship,
      romance: this.romance,
      lust: this.lust,
      dependency: this.dependency,
      primaryType: this.primaryType,
      secondaryTypes: [...this.secondaryTypes],
      isActive: this.isActive,
      isSymmetric: this.isSymmetric,
      lastInteraction: this.lastInteraction,
      establishedDate: this.establishedDate
    });
    
    cloned.interactions = [...this.interactions];
    cloned.relationshipEvents = [...this.relationshipEvents];
    cloned.modifiers = new Map(this.modifiers);
    
    return cloned;
  }
}

/**
 * 关系系统类
 * 管理角色的所有人际关系
 */
class RelationshipSystem {
  constructor(characterId, config = {}) {
    this.characterId = characterId;
    this.relationships = new Map(); // key: otherCharacterId, value: Relationship
    
    // 系统配置
    this.socialCircleLimit = config.socialCircleLimit || 50;
    this.maxActiveRelationships = config.maxActiveRelationships || 20;
    this.relationshipDecayEnabled = config.relationshipDecayEnabled !== false;
    
    // 社交偏好
    this.socialPreferences = {
      extroversion: config.extroversion || 0.5,      // 外向性 (0-1)
      trustfulness: config.trustfulness || 0.5,      // 信任倾向
      romanticism: config.romanticism || 0.5,        // 浪漫倾向
      familyOrientation: config.familyOrientation || 0.7 // 家庭观念
    };
    
    // 关系网络分析缓存
    this.networkAnalysisCache = null;
    this.networkAnalysisCacheTime = 0;
    
    // 社交事件历史
    this.socialEvents = [];
    this.maxSocialEventHistory = 100;
    
    this.initialize();
  }

  /**
   * 初始化关系系统
   */
  initialize() {
    console.log(`关系系统初始化完成: ${this.characterId}`);
  }

  /**
   * 建立关系
   * @param {string} otherCharacterId - 对方角色ID
   * @param {Object} config - 关系配置
   * @returns {Relationship} 创建的关系
   */
  establishRelationship(otherCharacterId, config = {}) {
    if (this.relationships.has(otherCharacterId)) {
      return this.relationships.get(otherCharacterId);
    }
    
    const relationship = new Relationship(this.characterId, otherCharacterId, config);
    this.relationships.set(otherCharacterId, relationship);
    
    // 记录社交事件
    this.recordSocialEvent({
      type: 'relationship_established',
      participants: [this.characterId, otherCharacterId],
      timestamp: Date.now(),
      relationshipType: relationship.primaryType
    });
    
    console.log(`建立关系: ${this.characterId} <-> ${otherCharacterId} (${relationship.primaryType})`);
    
    return relationship;
  }

  /**
   * 添加关系（establishRelationship的别名方法）
   * @param {string} otherCharacterId - 对方角色ID
   * @param {Object} config - 关系配置
   * @returns {Relationship} 创建的关系
   */
  addRelationship(otherCharacterId, config = {}) {
    return this.establishRelationship(otherCharacterId, config);
  }

  /**
   * 获取关系
   * @param {string} otherCharacterId - 对方角色ID
   * @returns {Relationship|null} 关系对象
   */
  getRelationship(otherCharacterId) {
    return this.relationships.get(otherCharacterId) || null;
  }

  /**
   * 处理互动
   * @param {string} otherCharacterId - 对方角色ID
   * @param {string} interactionType - 互动类型
   * @param {Object} context - 互动上下文
   * @returns {Object} 互动结果
   */
  processInteraction(otherCharacterId, interactionType, context = {}) {
    let relationship = this.getRelationship(otherCharacterId);
    
    // 如果关系不存在，创建新关系
    if (!relationship) {
      relationship = this.establishRelationship(otherCharacterId);
    }
    
    // 处理互动
    const result = relationship.processInteraction(interactionType, context);
    
    // 记录社交事件
    this.recordSocialEvent({
      type: 'interaction',
      participants: [this.characterId, otherCharacterId],
      interactionType: interactionType,
      context: context,
      result: result,
      timestamp: Date.now()
    });
    
    // 清除网络分析缓存
    this.networkAnalysisCache = null;
    
    return {
      ...result,
      relationship: relationship.getState()
    };
  }

  /**
   * 更新关系系统
   * @param {number} deltaTime - 时间间隔（天）
   */
  update(deltaTime) {
    if (!this.relationshipDecayEnabled) return;
    
    // 处理关系衰减
    for (const relationship of this.relationships.values()) {
      relationship.decay(deltaTime);
    }
    
    // 清理不活跃的关系
    this.cleanupInactiveRelationships();
    
    // 清除过期缓存
    if (Date.now() - this.networkAnalysisCacheTime > 300000) { // 5分钟
      this.networkAnalysisCache = null;
    }
  }

  /**
   * 清理不活跃的关系
   */
  cleanupInactiveRelationships() {
    const cutoffTime = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90天
    const toRemove = [];
    
    for (const [characterId, relationship] of this.relationships) {
      // 只清理非常弱且长时间未互动的关系
      if (relationship.getRelationshipStrength() < 10 && 
          relationship.lastInteraction < cutoffTime &&
          relationship.primaryType === RelationshipType.STRANGER) {
        toRemove.push(characterId);
      }
    }
    
    for (const characterId of toRemove) {
      this.relationships.delete(characterId);
      console.log(`清理不活跃关系: ${this.characterId} -> ${characterId}`);
    }
  }

  /**
   * 获取所有关系
   * @param {Object} filters - 过滤条件
   * @returns {Array} 关系列表
   */
  getAllRelationships(filters = {}) {
    let relationships = Array.from(this.relationships.values());
    
    // 应用过滤器
    if (filters.type) {
      relationships = relationships.filter(rel => rel.primaryType === filters.type);
    }
    
    if (filters.minStrength) {
      relationships = relationships.filter(rel => 
        rel.getRelationshipStrength() >= filters.minStrength);
    }
    
    if (filters.isActive !== undefined) {
      relationships = relationships.filter(rel => rel.isActive === filters.isActive);
    }
    
    // 按强度排序
    relationships.sort((a, b) => b.getRelationshipStrength() - a.getRelationshipStrength());
    
    return relationships.map(rel => rel.getState());
  }

  /**
   * 获取特定类型的关系
   * @param {string} relationshipType - 关系类型
   * @returns {Array} 关系列表
   */
  getRelationshipsByType(relationshipType) {
    return this.getAllRelationships({ type: relationshipType });
  }

  /**
   * 获取家庭成员
   * @returns {Array} 家庭成员列表
   */
  getFamilyMembers() {
    return this.getRelationshipsByType(RelationshipType.FAMILY);
  }

  /**
   * 获取朋友列表
   * @returns {Array} 朋友列表
   */
  getFriends() {
    const friends = this.getRelationshipsByType(RelationshipType.FRIEND);
    const closeFriends = this.getRelationshipsByType(RelationshipType.CLOSE_FRIEND);
    return [...friends, ...closeFriends];
  }

  /**
   * 获取恋爱对象
   * @returns {Array} 恋爱对象列表
   */
  getRomanticPartners() {
    const lovers = this.getRelationshipsByType(RelationshipType.LOVER);
    const spouses = this.getRelationshipsByType(RelationshipType.SPOUSE);
    return [...lovers, ...spouses];
  }

  /**
   * 分析社交网络
   * @returns {Object} 网络分析结果
   */
  analyzeSocialNetwork() {
    // 检查缓存
    if (this.networkAnalysisCache && 
        Date.now() - this.networkAnalysisCacheTime < 300000) {
      return this.networkAnalysisCache;
    }
    
    const analysis = {
      totalRelationships: this.relationships.size,
      activeRelationships: 0,
      strongRelationships: 0,
      networkDensity: 0,
      socialCircles: {},
      influence: 0,
      popularity: 0,
      isolation: 0
    };
    
    let totalStrength = 0;
    const strengthDistribution = {};
    
    // 基础统计
    for (const relationship of this.relationships.values()) {
      const strength = relationship.getRelationshipStrength();
      totalStrength += strength;
      
      if (relationship.isActive) analysis.activeRelationships++;
      if (strength > 60) analysis.strongRelationships++;
      
      // 关系类型分布
      const type = relationship.primaryType;
      if (!analysis.socialCircles[type]) {
        analysis.socialCircles[type] = 0;
      }
      analysis.socialCircles[type]++;
      
      // 强度分布
      const strengthRange = Math.floor(strength / 20) * 20;
      const key = `${strengthRange}-${strengthRange + 19}`;
      strengthDistribution[key] = (strengthDistribution[key] || 0) + 1;
    }
    
    // 计算网络密度
    if (analysis.totalRelationships > 0) {
      analysis.networkDensity = totalStrength / analysis.totalRelationships;
    }
    
    // 计算影响力（基于强关系数量）
    analysis.influence = analysis.strongRelationships * 10;
    
    // 计算受欢迎程度（基于好感度）
    let totalAffection = 0;
    for (const relationship of this.relationships.values()) {
      totalAffection += relationship.affection;
    }
    analysis.popularity = analysis.totalRelationships > 0 ? 
      totalAffection / analysis.totalRelationships : 0;
    
    // 计算孤立度
    analysis.isolation = Math.max(0, 100 - analysis.networkDensity);
    
    analysis.strengthDistribution = strengthDistribution;
    analysis.averageStrength = analysis.totalRelationships > 0 ? 
      totalStrength / analysis.totalRelationships : 0;
    
    // 缓存结果
    this.networkAnalysisCache = analysis;
    this.networkAnalysisCacheTime = Date.now();
    
    return analysis;
  }

  /**
   * 获取社交建议
   * @returns {Array} 社交建议列表
   */
  getSocialRecommendations() {
    const recommendations = [];
    const analysis = this.analyzeSocialNetwork();
    
    // 孤立度过高
    if (analysis.isolation > 70) {
      recommendations.push({
        type: 'increase_social_activity',
        priority: 'high',
        description: '社交圈过于狭窄，建议多参与社交活动',
        suggestion: '主动与他人对话交流'
      });
    }
    
    // 缺乏深度关系
    if (analysis.strongRelationships < 3 && analysis.totalRelationships > 5) {
      recommendations.push({
        type: 'deepen_relationships',
        priority: 'medium',
        description: '缺乏深度关系，建议加强与现有关系的联系',
        suggestion: '多花时间与朋友深入交流'
      });
    }
    
    // 家庭关系薄弱
    const familyCount = analysis.socialCircles[RelationshipType.FAMILY] || 0;
    if (familyCount > 0 && this.socialPreferences.familyOrientation > 0.6) {
      const avgFamilyStrength = this.getFamilyMembers()
        .reduce((sum, rel) => sum + rel.strength, 0) / familyCount;
      
      if (avgFamilyStrength < 60) {
        recommendations.push({
          type: 'strengthen_family_bonds',
          priority: 'medium',
          description: '家庭关系需要加强',
          suggestion: '多关心和照顾家人'
        });
      }
    }
    
    // 缺乏浪漫关系
    const romanticCount = analysis.socialCircles[RelationshipType.LOVER] || 0;
    const spouseCount = analysis.socialCircles[RelationshipType.SPOUSE] || 0;
    
    if (romanticCount === 0 && spouseCount === 0 && 
        this.socialPreferences.romanticism > 0.5) {
      recommendations.push({
        type: 'seek_romance',
        priority: 'low',
        description: '缺乏浪漫关系',
        suggestion: '考虑寻找合适的伴侣'
      });
    }
    
    return recommendations;
  }

  /**
   * 计算与其他角色的兼容性
   * @param {string} otherCharacterId - 对方角色ID
   * @param {Object} otherSocialPreferences - 对方社交偏好
   * @returns {number} 兼容性得分 (0-100)
   */
  calculateCompatibility(otherCharacterId, otherSocialPreferences) {
    let compatibility = 50; // 基础兼容性
    
    // 基于社交偏好的兼容性
    const preferences = this.socialPreferences;
    const otherPrefs = otherSocialPreferences;
    
    // 外向性互补
    const extroversionDiff = Math.abs(preferences.extroversion - otherPrefs.extroversion);
    if (extroversionDiff < 0.3) {
      compatibility += 10; // 相似性加分
    } else if (extroversionDiff > 0.7) {
      compatibility += 5;  // 互补性加分
    }
    
    // 信任倾向相似性
    const trustDiff = Math.abs(preferences.trustfulness - otherPrefs.trustfulness);
    compatibility += (1 - trustDiff) * 15;
    
    // 浪漫倾向兼容性
    const romanceDiff = Math.abs(preferences.romanticism - otherPrefs.romanticism);
    compatibility += (1 - romanceDiff) * 10;
    
    // 如果已有关系，基于关系质量调整
    const existingRelationship = this.getRelationship(otherCharacterId);
    if (existingRelationship) {
      const relationshipBonus = existingRelationship.getRelationshipStrength() * 0.3;
      compatibility += relationshipBonus;
    }
    
    return Utils.Math.clamp(compatibility, 0, 100);
  }

  /**
   * 记录社交事件
   * @param {Object} event - 社交事件
   */
  recordSocialEvent(event) {
    this.socialEvents.push({
      ...event,
      id: Utils.String.generateId()
    });
    
    if (this.socialEvents.length > this.maxSocialEventHistory) {
      this.socialEvents.shift();
    }
  }

  /**
   * 获取社交历史统计
   * @param {number} days - 统计天数
   * @returns {Object} 社交统计
   */
  getSocialHistory(days = 30) {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentEvents = this.socialEvents.filter(event => 
      event.timestamp > cutoffTime);
    
    const stats = {
      totalEvents: recentEvents.length,
      interactions: 0,
      newRelationships: 0,
      conflictCount: 0,
      cooperationCount: 0,
      romanticEvents: 0,
      mostActiveDay: null,
      socialTrend: 'stable'
    };
    
    // 按类型统计
    const eventCounts = {};
    const dailyCounts = {};
    
    for (const event of recentEvents) {
      // 事件类型统计
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
      
      // 按天统计
      const day = new Date(event.timestamp).toDateString();
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      
      // 特定事件统计
      if (event.type === 'interaction') {
        stats.interactions++;
        
        if (event.interactionType === InteractionType.CONFLICT) {
          stats.conflictCount++;
        } else if (event.interactionType === InteractionType.COOPERATION) {
          stats.cooperationCount++;
        } else if (event.interactionType === InteractionType.ROMANCE) {
          stats.romanticEvents++;
        }
      } else if (event.type === 'relationship_established') {
        stats.newRelationships++;
      }
    }
    
    // 找出最活跃的一天
    if (Object.keys(dailyCounts).length > 0) {
      stats.mostActiveDay = Object.entries(dailyCounts)
        .sort((a, b) => b[1] - a[1])[0][0];
    }
    
    // 计算社交趋势
    if (recentEvents.length >= 10) {
      const firstHalf = recentEvents.slice(0, Math.floor(recentEvents.length / 2));
      const secondHalf = recentEvents.slice(Math.floor(recentEvents.length / 2));
      
      if (secondHalf.length > firstHalf.length * 1.2) {
        stats.socialTrend = 'increasing';
      } else if (secondHalf.length < firstHalf.length * 0.8) {
        stats.socialTrend = 'decreasing';
      }
    }
    
    stats.eventBreakdown = eventCounts;
    stats.dailyBreakdown = dailyCounts;
    
    return stats;
  }

  /**
   * 获取关系系统状态
   * @returns {Object} 系统状态
   */
  getState() {
    const state = {
      characterId: this.characterId,
      relationshipCount: this.relationships.size,
      socialPreferences: { ...this.socialPreferences },
      networkAnalysis: this.analyzeSocialNetwork(),
      socialRecommendations: this.getSocialRecommendations(),
      recentHistory: this.getSocialHistory(7),
      allRelationships: this.getAllRelationships(),
      familyMembers: this.getFamilyMembers(),
      friends: this.getFriends(),
      romanticPartners: this.getRomanticPartners()
    };
    
    return state;
  }

  /**
   * 设置关系系统状态
   * @param {Object} state - 系统状态
   */
  setState(state) {
    if (state.socialPreferences) {
      this.socialPreferences = { ...state.socialPreferences };
    }
    
    if (state.allRelationships) {
      this.relationships.clear();
      for (const relState of state.allRelationships) {
        const relationship = new Relationship(relState.characterA, relState.characterB, {
          familiarity: relState.familiarity,
          affection: relState.affection,
          trust: relState.trust,
          respect: relState.respect,
          intimacy: relState.intimacy,
          kinship: relState.kinship,
          romance: relState.romance,
          lust: relState.lust,
          dependency: relState.dependency,
          primaryType: relState.primaryType,
          secondaryTypes: relState.secondaryTypes,
          isActive: relState.isActive,
          lastInteraction: relState.lastInteraction,
          establishedDate: relState.establishedDate
        });
        
        this.relationships.set(relState.characterB, relationship);
      }
    }
    
    console.log(`关系系统状态已恢复: ${this.characterId}`);
  }

  /**
   * 克隆关系系统
   * @returns {RelationshipSystem} 克隆的系统
   */
  clone() {
    const cloned = new RelationshipSystem(this.characterId + '_clone');
    
    // 复制关系
    for (const [characterId, relationship] of this.relationships) {
      cloned.relationships.set(characterId, relationship.clone());
    }
    
    // 复制配置
    cloned.socialPreferences = { ...this.socialPreferences };
    cloned.socialEvents = [...this.socialEvents];
    
    return cloned;
  }

  /**
   * 销毁关系系统
   */
  destroy() {
    this.relationships.clear();
    this.socialEvents = [];
    this.networkAnalysisCache = null;
    
    console.log(`关系系统已销毁: ${this.characterId}`);
  }
}

// ==================== 关系工具函数 ====================
export const RelationshipUtils = {
  /**
   * 生成家庭关系网络
   * @param {Array} familyMembers - 家庭成员ID列表
   * @param {RelationshipSystem} relationshipSystem - 关系系统
   */
  generateFamilyNetwork(familyMembers, relationshipSystem) {
    for (let i = 0; i < familyMembers.length; i++) {
      for (let j = i + 1; j < familyMembers.length; j++) {
        const memberA = familyMembers[i];
        const memberB = familyMembers[j];
        
        relationshipSystem.establishRelationship(memberB, {
          primaryType: RelationshipType.FAMILY,
          familiarity: Utils.Math.randomInt(60, 90),
          affection: Utils.Math.randomInt(50, 80),
          trust: Utils.Math.randomInt(60, 90),
          kinship: Utils.Math.randomInt(70, 95)
        });
      }
    }
  },

  /**
   * 计算关系网络的影响力
   * @param {RelationshipSystem} relationshipSystem - 关系系统
   * @returns {number} 影响力得分
   */
  calculateNetworkInfluence(relationshipSystem) {
    const analysis = relationshipSystem.analyzeSocialNetwork();
    
    let influence = 0;
    influence += analysis.strongRelationships * 10;        // 强关系影响
    influence += analysis.networkDensity * 0.5;           // 网络密度影响
    influence += (analysis.socialCircles[RelationshipType.MENTOR] || 0) * 15; // 师父关系
    influence += (analysis.socialCircles[RelationshipType.STUDENT] || 0) * 5; // 学生关系
    
    return Math.round(influence);
  },

  /**
   * 分析关系冲突风险
   * @param {RelationshipSystem} relationshipSystem - 关系系统
   * @returns {Array} 冲突风险列表
   */
  analyzeConflictRisks(relationshipSystem) {
    const risks = [];
    const relationships = relationshipSystem.getAllRelationships();
    
    for (const rel of relationships) {
      let riskLevel = 0;
      const reasons = [];
      
      // 信任度低
      if (rel.trust < 30) {
        riskLevel += 30;
        reasons.push('信任度过低');
      }
      
      // 好感度低但熟识度高（熟悉的敌人）
      if (rel.affection < 25 && rel.familiarity > 60) {
        riskLevel += 40;
        reasons.push('关系恶化');
      }
      
      // 依赖度不平衡
      if (rel.dependency > 70) {
        riskLevel += 20;
        reasons.push('依赖关系不健康');
      }
      
      if (riskLevel > 40) {
        risks.push({
          characterId: rel.characterB,
          riskLevel: riskLevel,
          reasons: reasons,
          recommendedActions: ['增进沟通', '化解误解', '寻求第三方调解']
        });
      }
    }
    
    return risks.sort((a, b) => b.riskLevel - a.riskLevel);
  },

  /**
   * 生成随机关系配置
   * @param {string} relationshipType - 关系类型
   * @returns {Object} 关系配置
   */
  generateRandomRelationshipConfig(relationshipType) {
    const configs = {
      [RelationshipType.FAMILY]: {
        familiarity: Utils.Math.randomInt(70, 95),
        affection: Utils.Math.randomInt(60, 85),
        trust: Utils.Math.randomInt(70, 90),
        respect: Utils.Math.randomInt(60, 80),
        kinship: Utils.Math.randomInt(80, 95)
      },
      [RelationshipType.FRIEND]: {
        familiarity: Utils.Math.randomInt(50, 80),
        affection: Utils.Math.randomInt(60, 85),
        trust: Utils.Math.randomInt(50, 75),
        respect: Utils.Math.randomInt(50, 70)
      },
      [RelationshipType.LOVER]: {
        familiarity: Utils.Math.randomInt(60, 85),
        affection: Utils.Math.randomInt(70, 90),
        trust: Utils.Math.randomInt(60, 80),
        intimacy: Utils.Math.randomInt(50, 80),
        romance: Utils.Math.randomInt(60, 90),
        lust: Utils.Math.randomInt(30, 70)
      },
      [RelationshipType.ENEMY]: {
        familiarity: Utils.Math.randomInt(30, 70),
        affection: Utils.Math.randomInt(5, 25),
        trust: Utils.Math.randomInt(0, 20),
        respect: Utils.Math.randomInt(10, 40)
      }
    };
    
    return configs[relationshipType] || {
      familiarity: Utils.Math.randomInt(10, 30),
      affection: Utils.Math.randomInt(40, 60),
      trust: Utils.Math.randomInt(40, 60)
    };
  }
};

export { Relationship, RelationshipSystem };
export default RelationshipSystem;