/**
 * ResourceSystem.js - 南北朝坞堡模拟器资源管理系统
 * 
 * 功能特点：
 * - 管理坞堡内的所有资源类型（粮食、水源、材料、工具等）
 * - 支持资源生产、消耗、交易和衰减
 * - 考虑季节性变化和天气影响
 * - 资源短缺预警和自动分配
 * - 符合南北朝历史背景的资源特色
 */

import { RESOURCE_TYPES, TIME_CONFIG, WEATHER_SYSTEM, BALANCE_CONFIG } from './gameConfig.js';

export class ResourceSystem {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.resources = new Map();
    this.productionQueue = [];
    this.consumptionLog = [];
    this.tradeHistory = [];
    this.shortageAlerts = new Set();
    
    // 初始化资源储备
    this.initializeResources();
    
    // 绑定事件监听器
    this.setupEventListeners();
    
    console.log('📦 资源系统已初始化');
  }

  /**
   * 初始化基础资源储备
   */
  initializeResources() {
    // 初始流民家庭的基本资源配置
    const initialResources = {
      food: { amount: 50, quality: 60, location: '住宅区' },
      water: { amount: 30, quality: 80, location: '河边' },
      wood: { amount: 20, quality: 70, location: '山林' },
      stone: { amount: 10, quality: 85, location: '矿场' },
      cloth: { amount: 15, quality: 65, location: '工坊' },
      metal: { amount: 5, quality: 90, location: '工坊' },
      medicine: { amount: 3, quality: 75, location: '祠堂' },
      tools: { amount: 8, quality: 70, durability: 80, location: '工坊' }
    };

    for (const [type, config] of Object.entries(initialResources)) {
      this.resources.set(type, {
        type: type,
        amount: config.amount,
        quality: config.quality,
        durability: config.durability || null,
        location: config.location,
        lastUpdated: this.gameEngine.currentTime,
        reservedAmount: 0, // 被预订但未使用的数量
        productionRate: 0,
        consumptionRate: RESOURCE_TYPES[type].dailyConsumption || 0
      });
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (this.gameEngine.eventSystem) {
      this.gameEngine.eventSystem.on('timeAdvanced', (timeData) => {
        this.simulateDecay(timeData.deltaTime);
        this.updateProduction(timeData);
        this.checkShortages();
      });

      this.gameEngine.eventSystem.on('weatherChanged', (weather) => {
        this.applyWeatherEffects(weather);
      });

      this.gameEngine.eventSystem.on('seasonChanged', (season) => {
        this.applySeasonalEffects(season);
      });
    }
  }

  /**
   * 添加资源
   * @param {string} type - 资源类型
   * @param {number} amount - 数量
   * @param {number} quality - 品质 (0-100)
   * @param {string} source - 来源描述
   * @returns {boolean} - 是否成功添加
   */
  addResource(type, amount, quality = 70, source = '未知来源') {
    if (!RESOURCE_TYPES[type]) {
      console.warn(`⚠️ 未知的资源类型: ${type}`);
      return false;
    }

    if (amount <= 0) {
      console.warn(`⚠️ 无效的资源数量: ${amount}`);
      return false;
    }

    const resource = this.resources.get(type);
    if (resource) {
      // 按品质加权平均计算新的品质
      const totalAmount = resource.amount + amount;
      const newQuality = (resource.quality * resource.amount + quality * amount) / totalAmount;
      
      resource.amount = totalAmount;
      resource.quality = Math.min(100, newQuality);
      resource.lastUpdated = this.gameEngine.currentTime;
    } else {
      // 新资源类型
      this.resources.set(type, {
        type: type,
        amount: amount,
        quality: quality,
        location: '仓库',
        lastUpdated: this.gameEngine.currentTime,
        reservedAmount: 0,
        productionRate: 0,
        consumptionRate: RESOURCE_TYPES[type].dailyConsumption || 0
      });
    }

    // 记录到日志
    this.logResourceChange(type, amount, '获得', source);
    
    // 触发事件
    this.gameEngine.eventSystem?.emit('resourceAdded', {
      type: type,
      amount: amount,
      quality: quality,
      source: source,
      currentAmount: this.resources.get(type).amount
    });

    // 检查是否解除短缺警报
    if (this.shortageAlerts.has(type)) {
      const criticalThreshold = RESOURCE_TYPES[type].critical_threshold || 10;
      if (this.resources.get(type).amount >= criticalThreshold * 1.5) {
        this.shortageAlerts.delete(type);
        console.log(`✅ ${RESOURCE_TYPES[type].name}短缺警报已解除`);
      }
    }

    return true;
  }

  /**
   * 消耗资源
   * @param {string} type - 资源类型
   * @param {number} amount - 消耗数量
   * @param {string} purpose - 用途描述
   * @returns {boolean} - 是否成功消耗
   */
  consumeResource(type, amount, purpose = '日常消耗') {
    const resource = this.resources.get(type);
    if (!resource) {
      console.warn(`⚠️ 没有找到资源: ${RESOURCE_TYPES[type]?.name || type}`);
      return false;
    }

    if (resource.amount < amount) {
      console.warn(`⚠️ ${RESOURCE_TYPES[type].name}不足: 需要${amount}，现有${resource.amount}`);
      return false;
    }

    // 消耗资源
    resource.amount -= amount;
    resource.lastUpdated = this.gameEngine.currentTime;

    // 记录到日志
    this.logResourceChange(type, -amount, '消耗', purpose);

    // 触发事件
    this.gameEngine.eventSystem?.emit('resourceConsumed', {
      type: type,
      amount: amount,
      purpose: purpose,
      remainingAmount: resource.amount
    });

    return true;
  }

  /**
   * 预订资源（暂时锁定，但不立即消耗）
   * @param {string} type - 资源类型
   * @param {number} amount - 预订数量
   * @returns {string|null} - 预订ID或null
   */
  reserveResource(type, amount) {
    const resource = this.resources.get(type);
    if (!resource || resource.amount - resource.reservedAmount < amount) {
      return null;
    }

    const reservationId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    resource.reservedAmount += amount;

    return reservationId;
  }

  /**
   * 取消预订
   * @param {string} type - 资源类型
   * @param {number} amount - 取消数量
   */
  cancelReservation(type, amount) {
    const resource = this.resources.get(type);
    if (resource) {
      resource.reservedAmount = Math.max(0, resource.reservedAmount - amount);
    }
  }

  /**
   * 执行预订（将预订转为实际消耗）
   * @param {string} type - 资源类型
   * @param {number} amount - 数量
   * @param {string} purpose - 用途
   * @returns {boolean} - 是否成功
   */
  executeReservation(type, amount, purpose) {
    const resource = this.resources.get(type);
    if (!resource || resource.reservedAmount < amount) {
      return false;
    }

    resource.reservedAmount -= amount;
    return this.consumeResource(type, amount, purpose);
  }

  /**
   * 生产资源
   * @param {Object} productionConfig - 生产配置
   * @returns {Object} - 生产结果
   */
  produceResource(productionConfig) {
    const {
      type,
      amount,
      quality = 70,
      requiredResources = {},
      skill = null,
      character = null,
      location = null,
      weather = null
    } = productionConfig;

    // 检查必需资源
    for (const [reqType, reqAmount] of Object.entries(requiredResources)) {
      if (!this.hasResource(reqType, reqAmount)) {
        return {
          success: false,
          reason: `缺少必需资源: ${RESOURCE_TYPES[reqType]?.name || reqType}`,
          missing: { type: reqType, needed: reqAmount, available: this.getResourceAmount(reqType) }
        };
      }
    }

    // 计算生产效率
    let efficiency = BALANCE_CONFIG.PRODUCTION.baseEfficiency;
    
    // 技能加成
    if (skill && character) {
      const skillLevel = character.getSkillLevel(skill);
      efficiency += skillLevel * BALANCE_CONFIG.PRODUCTION.skillBonus;
    }

    // 天气影响
    if (weather && WEATHER_SYSTEM.EFFECTS[weather]) {
      efficiency *= WEATHER_SYSTEM.EFFECTS[weather].workEfficiency;
    }

    // 工具加成
    if (this.hasResource('tools', 1)) {
      efficiency += BALANCE_CONFIG.PRODUCTION.toolBonus;
      // 消耗工具耐久度
      this.degradeTools(0.1);
    }

    // 消耗必需资源
    for (const [reqType, reqAmount] of Object.entries(requiredResources)) {
      this.consumeResource(reqType, reqAmount, `生产${RESOURCE_TYPES[type].name}`);
    }

    // 计算实际产量
    const actualAmount = Math.floor(amount * efficiency);
    const actualQuality = Math.min(100, quality + (efficiency - 1) * 20);

    // 添加生产的资源
    this.addResource(type, actualAmount, actualQuality, '本地生产');

    return {
      success: true,
      produced: { type, amount: actualAmount, quality: actualQuality },
      efficiency: efficiency,
      consumed: requiredResources
    };
  }

  /**
   * 检查是否有足够的资源
   * @param {string} type - 资源类型
   * @param {number} amount - 需要的数量
   * @returns {boolean}
   */
  hasResource(type, amount) {
    const resource = this.resources.get(type);
    return resource && (resource.amount - resource.reservedAmount) >= amount;
  }

  /**
   * 获取资源数量
   * @param {string} type - 资源类型
   * @returns {number}
   */
  getResourceAmount(type) {
    const resource = this.resources.get(type);
    return resource ? resource.amount : 0;
  }

  /**
   * 获取可用资源数量（扣除预订）
   * @param {string} type - 资源类型
   * @returns {number}
   */
  getAvailableResourceAmount(type) {
    const resource = this.resources.get(type);
    return resource ? resource.amount - resource.reservedAmount : 0;
  }

  /**
   * 获取资源状态
   * @param {string} type - 资源类型，为空则返回所有资源
   * @returns {Object|Map}
   */
  getResourceStatus(type = null) {
    if (type) {
      const resource = this.resources.get(type);
      if (!resource) return null;

      const config = RESOURCE_TYPES[type];
      return {
        ...resource,
        name: config.name,
        description: config.description,
        category: config.category,
        available: resource.amount - resource.reservedAmount,
        criticalThreshold: config.critical_threshold || 10,
        isShortage: this.shortageAlerts.has(type),
        dailyConsumption: config.dailyConsumption || 0,
        estimatedDays: config.dailyConsumption ? 
          Math.floor(resource.amount / config.dailyConsumption) : null
      };
    }

    // 返回所有资源状态
    const allStatus = new Map();
    for (const [resourceType, resource] of this.resources) {
      allStatus.set(resourceType, this.getResourceStatus(resourceType));
    }
    return allStatus;
  }

  /**
   * 模拟资源衰减
   * @param {number} deltaTime - 时间增量（小时）
   */
  simulateDecay(deltaTime) {
    const hoursInDay = 24;
    const decayFactor = deltaTime / hoursInDay;

    for (const [type, resource] of this.resources) {
      const config = RESOURCE_TYPES[type];
      
      // 可消耗品的自然衰减
      if (config.category === 'consumable' && config.storageDecay) {
        const decayAmount = resource.amount * config.storageDecay * decayFactor;
        resource.amount = Math.max(0, resource.amount - decayAmount);
        
        if (decayAmount > 0.1) {
          this.logResourceChange(type, -decayAmount, '自然衰减', '储存损耗');
        }
      }

      // 工具耐久度衰减
      if (config.category === 'equipment' && resource.durability !== null) {
        resource.durability = Math.max(0, resource.durability - 0.1 * decayFactor);
        
        // 耐久度影响效率
        if (resource.durability < 20) {
          console.warn(`⚠️ ${config.name}即将损坏，当前耐久度: ${resource.durability.toFixed(1)}`);
        }
      }

      resource.lastUpdated = this.gameEngine.currentTime;
    }
  }

  /**
   * 应用天气影响
   * @param {string} weather - 天气类型
   */
  applyWeatherEffects(weather) {
    const effects = WEATHER_SYSTEM.EFFECTS[weather];
    if (!effects) return;

    // 雨天增加水源
    if (effects.waterBonus) {
      this.addResource('water', effects.waterBonus, 90, '天然降水');
    }

    // 恶劣天气可能损坏露天储存的资源
    if (effects.danger) {
      const vulnerableResources = ['food', 'cloth'];
      for (const type of vulnerableResources) {
        if (this.resources.has(type)) {
          const lossAmount = this.resources.get(type).amount * 0.01;
          if (lossAmount > 0.1) {
            this.consumeResource(type, lossAmount, '恶劣天气损失');
          }
        }
      }
    }
  }

  /**
   * 应用季节性影响
   * @param {string} season - 季节
   */
  applySeasonalEffects(season) {
    // 季节性资源产量修正
    const seasonalBonuses = {
      '春季': { food: 1.1, medicine: 1.3 },
      '夏季': { food: 1.3, water: 0.9 },
      '秋季': { food: 1.5, wood: 1.2 },
      '冬季': { food: 0.7, water: 0.8, medicine: 0.6 }
    };

    const bonuses = seasonalBonuses[season] || {};
    for (const [type, modifier] of Object.entries(bonuses)) {
      const resource = this.resources.get(type);
      if (resource) {
        resource.productionRate = (resource.productionRate || 1.0) * modifier;
      }
    }

    console.log(`🌸 季节变更为${season}，资源产量已调整`);
  }

  /**
   * 检查资源短缺
   */
  checkShortages() {
    for (const [type, resource] of this.resources) {
      const config = RESOURCE_TYPES[type];
      const threshold = config.critical_threshold || 10;
      
      if (resource.amount <= threshold && !this.shortageAlerts.has(type)) {
        this.shortageAlerts.add(type);
        console.warn(`🚨 ${config.name}严重短缺！当前数量: ${resource.amount}, 警戒线: ${threshold}`);
        
        this.gameEngine.eventSystem?.emit('resourceShortage', {
          type: type,
          name: config.name,
          current: resource.amount,
          threshold: threshold
        });
      }
    }
  }

  /**
   * 降解工具耐久度
   * @param {number} amount - 降解量
   */
  degradeTools(amount) {
    const tools = this.resources.get('tools');
    if (tools && tools.durability !== null) {
      tools.durability = Math.max(0, tools.durability - amount);
      
      if (tools.durability <= 0) {
        this.consumeResource('tools', 1, '工具损坏');
        console.log('🔧 一件工具因磨损过度而损坏');
      }
    }
  }

  /**
   * 记录资源变化日志
   * @param {string} type - 资源类型
   * @param {number} amount - 变化数量
   * @param {string} action - 行为类型
   * @param {string} reason - 变化原因
   */
  logResourceChange(type, amount, action, reason) {
    const logEntry = {
      timestamp: this.gameEngine.currentTime,
      type: type,
      amount: amount,
      action: action,
      reason: reason,
      currentAmount: this.resources.get(type)?.amount || 0
    };

    this.consumptionLog.push(logEntry);
    
    // 保持日志数量在合理范围内
    if (this.consumptionLog.length > 1000) {
      this.consumptionLog = this.consumptionLog.slice(-500);
    }
  }

  /**
   * 更新生产速率
   * @param {Object} timeData - 时间数据
   */
  updateProduction(timeData) {
    // 这里可以根据时间、季节、人口等因素自动更新资源生产
    // 暂时保留接口，具体实现可以与建筑系统和人口系统集成
  }

  /**
   * 获取资源统计信息
   * @returns {Object}
   */
  getStatistics() {
    const stats = {
      totalResources: this.resources.size,
      shortages: this.shortageAlerts.size,
      categories: {},
      totalValue: 0,
      criticalResources: []
    };

    // 按类别统计
    for (const [type, resource] of this.resources) {
      const config = RESOURCE_TYPES[type];
      const category = config.category;
      
      if (!stats.categories[category]) {
        stats.categories[category] = { count: 0, totalAmount: 0 };
      }
      
      stats.categories[category].count++;
      stats.categories[category].totalAmount += resource.amount;

      // 计算总价值（简单计算）
      const baseValue = config.valuable ? 10 : config.rare ? 5 : 1;
      stats.totalValue += resource.amount * baseValue;

      // 检查紧急资源
      const threshold = config.critical_threshold || 10;
      if (resource.amount <= threshold) {
        stats.criticalResources.push({
          type: type,
          name: config.name,
          amount: resource.amount,
          threshold: threshold
        });
      }
    }

    return stats;
  }

  /**
   * 导出资源数据（用于存档）
   * @returns {Object}
   */
  exportData() {
    return {
      resources: Object.fromEntries(this.resources),
      shortageAlerts: Array.from(this.shortageAlerts),
      consumptionLog: this.consumptionLog.slice(-100), // 只保留最近100条记录
      tradeHistory: this.tradeHistory.slice(-50) // 只保留最近50条交易记录
    };
  }

  /**
   * 导入资源数据（用于读档）
   * @param {Object} data - 资源数据
   */
  importData(data) {
    if (data.resources) {
      this.resources = new Map(Object.entries(data.resources));
    }
    if (data.shortageAlerts) {
      this.shortageAlerts = new Set(data.shortageAlerts);
    }
    if (data.consumptionLog) {
      this.consumptionLog = data.consumptionLog;
    }
    if (data.tradeHistory) {
      this.tradeHistory = data.tradeHistory;
    }
  }

  /**
   * 清理过期数据
   */
  cleanup() {
    const currentTime = this.gameEngine.currentTime;
    const maxAge = 30 * 24; // 30天的小时数

    // 清理过期的消耗日志
    this.consumptionLog = this.consumptionLog.filter(
      entry => currentTime - entry.timestamp < maxAge
    );

    // 清理过期的交易记录
    this.tradeHistory = this.tradeHistory.filter(
      entry => currentTime - entry.timestamp < maxAge
    );
  }
}

export default ResourceSystem;