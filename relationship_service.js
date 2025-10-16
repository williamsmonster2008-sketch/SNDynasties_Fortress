 /**
 * relationship_service.js - 血缘关系处理服务
 * 
 * Service Layer 模块 - 负责关系系统的初始化和管理
 * 架构层级：Service Layer (服务层) - 业务逻辑处理
 * 
 * 核心功能：
 * 三层关系系统 - 血缘关系、情感关系、社会关系的统一管理
 * 
 */

import { PopulationRules, configManager } from './population_rules.js';
import { Utils } from './utils_module.js';

/**
 * 血缘关系处理服务
 */
export class RelationshipService {
  constructor(gameEngine = null) {
    this.gameEngine = gameEngine;
    
    // 删除不需要的配置状态
    // this.configInitialized = false;
    
    // 简化关系类型定义，保留核心分类
    this.relationshipCategories = {
      FAMILY: 'family',
      SOCIAL: 'social', 
      EMOTIONAL: 'emotional',
      UNKNOWN: 'unknown'
    };
    
    // 保留亲密度等级（UI显示可能需要）
    this.intimacyLevels = {
      STRANGER: 0,
      ACQUAINTANCE: 25,
      FAMILIAR: 50,
      CLOSE: 75,
      INTIMATE: 95
    };
    
    console.log('RelationshipService - 关系查询服务初始化');
  }

