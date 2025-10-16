/**
 * population_planning_service.js - 逃难人群构成规划器
 * 
 * Service Layer 模块 - 专门负责逃难人群的构成规划
 * 架构层级：Service Layer (服务层) - 业务逻辑处理
 * 
 * 核心功能：
 * 1. 人群规模与构成规划 - 总人数、社会阶层分布、家族单元类型
 * 2. 基于权重的随机家族单元生成
 * 3. 社会阶层动态分布
 * 4. 人群规模弹性调整
 */

import { PopulationRules } from './population_rules.js';
import { Utils } from './utils_module.js';

/**
 * 逃难人群构成规划服务
 */
export class PopulationPlanningService {
  constructor() {
    // 初始化状态，不在构造函数中获取配置
    this.configInitialized = false;
    
    // 规划状态
    this.currentPlan = null;
    this.planningHistory = [];
    
    console.log('🏕️ PopulationPlanningService - 逃难人群构成规划器初始化');
  }
 
  
  async initialize() {
    if (this.configInitialized) return;
    
    try {
      console.log('📋 正在初始化 PopulationPlanningService 配置...');
      
      // 获取配置引用
      this.refugeeConfig = PopulationRules.getRefugeeConfig();
      this.socialClassConfig = PopulationRules.getSocialClassRules();
      this.systemSettings = PopulationRules.getSystemSettings();
      
      this.configInitialized = true;
      console.log('✅ PopulationPlanningService 配置初始化完成');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ PopulationPlanningService 配置初始化失败:', error);
      throw error;
    }
  }

  /**
   * 确保配置已初始化
   */
  _ensureConfigInitialized() {
    if (!this.configInitialized) {
      throw new Error('PopulationPlanningService 未初始化，请先调用 initialize() 方法');
    }
  }


  /**
   * 规划人群构成的主要入口方法
   * @param {Object} config - 规划配置
   * @returns {Object} 人群构成规划结果
   */
  planPopulationComposition(config = {}) {
    const waveType = config.waveType || 'initial'; // 'initial' | 'followup'
    const waveNumber = config.waveNumber || 1;
    
    console.log(`📊 开始规划逃难人群构成 - 波次${waveNumber} (${waveType})`);
    
    // 使用原有的配置合并
    let planningConfig = this._mergePlanningConfig(config);
    
    // 根据波次类型调整配置
    planningConfig = this._adjustConfigForWaveType(planningConfig, waveType, waveNumber);
    
    // 根据波次类型确定规模
    const targetSize = this._determineFinalPopulationSize(planningConfig, waveType);
    
    // 社会分布规划（后续波次可能有不同的社会构成）
    const socialDistribution = this._generateSocialDistribution(targetSize, planningConfig, waveType);
    
    // 家族单元规划
    const familyUnits = this._generateFamilyUnitPlan(socialDistribution, planningConfig, waveType);
    
    // 添加波次特有的处理
    if (waveType === 'followup') {
      this._processReunificationOpportunities(familyUnits, waveNumber);
    }
    
    // 现有的验证和生成逻辑
    const validatedPlan = this._validateAndAdjustPlan(familyUnits, targetSize);
    const finalPlan = this._generateFinalPlan(validatedPlan, targetSize, planningConfig, waveType, waveNumber);
    
    return finalPlan;
  }

  _processReunificationOpportunities(familyUnits, waveNumber) {
    // 检查是否有失散成员可以重聚
    // 基于之前记录的separatedMembers数据
    const reunificationChance = 0.15 * waveNumber; // 波次越晚，重聚概率越高
    
    // 这里可以添加具体的重聚逻辑
    console.log(`波次${waveNumber}重聚概率: ${reunificationChance}`);
  }


  /**
   * 合并规划配置
   * @param {Object} userConfig - 用户配置
   * @returns {Object} 合并后的配置
   */
  _mergePlanningConfig(userConfig) {
    // 保持原有代码不变
    const defaultConfig = {
      targetSize: this.refugeeConfig.population_size.target_size,
      minSize: this.refugeeConfig.population_size.min_size,
      maxSize: this.refugeeConfig.population_size.max_size,
      socialDistribution: { ...this.refugeeConfig.social_distribution },
      randomSeed: null,
      specialConstraints: {}
    };
  
    return {
      ...defaultConfig,
      ...userConfig,
      targetSize: Math.max(defaultConfig.minSize, 
                  Math.min(defaultConfig.maxSize, userConfig.targetSize || defaultConfig.targetSize))
    };
  }
  
