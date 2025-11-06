// ==================== 修正后的 population_rules.js ====================

/**
 * population_rules.js - 人口配置访问接口 (修正版)
 * 
 * 职责：提供统一的配置访问接口，从 balance_config.json 读取数据
 * 不再包含具体配置数据，只负责接口封装和数据验证
 */

import UnifiedDataManager from './unified_data_manager.js';

class PopulationRulesInterface {
  constructor() {
    this.balanceConfig = null;
    this.initialized = false;
  }

  /**
   * 初始化配置数据
   * @param {Object} balanceConfig - 从 balance_config.json 加载的配置
   */
  async initialize(balanceConfig) {
    console.log('🔍 PopulationRules.initialize() 被调用');
    console.log('📋 传入的配置数据:', balanceConfig);
    console.log('📋 配置是否有 population_generation:', !!balanceConfig?.population_generation);
    
    this.balanceConfig = balanceConfig;
    this.initialized = true;
    console.log('✅ PopulationRules 配置接口初始化完成');
    console.log('🔍 初始化后 this.balanceConfig:', !!this.balanceConfig);
  }

  /**
   * 确保已初始化
   */
  _ensureInitialized() {
    if (!this.initialized) {
      throw new Error('PopulationRules 未初始化，请先调用 initialize()');
    }
  }

  /**
   * 获取系统设置
   */
  getSystemSettings() {
    this._ensureInitialized();
    return this.balanceConfig.system_settings;
  }

  /**
   * 获取生育年龄配置
   */
  getFertilityConfig() {
    this._ensureInitialized();
    return this.balanceConfig.population_generation.fertility_rules;
  }

  /**
   * 获取世代配置
   */
  getGenerationConfig() {
    this._ensureInitialized();
    return this.balanceConfig.population_generation.generation_structure;
  }
  
  /**
   * 获取世代配置
   */
  getFamilyRolesConfig() {
    this._ensureInitialized();
    return this.balanceConfig.population_generation.familyRoles;
  }

  /**
   * 获取完整的平衡配置
   */
  getBalanceConfig() {
    this._ensureInitialized();
    return this.balanceConfig;
  }



  /**
   * 获取后代繁衍率配置
   */
  getGapPlanningConfig() {
    this._ensureInitialized();
    return this.balanceConfig.population_generation.generationPlanning;
  }

  //获取家庭类型
  getFamilyStructureTypes() {
    this._ensureInitialized();
    return this.balanceConfig.population_generation.family_structure_types;
  }


  /**
   * 获取关系称谓规则
   */
  getRelationshipTitles() {
    this._ensureInitialized();
    // 称谓规则保持在代码中，因为是纯逻辑，不是参数
    return {
      siblingTitles: {
        male: {
          older: ['大哥', '二哥', '三哥', '四哥', '五哥', '六哥', '七哥', '八哥'],
          younger: ['小弟', '二弟', '三弟', '四弟', '五弟', '六弟', '七弟', '八弟']
        },
        female: {
          older: ['大姐', '二姐', '三姐', '四姐', '五姐', '六姐', '七姐', '八姐'],
          younger: ['小妹', '二妹', '三妹', '四妹', '五妹', '六妹', '七妹', '八妹']
        }
      },
      parentChildTitles: {
        toChild: {
          male: ['长子', '二子', '三子', '四子', '五子', '六子', '七子', '八子'],
          female: ['长女', '二女', '三女', '四女', '五女', '六女', '七女', '八女']
        },
        toParent: {
          male: '父亲',
          female: '母亲'
        }
      }
    };
  }

  /**
   * 获取关系强度配置
   */
  getRelationshipStrength() {
    this._ensureInitialized();
    return this.balanceConfig.population_generation.relationship_strength;
  }

  /**
   * 获取社会等级规则
   */
  getSocialClassRules() {
    this._ensureInitialized();
    return this.balanceConfig.population_generation.social_class_system;
  }

