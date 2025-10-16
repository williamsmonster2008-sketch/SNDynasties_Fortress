/**
 * memory_system.js - 南北朝坞堡模拟器记忆系统 - 完整实现版本
 * 
 * 功能：管理角色的记忆、经验和学习，支持智能决策
 * 优先级：⭐⭐⭐⭐ (第三阶段核心模块)
 * 
 * 主要职责：
 * - 存储和检索重要事件记忆
 * - 影响决策的历史经验积累
 * - 情感记忆和创伤处理
 * - 记忆衰减和重要性评估
 * - 与关系系统的记忆关联
 * - 技能学习和经验传承
 */

import { DEFAULT_CONFIG } from './gameConfig.js';
import { Utils } from './utils_module.js';

/**
 * 记忆系统类
 * 管理角色的个人记忆和集体记忆
 */
export class MemorySystem {
  constructor(config = {}) {
    // 记忆系统配置
    this.memoryConfig = {
      maxMemoriesPerCharacter: config.maxMemories || 200,
      baseDecayRate: config.baseDecay || 0.02,
      importanceThreshold: config.importanceThreshold || 0.1,
      emotionalMultiplier: config.emotionalMultiplier || 1.5,
      rehearsalBonus: config.rehearsalBonus || 0.1,
      traumaThreshold: config.traumaThreshold || -0.7,
      ...config
    };

    // 记忆存储
    this.memories = new Map(); // characterId -> memories[]
    this.globalMemories = []; // 坞堡共同记忆
    
    // 触发器索引 - 快速检索
    this.triggers = {
      location: new Map(), // 地点触发器
      action: new Map(),   // 行为触发器
      person: new Map(),   // 人物触发器
      skill: new Map(),    // 技能触发器
      season: new Map(),   // 季节触发器
      event: new Map()     // 事件类型触发器
    };

    // 内存池优化
    this.memoryPool = [];
    this.poolSize = config.poolSize || 100;
    this._initializeMemoryPool();

    // 系统统计
    this.stats = {
      totalMemories: 0,
      memoriesCreated: 0,
      memoriesForgotten: 0,
      memoryRecalls: 0,
      averageImportance: 0,
      emotionalMemoriesCount: 0
    };

    console.log('🧠 记忆系统已初始化');
  }

  // ==================== 记忆添加和管理 ====================

  /**
   * 添加角色记忆
   * @param {string} characterId - 角色ID
   * @param {Object} event - 事件描述
   * @param {number} importance - 重要性 (0-1)
   * @param {number} emotionalImpact - 情感影响 (-1到1)
   * @param {Object} context - 上下文信息
   * @returns {string} 记忆ID
   */
  addMemory(characterId, event, importance = 0.5, emotionalImpact = 0, context = {}) {
    try {
      // 创建记忆对象
      const memory = this._createMemory({
        characterId,
        event,
        importance: Math.max(0, Math.min(1, importance)),
        emotional_impact: Math.max(-1, Math.min(1, emotionalImpact)),
        context,
        timestamp: Date.now(),
        gameTime: context.gameTime || 0
      });

      // 初始化角色记忆存储
      if (!this.memories.has(characterId)) {
        this.memories.set(characterId, []);
      }

      const memories = this.memories.get(characterId);
      memories.push(memory);

      // 构建索引触发器
      this._buildTriggers(memory);

      // 检查记忆容量限制
      this._enforceMemoryLimit(characterId);

      // 更新统计
      this._updateStats(memory);

      // 检查是否为全局重要事件
      if (importance > 0.8 || Math.abs(emotionalImpact) > 0.8) {
        this._propagateGlobalMemory(memory);
      }

      console.log(`💭 角色 ${characterId} 添加了记忆: ${event.description || event.action}`);
      return memory.id;

    } catch (error) {
      console.error('添加记忆失败:', error);
      return null;
    }
  }

  /**
   * 回忆记忆
   * @param {string} characterId - 角色ID
   * @param {Object} context - 回忆上下文
   * @param {Object} triggers - 触发条件
   * @returns {Array} 相关记忆列表
   */
  recallMemory(characterId, context = {}, triggers = {}) {
    const memories = this.memories.get(characterId) || [];
    if (memories.length === 0) return [];

    // 基于触发器和上下文搜索
    let relevantMemories = [];
    
    // 触发器搜索
    if (Object.keys(triggers).length > 0) {
      relevantMemories = relevantMemories.concat(this._searchByTrigger(characterId, triggers));
    }
    
    // 上下文搜索
    if (Object.keys(context).length > 0) {
      relevantMemories = relevantMemories.concat(this._searchByContext(characterId, context));
    }
    
    // 如果没有指定条件，返回最近的重要记忆
    if (relevantMemories.length === 0) {
      relevantMemories = memories.filter(m => m.importance > 0.3);
    }

    // 去重和排序
    const uniqueMemories = this._removeDuplicateMemories(relevantMemories);
    const sortedMemories = this._sortMemoriesByRelevance(uniqueMemories, context);
    
    // 强化被回忆的记忆
    this._reinforceMemories(sortedMemories);
    
    // 更新统计
    this.stats.memoryRecalls++;
    
    return sortedMemories.slice(0, 10); // 返回最相关的10个记忆
  }

