/**
 * social_identity_system.js - 南北朝坞堡模拟器社会身份关系系统
 * 
 * 功能：管理角色间的社会身份关系（师徒、上下级、雇佣等）
 * 特点：与情感关系分离，专注于工作、学习、职业等场景下的身份定义
 * 
 * 架构定位：三层关系架构的第二层
 * - 第一层：血缘关系（FamilySystem）
 * - 第二层：社会身份（SocialIdentitySystem）← 当前模块
 * - 第三层：情感关系（EmotionalRelationshipSystem）
 */

import { Utils } from './utils_module.js';
import { DEFAULT_CONFIG } from './gameConfig.js';

/**
 * 社会身份类型枚举
 */
export const SocialIdentityType = {
  // 师徒关系
  MENTOR: 'mentor',           // 师父/导师
  STUDENT: 'student',         // 学生/徒弟
  
  // 职场关系
  BOSS: 'boss',               // 上级/老板
  EMPLOYEE: 'employee',       // 下属/雇员
  COLLEAGUE: 'colleague',     // 同事/平级
  
  // 雇佣关系
  EMPLOYER: 'employer',       // 雇主
  WORKER: 'worker',           // 雇工
  
  // 合作关系
  PARTNER: 'partner',         // 合作伙伴
  COLLABORATOR: 'collaborator', // 协作者
  
  // 服务关系
  CUSTOMER: 'customer',       // 客户
  PROVIDER: 'provider',       // 服务提供者
  
  // 社区关系
  LEADER: 'leader',           // 领导者
  FOLLOWER: 'follower',       // 追随者
  NEIGHBOR: 'neighbor'        // 邻居
};

/**
 * 身份层级枚举
 */
export const IdentityHierarchy = {
  SUPERIOR: 'superior',       // 上级
  SUBORDINATE: 'subordinate', // 下级
  PEER: 'peer',              // 平级
  INDEPENDENT: 'independent'  // 独立/无层级关系
};

/**
 * 身份上下文（场景）枚举
 */
export const IdentityContext = {
  // 工作场所
  WORKSHOP: 'workshop',       // 工坊
  FARM: 'farm',              // 农田
  MARKET: 'market',          // 市集
  CONSTRUCTION: 'construction', // 建设工地
  
  // 学习场所
  SCHOOL: 'school',          // 私塾
  TEMPLE: 'temple',          // 祠堂
  LIBRARY: 'library',        // 藏书楼
  
  // 社区场所
  VILLAGE: 'village',        // 村落
  NEIGHBORHOOD: 'neighborhood', // 邻里
  GUILD: 'guild',            // 行会
  
  // 特殊场所
  MILITARY: 'military',      // 军事
  TRADE: 'trade',           // 贸易
  CRAFTS: 'crafts'          // 手工艺
};

/**
 * 单个社会身份关系类
 */
class SocialIdentity {
  constructor(fromCharacterId, toCharacterId, config = {}) {
    this.fromCharacterId = fromCharacterId;
    this.toCharacterId = toCharacterId;
    this.id = `${fromCharacterId}_${toCharacterId}`;
    
    // 身份基本信息
    this.identityType = config.identityType || SocialIdentityType.COLLEAGUE;
    this.hierarchy = config.hierarchy || IdentityHierarchy.PEER;
    this.context = config.context || IdentityContext.VILLAGE;
    this.contextDetails = config.contextDetails || ''; // 具体描述，如"李家铁匠坊"
    
    // 时间信息
    this.establishedDate = config.establishedDate || Date.now();
    this.startDate = config.startDate || Date.now();
    this.endDate = config.endDate || null;
    this.isActive = config.isActive !== false;
    
    // 身份属性
    this.responsibilities = config.responsibilities || [];  // 职责列表
    this.permissions = config.permissions || [];          // 权限列表
    this.obligations = config.obligations || [];          // 义务列表
    
    // 身份强度和重要性
    this.importance = config.importance || 50;    // 身份重要性 (0-100)
    this.influence = config.influence || 50;      // 影响力 (0-100)
    this.formality = config.formality || 50;      // 正式程度 (0-100)
    
    // 身份状态
    this.status = config.status || 'established'; // established, probation, conflict, terminated
    this.satisfaction = config.satisfaction || 50; // 对身份关系的满意度
    
    // 历史记录
    this.interactionHistory = [];
    this.statusChanges = [];
    this.maxHistoryLength = 50;
    
    console.log(`社会身份关系建立: ${fromCharacterId} -> ${toCharacterId} (${this.identityType})`);
  }
  
