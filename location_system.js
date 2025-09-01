/**
 * LocationSystem.js - 地点系统
 * 管理游戏中的各种地点、环境效果和空间布局
 * 依赖: Utils.js, gameConfig.js
 * 输出: 地点管理、环境效果和空间交互
 */

import { Utils } from './utils_module.js';
import { DEFAULT_CONFIG } from './gameConfig.js';

/**
 * 地点类
 * 表示游戏中的一个具体地点
 */
class Location {
  constructor(name, config = {}) {
    this.name = name;
    this.type = config.type || 'general';
    this.description = config.description || '';
    
    // 基础属性
    this.capacity = config.capacity || 10;              // 容纳人数
    this.currentOccupants = new Set();                  // 当前占用者
    this.comfort = config.comfort || 50;                // 舒适度 (0-100)
    this.safety = config.safety || 70;                  // 安全度 (0-100)
    this.cleanliness = config.cleanliness || 60;        // 清洁度 (0-100)
    
    // 功能属性
    this.availableActions = config.availableActions || [];
    this.requiredSkills = config.requiredSkills || [];
    this.providedResources = config.providedResources || [];
    this.consumedResources = config.consumedResources || [];
    
    // 环境效果
    this.environmentalEffects = {
      productivity: config.productivity || 1.0,         // 生产效率
      learningBonus: config.learningBonus || 0,         // 学习加成
      socialBonus: config.socialBonus || 0,             // 社交加成
      healthBonus: config.healthBonus || 0,             // 健康加成
      moodBonus: config.moodBonus || 0                  // 心情加成
    };
    
    // 季节和天气敏感性
    this.weatherSensitive = config.weatherSensitive || false;
    this.seasonalEffects = config.seasonalEffects || {};
    this.weatherProtection = config.weatherProtection || 50;
    
    // 建筑和设施
    this.buildingLevel = config.buildingLevel || 1;     // 建筑等级 (1-5)
    this.facilities = new Map();                        // 设施映射
    this.durability = config.durability || 100;         // 耐久度
    this.maintenanceRequired = config.maintenanceRequired || 1; // 维护需求
    
    // 资源存储
    this.storage = new Map();                           // 存储的资源
    this.storageCapacity = config.storageCapacity || 100;
    
    // 访问控制
    this.accessLevel = config.accessLevel || 'public';  // 访问等级
    this.ownerCharacter = config.ownerCharacter || null;
    this.allowedCharacters = new Set(config.allowedCharacters || []);
    
    // 活动历史
    this.activityHistory = [];
    this.maxHistoryLength = 50;
    
    // 连接的地点
    this.connectedLocations = new Map();               // 连接地点及距离
    this.travelCost = config.travelCost || 1;          // 旅行成本
    
    this.initialize();
  }

  /**
   * 初始化地点
   */
  initialize() {
    // 根据类型设置默认设施
    this.setupDefaultFacilities();
    
    // 初始化存储
    this.initializeStorage();
    
    console.log(`地点初始化完成: ${this.name} (${this.type})`);
  }

  /**
   * 设置默认设施
   */
  setupDefaultFacilities() {
    const facilityMap = {
      'residential': ['bed', 'fireplace', 'storage_chest'],
      'production': ['workbench', 'tool_rack', 'material_storage'],
      'social': ['meeting_table', 'decoration', 'seating'],
      'cultural': ['altar', 'scroll_shelf', 'incense_burner'],
      'defense': ['weapon_rack', 'watchtower', 'gate'],
      'resource': ['extraction_tools', 'processing_station']
    };
    
    const defaultFacilities = facilityMap[this.type] || [];
    for (const facilityName of defaultFacilities) {
      this.addFacility(facilityName, { level: 1, condition: 80 });
    }
  }

  /**
   * 初始化存储
   */
  initializeStorage() {
    // 根据地点类型初始化一些基础资源
    if (this.type === 'residential') {
      this.storage.set('food', Utils.Math.randomInt(10, 30));
      this.storage.set('water', Utils.Math.randomInt(15, 40));
    } else if (this.type === 'production') {
      this.storage.set('tools', Utils.Math.randomInt(5, 15));
      this.storage.set('materials', Utils.Math.randomInt(20, 50));
    }
  }

  /**
   * 角色进入地点
   * @param {string} characterId - 角色ID
   * @returns {Object} 进入结果
   */
  enter(characterId) {
    // 检查访问权限
    if (!this.canAccess(characterId)) {
      return { 
        success: false, 
        reason: '没有访问权限',
        accessLevel: this.accessLevel 
      };
    }
    
    // 检查容量
    if (this.currentOccupants.size >= this.capacity) {
      return { 
        success: false, 
        reason: '地点已满',
        capacity: this.capacity,
        currentCount: this.currentOccupants.size
      };
    }
    
    // 角色进入
    this.currentOccupants.add(characterId);
    
    // 记录活动
    this.recordActivity({
      type: 'character_enter',
      characterId: characterId,
      timestamp: Date.now()
    });
    
    // 计算环境效果
    const effects = this.calculateEnvironmentalEffects();
    
    console.log(`角色 ${characterId} 进入 ${this.name}`);
    
    return {
      success: true,
      location: this.name,
      effects: effects,
      availableActions: this.getAvailableActions(characterId),
      currentOccupants: this.currentOccupants.size
    };
  }

  /**
   * 角色离开地点
   * @param {string} characterId - 角色ID
   * @returns {Object} 离开结果
   */
  leave(characterId) {
    if (!this.currentOccupants.has(characterId)) {
      return { success: false, reason: '角色不在此地点' };
    }
    
    this.currentOccupants.delete(characterId);
    
    // 记录活动
    this.recordActivity({
      type: 'character_leave',
      characterId: characterId,
      timestamp: Date.now()
    });
    
    console.log(`角色 ${characterId} 离开 ${this.name}`);
    
    return {
      success: true,
      location: this.name,
      remainingOccupants: this.currentOccupants.size
    };
  }

  /**
   * 检查角色是否可以访问
   * @param {string} characterId - 角色ID
   * @returns {boolean} 是否可访问
   */
  canAccess(characterId) {
    if (this.accessLevel === 'public') return true;
    if (this.accessLevel === 'private' && this.ownerCharacter === characterId) return true;
    if (this.accessLevel === 'restricted' && this.allowedCharacters.has(characterId)) return true;
    
    return false;
  }