  /**
   * 获取与特定情况相关的记忆
   * @param {string} characterId - 角色ID
   * @param {Object} situation - 情况描述
   * @returns {Array} 相关记忆
   */
  getRelevantMemories(characterId, situation) {
    const triggers = this._extractTriggersFromSituation(situation);
    return this.recallMemory(characterId, situation, triggers);
  }

  /**
   * 获取行为经验值
   * @param {string} characterId - 角色ID
   * @param {string} action - 行为名称
   * @returns {number} 经验值(0-100)
   */
  getActionExperience(characterId, action) {
    const memories = this.memories.get(characterId) || [];
    let experience = 0;
    let count = 0;
    
    for (const memory of memories) {
      if (memory.event.action === action) {
        const success = memory.event.success || 0.5;
        const timeDecay = this._calculateTimeDecay(memory);
        experience += success * memory.importance * timeDecay;
        count++;
      }
    }
    
    // 基于经验次数和成功率计算
    return Math.min(count * 5 + experience * 20, 100);
  }

  getActionSuccessRate(character, action) {
    try {
        if (!character || !action) return 0.5; // 默认成功率

        const characterId = typeof character === 'string' ? character : character.id;
        const memories = this.getMemoriesByCharacter(characterId);
        
        if (!memories || memories.length === 0) return 0.5;

        // 筛选与特定行为相关的记忆
        const actionMemories = memories.filter(memory => 
            memory.event && 
            memory.event.action === action &&
            memory.event.hasOwnProperty('success')
        );

        if (actionMemories.length === 0) return 0.5;

        // 计算成功率
        const totalSuccesses = actionMemories.reduce((sum, memory) => {
            const success = memory.event.success;
            // 成功值可能是布尔值或数字
            if (typeof success === 'boolean') {
                return sum + (success ? 1 : 0);
            } else if (typeof success === 'number') {
                return sum + Math.max(0, Math.min(1, success));
            }
            return sum;
        }, 0);

        return totalSuccesses / actionMemories.length;
    } catch (error) {
        console.warn('⚠️ 获取行为成功率失败:', error.message);
        return 0.5; // 默认成功率
    }
}


/**
 * 获取角色的所有记忆
 * @param {string} characterId - 角色ID
 * @returns {Array} 角色记忆数组
 */
getMemoriesByCharacter(characterId) {
  return this.memories.get(characterId) || [];
}

getLocationSentiment(character, location) {
    try {
        if (!character || !location) return 0;

        const characterId = typeof character === 'string' ? character : character.id;
        const memories = this.getMemoriesByCharacter(characterId);
        
        if (!memories || memories.length === 0) return 0;

        // 筛选与特定地点相关的记忆
        const locationMemories = memories.filter(memory => 
            memory.event && 
            (memory.event.location === location || memory.location === location)
        );

        if (locationMemories.length === 0) return 0;

        // 计算地点情感倾向
        const totalSentiment = locationMemories.reduce((sum, memory) => {
            const impact = memory.emotional_impact || 0;
            const importance = memory.importance || 1;
            return sum + (impact * importance);
        }, 0);

        const totalWeight = locationMemories.reduce((sum, memory) => {
            return sum + (memory.importance || 1);
        }, 0);

        return totalWeight > 0 ? (totalSentiment / totalWeight) * 100 : 0;
    } catch (error) {
        console.warn('⚠️ 获取地点情感倾向失败:', error.message);
        return 0;
    }
}

getHabitStrength(character, action) {
    try {
        if (!character || !action) return 0;

        const characterId = typeof character === 'string' ? character : character.id;
        const memories = this.getMemoriesByCharacter(characterId);
        
        if (!memories || memories.length === 0) return 0;

        // 筛选与特定行为相关的最近记忆
        const actionMemories = memories.filter(memory => 
            memory.event && memory.event.action === action
        ).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        if (actionMemories.length === 0) return 0;

        // 计算习惯强度（基于频率和最近性）
        const recentMemories = actionMemories.slice(0, 10); // 最近10次
        const frequency = Math.min(recentMemories.length / 10, 1);
        
        // 计算时间衰减
        const now = Date.now();
        const timeDecay = recentMemories.reduce((sum, memory) => {
            const timeDiff = now - (memory.timestamp || now);
            const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
            const decay = Math.exp(-daysDiff / 30); // 30天半衰期
            return sum + decay;
        }, 0) / Math.max(recentMemories.length, 1);

        return frequency * timeDecay;
    } catch (error) {
        console.warn('⚠️ 获取习惯强度失败:', error.message);
        return 0;
    }
}

getActionExperience(character, action) {
    try {
        if (!character || !action) return 0;

        const characterId = typeof character === 'string' ? character : character.id;
        const memories = this.getMemoriesByCharacter(characterId);
        
        if (!memories || memories.length === 0) return 0;

        // 筛选与特定行为相关的记忆
        const actionMemories = memories.filter(memory => 
            memory.event && memory.event.action === action
        );

        // 经验值基于记忆数量和重要性
        return actionMemories.reduce((sum, memory) => {
            return sum + (memory.importance || 1);
        }, 0);
    } catch (error) {
        console.warn('⚠️ 获取行为经验失败:', error.message);
        return 0;
    }
}