  /**
    * 获取婚配年龄规则
    */
  getMarriageRules() {
    this._ensureInitialized();
    
    // 使用新的统一配置路径
    const marriageSystem = this.balanceConfig.population_generation?.marriage_system;
    
    if (!marriageSystem) {
      console.warn('⚠️ marriage_system 配置未找到，使用默认配置');
      return this._getDefaultMarriageRules();
    }   
    return marriageSystem;
  }

  /**
   * 获取社会等级兼容性配置
   */
  getSocialClassCompatibility() {
    this._ensureInitialized();
    
    const marriageSystem = this.balanceConfig.population_generation?.marriage_system;
    return marriageSystem?.social_class_system || this._getDefaultSocialClassRules();
  }

  /**
   * 获取年龄匹配配置
   */
  getAgeMatchingRules() {
    this._ensureInitialized();
    
    const marriageSystem = this.balanceConfig.population_generation?.marriage_system;
    return marriageSystem?.age_requirements || this._getDefaultAgeRules();
  }

  /**
   * 获取默认婚姻规则 (备用方案)
   */
  _getDefaultMarriageRules() {
    return {
      legal_constraints: {
        same_surname: false,
        cross_ethnic_marriage: true
      },
      age_requirements: {
        marriageable_age: {
          male: { min: 16, max: 55 },
          female: { min: 13, max: 45 }
        },
        age_matching: {
          max_difference: 30,
          preferred_difference: 10,
          optimal_range: { min: 1, max: 8 }
        }
      },
      social_class_system: {
        max_class_gap: 2
      },
      cross_family_rules: {
        eligible_unit_ratio: 0.33,
        max_cross_marriages: 3
      }
    };
  }

  /**
   * 设置逃难模式
   */
  setRefugeeMode(enabled) {
    this._ensureInitialized();
    this.balanceConfig.population_generation.generationPlanning.refugeeMode.enabled = enabled;
    console.log(`🏃‍♂️ 逃难模式已${enabled ? '启用' : '关闭'}`);
  }

  /**
   * 获取逃难模式状态
   */
  getRefugeeMode() {
    this._ensureInitialized();
    return this.balanceConfig.population_generation.generationPlanning.refugeeMode;
  }

  /**
   * 获取家族归属流动规则
   */
  getFamilyAffiliationRules() {
    this._ensureInitialized();
    console.log('🔍 getFamilyAffiliationRules() 被调用');
    
    const affiliationSystem = this.balanceConfig.population_generation?.family_affiliation_system;
    
    if (!affiliationSystem) {
      console.warn('⚠️ family_affiliation_system 配置未找到，使用默认配置');
      return this._getDefaultAffiliationRules();
    }
    
    console.log('📋 家族归属系统配置加载成功');
    return affiliationSystem;
  }

  /**
   * 获取默认家族归属规则 (备用方案)
   */
  _getDefaultAffiliationRules() {
    return {
      marriage_mobility_rules: {
        default_pattern: {
          female_mobility: "patrilocal",
          male_mobility: "stays",
          children_affiliation: "paternal_line"
        },
        matrilocal_marriage: {
          scenarios: {
            noble_heir_shortage: { probability: 0.12 },
            economic_rescue: { probability: 0.03 }
          }
        }
      },
      transition_process: {
        female_integration_period: 365,
        male_adoption_period: 180
      }
    };
  }


  /**
     * 获取代际存活率
     */
  getMortalityConfig() {
    this._ensureInitialized();
    return this.balanceConfig.population_generation.mortalityRates;
  }
 

  /**
   * 获取逃难人群配置
   */
  getRefugeeConfig() {
    this._ensureInitialized();
    return this.balanceConfig.refugee_population;
  }

  /**
   * 获取社会等级权重调整配置
   */
  getSocialClassWeightAdjustments() {
    this._ensureInitialized();
    return this.balanceConfig.refugee_population.unit_weight_adjustments;
  }