  /**
   * 获取可用行为
   * @param {string} characterId - 角色ID
   * @returns {Array} 可用行为列表
   */
  getAvailableActions(characterId) {
    const actions = [...this.availableActions];
    
    // 根据设施添加额外行为
    for (const [facilityName, facility] of this.facilities) {
      const facilityActions = this.getFacilityActions(facilityName, facility);
      actions.push(...facilityActions);
    }
    
    // 根据权限过滤行为
    return actions.filter(action => this.canPerformAction(characterId, action));
  }

  /**
   * 获取设施相关行为
   * @param {string} facilityName - 设施名称
   * @param {Object} facility - 设施对象
   * @returns {Array} 设施行为
   */
  getFacilityActions(facilityName, facility) {
    const facilityActionMap = {
      'workbench': ['手工雕琢', '工具制作'],
      'fireplace': ['烹饪', '取暖'],
      'altar': ['祝祷祭祀', '占卜起卦'],
      'bed': ['休息睡眠'],
      'watchtower': ['站岗放哨', '观察周围'],
      'storage_chest': ['存储物品', '取出物品']
    };
    
    return facilityActionMap[facilityName] || [];
  }

  /**
   * 检查是否可以执行行为
   * @param {string} characterId - 角色ID
   * @param {string} action - 行为名称
   * @returns {boolean} 是否可执行
   */
  canPerformAction(characterId, action) {
    // 检查技能要求
    const skillRequirements = this.getActionSkillRequirements(action);
    // 这里需要与技能系统集成，暂时返回true
    
    // 检查设施要求
    const facilityRequirements = this.getActionFacilityRequirements(action);
    for (const reqFacility of facilityRequirements) {
      if (!this.facilities.has(reqFacility)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 获取行为技能要求
   * @param {string} action - 行为名称
   * @returns {Array} 技能要求
   */
  getActionSkillRequirements(action) {
    const requirementMap = {
      '手工雕琢': [{ skill: '手工雕琢', level: 10 }],
      '熔炼铸锻': [{ skill: '熔炼铸锻', level: 15 }],
      '垦荒耕种': [{ skill: '垦荒耕种', level: 5 }],
      '经义研读': [{ skill: '经义研读', level: 20 }]
    };
    
    return requirementMap[action] || [];
  }

  /**
   * 获取行为设施要求
   * @param {string} action - 行为名称
   * @returns {Array} 设施要求
   */
  getActionFacilityRequirements(action) {
    const requirementMap = {
      '手工雕琢': ['workbench'],
      '休息睡眠': ['bed'],
      '祝祷祭祀': ['altar'],
      '站岗放哨': ['watchtower']
    };
    
    return requirementMap[action] || [];
  }

  /**
   * 添加设施
   * @param {string} facilityName - 设施名称
   * @param {Object} config - 设施配置
   */
  addFacility(facilityName, config = {}) {
    this.facilities.set(facilityName, {
      name: facilityName,
      level: config.level || 1,
      condition: config.condition || 100,
      efficiency: config.efficiency || 1.0,
      lastMaintenance: Date.now(),
      ...config
    });
    
    // 更新地点效果
    this.updateEnvironmentalEffects();
    
    console.log(`添加设施: ${this.name} -> ${facilityName}`);
  }

  /**
   * 移除设施
   * @param {string} facilityName - 设施名称
   */
  removeFacility(facilityName) {
    if (this.facilities.delete(facilityName)) {
      this.updateEnvironmentalEffects();
      console.log(`移除设施: ${this.name} -> ${facilityName}`);
    }
  }

  /**
   * 升级设施
   * @param {string} facilityName - 设施名称
   * @param {Object} context - 升级上下文
   * @returns {Object} 升级结果
   */
  upgradeFacility(facilityName, context = {}) {
    const facility = this.facilities.get(facilityName);
    if (!facility) {
      return { success: false, reason: '设施不存在' };
    }
    
    if (facility.level >= 5) {
      return { success: false, reason: '设施已达最高等级' };
    }
    
    // 检查升级要求（资源、技能等）
    const requirements = this.getFacilityUpgradeRequirements(facilityName, facility.level);
    
    // 这里需要与资源系统集成检查资源
    // 暂时直接升级
    facility.level++;
    facility.efficiency = Math.min(2.0, facility.efficiency + 0.2);
    facility.condition = 100; // 升级后恢复状态
    
    this.updateEnvironmentalEffects();
    
    console.log(`设施升级: ${facilityName} -> 等级 ${facility.level}`);
    
    return {
      success: true,
      facilityName: facilityName,
      newLevel: facility.level,
      newEfficiency: facility.efficiency
    };
  }

  /**
   * 获取设施升级要求
   * @param {string} facilityName - 设施名称
   * @param {number} currentLevel - 当前等级
   * @returns {Object} 升级要求
   */
  getFacilityUpgradeRequirements(facilityName, currentLevel) {
    const baseRequirements = {
      resources: {
        wood: currentLevel * 10,
        stone: currentLevel * 5,
        metal: currentLevel * 2
      },
      skills: {
        '住宅修建': currentLevel * 10
      },
      time: currentLevel * 2 // 小时
    };
    
    return baseRequirements;
  }

  /**
   * 维护设施
   * @param {string} facilityName - 设施名称
   * @param {Object} context - 维护上下文
   * @returns {Object} 维护结果
   */
  maintainFacility(facilityName, context = {}) {
    const facility = this.facilities.get(facilityName);
    if (!facility) {
      return { success: false, reason: '设施不存在' };
    }
    
    // 计算维护效果
    const maintenanceQuality = context.quality || 0.7;
    const conditionImprovement = 30 * maintenanceQuality;
    
    facility.condition = Math.min(100, facility.condition + conditionImprovement);
    facility.lastMaintenance = Date.now();
    
    console.log(`设施维护: ${facilityName} 状态提升至 ${facility.condition}`);
    
    return {
      success: true,
      facilityName: facilityName,
      newCondition: facility.condition,
      improvement: conditionImprovement
    };
  }

  /**
   * 更新环境效果
   */
  updateEnvironmentalEffects() {
    // 重置环境效果
    this.environmentalEffects = {
      productivity: 1.0,
      learningBonus: 0,
      socialBonus: 0,
      healthBonus: 0,
      moodBonus: 0
    };
    
    // 基于建筑等级的基础效果
    const levelBonus = (this.buildingLevel - 1) * 0.1;
    this.environmentalEffects.productivity += levelBonus;
    this.environmentalEffects.moodBonus += levelBonus * 5;
    
    // 基于设施的效果
    for (const [facilityName, facility] of this.facilities) {
      const facilityEffects = this.getFacilityEffects(facilityName, facility);
      
      for (const [effect, value] of Object.entries(facilityEffects)) {
        if (this.environmentalEffects[effect] !== undefined) {
          // 考虑设施状态的影响
          const conditionMultiplier = facility.condition / 100;
          this.environmentalEffects[effect] += value * conditionMultiplier;
        }
      }
    }
    
    // 基于清洁度的健康效果
    this.environmentalEffects.healthBonus += (this.cleanliness - 50) * 0.2;
    
    // 基于舒适度的心情效果
    this.environmentalEffects.moodBonus += (this.comfort - 50) * 0.1;
  }

  /**
   * 获取设施效果
   * @param {string} facilityName - 设施名称
   * @param {Object} facility - 设施对象
   * @returns {Object} 设施效果
   */
  getFacilityEffects(facilityName, facility) {
    const facilityEffectMap = {
      'workbench': {
        productivity: 0.2 * facility.level,
        learningBonus: 0.1 * facility.level
      },
      'fireplace': {
        comfort: 10 * facility.level,
        moodBonus: 3 * facility.level
      },
      'altar': {
        spiritualBonus: 0.15 * facility.level,
        moodBonus: 2 * facility.level
      },
      'bed': {
        restBonus: 0.2 * facility.level,
        healthBonus: 0.1 * facility.level
      },
      'decoration': {
        moodBonus: 4 * facility.level,
        socialBonus: 0.1 * facility.level
      }
    };
    
    return facilityEffectMap[facilityName] || {};
  }

  /**
   * 计算当前环境效果
   * @param {Object} context - 上下文信息
   * @returns {Object} 环境效果
   */
  calculateEnvironmentalEffects(context = {}) {
    const effects = { ...this.environmentalEffects };
    
    // 人数密度影响
    const density = this.currentOccupants.size / this.capacity;
    if (density > 0.8) {
      effects.moodBonus -= 5; // 过于拥挤
      effects.healthBonus -= 3;
    } else if (density < 0.3) {
      effects.socialBonus -= 0.1; // 过于空旷
    }
    
    // 天气影响
    if (context.weather && this.weatherSensitive) {
      const weatherEffects = this.getWeatherEffects(context.weather);
      for (const [effect, modifier] of Object.entries(weatherEffects)) {
        if (effects[effect] !== undefined) {
          effects[effect] += modifier;
        }
      }
    }
    
    // 季节影响
    if (context.season && this.seasonalEffects[context.season]) {
      const seasonEffects = this.seasonalEffects[context.season];
      for (const [effect, modifier] of Object.entries(seasonEffects)) {
        if (effects[effect] !== undefined) {
          effects[effect] += modifier;
        }
      }
    }
    
    return effects;
  }

  /**
   * 获取天气效果
   * @param {string} weather - 天气类型
   * @returns {Object} 天气效果
   */
  getWeatherEffects(weather) {
    const protection = this.weatherProtection / 100;
    
    const weatherEffectMap = {
      '大雨': {
        productivity: -0.3 * (1 - protection),
        moodBonus: -5 * (1 - protection)
      },
      '雷雨': {
        productivity: -0.5 * (1 - protection),
        moodBonus: -8 * (1 - protection),
        danger: true
      },
      '雪天': {
        productivity: -0.4 * (1 - protection),
        moodBonus: -6 * (1 - protection)
      },
      '晴朗': {
        moodBonus: 3,
        productivity: 0.1
      }
    };
    
    return weatherEffectMap[weather] || {};
  }

  /**
   * 存储资源
   * @param {string} resourceType - 资源类型
   * @param {number} amount - 数量
   * @returns {Object} 存储结果
   */
  storeResource(resourceType, amount) {
    const currentAmount = this.storage.get(resourceType) || 0;
    const totalStorage = Array.from(this.storage.values()).reduce((sum, val) => sum + val, 0);
    
    if (totalStorage + amount > this.storageCapacity) {
      return { 
        success: false, 
        reason: '存储空间不足',
        available: this.storageCapacity - totalStorage
      };
    }
    
    this.storage.set(resourceType, currentAmount + amount);
    
    return {
      success: true,
      resourceType: resourceType,
      stored: amount,
      total: currentAmount + amount
    };
  }

  /**
   * 取出资源
   * @param {string} resourceType - 资源类型
   * @param {number} amount - 数量
   * @returns {Object} 取出结果
   */
  retrieveResource(resourceType, amount) {
    const currentAmount = this.storage.get(resourceType) || 0;
    
    if (currentAmount < amount) {
      return {
        success: false,
        reason: '资源不足',
        available: currentAmount
      };
    }
    
    this.storage.set(resourceType, currentAmount - amount);
    
    return {
      success: true,
      resourceType: resourceType,
      retrieved: amount,
      remaining: currentAmount - amount
    };
  }

  /**
   * 更新地点状态（时间推进）
   * @param {number} deltaTime - 时间间隔
   * @param {Object} context - 更新上下文
   */
  update(deltaTime, context = {}) {
    // 设施状态衰减
    this.updateFacilities(deltaTime);
    
    // 清洁度衰减
    this.updateCleanliness(deltaTime);
    
    // 耐久度衰减
    this.updateDurability(deltaTime);
    
    // 资源自然消耗/产生
    this.updateResources(deltaTime, context);
    
    // 更新环境效果
    this.updateEnvironmentalEffects();
  }

  /**
   * 更新设施状态
   * @param {number} deltaTime - 时间间隔
   */
  updateFacilities(deltaTime) {
    for (const [facilityName, facility] of this.facilities) {
      // 设施自然磨损
      const wearRate = 0.5; // 每天磨损0.5点
      facility.condition = Math.max(0, facility.condition - wearRate * deltaTime);
      
      // 严重磨损影响效率
      if (facility.condition < 30) {
        facility.efficiency = Math.max(0.3, facility.condition / 100);
      }
    }
  }

  /**
   * 更新清洁度
   * @param {number} deltaTime - 时间间隔
   */
  updateCleanliness(deltaTime) {
    // 基础污染率
    let pollutionRate = 1.0 * deltaTime;
    
    // 人数越多污染越快
    pollutionRate *= (1 + this.currentOccupants.size * 0.1);
    
    // 生产类地点污染更快
    if (this.type === 'production') {
      pollutionRate *= 1.5;
    }
    
    this.cleanliness = Math.max(0, this.cleanliness - pollutionRate);
  }

  /**
   * 更新耐久度
   * @param {number} deltaTime - 时间间隔
   */
  updateDurability(deltaTime) {
    const wearRate = 0.2 * deltaTime; // 每天损失0.2点耐久度
    this.durability = Math.max(0, this.durability - wearRate);
    
    // 低耐久度影响整体功能
    if (this.durability < 50) {
      this.capacity = Math.floor(this.capacity * (this.durability / 100));
    }
  }

  /**
   * 更新资源
   * @param {number} deltaTime - 时间间隔
   * @param {Object} context - 上下文
   */
  updateResources(deltaTime, context) {
    // 某些地点会自然产生资源
    if (this.type === 'resource') {
      for (const resourceType of this.providedResources) {
        const productionRate = this.getResourceProductionRate(resourceType);
        const produced = productionRate * deltaTime;
        
        if (produced > 0) {
          const currentAmount = this.storage.get(resourceType) || 0;
          this.storage.set(resourceType, currentAmount + produced);
        }
      }
    }
    
    // 资源自然衰减（食物腐烂等）
    const decayableResources = ['food'];
    for (const resourceType of decayableResources) {
      const currentAmount = this.storage.get(resourceType) || 0;
      if (currentAmount > 0) {
        const decayRate = 0.02 * deltaTime; // 每天2%腐烂率
        const decayed = currentAmount * decayRate;
        this.storage.set(resourceType, Math.max(0, currentAmount - decayed));
      }
    }
  }

  /**
   * 获取资源产出率
   * @param {string} resourceType - 资源类型
   * @returns {number} 产出率
   */
  getResourceProductionRate(resourceType) {
    const productionMap = {
      'wood': this.name === '山林' ? 2.0 : 0,
      'stone': this.name === '矿场' ? 1.5 : 0,
      'fish': this.name === '河边' ? 1.0 : 0,
      'water': this.name === '河边' ? 5.0 : 0
    };
    
    return productionMap[resourceType] || 0;
  }

  /**
   * 清洁地点
   * @param {Object} context - 清洁上下文
   * @returns {Object} 清洁结果
   */
  clean(context = {}) {
    const efficiency = context.efficiency || 0.7;
    const improvement = 30 * efficiency;
    
    this.cleanliness = Math.min(100, this.cleanliness + improvement);
    
    return {
      success: true,
      improvement: improvement,
      newCleanliness: this.cleanliness
    };
  }

  /**
   * 修复地点
   * @param {Object} context - 修复上下文
   * @returns {Object} 修复结果
   */
  repair(context = {}) {
    const efficiency = context.efficiency || 0.8;
    const improvement = 25 * efficiency;
    
    this.durability = Math.min(100, this.durability + improvement);
    
    // 恢复因低耐久度损失的容量
    this.capacity = this.getBaseCapacity();
    
    return {
      success: true,
      improvement: improvement,
      newDurability: this.durability
    };
  }

  /**
   * 获取基础容量
   * @returns {number} 基础容量
   */
  getBaseCapacity() {
    const baseCapacityMap = {
      'residential': 15,
      'production': 8,
      'social': 25,
      'cultural': 20,
      'defense': 12,
      'resource': 6
    };
    
    return baseCapacityMap[this.type] || 10;
  }

  /**
   * 记录活动
   * @param {Object} activity - 活动记录
   */
  recordActivity(activity) {
    this.activityHistory.push({
      ...activity,
      id: Utils.String.generateId()
    });
    
    if (this.activityHistory.length > this.maxHistoryLength) {
      this.activityHistory.shift();
    }
  }

  /**
   * 获取地点状态
   * @returns {Object} 地点状态
   */
  getState() {
    return {
      name: this.name,
      type: this.type,
      description: this.description,
      capacity: this.capacity,
      currentOccupants: Array.from(this.currentOccupants),
      occupancyRate: this.currentOccupants.size / this.capacity,
      comfort: Math.round(this.comfort),
      safety: Math.round(this.safety),
      cleanliness: Math.round(this.cleanliness),
      durability: Math.round(this.durability),
      buildingLevel: this.buildingLevel,
      availableActions: this.availableActions,
      environmentalEffects: { ...this.environmentalEffects },
      facilities: Object.fromEntries(
        Array.from(this.facilities.entries()).map(([name, facility]) => [
          name, 
          { ...facility, condition: Math.round(facility.condition) }
        ])
      ),
      storage: Object.fromEntries(this.storage),
      storageUtilization: this.getStorageUtilization(),
      recentActivities: this.activityHistory.slice(-10),
      connectedLocations: Array.from(this.connectedLocations.keys())
    };
  }

  /**
   * 获取存储利用率
   * @returns {number} 利用率百分比
   */
  getStorageUtilization() {
    const totalStored = Array.from(this.storage.values()).reduce((sum, val) => sum + val, 0);
    return Math.round((totalStored / this.storageCapacity) * 100);
  }

  /**
   * 连接到其他地点
   * @param {string} locationName - 地点名称
   * @param {number} distance - 距离
   * @param {Object} options - 连接选项
   */
  connectTo(locationName, distance = 1, options = {}) {
    this.connectedLocations.set(locationName, {
      distance: distance,
      travelCost: options.travelCost || distance,
      roadQuality: options.roadQuality || 'normal',
      restrictions: options.restrictions || []
    });
    
    console.log(`${this.name} 连接到 ${locationName} (距离: ${distance})`);
  }

  /**
   * 断开与其他地点的连接
   * @param {string} locationName - 地点名称
   */
  disconnectFrom(locationName) {
    if (this.connectedLocations.delete(locationName)) {
      console.log(`${this.name} 断开与 ${locationName} 的连接`);
    }
  }

  /**
   * 克隆地点
   * @returns {Location} 克隆的地点
   */
  clone() {
    const cloned = new Location(this.name + '_clone', {
      type: this.type,
      description: this.description,
      capacity: this.capacity,
      comfort: this.comfort,
      safety: this.safety,
      cleanliness: this.cleanliness,
      availableActions: [...this.availableActions],
      weatherSensitive: this.weatherSensitive,
      buildingLevel: this.buildingLevel,
      durability: this.durability,
      storageCapacity: this.storageCapacity,
      accessLevel: this.accessLevel,
      ownerCharacter: this.ownerCharacter
    });
    
    // 复制设施
    for (const [facilityName, facility] of this.facilities) {
      cloned.facilities.set(facilityName, { ...facility });
    }
    
    // 复制存储
    for (const [resourceType, amount] of this.storage) {
      cloned.storage.set(resourceType, amount);
    }
    
    return cloned;
  }
}

/**
 * 地点系统类
 * 管理游戏中的所有地点和空间布局
 */
class LocationSystem {
  constructor(config = {}) {
    this.locations = new Map();
    this.locationGraph = new Map(); // 地点连接图
    
    // 系统配置
    this.maxLocations = config.maxLocations || 50;
    this.autoExpansion = config.autoExpansion !== false;
    this.defaultWeatherProtection = config.defaultWeatherProtection || 50;
    
    // 全局环境因素
    this.globalEnvironment = {
      weather: '晴朗',
      season: '春季',
      temperature: 20,
      pollution: 0
    };
    
    // 地点模板
    this.locationTemplates = new Map();
    
    this.initialize();
  }

  /**
   * 初始化地点系统
   */
  initialize() {
    this.setupLocationTemplates();
    this.createInitialLocations();
    this.setupLocationConnections();
    
    console.log('地点系统初始化完成');
  }

  /**
   * 设置地点模板
   */
  setupLocationTemplates() {
    const locationConfigs = DEFAULT_CONFIG.LOCATIONS;
    
    for (const [locationName, config] of Object.entries(locationConfigs)) {
      this.locationTemplates.set(locationName, config);
    }
  }

  /**
   * 创建初始地点
   */
  createInitialLocations() {
    // 基础地点配置
    const initialLocations = [
      '住宅区', '农田', '工坊', '山林', 
      '河边', '市集', '祠堂', '广场'
    ];
    
    for (const locationName of initialLocations) {
      this.createLocation(locationName);
    }
  }

  /**
   * 设置地点连接
   */
  setupLocationConnections() {
    // 定义地点间的连接关系
    const connections = [
      ['住宅区', '广场', 1],
      ['住宅区', '农田', 2],
      ['广场', '市集', 1],
      ['广场', '祠堂', 1],
      ['农田', '河边', 2],
      ['工坊', '市集', 1],
      ['山林', '河边', 3],
      ['山林', '农田', 2]
    ];
    
    for (const [from, to, distance] of connections) {
      this.connectLocations(from, to, distance);
    }
  }

  /**
   * 创建地点
   * @param {string} locationName - 地点名称
   * @param {Object} customConfig - 自定义配置
   * @returns {Location} 创建的地点
   */
  createLocation(locationName, customConfig = {}) {
    if (this.locations.has(locationName)) {
      console.warn(`地点 ${locationName} 已存在`);
      return this.locations.get(locationName);
    }
    
    if (this.locations.size >= this.maxLocations) {
      console.error('地点数量已达上限');
      return null;
    }
    
    // 获取模板配置
    const template = this.locationTemplates.get(locationName) || {};
    
    // 合并配置
    const config = {
      ...template,
      ...customConfig,
      weatherProtection: customConfig.weatherProtection || this.defaultWeatherProtection
    };
    
    const location = new Location(locationName, config);
    this.locations.set(locationName, location);
    this.locationGraph.set(locationName, new Map());
    
    console.log(`创建地点: ${locationName}`);
    
    return location;
  }

  /**
   * 移除地点
   * @param {string} locationName - 地点名称
   * @returns {boolean} 是否移除成功
   */
  removeLocation(locationName) {
    const location = this.locations.get(locationName);
    if (!location) return false;
    
    // 清空地点
    for (const characterId of location.currentOccupants) {
      location.leave(characterId);
    }
    
    // 断开所有连接
    this.locationGraph.delete(locationName);
    for (const connections of this.locationGraph.values()) {
      connections.delete(locationName);
    }
    
    this.locations.delete(locationName);
    
    console.log(`移除地点: ${locationName}`);
    return true;
  }

  /**
   * 连接地点
   * @param {string} from - 起始地点
   * @param {string} to - 目标地点
   * @param {number} distance - 距离
   * @param {Object} options - 连接选项
   */
  connectLocations(from, to, distance = 1, options = {}) {
    const fromLocation = this.locations.get(from);
    const toLocation = this.locations.get(to);
    
    if (!fromLocation || !toLocation) {
      console.error(`连接失败: 地点不存在 (${from} -> ${to})`);
      return;
    }
    
    // 双向连接
    fromLocation.connectTo(to, distance, options);
    toLocation.connectTo(from, distance, options);
    
    // 更新图结构
    this.locationGraph.get(from).set(to, distance);
    this.locationGraph.get(to).set(from, distance);
    
    console.log(`连接地点: ${from} <-> ${to} (距离: ${distance})`);
  }

  /**
   * 获取地点
   * @param {string} locationName - 地点名称
   * @returns {Location|null} 地点对象
   */
  getLocation(locationName) {
    return this.locations.get(locationName) || null;
  }

  /**
   * 获取各地点人口分布
   * @returns {Object} 各地点的人员列表
   */
  getLocationPopulation() {
    const population = {};
    
    for (const [locationName, location] of this.locations) {
      population[locationName] = Array.from(location.currentOccupants);
    }
    
    return population;
  }


  /**
   * 角色移动到地点
   * @param {string} characterId - 角色ID
   * @param {string} fromLocation - 起始地点
   * @param {string} toLocation - 目标地点
   * @returns {Object} 移动结果
   */
  moveCharacter(characterId, fromLocation, toLocation) {
    const from = this.locations.get(fromLocation);
    const to = this.locations.get(toLocation);
    
    if (!from || !to) {
      return { success: false, reason: '地点不存在' };
    }
    
    // 检查是否连通
    if (!this.areLocationsConnected(fromLocation, toLocation)) {
      return { success: false, reason: '地点未连通' };
    }
    
    // 离开原地点
    const leaveResult = from.leave(characterId);
    if (!leaveResult.success) {
      return { success: false, reason: '无法离开当前地点' };
    }
    
    // 进入新地点
    const enterResult = to.enter(characterId);
    if (!enterResult.success) {
      // 回滚：重新进入原地点
      from.enter(characterId);
      return { success: false, reason: enterResult.reason };
    }
    
    console.log(`角色移动: ${characterId} (${fromLocation} -> ${toLocation})`);
    
    return {
      success: true,
      from: fromLocation,
      to: toLocation,
      characterId: characterId,
      effects: enterResult.effects,
      availableActions: enterResult.availableActions
    };
  }

  /**
   * 检查地点是否连通
   * @param {string} from - 起始地点
   * @param {string} to - 目标地点
   * @returns {boolean} 是否连通
   */
  areLocationsConnected(from, to) {
    const connections = this.locationGraph.get(from);
    return connections ? connections.has(to) : false;
  }

  /**
   * 寻找路径
   * @param {string} from - 起始地点
   * @param {string} to - 目标地点
   * @returns {Array|null} 路径数组
   */
  findPath(from, to) {
    if (from === to) return [from];
    
    const visited = new Set();
    const queue = [[from]];
    
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      
      if (visited.has(current)) continue;
      visited.add(current);
      
      const connections = this.locationGraph.get(current);
      if (!connections) continue;
      
      for (const neighbor of connections.keys()) {
        if (neighbor === to) {
          return [...path, neighbor];
        }
        
        if (!visited.has(neighbor)) {
          queue.push([...path, neighbor]);
        }
      }
    }
    
    return null; // 无路径
  }

  /**
   * 计算移动成本
   * @param {Array} path - 路径
   * @returns {number} 移动成本
   */
  calculateMoveCost(path) {
    if (!path || path.length < 2) return 0;
    
    let totalCost = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const connections = this.locationGraph.get(from);
      
      if (connections && connections.has(to)) {
        totalCost += connections.get(to);
      }
    }
    
    return totalCost;
  }

  /**
   * 更新全局环境
   * @param {Object} environment - 环境信息
   */
  updateGlobalEnvironment(environment) {
    this.globalEnvironment = { ...this.globalEnvironment, ...environment };
    
    // 将环境变化传播到所有地点
    for (const location of this.locations.values()) {
      location.updateEnvironmentalEffects();
    }
  }

  /**
   * 更新地点系统
   * @param {number} deltaTime - 时间间隔
   */
  update(deltaTime) {
    // 更新所有地点
    for (const location of this.locations.values()) {
      location.update(deltaTime, this.globalEnvironment);
    }
    
    // 检查自动扩展
    if (this.autoExpansion) {
      this.checkAutoExpansion();
    }
  }

  /**
   * 检查自动扩展
   */
  checkAutoExpansion() {
    // 检查是否需要扩展新地点
    const totalCapacity = Array.from(this.locations.values())
      .reduce((sum, loc) => sum + loc.capacity, 0);
    const totalOccupants = Array.from(this.locations.values())
      .reduce((sum, loc) => sum + loc.currentOccupants.size, 0);
    
    const occupancyRate = totalOccupants / totalCapacity;
    
    // 如果占用率超过80%，考虑扩展
    if (occupancyRate > 0.8 && this.locations.size < this.maxLocations) {
      console.log(`考虑扩展新地点 (当前占用率: ${Math.round(occupancyRate * 100)}%)`);
      // 这里可以触发扩展逻辑
    }
  }

  /**
   * 获取地点统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    const stats = {
      totalLocations: this.locations.size,
      totalCapacity: 0,
      totalOccupants: 0,
      locationsByType: {},
      averageOccupancy: 0,
      averageCleanliness: 0,
      averageComfort: 0,
      mostPopular: null,
      leastPopular: null
    };
    
    let totalCleanliness = 0;
    let totalComfort = 0;
    let maxOccupants = -1;
    let minOccupants = Infinity;
    
    for (const location of this.locations.values()) {
      stats.totalCapacity += location.capacity;
      stats.totalOccupants += location.currentOccupants.size;
      totalCleanliness += location.cleanliness;
      totalComfort += location.comfort;
      
      // 按类型统计
      if (!stats.locationsByType[location.type]) {
        stats.locationsByType[location.type] = 0;
      }
      stats.locationsByType[location.type]++;
      
      // 最受欢迎/冷门地点
      const occupants = location.currentOccupants.size;
      if (occupants > maxOccupants) {
        maxOccupants = occupants;
        stats.mostPopular = location.name;
      }
      if (occupants < minOccupants) {
        minOccupants = occupants;
        stats.leastPopular = location.name;
      }
    }
    
    if (this.locations.size > 0) {
      stats.averageOccupancy = stats.totalOccupants / stats.totalCapacity;
      stats.averageCleanliness = totalCleanliness / this.locations.size;
      stats.averageComfort = totalComfort / this.locations.size;
    }
    
    return stats;
  }

  /**
   * 获取系统状态
   * @returns {Object} 系统状态
   */
  getState() {
    const state = {
      globalEnvironment: { ...this.globalEnvironment },
      locations: {},
      connections: {},
      statistics: this.getStatistics()
    };
    
    // 所有地点状态
    for (const [locationName, location] of this.locations) {
      state.locations[locationName] = location.getState();
    }
    
    // 连接关系
    for (const [from, connections] of this.locationGraph) {
      state.connections[from] = Object.fromEntries(connections);
    }
    
    return state;
  }

  /**
   * 设置系统状态
   * @param {Object} state - 系统状态
   */
  setState(state) {
    if (state.globalEnvironment) {
      this.globalEnvironment = { ...state.globalEnvironment };
    }
    
    if (state.locations) {
      this.locations.clear();
      this.locationGraph.clear();
      
      for (const [locationName, locationState] of Object.entries(state.locations)) {
        const location = new Location(locationName, locationState);
        // 恢复特定状态
        location.currentOccupants = new Set(locationState.currentOccupants);
        location.comfort = locationState.comfort;
        location.cleanliness = locationState.cleanliness;
        location.durability = locationState.durability;
        
        this.locations.set(locationName, location);
        this.locationGraph.set(locationName, new Map());
      }
    }
    
    if (state.connections) {
      for (const [from, connections] of Object.entries(state.connections)) {
        const connectionMap = this.locationGraph.get(from);
        if (connectionMap) {
          for (const [to, distance] of Object.entries(connections)) {
            connectionMap.set(to, distance);
          }
        }
      }
    }
    
    console.log('地点系统状态已恢复');
  }

  /**
   * 克隆地点系统
   * @returns {LocationSystem} 克隆的系统
   */
  clone() {
    const cloned = new LocationSystem();
    
    // 复制地点
    for (const [locationName, location] of this.locations) {
      cloned.locations.set(locationName, location.clone());
    }
    
    // 复制连接图
    for (const [from, connections] of this.locationGraph) {
      cloned.locationGraph.set(from, new Map(connections));
    }
    
    cloned.globalEnvironment = { ...this.globalEnvironment };
    
    return cloned;
  }

  /**
   * 销毁地点系统
   */
  destroy() {
    this.locations.clear();
    this.locationGraph.clear();
    this.locationTemplates.clear();
    
    console.log('地点系统已销毁');
  }
}

// ==================== 地点工具函数 ====================
export const LocationUtils = {
  /**
   * 计算地点评分
   * @param {Location} location - 地点对象
   * @returns {number} 评分 (0-100)
   */
  calculateLocationScore(location) {
    const weights = {
      comfort: 0.2,
      safety: 0.25,
      cleanliness: 0.2,
      capacity: 0.15,
      facilities: 0.2
    };
    
    let score = 0;
    score += location.comfort * weights.comfort;
    score += location.safety * weights.safety;
    score += location.cleanliness * weights.cleanliness;
    score += Math.min(100, location.capacity * 5) * weights.capacity;
    score += location.facilities.size * 10 * weights.facilities;
    
    return Math.round(score);
  },

  /**
   * 推荐最佳地点
   * @param {LocationSystem} locationSystem - 地点系统
   * @param {string} purpose - 目的 ('work', 'rest', 'social', 'study')
   * @returns {Array} 推荐地点列表
   */
  recommendLocations(locationSystem, purpose) {
    const recommendations = [];
    
    const purposeMapping = {
      'work': ['production', 'resource'],
      'rest': ['residential'],
      'social': ['social', 'cultural'],
      'study': ['cultural']
    };
    
    const relevantTypes = purposeMapping[purpose] || [];
    
    for (const location of locationSystem.locations.values()) {
      if (relevantTypes.includes(location.type)) {
        const score = this.calculateLocationScore(location);
        const occupancyRate = location.currentOccupants.size / location.capacity;
        
        // 考虑拥挤度
        const adjustedScore = score * (1 - occupancyRate * 0.3);
        
        recommendations.push({
          name: location.name,
          type: location.type,
          score: Math.round(adjustedScore),
          occupancyRate: Math.round(occupancyRate * 100),
          availableSpace: location.capacity - location.currentOccupants.size
        });
      }
    }
    
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  },

  /**
   * 检查地点网络连通性
   * @param {LocationSystem} locationSystem - 地点系统
   * @returns {Object} 连通性分析
   */
  analyzeConnectivity(locationSystem) {
    const analysis = {
      isFullyConnected: true,
      isolatedLocations: [],
      largestComponent: 0,
      averagePathLength: 0
    };
    
    const locationNames = Array.from(locationSystem.locations.keys());
    const visited = new Set();
    const components = [];
    
    // 寻找连通分量
    for (const locationName of locationNames) {
      if (!visited.has(locationName)) {
        const component = this.findConnectedComponent(
          locationSystem, locationName, visited
        );
        components.push(component);
      }
    }
    
    analysis.largestComponent = Math.max(...components.map(c => c.length));
    analysis.isFullyConnected = components.length === 1;
    
    if (!analysis.isFullyConnected) {
      analysis.isolatedLocations = components
        .filter(c => c.length === 1)
        .map(c => c[0]);
    }
    
    return analysis;
  },

  /**
   * 寻找连通分量
   * @param {LocationSystem} locationSystem - 地点系统
   * @param {string} start - 起始地点
   * @param {Set} visited - 已访问集合
   * @returns {Array} 连通分量
   */
  findConnectedComponent(locationSystem, start, visited) {
    const component = [];
    const queue = [start];
    
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      
      visited.add(current);
      component.push(current);
      
      const connections = locationSystem.locationGraph.get(current);
      if (connections) {
        for (const neighbor of connections.keys()) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
    }
    
    return component;
  }
};

/**
 * 位置移动管理器 - 集成到 location_system.js
 */
export class LocationMovementManager {
  constructor(locationSystem, gameEngine) {
    this.locationSystem = locationSystem;
    this.gameEngine = gameEngine;
    
    // 移动规则配置
    this.movementRules = {
      work: {
        '垦荒耕种': '农田',
        '畜牧养殖': '农田', 
        '手工雕琢': '工坊',
        '熔炼铸锻': '工坊',
        '摆摊交易': '市集',
        '经义研读': '祠堂',
        '祝祷祭祀': '祠堂',
        '住宅修建': '住宅区'
      },
      leisure: {
        '饮酒聚宴': '广场',
        '踏青出游': '山林', 
        '社集看戏': '广场',
        '赌博对弈': '市集',
        '起舞弄乐': '广场'
      },
      daily: {
        '进食饮水': '住宅区',
        '休息睡眠': '住宅区',
        '盥洗沐浴': '住宅区',
        '求医用药': '住宅区',
        '更衣小解': '住宅区'
      }
    };
    
    // 移动历史和偏好
    this.movementHistory = new Map();
    this.locationPreferences = new Map();
    
    console.log('🚶 位置移动管理器已集成');
  }
  
