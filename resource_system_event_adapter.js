/**
 * resource_system_event_adapter.js - 资源系统事件适配器
 * 
 * 功能：为现有的 resource_system.js 添加事件支持
 * 原则：不破坏现有API，只添加事件发射功能
 * 
 * 使用方法：
 * 1. 导入此适配器
 * 2. 调用 addEventSupportToResourceSystem() 为资源系统添加事件支持
 * 3. 现有代码无需修改，自动获得事件通知能力
 */

import { DEFAULT_CONFIG } from './gameConfig.js';

/**
 * 为资源系统添加事件支持
 * @param {ResourceSystem} resourceSystem - 资源系统对象
 * @param {EventBus} eventBus - 事件总线
 */
export function addEventSupportToResourceSystem(resourceSystem, eventBus) {
  if (!resourceSystem || !eventBus) {
    console.warn('资源系统或事件总线不存在，跳过事件支持添加');
    return;
  }
  
  // 避免重复添加
  if (resourceSystem._eventSupported) {
    return;
  }
  
  resourceSystem._eventBus = eventBus;
  resourceSystem._eventSupported = true;
  resourceSystem._originalMethods = {};
  
  // 包装现有方法，添加事件发射
  wrapResourceSystemMethods(resourceSystem, eventBus);
  
  console.log('📡 资源系统已添加事件支持');
}

/**
 * 包装资源系统方法，添加事件发射
 */
