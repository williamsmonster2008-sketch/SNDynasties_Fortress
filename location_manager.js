/**
 * 地点管理器 - Phase 1
 * 职责: 加载 locations.json 蓝图，创建和管理地点实例
 */

import { Location } from './location_system.js';

export class LocationManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    
    // 地点蓝图数据 (来自 locations.json)
    this.locationBlueprints = null;
    
    // 地点实例 (运行时创建)
    this.locationInstances = new Map();
    
    // 地点类别索引
    this.categoryIndex = new Map();
    
    // 连接图
    this.connectionGraph = new Map();
    
    console.log('🗺️ LocationManager 初始化');
  }
  
  /**
   * 初始化 - 加载蓝图并创建实例
   */
  async initialize() {
    console.log('📦 开始加载地点蓝图...');
    
    try {
      // 1. 从 DataTableManager 加载 locations.json
      const blueprintData = await this.gameEngine.dataManager.dataTableManager.getLocations();
      this.locationBlueprints = blueprintData;
      
      console.log(`✅ 加载了 ${blueprintData.locations.length} 个地点蓝图`);
      
      // 2. 创建地点实例
      this._createLocationInstances();
      
      // 3. 建立地点连接
      this._createLocationConnections();
      
      // 4. 建立类别索引
      this._buildCategoryIndex();
      
      console.log('✅ LocationManager 初始化完成');
      console.log(`📍 创建了 ${this.locationInstances.size} 个地点实例`);
      
      return true;
    } catch (error) {
      console.error('❌ LocationManager 初始化失败:', error);
      return false;
    }
  }
  
  /**
   * 创建地点实例
   * @private
   */
  _createLocationInstances() {
    if (!this.locationBlueprints || !this.locationBlueprints.locations) {
      console.warn('⚠️ 没有地点蓝图数据');
      return;
    }
    
    for (const blueprint of this.locationBlueprints.locations) {
      const location = this._instantiateLocation(blueprint);
      if (location) {
        this.locationInstances.set(blueprint.id, location);
        console.log(`  ✓ 创建地点: ${blueprint.name} (${blueprint.id})`);
      }
    }
  }
  
  /**
   * 实例化单个地点
   * @private
   */
  _instantiateLocation(blueprint) {
    try {
      // 转换蓝图为 Location 构造函数参数
      const config = {
        type: blueprint.category,
        description: blueprint.description,
        capacity: blueprint.capacity.max || 20,  // Location类只需要一个数字
        // 从 attributes 映射到 Location 的属性
        comfort: blueprint.attributes?.comfort || 50,
        safety: blueprint.attributes?.safety || 50,
        cleanliness: blueprint.attributes?.cleanliness || 50,
        
        // 可用行为
        availableActions: blueprint.allowedActions || [],
        
        // 访问控制
        accessLevel: blueprint.isPublic ? 'public' : 'restricted',
        
        // 设施
        facilities: blueprint.facilities || {},
        
        // 资源
        resourceStorage: blueprint.resourceStorage || {},
        
        // 自定义属性
        customAttributes: blueprint.attributes || {}
      };
      
      const location = new Location(blueprint.name, config);
      
      // 保存原始蓝图引用
      location.blueprintId = blueprint.id;
      location.blueprint = blueprint;
      
      return location;
    } catch (error) {
      console.error(`❌ 创建地点失败: ${blueprint.name}`, error);
      return null;
    }
  }
  
  /**
   * 建立地点连接
   * @private
   */
  _createLocationConnections() {
    if (!this.locationBlueprints || !this.locationBlueprints.locations) return;
    
    for (const blueprint of this.locationBlueprints.locations) {
      const location = this.locationInstances.get(blueprint.id);
      if (!location) continue;
      
      // 初始化连接图
      this.connectionGraph.set(blueprint.id, new Map());
      
      // 建立连接
      if (blueprint.connections && Array.isArray(blueprint.connections)) {
        for (const conn of blueprint.connections) {
          const targetLocation = this.locationInstances.get(conn.to);
          if (targetLocation) {
            // 使用 Location 的 connectTo 方法
            location.connectTo(conn.to, conn.distance || 1, {
              travelCost: conn.travelCost || conn.distance || 1,
              roadQuality: conn.roadQuality || 'normal'
            });
            
            // 更新连接图
            this.connectionGraph.get(blueprint.id).set(conn.to, conn.distance || 1);
            // ✨ 关键：建立反向连接
            if (!this.connectionGraph.has(conn.to)) {
              this.connectionGraph.set(conn.to, new Map());
            }
            this.connectionGraph.get(conn.to).set(blueprint.id, conn.distance || 1);
            
            console.log(`  ✓ 连接: ${blueprint.name} → ${conn.to} (距离: ${conn.distance})`);
          }
        }
      }
    }
  }
  
  /**
   * 建立类别索引
   * @private
   */
  _buildCategoryIndex() {
    for (const [id, location] of this.locationInstances) {
      const category = location.blueprint.category;
      
      if (!this.categoryIndex.has(category)) {
        this.categoryIndex.set(category, []);
      }
      
      this.categoryIndex.get(category).push(id);
    }
    
    console.log('📑 地点类别索引:', Object.fromEntries(this.categoryIndex));
  }
  
  /**
   * 获取地点实例
   * @param {string} locationId - 地点ID
   * @returns {Location|null}
   */
  getLocation(locationId) {
    return this.locationInstances.get(locationId) || null;
  }
  
  /**
   * 获取地点蓝图
   * @param {string} locationId - 地点ID
   * @returns {Object|null}
   */
  getBlueprint(locationId) {
    if (!this.locationBlueprints) return null;
    return this.locationBlueprints.locations.find(bp => bp.id === locationId) || null;
  }
  
  /**
   * 获取所有地点
   * @returns {Map}
   */
  getAllLocations() {
    return this.locationInstances;
  }
  
  /**
   * 按类别获取地点
   * @param {string} category - 类别
   * @returns {Array<Location>}
   */
  getLocationsByCategory(category) {
    const ids = this.categoryIndex.get(category) || [];
    return ids.map(id => this.locationInstances.get(id)).filter(Boolean);
  }
  
  /**
   * 检查地点是否存在
   * @param {string} locationId - 地点ID
   * @returns {boolean}
   */
  hasLocation(locationId) {
    return this.locationInstances.has(locationId);
  }
  
  /**
   * 移动角色到地点
   * @param {Character} character - 角色对象
   * @param {string} targetLocationId - 目标地点ID
   * @returns {Object} 移动结果
   */
  moveCharacter(character, targetLocationId) {
    const currentLocationId = character.currentLocation;
    const currentLocation = this.getLocation(currentLocationId);
    const targetLocation = this.getLocation(targetLocationId);
    
    // 验证
    if (!targetLocation) {
      return { 
        success: false, 
        reason: `地点不存在: ${targetLocationId}` 
      };
    }
    
    // 离开当前地点
    if (currentLocation) {
      const leaveResult = currentLocation.leave(character.id);
      if (!leaveResult.success) {
        return { 
          success: false, 
          reason: `无法离开 ${currentLocation.name}` 
        };
      }
    }
    
    // 进入新地点
    const enterResult = targetLocation.enter(character.id);
    if (!enterResult.success) {
      // 回滚
      if (currentLocation) {
        currentLocation.enter(character.id);
      }
      return { 
        success: false, 
        reason: enterResult.reason 
      };
    }
    
    // 更新角色位置
    character.currentLocation = targetLocationId;
    
    console.log(`🚶 ${character.name} 从 ${currentLocationId || '无'} 移动到 ${targetLocation.name}`);
    
    return {
      success: true,
      from: currentLocationId,
      to: targetLocationId,
      location: targetLocation,
      effects: enterResult.effects
    };
  }
  
  /**
   * 检查两地点是否连通
   * @param {string} fromId - 起始地点ID
   * @param {string} toId - 目标地点ID
   * @returns {boolean}
   */
  areConnected(fromId, toId) {
    const connections = this.connectionGraph.get(fromId);
    return connections ? connections.has(toId) : false;
  }
  
  /**
   * 寻找路径 (BFS)
   * @param {string} fromId - 起始地点
   * @param {string} toId - 目标地点
   * @returns {Array|null} 路径
   */
  findPath(fromId, toId) {
    if (fromId === toId) return [fromId];
    
    const visited = new Set();
    const queue = [[fromId]];
    
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      
      if (visited.has(current)) continue;
      visited.add(current);
      
      const connections = this.connectionGraph.get(current);
      if (!connections) continue;
      
      for (const neighbor of connections.keys()) {
        if (neighbor === toId) {
          return [...path, neighbor];
        }
        
        if (!visited.has(neighbor)) {
          queue.push([...path, neighbor]);
        }
      }
    }
    
    return null;
  }
  
  /**
   * 计算移动成本
   * @param {Array} path - 路径
   * @returns {number} 成本
   */
  calculatePathCost(path) {
    if (!path || path.length < 2) return 0;
    
    let totalCost = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const connections = this.connectionGraph.get(path[i]);
      if (connections && connections.has(path[i + 1])) {
        totalCost += connections.get(path[i + 1]);
      }
    }
    
    return totalCost;
  }
  
  /**
   * 获取地点统计信息
   * @returns {Object}
   */
  getStatistics() {
    const stats = {
      totalLocations: this.locationInstances.size,
      byCategory: {},
      totalConnections: 0,
      averageCapacity: 0,
      publicLocations: 0,
      privateLocations: 0
    };
    
    // 按类别统计
    for (const [category, ids] of this.categoryIndex) {
      stats.byCategory[category] = ids.length;
    }
    
    // 其他统计
    let totalCapacity = 0;
    for (const location of this.locationInstances.values()) {
      totalCapacity += location.capacity.max || 0;
      
      if (location.accessLevel === 'public') {
        stats.publicLocations++;
      } else {
        stats.privateLocations++;
      }
    }
    
    stats.averageCapacity = totalCapacity / this.locationInstances.size;
    
    // 连接统计
    for (const connections of this.connectionGraph.values()) {
      stats.totalConnections += connections.size;
    }
    
    return stats;
  }
  
  /**
   * 获取地点人口分布
   * @returns {Object}
   */
  getPopulationDistribution() {
    const distribution = {};
    
    for (const [id, location] of this.locationInstances) {
      distribution[id] = {
        name: location.name,
        count: location.currentOccupants.size,
        capacity: location.capacity.max,
        utilization: (location.currentOccupants.size / location.capacity.max * 100).toFixed(1) + '%',
        occupants: Array.from(location.currentOccupants)
      };
    }
    
    return distribution;
  }
  
  /**
   * 导出为JSON
   * @returns {Object}
   */
  exportToJSON() {
    return {
      locationCount: this.locationInstances.size,
      locations: Array.from(this.locationInstances.entries()).map(([id, location]) => ({
        id: id,
        name: location.name,
        type: location.type,
        occupants: Array.from(location.currentOccupants),
        capacity: location.capacity,
        comfort: location.comfort,
        safety: location.safety,
        cleanliness: location.cleanliness
      })),
      connections: Array.from(this.connectionGraph.entries()).map(([from, connections]) => ({
        from: from,
        to: Array.from(connections.entries()).map(([to, distance]) => ({ to, distance }))
      })),
      statistics: this.getStatistics()
    };
  }
}