  // ==================== 记忆管理操作 ====================

  /**
   * 遗忘记忆
   * @param {string} characterId - 角色ID
   * @param {string} memoryId - 记忆ID
   * @param {number} decay_rate - 遗忘率
   * @returns {boolean} 是否成功
   */
  forgetMemory(characterId, memoryId, decay_rate = 0.1) {
    const memories = this.memories.get(characterId);
    if (!memories) return false;
    
    const memoryIndex = memories.findIndex(m => m.id === memoryId);
    if (memoryIndex === -1) return false;
    
    const memory = memories[memoryIndex];
    memory.importance *= (1 - decay_rate);
    
    // 如果重要性太低，删除记忆
    if (memory.importance < this.memoryConfig.importanceThreshold) {
      this._removeMemory(characterId, memoryIndex);
      return true;
    }
    
    return false;
  }

  /**
   * 强化记忆（通过回想或重复经历）
   * @param {string} characterId - 角色ID
   * @param {string} memoryId - 记忆ID
   * @param {number} reinforcement - 强化程度
   */
  reinforceMemory(characterId, memoryId, reinforcement = 0.1) {
    const memories = this.memories.get(characterId);
    if (!memories) return;
    
    const memory = memories.find(m => m.id === memoryId);
    if (memory) {
      memory.importance = Math.min(1.0, memory.importance + reinforcement);
      memory.lastAccessed = Date.now();
      memory.accessCount = (memory.accessCount || 0) + 1;
    }
  }

  /**
   * 自然衰减处理（定期调用）
   * @param {number} deltaTime - 时间增量（游戏时间）
   */
  processMemoryDecay(deltaTime = 1) {
    for (const [characterId, memories] of this.memories.entries()) {
      for (let i = memories.length - 1; i >= 0; i--) {
        const memory = memories[i];
        const decayRate = this._calculateDecayRate(memory);
        
        memory.importance *= Math.pow(1 - decayRate, deltaTime);
        
        // 删除过于微弱的记忆
        if (memory.importance < this.memoryConfig.importanceThreshold) {
          this._removeMemory(characterId, i);
        }
      }
    }
  }

  // ==================== 特殊记忆分析 ====================

  /**
   * 获取角色记忆概要
   * @param {string} characterId - 角色ID
   * @returns {Object} 记忆概要统计
   */
  getMemorySummary(characterId) {
    const memories = this.memories.get(characterId) || [];
    
    const summary = {
      totalMemories: memories.length,
      averageImportance: 0,
      memoryTypes: {},
      emotionalBalance: 0,
      recentMemories: [],
      traumaticMemories: [],
      positiveMemories: [],
      skillMemories: {},
      relationshipMemories: {}
    };
    
    let totalImportance = 0;
    let emotionalSum = 0;
    
    for (const memory of memories) {
      // 基础统计
      totalImportance += memory.importance;
      emotionalSum += memory.emotional_impact * memory.importance;
      
      // 类型统计
      const type = memory.event.type || 'unknown';
      summary.memoryTypes[type] = (summary.memoryTypes[type] || 0) + 1;
      
      // 情感记忆分类
      if (memory.emotional_impact < this.memoryConfig.traumaThreshold) {
        summary.traumaticMemories.push(memory);
      } else if (memory.emotional_impact > 0.5) {
        summary.positiveMemories.push(memory);
      }
      
      // 技能相关记忆
      if (memory.event.skill) {
        const skill = memory.event.skill;
        if (!summary.skillMemories[skill]) {
          summary.skillMemories[skill] = [];
        }
        summary.skillMemories[skill].push(memory);
      }
      
      // 关系记忆
      if (memory.event.relatedPerson) {
        const person = memory.event.relatedPerson;
        if (!summary.relationshipMemories[person]) {
          summary.relationshipMemories[person] = [];
        }
        summary.relationshipMemories[person].push(memory);
      }
    }
    
    // 计算平均值
    summary.averageImportance = memories.length > 0 ? totalImportance / memories.length : 0;
    summary.emotionalBalance = memories.length > 0 ? emotionalSum / memories.length : 0;
    
    // 最近记忆（按时间排序）
    summary.recentMemories = memories
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
    
    return summary;
  }

