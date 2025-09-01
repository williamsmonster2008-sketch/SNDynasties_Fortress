/**
 * relationship_systems_integration.js - 三层关系系统整合方案
 * 
 * 整合功能：
 * 1. 将新的三层关系系统整合到现有架构
 * 2. 修复现有模块的接口冲突问题
 * 3. 确保与 CharacterGenerator、CharacterModule、NameGenerator 的兼容性
 * 4. 解决名称重复和方法冲突
 */

// ==================== 发现的接口冲突问题 ====================

/*
【问题1】CharacterGenerator 中的关系系统创建
当前代码：character_generator.js 中直接创建了 RelationshipSystem
冲突：新的三层关系架构需要分离创建

【问题2】Character 模块中的关系引用
当前代码：character_module.js 中引用了旧的 relationship_system
冲突：需要更新为三层关系系统

【问题3】名称生成器集成
当前代码：character_generator 内部有姓名生成逻辑
冲突：与独立的 NameGenerator 重复

【问题4】数据创建职责混乱
当前代码：多个模块都在创建角色数据
冲突：需要统一到 UnifiedDataManager
*/

// ==================== 整合方案 ====================

import { EmotionalRelationshipSystem } from './emotional_relationship_system.js';

/**
 * 三层关系系统管理器
 * 统一管理血缘、社会身份、情感关系三个系统
 */
class RelationshipSystemsManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    
    // 三层关系系统实例
    this.familySystem = null;
    this.socialIdentitySystem = null;
    this.emotionalRelationshipSystem = null;
    this.complexRelationshipAPI = null;
    
    // 系统状态
    this.isInitialized = false;
    
    console.log('🔗 三层关系系统管理器初始化');
  }

  /**
   * 初始化三层关系系统
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // 使用游戏引擎中已实例化的系统
      this.familySystem = this.gameEngine.familySystem;
      this.socialIdentitySystem = this.gameEngine.socialIdentitySystem;
      this.emotionalRelationshipSystem = this.gameEngine.emotionalRelationshipSystem;
      this.complexRelationshipAPI = this.gameEngine.complexRelationshipAPI;
      
      // 连接系统
      this.complexRelationshipAPI.setRelationshipSystems({
        familySystem: this.familySystem,
        socialIdentitySystem: this.socialIdentitySystem,
        emotionalRelationshipSystem: this.emotionalRelationshipSystem
      });
      
      this.isInitialized = true;
      console.log('关系系统管理器初始化完成');
      
    } catch (error) {
      console.error('关系系统初始化失败:', error);
      throw error;
    }
  }

  /**
   * 为角色创建三层关系系统
   * @param {Object} character - 角色对象
   */
  createCharacterRelationSystems(character) {
    if (!this.isInitialized) {
      throw new Error('三层关系系统未初始化');
    }
  
    // 为角色创建独立的情感关系系统实例
    character.emotionalSystem = new EmotionalRelationshipSystem(character.id);
    
    // 社会身份系统使用全局实例
    character.socialIdentitySystem = this.socialIdentitySystem;
    
    // 添加复合关系查询方法
    this._addComplexRelationshipMethods(character);
    
    console.log(`为角色 ${character.name} 创建三层关系系统`);
  }

  /**
   * 添加复合关系查询方法到角色对象
   * @param {Object} character - 角色对象
   */
  _addComplexRelationshipMethods(character) {
    // 获取复合关系
    character.getComplexRelationship = (otherCharacterId) => {
      return this.complexRelationshipAPI.getCompleteRelationship(character.id, otherCharacterId);
    };
    
    // 获取所有关系
    character.getAllRelationships = (filters = {}) => {
      return this.complexRelationshipAPI.getCharacterRelationships(character.id, filters);
    };
    
    // 获取血缘关系
    character.getBloodRelation = (otherCharacterId) => {
      if (!character.familyName) return null;
      return this.familySystem.getKinship(character.familyName, character.id, otherCharacterId);
    };
    
    // 检查是否有血缘关系
    character.hasBloodRelation = (otherCharacterId) => {
      if (!character.familyName) return false;
      return this.familySystem.hasBloodRelation(character.familyName, character.id, otherCharacterId);
    };
  }

  /**
   * 创建家族（用于 CharacterGenerator）
   * @param {Object} options - 家族创建选项
   */
  createFamily(options) {
    if (!this.isInitialized) {
      throw new Error('三层关系系统未初始化');
    }
    
    return this.familySystem.createFamily(options);
  }
}

