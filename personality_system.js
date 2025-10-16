/**
 * personality_system.js - 人格系统整合器
 * 
 * 功能：
 * - 提供 AbilityTraits 能力特质类
 * - 整合现有的 PhysicalState 和 EmotionalState
 * - 提供高级人格分析功能
 * - 行为决策配置加载器
 */

import { Utils } from './utils_module.js';

/**
 * 能力特质类
 * 管理角色的各种能力数值
 */
export class AbilityTraits {
  constructor(config = {}) {
    // 物理能力
    this.strength_burst = config.strength_burst || 50;
    this.strength_endurance = config.strength_endurance || 50;
    this.dexterity = config.dexterity || 50;
    this.constitution = config.constitution || 50;
    
    // 心理能力
    this.memory = config.memory || 50;
    this.creativity = config.creativity || 50;
    this.logic = config.logic || 50;
    this.focus = config.focus || 50;
    
    // 社交能力
    this.charisma = config.charisma || 50;
    this.empathy = config.empathy || 50;
    this.leadership = config.leadership || 50;
    
    // 能力发展记录
    this.developmentHistory = [];
  }

  /**
   * 应用能力变化
   * @param {Object} changes - 能力变化
   * @param {string} source - 变化来源
   */
  applyAbilityChanges(changes, source = 'unknown') {
    const applied = {};
    
    for (const [ability, change] of Object.entries(changes)) {
      if (this.hasOwnProperty(ability)) {
        const oldValue = this[ability];
        this[ability] = Utils.Math.clamp(this[ability] + change, 0, 100);
        applied[ability] = this[ability] - oldValue;
      }
    }
    
    // 记录发展
    this.developmentHistory.push({
      source: source,
      changes: applied,
      timestamp: Date.now()
    });
    
    if (this.developmentHistory.length > 15) {
      this.developmentHistory.shift();
    }
  }

  /**
   * 获取技能相关能力
   * @param {string} skillName - 技能名称
   * @returns {Object} 相关能力及其权重
   */
  getSkillRelevantAbilities(skillName) {
    const skillAbilityMap = {
      '垦荒耕钟': { strength_endurance: 0.6, constitution: 0.4 },
      '拓地伐林': { strength_burst: 0.5, dexterity: 0.3, constitution: 0.2 },
      '手工雕琢': { dexterity: 0.7, creativity: 0.2, focus: 0.1 },
      '经义研读': { memory: 0.5, logic: 0.3, focus: 0.2 },
      '艺术创作': { creativity: 0.6, dexterity: 0.2, memory: 0.2 },
      '觅求好友': { charisma: 0.5, empathy: 0.3, leadership: 0.2 },
      '武艺精进': { strength_burst: 0.4, dexterity: 0.4, constitution: 0.2 },
      '熔炼铸锻': { strength_burst: 0.3, dexterity: 0.4, focus: 0.3 },
      '商业贸易': { charisma: 0.4, logic: 0.3, memory: 0.3 },
      '外交谈判': { charisma: 0.5, logic: 0.3, empathy: 0.2 },
      '医术诊治': { memory: 0.4, logic: 0.3, focus: 0.3 }
    };
    
    return skillAbilityMap[skillName] || {};
  }

  /**
   * 获取能力分类摘要
   * @returns {Object} 能力摘要
   */
  getSummary() {
    return {
      physical: (this.strength_burst + this.strength_endurance + this.dexterity + this.constitution) / 4,
      mental: (this.memory + this.creativity + this.logic + this.focus) / 4,
      social: (this.charisma + this.empathy + this.leadership) / 3,
      strongest: this.getStrongestAbility(),
      weakest: this.getWeakestAbility()
    };
  }

  /**
   * 获取最强能力
   * @returns {Object} 最强能力信息
   */
  getStrongestAbility() {
    const abilities = {
      strength_burst: this.strength_burst,
      strength_endurance: this.strength_endurance,
      dexterity: this.dexterity,
      constitution: this.constitution,
      memory: this.memory,
      creativity: this.creativity,
      logic: this.logic,
      focus: this.focus,
      charisma: this.charisma,
      empathy: this.empathy,
      leadership: this.leadership
    };

    const strongest = Object.entries(abilities).reduce((a, b) => a[1] > b[1] ? a : b);
    return { name: strongest[0], value: strongest[1] };
  }