  /**
   * 分析角色成长轨迹
   * @param {string} characterId - 角色ID
   * @returns {Object} 成长轨迹分析
   */
  analyzeCharacterTrajectory(characterId) {
    const memories = this.memories.get(characterId) || [];
    if (memories.length === 0) return null;

    const trajectory = {
      overallGrowth: 0,
      skillProgression: {},
      emotionalJourney: [],
      traumaticEvents: [],
      triumphantMoments: [],
      personalityEvolution: []
    };

    const sortedMemories = memories.sort((a, b) => a.timestamp - b.timestamp);
    let cumulativeGrowth = 0;
    let lastAnalysisPoint = 0;

    for (let i = 0; i < sortedMemories.length; i++) {
      const memory = sortedMemories[i];
      
      // 情感历程
      if (Math.abs(memory.emotional_impact) > 0.3) {
        trajectory.emotionalJourney.push({
          timestamp: memory.timestamp,
          emotion: memory.emotional_impact > 0 ? 'positive' : 'challenging',
          impact: memory.importance,
          skillsAffected: memory.event.skill ? [memory.event.skill] : []
        });
      }
      
      // 跟踪技能进展
      if (memory.event.skill) {
        const skill = memory.event.skill;
        if (!trajectory.skillProgression[skill]) {
          trajectory.skillProgression[skill] = [];
        }
        
        trajectory.skillProgression[skill].push({
          timestamp: memory.timestamp,
          success: memory.event.success || 0.5,
          importance: memory.importance
        });
      }
      
      // 记录创伤事件
      if (memory.emotional_impact < -0.6) {
        trajectory.traumaticEvents.push({
          timestamp: memory.timestamp,
          event: memory.event.description || memory.event.action,
          severity: Math.abs(memory.emotional_impact),
          recovered: false // 可以后续分析是否从创伤中恢复
        });
      }
      
      // 记录得意时刻
      if (memory.emotional_impact > 0.7 && memory.importance > 0.6) {
        trajectory.triumphantMoments.push({
          timestamp: memory.timestamp,
          event: memory.event.description || memory.event.action,
          joy: memory.emotional_impact,
          significance: memory.importance
        });
      }
      
      // 每100个记忆分析一次个性变化
      if (i - lastAnalysisPoint >= 100 || i === sortedMemories.length - 1) {
        const periodMemories = sortedMemories.slice(lastAnalysisPoint, i + 1);
        const periodAnalysis = this._analyzePeriodPersonality(periodMemories);
        
        trajectory.personalityEvolution.push({
          period: `第${Math.floor(i / 100) + 1}阶段`,
          startTime: periodMemories[0].timestamp,
          endTime: periodMemories[periodMemories.length - 1].timestamp,
          traits: periodAnalysis,
          memoryCount: periodMemories.length
        });
        
        lastAnalysisPoint = i + 1;
      }
      
      // 累积成长值
      cumulativeGrowth += memory.importance * Math.max(0, memory.emotional_impact + 0.5);
    }
    
    trajectory.overallGrowth = cumulativeGrowth / Math.max(1, memories.length);
    
    return trajectory;
  }

  // ==================== 系统管理接口 ====================

  /**
   * 获取系统状态
   * @returns {Object} 系统状态信息
   */
  getSystemStatus() {
    return {
      isActive: true,
      version: '1.0.0',
      totalCharacters: this.memories.size,
      totalMemories: this.stats.totalMemories,
      memoryStats: { ...this.stats },
      memoryPoolStatus: {
        poolSize: this.poolSize,
        availableSlots: this.memoryPool.length,
        utilizationRate: ((this.poolSize - this.memoryPool.length) / this.poolSize * 100).toFixed(1) + '%'
      }
    };
  }

  /**
   * 重置角色记忆
   * @param {string} characterId - 角色ID
   */
  resetCharacterMemories(characterId) {
    if (this.memories.has(characterId)) {
      const memories = this.memories.get(characterId);
      // 将记忆返回到池中
      memories.forEach(memory => this._returnMemoryToPool(memory));
      this.memories.delete(characterId);
      console.log(`🧠 角色 ${characterId} 的记忆已重置`);
    }
  }

  /**
   * 导出角色记忆数据（用于保存游戏）
   */
  exportCharacterMemories(characterId) {
    const memories = this.memories.get(characterId) || [];
    return memories.map(memory => ({
      id: memory.id,
      event: memory.event,
      importance: memory.importance,
      emotional_impact: memory.emotional_impact,
      context: memory.context,
      timestamp: memory.timestamp,
      gameTime: memory.gameTime,
      tags: memory.tags,
      lastAccessed: memory.lastAccessed,
      accessCount: memory.accessCount,
      isGlobal: memory.isGlobal
    }));
  }

