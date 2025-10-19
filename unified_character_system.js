/**
 * unified_character_system.js - 统一角色系统协调器
 * 
 * Integration Layer 模块 - 负责协调各个Service Layer模块
 * 架构层级：Integration Layer (集成层) - 系统协调
 * 
 * 核心功能：
 * 1. 双轨制人群生成 - 支持传统家族模式和逃难人群模式
 * 2. Service Layer协调 - 统一调度PopulationPlanningService、FamilyNetworkService、RelationshipService
 * 3. 数据流管理 - 规划 → 网络构建 → 角色生成 → 关系初始化 → 数据整理
 * 4. 向后兼容 - 保持现有createGamePopulation接口不变
 */

import { PopulationPlanningService } from './population_planning_service.js';
import { PopulationRules } from './population_rules.js';
import { FamilyNetworkService } from './family_network_service.js';
import { RelationshipService } from './relationship_service.js';

/**
 * 统一角色系统协调器
 */
export default class UnifiedCharacterSystem {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.isInitialized = false;
    this.activeMode = 'refugee'; // 固定为refugee模式   
    
    // Service Layer实例
    this.populationPlanningService = null;
    this.familyNetworkService = null;   
        
    // 创建统计
    this.creationStats = {
      mode: 'refugee',
      familiesCreated: 0,
      livingCharacters: 0,
      deceasedMembers: 0,
      marriageConnections: 0,
      totalRelations: 0
    };
    