function wrapResourceSystemMethods(resourceSystem, eventBus) {
  // 1. 包装 addResource 方法
  if (resourceSystem.addResource && typeof resourceSystem.addResource === 'function') {
    resourceSystem._originalMethods.addResource = resourceSystem.addResource;
    
    resourceSystem.addResource = function(type, amount, quality = 70, source = '未知') {
      const oldAmount = this.getResourceAmount ? this.getResourceAmount(type) : 0;
      
      // 调用原方法
      const result = resourceSystem._originalMethods.addResource.call(this, type, amount, quality, source);
      
      const newAmount = this.getResourceAmount ? this.getResourceAmount(type) : 0;
      
      // 发射资源增加事件
      eventBus.emit('resourceAdded', {
        resourceType: type,
        amount: amount,
        quality: quality,
        source: source,
        oldAmount: oldAmount,
        newAmount: newAmount,
        timestamp: Date.now()
      }, {
        priority: 2, // NORMAL priority
        source: 'resource_system',
        category: 'resource'
      });
      
      // 发射通用资源变更事件
      emitResourceChangedEvent(eventBus, type, oldAmount, newAmount, amount, source, 'added');
      
      // 检查资源状况
      checkResourceStatus(eventBus, type, newAmount, 'added');
      
      return result;
    };
  }
  
  // 2. 包装 consumeResource 方法
  if (resourceSystem.consumeResource && typeof resourceSystem.consumeResource === 'function') {
    resourceSystem._originalMethods.consumeResource = resourceSystem.consumeResource;
    
    resourceSystem.consumeResource = function(type, amount, reason = '未知') {
      const oldAmount = this.getResourceAmount ? this.getResourceAmount(type) : 0;
      
      // 调用原方法
      const result = resourceSystem._originalMethods.consumeResource.call(this, type, amount, reason);
      
      const newAmount = this.getResourceAmount ? this.getResourceAmount(type) : 0;
      const actualConsumed = oldAmount - newAmount;
      
      // 发射资源消耗事件
      eventBus.emit('resourceConsumed', {
        resourceType: type,
        requestedAmount: amount,
        actualConsumed: actualConsumed,
        reason: reason,
        oldAmount: oldAmount,
        newAmount: newAmount,
        success: result,
        timestamp: Date.now()
      }, {
        priority: 2, // NORMAL priority
        source: 'resource_system',
        category: 'resource'
      });
      
      // 发射通用资源变更事件
      if (actualConsumed > 0) {
        emitResourceChangedEvent(eventBus, type, oldAmount, newAmount, -actualConsumed, reason, 'consumed');
      }
      
      // 检查资源状况
      checkResourceStatus(eventBus, type, newAmount, 'consumed');
      
      // 消耗失败事件
      if (!result && amount > 0) {
        eventBus.emit('resourceConsumptionFailed', {
          resourceType: type,
          requestedAmount: amount,
          availableAmount: oldAmount,
          reason: reason,
          timestamp: Date.now()
        }, {
          priority: 1, // HIGH priority
          source: 'resource_system'
        });
      }
      
      return result;
    };
  }
  
  // 3. 包装 produceResource 方法
  if (resourceSystem.produceResource && typeof resourceSystem.produceResource === 'function') {
    resourceSystem._originalMethods.produceResource = resourceSystem.produceResource;
    
    resourceSystem.produceResource = function(type, amount, quality, productionConfig = {}) {
      const oldAmount = this.getResourceAmount ? this.getResourceAmount(type) : 0;
      
      // 调用原方法
      const result = resourceSystem._originalMethods.produceResource.call(this, type, amount, quality, productionConfig);
      
      if (result && result.success) {
        const newAmount = this.getResourceAmount ? this.getResourceAmount(type) : 0;
        
        // 发射资源生产事件
        eventBus.emit('resourceProduced', {
          resourceType: type,
          targetAmount: amount,
          actualAmount: result.produced?.amount || 0,
          quality: result.produced?.quality || quality,
          efficiency: result.efficiency || 1.0,
          consumedResources: result.consumed || {},
          oldAmount: oldAmount,
          newAmount: newAmount,
          productionConfig: productionConfig,
          timestamp: Date.now()
        }, {
          priority: 2, // NORMAL priority
          source: 'resource_production',
          category: 'production'
        });
        
        // 发射通用资源变更事件
        const actualProduced = result.produced?.amount || 0;
        if (actualProduced > 0) {
          emitResourceChangedEvent(eventBus, type, oldAmount, newAmount, actualProduced, '生产', 'produced');
        }
      } else {
        // 生产失败事件
        eventBus.emit('resourceProductionFailed', {
          resourceType: type,
          targetAmount: amount,
          reason: result?.reason || '未知原因',
          missingResources: result?.missing || {},
          productionConfig: productionConfig,
          timestamp: Date.now()
        }, {
          priority: 1, // HIGH priority
          source: 'resource_production'
        });
      }
      
      return result;
    };
  }
  
  // 4. 包装资源交易方法
  if (resourceSystem.tradeResource && typeof resourceSystem.tradeResource === 'function') {
    resourceSystem._originalMethods.tradeResource = resourceSystem.tradeResource;
    
    resourceSystem.tradeResource = function(giveType, giveAmount, receiveType, receiveAmount) {
      const oldGiveAmount = this.getResourceAmount ? this.getResourceAmount(giveType) : 0;
      const oldReceiveAmount = this.getResourceAmount ? this.getResourceAmount(receiveType) : 0;
      
      // 调用原方法
      const result = resourceSystem._originalMethods.tradeResource.call(this, giveType, giveAmount, receiveType, receiveAmount);
      
      if (result && result.success) {
        const newGiveAmount = this.getResourceAmount ? this.getResourceAmount(giveType) : 0;
        const newReceiveAmount = this.getResourceAmount ? this.getResourceAmount(receiveType) : 0;
        
        // 发射资源交易事件
        eventBus.emit('resourceTraded', {
          giveResource: {
            type: giveType,
            amount: giveAmount,
            oldAmount: oldGiveAmount,
            newAmount: newGiveAmount
          },
          receiveResource: {
            type: receiveType,
            amount: receiveAmount,
            oldAmount: oldReceiveAmount,
            newAmount: newReceiveAmount
          },
          tradeRate: receiveAmount / giveAmount,
          timestamp: Date.now()
        }, {
          priority: 2, // NORMAL priority
          source: 'resource_trade',
          category: 'trade'
        });
      }
      
      return result;
    };
  }
  
  // 5. 包装资源衰减方法
  if (resourceSystem.simulateDecay && typeof resourceSystem.simulateDecay === 'function') {
    resourceSystem._originalMethods.simulateDecay = resourceSystem.simulateDecay;
    
    resourceSystem.simulateDecay = function(deltaTime) {
      const oldResources = {};
      if (this.resources) {
        this.resources.forEach((data, type) => {
          oldResources[type] = data.amount;
        });
      }
      
      // 调用原方法
      const result = resourceSystem._originalMethods.simulateDecay.call(this, deltaTime);
      
      // 检查衰减影响
      const decayEffects = [];
      if (this.resources) {
        this.resources.forEach((data, type) => {
          const oldAmount = oldResources[type] || 0;
          const newAmount = data.amount;
          const decay = oldAmount - newAmount;
          
          if (decay > 0) {
            decayEffects.push({
              resourceType: type,
              oldAmount: oldAmount,
              newAmount: newAmount,
              decayAmount: decay,
              decayRate: oldAmount > 0 ? decay / oldAmount : 0
            });
          }
        });
      }
      
      // 发射资源衰减事件
      if (decayEffects.length > 0) {
        eventBus.emit('resourceDecayed', {
          deltaTime: deltaTime,
          decayEffects: decayEffects,
          totalDecayEvents: decayEffects.length,
          timestamp: Date.now()
        }, {
          priority: 3, // LOW priority
          source: 'resource_decay',
          category: 'maintenance'
        });
        
        // 为每个受影响的资源发射变更事件
        decayEffects.forEach(effect => {
          emitResourceChangedEvent(
            eventBus, 
            effect.resourceType, 
            effect.oldAmount, 
            effect.newAmount, 
            -effect.decayAmount, 
            '自然衰减', 
            'decayed'
          );
        });
      }
      
      return result;
    };
  }
}