  /**
   * 导入角色记忆数据（用于加载游戏）
   */
  importCharacterMemories(characterId, memoryData) {
    if (!this.memories.has(characterId)) {
      this.memories.set(characterId, []);
    }
    
    const memories = this.memories.get(characterId);
    
    for (const data of memoryData) {
      const memory = this._createMemory(data);
      memories.push(memory);
      this._buildTriggers(memory);
    }
  }

  // ==================== 内部辅助方法 ====================

  /**
   * 创建记忆对象
   */
  _createMemory(config) {
    const memory = this._getMemoryFromPool();
    
    memory.id = config.id || this._generateMemoryId();
    memory.characterId = config.characterId;
    memory.event = config.event;
    memory.importance = config.importance;
    memory.emotional_impact = config.emotional_impact;
    memory.context = config.context;
    memory.timestamp = config.timestamp;
    memory.gameTime = config.gameTime;
    memory.tags = this._generateTags(config.event, config.context);
    memory.lastAccessed = Date.now();
    memory.accessCount = config.accessCount || 0;
    memory.isGlobal = config.isGlobal || false;
    
    return memory;
  }

  /**
   * 生成记忆标签
   */
  _generateTags(event, context) {
    const tags = [];
    
    if (event.action) tags.push(`action:${event.action}`);
    if (event.location) tags.push(`location:${event.location}`);
    if (event.skill) tags.push(`skill:${event.skill}`);
    if (event.relatedPerson) tags.push(`person:${event.relatedPerson}`);
    if (context.season) tags.push(`season:${context.season}`);
    if (event.isRisky) tags.push('risky');
    if (event.isWise) tags.push('wise');
    if (event.success > 0.8) tags.push('successful');
    if (event.success < 0.3) tags.push('failed');
    
    return tags;
  }

  /**
   * 构建触发器索引
   */
  _buildTriggers(memory) {
    const { location, action, skill, type } = memory.event;
    const { season } = memory.context;
    
    // 地点触发器
    if (location) {
      if (!this.triggers.location.has(location)) {
        this.triggers.location.set(location, []);
      }
      this.triggers.location.get(location).push(memory.id);
    }
    
    // 行为触发器
    if (action) {
      if (!this.triggers.action.has(action)) {
        this.triggers.action.set(action, []);
      }
      this.triggers.action.get(action).push(memory.id);
    }
    
    // 技能触发器
    if (skill) {
      if (!this.triggers.skill.has(skill)) {
        this.triggers.skill.set(skill, []);
      }
      this.triggers.skill.get(skill).push(memory.id);
    }
    
    // 季节触发器
    if (season) {
      if (!this.triggers.season.has(season)) {
        this.triggers.season.set(season, []);
      }
      this.triggers.season.get(season).push(memory.id);
    }
    
    // 事件类型触发器
    if (type) {
      if (!this.triggers.event.has(type)) {
        this.triggers.event.set(type, []);
      }
      this.triggers.event.get(type).push(memory.id);
    }
    
    // 人物触发器
    if (memory.event.relatedPerson) {
      const person = memory.event.relatedPerson;
      if (!this.triggers.person.has(person)) {
        this.triggers.person.set(person, []);
      }
      this.triggers.person.get(person).push(memory.id);
    }
  }

  /**
   * 基于触发器搜索记忆
   */
  _searchByTrigger(characterId, trigger) {
    const memories = this.memories.get(characterId) || [];
    const foundMemories = [];
    
    // 搜索各种触发器
    for (const [triggerType, triggerMap] of Object.entries(this.triggers)) {
      if (trigger[triggerType]) {
        const memoryIds = triggerMap.get(trigger[triggerType]) || [];
        for (const memoryId of memoryIds) {
          const memory = memories.find(m => m.id === memoryId);
          if (memory) foundMemories.push(memory);
        }
      }
    }
    
    return foundMemories;
  }

  /**
   * 基于上下文搜索记忆
   */
  _searchByContext(characterId, context) {
    const memories = this.memories.get(characterId) || [];
    const relevantMemories = [];
    
    for (const memory of memories) {
      let relevanceScore = 0;
      
      // 时间相关性
      if (context.season && memory.context.season === context.season) {
        relevanceScore += 0.3;
      }
      
      // 地点相关性
      if (context.location && memory.event.location === context.location) {
        relevanceScore += 0.4;
      }
      
      // 技能相关性
      if (context.skill && memory.event.skill === context.skill) {
        relevanceScore += 0.5;
      }
      
      // 情感状态相关性
      if (context.mood && Math.sign(context.mood) === Math.sign(memory.emotional_impact)) {
        relevanceScore += 0.2;
      }
      
      if (relevanceScore > 0.3) {
        memory.relevanceScore = relevanceScore;
        relevantMemories.push(memory);
      }
    }
    
    return relevantMemories;
  }