  /**
   * 根据行为更新角色位置
   */
  updateLocationByAction(character, action) {
    if (!character || !action) return false;
    
    const targetLocation = this.determineTargetLocation(character, action);
    
    if (targetLocation && targetLocation !== character.currentLocation) {
      return this.moveCharacter(character, targetLocation, action);
    }
    
    return false;
  }
  
  /**
   * 确定目标位置
   */
  determineTargetLocation(character, action) {
    // 检查工作相关移动
    if (this.movementRules.work[action]) {
      return this.movementRules.work[action];
    }
    
    // 检查休闲相关移动
    if (this.movementRules.leisure[action]) {
      return this.movementRules.leisure[action];
    }
    
    // 检查日常需求移动
    if (this.movementRules.daily[action]) {
      return this.movementRules.daily[action];
    }
    
    // 基于时间段的默认位置
    const timeOfDay = this.gameEngine.systems?.time?.gameTime?.getCurrentTimeOfDay();
    if (timeOfDay) {
      switch (timeOfDay) {
        case '黎明':
        case '夜晚':
          return '住宅区';
        case '上午':
        case '下午':
          return this.getWorkLocation(character);
        case '黄昏':
          return Math.random() < 0.7 ? '住宅区' : '市集';
        default:
          return character.currentLocation;
      }
    }
    
    return null;
  }
  