// ==================== CharacterGenerator 修复方案 ====================

/**
 * CharacterGenerator 整合修复
 * 解决接口冲突和职责混乱问题
 */
class CharacterGeneratorIntegrationFix {
  /**
   * 修复 CharacterGenerator 中的关系系统创建
   * @param {Object} characterGenerator - 原有的角色生成器
   * @param {Object} relationshipManager - 三层关系系统管理器
   */
  static fixCharacterGenerator(characterGenerator, relationshipManager) {
    
    // 移除原有的关系系统创建逻辑
    if (characterGenerator.createRelationshipSystem) {
      delete characterGenerator.createRelationshipSystem;
      console.log('🔧 移除 CharacterGenerator 中的关系系统创建方法');
    }
    
    // 添加新的家族创建方法
    characterGenerator.createCharacterFamily = function(options) {
      return relationshipManager.createFamily(options);
    };
    
    // 修复角色配置构建方法
    const originalBuildConfig = characterGenerator.buildCharacterConfig;
    characterGenerator.buildCharacterConfig = async function(options = {}) {
      const config = await originalBuildConfig.call(this, options);
      
      // 移除旧的关系系统配置
      if (config.relationshipSystemConfig) {
        delete config.relationshipSystemConfig;
      }
      
      // 添加三层关系系统标记
      config.useThreeLayerRelationships = true;
      
      return config;
    };
    
    console.log('✅ CharacterGenerator 接口修复完成');
  }
}

// ==================== Character Module 修复方案 ====================

/**
 * Character Module 整合修复
 * 更新角色模块以支持三层关系系统
 */
class CharacterModuleIntegrationFix {
  /**
   * 修复 Character 类的关系系统引用
   * @param {Function} CharacterClass - 角色类构造函数
   * @param {Object} relationshipManager - 三层关系系统管理器
   */
  static fixCharacterModule(CharacterClass, relationshipManager) {
    
    // 保存原有构造函数
    const originalConstructor = CharacterClass.prototype.constructor;
    
    // 修改构造函数
    CharacterClass.prototype.constructor = function(...args) {
      // 调用原有构造函数
      originalConstructor.apply(this, args);
      
      // 移除旧的关系系统引用
      if (this.relationshipSystem) {
        delete this.relationshipSystem;
      }
      
      // 标记需要创建三层关系系统
      this._needsThreeLayerRelationships = true;
    };
    
    // 添加关系系统初始化方法
    CharacterClass.prototype.initializeRelationshipSystems = function() {
      if (this._needsThreeLayerRelationships && !this._relationshipSystemsInitialized) {
        relationshipManager.createCharacterRelationSystems(this);
        this._relationshipSystemsInitialized = true;
        this._needsThreeLayerRelationships = false;
      }
    };
    
    // 修复原有的关系查询方法（向后兼容）
    CharacterClass.prototype.getRelationship = function(otherCharacterId) {
      this.initializeRelationshipSystems();
      return this.getComplexRelationship(otherCharacterId);
    };
    
    CharacterClass.prototype.getRelationshipType = function(otherCharacterId) {
      this.initializeRelationshipSystems();
      const relationship = this.getComplexRelationship(otherCharacterId);
      return relationship?.primaryCategory || 'unknown';
    };
    
    console.log('✅ Character Module 接口修复完成');
  }
}

// ==================== Name Generator 集成方案 ====================

/**
 * NameGenerator 集成修复
 * 确保与现有系统的兼容性
 */