  /**
   * 初始化配置
   */
  async initialize() {
    if (this.configInitialized) return { success: true };
    
    try {
      console.log('初始化关系服务配置...');
      
      await configManager.initializeConfigurations();
      
      // 获取关系称谓配置
      this.relationshipTitles = PopulationRules.getRelationshipTitles();
      
      // 初始化显示配置
      this.displayConfig = {
        maxDisplayLength: 20,
        showEmotionalInBrackets: true,
        prioritizeBloodRelation: true,
        abbreviateCommonTitles: false,
        
        strengthColors: {
          90: '#d32f2f', 70: '#f57c00', 50: '#fbc02d', 
          30: '#388e3c', 0: '#757575'
        },
        
        importanceIcons: {
          critical: '🔥', very_high: '⭐', high: '🔸',
          medium: '●', low: '○', minimal: '·'
        }
      };
      
      this.configInitialized = true;
      console.log('关系服务配置初始化完成');
      
      return { success: true };
      
    } catch (error) {
      console.error('关系服务配置初始化失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 确保配置已初始化
   */
  _ensureConfigInitialized() {
    if (!this.configInitialized) {
      throw new Error('RelationshipService 未初始化，请先调用 initialize() 方法');
    }
  }

  

  // ==================== 关系数据整合 ====================
  

  /**
   * 获取两个角色之间的完整关系信息
   * @param {string} fromCharacterId - 查询者角色ID
   * @param {string} toCharacterId - 目标角色ID
   * @returns {Object} 完整关系信息
   */
  getCompleteRelationship(fromCharacterId, toCharacterId) {
    if (fromCharacterId === toCharacterId) {
      return { displayName: '自己', primaryCategory: 'self' };
    }

    const fromCharacter = this.gameEngine.characters.get(fromCharacterId);
    const toCharacter = this.gameEngine.characters.get(toCharacterId);
    
    if (!fromCharacter || !toCharacter) {
      return { displayName: '未知', primaryCategory: 'unknown' };
    }

    // 查询三层关系
    const bloodRelation = this.gameEngine.familySystem?.getKinship(
      fromCharacter.familyName, fromCharacterId, toCharacterId
    );
    
    const emotionalRelation = fromCharacter.emotionalRelationshipSystem?.getRelationship(toCharacterId);
    
    const socialIdentity = fromCharacter.socialIdentitySystem?.getPrimaryIdentity(toCharacterId);
    
    // 组合关系
    return this.combineRelations(bloodRelation, emotionalRelation, socialIdentity);
  }

  /**
   * 组合三层关系为复合关系显示
   */
  combineRelations(bloodRelation, emotionalRelation, socialIdentity) {
    const parts = [];
    
    if (bloodRelation?.title) parts.push(bloodRelation.title);
    if (socialIdentity?.getDisplayName) parts.push(socialIdentity.getDisplayName());
    if (emotionalRelation?.getEmotionalStateDisplayName) {
      const emotional = emotionalRelation.getEmotionalStateDisplayName();
      if (emotional !== '陌生人') parts.push(`(${emotional})`);
    }
    
    const displayName = parts.length > 0 ? parts.join('·') : '陌生人';
    
    return {
      displayName,
      bloodRelation,
      emotionalRelation, 
      socialIdentity,
      primaryCategory: this.determinePrimaryCategory(bloodRelation, emotionalRelation, socialIdentity)
    };
  }

  /**
   * 确定主要关系类别
   */
  determinePrimaryCategory(blood, emotional, social) {
    if (blood?.type && blood.type !== 'no_relation') return 'family';
    if (social?.identityType) return 'social';
    if (emotional?.emotionalState) return 'emotional';
    return 'stranger';
  }


  _formatComplexRelationship(blood, social, emotional) {
    const parts = [];
    
    // 血缘关系
    if (blood?.title) {
      parts.push(blood.title);
    }
    
    // 社会身份
    if (social?.getDisplayName) {
      parts.push(social.getDisplayName());
    }
    
    // 情感关系（括号内显示）
    let emotionalPart = '';
    if (emotional?.getEmotionalStateDisplayName) {
      const emotionalName = emotional.getEmotionalStateDisplayName();
      if (emotionalName && emotionalName !== '陌生人') {
        emotionalPart = `(${emotionalName})`;
      }
    }
    
    // 组装显示名称
    if (parts.length === 0) {
      return emotional?.getEmotionalStateDisplayName?.() || '陌生人';
    }
    
    const mainRelation = parts.join('·');
    return emotionalPart ? `${mainRelation}${emotionalPart}` : mainRelation;
  }

  /**
   * 格式化简短关系显示
   * @param {Object} blood - 血缘关系
   * @param {Object} social - 社会身份
   * @param {Object} emotional - 情感关系
   * @returns {string} 简短显示名称
   */
  _formatShortRelationship(blood, social, emotional) {
    // 优先级：血缘 > 社会身份 > 情感关系
    if (blood?.title) {
      return blood.title;
    }
    
    if (social?.getDisplayName) {
      return social.getDisplayName();
    }
    
    return emotional?.getEmotionalStateDisplayName?.() || '陌生人';
  }



  // ==================== 查询接口 ====================

  /**
   * 获取自身关系信息
   * @returns {Object} 自身关系信息
   */
  _getSelfRelationship() {
    return {
      displayName: '自己',
      primaryCategory: 'self',
      bloodRelation: null,
      emotionalRelation: null,
      socialIdentity: null
    };
  }

  /**
   * 获取未知关系信息
   * @param {string} fromCharacterId - 查询者ID
   * @param {string} toCharacterId - 目标ID
   * @returns {Object} 未知关系信息
   */
  _getUnknownRelationship(fromCharacterId, toCharacterId) {
    return {
      displayName: '未知',
      primaryCategory: 'unknown',
      bloodRelation: null,
      emotionalRelation: null,
      socialIdentity: null
    };
  }



  _getBloodRelation(fromCharacter, toCharacter) {
    if (!fromCharacter.familyName || !toCharacter.familyName) {
      return null;
    }
    
    // 同家族才有血缘关系
    if (fromCharacter.familyName !== toCharacter.familyName) {
      return null;
    }
    
    // 使用FamilySystem查询
    return this.gameEngine.familySystem?.getKinship(
      fromCharacter.familyName,
      fromCharacter.characterId || fromCharacter.id, 
      toCharacter.characterId || toCharacter.id
    );
  }

  _getSocialIdentity(fromCharacter, toCharacter) {
    const socialSystem = fromCharacter.socialIdentitySystem;
    if (!socialSystem) return null;
    
    return socialSystem.getPrimaryIdentity(toCharacter.characterId || toCharacter.id);
  }

  _getEmotionalRelation(fromCharacter, toCharacter) {
    const emotionalSystem = fromCharacter.emotionalRelationshipSystem;
    if (!emotionalSystem) return null;
    
    return emotionalSystem.getRelationship(toCharacter.characterId || toCharacter.id);
  }


  // 辅助查询功能
  _getIntimacyLevel(intimacy) {
    if (intimacy >= this.intimacyLevels.INTIMATE) return 'intimate';
    if (intimacy >= this.intimacyLevels.CLOSE) return 'close';
    if (intimacy >= this.intimacyLevels.FAMILIAR) return 'familiar';
    if (intimacy >= this.intimacyLevels.ACQUAINTANCE) return 'acquaintance';
    return 'stranger';
  }

  /**
   * 查询角色关系
   * @param {string} fromCharacterId - 角色ID
   * @param {string} toCharacterId - 目标角色ID (可选)
   * @returns {Object|Map} 关系数据
   */
  queryRelationship(fromCharacterId, toCharacterId) {
    return this.getCompleteRelationship(fromCharacterId, toCharacterId);
  }

 

  getCharacterRelationships(characterId, filters = {}) {
    const character = this.gameEngine.characters.get(characterId);
    if (!character) return [];
    
    const relationships = [];
    
    // 遍历所有其他角色
    for (const [otherId, otherChar] of this.gameEngine.characters) {
      if (otherId === characterId) continue;
      
      const relationship = this.getCompleteRelationship(characterId, otherId);
      
      if (this._passesFilters(relationship, filters)) {
        relationships.push({
          targetId: otherId,
          targetName: otherChar.name,
          ...relationship
        });
      }
    }
    
    return relationships;
  }

  _passesFilters(relationship, filters) {
    // 关系类别过滤
    if (filters.category && relationship.primaryCategory !== filters.category) {
      return false;
    }
    
    // 显示名称过滤
    if (filters.displayName && !relationship.displayName.includes(filters.displayName)) {
      return false;
    }
    
    // 排除陌生人（如果设置）
    if (filters.excludeStrangers && relationship.primaryCategory === 'stranger') {
      return false;
    }
    
    return true;
  }


  /**
   * 获取关系描述
   * @param {string} characterId - 角色ID
   * @param {string} targetId - 目标角色ID
   * @returns {Object} 关系描述
   */
  getRelationshipDescription(characterId, targetId) {
    const relation = this.queryRelationship(characterId, targetId);
    if (!relation || relation.primaryCategory === 'unknown') {
      return {
        exists: false,
        description: '无关系',
        displayName: '陌生人'
      };
    }
    
    return {
      exists: true,
      displayName: relation.displayName,
      primaryCategory: relation.primaryCategory, // 修改：使用新的字段名
      description: this._buildDescription(relation), // 修改：简化描述生成
      
      // 血缘关系信息
      hasBloodRelation: !!relation.bloodRelation,
      bloodRelationTitle: relation.bloodRelation?.title,
      
      // 情感关系信息
      hasEmotionalRelation: !!relation.emotionalRelation,
      emotionalState: relation.emotionalRelation?.getEmotionalStateDisplayName?.(),
      
      // 社会身份信息
      hasSocialIdentity: !!relation.socialIdentity,
      socialRole: relation.socialIdentity?.getDisplayName?.()
    };
  }

  /**
   * 构建关系描述
   */
  _buildDescription(relation) {
    const parts = [];
    
    if (relation.bloodRelation?.title) {
      parts.push(`血缘关系：${relation.bloodRelation.title}`);
    }
    
    if (relation.socialIdentity) {
      parts.push(`社会关系：${relation.socialIdentity.getDisplayName?.() || '未知身份'}`);
    }
    
    if (relation.emotionalRelation) {
      const emotional = relation.emotionalRelation.getEmotionalStateDisplayName?.();
      if (emotional && emotional !== '陌生人') {
        parts.push(`情感状态：${emotional}`);
      }
    }
    
    return parts.length > 0 ? parts.join('，') : '普通关系';
  }

  /**
   * 生成关系标签
   * @param {Object} blood - 血缘关系
   * @param {Object} social - 社会身份
   * @param {Object} emotional - 情感关系
   * @returns {Array} 关系标签列表
   */
  _generateRelationshipTags(blood, social, emotional) {
    const tags = [];
    
    // 血缘关系标签
    if (blood?.title) {
      tags.push('血缘');
      if (blood.generationGap === 0) tags.push('平辈');
      else if (blood.generationGap > 0) tags.push('长辈');
      else if (blood.generationGap < 0) tags.push('晚辈');
    }
    
    // 社会身份标签
    if (social?.identityType) {
      tags.push('身份关系');
      if (social.hierarchy === 'superior') tags.push('上级');
      else if (social.hierarchy === 'subordinate') tags.push('下级');
      else tags.push('平级');
    }
    
    // 情感关系标签
    if (emotional) {
      const emotionalState = emotional.getEmotionalStateDisplayName?.();
      if (emotionalState && emotionalState !== '陌生人') {
        if (emotional.affection > 60) tags.push('友好');
        else if (emotional.affection < 40) tags.push('敌对');
        
        if (emotional.trust > 70) tags.push('信任');
        if (emotional.intimacy > 60) tags.push('亲密');
      }
    }
    
    return tags;
  }


  

  // ==================== 关系更新方法 ====================
  /**
   * 计算关系重要性（简化版）
   * @param {Object} blood - 血缘关系
   * @param {Object} social - 社会身份
   * @param {Object} emotional - 情感关系
   * @returns {string} 重要性等级
   */
  _calculateImportance(blood, social, emotional) {
    let score = 0;
    
    // 血缘关系权重
    if (blood?.title) {
      const bloodWeights = {
        '父亲': 100, '母亲': 100, '儿子': 90, '女儿': 90,
        '祖父': 80, '祖母': 80, '夫君': 95, '妻子': 95,
        '兄长': 70, '姐姐': 70, '弟弟': 65, '妹妹': 65
      };
      score += bloodWeights[blood.title] || 30;
    }
    
    // 情感关系权重
    if (emotional?.emotionalState) {
      const emotionalWeights = {
        '深爱': 90, '恋爱': 80, '密友': 70, '朋友': 50,
        '仇敌': 60, '崇拜': 55, '陌生人': 0
      };
      const emotionalName = emotional.getEmotionalStateDisplayName?.() || '';
      score += emotionalWeights[emotionalName] || 20;
    }
    
    // 社会身份权重
    if (social?.identityType) {
      const socialWeights = {
        'mentor': 60, 'superior': 55, 'colleague': 40, 
        'subordinate': 35, 'student': 30
      };
      score += socialWeights[social.identityType] || 25;
    }
    
    // 返回等级
    if (score >= 150) return 'critical';
    if (score >= 120) return 'very_high';
    if (score >= 80) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'minimal';
  }
  

  // ==================== 服务管理方法 ====================

  /**
   * 获取服务状态
   * @returns {Object} 服务状态
   */
  getServiceStatus() {
    const totalCharacters = this.gameEngine?.characters?.size || 0;
    
    return {
      initialized: this.configInitialized,
      gameEngineConnected: !!this.gameEngine,
      totalCharacters: totalCharacters,
      
      // 三层关系系统状态
      familySystemAvailable: !!this.gameEngine?.familySystem,
      emotionalSystemsActive: this._countEmotionalSystems(),
      socialSystemsActive: this._countSocialSystems(),
      
      // 服务功能状态
      canQueryRelationships: this._canQueryRelationships(),
      configurationLoaded: !!this.relationshipTitles,
      
      lastUpdate: Date.now()
    };
  }

  /**
   * 统计活跃的情感关系系统数量
   */
  _countEmotionalSystems() {
    if (!this.gameEngine?.characters) return 0;
    
    let count = 0;
    for (const character of this.gameEngine.characters.values()) {
      if (character.emotionalRelationshipSystem) count++;
    }
    return count;
  }

  /**
   * 统计活跃的社会身份系统数量
   */
  _countSocialSystems() {
    if (!this.gameEngine?.characters) return 0;
    
    let count = 0;
    for (const character of this.gameEngine.characters.values()) {
      if (character.socialIdentitySystem) count++;
    }
    return count;
  }

  /**
   * 检查是否可以执行关系查询
   */
  _canQueryRelationships() {
    return !!(this.gameEngine && 
            this.gameEngine.characters && 
            this.gameEngine.familySystem);
  }

  

}