  /**
   * 获取工作位置
   */
  getWorkLocation(character) {
    const workLocations = ['农田', '工坊', '市集'];
    
    // 基于角色背景选择工作位置
    if (character.background) {
      const locationMap = {
        'farmer': '农田',
        'craftsman': '工坊', 
        'merchant': '市集',
        'scholar': '祠堂'
      };
      
      if (locationMap[character.background.type]) {
        return locationMap[character.background.type];
      }
    }
    
    // 随机选择工作位置
    return Utils.Array.randomChoice(workLocations);
  }
  
  /**
   * 移动角色
   */
  moveCharacter(character, targetLocation, reason = '未知') {
    const oldLocation = character.currentLocation;
    
    // 检查位置是否存在
    if (!this.locationSystem.locations.has(targetLocation)) {
      console.warn(`⚠️ 位置 ${targetLocation} 不存在`);
      return false;
    }
    
    // 使用现有的moveCharacter方法
    const moveResult = this.locationSystem.moveCharacter(character.id, oldLocation, targetLocation);
    
    if (moveResult.success) {
      // 更新角色的当前位置
      character.currentLocation = targetLocation;
      
      // 记录移动
      this.recordMovement(character.id, {
        from: oldLocation,
        to: targetLocation,
        reason: reason,
        timestamp: Date.now()
      });
      
      // 更新位置偏好
      this.updateLocationPreference(character.id, targetLocation);
      
      console.log(`🚶 ${character.name} 从 ${oldLocation} 移动到 ${targetLocation} (${reason})`);
      return true;
    }
    
    return false;
  }
  