  /**
   * 获取身份关系的显示名称
   * @returns {string} 显示名称
   */
  getDisplayName() {
    const typeNames = {
      [SocialIdentityType.MENTOR]: '师父',
      [SocialIdentityType.STUDENT]: '徒弟',
      [SocialIdentityType.BOSS]: '上级',
      [SocialIdentityType.EMPLOYEE]: '下属',
      [SocialIdentityType.COLLEAGUE]: '同事',
      [SocialIdentityType.EMPLOYER]: '雇主',
      [SocialIdentityType.WORKER]: '雇工',
      [SocialIdentityType.PARTNER]: '合伙人',
      [SocialIdentityType.COLLABORATOR]: '协作者',
      [SocialIdentityType.CUSTOMER]: '客户',
      [SocialIdentityType.PROVIDER]: '服务者',
      [SocialIdentityType.LEADER]: '头领',
      [SocialIdentityType.FOLLOWER]: '手下',
      [SocialIdentityType.NEIGHBOR]: '邻居'
    };
    
    return typeNames[this.identityType] || this.identityType;
  }
  
  /**
   * 获取上下文显示名称
   * @returns {string} 上下文名称
   */
  getContextDisplayName() {
    const contextNames = {
      [IdentityContext.WORKSHOP]: '工坊',
      [IdentityContext.FARM]: '农田',
      [IdentityContext.MARKET]: '市集',
      [IdentityContext.CONSTRUCTION]: '工地',
      [IdentityContext.SCHOOL]: '私塾',
      [IdentityContext.TEMPLE]: '祠堂',
      [IdentityContext.LIBRARY]: '藏书楼',
      [IdentityContext.VILLAGE]: '村落',
      [IdentityContext.NEIGHBORHOOD]: '邻里',
      [IdentityContext.GUILD]: '行会',
      [IdentityContext.MILITARY]: '军中',
      [IdentityContext.TRADE]: '商贸',
      [IdentityContext.CRAFTS]: '手艺'
    };
    
    const contextName = contextNames[this.context] || this.context;
    return this.contextDetails ? `${contextName}·${this.contextDetails}` : contextName;
  }
  
  /**
   * 记录身份相关互动
   * @param {Object} interaction - 互动信息
   */
  recordInteraction(interaction) {
    this.interactionHistory.push({
      ...interaction,
      timestamp: Date.now()
    });
    
    // 限制历史记录长度
    if (this.interactionHistory.length > this.maxHistoryLength) {
      this.interactionHistory.shift();
    }
  }
  
  /**
   * 更新身份状态
   * @param {string} newStatus - 新状态
   * @param {string} reason - 变更原因
   */
  updateStatus(newStatus, reason = '') {
    const oldStatus = this.status;
    this.status = newStatus;
    
    this.statusChanges.push({
      from: oldStatus,
      to: newStatus,
      reason: reason,
      timestamp: Date.now()
    });
    
    if (newStatus === 'terminated') {
      this.isActive = false;
      this.endDate = Date.now();
    }
    
    console.log(`身份状态变更: ${this.id} ${oldStatus} -> ${newStatus} (${reason})`);
  }
  
  /**
   * 获取身份持续时间（天数）
   * @returns {number} 持续天数
   */
  getDuration() {
    const endTime = this.endDate || Date.now();
    return Math.floor((endTime - this.startDate) / (1000 * 60 * 60 * 24));
  }
  