    console.log('🏗️ UnifiedCharacterSystem - Integration Layer协调器初始化');
  }
 

  /**
   * 初始化所有子系统
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('统一角色系统已初始化，跳过重复初始化');
      return true;
    }

    try {
      console.log('📋 正在初始化 UnifiedCharacterSystem...');
      
      // 初始化Service Layer模块
      await this._initializeServiceLayer();
      
      
      this.isInitialized = true;
      console.log('✅ UnifiedCharacterSystem 初始化完成');
      
      return true;
    } catch (error) {
      console.error('❌ UnifiedCharacterSystem 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化Service Layer模块
   */
  async _initializeServiceLayer() {
    console.log('🔧 初始化 Service Layer 模块...');
    
    // 创建服务实例
    this.populationPlanningService = new PopulationPlanningService();
    this.familyNetworkService = new FamilyNetworkService(this.gameEngine);
    //this.relationshipService = new RelationshipService(this.gameEngine);
    
    // 初始化各个服务
    await this.populationPlanningService.initialize();
    await this.familyNetworkService.initialize();
    //await this.relationshipService.initialize();
    
    console.log('✅ Service Layer 模块初始化完成');
  }

  

  /**
   * 创建游戏人口 - 主要入口方法（向后兼容）
   * @param {Object} populationConfig - 人口配置
   * @returns {Object} 人口创建结果
   */
  async createGamePopulation(populationConfig = {}) {
    console.log('开始创建游戏人口，配置:', populationConfig);
  
    if (!this.isInitialized) {
      await this.initialize();
    }
  
    try {
      // 统一使用refugee模式
      return await this.createRefugeePopulation({
        ...populationConfig,
        waveType: populationConfig.waveType || 'initial',
        waveNumber: populationConfig.waveNumber || 1
      });
    } catch (error) {
      console.error('游戏人口创建失败:', error);
      throw error;
    }
  }

  /**
   * 创建逃难定居人群 - 新架构模式
   * @param {Object} config - 逃难人群配置
   * @returns {Object} 逃难人群创建结果
   */
  async createRefugeePopulation(config) {
    console.log('🏃‍♂️ 创建逃难定居人群模式');
    this.activeMode = 'refugee';
    this.creationStats.mode = 'refugee';
    // 启用逃难模式
    PopulationRules.setRefugeeMode(true);

    try {
      // 阶段1：人群构成规划
      console.log('📊 阶段1: 人群构成规划');
      const populationPlan = await this.populationPlanningService.planPopulationComposition({
        targetSize: config.targetSize || 25,
        socialClassDistribution: config.socialClassDistribution,
        minFamilies: config.minFamilies || 3,
        maxFamilies: config.maxFamilies || 8,
        waveType: config.waveType || 'initial',
        waveNumber: config.waveNumber || 1
      });

      console.log(`✅ 规划完成: ${populationPlan.totalPeople}人, ${populationPlan.familyUnits.length}个家族单元`);

      // 阶段2：家族网络构建
      console.log('🏠 阶段2: 家族网络构建');
      const familyNetwork = await this.familyNetworkService.buildFamilyUnits(populationPlan);

      console.log(`✅ 网络构建完成: ${familyNetwork.statistics.totalCharacters}个角色, ${familyNetwork.statistics.totalRelations}条关系`);

      // 阶段3：角色生成
      console.log('👤 阶段3: 基于网络生成角色');
      const characters = await this._generateCharactersFromNetwork(familyNetwork);

      console.log(`✅ 角色生成完成: ${characters.length}个角色`);

      // 阶段4：关系系统初始化
      console.log(`✅ 关系查询服务已就绪，数据由专门系统管理`);

      // 新增：血缘关系映射到角色对象
      // console.log('🔗 阶段4: 血缘关系映射');
      // await this._mapBloodRelationsToCharacters(relationshipResult, characters);
      // console.log('✅ 血缘关系映射完成');

      // 阶段5：数据整理
      console.log('📋 阶段4: 数据整理');
      const finalResult = this._organizeRefugeePopulationData(
        characters, 
        familyNetwork,  // 删除relationshipResult参数
        populationPlan
      );

      // 更新统计
      this.creationStats.livingCharacters = finalResult.livingCharacters.length;
      this.creationStats.familiesCreated = populationPlan.familyUnits.length;      
     
      // 关闭逃难模式
      PopulationRules.setRefugeeMode(false);
      return finalResult;

    } catch (error) {
      console.error('❌ 逃难定居人群创建失败:', error);
      PopulationRules.setRefugeeMode(false);
      throw error;
    }
  }

  
  
  // ==================== 新架构模式辅助方法 ====================

  /**
   * 基于家族网络生成角色
   * @param {Object} familyNetwork - 家族网络数据
   * @returns {Array} 角色列表
   */
  async _generateCharactersFromNetwork(familyNetwork) {
    const characters = [];
    const usedNames = new Set();
  
    for (const familyUnit of familyNetwork.familyUnits) {
      // 修复：直接使用familyUnit的characters数组
      const allCharacters = familyUnit.allCharacters || familyUnit.characters || [];
      const livingCharacters = allCharacters.filter(c => c.vitalStatus === 'living');
      const deceasedCharacters = allCharacters.filter(c => c.vitalStatus === 'deceased');
      
      console.log('家族单元角色统计:', {
        总角色数: allCharacters.length,
        存活角色: livingCharacters.length,
        死亡角色: deceasedCharacters.length
      });
      
      // 修复：直接遍历allCharacters
      for (const characterTemplate of allCharacters) {
        if (characterTemplate.vitalStatus === 'deceased') {
          console.log('处理死者:', characterTemplate.name || characterTemplate.characterId);
        }
              
        // 生成角色姓名
        const nameResult = await this._generateUniqueCharacterName(
          characterTemplate, 
          characters
        );
        // 🔍 调试点3：构建配置对象并检查
        const configToCreate = {
          // 基础信息
          id: characterTemplate.characterId,
          name: nameResult.fullName,
          surname: nameResult.surname,

          // 角色属性
          gender: characterTemplate.gender,
          age: characterTemplate.age,
          socialClass: characterTemplate.socialClass,
          generation: characterTemplate.generation,

          // 家族信息
          familyName: characterTemplate.familyName,
          // 🔧 修复：使用characterTemplate.originalFamily而不是familyName
          originalFamily: characterTemplate.originalFamily || characterTemplate.familyName,
          currentFamily: characterTemplate.marriedIntoFamily || characterTemplate.familyName,
          
          // 角色定位
          familyRole: characterTemplate.role,
          relationshipRole: characterTemplate.relationshipRole,
          generationLevel: this._calculateGenerationLevel(characterTemplate),
          
          // 生命状态
          vitalStatus: characterTemplate.vitalStatus || 'living',
          marriageStatus: characterTemplate.marriageStatus || 'single',
          
          // 特殊属性
          specialTraits: characterTemplate.specialTraits || [],
          
          // 创建信息
          createdBy: 'UnifiedCharacterSystem-RefugeeMode',
          createdAt: Date.now()
        };

        console.log('🔍 准备创建角色，数据检查:', {
          id: characterTemplate.characterId || `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: nameResult.fullName,
          age: characterTemplate.age,
          gender: characterTemplate.gender,
          socialClass: characterTemplate.socialClass
        });
        // 创建完整角色对象
        const character = await this.gameEngine.dataManager.createCharacter({
          // 基础信息
          id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 游戏引擎ID
          characterId: characterTemplate.characterId, // 原始家族成员ID，用于bloodRelations匹配
          name: nameResult.fullName,
          surname: nameResult.surname,

          // 角色属性
          gender: characterTemplate.gender,
          age: characterTemplate.age || 20,
          socialClass: characterTemplate.socialClass,
          generation: characterTemplate.generation, 

          // 家族信息
          familyName: characterTemplate.familyName,
          // 🔧 修复：使用characterTemplate.originalFamily而不是familyName
          originalFamily: characterTemplate.originalFamily || characterTemplate.familyName,
          currentFamily: characterTemplate.marriedIntoFamily || characterTemplate.familyName,
          
          // 角色定位
          familyRole: characterTemplate.role,
          relationshipRole: characterTemplate.relationshipRole,
          generationLevel: this._calculateGenerationLevel(characterTemplate),
          
          // 生命状态
          vitalStatus: characterTemplate.vitalStatus || 'living',
          marriageStatus: characterTemplate.marriageStatus || 'single',
          
          // 特殊属性
          specialTraits: characterTemplate.specialTraits || [],
          
          // 创建信息
          createdBy: 'UnifiedCharacterSystem-RefugeeMode',
          createdAt: Date.now()
        });

        console.log('✅ 角色创建成功:', {
          name: character.name,
          familyName: character.familyName,
          originalFamily: character.originalFamily,
          bloodRelations: character.bloodRelations?.size || 0
        });

        characters.push(character);
        usedNames.add(nameResult.fullName);
      }
    }

    return characters;
  }

  /**
   * 整理逃难人群数据
   * @param {Array} characters - 角色列表
   * @param {Object} familyNetwork - 家族网络
   * @param {Object} populationPlan - 人群规划
   * @returns {Object} 整理后的数据
   */
  _organizeRefugeePopulationData(characters, familyNetwork, populationPlan) {
    const livingCharacters = characters.filter(c => c.vitalStatus === 'living');
    const deceasedMembers = characters.filter(c => c.vitalStatus === 'deceased');
  
    return {
      // 核心数据
      livingCharacters: livingCharacters,
      deceasedMembers: deceasedMembers,
      allCharacters: characters,
      
      // 结构数据
      familyNetwork: familyNetwork,
      populationPlan: populationPlan,
      
      // 统计信息
      statistics: {
        ...this.creationStats,
        totalCharacters: characters.length,
        livingCount: livingCharacters.length,
        deceasedCount: deceasedMembers.length,
        familyUnits: familyNetwork.familyUnits.length
      },
      
      // 系统信息
      metadata: {
        mode: 'refugee',
        createdAt: Date.now(),
        version: 'UnifiedCharacterSystem v2.0',
        architecture: 'Service Layer + Integration Layer'
      }
    };
  }

  // ==================== 通用辅助方法 ====================

  /**
   * 生成唯一角色姓名
   */
  async _generateUniqueCharacterName(characterTemplate, existingCharacters) {
    let attempts = 0;
    let nameResult;
    
    do {
      nameResult = await this._generateCharacterName(characterTemplate);
      attempts++;
      
      const isDuplicate = this._checkNameDuplicate(nameResult.fullName, existingCharacters);
      
      if (!isDuplicate) {
        break;
      }
      
      console.log(`检测到重名: ${nameResult.fullName}, 重新生成 (尝试 ${attempts})`);
      
    } while (attempts < 10);
    
    if (attempts >= 10) {
      nameResult.fullName = `${nameResult.fullName}_${Math.floor(Math.random() * 1000)}`;
    }
    
    return nameResult;
  }

  /**
   * 生成角色姓名
   */
  async _generateCharacterName(characterTemplate) {
    // 🔧 修复：外来成员（配偶、母亲）使用originalFamily作为姓氏
    const surnameToUse = characterTemplate.originalFamily || characterTemplate.familyName;

    // 调用游戏引擎的姓名生成器
    if (this.gameEngine.nameGenerator) {
      return await this.gameEngine.nameGenerator.generateName({
        gender: characterTemplate.gender,
        socialClass: characterTemplate.socialClass,
        familyName: surnameToUse
      });
    }

    // 简化版本
    return {
      fullName: `${surnameToUse}${characterTemplate.gender === '男' ? '某郎' : '某娘'}`,
      surname: surnameToUse
    };
  }

  /**
   * 检查姓名重复
   */
  _checkNameDuplicate(fullName, existingCharacters) {
    return existingCharacters.some(char => char.name === fullName);
  }

  /**
   * 计算世代等级
   */
  _calculateGenerationLevel(characterTemplate) {
    const generationMap = {
      'grandfather': 3,
      'grandmother': 3,
      'father': 4,
      'mother': 4,
      'husband': 4,
      'wife': 4,
      'child': 5,
      'son': 5,
      'daughter': 5
    };
    
    return generationMap[characterTemplate.role] || 4;
  }

  // ==================== 系统状态管理 ====================

  /**
   * 获取系统状态
   */
  getSystemStatus() {
    return {
      isInitialized: this.isInitialized,
      activeMode: this.activeMode,
      serviceLayerStatus: {
        populationPlanning: this.populationPlanningService?.getServiceStatus(),
        familyNetwork: this.familyNetworkService?.getServiceStatus(),
        relationship: this.gameEngine.relationshipService?.getServiceStatus()
      },
      traditionalModulesAvailable: !!(this.familyGenerator && this.marriageSystem && this.relationshipBuilder),
      statistics: { ...this.creationStats }
    };
  }

  /**
   * 重置系统状态
   */
  reset() {
    this.activeMode = null;
    this.creationStats = {
      mode: null,
      familiesCreated: 0,
      livingCharacters: 0,
      deceasedMembers: 0,
      marriageConnections: 0,
      totalRelations: 0
    };
    
    // 重置Service Layer服务
    if (this.gameEngine.relationshipService) {
      this.gameEngine.relationshipService.reset();
    }
    
    console.log('🔄 UnifiedCharacterSystem 状态已重置');
  }

  /**
   * 获取创建统计
   */
  getCreationStatistics() {
    return {
      ...this.creationStats,
      systemStatus: this.getSystemStatus()
    };
  }
}