/**
 * InteractionSystem - 互动系统
 * 管理角色之间的双人/多人互动
 * 
 * @author Claude
 * @date 2025-11-02
 */

export class InteractionSystem {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;

    // 🔧 创建地点名称→ID映射表
    this.locationNameToIdMap = new Map();
    //this._buildLocationNameMap();
    
    // 互动定义 (从 interaction_patterns.json 加载)
    this.interactions = new Map();
    
    // 互动类别索引
    this.categoryIndex = new Map();
    
    // 活跃的互动实例
    this.activeInteractions = new Map(); // characterId -> Interaction
    
    // 互动历史
    this.interactionHistory = new Map(); // characterId -> Array<history>
    
    // 互动统计
    this.stats = {
      totalInteractions: 0,
      successfulInteractions: 0,
      failedInteractions: 0,
      byCategory: new Map()
    };
    
    // 全局设置
    this.maxConcurrentInteractions = 50;
    this.interactionCooldown = 10; // 秒
    this.memoryRetentionDays = 30;
    
    console.log('💬 InteractionSystem 初始化');
  }

  /**
   * 构建地点名称到ID的映射
   */
  async _buildLocationNameMap() {
    try {
      const locationsData = await this.gameEngine.dataManager.dataTableManager.getLocations();
      if (locationsData && locationsData.locations) {
        locationsData.locations.forEach(loc => {
          this.locationNameToIdMap.set(loc.name, loc.id);
        });
        console.log('✅ 地点名称映射表创建完成:', this.locationNameToIdMap.size, '个地点');
      }
    } catch (error) {
      console.error('❌ 创建地点名称映射表失败:', error);
    }
  }

  /**
   * 将地点名称转换为ID
   */
  _convertLocationNameToId(locationName) {
    return this.locationNameToIdMap.get(locationName) || locationName;
  }


  /**
   * 初始化 - 加载互动配置
   */
  async initialize() {
    console.log('📦 开始加载互动配置...');
    
    try {
      // 🔧 1. 先构建地点映射
      await this._buildLocationNameMap();

      // 2. 从 DataTableManager 加载 interaction_patterns.json
      const data = await this.gameEngine.dataManager.dataTableManager.getInteractionPatterns();
      
      if (!data || !data.interactions) {
        console.warn('⚠️ 未找到互动配置数据');
        return false;
      }
      
      // 存储全局设置
      if (data.globalSettings) {
        this.maxConcurrentInteractions = data.globalSettings.maxConcurrentInteractions || 50;
        this.interactionCooldown = data.globalSettings.interactionCooldown || 10;
        this.memoryRetentionDays = data.globalSettings.memoryRetentionDays || 30;
      }
      
      // 创建互动实例
      for (const config of data.interactions) {
        const interaction = this._createInteraction(config);
        this.interactions.set(config.id, interaction);
        
        // 建立类别索引
        if (!this.categoryIndex.has(config.category)) {
          this.categoryIndex.set(config.category, []);
        }
        this.categoryIndex.get(config.category).push(config.id);
      }
      
      console.log(`✅ 加载了 ${this.interactions.size} 个互动模式`);
      console.log(`📑 互动类别: ${Array.from(this.categoryIndex.keys()).join(', ')}`);
      
      return true;
    } catch (error) {
      console.error('❌ InteractionSystem 初始化失败:', error);
      return false;
    }
  }
  
  /**
   * 创建互动实例
   * @private
   */
  _createInteraction(config) {
    return {
      id: config.id,
      name: config.name,
      displayName: config.displayName,
      category: config.category,
      description: config.description,
      
      // 参与者要求
      minParticipants: config.participantRequirements.minParticipants,
      maxParticipants: config.participantRequirements.maxParticipants,
      initiatorRequirements: config.participantRequirements.initiatorRequirements || {},
      targetRequirements: config.participantRequirements.targetRequirements || {},
      
      // 关系要求
      relationshipRequirements: config.relationshipRequirements || {},
      
      // 有效条件
      validLocations: config.validLocations || [],
      validTimeOfDay: config.validTimeOfDay || [],
      validSeasons: config.validSeasons || [],
      
      // 阶段
      phases: config.phases || [],
      
      // 结果
      outcomes: config.outcomes,
      
      // 属性
      duration: config.duration,
      priority: config.priority || 50,
      canBeRejected: config.canBeRejected !== false,
      interruptible: config.interruptible !== false,
      
      // 影响
      virtueImpact: config.virtueImpact || {},
      resourceCosts: config.resourceCosts || {},
      
      // 标签
      tags: config.tags || [],
      
      // 原始配置引用
      _config: config
    };
  }
  
  /**
   * 获取互动
   */
  getInteraction(interactionId) {
    return this.interactions.get(interactionId) || null;
  }
  
  /**
   * 按类别获取互动
   */
  getInteractionsByCategory(category) {
    const ids = this.categoryIndex.get(category) || [];
    return ids.map(id => this.interactions.get(id)).filter(Boolean);
  }
  
  /**
   * 检查互动是否可执行
   */
  canInteract(initiator, target, interactionId) {
    const interaction = this.getInteraction(interactionId);
    if (!interaction) {
      return { canExecute: false, reason: '互动不存在' };
    }
    
    // 检查参与者
    if (!initiator || !target) {
      return { canExecute: false, reason: '参与者缺失' };
    }
    
    // 检查发起者要求
    const initiatorCheck = this._checkRequirements(initiator, interaction.initiatorRequirements);
    if (!initiatorCheck.pass) {
      return { canExecute: false, reason: `发起者不满足: ${initiatorCheck.reason}` };
    }
    
    // 检查目标要求
    const targetCheck = this._checkRequirements(target, interaction.targetRequirements);
    if (!targetCheck.pass) {
      return { canExecute: false, reason: `目标不满足: ${targetCheck.reason}` };
    }
    
    // 检查关系要求
    const relationCheck = this._checkRelationshipRequirements(initiator, target, interaction);
    if (!relationCheck.pass) {
      return { canExecute: false, reason: relationCheck.reason };
    }
    
    // 检查地点
    if (interaction.validLocations.length > 0) {
      // 🔧 转换地点名称为ID
      const validLocationIds = interaction.validLocations.map(name => 
        this._convertLocationNameToId(name)
      );
      const initiatorLocationId = this._convertLocationNameToId(initiator.currentLocation);
      
      if (!validLocationIds.includes(initiatorLocationId)) {
        return { canExecute: false, reason: '地点不符合' };
      }
    }
    
    // 检查冷却
    if (this._isOnCooldown(initiator.id, interactionId)) {
      return { canExecute: false, reason: '互动冷却中' };
    }
    
    return { canExecute: true };
  }
  
  /**
   * 检查角色要求
   * @private
   */
  _checkRequirements(character, requirements) {
    // 检查需求 (needs)
    if (requirements.needs) {
      for (const [need, constraint] of Object.entries(requirements.needs)) {
        const currentValue = character.physicalState?.[need] || character.emotionalState?.[need] || 50;
        
        if (constraint.min !== undefined && currentValue < constraint.min) {
          return { pass: false, reason: `${need}不足(${currentValue} < ${constraint.min})` };
        }
        
        if (constraint.max !== undefined && currentValue > constraint.max) {
          return { pass: false, reason: `${need}过高(${currentValue} > ${constraint.max})` };
        }
      }
    }
    
    // 检查状态 (states)
    if (requirements.states) {
      for (const [state, constraint] of Object.entries(requirements.states)) {
        const currentValue = character.emotionalState?.[state] || character.physicalState?.[state] || 50;
        
        if (constraint.min !== undefined && currentValue < constraint.min) {
          return { pass: false, reason: `${state}不足` };
        }
        
        if (constraint.max !== undefined && currentValue > constraint.max) {
          return { pass: false, reason: `${state}过高` };
        }
      }
    }
    
    // 检查技能 (skills)
    if (requirements.skills) {
      for (const [skill, constraint] of Object.entries(requirements.skills)) {
        const skillLevel = character.getSkillLevel ? character.getSkillLevel(skill) : 0;
        
        if (constraint.min !== undefined && skillLevel < constraint.min) {
          return { pass: false, reason: `${skill}等级不足` };
        }
      }
    }
    
    // 检查德行 (virtues)
    if (requirements.virtues) {
      for (const [virtue, constraint] of Object.entries(requirements.virtues)) {
        const virtueValue = character.virtueSystem?.virtues?.get(virtue) || 50;
        
        if (constraint.min !== undefined && virtueValue < constraint.min) {
          return { pass: false, reason: `${virtue}德行不足` };
        }
      }
    }
    
    return { pass: true };
  }
  
  /**
   * 检查关系要求
   * @private
   */
  _checkRelationshipRequirements(initiator, target, interaction) {
    if (!interaction.relationshipRequirements) {
      return { pass: true };
    }
    
    // 获取关系数据
    const relationship = this._getRelationship(initiator, target);
    
    const req = interaction.relationshipRequirements;
    
    // 检查熟悉度
    if (req.familiarity) {
      const familiarity = relationship?.familiarity || 0;
      if (req.familiarity.min !== undefined && familiarity < req.familiarity.min) {
        return { pass: false, reason: '熟悉度不足' };
      }
    }
    
    // 检查相性
    if (req.compatibility) {
      const compatibility = relationship?.compatibility || 0;
      if (req.compatibility.min !== undefined && compatibility < req.compatibility.min) {
        return { pass: false, reason: '相性不足' };
      }
    }
    
    return { pass: true };
  }
  
  /**
   * 获取关系数据
   * @private
   */
  _getRelationship(char1, char2) {
    // 🔧 优先从角色的 relationships 获取
    if (char1.relationships && char1.relationships.has) {
      const rel = char1.relationships.get(char2.id);
      if (rel) return rel;
    }
    
    // 🔧 尝试从 FamilySystem 获取血缘关系
    if (this.gameEngine.familySystem && char1.familyName && char2.familyName) {
      const kinship = this.gameEngine.familySystem.getKinship(
        char1.familyName,
        char1.id,
        char2.id
      );
      
      if (kinship) {
        // 返回兼容的关系数据结构
        return {
          familiarity: 50,  // 血亲默认熟悉度
          compatibility: 30, // 血亲默认相性
          cooperation: 0,
          bloodRelation: kinship
        };
      }
    }
    
    return null;
  }
  
  /**
   * 检查是否在冷却中
   * @private
   */
  _isOnCooldown(characterId, interactionId) {
    const history = this.interactionHistory.get(characterId);
    if (!history || history.length === 0) return false;
    
    const lastInteraction = history[history.length - 1];
    const timeSince = (Date.now() - lastInteraction.timestamp) / 1000;
    
    return timeSince < this.interactionCooldown;
  }
  
  /**
   * 执行互动
   */
  executeInteraction(initiator, target, interactionId, options = {}) {
    const interaction = this.getInteraction(interactionId);
    if (!interaction) {
      return { success: false, reason: '互动不存在' };
    }
    
    // 检查是否可执行
    const canExecute = this.canInteract(initiator, target, interactionId);
    if (!canExecute.canExecute) {
      return { success: false, reason: canExecute.reason };
    }
    
    console.log(`💬 ${initiator.name} 对 ${target.name} 发起互动: ${interaction.displayName}`);
    
    // 判断结果
    const outcome = this._determineOutcome(interaction, initiator, target);
    
    // 应用效果
    this._applyEffects(interaction, initiator, target, outcome);
    
    // 记录历史
    this._recordInteraction(initiator, target, interaction, outcome);
    
    // 更新统计
    this._updateStats(interaction, outcome.success);
    
    return {
      success: true,
      outcome: outcome.success ? 'success' : 'failure',
      interaction: interaction.displayName,
      effects: outcome.effects,
      message: this._generateMessage(interaction, initiator, target, outcome)
    };
  }
  
  /**
   * 判定互动结果
   * @private
   */
  _determineOutcome(interaction, initiator, target) {
    const successOutcome = interaction.outcomes.success;
    const failureOutcome = interaction.outcomes.failure;
    
    // 基础成功率
    let successChance = successOutcome.probability || 0.8;
    
    // TODO: 根据角色属性、关系等调整成功率
    
    // 判定
    const roll = Math.random();
    const success = roll < successChance;
    
    return success ? 
      { success: true, effects: successOutcome.effects, memory: successOutcome.memory } :
      { success: false, effects: failureOutcome?.effects, memory: failureOutcome?.memory };
  }
  
  /**
   * 应用效果
   * @private
   */
  _applyEffects(interaction, initiator, target, outcome) {
    if (!outcome.effects) return;
    
    // 应用到发起者
    if (outcome.effects.initiator) {
      this._applyCharacterEffects(initiator, outcome.effects.initiator);
    }
    
    // 应用到目标
    if (outcome.effects.target) {
      this._applyCharacterEffects(target, outcome.effects.target);
    }
    
    // 应用关系效果
    if (outcome.effects.relationship) {
      this._applyRelationshipEffects(initiator, target, outcome.effects.relationship);
    }
  }
  
  /**
   * 应用角色效果
   * @private
   */
  _applyCharacterEffects(character, effects) {
    // 应用需求变化
    if (effects.needs && character.physicalState) {
      for (const [need, change] of Object.entries(effects.needs)) {
        if (character.physicalState[need] !== undefined) {
          character.physicalState[need] = Math.max(0, Math.min(100, 
            character.physicalState[need] + change
          ));
        } else if (character.emotionalState && character.emotionalState[need] !== undefined) {
          character.emotionalState[need] = Math.max(0, Math.min(100,
            character.emotionalState[need] + change
          ));
        }
      }
    }
    
    // 应用状态变化
    if (effects.states && character.emotionalState) {
      for (const [state, change] of Object.entries(effects.states)) {
        if (character.emotionalState[state] !== undefined) {
          character.emotionalState[state] = Math.max(0, Math.min(100,
            character.emotionalState[state] + change
          ));
        }
      }
    }
    
    // 应用技能经验
    if (effects.skills && character.skillSystem) {
      for (const [skill, exp] of Object.entries(effects.skills)) {
        // TODO: 调用技能系统的经验增加方法
        // character.skillSystem.gainExperience(skill, exp);
      }
    }
  }
  
  /**
   * 应用关系效果
   * @private
   */
  _applyRelationshipEffects(char1, char2, effects) {
    // 🔧 确保角色有 relationships Map
    if (!char1.relationships) {
      char1.relationships = new Map();
    }
    
    // 获取或创建关系
    let relationship = char1.relationships.get(char2.id);
    
    if (!relationship) {
      // 🔧 检查是否有血缘关系作为基础
      const kinship = this.gameEngine.familySystem?.getKinship?.(
        char1.familyName,
        char1.id,
        char2.id
      );
      
      relationship = {
        familiarity: kinship ? 50 : 0,
        compatibility: kinship ? 30 : 0,
        cooperation: 0,
        bloodRelation: kinship || null
      };
      
      char1.relationships.set(char2.id, relationship);
    }
    
    // 应用变化
    for (const [aspect, change] of Object.entries(effects)) {
      if (relationship[aspect] !== undefined) {
        relationship[aspect] += change;
        // 限制范围 0-100
        relationship[aspect] = Math.max(0, Math.min(100, relationship[aspect]));
      }
    }
    
    // 🔧 双向更新(char2对char1的关系)
    if (!char2.relationships) {
      char2.relationships = new Map();
    }
    
    let reverseRelationship = char2.relationships.get(char1.id);
    if (!reverseRelationship) {
      reverseRelationship = { ...relationship };
      char2.relationships.set(char1.id, reverseRelationship);
    } else {
      // 同步更新
      for (const [aspect, change] of Object.entries(effects)) {
        if (reverseRelationship[aspect] !== undefined) {
          reverseRelationship[aspect] += change;
          reverseRelationship[aspect] = Math.max(0, Math.min(100, reverseRelationship[aspect]));
        }
      }
    }
  }
  
  /**
   * 记录互动历史
   * @private
   */
  _recordInteraction(initiator, target, interaction, outcome) {
    const record = {
      timestamp: Date.now(),
      interactionId: interaction.id,
      interactionName: interaction.name,
      initiatorId: initiator.id,
      targetId: target.id,
      success: outcome.success,
      memory: outcome.memory
    };
    
    // 记录到发起者
    if (!this.interactionHistory.has(initiator.id)) {
      this.interactionHistory.set(initiator.id, []);
    }
    this.interactionHistory.get(initiator.id).push(record);
    
    // 记录到目标
    if (!this.interactionHistory.has(target.id)) {
      this.interactionHistory.set(target.id, []);
    }
    this.interactionHistory.get(target.id).push(record);
    
    // 限制历史长度
    const maxHistory = 100;
    if (this.interactionHistory.get(initiator.id).length > maxHistory) {
      this.interactionHistory.get(initiator.id).shift();
    }
    if (this.interactionHistory.get(target.id).length > maxHistory) {
      this.interactionHistory.get(target.id).shift();
    }
  }
  
  /**
   * 更新统计
   * @private
   */
  _updateStats(interaction, success) {
    this.stats.totalInteractions++;
    
    if (success) {
      this.stats.successfulInteractions++;
    } else {
      this.stats.failedInteractions++;
    }
    
    const category = interaction.category;
    if (!this.stats.byCategory.has(category)) {
      this.stats.byCategory.set(category, { total: 0, success: 0 });
    }
    const categoryStats = this.stats.byCategory.get(category);
    categoryStats.total++;
    if (success) categoryStats.success++;
  }
  
  /**
   * 生成互动消息
   * @private
   */
  _generateMessage(interaction, initiator, target, outcome) {
    const template = outcome.memory?.description || interaction.description;
    
    return template
      .replace(/{initiator}/g, initiator.name)
      .replace(/{target}/g, target.name);
  }
  
  /**
   * 获取角色的互动历史
   */
  getInteractionHistory(characterId, limit = 10) {
    const history = this.interactionHistory.get(characterId) || [];
    return history.slice(-limit);
  }
  
  /**
   * 获取统计信息
   */
  getStatistics() {
    return {
      totalInteractions: this.stats.totalInteractions,
      successfulInteractions: this.stats.successfulInteractions,
      failedInteractions: this.stats.failedInteractions,
      successRate: this.stats.totalInteractions > 0 ?
        (this.stats.successfulInteractions / this.stats.totalInteractions * 100).toFixed(1) + '%' : '0%',
      byCategory: Object.fromEntries(
        Array.from(this.stats.byCategory.entries()).map(([cat, stats]) => [
          cat,
          {
            total: stats.total,
            success: stats.success,
            successRate: (stats.success / stats.total * 100).toFixed(1) + '%'
          }
        ])
      )
    };
  }
  
  /**
   * 清理过期历史
   */
  cleanupHistory() {
    const cutoffTime = Date.now() - (this.memoryRetentionDays * 24 * 60 * 60 * 1000);
    
    for (const [characterId, history] of this.interactionHistory) {
      const filtered = history.filter(record => record.timestamp > cutoffTime);
      this.interactionHistory.set(characterId, filtered);
    }
  }
}