  /**
   * 检查身份是否兼容
   * @param {SocialIdentity} otherIdentity - 另一个身份
   * @returns {boolean} 是否兼容
   */
  isCompatibleWith(otherIdentity) {
    // 检查是否为互补身份（师父-徒弟、雇主-雇工等）
    const compatiblePairs = [
      [SocialIdentityType.MENTOR, SocialIdentityType.STUDENT],
      [SocialIdentityType.BOSS, SocialIdentityType.EMPLOYEE],
      [SocialIdentityType.EMPLOYER, SocialIdentityType.WORKER],
      [SocialIdentityType.CUSTOMER, SocialIdentityType.PROVIDER],
      [SocialIdentityType.LEADER, SocialIdentityType.FOLLOWER]
    ];
    
    for (const [type1, type2] of compatiblePairs) {
      if ((this.identityType === type1 && otherIdentity.identityType === type2) ||
          (this.identityType === type2 && otherIdentity.identityType === type1)) {
        return true;
      }
    }
    
    // 同级身份在同一上下文中兼容
    return this.identityType === otherIdentity.identityType && 
           this.context === otherIdentity.context;
  }
  
  /**
   * 导出身份数据
   * @returns {Object} 身份数据
   */
  exportData() {
    return {
      id: this.id,
      fromCharacterId: this.fromCharacterId,
      toCharacterId: this.toCharacterId,
      identityType: this.identityType,
      hierarchy: this.hierarchy,
      context: this.context,
      contextDetails: this.contextDetails,
      displayName: this.getDisplayName(),
      contextDisplayName: this.getContextDisplayName(),
      establishedDate: this.establishedDate,
      duration: this.getDuration(),
      isActive: this.isActive,
      status: this.status,
      importance: this.importance,
      influence: this.influence,
      satisfaction: this.satisfaction,
      responsibilities: [...this.responsibilities],
      permissions: [...this.permissions],
      obligations: [...this.obligations]
    };
  }
}

/**
 * 社会身份系统类
 * 管理单个角色的所有社会身份关系
 */
export class SocialIdentitySystem {
  constructor(characterId, config = {}) {
    this.characterId = characterId;
    this.identities = new Map(); // key: otherCharacterId, value: SocialIdentity[]
    
    // 系统配置
    this.maxIdentitiesPerCharacter = config.maxIdentitiesPerCharacter || 20;
    this.allowMultipleIdentities = config.allowMultipleIdentities !== false;
    this.autoCleanupInactive = config.autoCleanupInactive !== false;
    
    // 身份偏好
    this.identityPreferences = {
      leadership: config.leadership || 0.5,        // 领导倾向 (0-1)
      collaboration: config.collaboration || 0.7,  // 合作倾向
      independence: config.independence || 0.6,    // 独立倾向
      teaching: config.teaching || 0.4,           // 教学倾向
      learning: config.learning || 0.8            // 学习倾向
    };
    
    // 统计信息
    this.statistics = {
      totalIdentities: 0,
      activeIdentities: 0,
      leadershipRoles: 0,
      subordinateRoles: 0,
      teachingRoles: 0,
      learningRoles: 0
    };
    
    this.initialize();
  }
  
  /**
   * 初始化身份系统
   */
  initialize() {
    console.log(`社会身份系统初始化完成: ${this.characterId}`);
  }
  
  /**
   * 建立身份关系
   * @param {string} otherCharacterId - 对方角色ID
   * @param {Object} config - 身份配置
   * @returns {SocialIdentity} 创建的身份关系
   */
  establishIdentity(otherCharacterId, config = {}) {
    const identity = new SocialIdentity(this.characterId, otherCharacterId, config);
    
    // 存储身份关系
    if (!this.identities.has(otherCharacterId)) {
      this.identities.set(otherCharacterId, []);
    }
    
    const identityList = this.identities.get(otherCharacterId);
    identityList.push(identity);
    
    // 更新统计
    this.updateStatistics();
    
    console.log(`建立身份关系: ${this.characterId} -> ${otherCharacterId} (${identity.identityType})`);
    
    return identity;
  }
  