  // 新增：波次特有的配置调整
  _adjustConfigForWaveType(mergedConfig, waveType, waveNumber) {
    if (waveType === 'followup') {
      const waveConfig = PopulationRules.getBalanceConfig().refugee_population.refugee_wave_system;
      
      // 使用统一的配置路径
      const followupSizeRange = waveConfig.followUpWaves.populationRange;
      mergedConfig.targetSize = Math.min(mergedConfig.targetSize, followupSizeRange[1]);
      mergedConfig.minSize = followupSizeRange[0];
      mergedConfig.maxSize = followupSizeRange[1];
      
      mergedConfig.minFamilies = waveConfig.followUpWaves.familyCountRange[0];
      mergedConfig.maxFamilies = waveConfig.followUpWaves.familyCountRange[1];
      
      mergedConfig.socialDistribution = this._adjustSocialDistributionForFollowup(
        mergedConfig.socialDistribution, 
        waveNumber
      );
    }
    
    return mergedConfig;
  }

  _adjustSocialDistributionForFollowup(originalDistribution, waveNumber) {
    const adjustedDistribution = { ...originalDistribution };
    const waveConfig = PopulationRules.getBalanceConfig().refugee_population.refugee_wave_system;
    const adjustmentConfig = waveConfig.social_distribution_adjustment;

    // 使用配置的调整因子
    const waveAdjustment = Math.min(
      waveNumber * adjustmentConfig.wave_adjustment_factor, 
      adjustmentConfig.max_adjustment
    );
    
    if (adjustedDistribution['门阀士族']) {
      adjustedDistribution['门阀士族'] *= (1 - waveAdjustment * adjustmentConfig.noble_reduction_rate);
    }
    
    if (adjustedDistribution['寒门']) {
      adjustedDistribution['寒门'] *= (1 - waveAdjustment * adjustmentConfig.scholar_reduction_rate);
    }
    
    // 重新分配
    const redistributedWeight = waveAdjustment * adjustmentConfig.redistribution_factor;
    if (adjustedDistribution['平民']) {
      adjustedDistribution['平民'] += redistributedWeight * adjustmentConfig.commoner_redistribution;
    }
    
    if (adjustedDistribution['工匠']) {
      adjustedDistribution['工匠'] += redistributedWeight * adjustmentConfig.artisan_redistribution;
    }
    
    // 权重归一化
    const totalWeight = Object.values(adjustedDistribution).reduce((sum, weight) => sum + weight, 0);
    Object.keys(adjustedDistribution).forEach(key => {
      adjustedDistribution[key] /= totalWeight;
    });
    
    return adjustedDistribution;
  }

  /**
   * 确定最终人群规模
   * @param {Object} config - 规划配置
   * @returns {number} 最终人群数量
   */
  _determineFinalPopulationSize(config) {
    const { targetSize, minSize, maxSize } = config;
    
    // 引入随机性，但控制在合理范围内
    const variance = Math.floor(targetSize * 0.2); // 20% 变动范围
    const randomAdjustment = Utils.Math.randomInt(-variance, variance);
    
    const finalSize = targetSize + randomAdjustment;
    
    // 确保在边界范围内
    return Utils.Math.clamp(finalSize, minSize, maxSize);
  }

  /**
   * 生成社会阶层分布
   * @param {number} totalSize - 总人数
   * @param {Object} config - 规划配置
   * @returns {Object} 社会阶层分布结果
   */
  _generateSocialDistribution(totalSize, config) {
    const distribution = {};
    const { socialDistribution } = config;
    
    let allocatedPeople = 0;
    const classes = Object.keys(socialDistribution);
    
    // 按比例分配，最后一个等级承担余数
    for (let i = 0; i < classes.length; i++) {
      const socialClass = classes[i];
      const ratio = socialDistribution[socialClass];
      
      if (i === classes.length - 1) {
        // 最后一个等级承担剩余人数
        distribution[socialClass] = totalSize - allocatedPeople;
      } else {
        const classSize = Math.round(totalSize * ratio);
        distribution[socialClass] = classSize;
        allocatedPeople += classSize;
      }
    }
    
    // 确保至少每个等级有1人（如果总人数足够）
    this._ensureMinimumRepresentation(distribution, totalSize);
    
    console.log('📈 社会阶层分布:', distribution);
    
    return distribution;
  }