  /**
   * 去除重复记忆
   */
  _removeDuplicateMemories(memories) {
    const unique = new Map();
    for (const memory of memories) {
      if (!unique.has(memory.id)) {
        unique.set(memory.id, memory);
      }
    }
    return Array.from(unique.values());
  }

  /**
   * 按相关性排序记忆
   */
  _sortMemoriesByRelevance(memories, context) {
    return memories.sort((a, b) => {
      // 综合评分：重要性 + 相关性 + 时间衰减 + 访问频率
      const scoreA = a.importance * 0.4 + 
                    (a.relevanceScore || 0) * 0.3 + 
                    this._calculateTimeDecay(a) * 0.2 + 
                    Math.min(1, (a.accessCount || 0) / 10) * 0.1;
      
      const scoreB = b.importance * 0.4 + 
                    (b.relevanceScore || 0) * 0.3 + 
                    this._calculateTimeDecay(b) * 0.2 + 
                    Math.min(1, (b.accessCount || 0) / 10) * 0.1;
      
      return scoreB - scoreA;
    });
  }

  /**
   * 强化被回忆的记忆
   */
  _reinforceMemories(memories) {
    for (const memory of memories) {
      memory.lastAccessed = Date.now();
      memory.accessCount = (memory.accessCount || 0) + 1;
      memory.importance = Math.min(1.0, memory.importance + this.memoryConfig.rehearsalBonus);
    }
  }

  /**
   * 从情况中提取触发器
   */
  _extractTriggersFromSituation(situation) {
    const triggers = {};
    
    if (situation.location) triggers.location = situation.location;
    if (situation.action) triggers.action = situation.action;
    if (situation.skill) triggers.skill = situation.skill;
    if (situation.person) triggers.person = situation.person;
    if (situation.season) triggers.season = situation.season;
    if (situation.eventType) triggers.event = situation.eventType;
    
    return triggers;
  }

  /**
   * 计算记忆衰减率
   */
  _calculateDecayRate(memory) {
    let decayRate = this.memoryConfig.baseDecayRate;
    
    // 情感强度减少衰减
    decayRate *= (1 - Math.abs(memory.emotional_impact) * 0.5);
    
    // 访问频率减少衰减
    const accessBonus = Math.min(0.5, (memory.accessCount || 0) * 0.1);
    decayRate *= (1 - accessBonus);
    
    // 创伤记忆衰减更慢
    if (memory.emotional_impact < this.memoryConfig.traumaThreshold) {
      decayRate *= 0.3;
    }
    
    return Math.max(0.001, decayRate);
  }

  /**
   * 计算时间衰减
   */
  _calculateTimeDecay(memory) {
    const timeDiff = Date.now() - memory.timestamp;
    const daysPassed = timeDiff / (1000 * 60 * 60 * 24);
    
    // 使用指数衰减函数，但重要记忆衰减更慢
    const decayFactor = 0.1 + memory.importance * 0.4;
    return Math.exp(-daysPassed * decayFactor);
  }

  /**
   * 强制执行记忆容量限制
   */
  _enforceMemoryLimit(characterId) {
    const memories = this.memories.get(characterId);
    if (memories.length > this.memoryConfig.maxMemoriesPerCharacter) {
      // 按重要性排序，删除最不重要的记忆
      memories.sort((a, b) => a.importance - b.importance);
      
      const toRemove = memories.length - this.memoryConfig.maxMemoriesPerCharacter;
      for (let i = 0; i < toRemove; i++) {
        this._removeMemory(characterId, 0);
      }
    }
  }

  /**
   * 删除记忆
   */
  _removeMemory(characterId, index) {
    const memories = this.memories.get(characterId);
    if (memories && index < memories.length) {
      const memory = memories[index];
      memories.splice(index, 1);
      this._returnMemoryToPool(memory);
      this.stats.memoriesForgotten++;
    }
  }

  /**
   * 传播全局记忆
   */
  _propagateGlobalMemory(globalMemory) {
    // 将全局记忆以较低重要性添加到所有角色
    for (const [characterId, memories] of this.memories.entries()) {
      if (characterId !== 'global') {
        const personalMemory = this._createMemory({
          ...globalMemory,
          characterId,
          importance: globalMemory.importance * 0.6, // 个人接收的全局记忆重要性降低
          isGlobal: false,
          globalSource: true
        });
        
        memories.push(personalMemory);
      }
    }
  }

  /**
   * 更新统计数据
   */
  _updateStats(memory) {
    this.stats.totalMemories++;
    this.stats.memoriesCreated++;
    
    if (Math.abs(memory.emotional_impact) > 0.3) {
      this.stats.emotionalMemoriesCount++;
    }
    
    // 更新平均重要性
    this.stats.averageImportance = 
      (this.stats.averageImportance * (this.stats.totalMemories - 1) + memory.importance) / 
      this.stats.totalMemories;
  }