  /**
   * 获取与指定角色的身份关系
   * @param {string} otherCharacterId - 对方角色ID
   * @returns {SocialIdentity[]} 身份关系列表
   */
  getIdentities(otherCharacterId) {
    return this.identities.get(otherCharacterId) || [];
  }
  
  /**
   * 获取主要身份关系（最重要的一个）
   * @param {string} otherCharacterId - 对方角色ID
   * @returns {SocialIdentity|null} 主要身份关系
   */
  getPrimaryIdentity(otherCharacterId) {
    const identities = this.getIdentities(otherCharacterId);
    if (identities.length === 0) return null;
    
    // 按重要性和影响力排序
    return identities.sort((a, b) => {
      const scoreA = a.importance + a.influence;
      const scoreB = b.importance + b.influence;
      return scoreB - scoreA;
    })[0];
  }
  
  /**
   * 获取所有身份关系
   * @param {Object} filters - 过滤条件
   * @returns {SocialIdentity[]} 身份关系列表
   */
  getAllIdentities(filters = {}) {
    let allIdentities = [];
    
    for (const identityList of this.identities.values()) {
      allIdentities = allIdentities.concat(identityList);
    }
    
    // 应用过滤器
    if (filters.isActive !== undefined) {
      allIdentities = allIdentities.filter(identity => identity.isActive === filters.isActive);
    }
    
    if (filters.identityType) {
      allIdentities = allIdentities.filter(identity => identity.identityType === filters.identityType);
    }
    
    if (filters.context) {
      allIdentities = allIdentities.filter(identity => identity.context === filters.context);
    }
    
    if (filters.hierarchy) {
      allIdentities = allIdentities.filter(identity => identity.hierarchy === filters.hierarchy);
    }
    
    // 按重要性排序
    return allIdentities.sort((a, b) => b.importance - a.importance);
  }
  
  /**
   * 获取特定类型的身份关系
   * @param {string} identityType - 身份类型
   * @returns {SocialIdentity[]} 身份关系列表
   */
  getIdentitiesByType(identityType) {
    return this.getAllIdentities({ identityType, isActive: true });
  }
  
  /**
   * 获取领导身份
   * @returns {SocialIdentity[]} 领导身份列表
   */
  getLeadershipIdentities() {
    return this.getAllIdentities({ hierarchy: IdentityHierarchy.SUPERIOR, isActive: true });
  }
  
  /**
   * 获取下属身份
   * @returns {SocialIdentity[]} 下属身份列表
   */
  getSubordinateIdentities() {
    return this.getAllIdentities({ hierarchy: IdentityHierarchy.SUBORDINATE, isActive: true });
  }
  
  /**
   * 终止身份关系
   * @param {string} otherCharacterId - 对方角色ID
   * @param {string} identityType - 身份类型（可选，不指定则终止所有）
   * @param {string} reason - 终止原因
   */
  terminateIdentity(otherCharacterId, identityType = null, reason = '关系结束') {
    const identities = this.getIdentities(otherCharacterId);
    
    identities.forEach(identity => {
      if (!identityType || identity.identityType === identityType) {
        identity.updateStatus('terminated', reason);
      }
    });
    
    this.updateStatistics();
    console.log(`终止身份关系: ${this.characterId} -> ${otherCharacterId} (${identityType || '全部'})`);
  }
  
  /**
   * 更新统计信息
   */
  updateStatistics() {
    const allIdentities = this.getAllIdentities();
    
    this.statistics.totalIdentities = allIdentities.length;
    this.statistics.activeIdentities = allIdentities.filter(i => i.isActive).length;
    this.statistics.leadershipRoles = allIdentities.filter(i => 
      i.isActive && i.hierarchy === IdentityHierarchy.SUPERIOR
    ).length;
    this.statistics.subordinateRoles = allIdentities.filter(i => 
      i.isActive && i.hierarchy === IdentityHierarchy.SUBORDINATE
    ).length;
    this.statistics.teachingRoles = allIdentities.filter(i => 
      i.isActive && i.identityType === SocialIdentityType.MENTOR
    ).length;
    this.statistics.learningRoles = allIdentities.filter(i => 
      i.isActive && i.identityType === SocialIdentityType.STUDENT
    ).length;
  }
  