  /**
   * 生成家族单元规划
   * @param {Object} socialDistribution - 社会阶层分布
   * @param {Object} config - 规划配置
   * @returns {Array} 家族单元规划列表
   */
  _generateFamilyUnitPlan(socialDistribution, config) {
    const familyUnits = [];    
    
    // 为每个社会等级生成家族单元
    Object.entries(socialDistribution).forEach(([socialClass, peopleCount]) => {
      if (peopleCount > 0) {
        const classUnits = this._generateUnitsForSocialClass(
          socialClass, 
          peopleCount,           
        );
        familyUnits.push(...classUnits);
      }
    });
    
    // 按优先级排序（门阀士族优先）
    familyUnits.sort((a, b) => {
      const priority = {
        '门阀士族': 5, '寒门': 4, '庶族': 3, '胡族': 2, '平民': 1
      };
      return (priority[b.socialClass] || 0) - (priority[a.socialClass] || 0);
    });
    
    console.log(`👨‍👩‍👧‍👦 生成 ${familyUnits.length} 个家族单元`);
    
    return familyUnits;
  }

  /**
   * 为特定社会等级生成家族单元
   * @param {string} socialClass - 社会等级
   * @param {number} peopleCount - 该等级人数
   * @param {Object} unitWeights - 家族单元权重
   * @returns {Array} 该等级的家族单元列表
   */
  _generateUnitsForSocialClass(socialClass, peopleCount, unitWeights) {
    const units = [];
    let remainingPeople = peopleCount;
    
    while (remainingPeople > 0) {
      // 1. 确定家族规模类别
      const sizeCategory = this._selectFamilySizeCategory();
      const categoryConfig = this.refugeeConfig.family_size_categories[sizeCategory];
      
      // 2. 在类别范围内确定具体规模
      const familySize = Math.min(
        Utils.Math.randomInt(categoryConfig.min_size, categoryConfig.max_size),
        remainingPeople
      );
      
      // 3. 选择家族发展模式
      const generationPattern = this._selectGenerationPattern();
      
      // 4. 创建家族单元规划
      const familyUnit = this._createFamilyUnitPlan('five_generation_family', familySize, socialClass, generationPattern);
      
      units.push(familyUnit);
      remainingPeople -= familySize;
    }
    
    return units;
  }

  _selectFamilySizeCategory() {
    const categories = this.refugeeConfig.family_size_categories;
    const weights = Object.values(categories).map(c => c.weight);
    const types = Object.keys(categories);
    
    return Utils.Math.weightedRandom(types, weights);
  }
  
  _selectGenerationPattern() {
    const patterns = Object.keys(this.refugeeConfig.family_generation_patterns);
    const weights = Object.values(this.refugeeConfig.pattern_distribution);
    
    return Utils.Math.weightedRandom(patterns, weights);
  }

  
  
  /**
   * 获取社会等级的家族规模偏好
   * @param {string} socialClass - 社会等级
   * @returns {number} 规模偏好系数 (0.5-1.0)
   */
  _getSizePreferenceForClass(socialClass) {
    const preferences = {
      '门阀士族': 0.8,  // 偏向较大家族
      '寒门': 0.7,
      '庶族': 0.6,
      '胡族': 0.6,
      '平民': 0.5       // 偏向较小家族
    };
    
    return preferences[socialClass] || 0.6;
  }