class NameGeneratorIntegrationFix {
  /**
   * 检查和修复 NameGenerator 接口冲突
   * @param {Object} gameEngine - 游戏引擎
   */
  static fixNameGeneratorIntegration(gameEngine) {
    
    // 检查是否存在 NameGenerator
    if (!gameEngine.nameGenerator) {
      console.warn('⚠️ NameGenerator 未找到，跳过集成修复');
      return;
    }
    
    // 确保 CharacterGenerator 使用 NameGenerator
    if (gameEngine.characterGenerator) {
      const generator = gameEngine.characterGenerator;
      
      // 移除内部姓名生成逻辑（如果存在）
      if (generator.generateName) {
        delete generator.generateName;
        console.log('🔧 移除 CharacterGenerator 中的内部姓名生成方法');
      }
      
      if (generator.generateRandomName) {
        delete generator.generateRandomName;
        console.log('🔧 移除 CharacterGenerator 中的随机姓名生成方法');
      }
      
      // 确保使用统一的 NameGenerator
      generator.generateCharacterName = function(options) {
        return gameEngine.nameGenerator.generateName(options);
      };
    }
    
    console.log('✅ NameGenerator 集成修复完成');
  }
}

// ==================== UnifiedDataManager 集成方案 ====================

/**
 * UnifiedDataManager 数据创建整合
 * 确保角色创建时正确初始化三层关系系统
 */
class DataManagerIntegrationFix {
  /**
   * 修复 UnifiedDataManager 的角色创建流程
   * @param {Object} dataManager - 统一数据管理器
   * @param {Object} relationshipManager - 三层关系系统管理器
   */
  static fixDataManagerIntegration(dataManager, relationshipManager) {
    
    // 保存原有的角色创建方法
    const originalCreateCharacter = dataManager.createCharacter;
    
    // 重写角色创建方法
    dataManager.createCharacter = async function(config) {
      // 调用原有创建逻辑
      const character = await originalCreateCharacter.call(this, config);
      
      // 为角色初始化三层关系系统
      if (config.useThreeLayerRelationships !== false) {
        relationshipManager.createCharacterRelationSystems(character);
      }
      
      return character;
    };
    
    // 添加关系系统批量初始化方法
    dataManager.initializeAllCharacterRelationships = function() {
      for (const [characterId, character] of this.gameEngine.characters) {
        if (!character._relationshipSystemsInitialized) {
          relationshipManager.createCharacterRelationSystems(character);
        }
      }
      console.log('✅ 所有角色的关系系统初始化完成');
    };
    
    console.log('✅ UnifiedDataManager 集成修复完成');
  }
}

// ==================== 主要整合类 ====================

/**
 * 三层关系系统主整合器
 * 协调所有系统的整合和修复
 */