/**
 * 发射通用资源变更事件
 */
function emitResourceChangedEvent(eventBus, type, oldAmount, newAmount, change, source, changeType) {
  eventBus.emit('resourceChanged', {
    resourceType: type,
    oldAmount: oldAmount,
    newAmount: newAmount,
    change: change,
    changeType: changeType, // 'added', 'consumed', 'produced', 'decayed', 'traded'
    source: source,
    timestamp: Date.now()
  }, {
    priority: 2, // NORMAL priority
    source: 'resource_system',
    category: 'resource'
  });
}

/**
 * 检查资源状况并发射相关事件
 */
function checkResourceStatus(eventBus, type, currentAmount, triggerAction) {
  const resourceConfig = DEFAULT_CONFIG.RESOURCE_TYPES?.[type];
  if (!resourceConfig) return;
  
  const criticalThreshold = resourceConfig.critical_threshold || 20;
  const abundanceThreshold = criticalThreshold * 3;
  
  // 资源短缺预警
  if (currentAmount <= criticalThreshold) {
    eventBus.emit('resourceShortage', {
      resourceType: type,
      currentAmount: currentAmount,
      criticalThreshold: criticalThreshold,
      severity: currentAmount === 0 ? 'critical' : currentAmount < criticalThreshold * 0.5 ? 'severe' : 'warning',
      triggerAction: triggerAction,
      timestamp: Date.now()
    }, {
      priority: currentAmount === 0 ? 0 : 1, // CRITICAL if depleted, HIGH if low
      source: 'resource_monitor',
      category: 'alert'
    });
  }
  
  // 资源充足通知
  if (currentAmount >= abundanceThreshold) {
    eventBus.emit('resourceAbundance', {
      resourceType: type,
      currentAmount: currentAmount,
      abundanceThreshold: abundanceThreshold,
      surplus: currentAmount - abundanceThreshold,
      triggerAction: triggerAction,
      timestamp: Date.now()
    }, {
      priority: 3, // LOW priority
      source: 'resource_monitor',
      category: 'status'
    });
  }
}

/**
 * 为资源系统添加定期状态检查
 * @param {ResourceSystem} resourceSystem - 资源系统
 * @param {EventBus} eventBus - 事件总线
 * @param {number} interval - 检查间隔（毫秒）
 */
export function addPeriodicResourceMonitoring(resourceSystem, eventBus, interval = 30000) {
  if (resourceSystem._monitoringInterval) {
    clearInterval(resourceSystem._monitoringInterval);
  }
  
  resourceSystem._monitoringInterval = setInterval(() => {
    performResourceHealthCheck(resourceSystem, eventBus);
  }, interval);
  
  console.log(`📊 资源系统定期监控已启动，间隔 ${interval}ms`);
}

/**
 * 执行资源健康检查
 */