  /**
   * 记录移动历史
   */
  recordMovement(characterId, movement) {
    if (!this.movementHistory.has(characterId)) {
      this.movementHistory.set(characterId, []);
    }
    
    const history = this.movementHistory.get(characterId);
    history.push(movement);
    
    // 保持最近20次移动记录
    if (history.length > 20) {
      history.shift();
    }
  }
  
  /**
   * 更新位置偏好
   */
  updateLocationPreference(characterId, location) {
    if (!this.locationPreferences.has(characterId)) {
      this.locationPreferences.set(characterId, new Map());
    }
    
    const preferences = this.locationPreferences.get(characterId);
    const currentPreference = preferences.get(location) || 0;
    preferences.set(location, Math.min(10, currentPreference + 1));
  }
  
  /**
   * 批量更新所有角色位置（定期调用）
   */
  updateAllCharacterLocations() {
    if (!this.gameEngine.characters) return;
    
    let movedCount = 0;
    const characters = Array.from(this.gameEngine.characters.values())
      .filter(char => char.isAlive);
    
    characters.forEach(character => {
      // 30%概率检查是否需要移动
      if (Math.random() < 0.3) {
        const shouldMove = this.shouldCharacterMove(character);
        if (shouldMove) {
          const newLocation = this.suggestLocationForCharacter(character);
          if (newLocation && this.moveCharacter(character, newLocation, '自动移动')) {
            movedCount++;
          }
        }
      }
    });
    
    if (movedCount > 0) {
      console.log(`🔄 本轮移动了 ${movedCount} 个角色`);
    }
  }
  
