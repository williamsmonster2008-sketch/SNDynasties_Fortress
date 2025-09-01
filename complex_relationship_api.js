/**
 * complex_relationship_api.js - 复合关系查询接口
 * 
 * 功能：统一三层关系系统的查询接口，提供复合关系显示
 * 架构：整合 FamilySystem + SocialIdentitySystem + EmotionalRelationshipSystem
 * 
 * 复合关系格式：血缘关系·社会身份(情感关系)
 * 示例：表兄·师父(仇敌)、堂弟·徒弟(密友)
 */

/**
 * 复合关系查询接口
 */
class ComplexRelationshipAPI {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    
    // 三层关系系统引用
    this.familySystem = null;
    this.socialIdentitySystem = null;
    this.emotionalRelationshipSystem = null;
    
    // 关系显示配置
    this.displayConfig = this._initDisplayConfig();
    
    console.log('✅ ComplexRelationshipAPI 复合关系查询接口初始化');
  }

  /**
   * 设置关系系统引用
   * @param {Object} systems - 关系系统对象
   */
  setRelationshipSystems(systems) {
    this.familySystem = systems.familySystem;
    this.socialIdentitySystem = systems.socialIdentitySystem;
    this.emotionalRelationshipSystem = systems.emotionalRelationshipSystem;
    
    console.log('✅ 三层关系系统已连接到复合查询接口');
  }

  /**
   * 获取两个角色之间的完整关系信息
   * @param {string} fromCharacterId - 查询者角色ID
   * @param {string} toCharacterId - 目标角色ID
   * @returns {Object} 完整关系信息
   */
  getCompleteRelationship(fromCharacterId, toCharacterId) {
    if (fromCharacterId === toCharacterId) {
      return this._getSelfRelationship();
    }

    // 获取角色信息
    const fromCharacter = this.gameEngine.characters.get(fromCharacterId);
    const toCharacter = this.gameEngine.characters.get(toCharacterId);
    
    if (!fromCharacter || !toCharacter) {
      return this._getUnknownRelationship(fromCharacterId, toCharacterId);
    }

    // 查询三层关系
    const bloodRelation = this._getBloodRelation(fromCharacter, toCharacter);
    const socialIdentity = this._getSocialIdentity(fromCharacter, toCharacter);
    const emotionalRelation = this._getEmotionalRelation(fromCharacter, toCharacter);
    
    // 构建完整关系信息
    const completeRelationship = {
      // 基础信息
      fromCharacterId: fromCharacterId,
      toCharacterId: toCharacterId,
      fromCharacterName: fromCharacter.name,
      toCharacterName: toCharacter.name,
      
      // 三层关系信息
      bloodRelation: bloodRelation,
      socialIdentity: socialIdentity,
      emotionalRelation: emotionalRelation,
      
      // 复合关系显示
      displayName: this._formatComplexRelationship(bloodRelation, socialIdentity, emotionalRelation),
      shortDisplayName: this._formatShortRelationship(bloodRelation, socialIdentity, emotionalRelation),
      
      // 关系强度和重要性
      overallStrength: this._calculateOverallStrength(bloodRelation, socialIdentity, emotionalRelation),
      relationshipImportance: this._calculateImportance(bloodRelation, socialIdentity, emotionalRelation),
      
      // 关系类别和标签
      primaryCategory: this._determinePrimaryCategory(bloodRelation, socialIdentity, emotionalRelation),
      relationshipTags: this._generateRelationshipTags(bloodRelation, socialIdentity, emotionalRelation),
      
      // 查询时间
      queriedAt: Date.now()
    };

    return completeRelationship;
  }

  /**
   * 获取血缘关系信息
   * @param {Object} fromCharacter - 查询者
   * @param {Object} toCharacter - 目标角色
   * @returns {Object|null} 血缘关系信息
   */
  _getBloodRelation(fromCharacter, toCharacter) {
    if (!this.familySystem || !fromCharacter.familyName || !toCharacter.familyName) {
      return null;
    }
    
    // 同家族才有血缘关系
    if (fromCharacter.familyName !== toCharacter.familyName) {
      return null;
    }
    
    const kinship = this.familySystem.getKinship(
      fromCharacter.familyName, 
      fromCharacter.id, 
      toCharacter.id
    );
    
    if (!kinship || kinship.type === 'no_relation') {
      return null;
    }
    
    return {
      title: kinship.title,
      type: kinship.type,
      strength: kinship.strength,
      generationGap: kinship.generationGap,
      familyName: fromCharacter.familyName
    };
  }

  /**
   * 获取社会身份关系信息
   * @param {Object} fromCharacter - 查询者
   * @param {Object} toCharacter - 目标角色
   * @returns {Object|null} 社会身份信息
   */
  _getSocialIdentity(fromCharacter, toCharacter) {
    if (!this.socialIdentitySystem || !fromCharacter.socialIdentitySystem) {
      return null;
    }
    
    const identity = fromCharacter.socialIdentitySystem.getPrimaryIdentity(toCharacter.id);
    
    if (!identity) {
      return null;
    }
    
    return {
      title: identity.getDisplayName(),
      type: identity.identityType,
      context: identity.context,
      strength: identity.strength,
      hierarchy: identity.hierarchy,
      established: identity.establishedAt
    };
  }

  /**
   * 获取情感关系信息
   * @param {Object} fromCharacter - 查询者
   * @param {Object} toCharacter - 目标角色
   * @returns {Object|null} 情感关系信息
   */
  _getEmotionalRelation(fromCharacter, toCharacter) {
    if (!this.emotionalRelationshipSystem || !fromCharacter.emotionalSystem) {
      return null;
    }
    
    const emotion = fromCharacter.emotionalSystem.getEmotionalRelationship(toCharacter.id);
    
    if (!emotion) {
      return { title: '陌生人', type: 'stranger', strength: 0 };
    }
    
    return {
      title: emotion.getEmotionalStateDisplayName(),
      type: emotion.emotionalState,
      strength: emotion.getEmotionalStrength(),
      affection: emotion.affection,
      trust: emotion.trust,
      intimacy: emotion.intimacy,
      lastInteraction: emotion.lastInteraction
    };
  }

  /**
   * 格式化复合关系显示名称
   * @param {Object} blood - 血缘关系
   * @param {Object} social - 社会身份
   * @param {Object} emotional - 情感关系
   * @returns {string} 复合关系显示名称
   */
  _formatComplexRelationship(blood, social, emotional) {
    const parts = [];
    
    // 血缘关系（最高优先级）
    if (blood && blood.title && blood.title !== '族人') {
      parts.push(blood.title);
    }
    
    // 社会身份
    if (social && social.title) {
      parts.push(social.title);
    }
    
    // 情感关系（括号内显示）
    let emotionalPart = '';
    if (emotional && emotional.title && emotional.title !== '陌生人') {
      emotionalPart = `(${emotional.title})`;
    }
    
    // 组装显示名称
    if (parts.length === 0) {
      return emotional?.title || '陌生人';
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
    if (blood && blood.title && blood.title !== '族人') {
      return blood.title;
    }
    
    if (social && social.title) {
      return social.title;
    }
    
    return emotional?.title || '陌生人';
  }

  /**
   * 计算整体关系强度
   * @param {Object} blood - 血缘关系
   * @param {Object} social - 社会身份
   * @param {Object} emotional - 情感关系
   * @returns {number} 整体关系强度 (0-100)
   */
  _calculateOverallStrength(blood, social, emotional) {
    let totalStrength = 0;
    let weightSum = 0;
    
    // 血缘关系权重：40%
    if (blood && blood.strength > 0) {
      totalStrength += blood.strength * 0.4;
      weightSum += 0.4;
    }
    
    // 社会身份权重：30%
    if (social && social.strength > 0) {
      totalStrength += social.strength * 0.3;
      weightSum += 0.3;
    }
    
    // 情感关系权重：30%
    if (emotional && emotional.strength > 0) {
      totalStrength += emotional.strength * 0.3;
      weightSum += 0.3;
    }
    
    return weightSum > 0 ? Math.round(totalStrength / weightSum) : 0;
  }

  /**
   * 计算关系重要性
   * @param {Object} blood - 血缘关系
   * @param {Object} social - 社会身份
   * @param {Object} emotional - 情感关系
   * @returns {string} 重要性等级
   */
  _calculateImportance(blood, social, emotional) {
    const overallStrength = this._calculateOverallStrength(blood, social, emotional);
    
    // 特殊关系加权
    let importanceBonus = 0;
    
    // 血缘关系加权
    if (blood) {
      if (['父亲', '母亲', '夫君', '妻子'].includes(blood.title)) {
        importanceBonus += 30;
      } else if (['祖父', '祖母', '儿子', '女儿'].includes(blood.title)) {
        importanceBonus += 20;
      }
    }
    
    // 社会身份加权
    if (social) {
      if (['师父', '徒弟'].includes(social.title)) {
        importanceBonus += 15;
      } else if (['上级', '下属'].includes(social.title)) {
        importanceBonus += 10;
      }
    }
    
    // 情感关系加权
    if (emotional) {
      if (['深爱', '热恋', '仇敌'].includes(emotional.title)) {
        importanceBonus += 20;
      } else if (['密友', '恋爱', '敌意'].includes(emotional.title)) {
        importanceBonus += 15;
      }
    }
    
    const finalScore = overallStrength + importanceBonus;
    
    if (finalScore >= 90) return 'critical';      // 关键关系
    if (finalScore >= 70) return 'very_high';     // 很重要
    if (finalScore >= 50) return 'high';          // 重要
    if (finalScore >= 30) return 'medium';        // 中等
    if (finalScore >= 10) return 'low';           // 一般
    return 'minimal';                             // 微弱
  }

  /**
   * 确定主要关系类别
   * @param {Object} blood - 血缘关系
   * @param {Object} social - 社会身份
   * @param {Object} emotional - 情感关系
   * @returns {string} 主要类别
   */
  _determinePrimaryCategory(blood, social, emotional) {
    // 优先级判断
    if (blood && blood.strength > 60) return 'family';
    if (social && social.strength > 60) return 'professional';
    if (emotional && emotional.strength > 60) return 'personal';
    
    // 次级判断
    if (blood && blood.strength > 0) return 'family';
    if (social && social.strength > 0) return 'professional';
    if (emotional && emotional.strength > 0) return 'personal';
    
    return 'unknown';
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
    if (blood) {
      tags.push('血缘');
      if (blood.generationGap === 0) tags.push('平辈');
      else if (blood.generationGap > 0) tags.push('长辈');
      else tags.push('晚辈');
    }
    
    // 社会身份标签
    if (social) {
      tags.push('身份关系');
      if (social.hierarchy > 0) tags.push('上级');
      else if (social.hierarchy < 0) tags.push('下级');
      else tags.push('平级');
    }
    
    // 情感关系标签
    if (emotional && emotional.strength > 30) {
      if (emotional.affection > 60) tags.push('友好');
      else if (emotional.affection < 40) tags.push('敌对');
      
      if (emotional.trust > 70) tags.push('信任');
      if (emotional.intimacy > 60) tags.push('亲密');
    }
    
    return tags;
  }

  /**
   * 获取角色的所有关系列表
   * @param {string} characterId - 角色ID
   * @param {Object} filters - 过滤条件
   * @returns {Array} 关系列表
   */
  getCharacterRelationships(characterId, filters = {}) {
    const character = this.gameEngine.characters.get(characterId);
    if (!character) return [];
    
    const relationships = [];
    
    // 遍历所有其他角色
    for (const [otherId, otherChar] of this.gameEngine.characters) {
      if (otherId === characterId) continue;
      
      const relationship = this.getCompleteRelationship(characterId, otherId);
      
      // 应用过滤器
      if (this._passesFilters(relationship, filters)) {
        relationships.push(relationship);
      }
    }
    
    // 按重要性和强度排序
    relationships.sort((a, b) => {
      const importanceOrder = {
        critical: 5, very_high: 4, high: 3, medium: 2, low: 1, minimal: 0
      };
      
      const aImportance = importanceOrder[a.relationshipImportance] || 0;
      const bImportance = importanceOrder[b.relationshipImportance] || 0;
      
      if (aImportance !== bImportance) {
        return bImportance - aImportance;
      }
      
      return b.overallStrength - a.overallStrength;
    });
    
    return relationships;
  }

  /**
   * 检查关系是否通过过滤器
   * @param {Object} relationship - 关系信息
   * @param {Object} filters - 过滤条件
   * @returns {boolean} 是否通过
   */
  _passesFilters(relationship, filters) {
    // 关系类别过滤
    if (filters.category && relationship.primaryCategory !== filters.category) {
      return false;
    }
    
    // 重要性过滤
    if (filters.minImportance) {
      const importanceOrder = {
        critical: 5, very_high: 4, high: 3, medium: 2, low: 1, minimal: 0
      };
      const relationshipLevel = importanceOrder[relationship.relationshipImportance] || 0;
      const minLevel = importanceOrder[filters.minImportance] || 0;
      if (relationshipLevel < minLevel) return false;
    }
    
    // 强度过滤
    if (filters.minStrength && relationship.overallStrength < filters.minStrength) {
      return false;
    }
    
    // 血缘关系过滤
    if (filters.hasBloodRelation !== undefined) {
      const hasBlood = relationship.bloodRelation !== null;
      if (hasBlood !== filters.hasBloodRelation) return false;
    }
    
    return true;
  }

  /**
   * 获取自身关系信息
   * @returns {Object} 自身关系信息
   */
  _getSelfRelationship() {
    return {
      displayName: '自己',
      shortDisplayName: '自己',
      primaryCategory: 'self',
      overallStrength: 100,
      relationshipImportance: 'critical',
      relationshipTags: ['本人']
    };
  }

  /**
   * 获取未知关系信息
   * @param {string} fromId - 查询者ID
   * @param {string} toId - 目标ID
   * @returns {Object} 未知关系信息
   */
  _getUnknownRelationship(fromId, toId) {
    return {
      fromCharacterId: fromId,
      toCharacterId: toId,
      displayName: '未知',
      shortDisplayName: '未知',
      primaryCategory: 'unknown',
      overallStrength: 0,
      relationshipImportance: 'minimal',
      relationshipTags: ['未知']
    };
  }

  /**
   * 初始化显示配置
   * @returns {Object} 显示配置
   */
  _initDisplayConfig() {
    return {
      maxDisplayLength: 20,
      showEmotionalInBrackets: true,
      prioritizeBloodRelation: true,
      abbreviateCommonTitles: false,
      
      // 关系强度颜色配置
      strengthColors: {
        90: '#d32f2f',    // 红色 - 很强
        70: '#f57c00',    // 橙色 - 强
        50: '#fbc02d',    // 黄色 - 中等
        30: '#388e3c',    // 绿色 - 弱
        0: '#757575'      // 灰色 - 很弱
      },
      
      // 重要性图标
      importanceIcons: {
        critical: '🔥',
        very_high: '⭐',
        high: '🔸',
        medium: '●',
        low: '○',
        minimal: '·'
      }
    };
  }
}

export default ComplexRelationshipAPI;