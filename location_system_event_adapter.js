/**
 * location_system_event_adapter.js - 地点系统事件适配器
 * 
 * 功能：为现有的地点系统添加事件支持
 * 设计：非侵入性适配器，包装现有方法，添加事件发射
 */

/**
 * 为地点系统添加事件支持
 * @param {Object} locationSystem - 地点系统实例
 * @param {Object} eventBus - 事件总线实例
 */
export function addEventSupportToLocationSystem(locationSystem, eventBus) {
  if (!locationSystem || !eventBus) {
    console.warn('⚠️ 地点系统或事件总线未提供，跳过事件适配');
    return;
  }

  console.log('📍 为地点系统添加事件支持...');

  // 包装角色移动方法
  if (locationSystem.moveCharacter) {
    const originalMoveCharacter = locationSystem.moveCharacter.bind(locationSystem);
    locationSystem.moveCharacter = function(characterId, newLocation) {
      const oldLocation = this.getCharacterLocation?.(characterId);
      const result = originalMoveCharacter(characterId, newLocation);
      
      if (result && result.success !== false) {
        eventBus.emit('characterMoved', {
          characterId,
          fromLocation: oldLocation,
          toLocation: newLocation,
          timestamp: Date.now(),
          success: true
        });

        eventBus.emit('locationUpdated', {
          location: newLocation,
          action: 'character_entered',
          characterId,
          timestamp: Date.now()
        });

        if (oldLocation && oldLocation !== newLocation) {
          eventBus.emit('locationUpdated', {
            location: oldLocation,
            action: 'character_left',
            characterId,
            timestamp: Date.now()
          });
        }
      } else {
        eventBus.emit('characterMoveBlocked', {
          characterId,
          targetLocation: newLocation,
          reason: result?.reason || '移动失败',
          timestamp: Date.now()
        });
      }
      
      return result;
    };
  }

  // 包装地点容量更新方法
  if (locationSystem.updateCapacity) {
    const originalUpdateCapacity = locationSystem.updateCapacity.bind(locationSystem);
    locationSystem.updateCapacity = function(locationName, newCapacity) {
      const oldCapacity = this.getLocationCapacity?.(locationName) || 0;
      const result = originalUpdateCapacity(locationName, newCapacity);
      
      eventBus.emit('locationCapacityChanged', {
        locationName,
        oldCapacity,
        newCapacity,
        change: newCapacity - oldCapacity,
        timestamp: Date.now()
      });
      
      return result;
    };
  }

  // 包装地点状态更新方法
  if (locationSystem.updateLocationState) {
    const originalUpdateLocationState = locationSystem.updateLocationState.bind(locationSystem);
    locationSystem.updateLocationState = function(locationName, stateChanges) {
      const oldState = this.getLocationState?.(locationName);
      const result = originalUpdateLocationState(locationName, stateChanges);
      
      eventBus.emit('locationStateChanged', {
        locationName,
        oldState,
        newState: this.getLocationState?.(locationName),
        changes: stateChanges,
        timestamp: Date.now()
      });
      
      return result;
    };
  }

  // 包装建筑建设方法
  if (locationSystem.constructBuilding) {
    const originalConstructBuilding = locationSystem.constructBuilding.bind(locationSystem);
    locationSystem.constructBuilding = function(locationName, buildingType, options = {}) {
      const result = originalConstructBuilding(locationName, buildingType, options);
      
      if (result && result.success !== false) {
        eventBus.emit('buildingConstructed', {
          locationName,
          buildingType,
          options,
          result,
          timestamp: Date.now()
        });

        eventBus.emit('locationUpdated', {
          location: locationName,
          action: 'building_constructed',
          buildingType,
          timestamp: Date.now()
        });
      } else {
        eventBus.emit('constructionFailed', {
          locationName,
          buildingType,
          reason: result?.reason || '建设失败',
          timestamp: Date.now()
        });
      }
      
      return result;
    };
  }

  // 包装地点事件触发方法
  if (locationSystem.triggerLocationEvent) {
    const originalTriggerLocationEvent = locationSystem.triggerLocationEvent.bind(locationSystem);
    locationSystem.triggerLocationEvent = function(locationName, eventType, eventData = {}) {
      const result = originalTriggerLocationEvent(locationName, eventType, eventData);
      
      eventBus.emit('locationEventTriggered', {
        locationName,
        eventType,
        eventData,
        result,
        timestamp: Date.now()
      });
      
      return result;
    };
  }

  // 添加地点监控方法
  locationSystem.startLocationMonitoring = function() {
    setInterval(() => {
      const allLocations = this.getAllLocations?.();
      if (allLocations) {
        Object.entries(allLocations).forEach(([locationName, locationData]) => {
          // 检查容量警告
          const occupancy = locationData.currentOccupancy || 0;
          const capacity = locationData.capacity || 100;
          const occupancyRate = occupancy / capacity;

          if (occupancyRate > 0.9) {
            eventBus.emit('locationCapacityWarning', {
              locationName,
              occupancy,
              capacity,
              occupancyRate,
              level: 'critical',
              timestamp: Date.now()
            });
          } else if (occupancyRate > 0.7) {
            eventBus.emit('locationCapacityWarning', {
              locationName,
              occupancy,
              capacity,
              occupancyRate,
              level: 'warning',
              timestamp: Date.now()
            });
          }

          // 检查地点状态
          if (locationData.needsMaintenance) {
            eventBus.emit('locationMaintenanceNeeded', {
              locationName,
              maintenanceType: locationData.maintenanceType || 'general',
              urgency: locationData.maintenanceUrgency || 'normal',
              timestamp: Date.now()
            });
          }
        });
      }
    }, 30000); // 每30秒检查一次
  };

  // 启动地点监控
  if (locationSystem.startLocationMonitoring) {
    locationSystem.startLocationMonitoring();
  }

  console.log('✅ 地点系统事件支持已添加');
}

export default addEventSupportToLocationSystem;