export class ThreeLayerRelationshipIntegrator {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.relationshipManager = new RelationshipSystemsManager(gameEngine);
    this.isIntegrated = false;
  }

  /**
   * 执行完整整合流程
   */
  async integrate() {
    if (this.isIntegrated) return;
    
    console.log('🔄 开始三层关系系统整合');
    
    try {
      // 1. 初始化三层关系系统
      await this.relationshipManager.initialize();
      
      // 2. 修复各个模块的接口冲突
      this._fixModuleIntegrations();
      
      // 3. 为现有角色初始化关系系统
      await this._initializeExistingCharacters();
      
      // 4. 验证整合结果
      this._validateIntegration();
      
      this.isIntegrated = true;
      console.log('✅ 三层关系系统整合完成');
      
    } catch (error) {
      console.error('❌ 三层关系系统整合失败:', error);
      throw error;
    }
  }

  /**
   * 修复各模块的接口集成
   */
  _fixModuleIntegrations() {
    // 修复 CharacterGenerator
    if (this.gameEngine.characterGenerator) {
      CharacterGeneratorIntegrationFix.fixCharacterGenerator(
        this.gameEngine.characterGenerator,
        this.relationshipManager
      );
    }
    
    // 修复 Character Module
    if (typeof Character !== 'undefined') {
      CharacterModuleIntegrationFix.fixCharacterModule(
        Character,
        this.relationshipManager
      );
    }
    
    // 修复 NameGenerator 集成
    NameGeneratorIntegrationFix.fixNameGeneratorIntegration(this.gameEngine);
    
    // 修复 UnifiedDataManager 集成
    if (this.gameEngine.dataManager) {
      DataManagerIntegrationFix.fixDataManagerIntegration(
        this.gameEngine.dataManager,
        this.relationshipManager
      );
    }
  }

  /**
   * 为现有角色初始化关系系统
   */
  async _initializeExistingCharacters() {
    if (!this.gameEngine.characters || this.gameEngine.characters.size === 0) {
      console.log('📝 无现有角色，跳过关系系统初始化');
      return;
    }
    
    console.log(`🔄 为 ${this.gameEngine.characters.size} 个现有角色初始化关系系统`);
    
    for (const [characterId, character] of this.gameEngine.characters) {
      if (!character._relationshipSystemsInitialized) {
        this.relationshipManager.createCharacterRelationSystems(character);
      }
    }
    
    console.log('✅ 现有角色关系系统初始化完成');
  }

  /**
   * 验证整合结果
   */
  _validateIntegration() {
    const issues = [];
    
    // 验证三层关系系统
    if (!this.relationshipManager.familySystem) {
      issues.push('FamilySystem 未正确初始化');
    }
    
    if (!this.relationshipManager.socialIdentitySystem) {
      issues.push('SocialIdentitySystem 未正确初始化');
    }
    
    if (!this.relationshipManager.emotionalRelationshipSystem) {
      issues.push('EmotionalRelationshipSystem 未正确初始化');
    }
    
    if (!this.relationshipManager.complexRelationshipAPI) {
      issues.push('ComplexRelationshipAPI 未正确初始化');
    }
    
    // 验证模块整合
    if (this.gameEngine.characterGenerator && 
        !this.gameEngine.characterGenerator.createCharacterFamily) {
      issues.push('CharacterGenerator 整合不完整');
    }
    
    // 验证现有角色
    let charactersWithoutRelationSystems = 0;
    for (const [characterId, character] of this.gameEngine.characters) {
      if (!character._relationshipSystemsInitialized) {
        charactersWithoutRelationSystems++;
      }
    }
    
    if (charactersWithoutRelationSystems > 0) {
      issues.push(`${charactersWithoutRelationSystems} 个角色的关系系统未初始化`);
    }
    
    if (issues.length > 0) {
      console.warn('⚠️ 整合验证发现问题:', issues);
    } else {
      console.log('✅ 整合验证通过，无问题发现');
    }
    
    return { isValid: issues.length === 0, issues: issues };
  }

  /**
   * 获取三层关系系统管理器
   */
  getRelationshipManager() {
    return this.relationshipManager;
  }
}

// ==================== 使用示例 ====================

/*
// 在 GameEngine 中使用：

// 1. 创建并整合三层关系系统
const relationshipIntegrator = new ThreeLayerRelationshipIntegrator(this);
await relationshipIntegrator.integrate();

// 2. 获取关系系统管理器
this.relationshipManager = relationshipIntegrator.getRelationshipManager();

// 3. 现在可以使用三层关系系统了
const character1 = this.characters.get('char1');
const character2 = this.characters.get('char2');

// 获取复合关系
const relationship = character1.getComplexRelationship(character2.id);
console.log(`关系显示: ${relationship.displayName}`); // 例如："表兄·师父(仇敌)"

// 获取血缘关系
const bloodRelation = character1.getBloodRelation(character2.id);
if (bloodRelation) {
  console.log(`血缘关系: ${bloodRelation.title}`); // 例如："表兄"
}

// 获取所有关系
const allRelationships = character1.getAllRelationships({ 
  minStrength: 30, 
  category: 'family' 
});
*/

export default ThreeLayerRelationshipIntegrator;