  /**
   * 获取最弱能力
   * @returns {Object} 最弱能力信息
   */
  getWeakestAbility() {
    const abilities = {
      strength_burst: this.strength_burst,
      strength_endurance: this.strength_endurance,
      dexterity: this.dexterity,
      constitution: this.constitution,
      memory: this.memory,
      creativity: this.creativity,
      logic: this.logic,
      focus: this.focus,
      charisma: this.charisma,
      empathy: this.empathy,
      leadership: this.leadership
    };

    const weakest = Object.entries(abilities).reduce((a, b) => a[1] < b[1] ? a : b);
    return { name: weakest[0], value: weakest[1] };
  }
}

/**
 * 人格配置加载器
 * 专门负责加载和管理人格系统的配置数据
 */
export class PersonalityConfigLoader {
  constructor() {
    this.personalityConfig = null;
    this.behaviorPatterns = null;
    this.emotionalReactions = null;
    this.loaded = false;
  }

  /**
   * 加载所有人格配置
   * @param {Object} dataTableManager - 数据表管理器
   */
  async loadConfigurations(dataTableManager) {
    try {
      this.personalityConfig = await dataTableManager.getPersonalityConfig();
      this.behaviorPatterns = await dataTableManager.getBehaviorPatterns();
      this.emotionalReactions = await dataTableManager.getEmotionalReactions();
      
      this.loaded = true;
      console.log('✅ 人格系统配置加载完成');
      
    } catch (error) {
      console.error('❌ 人格系统配置加载失败:', error);
      this.loaded = false;
    }
  }

  /**
   * 获取行为模式配置
   * @param {string} behaviorCategory - 行为分类
   * @returns {Object} 行为配置
   */
  getBehaviorConfig(behaviorCategory) {
    if (!this.loaded || !this.behaviorPatterns) return null;
    return this.behaviorPatterns.behaviorCategories?.[behaviorCategory];
  }

  /**
   * 获取情绪反应配置
   * @param {string} reactionType - 反应类型
   * @returns {Object} 反应配置
   */
  getEmotionalReactionConfig(reactionType) {
    if (!this.loaded || !this.emotionalReactions) return null;
    return this.emotionalReactions.emotionalReactionRules?.[reactionType];
  }

  /**
   * 获取社会阶层的能力修正
   * @param {string} socialClass - 社会阶层
   * @returns {Object} 能力修正配置
   */
  getSocialClassAbilityModifiers(socialClass) {
    if (!this.loaded || !this.personalityConfig) return {};
    
    return this.personalityConfig.personalityGeneration?.socialClassModifiers?.[socialClass]?.abilityBonuses || {};
  }

  /**
   * 获取年龄的能力修正
   * @param {number} age - 年龄
   * @returns {Object} 能力修正配置
   */
  getAgeAbilityModifiers(age) {
    if (!this.loaded || !this.personalityConfig) return {};
    
    const ageModifiers = this.personalityConfig.personalityGeneration?.ageModifiers;
    if (!ageModifiers) return {};
    
    for (const [category, config] of Object.entries(ageModifiers)) {
      if (age >= config.range[0] && age <= config.range[1]) {
        return config.abilityModifiers || {};
      }
    }
    
    return {};
  }

  /**
   * 获取性别的能力修正
   * @param {string} gender - 性别
   * @returns {Object} 能力修正配置
   */
  getGenderAbilityModifiers(gender) {
    if (!this.loaded || !this.personalityConfig) return {};
    
    return this.personalityConfig.personalityGeneration?.genderModifiers?.[gender]?.abilityModifiers || {};
  }
}

/**
 * 人格分析工具
 * 提供高级的人格分析功能
 */
