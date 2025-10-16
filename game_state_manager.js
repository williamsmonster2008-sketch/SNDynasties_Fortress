/**
 * game_state_manager.js - 南北朝坞堡模拟器统一状态管理系统
 * 
 * 功能：集成现有模块状态，提供统一访问接口，实现自动更新通知
 * 特色：监听现有模块变化，批量状态更新，性能优化的状态同步
 * 
 * 核心理念：
 * - 不破坏现有模块，只添加状态监听和通知
 * - 提供统一的状态访问入口
 * - 自动同步各模块状态变化
 * - 支持状态历史和回滚
 */

import { Utils } from './utils_module.js';
import { DEFAULT_CONFIG } from './gameConfig.js';

/**
 * 状态变更事件类
 */
export class StateChangeEvent {
  constructor(key, newValue, oldValue, source, timestamp = Date.now()) {
    this.id = Utils.String.generateId();
    this.key = key;
    this.newValue = newValue;
    this.oldValue = oldValue;
    this.source = source;
    this.timestamp = timestamp;
    this.processed = false;
  }
}

/**
 * 状态快照类
 */
export class StateSnapshot {
  constructor(state, metadata = {}) {
    this.id = Utils.String.generateId();
    this.timestamp = Date.now();
    this.gameTime = metadata.gameTime || 0;
    this.state = Utils.Object.deepClone(state);
    this.metadata = metadata;
    // 安全的JSON序列化，避免循环引用
    try {
      this.size = JSON.stringify(this.state, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          // 跳过可能导致循环引用的属性
          if (key === '_eventBus' || key === 'eventHistory' || key === 'gameEngine' || key === 'container') {
            return '[Circular Reference]';
          }
        }
        return value;
      }).length;
    } catch (error) {
      console.warn('状态序列化失败，使用估算大小:', error);
      this.size = 1000; // 估算大小
    }
  }
  
  /**
   * 获取状态大小（字节）
   */
  getSize() {
    return this.size;
  }
  
  /**
   * 比较与另一个快照的差异
   */
  diff(otherSnapshot) {
    return Utils.Object.deepDiff(this.state, otherSnapshot.state);
  }
}

/**
 * 游戏状态管理器主类
 */