  /**
   * 创建家族单元规划
   * @param {string} unitType - 单元类型
   * @param {number} unitSize - 单元大小
   * @param {string} socialClass - 社会等级
   * @param {string} generationPattern - 家族模式
   * @returns {Object} 家族单元规划
   */
  _createFamilyUnitPlan(unitType, unitSize, socialClass, generationPattern) {
    console.log('🔍 创建家族单元:', { unitType, unitSize, socialClass });
    if (isNaN(unitSize)) {
      console.error('❌ unitSize 为 NaN!');
    }
    const unitId = `unit_${socialClass}_${unitType}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    
    return {
      unitId: unitId,
      unitType: unitType,
      targetSize: unitSize,
      size: unitSize,
      socialClass: socialClass,
      
      // 家族发展模式
      generationPattern: generationPattern,
      patternConfig: this.refugeeConfig.family_generation_patterns[generationPattern],
      
      // 基础信息
      description: `五代家族（${generationPattern}模式）`,
      
      // 特殊属性
      specialTraits: this._generateUnitSpecialTraits(unitType, socialClass),
      
      // 创建信息
      createdAt: Date.now(),
      plannerVersion: 'PopulationPlanningService v2.0'
    };
  }

  
  /**
   * 生成单元特殊特征
   * @param {string} unitType - 单元类型
   * @param {string} socialClass - 社会等级
   * @returns {Array} 特殊特征列表
   */
  _generateUnitSpecialTraits(unitType, socialClass) {
    const traits = [];
    
    // 从配置文件获取特征，避免硬编码
    const typeTraits = this.refugeeConfig.unit_traits[unitType] || [];
    const classTraits = this.refugeeConfig.social_class_traits[socialClass] || [];

    traits.push(...(typeTraits[unitType] || []));
    traits.push(...(classTraits[socialClass] || []));
    
    return traits;
  }

  /**
   * 验证和调整规划
   * @param {Array} familyUnits - 家族单元列表
   * @param {number} targetSize - 目标人数
   * @returns {Array} 调整后的家族单元列表
   */
  _validateAndAdjustPlan(familyUnits, targetSize) {
     // 调试家族单元数据
    console.log('🔍 调试家族单元数据:');
    familyUnits.forEach((unit, index) => {
      console.log(`单元${index}:`, {
        unitId: unit.unitId,
        size: unit.size,
        targetSize: unit.targetSize,
        socialClass: unit.socialClass
      });
      if (isNaN(unit.size)) {
        console.error(`❌ 单元${index} size 为 NaN:`, unit);
      }
    });

    let totalPeople = familyUnits.reduce((sum, unit) => sum + unit.size, 0);
    console.log('🔍 totalPeople 计算结果:', totalPeople);
    
    // 如果人数不匹配，进行微调
    if (totalPeople !== targetSize) {
      console.log(`⚖️ 调整人数: 当前 ${totalPeople} → 目标 ${targetSize}`);
      familyUnits = this._adjustPeopleCount(familyUnits, targetSize, totalPeople);
    }
    
    // 验证社会等级分布合理性
    this._validateSocialDistribution(familyUnits);
    
    // 验证家族单元多样性
    this._validateUnitDiversity(familyUnits);
    
    return familyUnits;
  }

  /**
   * 调整人数匹配目标
   * @param {Array} familyUnits - 家族单元
   * @param {number} targetSize - 目标人数
   * @param {number} currentSize - 当前人数
   * @returns {Array} 调整后的家族单元
   */
  _adjustPeopleCount(familyUnits, targetSize, currentSize) {
    const difference = targetSize - currentSize;
    
    if (difference > 0) {
      // 需要增加人数 - 扩大现有单元或添加新单元
      return this._addPeople(familyUnits, difference);
    } else if (difference < 0) {
      // 需要减少人数 - 缩小现有单元
      return this._removePeople(familyUnits, -difference);
    }
    
    return familyUnits;
  }

  /**
   * 增加人数
   * @param {Array} familyUnits - 家族单元
   * @param {number} peopleToAdd - 需要增加的人数
   * @returns {Array} 调整后的家族单元
   */
  _addPeople(familyUnits, peopleToAdd) {
    let remaining = peopleToAdd;
    
    // 优先扩大现有的大型单元
    familyUnits
      .filter(unit => unit.size >= 3)
      .sort((a, b) => b.size - a.size)
      .forEach(unit => {
        if (remaining > 0) {
          const maxIncrease = Math.min(2, remaining); // 每个单元最多增加2人
          unit.size += maxIncrease;
          remaining -= maxIncrease;
          console.log(`📈 扩大单元 ${unit.unitId}: +${maxIncrease}人`);
        }
      });
    
    // 如果还有剩余，创建新的单身成人单元
    if (remaining > 0) {
      const newUnit = this._createFamilyUnitPlan('single_adult', remaining, '平民');
      familyUnits.push(newUnit);
      console.log(`➕ 新增单元: ${remaining}个单身成人`);
    }
    
    return familyUnits;
  }

  /**
   * 减少人数
   * @param {Array} familyUnits - 家族单元
   * @param {number} peopleToRemove - 需要减少的人数
   * @returns {Array} 调整后的家族单元
   */
  _removePeople(familyUnits, peopleToRemove) {
    let remaining = peopleToRemove;
    
    // 优先缩小较大的单元
    familyUnits
      .filter(unit => unit.size > 1)
      .sort((a, b) => b.size - a.size)
      .forEach(unit => {
        if (remaining > 0) {
          const maxDecrease = Math.min(unit.size - 1, remaining); // 保留至少1人
          unit.size -= maxDecrease;
          remaining -= maxDecrease;
          console.log(`📉 缩小单元 ${unit.unitId}: -${maxDecrease}人`);
        }
      });
    
    // 如果还需要减少，移除最小的单元
    while (remaining > 0 && familyUnits.length > 1) {
      const smallestUnit = familyUnits.reduce((min, unit) => 
        unit.size < min.size ? unit : min
      );
      
      const unitIndex = familyUnits.indexOf(smallestUnit);
      familyUnits.splice(unitIndex, 1);
      remaining -= smallestUnit.size;
      console.log(`➖ 移除单元 ${smallestUnit.unitId}: -${smallestUnit.size}人`);
    }
    
    return familyUnits;
  }

  /**
   * 验证社会等级分布合理性
   * @param {Array} familyUnits - 家族单元
   */
  _validateSocialDistribution(familyUnits) {
    const distribution = {};
    familyUnits.forEach(unit => {
      distribution[unit.socialClass] = (distribution[unit.socialClass] || 0) + unit.size;
    });
    
    console.log('📊 最终社会等级分布:', distribution);
  }

  /**
   * 验证家族单元多样性
   * @param {Array} familyUnits - 家族单元
   */
  _validateUnitDiversity(familyUnits) {
    const typeCounts = {};
    familyUnits.forEach(unit => {
      typeCounts[unit.unitType] = (typeCounts[unit.unitType] || 0) + 1;
    });
    
    console.log('🏠 家族单元类型分布:', typeCounts);
  }

  /**
   * 生成最终规划报告
   * @param {Array} familyUnits - 验证后的家族单元
   * @param {number} targetSize - 目标人数
   * @param {Object} config - 规划配置
   * @returns {Object} 最终规划报告
   */
  _generateFinalPlan(familyUnits, targetSize, config) {
    const actualSize = familyUnits.reduce((sum, unit) => sum + unit.size, 0);
    
    return {
      // 基础信息
      planId: `plan_${Date.now()}`,
      timestamp: Date.now(),
      
      // 人群统计
      targetPeople: targetSize,
      actualPeople: actualSize,
      totalPeople: actualSize,
      
      // 家族单元
      familyUnits: familyUnits,
      unitCount: familyUnits.length,
      
      // 统计信息
      socialDistribution: this._calculateFinalSocialDistribution(familyUnits),
      unitTypeDistribution: this._calculateUnitTypeDistribution(familyUnits),
      ageGroupEstimate: this._estimateAgeGroupDistribution(familyUnits),
      
      // 规划质量指标
      diversityScore: this._calculateDiversityScore(familyUnits),
      realismScore: this._calculateRealismScore(familyUnits),
      
      // 元信息
      planningConfig: config,
      plannerVersion: 'PopulationPlanningService v1.0'
    };
  }

  /**
   * 计算最终社会等级分布
   * @param {Array} familyUnits - 家族单元
   * @returns {Object} 社会等级分布
   */
  _calculateFinalSocialDistribution(familyUnits) {
    const distribution = {};
    familyUnits.forEach(unit => {
      distribution[unit.socialClass] = (distribution[unit.socialClass] || 0) + unit.size;
    });
    return distribution;
  }

  /**
   * 计算单元类型分布
   * @param {Array} familyUnits - 家族单元
   * @returns {Object} 单元类型分布
   */
  _calculateUnitTypeDistribution(familyUnits) {
    const distribution = {};
    familyUnits.forEach(unit => {
      distribution[unit.unitType] = (distribution[unit.unitType] || 0) + 1;
    });
    return distribution;
  }

  /**
   * 估算年龄组分布
   * @param {Array} familyUnits - 家族单元
   * @returns {Object} 年龄组分布估算
   */
  _estimateAgeGroupDistribution(familyUnits) {
    let adults = 0, children = 0, elderly = 0;
    
    // 从配置获取年龄分布比例
    const ageConfig = this.refugeeConfig.ageDistributionEstimation;
    
    familyUnits.forEach(unit => {
      const familySize = unit.targetSize || unit.size;
      
      adults += Math.round(familySize * ageConfig.adults);
      children += Math.round(familySize * ageConfig.children);
      elderly += Math.round(familySize * ageConfig.elderly);
    });
    
    return { adults, children, elderly };
  }

  /**
   * 计算多样性得分
   * @param {Array} familyUnits - 家族单元
   * @returns {number} 多样性得分 (0-100)
   */
  _calculateDiversityScore(familyUnits) {
    const typeCount = new Set(familyUnits.map(u => u.unitType)).size;
    const classCount = new Set(familyUnits.map(u => u.socialClass)).size;
    
    // 基于类型和等级多样性计算分数
    const maxTypes = Object.keys(this.refugeeConfig.family_generation_patterns).length;
    const maxClasses = Object.keys(this.refugeeConfig.social_distribution).length;
    
    const typeScore = (typeCount / maxTypes) * 50;
    const classScore = (classCount / maxClasses) * 50;
    
    return Math.round(typeScore + classScore);
  }

  /**
   * 计算真实性得分
   * @param {Array} familyUnits - 家族单元
   * @returns {number} 真实性得分 (0-100)
   */
  _calculateRealismScore(familyUnits) {
    // 基于历史逃难人群的真实性评估
    let score = 70; // 基础分
    
    // 检查是否有贵族（逃难中应该较少）
    const nobleCount = familyUnits.filter(u => u.socialClass === '门阀士族').length;
    const totalUnits = familyUnits.length;
    
    if (nobleCount / totalUnits > 0.1) {
      score -= 20; // 贵族比例过高
    }
    
    // 检查是否有足够的普通民众
    const commonerCount = familyUnits.filter(u => 
      u.socialClass === '平民' || u.socialClass === '庶族'
    ).length;
    
    if (commonerCount / totalUnits < 0.6) {
      score -= 15; // 普通民众比例过低
    }
    
    // 检查家族单元类型的合理性
    const completeFamily = familyUnits.filter(u => u.unitType === 'complete_family').length;
    if (completeFamily / totalUnits > 0.5) {
      score -= 10; // 完整家庭比例过高（逃难中不太现实）
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // ==================== 辅助方法 ====================

 

  /**
   * 确保最小社会等级代表性
   * @param {Object} distribution - 社会等级分布
   * @param {number} totalSize - 总人数
   */
  _ensureMinimumRepresentation(distribution, totalSize) {
    const classes = Object.keys(distribution);
    let totalAllocated = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    
    // 确保每个等级至少有1人（除非总人数不足）
    if (totalAllocated <= totalSize && classes.length <= totalSize) {
      classes.forEach(socialClass => {
        if (distribution[socialClass] === 0) {
          distribution[socialClass] = 1;
          totalAllocated++;
        }
      });
      
      // 如果分配超出总数，从最多的等级减少
      if (totalAllocated > totalSize) {
        const excess = totalAllocated - totalSize;
        const maxClass = Object.entries(distribution)
          .reduce((max, [cls, count]) => count > max.count ? {class: cls, count} : max, 
                  {class: null, count: 0});
        
        if (maxClass.class && distribution[maxClass.class] > excess) {
          distribution[maxClass.class] -= excess;
        }
      }
    }
  }

  // ==================== 查询和状态方法 ====================

  /**
   * 获取当前规划
   * @returns {Object|null} 当前规划结果
   */
  getCurrentPlan() {
    return this.currentPlan;
  }

  /**
   * 获取规划历史
   * @returns {Array} 规划历史记录
   */
  getPlanningHistory() {
    return [...this.planningHistory];
  }

  /**
   * 获取规划统计信息
   * @returns {Object} 统计信息
   */
  getPlanningStatistics() {
    if (!this.currentPlan) {
      return null;
    }

    const plan = this.currentPlan;
    return {
      totalPlans: this.planningHistory.length,
      currentPlanId: plan.planId,
      totalPeople: plan.totalPeople,
      familyUnitCount: plan.unitCount,
      diversityScore: plan.diversityScore,
      realismScore: plan.realismScore,
      socialClasses: Object.keys(plan.socialDistribution).length,
      unitTypes: Object.keys(plan.unitTypeDistribution).length,
      planningDate: new Date(plan.timestamp).toLocaleString()
    };
  }

  /**
   * 验证规划结果
   * @param {Object} plan - 要验证的规划
   * @returns {Object} 验证结果
   */
  validatePlan(plan = this.currentPlan) {
    if (!plan) {
      return { isValid: false, errors: ['没有可验证的规划'] };
    }

    const errors = [];
    const warnings = [];

    // 验证基础数据完整性
    if (!plan.familyUnits || plan.familyUnits.length === 0) {
      errors.push('缺少家族单元数据');
    }

    if (plan.totalPeople <= 0) {
      errors.push('总人数必须大于0');
    }

    // 验证人数一致性
    const calculatedTotal = plan.familyUnits.reduce((sum, unit) => sum + unit.size, 0);
    if (calculatedTotal !== plan.totalPeople) {
      errors.push(`人数不一致: 声明${plan.totalPeople}人，实际${calculatedTotal}人`);
    }

    // 验证社会等级合理性
    const socialClasses = Object.keys(plan.socialDistribution);
    const validClasses = this.socialClassConfig.hierarchy;
    const invalidClasses = socialClasses.filter(cls => !validClasses.includes(cls));
    
    if (invalidClasses.length > 0) {
      errors.push(`无效的社会等级: ${invalidClasses.join(', ')}`);
    }

    // 验证家族单元完整性
    plan.familyUnits.forEach((unit, index) => {
      if (!unit.unitId) {
        errors.push(`家族单元${index}缺少ID`);
      }
      if (!unit.socialClass || !validClasses.includes(unit.socialClass)) {
        errors.push(`家族单元${index}社会等级无效: ${unit.socialClass}`);
      }
      if (unit.size <= 0) {
        errors.push(`家族单元${index}大小无效: ${unit.size}`);
      }
    });

    // 检查警告条件
    if (plan.diversityScore < 50) {
      warnings.push('多样性得分较低，可能缺乏足够的人群多样性');
    }

    if (plan.realismScore < 60) {
      warnings.push('真实性得分较低，可能与历史逃难情况不符');
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      score: {
        diversity: plan.diversityScore,
        realism: plan.realismScore,
        overall: Math.round((plan.diversityScore + plan.realismScore) / 2)
      }
    };
  }

  /**
   * 重新规划（基于新配置）
   * @param {Object} newConfig - 新的规划配置
   * @returns {Object} 新的规划结果
   */
  replan(newConfig = {}) {
    console.log('🔄 执行重新规划:', newConfig);
    return this.planPopulationComposition(newConfig);
  }

  /**
   * 优化当前规划
   * @param {Object} optimizationOptions - 优化选项
   * @returns {Object} 优化后的规划
   */
  optimizePlan(optimizationOptions = {}) {
    if (!this.currentPlan) {
      throw new Error('没有当前规划可供优化');
    }

    console.log('⚡ 开始规划优化:', optimizationOptions);

    const {
      targetDiversity = 80,
      targetRealism = 80,
      maxIterations = 10
    } = optimizationOptions;

    let bestPlan = this.currentPlan;
    let bestScore = this._calculateOverallScore(bestPlan);

    for (let i = 0; i < maxIterations; i++) {
      // 生成微调配置
      const adjustedConfig = this._generateOptimizationConfig(bestPlan, targetDiversity, targetRealism);
      
      // 重新规划
      const newPlan = this.planPopulationComposition(adjustedConfig);
      const newScore = this._calculateOverallScore(newPlan);

      if (newScore > bestScore) {
        bestPlan = newPlan;
        bestScore = newScore;
        console.log(`🎯 优化迭代${i + 1}: 得分提升至${newScore}`);
      }
    }

    this.currentPlan = bestPlan;
    console.log(`✅ 规划优化完成，最终得分: ${bestScore}`);

    return bestPlan;
  }

  /**
   * 计算规划总体得分
   * @param {Object} plan - 规划对象
   * @returns {number} 总体得分
   */
  _calculateOverallScore(plan) {
    return Math.round((plan.diversityScore + plan.realismScore) / 2);
  }

  /**
   * 生成优化配置
   * @param {Object} currentPlan - 当前规划
   * @param {number} targetDiversity - 目标多样性
   * @param {number} targetRealism - 目标真实性
   * @returns {Object} 优化配置
   */
  _generateOptimizationConfig(currentPlan, targetDiversity, targetRealism) {
    const currentConfig = currentPlan.planningConfig;
    const adjustedConfig = { ...currentConfig };

    // 根据当前得分调整配置
    if (currentPlan.diversityScore < targetDiversity) {
      // 增加多样性：调整家族单元权重
      adjustedConfig.familySizeVariance = 0.3;
    }

    if (currentPlan.realismScore < targetRealism) {
      // 增加真实性：调整社会分布
      adjustedConfig.socialDistribution = this._adjustSocialDistributionForRealism();
    }

    // 轻微调整目标人数（±2人）
    const variance = Utils.Math.randomInt(-2, 2);
    adjustedConfig.targetSize = Math.max(
      adjustedConfig.minSize,
      Math.min(adjustedConfig.maxSize, adjustedConfig.targetSize + variance)
    );

    return adjustedConfig;
  }

  /**
   * 调整社会分布以提高真实性
   * @returns {Object} 调整后的社会分布
   */
  _adjustSocialDistributionForRealism() {
    const distribution = { ...this.refugeeConfig.social_distribution };
    
    // 增加平民和庶族比例，减少门阀士族
    distribution['平民'] = Math.min(0.5, distribution['平民'] + 0.05);
    distribution['庶族'] = Math.min(0.4, distribution['庶族'] + 0.03);
    distribution['门阀士族'] = Math.max(0.02, distribution['门阀士族'] - 0.03);
    
    // 重新标准化
    const total = Object.values(distribution).reduce((sum, ratio) => sum + ratio, 0);
    Object.keys(distribution).forEach(cls => {
      distribution[cls] = distribution[cls] / total;
    });

    return distribution;
  }

  /**
   * 清理规划数据
   */
  clearPlanningData() {
    this._ensureConfigInitialized();
    this.currentPlan = null;
    this.planningHistory = [];
    console.log('🧹 规划数据已清理');
  }

  /**
   * 导出规划结果
   * @param {string} format - 导出格式 ('json' | 'summary')
   * @returns {string|Object} 导出的数据
   */
  exportPlan(format = 'json') {
    this._ensureConfigInitialized();
    if (!this.currentPlan) {
      throw new Error('没有可导出的规划');
    }

    switch (format) {
      case 'json':
        return JSON.stringify(this.currentPlan, null, 2);
      
      case 'summary':
        return this._generatePlanSummary();
      
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 生成规划摘要
   * @returns {string} 规划摘要文本
   */
  _generatePlanSummary() {
    const plan = this.currentPlan;
    const stats = this.getPlanningStatistics();

    return `
南北朝逃难人群构成规划报告
================================

📊 基础统计
- 规划ID: ${plan.planId}
- 总人数: ${plan.totalPeople}人
- 家族单元: ${plan.unitCount}个
- 规划时间: ${stats.planningDate}

🏠 家族规模分布
${Object.entries(plan.unitSizeDistribution)
  .map(([type, count]) => `- ${this.refugeeConfig.family_size_categories[type].description}: ${count}个`)
  .join('\n')}

👥 社会等级分布
${Object.entries(plan.socialDistribution)
  .map(([cls, count]) => `- ${cls}: ${count}人`)
  .join('\n')}

📈 质量评估
- 多样性得分: ${plan.diversityScore}/100
- 真实性得分: ${plan.realismScore}/100
- 综合得分: ${stats.score?.overall || 'N/A'}/100

${plan.warnings ? '\n⚠️ 注意事项\n' + plan.warnings.join('\n') : ''}
`.trim();
  }
}

// ==================== 导出 ====================

export default PopulationPlanningService;