  /**
   * 判断角色是否需要移动
   */
  shouldCharacterMove(character) {
    // 基于当前活动判断
    if (character.currentActivity) {
      const idealLocation = this.determineTargetLocation(character, character.currentActivity);
      if (idealLocation && idealLocation !== character.currentLocation) {
        return true;
      }
    }
    
    // 基于生理需求判断
    if (character.physicalState) {
      if (character.physicalState.hunger < 30 && character.currentLocation !== '住宅区') {
        return true;
      }
      if (character.physicalState.energy < 20 && character.currentLocation !== '住宅区') {
        return true;
      }
    }
    
    // 随机移动（模拟自然活动）
    return Math.random() < 0.15;
  }
  
  /**
   * 为角色推荐位置
   */
  suggestLocationForCharacter(character) {
    // 1. 基于当前时间
    const timeOfDay = this.gameEngine.systems?.time?.gameTime?.getCurrentTimeOfDay();
    if (timeOfDay === '夜晚' || timeOfDay === '黎明') {
      return '住宅区';
    }
    
    // 2. 基于当前活动
    if (character.currentActivity) {
      const activityLocation = this.determineTargetLocation(character, character.currentActivity);
      if (activityLocation) return activityLocation;
    }
    
    // 3. 基于角色偏好
    const preferences = this.locationPreferences.get(character.id);
    if (preferences && preferences.size > 0) {
      const sortedPreferences = Array.from(preferences.entries())
        .sort((a, b) => b[1] - a[1]);
      return sortedPreferences[0][0];
    }
    
    // 4. 默认工作位置
    return this.getWorkLocation(character);
  }
  
  /**
   * 获取移动统计
   */
  getMovementStats() {
    const stats = {
      totalMovements: 0,
      movementsByReason: {},
      activeCharacters: this.movementHistory.size
    };
    
    for (const history of this.movementHistory.values()) {
      stats.totalMovements += history.length;
      
      history.forEach(movement => {
        const reason = movement.reason || '未知';
        stats.movementsByReason[reason] = (stats.movementsByReason[reason] || 0) + 1;
      });
    }
    
    return stats;
  }
}

export { Location, LocationSystem };
export default LocationSystem;