  /**
   * 根据社会等级获取详细配置
   */
  getClassDetails(socialClass) {
    this._ensureInitialized();
    return this.balanceConfig.population_generation.social_class_system.class_details[socialClass] || null;
  }

  /**
   * 获取世代详情
   */
  getGenerationDetails(generation) {
    this._ensureInitialized();
    return this.balanceConfig.population_generation.generation_structure[generation.toString()] || null;
  }

  /**
   * 验证配置完整性
   */
  validateConfig() {
    this._ensureInitialized();
    const issues = [];
    
    // 验证世代配置
    for (let gen = 1; gen <= 5; gen++) {
      if (!this.getGenerationDetails(gen)) {
        issues.push(`缺少第${gen}代配置`);
      }
    }
    
    // 验证社会等级配置
    const hierarchy = this.getSocialClassRules().hierarchy;
    for (const cls of hierarchy) {
      if (!this.getClassDetails(cls)) {
        issues.push(`缺少${cls}等级详细配置`);
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }
}

// 创建全局实例
const PopulationRules = new PopulationRulesInterface();

// ==================== 工具函数保持不变 ====================

/**
 * 获取社会等级索引
 */
export function getSocialClassIndex(socialClass) {
  const hierarchy = PopulationRules.getSocialClassRules().hierarchy;
  return hierarchy.indexOf(socialClass);
}

/**
 * 检查两个社会等级是否可以通婚
 */
export function isSocialClassCompatible(class1, class2) {
  const index1 = getSocialClassIndex(class1);
  const index2 = getSocialClassIndex(class2);
  
  if (index1 === -1 || index2 === -1) return false;
  
  const gap = Math.abs(index1 - index2);
  const maxGap = PopulationRules.getMarriageRules().social_class_rules.max_class_gap;
  return gap <= maxGap;
}

/**
 * 计算血缘关系强度
 */
export function calculateRelationStrength(relationType, generationGap = 0, isDeceased = false) {
  const strengthConfig = PopulationRules.getRelationshipStrength();
  const baseStrength = strengthConfig.bloodline_base_strength[relationType] || 30;
  
  // 应用世代差距修正
  let modifier = 1.0;
  switch (generationGap) {
    case 1: modifier = strengthConfig.strength_modifiers.one_gen_gap; break;
    case 2: modifier = strengthConfig.strength_modifiers.two_gen_gap; break;
    case 3: modifier = strengthConfig.strength_modifiers.three_gen_gap; break;
    default: modifier = Math.max(0.3, 1.0 - generationGap * 0.1); break;
  }
  
  // 应用已故修正
  if (isDeceased) {
    modifier *= strengthConfig.strength_modifiers.deceased;
  }
  
  return Math.round(baseStrength * modifier);
}

/**
 * 生成中文数字
 */
export function numberToChinese(num) {
  const numbers = ['', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  return numbers[num] || num.toString();
}

// ==================== 配置加载管理器 ====================

class ConfigurationManager {
  constructor() {
    this.loadPromise = null;
    this.dataManager = null;
  }
  
  /**
     * 设置数据管理器
     */
  setDataManager(dataManager) {
    this.dataManager = dataManager;
  }

  /**
   * 加载并初始化所有配置
   */
  async initializeConfigurations() {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._loadConfigurations();
    return this.loadPromise;
  }

  async _loadConfigurations() {
    try {
      console.log('🔍 开始加载 balance_config.json...');
      
      // 恢复使用统一接口
      const balanceConfig = await this.dataManager.getBalanceConfig();
      
      console.log('📋 配置文件加载成功');
      
      // 初始化 PopulationRules 接口
      await PopulationRules.initialize(balanceConfig);
      
      console.log('✅ 所有配置加载完成');
      return { success: true };
      
    } catch (error) {
      console.error('❌ 配置加载失败:', error);
      throw error;
    }
  }
}



// 创建全局配置管理器
const configManager = new ConfigurationManager();


// ==================== 导出 ====================

export { 
  PopulationRules,
  ConfigurationManager,
  configManager
};

export default PopulationRules;