  /**
   * 分析社会身份网络
   * @returns {Object} 分析结果
   */
  analyzeIdentityNetwork() {
    const analysis = {
      totalConnections: this.identities.size,
      identityDistribution: {},
      contextDistribution: {},
      hierarchyDistribution: {},
      networkInfluence: 0,
      socialStatus: 0
    };
    
    const allIdentities = this.getAllIdentities({ isActive: true });
    
    // 身份类型分布
    allIdentities.forEach(identity => {
      analysis.identityDistribution[identity.identityType] = 
        (analysis.identityDistribution[identity.identityType] || 0) + 1;
    });
    
    // 上下文分布
    allIdentities.forEach(identity => {
      analysis.contextDistribution[identity.context] = 
        (analysis.contextDistribution[identity.context] || 0) + 1;
    });
    
    // 层级分布
    allIdentities.forEach(identity => {
      analysis.hierarchyDistribution[identity.hierarchy] = 
        (analysis.hierarchyDistribution[identity.hierarchy] || 0) + 1;
    });
    
    // 计算网络影响力
    analysis.networkInfluence = allIdentities.reduce((sum, identity) => 
      sum + identity.influence, 0
    );
    
    // 计算社会地位
    const leadershipCount = analysis.hierarchyDistribution[IdentityHierarchy.SUPERIOR] || 0;
    const subordinateCount = analysis.hierarchyDistribution[IdentityHierarchy.SUBORDINATE] || 0;
    analysis.socialStatus = Math.max(0, (leadershipCount * 10) - (subordinateCount * 3) + 50);
    
    return analysis;
  }
  
  /**
   * 导出系统数据
   * @returns {Object} 系统数据
   */
  exportData() {
    const allIdentities = this.getAllIdentities();
    
    return {
      characterId: this.characterId,
      totalIdentities: allIdentities.length,
      activeIdentities: allIdentities.filter(i => i.isActive).length,
      identities: allIdentities.map(identity => identity.exportData()),
      statistics: { ...this.statistics },
      identityPreferences: { ...this.identityPreferences },
      networkAnalysis: this.analyzeIdentityNetwork()
    };
  }
  
  /**
   * 导入系统数据
   * @param {Object} data - 导入的数据
   */
  importData(data) {
    this.identities.clear();
    
    if (data.identities) {
      data.identities.forEach(identityData => {
        if (identityData.isActive) {
          const identity = new SocialIdentity(
            identityData.fromCharacterId, 
            identityData.toCharacterId, 
            identityData
          );
          
          if (!this.identities.has(identityData.toCharacterId)) {
            this.identities.set(identityData.toCharacterId, []);
          }
          
          this.identities.get(identityData.toCharacterId).push(identity);
        }
      });
    }
    
    if (data.identityPreferences) {
      this.identityPreferences = { ...data.identityPreferences };
    }
    
    this.updateStatistics();
    console.log(`社会身份系统数据导入完成: ${this.characterId}`);
  }
  
  /**
   * 清理无效身份关系
   */
  cleanup() {
    if (!this.autoCleanupInactive) return;
    
    const cutoffTime = Date.now() - (180 * 24 * 60 * 60 * 1000); // 180天
    let cleanedCount = 0;
    
    for (const [characterId, identityList] of this.identities.entries()) {
      const validIdentities = identityList.filter(identity => {
        if (!identity.isActive && identity.endDate && identity.endDate < cutoffTime) {
          cleanedCount++;
          return false;
        }
        return true;
      });
      
      if (validIdentities.length === 0) {
        this.identities.delete(characterId);
      } else if (validIdentities.length < identityList.length) {
        this.identities.set(characterId, validIdentities);
      }
    }
    
    if (cleanedCount > 0) {
      this.updateStatistics();
      console.log(`清理了 ${cleanedCount} 个过期身份关系: ${this.characterId}`);
    }
  }
}

export default SocialIdentitySystem;