export class PersonalityAnalyzer {
  /**
   * 分析角色的人格类型
   * @param {Object} character - 角色对象
   * @returns {Object} 人格分析结果
   */
  static analyzePersonalityType(character) {
    const analysis = {
      primaryTraits: [],
      secondaryTraits: [],
      personalityType: 'unknown',
      behaviorTendencies: {},
      recommendations: []
    };

    // 分析德行特质
    if (character.virtueSystem) {
      const dominantVirtues = character.virtueSystem.getDominantVirtues ? 
        character.virtueSystem.getDominantVirtues() : [];
      analysis.primaryTraits = dominantVirtues.slice(0, 3);
    }

    // 分析能力特质
    if (character.abilityTraits) {
      const abilitySummary = character.abilityTraits.getSummary();
      analysis.strongestAbility = abilitySummary.strongest;
      analysis.weakestAbility = abilitySummary.weakest;
      
      // 基于能力判断人格类型
      if (abilitySummary.social > 70) {
        analysis.personalityType = '社交型';
      } else if (abilitySummary.mental > 70) {
        analysis.personalityType = '学者型';
      } else if (abilitySummary.physical > 70) {
        analysis.personalityType = '实干型';
      } else {
        analysis.personalityType = '平衡型';
      }
    }

    // 分析行为倾向
    if (character.behaviorHistory && character.behaviorHistory.length > 0) {
      analysis.behaviorTendencies = this.analyzeBehaviorPatterns(character.behaviorHistory);
    }

    // 生成建议
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * 分析行为模式
   * @param {Array} behaviorHistory - 行为历史
   * @returns {Object} 行为模式分析
   */
  static analyzeBehaviorPatterns(behaviorHistory) {
    const patterns = {};
    const behaviorCounts = {};
    
    // 统计行为频率
    for (const record of behaviorHistory) {
      behaviorCounts[record.action] = (behaviorCounts[record.action] || 0) + 1;
    }
    
    // 分析模式
    const totalActions = behaviorHistory.length;
    const sortedBehaviors = Object.entries(behaviorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    patterns.mostFrequentActions = sortedBehaviors.map(([action, count]) => ({
      action,
      frequency: count / totalActions,
      count
    }));
    
    // 分析行为类型偏好
    const workActions = ['垦荒耕种', '手工雕琢', '熔炼铸锻', '坞堡营造'];
    const socialActions = ['觅求好友', '饮酒聚宴', '追求伴侣'];
    const culturalActions = ['经义研读', '艺术创作', '起舞弄乐'];
    
    patterns.workOriented = this.calculateCategoryFrequency(behaviorCounts, workActions, totalActions);
    patterns.socialOriented = this.calculateCategoryFrequency(behaviorCounts, socialActions, totalActions);
    patterns.culturalOriented = this.calculateCategoryFrequency(behaviorCounts, culturalActions, totalActions);
    
    return patterns;
  }

  /**
   * 计算某类行为的频率
   * @param {Object} behaviorCounts - 行为计数
   * @param {Array} categoryActions - 分类行为列表
   * @param {number} total - 总行为数
   * @returns {number} 频率
   */
  static calculateCategoryFrequency(behaviorCounts, categoryActions, total) {
    const categoryCount = categoryActions.reduce((sum, action) => 
      sum + (behaviorCounts[action] || 0), 0);
    return categoryCount / total;
  }

  /**
   * 生成个人发展建议
   * @param {Object} analysis - 分析结果
   * @returns {Array} 建议列表
   */
  static generateRecommendations(analysis) {
    const recommendations = [];
    
    // 基于人格类型的建议
    switch (analysis.personalityType) {
      case '社交型':
        recommendations.push('适合从事外交谈判、商业贸易等工作');
        recommendations.push('可以多参与组织和领导活动');
        break;
      case '学者型':
        recommendations.push('适合从事经义研读、艺术创作等工作');
        recommendations.push('可以考虑担任教师或顾问角色');
        break;
      case '实干型':
        recommendations.push('适合从事体力劳动和手工制作');
        recommendations.push('可以在建设和生产方面发挥专长');
        break;
      default:
        recommendations.push('具有平衡发展的潜力');
        recommendations.push('可以尝试多种不同类型的工作');
    }
    
    // 基于弱项的改进建议
    if (analysis.weakestAbility) {
      const abilityNames = {
        strength_burst: '爆发力',
        strength_endurance: '持久力',
        dexterity: '敏捷度',
        constitution: '体质',
        memory: '记忆力',
        creativity: '创造力',
        logic: '逻辑思维',
        focus: '专注力',
        charisma: '魅力',
        empathy: '共情能力',
        leadership: '领导力'
      };
      
      const weakAbilityName = abilityNames[analysis.weakestAbility.name] || analysis.weakestAbility.name;
      if (analysis.weakestAbility.value < 40) {
        recommendations.push(`建议加强${weakAbilityName}的训练和练习`);
      }
    }
    
    return recommendations;
  }
}

// 导出默认的配置加载器实例
export const personalityConfigLoader = new PersonalityConfigLoader();

export default { AbilityTraits, PersonalityConfigLoader, PersonalityAnalyzer, personalityConfigLoader };