function performResourceHealthCheck(resourceSystem, eventBus) {
  const healthReport = {
    timestamp: Date.now(),
    totalResources: 0,
    shortageCount: 0,
    abundanceCount: 0,
    criticalResources: [],
    abundantResources: [],
    resourceSummary: {}
  };
  
  if (resourceSystem.resources) {
    resourceSystem.resources.forEach((data, type) => {
      healthReport.totalResources++;
      healthReport.resourceSummary[type] = {
        amount: data.amount,
        quality: data.quality || 0,
        reserved: data.reservedAmount || 0
      };
      
      const resourceConfig = DEFAULT_CONFIG.RESOURCE_TYPES?.[type];
      if (resourceConfig) {
        const criticalThreshold = resourceConfig.critical_threshold || 20;
        const abundanceThreshold = criticalThreshold * 3;
        
        if (data.amount <= criticalThreshold) {
          healthReport.shortageCount++;
          healthReport.criticalResources.push({
            type: type,
            amount: data.amount,
            threshold: criticalThreshold
          });
        }
        
        if (data.amount >= abundanceThreshold) {
          healthReport.abundanceCount++;
          healthReport.abundantResources.push({
            type: type,
            amount: data.amount,
            threshold: abundanceThreshold
          });
        }
      }
    });
  }
  
  // 发射健康检查报告事件
  eventBus.emit('resourceHealthCheck', healthReport, {
    priority: 3, // LOW priority
    source: 'resource_monitor',
    category: 'report'
  });
  
  // 如果有严重短缺，发射紧急警报
  if (healthReport.shortageCount > 0) {
    const criticalShortages = healthReport.criticalResources.filter(r => r.amount === 0);
    if (criticalShortages.length > 0) {
      eventBus.emit('resourceCrisis', {
        depletedResources: criticalShortages,
        totalShortages: healthReport.shortageCount,
        timestamp: Date.now()
      }, {
        priority: 0, // CRITICAL priority
        source: 'resource_monitor',
        category: 'crisis'
      });
    }
  }
}

/**
 * 移除资源系统的事件支持
 * @param {ResourceSystem} resourceSystem - 资源系统对象
 */
export function removeEventSupportFromResourceSystem(resourceSystem) {
  if (!resourceSystem._eventSupported) return;
  
  // 恢复原始方法
  Object.entries(resourceSystem._originalMethods || {}).forEach(([methodName, originalMethod]) => {
    resourceSystem[methodName] = originalMethod;
  });
  
  // 停止定期监控
  if (resourceSystem._monitoringInterval) {
    clearInterval(resourceSystem._monitoringInterval);
    delete resourceSystem._monitoringInterval;
  }
  
  // 清理事件支持标记
  delete resourceSystem._eventSupported;
  delete resourceSystem._eventBus;
  delete resourceSystem._originalMethods;
  
  console.log('🔌 资源系统的事件支持已移除');
}

/**
 * 创建资源紧急情况事件
 * @param {ResourceSystem} resourceSystem - 资源系统
 * @param {EventBus} eventBus - 事件总线
 * @param {string} resourceType - 资源类型
 * @param {string} emergencyType - 紧急类型：'depletion', 'contamination', 'loss'
 * @param {Object} details - 详细信息
 */
export function emitResourceEmergencyEvent(resourceSystem, eventBus, resourceType, emergencyType, details = {}) {
  const currentAmount = resourceSystem.getResourceAmount ? resourceSystem.getResourceAmount(resourceType) : 0;
  
  eventBus.emit('resourceEmergency', {
    resourceType: resourceType,
    emergencyType: emergencyType,
    currentAmount: currentAmount,
    details: details,
    timestamp: Date.now()
  }, {
    priority: 0, // CRITICAL priority
    source: 'resource_emergency',
    category: 'crisis'
  });
  
  console.log(`🚨 资源紧急事件已发出: ${resourceType} - ${emergencyType}`);
}

/**
 * 批量添加资源变更监听器
 * @param {ResourceSystem} resourceSystem - 资源系统
 * @param {EventBus} eventBus - 事件总线
 * @param {Array} resourceTypes - 要监听的资源类型列表
 * @param {Function} callback - 回调函数
 */
export function addResourceChangeListeners(resourceSystem, eventBus, resourceTypes, callback) {
  const listeners = [];
  
  resourceTypes.forEach(resourceType => {
    const listenerId = eventBus.on('resourceChanged', (event) => {
      if (event.data.resourceType === resourceType) {
        callback(event.data);
      }
    }, {
      priority: 2,
      filter: (event) => event.data.resourceType === resourceType
    });
    
    listeners.push({ resourceType, listenerId });
  });
  
  console.log(`📡 已为 ${resourceTypes.length} 种资源添加变更监听器`);
  return listeners;
}

export default {
  addEventSupportToResourceSystem,
  removeEventSupportFromResourceSystem,
  addPeriodicResourceMonitoring,
  emitResourceEmergencyEvent,
  addResourceChangeListeners
};