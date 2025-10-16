/**
 * character_generator.js - 南北朝坞堡模拟器角色生成器 (规范重构版)
 * 
 * 职责边界：
 * - 角色配置的构建和协调
 * - 生成逻辑的统计和管理  
 * - 批量角色生成（移民波次等）
 * 
 * 严格遵循：
 * - 只调用其他系统，不直接创建对象
 * - 只加载balance_config.json，不加载其他系统的配置
 * - 通过DataManager创建角色，不直接new Character()
 */

import { Utils } from './utils_module.js';

export class CharacterGenerator {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    
    // 外部配置缓存（只加载CharacterGenerator专用的配置）
    this.balanceConfig = null;
    this.configLoaded = false;
    
    // 生成统计
    this.generationStats = {
      totalGenerated: 0,
      byGender: { 男: 0, 女: 0 },
      byAge: { child: 0, adult: 0, elder: 0 },
      byOrigin: { founder: 0, birth: 0, immigrant: 0 },
      bySocialClass: { noble: 0, commoner: 0, craftsman: 0 }
    };
    
    console.log('🎲 角色生成器初始化完成 (规范重构版)');
  }
  
  // ==================== 配置管理（只加载自己的配置） ====================
  
  /**
   * 加载CharacterGenerator专用配置
   */
  async loadConfigurations() {
    if (this.configLoaded) return;
    
    console.log('📋 CharacterGenerator加载配置');
    
    try {
      if (!this.gameEngine.dataManager?.dataTableManager) {
        throw new Error('DataTableManager不存在');
      }
      
      // 只加载CharacterGenerator需要的配置
      console.log('🔍 尝试加载 balanceConfig.json');
      this.balanceConfig = await this.gameEngine.dataManager.dataTableManager.getBalanceConfig();
      console.log('🔍 加载的配置内容:', this.balanceConfig);
      
      if (!this.balanceConfig) {
        throw new Error('balanceConfig.json 加载失败');
      }

      if (this.gameEngine.nameGenerator && this.gameEngine.nameGenerator.loadConfigurations) {
        await this.gameEngine.nameGenerator.loadConfigurations(this.gameEngine.dataManager.dataTableManager);
      }
      
      console.log('✅ CharacterGenerator配置加载完成');
      
    } catch (error) {
      console.error('❌ CharacterGenerator配置加载失败:', error.message);
      
      // 🆕 提供备用配置
      this.balanceConfig = {
        ageGeneration: {
          elder: { min: 60, max: 80, weight: 0.2 },
          adult: { min: 25, max: 55, weight: 0.6 },
          youth: { min: 16, max: 30, weight: 0.2 }
        }
      };
    console.log('🔄 使用备用配置');
  }
    
    this.configLoaded = true;
  }
  
  // ==================== 核心生成方法 ====================
  
  /**
   * 修复8: 改进的错误处理
   */
  async generateRandomCharacter(options = {}) {
    if (options.name && options.name.includes('文德')) {
      console.log('🎯 发现X文德创建:', options.name, '调用栈:', new Error().stack.split('\n')[2]);
    }
    //console.log('🎭 随机角色生成开始，参数:', options);
    
    try {
      // 🆕 系统健康检查
      const healthCheck = this.validateSystemDependencies();
      if (!healthCheck.isHealthy) {
        console.warn('⚠️ 系统依赖存在问题，但继续尝试生成');
      }
      
      // 确保配置已加载
      await this.loadConfigurations();
      //console.log('DEBUG: 配置加载完成');
      
      // 构建角色配置
      const config = await this.buildCharacterConfig(options);
      //console.log('DEBUG: 角色配置构建完成:', config);
      
      // 🔧 修复：更好的 DataManager 错误处理
      if (!this.gameEngine.dataManager) {
        throw new Error('UnifiedDataManager 不可用，无法创建角色');
      }
      // 检查是否属于现有家族
      if (config.familyName && this.gameEngine.familySystem) {
        const familyData = this.gameEngine.familySystem.families.get(config.familyName);
        if (familyData) {
          // 从家族数据中获取对应成员信息
          const allMembers = [];
          Object.values(familyData.generations).forEach(members => {
            allMembers.push(...members);
          });
          const familyMember = allMembers.find(m => m.name === config.name);
          if (familyMember) {
            config.bloodlineTitle = familyMember.bloodlineTitle;
          }
        }
      }
      // 通过UnifiedDataManager创建角色
      const character = await this.gameEngine.dataManager.createCharacter(config);
      
      if (!character) {
        throw new Error('角色创建返回空值');
      }
      
      // 更新统计
      this.updateGenerationStats(character);
      
      console.log(`👤 随机角色生成完成: ${character.name} (${character.gender}, ${character.age}岁) 家族:${character.familyName || '无'}`);
      return character;
      
    } catch (error) {
      console.error('❌ 角色生成失败:', error.message);
      
      // 🆕 详细错误信息
      const errorDetails = {
        message: error.message,
        options: options,
        systemHealth: this.validateSystemDependencies(),
        timestamp: Date.now()
      };
      
      throw new Error(`角色生成失败: ${error.message}`);
    }
  }
  
  
  /**
   * 构建完整角色配置（协调各系统）
   */
  async buildCharacterConfig(options = {}) {
    // 基础属性生成（基于外部配置）
    const gender = options.gender || this.generateRandomGender();
    const age = options.age || this.generateRandomAge(options.ageCategory);
    const socialClass = options.socialClass || this.generateRandomSocialClass();
    
    // 通过NameGenerator获取姓名（正确的模块调用）
    let nameResult;
    if (options.name) {
      // 指定姓名的情况
      nameResult = {
        fullName: options.name,
        surname: options.name.charAt(0),
        givenName: options.name.slice(1)
      };
    } else {
      try {
        // 确保 NameGenerator 可用
        if (!this.gameEngine.nameGenerator) {
          throw new Error('NameGenerator 不可用');
        }
        
        nameResult = await this.gameEngine.nameGenerator.generateName({
          gender: gender,
          socialClass: socialClass,
          familyName: options.familyName || null,
          surname: options.surname || null,
          generation: options.generation || 3,
          role: options.role || 'resident',
          useCourtesyName: age >= 20
        });
        
      } catch (error) {
        console.error('NameGenerator详细错误:', {
          hasNameGenerator: !!this.gameEngine.nameGenerator,
          configLoaded: this.gameEngine.nameGenerator?.configLoaded,
          error: error.message
        });
        
        // 🆕 降级处理：使用内置备用姓名生成
        nameResult = this._generateBackupName(gender, socialClass);
      }
    }
    
    // 构建完整配置对象
    const config = {
      // 基础身份
      id: options.id || Utils.String.generateId(),
      characterId: options.characterId || options.originalId || options.unitMemberId, // 添加这行
      name: nameResult.fullName,
      surname: nameResult.surname,
      familyName: options.familyName || (nameResult.surname + '氏'),
      givenName: nameResult.givenName,
      courtesyName: nameResult.courtesyName || null,
      nameInfo: nameResult.nameInfo || {},
      age: age,      
      gender: gender,
      birthDate: options.birthDate || this.calculateBirthDate(age),
      
      // 生命状态 - 添加这行
      vitalStatus: options.vitalStatus || 'living',
      
      // 社会属性  
      socialClass: socialClass,
      occupation: options.occupation || this.generateRandomOccupation(socialClass),
      origin: options.origin || 'immigrant',
      role: options.role || 'resident',
      
      // 外观属性
      appearance: options.appearance || this.generateRandomAppearance(gender, age),
      
      // 性格和背景
      personality: options.personality || this.generateRandomPersonality(),
      background: options.background || this.generateRandomBackground(socialClass),
      
      // 位置和状态
      location: options.location || this.getRandomStartLocation(),
      activity: options.activity || null,
      
      // 系统配置（提供给各系统的初始化参数）
      virtueConfig: options.virtueConfig || {},  // VirtueSystem会用这个+外部配置初始化
      skillConfig: options.skillConfig || {},    // SkillSystem会用这个+外部配置初始化
      
      // 生理和情感状态配置
      physicalState: options.physicalState || this.generatePhysicalState(age),
      emotionalState: options.emotionalState || this.generateEmotionalState(),
      
      // 目标和计划
      goals: options.goals || this.generateRandomGoals(socialClass, age),
      priorities: options.priorities || this.generatePriorities(),
      
      // 元数据
      source: 'character_generator',
      generatedAt: Date.now()
    };
    
    return config;
  }
  
  // ==================== 基础生成方法（基于外部配置） ====================
  
  /**
   * 基于balance_config生成随机社会等级
   */
  generateRandomSocialClass() {
    if (!this.balanceConfig?.socialClassDistribution) {
      throw new Error('社会等级分布配置未加载');
    }
    
    const distribution = this.balanceConfig.socialClassDistribution;
    const classes = Object.keys(distribution);
    const weights = Object.values(distribution);
    return Utils.Array.weightedRandomChoice(classes, weights);
  }
  
  /**
   * 基于balance_config生成随机年龄
   */
  generateRandomAge(ageCategory = null) {
    if (!this.balanceConfig?.ageGeneration) {
      throw new Error('年龄生成配置未加载');
    }
    
    const ageConfig = this.balanceConfig.ageGeneration;
    
    if (ageCategory && ageConfig[ageCategory]) {
      const range = ageConfig[ageCategory];
      return Utils.Math.randomInt(range.min, range.max);
    }
    
    // 根据权重随机选择年龄段
    const categories = Object.keys(ageConfig);
    const weights = categories.map(cat => ageConfig[cat].weight);
    const selectedCategory = Utils.Array.weightedRandomChoice(categories, weights);
    
    const range = ageConfig[selectedCategory];
    return Utils.Math.randomInt(range.min, range.max);
  }
  
  /**
   * 基于balance_config生成随机职业
   */
  generateRandomOccupation(socialClass) {
    if (!this.balanceConfig?.occupationDistribution) {
      // 基本职业映射
      const basic = { '平民': '农夫', '工匠': '铁匠', '门阀士族': '学士', '胡族': '武士' };
      return basic[socialClass] || '农夫';
    }
    
    const occupationsByClass = this.balanceConfig.occupationDistribution;
    const occupations = occupationsByClass[socialClass] || occupationsByClass['平民'] || ['农夫'];
    return Utils.Array.randomChoice(occupations);
  }
  
  /**
   * 基于balance_config生成随机外观
   */
  generateRandomAppearance(gender, age) {
    const config = this.balanceConfig?.appearanceGeneration || {};
    
    const baseHeight = gender === '男' ? 
      (config.maleHeight?.base || 165) : 
      (config.femaleHeight?.base || 155);
    const baseWeight = gender === '男' ? 
      (config.maleWeight?.base || 60) : 
      (config.femaleWeight?.base || 50);
    
    // 年龄对外观的影响
    const ageFactor = age < 30 ? 1.0 : age < 50 ? 0.95 : 0.9;
    
    return {
      height: Math.floor((baseHeight + Utils.Math.randomInt(-10, 15)) * ageFactor),
      weight: Math.floor((baseWeight + Utils.Math.randomInt(-10, 20)) * ageFactor),
      beauty: Utils.Math.randomInt(
        config.beautyRange?.min || 20, 
        config.beautyRange?.max || 80
      )
    };
  }
  
  /**
   * 修复2: 添加备用姓名生成方法（仅在NameGenerator不可用时使用）
   */
  _generateBackupName(gender, socialClass) {
    const surnames = ['王', '李', '张', '刘', '陈'];
    const maleNames = ['文德', '明德', '志远', '文华', '文贤'];
    const femaleNames = ['淑慧', '婉心', '清雅', '淑贵', '婉仪'];
    
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const names = gender === '男' ? maleNames : femaleNames;
    const givenName = names[Math.floor(Math.random() * names.length)];
    
    return {
      fullName: surname + givenName,
      surname: surname,
      givenName: givenName
    };
  }


  /**
   * 基于balance_config生成随机性格
   */
  generateRandomPersonality() {
    const config = this.balanceConfig?.personalityGeneration || {};
    
    return {
      openness: Utils.Math.randomInt(config.openness?.min || 20, config.openness?.max || 80),
      conscientiousness: Utils.Math.randomInt(config.conscientiousness?.min || 20, config.conscientiousness?.max || 80),
      extraversion: Utils.Math.randomInt(config.extraversion?.min || 20, config.extraversion?.max || 80),
      agreeableness: Utils.Math.randomInt(config.agreeableness?.min || 20, config.agreeableness?.max || 80),
      neuroticism: Utils.Math.randomInt(config.neuroticism?.min || 20, config.neuroticism?.max || 80)
    };
  }
  
  /**
   * 基于balance_config生成随机背景
   */
  generateRandomBackground(socialClass) {
    if (!this.balanceConfig?.backgroundOptions) {
      return '普通百姓出身';
    }
    
    const backgroundsByClass = this.balanceConfig.backgroundOptions;
    const backgrounds = backgroundsByClass[socialClass] || backgroundsByClass['平民'] || ['普通百姓出身'];
    return Utils.Array.randomChoice(backgrounds);
  }
  
  /**
   * 生成随机性别
   */
  generateRandomGender() {
    const ratio = this.balanceConfig?.genderRatio || { male: 0.5, female: 0.5 };
    return Math.random() < ratio.male ? '男' : '女';
  }
  
  /**
   * 计算出生日期
   */
  calculateBirthDate(age) {
    const currentTime = Date.now();
    const ageInMs = age * 365 * 24 * 60 * 60 * 1000;
    return currentTime - ageInMs;
  }
  
  /**
   * 生成生理状态配置
   */
  generatePhysicalState(age) {
    const ageFactor = age < 30 ? 1.0 : age < 50 ? 0.9 : 0.7;
    const config = this.balanceConfig?.physicalStateGeneration || {};
    
    return {
      health: Utils.Math.randomInt(config.health?.min || 60, config.health?.max || 90) * ageFactor,
      energy: Utils.Math.randomInt(config.energy?.min || 70, config.energy?.max || 100) * ageFactor,
      hunger: Utils.Math.randomInt(config.hunger?.min || 20, config.hunger?.max || 60),
      thirst: Utils.Math.randomInt(config.thirst?.min || 10, config.thirst?.max || 40)
    };
  }
  
  /**
   * 生成情感状态配置
   */
  generateEmotionalState() {
    const config = this.balanceConfig?.emotionalStateGeneration || {};
    
    return {
      happiness: Utils.Math.randomInt(config.happiness?.min || 30, config.happiness?.max || 70),
      stress: Utils.Math.randomInt(config.stress?.min || 10, config.stress?.max || 40),
      loneliness: Utils.Math.randomInt(config.loneliness?.min || 20, config.loneliness?.max || 60),
      satisfaction: Utils.Math.randomInt(config.satisfaction?.min || 40, config.satisfaction?.max || 70)
    };
  }
  
  /**
   * 生成随机目标
   */
  generateRandomGoals(socialClass, age) {
    if (!this.balanceConfig?.goalsByClass) {
      return ['安居乐业']; // 默认目标
    }
    
    const goalsByClass = this.balanceConfig.goalsByClass;
    const goals = goalsByClass[socialClass] || goalsByClass['平民'] || ['安居乐业'];
    const numGoals = Utils.Math.randomInt(1, Math.min(3, goals.length));
    
    return Utils.Array.randomSample(goals, numGoals);
  }
  
  /**
   * 生成优先级
   */
  generatePriorities() {
    const config = this.balanceConfig?.priorityGeneration || {};
    
    return {
      survival: config.survival?.base || 80,
      social: config.social?.base || 60,
      achievement: config.achievement?.base || 40,
      leisure: config.leisure?.base || 30
    };
  }
  
  /**
   * 获取随机起始地点
   */
  getRandomStartLocation() {
    const locations = this.balanceConfig?.startLocations || ['住宅区'];
    return Utils.Array.randomChoice(locations);
  }
  
  // ==================== 批量生成方法 ====================
  
  /**
   * 生成移民波次
   */
  async generateImmigrantWave(count = 3) {
    console.log(`🌊 生成移民波次: ${count}人`);
    
    const immigrants = [];
    const errors = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const immigrant = await this.generateRandomCharacter({
          origin: 'immigrant',
          // 移民主要是平民和工匠
          socialClass: Math.random() < 0.8 ? '平民' : '工匠'
        });
        immigrants.push(immigrant);
      } catch (error) {
        console.error(`生成移民 ${i+1} 失败:`, error);
        errors.push({ index: i, error: error.message });
      }
    }
    
    console.log(`✅ 移民波次完成: 成功${immigrants.length}人，失败${errors.length}人`);
    
    return {
      success: immigrants.length,
      failed: errors.length,
      immigrants,
      errors
    };
  }
  
  /**
   * 修复3: generateFamilyMembers 方法确保正确调用 FamilySystem
   */
  async generateFamilyMembers(familyConfig = {}) {
    console.log('🏠 generateFamilyMembers被调用，配置:', familyConfig);
    
    try {
      // 🔧 修复：确保 FamilySystem 可用
      if (!this.gameEngine.familySystem) {
        throw new Error('FamilySystem 不可用');
      }
      
      // 通过 FamilySystem 创建家族结构
      const familyStructure = await this.gameEngine.familySystem.createFamily({
        size: familyConfig.size || 5,
        type: familyConfig.type || 'refugee_family'
      });

      console.log('🏠 创建的家族:', familyStructure.familyName);
      
      if (!familyStructure || !familyStructure.members) {
        throw new Error('家族结构生成失败');
      }
      
      const familyMembers = [];
      
      // 为每个家族成员创建角色
      for (const memberData of familyStructure.members) {
        const memberConfig = {
          //name: memberData.name,
          age: memberData.age,
          gender: memberData.gender,
          role: memberData.role,
          socialClass: familyConfig.socialClass || '平民',
          //familyName: familyStructure.familyName,
          surname: familyStructure.surname,
          origin: '家族创始人',
          familyRole: memberData.familyRole,
          generation: memberData.generation
        };
        
        try {
          const character = await this.generateRandomCharacter(memberConfig);
          familyMembers.push(character);

          // 更新血缘关系中的ID映射
          console.log('🔧 ID更新:', memberData.name, memberData.id, '→', character.id);
          const familyBloodRelations = this.gameEngine.familySystem.bloodRelations.get(familyStructure.familyName);
          if (familyBloodRelations) {
            console.log('🔧 更新前血缘关系键:', Array.from(familyBloodRelations.keys()).slice(0, 3));
          } else {
            console.log('🔧 未找到血缘关系数据');
          }
          this.gameEngine.familySystem.updateMemberIds(
            familyStructure.familyName, 
            memberData.id, 
            character.id
          );
          const updatedRelations = this.gameEngine.familySystem.bloodRelations.get(familyStructure.familyName);
          console.log('🔧 更新后血缘关系键:', Array.from(updatedRelations.keys()).slice(0, 3));
        } catch (error) {
          console.error(`❌ 家族成员创建失败: ${memberData.name}`, error);
        }
      }
      
      console.log(`✅ 家族 ${familyConfig.familyName} 成员生成完成: ${familyMembers.length}人`);
       // 为每个家族成员创建角色后，确保血缘关系正确更新
      return familyMembers;      
    } catch (error) {
      console.error(`❌ 家族生成失败: ${familyConfig.familyName}`, error);
      }

      // 家族成员创建完成后，更新血缘关系中的ID映射
      if (familyMembers.length > 0) {
        console.log('Debug 开始更新血缘关系ID映射');
        
        // 创建临时ID到真实ID的映射
        const idMapping = new Map();
        familyStructure.members.forEach((tempMember, index) => {
          if (familyMembers[index]) {
            idMapping.set(tempMember.id, familyMembers[index].id);
            console.log(`ID映射: ${tempMember.id} -> ${familyMembers[index].id}`);
          }
        });
                
        // 更新血缘关系
        console.log('🔧 familyConfig:', familyConfig);
        console.log('🔧 familyStructure.familyName:', familyStructure.familyName);
        console.log('🔧 idMapping:', idMapping);

        const familyNameToUse = familyConfig.familyName || familyStructure.familyName;
        console.log('🔧 最终使用的家族名:', familyNameToUse);

        console.log('🎯 第一处调用 - familyName:', familyName);
        console.log('🎯 第一处调用 - idMapping:', idMapping);
        if (familyNameToUse) {
          this.gameEngine.familySystem.updateBloodRelationIds(familyNameToUse, idMapping);
        } else {
          console.error('❌ 无法确定家族名，跳过血缘关系更新');
        }
      }

    return await this._generateSimpleFamily(familyConfig);
    
  }


  /**
   * 修复4: 添加简单家族生成的降级方法
   */
  async _generateSimpleFamily(familyConfig) {
    console.log('🔄 使用简单家族生成方案');
    
    const familyMembers = [];
    const targetSize = familyConfig.size || 3;
    
    for (let i = 0; i < targetSize; i++) {
      const memberConfig = {
        familyName: familyConfig.familyName,
        socialClass: familyConfig.socialClass || '平民',
        origin: '家庭成员',
        age: i === 0 ? Utils.Math.randomInt(35, 55) : Utils.Math.randomInt(16, 40)
      };
      
      try {
        const member = await this.generateRandomCharacter(memberConfig);
        familyMembers.push(member);
      } catch (error) {
        console.error(`❌ 简单家族成员创建失败`, error);
      }
    }
    
    return familyMembers;
  }
  
  updateBloodRelationIds(familyName, idMapping) {
    // 委托给 FamilySystem 处理
    console.log('🎯 第二处调用 - familyNameToUse:', familyNameToUse);
    console.log('🎯 第二处调用 - idMapping:', idMapping);
    if (this.gameEngine.familySystem) {
      this.gameEngine.familySystem.updateBloodRelationIds(familyName, idMapping);
    }
  }

  /**
   * 修复6: 确保统计方法正确
   */
  updateGenerationStats(character) {
    if (!character) return;
    
    this.generationStats.totalGenerated++;
    
    // 性别统计
    if (character.gender) {
      this.generationStats.byGender[character.gender] = 
        (this.generationStats.byGender[character.gender] || 0) + 1;
    }
    
    // 年龄统计
    const ageCategory = character.age < 16 ? '幼儿' : 
                      character.age < 60 ? '成人' : '老者';
    this.generationStats.byAge[ageCategory] = 
      (this.generationStats.byAge[ageCategory] || 0) + 1;
    
    // 来源统计
    if (character.origin) {
      this.generationStats.byOrigin[character.origin] = 
        (this.generationStats.byOrigin[character.origin] || 0) + 1;
    }
    
    // 社会阶层统计
    if (character.socialClass) {
      this.generationStats.bySocialClass[character.socialClass] = 
        (this.generationStats.bySocialClass[character.socialClass] || 0) + 1;
    }
  }

  /**
   * 修复7: 添加系统健康检查方法
   */
  validateSystemDependencies() {
    const issues = [];
    
    // 检查必需的系统
    if (!this.gameEngine.nameGenerator) {
      issues.push('NameGenerator 不可用');
    }
    
    if (!this.gameEngine.familySystem) {
      issues.push('FamilySystem 不可用');
    }
    
    if (!this.gameEngine.dataManager) {
      issues.push('UnifiedDataManager 不可用');
    }
    
    if (!this.balanceConfig) {
      issues.push('balance_config.json 未加载');
    }
    
    if (issues.length > 0) {
      console.warn('⚠️ CharacterGenerator 系统依赖检查发现问题:', issues);
    }
    
    return {
      isHealthy: issues.length === 0,
      issues: issues
    };
  }


  /**
   * 获取生成统计
   */
  getGenerationStats() {
    return { ...this.generationStats };
  }
  
  /**
   * 重置统计
   */
  resetStats() {
    this.generationStats = {
      totalGenerated: 0,
      byGender: { 男: 0, 女: 0 },
      byAge: { child: 0, adult: 0, elder: 0 },
      byOrigin: { founder: 0, birth: 0, immigrant: 0 },
      bySocialClass: { noble: 0, commoner: 0, craftsman: 0 }
    };
  }
  
  /**
   * 重新加载配置
   */
  async reloadConfigurations() {
    this.configLoaded = false;
    this.balanceConfig = null;
    await this.loadConfigurations();
  }
  
  /**
   * 获取配置加载状态
   */
  getConfigStatus() {
    return {
      loaded: this.configLoaded,
      balanceConfigLoaded: !!this.balanceConfig,
      hasDataManager: !!this.gameEngine.dataManager,
      hasNameGenerator: !!this.gameEngine.nameGenerator,
      hasFamilySystem: !!this.gameEngine.familySystem
    };
  }
}

// 严格按照规范导出
export default CharacterGenerator;