export class GameStateManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.eventBus = gameEngine.eventBus;
    
    // 状态存储
    this.state = {
      // 游戏基础状态
      game: {
        isInitialized: false,
        isRunning: false,
        isPaused: false,
        currentPhase: 'initialization',
        gameTime: 0,
        currentSeason: '春季',
        weatherType: '晴朗'
      },
      
      // 人口统计
      population: {
        total: 0,
        alive: 0,
        male: 0,
        female: 0,
        children: 0,
        adults: 0,
        elders: 0
      },
      
      // 家族信息
      families: {
        total: 0,
        familyList: [],
        averageSize: 0,
        prosperityLevels: {}
      },
      
      // 资源状态
      resources: {
        total: {},
        production: {},
        consumption: {},
        shortage: [],
        abundance: []
      },
      
      // 技能统计
      skills: {
        totalSkills: 0,
        averageLevel: 0,
        masterCrafters: 0,
        skillDistribution: {}
      },
      
      // 德行统计
      virtues: {
        totalVirtueSystems: 0,
        averageVirtueLevel: 0,
        dominantVirtues: [],
        characterVirtueRankings: []
      },
      
      // 关系网络
      relationships: {
        totalRelationships: 0,
        familyBonds: 0,
        friendships: 0,
        conflicts: 0,
        networkDensity: 0
      },
      
      // 地点状态
      locations: {
        activeLocations: [],
        occupancyRates: {},
        comfortLevels: {},
        functionalityScores: {}
      },
      
      // 行为统计
      behaviors: {
        currentActions: {},
        completedToday: 0,
        failedToday: 0,
        popularActions: []
      }
    };
    
    // 状态订阅者
    this.subscribers = new Map();
    this.wildcardSubscribers = []; // 监听所有状态变化
    
    // 状态历史管理
    this.stateHistory = [];
    this.maxHistorySize = 100;
    this.snapshotInterval = 5 * 60 * 1000; // 5分钟一次快照
    this.lastSnapshotTime = Date.now();
    
    // 变更队列（批量处理）
    this.changeQueue = [];
    this.batchProcessingDelay = 50; // 50ms批量处理延迟
    this.batchTimer = null;
    
    // 性能监控
    this.performanceMetrics = {
      stateUpdates: 0,
      batchProcessed: 0,
      subscriptionCalls: 0,
      averageProcessingTime: 0,
      lastUpdateTime: Date.now()
    };
    
    // 同步状态标记
    this.syncFlags = new Set();
    this.isSyncing = false;
    
    this.setupModuleIntegration();
    this.startPeriodicSync();  
    
    console.log('🗃️ 游戏状态管理器已初始化');
  }

  /**
   * 设置与现有模块的集成
   */
  setupModuleIntegration() {
    // 监听事件总线的相关事件
    if (this.eventBus) {
      // 角色相关事件
      this.eventBus.on('characterCreated', (event) => {
        this.handleCharacterChange('created', event.data);
      });
      
      this.eventBus.on('characterStateChanged', (event) => {
        this.handleCharacterChange('updated', event.data);
      });
      
      this.eventBus.on('characterDied', (event) => {
        this.handleCharacterChange('died', event.data);
      });
      
      // 家族相关事件
      this.eventBus.on('familyCreated', (event) => {
        this.handleFamilyChange('created', event.data);
      });
      
      // 资源相关事件
      this.eventBus.on('resourceChanged', (event) => {
        this.handleResourceChange(event.data);
      });
      
     // 时间相关事件 - 暂时禁用，避免频繁同步
     // this.eventBus.on('timeAdvanced', (event) => {
     //   this.handleTimeChange(event.data);
     // });

    
      // 行为相关事件
      this.eventBus.on('actionCompleted', (event) => {
        this.handleBehaviorChange('completed', event.data);
      });
      
      this.eventBus.on('actionFailed', (event) => {
        this.handleBehaviorChange('failed', event.data);
      });
    }
    
    console.log('📡 模块集成监听器已设置');
  }

  /**
   * 启动定期同步
   */
  startPeriodicSync() {
    // 暂时禁用定期同步，避免死循环
    // this.syncInterval = setInterval(() => {
    //   this.syncWithModules();
    // }, 1000);
    console.log('⏸️ 定期同步已暂停');
    
    // 每5分钟创建一次状态快照
    this.snapshotInterval = setInterval(() => {
      this.createStateSnapshot();
    }, 5 * 60 * 1000);
    
    console.log('⏰ 定期同步已启动');
  }

  /**
   * 与现有模块同步状态
   */
  syncWithModules() {
    if (this.isSyncing) return;
    if (Date.now() - (this.lastSyncTime || 0) < 5000) return; // 5秒内不重复同步
    this.lastSyncTime = Date.now(); 
   
    this.isSyncing = true;
    
    try {
      // 同步角色状态
      this.syncCharacterStates();
      
      // 同步资源状态
      this.syncResourceStates();
      
      // 同步家族状态
      this.syncFamilyStates();
      
      // 同步地点状态
      this.syncLocationStates();
      
      // 同步技能状态
      this.syncSkillStates();
      
      // 同步德行状态
      this.syncVirtueStates();
      
      // 同步关系状态
      this.syncRelationshipStates();            

    } catch (error) {
      console.error('状态同步错误:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 同步角色状态
   */
  async syncCharacterStates() {
    if (!this.gameEngine.characters) return;

    // 获取年龄配置
    let ageRanges;
    try {
      const balanceConfig = await this.gameEngine.dataManager.getBalanceConfig();
      ageRanges = balanceConfig?.character_generation?.age_ranges;
    } catch (error) {
      console.warn('无法获取年龄配置，使用默认值:', error);
      ageRanges = {
        child: { min: 5, max: 12 },
        youth: { min: 13, max: 24 }, 
        adult: { min: 25, max: 49 },
        elder: { min: 50, max: 95 }
      };
    }
    
    const allCharacters = Array.from(this.gameEngine.characters.values());
    const livingCharacters = allCharacters.filter(c => c.vitalStatus === 'living');
    const deceasedCharacters = allCharacters.filter(c => c.vitalStatus === 'deceased');

    // 基于配置的年龄分组
    const children = livingCharacters.filter(c => 
      c.age >= ageRanges.child.min && c.age <= ageRanges.child.max
    ).length;
    
    const youth = livingCharacters.filter(c => 
      c.age >= ageRanges.youth.min && c.age <= ageRanges.youth.max
    ).length;
    
    const adults = livingCharacters.filter(c => 
      c.age >= ageRanges.adult.min && c.age <= (ageRanges.middle_aged?.max || ageRanges.adult.max)
    ).length;
    
    const elders = livingCharacters.filter(c => 
      c.age >= ageRanges.elder.min
    ).length;

    console.log('状态同步调试:', {
      totalInEngine: this.gameEngine.characters.size,
      livingCount: livingCharacters.length,
      deceasedCount: deceasedCharacters.length,
      allCharactersCount: allCharacters.length
    });
    
    const newPopulation = {
      // UI显示的"总人口"应该是存活人口
      total: livingCharacters.length, 
      alive: livingCharacters.length,
      deceased: deceasedCharacters.length,

      // 基于存活角色的统计
      male: livingCharacters.filter(c => c.gender === '男').length,
      female: livingCharacters.filter(c => c.gender === '女').length,
      children: children,
      youth: youth,
      adults: adults, 
      elders: elders,
      // 额外信息
      totalCreated: allCharacters.length
    };
    

    console.log('更新人口状态:', newPopulation);
    this.updateState('population', newPopulation, 'character_sync');
  }

  /**
   * 同步资源状态
   */
  syncResourceStates() {
    if (!this.gameEngine.systems?.resource) return;
    
    const resourceSystem = this.gameEngine.systems.resource;
    const newResources = {
      total: {},
      shortage: [],
      abundance: []
    };
    
    // 获取资源数据
    if (resourceSystem.resources) {
      resourceSystem.resources.forEach((data, type) => {
        newResources.total[type] = {
          amount: data.amount,
          quality: data.quality || 0,
          reservedAmount: data.reservedAmount || 0
        };
        
        // 检查短缺和充足情况
        const threshold = DEFAULT_CONFIG.RESOURCE_TYPES?.[type]?.critical_threshold || 20;
        if (data.amount < threshold) {
          newResources.shortage.push(type);
        } else if (data.amount > threshold * 3) {
          newResources.abundance.push(type);
        }
      });
    }
    
    this.updateState('resources', newResources, 'resource_sync');
  }

  /**
   * 同步家族状态
   */
  syncFamilyStates() {
    if (!this.gameEngine.familySystem) return;
    
    try {
      // 从FamilySystem获取家族数据
      const familyNames = Array.from(this.gameEngine.familySystem.bloodRelations.keys());
      const allCharacters = Array.from(this.gameEngine.characters.values());
      
      const familyData = familyNames.map(familyName => {
        const members = allCharacters.filter(c => c.familyName === familyName);
        const livingMembers = members.filter(c => c.vitalStatus === 'living');
        
        return {
          name: familyName,
          totalMembers: members.length,
          livingMembers: livingMembers.length,
          relations: this.gameEngine.familySystem.bloodRelations.get(familyName)?.size || 0
        };
      });
      
      const newFamilies = {
        total: familyData.length,
        familyList: familyData,
        averageSize: familyData.length > 0 ? 
          familyData.reduce((sum, f) => sum + f.livingMembers, 0) / familyData.length : 0,
        totalMembers: familyData.reduce((sum, f) => sum + f.livingMembers, 0)
      };
      
      this.updateState('families', newFamilies, 'family_sync');
      
    } catch (error) {
      console.error('家族状态同步失败:', error);
    }
  }

  /**
   * 同步地点状态
   */
  syncLocationStates() {
    if (!this.gameEngine.systems?.location) return;
    
    const locationSystem = this.gameEngine.systems.location;
    const newLocations = {
      activeLocations: [],
      occupancyRates: {},
      comfortLevels: {},
      functionalityScores: {}
    };
    
    if (locationSystem.locations) {
      locationSystem.locations.forEach((location, name) => {
        newLocations.activeLocations.push(name);
        
        const occupants = location.currentOccupants?.size || 0;
        const capacity = location.capacity || 1;
        newLocations.occupancyRates[name] = capacity > 0 ? occupants / capacity : 0;
        
        newLocations.comfortLevels[name] = location.comfort || 50;
        newLocations.functionalityScores[name] = location.functionality || 50;
      });
    }
    
    this.updateState('locations', newLocations, 'location_sync');
  }

  /**
   * 同步技能状态
   */
  syncSkillStates() {
    if (!this.gameEngine.characters) return;
    
    const characters = Array.from(this.gameEngine.characters.values());
    let totalSkills = 0;
    let totalLevels = 0;
    let masterCrafters = 0;
    const skillDistribution = {};
    
    characters.forEach(character => {
      if (character.skillSystem?.skills) {
        character.skillSystem.skills.forEach((skill, skillName) => {
          totalSkills++;
          totalLevels += skill.level;
          
          if (skill.level >= 80) {
            masterCrafters++;
          }
          
          const category = skill.category || 'unknown';
          skillDistribution[category] = (skillDistribution[category] || 0) + 1;
        });
      }
    });
    
    const newSkills = {
      totalSkills: totalSkills,
      averageLevel: totalSkills > 0 ? totalLevels / totalSkills : 0,
      masterCrafters: masterCrafters,
      skillDistribution: skillDistribution
    };
    
    this.updateState('skills', newSkills, 'skill_sync');
  }

  /**
   * 同步德行状态
   */
  syncVirtueStates() {
    if (!this.gameEngine.characters) return;
    
    const characters = Array.from(this.gameEngine.characters.values());
    let totalVirtueSystems = 0;
    let totalVirtueLevel = 0;
    const virtueStats = {};
    
    characters.forEach(character => {
      if (character.virtueSystem) {
        totalVirtueSystems++;
        const virtueLevel = character.virtueSystem.getOverallVirtueLevel?.() || 50;
        totalVirtueLevel += virtueLevel;
        
        // 统计各德行分布
        const virtues = character.virtueSystem.getVirtueProfile?.() || {};
        Object.entries(virtues).forEach(([virtue, level]) => {
          if (!virtueStats[virtue]) {
            virtueStats[virtue] = { total: 0, count: 0 };
          }
          virtueStats[virtue].total += level;
          virtueStats[virtue].count++;
        });
      }
    });
    
    const dominantVirtues = Object.entries(virtueStats)
      .map(([virtue, stats]) => ({
        virtue,
        average: stats.count > 0 ? stats.total / stats.count : 0
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 5)
      .map(item => item.virtue);
    
    const newVirtues = {
      totalVirtueSystems: totalVirtueSystems,
      averageVirtueLevel: totalVirtueSystems > 0 ? totalVirtueLevel / totalVirtueSystems : 0,
      dominantVirtues: dominantVirtues,
      characterVirtueRankings: [] // 可以后续扩展
    };
    
    this.updateState('virtues', newVirtues, 'virtue_sync');
  }

  /**
   * 同步关系状态
   */
  syncRelationshipStates() {
    if (!this.gameEngine.relationshipService) return;
    
    try {
      const allCharacters = Array.from(this.gameEngine.characters.values());
      const livingCharacters = allCharacters.filter(c => c.vitalStatus === 'living');
      
      let totalRelationships = 0;
      let familyBonds = 0;
      let friendships = 0;
      let conflicts = 0;
      
      // 统计两两之间的关系
      for (let i = 0; i < livingCharacters.length; i++) {
        for (let j = i + 1; j < livingCharacters.length; j++) {
          const char1 = livingCharacters[i];
          const char2 = livingCharacters[j];
          
          try {
            const relationship = this.gameEngine.relationshipService.getCompleteRelationship(
              char1.characterId || char1.id,
              char2.characterId || char2.id
            );
            
            if (relationship && relationship.primaryCategory !== 'unknown') {
              totalRelationships++;
              
              if (relationship.bloodRelation) {
                familyBonds++;
              } else if (relationship.emotionalRelation?.affection > 60) {
                friendships++;
              } else if (relationship.emotionalRelation?.affection < 30) {
                conflicts++;
              }
            }
          } catch (error) {
            // 跳过查询失败的关系
          }
        }
      }
      
      const maxPossibleRelationships = livingCharacters.length * (livingCharacters.length - 1) / 2;
      const networkDensity = maxPossibleRelationships > 0 ? totalRelationships / maxPossibleRelationships : 0;
      
      const newRelationships = {
        totalRelationships: totalRelationships,
        familyBonds: familyBonds,
        friendships: friendships,
        conflicts: conflicts,
        networkDensity: Math.round(networkDensity * 100) / 100, // 保留两位小数
        totalCharacters: livingCharacters.length
      };
      
      this.updateState('relationships', newRelationships, 'relationship_sync');
      
    } catch (error) {
      console.error('关系状态同步失败:', error);
    }
  }

  /**
   * 处理角色变化事件
   */
  handleCharacterChange(changeType, data) {
    this.scheduleStateUpdate('population', () => {
      this.syncCharacterStates();
    });
    
    // 如果角色死亡，同时更新相关统计
    if (changeType === 'died') {
      this.scheduleStateUpdate('relationships', () => {
        this.syncRelationshipStates();
      });
    }
  }

  /**
   * 处理家族变化事件
   */
  handleFamilyChange(changeType, data) {
    this.scheduleStateUpdate('families', () => {
      this.syncFamilyStates();
    });
  }

  /**
   * 处理资源变化事件
   */
  handleResourceChange(data) {
    this.scheduleStateUpdate('resources', () => {
      this.syncResourceStates();
    });
  }

  /**
   * 处理时间变化事件
   */
  handleTimeChange(data) {
    // 只在关键时间节点才同步（如新的一天）
    if (data.isNewDay || data.isSeasonChange) {
      this.syncWithModules();
    }
    const newGameState = {
      ...this.state.game,
      gameTime: data.currentTime || this.state.game.gameTime,
      currentSeason: data.season || this.state.game.currentSeason,
      weatherType: data.weather?.type || this.state.game.weatherType
    };
    
    this.updateState('game', newGameState, 'time_sync');
  }

  /**
   * 处理行为变化事件
   */
  handleBehaviorChange(changeType, data) {
    const currentBehaviors = { ...this.state.behaviors };
    
    if (changeType === 'completed') {
      currentBehaviors.completedToday = (currentBehaviors.completedToday || 0) + 1;
    } else if (changeType === 'failed') {
      currentBehaviors.failedToday = (currentBehaviors.failedToday || 0) + 1;
    }
    
    this.updateState('behaviors', currentBehaviors, 'behavior_sync');
  }

  /**
   * 安排状态更新（去重复）
   */
  scheduleStateUpdate(key, updateFn) {
    if (this.syncFlags.has(key)) return;
    
    this.syncFlags.add(key);
    
    // 短暂延迟后执行，避免重复更新
    setTimeout(() => {
      updateFn();
      this.syncFlags.delete(key);
    }, 100);
  }

  /**
   * 更新状态
   * @param {string} key - 状态键
   * @param {*} value - 新值
   * @param {string} source - 更新源
   */
  updateState(key, value, source = 'unknown') {
    const oldValue = this.state[key];
    
    // 检查是否真的有变化
    if (Utils.Object.deepEqual(oldValue, value)) {
      return;
    }
    
    // 更新状态
    this.state[key] = value;
    
    // 创建变更事件
    const changeEvent = new StateChangeEvent(key, value, oldValue, source);
    
    // 添加到批处理队列
    this.addToBatchQueue(changeEvent);
    
    // 更新性能指标
    this.performanceMetrics.stateUpdates++;
    this.performanceMetrics.lastUpdateTime = Date.now();
  }

  /**
   * 批量更新状态
   * @param {Object} updates - 状态更新对象
   * @param {string} source - 更新源
   */
  batchUpdateState(updates, source = 'batch') {
    const changes = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      const oldValue = this.state[key];
      if (!Utils.Object.deepEqual(oldValue, value)) {
        this.state[key] = value;
        changes.push(new StateChangeEvent(key, value, oldValue, source));
      }
    });
    
    if (changes.length > 0) {
      this.processBatchChanges(changes);
    }
  }

  /**
   * 批量更新（batchUpdateState的别名方法）
   */
  batchUpdate(updates, source = 'batch') {
    return this.batchUpdateState(updates, source);
  }

  /**
   * 添加到批处理队列
   */
  addToBatchQueue(changeEvent) {
    this.changeQueue.push(changeEvent);
    
    // 清除旧的定时器
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    // 设置新的批处理定时器
    this.batchTimer = setTimeout(() => {
      this.processBatchQueue();
    }, this.batchProcessingDelay);
  }

  /**
   * 处理批处理队列
   */
  processBatchQueue() {
    if (this.changeQueue.length === 0) return;
    
    const changes = this.changeQueue.splice(0);
    this.processBatchChanges(changes);
    this.performanceMetrics.batchProcessed++;
  }

  /**
   * 处理批量变更
   */
  processBatchChanges(changes) {
    const startTime = Date.now();
    
    // 通知订阅者
    changes.forEach(change => {
      this.notifySubscribers(change);
    });
    
    // 通知通配符订阅者
    this.notifyWildcardSubscribers(changes);
    
    // 发送事件总线通知
    if (this.eventBus) {
      this.eventBus.emit('stateChanged', {
        changes: changes,
        timestamp: Date.now()
      }, {
        priority: 2, // NORMAL priority
        source: 'state_manager'
      });
    }
    
    // 更新性能指标
    const processingTime = Date.now() - startTime;
    this.performanceMetrics.averageProcessingTime = 
      (this.performanceMetrics.averageProcessingTime + processingTime) / 2;
  }

  /**
   * 订阅状态变化
   * @param {string} key - 状态键（可以使用通配符 *）
   * @param {Function} callback - 回调函数
   * @returns {string} 订阅ID
   */
  subscribe(key, callback) {
    const subscriptionId = Utils.String.generateId();
    
    if (key === '*') {
      // 通配符订阅
      this.wildcardSubscribers.push({
        id: subscriptionId,
        callback: callback
      });
    } else {
      // 特定键订阅
      if (!this.subscribers.has(key)) {
        this.subscribers.set(key, []);
      }
      
      this.subscribers.get(key).push({
        id: subscriptionId,
        callback: callback
      });
    }
    
    console.log(`📝 状态订阅已添加: ${key} (${subscriptionId})`);
    return subscriptionId;
  }

  /**
   * 取消订阅
   * @param {string} subscriptionId - 订阅ID
   * @returns {boolean} 是否成功取消
   */
  unsubscribe(subscriptionId) {
    // 检查通配符订阅
    const wildcardIndex = this.wildcardSubscribers.findIndex(s => s.id === subscriptionId);
    if (wildcardIndex !== -1) {
      this.wildcardSubscribers.splice(wildcardIndex, 1);
      return true;
    }
    
    // 检查特定键订阅
    for (const [key, subscribers] of this.subscribers.entries()) {
      const index = subscribers.findIndex(s => s.id === subscriptionId);
      if (index !== -1) {
        subscribers.splice(index, 1);
        if (subscribers.length === 0) {
          this.subscribers.delete(key);
        }
        return true;
      }
    }
    
    return false;
  }

  /**
   * 通知订阅者
   */
  notifySubscribers(changeEvent) {
    const subscribers = this.subscribers.get(changeEvent.key) || [];
    
    subscribers.forEach(subscriber => {
      try {
        subscriber.callback(changeEvent.newValue, changeEvent.oldValue, changeEvent);
        this.performanceMetrics.subscriptionCalls++;
      } catch (error) {
        console.error('订阅者回调错误:', error);
      }
    });
  }

  /**
   * 通知通配符订阅者
   */
  notifyWildcardSubscribers(changes) {
    this.wildcardSubscribers.forEach(subscriber => {
      try {
        subscriber.callback(changes);
        this.performanceMetrics.subscriptionCalls++;
      } catch (error) {
        console.error('通配符订阅者回调错误:', error);
      }
    });
  }

  /**
   * 获取状态
   * @param {string} key - 状态键，不提供则返回全部状态
   * @returns {*} 状态值
   */
  getState(key = null) {
    if (key === null) {
      return Utils.Object.deepClone(this.state);
    }
    
    const value = this.state[key];
    return value ? Utils.Object.deepClone(value) : undefined;
  }

  /**
   * 创建状态快照
   */
  createStateSnapshot(metadata = {}) {
    const snapshot = new StateSnapshot(this.state, {
      gameTime: this.state.game.gameTime,
      ...metadata
    });
    
    this.stateHistory.push(snapshot);
    
    // 限制历史大小
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
    
    console.log(`📸 状态快照已创建: ${snapshot.id} (${Math.round(snapshot.getSize() / 1024)}KB)`);
    return snapshot;
  }

  /**
   * 恢复到指定快照
   */
  restoreFromSnapshot(snapshotId) {
    const snapshot = this.stateHistory.find(s => s.id === snapshotId);
    if (!snapshot) {
      console.error('未找到指定快照:', snapshotId);
      return false;
    }
    
    const oldState = this.state;
    this.state = Utils.Object.deepClone(snapshot.state);
    
    // 通知状态完全变更
    const changeEvent = new StateChangeEvent('*', this.state, oldState, 'snapshot_restore');
    this.processBatchChanges([changeEvent]);
    
    console.log(`🔄 状态已恢复到快照: ${snapshotId}`);
    return true;
  }

  /**
   * 获取状态历史
   */
  getStateHistory() {
    return this.stateHistory.map(snapshot => ({
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      gameTime: snapshot.gameTime,
      size: snapshot.getSize(),
      metadata: snapshot.metadata
    }));
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      subscriberCount: this.wildcardSubscribers.length + 
        Array.from(this.subscribers.values()).reduce((sum, subs) => sum + subs.length, 0),
      queueSize: this.changeQueue.length,
      stateSize: JSON.stringify(this.state).length,
      historySize: this.stateHistory.length
    };
  }

  /**
   * 获取状态统计信息
   */
  getStatistics() {
    return {
      game: this.state.game,
      population: this.state.population,
      families: this.state.families,
      resources: this.state.resources,
      skills: this.state.skills,
      virtues: this.state.virtues,
      relationships: this.state.relationships,
      locations: this.state.locations,
      behaviors: this.state.behaviors,
      performance: this.getPerformanceMetrics()
    };
  }

  /**
   * 重置状态到初始值
   */
  resetState() {
    const oldState = this.state;
    
    this.state = {
      game: {
        isInitialized: false,
        isRunning: false,
        isPaused: false,
        currentPhase: 'initialization',
        gameTime: 0,
        currentSeason: '春季',
        weatherType: '晴朗'
      },
      population: { total: 0, alive: 0, male: 0, female: 0, children: 0, adults: 0, elders: 0 },
      families: { total: 0, familyList: [], averageSize: 0, prosperityLevels: {} },
      resources: { total: {}, production: {}, consumption: {}, shortage: [], abundance: [] },
      skills: { totalSkills: 0, averageLevel: 0, masterCrafters: 0, skillDistribution: {} },
      virtues: { totalVirtueSystems: 0, averageVirtueLevel: 0, dominantVirtues: [], characterVirtueRankings: [] },
      relationships: { totalRelationships: 0, familyBonds: 0, friendships: 0, conflicts: 0, networkDensity: 0 },
      locations: { activeLocations: [], occupancyRates: {}, comfortLevels: {}, functionalityScores: {} },
      behaviors: { currentActions: {}, completedToday: 0, failedToday: 0, popularActions: [] }
    };
    
    // 通知状态重置
    const changeEvent = new StateChangeEvent('*', this.state, oldState, 'reset');
    this.processBatchChanges([changeEvent]);
    
    console.log('🔄 状态已重置');
  }

  /**
   * 导出状态数据
   */
  exportState() {
    return {
      state: Utils.Object.deepClone(this.state),
      timestamp: Date.now(),
      version: '1.0.0',
      gameEngine: {
        charactersCount: this.gameEngine.characters?.size || 0,
        familiesCount: this.gameEngine.families?.size || 0
      }
    };
  }

  /**
   * 导入状态数据
   */
  importState(exportedData) {
    if (!exportedData.state) {
      console.error('无效的状态数据');
      return false;
    }
    
    const oldState = this.state;
    this.state = Utils.Object.deepClone(exportedData.state);
    
    // 通知状态导入
    const changeEvent = new StateChangeEvent('*', this.state, oldState, 'import');
    this.processBatchChanges([changeEvent]);
    
    console.log('📥 状态已导入');
    return true;
  }

  /**
   * 强制同步所有模块状态
   */
  forceSyncAll() {
    console.log('🔄 强制同步所有模块状态...');
    
    const startTime = Date.now();
    this.syncWithModules();
    const endTime = Date.now();
    
    console.log(`✅ 强制同步完成，耗时 ${endTime - startTime}ms`);
  }

  /**
   * 获取状态变更摘要（最近N个变更）
   */
  getRecentChanges(count = 10) {
    // 从历史中获取最近的变更
    const recentSnapshots = this.stateHistory.slice(-count);
    const changes = [];
    
    for (let i = 1; i < recentSnapshots.length; i++) {
      const current = recentSnapshots[i];
      const previous = recentSnapshots[i - 1];
      const diff = current.diff(previous);
      
      changes.push({
        timestamp: current.timestamp,
        gameTime: current.gameTime,
        changes: diff
      });
    }
    
    return changes;
  }

  /**
   * 清理资源
   */
  cleanup() {
    console.log('🧹 开始状态管理器清理...');
    
    // 停止定时器
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    // 处理剩余的批处理队列
    if (this.changeQueue.length > 0) {
      this.processBatchQueue();
    }
    
    // 清理订阅者
    this.subscribers.clear();
    this.wildcardSubscribers = [];
    
    // 清理历史
    this.stateHistory = [];
    this.changeQueue = [];
    
    console.log('✅ 状态管理器清理完成');
  }
}

/**
 * 状态管理器工厂函数
 */
export function createGameStateManager(gameEngine) {
  return new GameStateManager(gameEngine);
}

/**
 * 状态管理器单例
 */
let globalStateManager = null;

/**
 * 获取全局状态管理器实例
 */
export function getGlobalStateManager(gameEngine) {
  if (!globalStateManager && gameEngine) {
    globalStateManager = new GameStateManager(gameEngine);
  }
  return globalStateManager;
}

/**
 * 销毁全局状态管理器
 */
export function destroyGlobalStateManager() {
  if (globalStateManager) {
    globalStateManager.cleanup();
    globalStateManager = null;
  }
}

export default GameStateManager;