  /**
   * 内存池管理
   */
  _initializeMemoryPool() {
    for (let i = 0; i < this.poolSize; i++) {
      this.memoryPool.push({});
    }
  }

  _getMemoryFromPool() {
    if (this.memoryPool.length > 0) {
      return this.memoryPool.pop();
    }
    return {}; // 如果池子空了就创建新对象
  }

  _returnMemoryToPool(memory) {
    if (this.memoryPool.length < this.poolSize) {
      // 清理对象属性
      for (const key in memory) {
        delete memory[key];
      }
      this.memoryPool.push(memory);
    }
  }

  /**
   * 生成记忆ID
   */
  _generateMemoryId() {
    return 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 分析特定时期的个性特征
   */
  _analyzePeriodPersonality(memories) {
    const traits = {
      optimism: 0,
      resilience: 0,
      sociability: 0,
      diligence: 0,
      courage: 0,
      wisdom: 0
    };
    
    let totalWeight = 0;
    
    for (const memory of memories) {
      const weight = memory.importance;
      totalWeight += weight;
      
      // 乐观程度
      if (memory.emotional_impact > 0) {
        traits.optimism += weight * memory.emotional_impact;
      }
      
      // 韧性（从失败中恢复）
      if (memory.emotional_impact < 0 && memory.event.success > 0.3) {
        traits.resilience += weight;
      }
      
      // 社交能力
      if (memory.tags.includes('social') && memory.emotional_impact > 0) {
        traits.sociability += weight;
      }
      
      // 勤奋程度
      if (memory.event.type === 'work' || memory.event.type === 'learning') {
        traits.diligence += weight;
      }
      
      // 勇气
      if (memory.tags.includes('heroic') || (memory.event.isRisky && memory.event.success > 0.5)) {
        traits.courage += weight;
      }
      
      // 智慧
      if (memory.event.isWise || memory.event.skill === 'strategy') {
        traits.wisdom += weight;
      }
    }
    
    // 标准化特征值
    if (totalWeight > 0) {
      for (const trait in traits) {
        traits[trait] = Math.min(1, traits[trait] / totalWeight);
      }
    }
    
    return traits;
  }

  // ==================== 高级功能方法 ====================

  /**
   * 分析角色关系网络
   * @param {string} characterId - 角色ID
   * @returns {Object} 关系网络分析
   */
  analyzeRelationshipNetwork(characterId) {
    const memories = this.memories.get(characterId) || [];
    const relationships = {};
    
    for (const memory of memories) {
      if (memory.event.relatedPerson) {
        const person = memory.event.relatedPerson;
        if (!relationships[person]) {
          relationships[person] = {
            totalInteractions: 0,
            positiveInteractions: 0,
            negativeInteractions: 0,
            averageEmotion: 0,
            firstMet: memory.timestamp,
            lastInteraction: memory.timestamp,
            sharedExperiences: []
          };
        }
        
        const rel = relationships[person];
        rel.totalInteractions++;
        rel.lastInteraction = Math.max(rel.lastInteraction, memory.timestamp);
        rel.firstMet = Math.min(rel.firstMet, memory.timestamp);
        
        if (memory.emotional_impact > 0.2) {
          rel.positiveInteractions++;
        } else if (memory.emotional_impact < -0.2) {
          rel.negativeInteractions++;
        }
        
        rel.averageEmotion = (rel.averageEmotion * (rel.totalInteractions - 1) + memory.emotional_impact) / rel.totalInteractions;
        rel.sharedExperiences.push({
          event: memory.event.action || memory.event.description,
          emotion: memory.emotional_impact,
          importance: memory.importance
        });
      }
    }
    
    return relationships;
  }

  /**
   * 获取角色最具代表性的记忆
   * @param {string} characterId - 角色ID
   * @param {number} count - 返回数量
   * @returns {Array} 代表性记忆列表
   */
  getSignatureMemories(characterId, count = 5) {
    const memories = this.memories.get(characterId) || [];
    
    // 按综合得分排序（重要性 + 情感强度 + 访问频率）
    const scoredMemories = memories.map(memory => ({
      ...memory,
      signatureScore: memory.importance * 0.5 + 
                     Math.abs(memory.emotional_impact) * 0.3 + 
                     Math.min(1, (memory.accessCount || 0) / 10) * 0.2
    }));
    
    return scoredMemories
      .sort((a, b) => b.signatureScore - a.signatureScore)
      .slice(0, count);
  }

  /**
   * 获取技能学习历史
   * @param {string} characterId - 角色ID
   * @param {string} skillName - 技能名称
   * @returns {Object} 技能学习分析
   */
  getSkillLearningHistory(characterId, skillName) {
    const memories = this.memories.get(characterId) || [];
    const skillMemories = memories.filter(m => m.event.skill === skillName);
    
    if (skillMemories.length === 0) {
      return {
        hasExperience: false,
        totalPractice: 0,
        successRate: 0,
        learningTrend: 'none'
      };
    }
    
    // 按时间排序
    skillMemories.sort((a, b) => a.timestamp - b.timestamp);
    
    let totalSuccesses = 0;
    let totalAttempts = skillMemories.length;
    let recentSuccesses = 0;
    let recentAttempts = 0;
    
    const now = Date.now();
    const recentThreshold = now - (30 * 24 * 60 * 60 * 1000); // 最近30天
    
    for (const memory of skillMemories) {
      const success = memory.event.success || 0.5;
      totalSuccesses += success;
      
      if (memory.timestamp > recentThreshold) {
        recentSuccesses += success;
        recentAttempts++;
      }
    }
    
    const overallSuccessRate = totalSuccesses / totalAttempts;
    const recentSuccessRate = recentAttempts > 0 ? recentSuccesses / recentAttempts : overallSuccessRate;
    
    let learningTrend = 'stable';
    if (recentSuccessRate > overallSuccessRate + 0.1) {
      learningTrend = 'improving';
    } else if (recentSuccessRate < overallSuccessRate - 0.1) {
      learningTrend = 'declining';
    }
    
    return {
      hasExperience: true,
      totalPractice: totalAttempts,
      successRate: overallSuccessRate,
      recentSuccessRate: recentSuccessRate,
      learningTrend: learningTrend,
      firstAttempt: skillMemories[0].timestamp,
      lastAttempt: skillMemories[skillMemories.length - 1].timestamp,
      milestones: skillMemories.filter(m => m.event.success > 0.8 && m.importance > 0.6)
    };
  }

  /**
   * 预测行为倾向
   * @param {string} characterId - 角色ID
   * @param {Object} context - 当前情境
   * @returns {Object} 行为倾向预测
   */
  predictBehaviorTendency(characterId, context) {
    const relevantMemories = this.getRelevantMemories(characterId, context);
    
    if (relevantMemories.length === 0) {
      return {
        confidence: 0,
        suggestions: [],
        riskAssessment: 'unknown'
      };
    }
    
    const behaviorCounts = {};
    const successRates = {};
    let totalEmotionalImpact = 0;
    
    for (const memory of relevantMemories) {
      const action = memory.event.action;
      if (action) {
        behaviorCounts[action] = (behaviorCounts[action] || 0) + memory.importance;
        
        if (!successRates[action]) {
          successRates[action] = { total: 0, success: 0 };
        }
        successRates[action].total += memory.importance;
        successRates[action].success += (memory.event.success || 0.5) * memory.importance;
      }
      
      totalEmotionalImpact += memory.emotional_impact * memory.importance;
    }
    
    // 生成建议
    const suggestions = Object.entries(behaviorCounts)
      .map(([action, weight]) => ({
        action,
        preference: weight / relevantMemories.length,
        successRate: successRates[action] ? successRates[action].success / successRates[action].total : 0.5
      }))
      .sort((a, b) => (b.preference * b.successRate) - (a.preference * a.successRate))
      .slice(0, 3);
    
    // 风险评估
    const avgEmotionalImpact = totalEmotionalImpact / relevantMemories.length;
    let riskAssessment = 'moderate';
    if (avgEmotionalImpact < -0.3) {
      riskAssessment = 'cautious';
    } else if (avgEmotionalImpact > 0.3) {
      riskAssessment = 'optimistic';
    }
    
    return {
      confidence: Math.min(1, relevantMemories.length / 10),
      suggestions,
      riskAssessment,
      emotionalBias: avgEmotionalImpact
    };
  }

  /**
   * 批量处理记忆衰减（游戏循环中调用）
   */
  processBatchMemoryDecay(gameTimeDelta) {
    // 每游戏日处理一次记忆衰减
    if (gameTimeDelta >= 1) {
      this.processMemoryDecay(gameTimeDelta);
    }
  }

  /**
   * 获取记忆详情（用于调试）
   */
  getMemoryDetails(characterId, memoryId) {
    const memories = this.memories.get(characterId) || [];
    return memories.find(m => m.id === memoryId);
  }

  /**
   * 获取全局记忆
   */
  getGlobalMemories() {
    return [...this.globalMemories];
  }

  /**
   * 添加全局记忆
   */
  addGlobalMemory(event, importance, emotionalImpact, context) {
    const globalMemory = this._createMemory({
      characterId: 'global',
      event,
      importance,
      emotional_impact: emotionalImpact,
      context,
      timestamp: Date.now(),
      gameTime: context.gameTime || 0,
      isGlobal: true
    });
    
    this.globalMemories.push(globalMemory);
    this._propagateGlobalMemory(globalMemory);
    
    console.log(`🌍 添加了全局记忆: ${event.description || event.action}`);
    return globalMemory.id;
  }
}

// ==================== 导出 ====================
export default MemorySystem;
    