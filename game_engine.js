/**
 * game_engine.js - 南北朝坞堡模拟器核心引擎 (完整重构版)
 * 
 * 重构特点：
 * - 保留所有原有功能和方法
 * - 集成统一数据管理器
 * - 实现完整的事件驱动架构
 * - 保持向后兼容性
 */

// 导入现有模块（保持不变）
import { DEFAULT_CONFIG } from './gameConfig.js';
import { Utils } from './utils_module.js';
import { TimeSystem } from './time_system_v2.js';
import { ResourceSystem } from './resource_system.js';
import { Character } from './character_module.js';
import { LocationSystem } from './location_system.js';
import { VirtueSystem } from './virtue_system.js';
import { SkillSystem } from './skill_system.js';
import { ActionProcessor } from './action_processor.js';
import { BehaviorSystem } from './behavior_system.js';
import { DecisionEngine } from './decision_engine.js';
import { MemorySystem } from './memory_system.js';

// 导入新架构模块
import EventBus from './event_bus.js';
import GameStateManager from './game_state_manager.js';
import FamilySystem from './family_system.js';
import NameGenerator from './name_generator.js';
import { PersonalityConfigLoader } from './personality_system.js';
import UnifiedDataManager from './unified_data_manager.js';

// 导入角色生成器
import { CharacterGenerator } from './character_generator.js';

// 导入事件适配器
import { addEventSupportToCharacters } from './character_module_event_adapter.js';
import { addEventSupportToResourceSystem } from './resource_system_event_adapter.js';
import { addEventSupportToLocationSystem } from './location_system_event_adapter.js';
import { addEventSupportToVirtueSystem } from './virtue_system_event_adapter.js';
import { addEventSupportToSkillSystem } from './skill_system_event_adapter.js';
import { addEventSupportToBehaviorSystem } from './behavior_system_event_adapter.js';
import { addEventSupportToDecisionEngine } from './decision_engine_event_adapter.js';

// 导入三层关系系统整合器
import SocialIdentitySystem from './social_identity_system.js';
import EmotionalRelationshipSystem from './emotional_relationship_system.js';
import ThreeLayerRelationshipIntegrator from './relationship_systems_integration.js';
import ComplexRelationshipAPI from './complex_relationship_api.js';

export class GameEngine {
  constructor() {
    console.log('🚀 初始化南北朝坞堡模拟器引擎 (完整重构版)');
    
    // =============== 新架构核心组件 ===============
    
    // 1. 事件总线 - 第一个初始化，其他模块依赖它
    this.eventBus = new EventBus();
    
    // 2. 统一数据管理器 - 数据权威源
    this.dataManager = new UnifiedDataManager(this);
    
    // 3. 状态管理器 - 统一状态管理
    this.stateManager = new GameStateManager(this);
    
    // 4. 家族系统 - 五代关系管理
    this.familySystem = new FamilySystem();
    
    // 5. 姓名生成器 - 南北朝命名
    this.nameGenerator = new NameGenerator();
    
    // 6. 角色生成器 - 智能角色创建
    this.characterGenerator = new CharacterGenerator(this);
    
    // =============== 原有游戏系统 ===============
    
    this.timeSystem = new TimeSystem();
    this.resourceSystem = new ResourceSystem(this);
    // 三层关系系统将在 initialize() 中初始化
    this.relationshipIntegrator = null;
    this.relationshipManager = null;
    this.locationSystem = new LocationSystem();
    this.personalityConfigLoader = new PersonalityConfigLoader();
    this.virtueSystem = new VirtueSystem();
    this.skillSystem = new SkillSystem();
    this.actionProcessor = new ActionProcessor(this);
    this.behaviorSystem = new BehaviorSystem();
    this.decisionEngine = new DecisionEngine(this);
    this.memorySystem = new MemorySystem();
    this.socialIdentitySystem = new SocialIdentitySystem(this);
    this.emotionalRelationshipSystem = new EmotionalRelationshipSystem(this);
    this.complexRelationshipAPI = new ComplexRelationshipAPI(this);
    
    // =============== 游戏状态 ===============
    
    // 保持角色Map兼容性
    this.characters = new Map();
    
    this.gameState = {
      // 游戏运行状态
      isRunning: false,
      isPaused: false,
      speed: 1,
      
      // 时间状态
      day: 1,
      season: '春季',
      weather: '晴朗',
      
      // 人口状态
      population: 0,
      
      // 初始化状态
      isInitialized: false,
      initializationProgress: 0,
      
      // 游戏循环状态
      lastUpdate: Date.now(),
      targetFPS: 60,
      actualFPS: 0
    };
    
    // =============== 游戏循环相关 ===============
    
    this.gameLoopId = null;
    this.lastUpdateTime = 0;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;
    
    // =============== 统计和调试 ===============
    
    this.statistics = {
      totalUpdateCycles: 0,
      totalCharactersCreated: 0,
      totalEventsProcessed: 0,
      totalStateUpdates: 0,
      averageFrameTime: 0,
      memoryUsage: 0
    };
    
    // =============== 初始化流程 ===============
    
    this.isInitialized = false;
    this.initializationProgress = 0;
    
    console.log('✅ 游戏引擎构造完成，准备初始化');
  }
  
  // =============== 初始化流程 ===============
  
  async initialize() {
    console.log('📋 开始游戏引擎完整初始化流程');
    
    try {
      // 1. 加载外部数据表 (20%)
      await this.loadExternalData();
      this.initializationProgress = 20;
      
      // 2. 设置事件适配器 (40%)
      this.setupEventAdapters();
      this.initializationProgress = 40;
      
      // 3. 设置状态管理 (60%)
      this.setupStateManagement();
      this.initializationProgress = 60;
      
      // 4. 初始化游戏系统 (80%)
      this.initializeGameSystems();
      this.initializationProgress = 80;
      
      // 5. 创建初始人口 (100%)
      await this.createInitialPopulation();
      this.initializationProgress = 100;

      // 6. 初始化三层关系系统整合器
      try {
        console.log('开始初始化关系系统整合器...');
        const { ThreeLayerRelationshipIntegrator } = await import('./relationship_systems_integration.js');
        console.log('导入成功，创建整合器实例...');
        this.relationshipIntegrator = new ThreeLayerRelationshipIntegrator(this);
        console.log('开始执行整合...');
        await this.relationshipIntegrator.integrate();
        console.log('整合完成，获取管理器...');
        this.relationshipManager = this.relationshipIntegrator.getRelationshipManager();
        console.log('关系系统整合器初始化完成');
      } catch (error) {
        console.error('关系系统整合失败:', error);
        console.error('错误堆栈:', error.stack);
        this.relationshipIntegrator = null;
        this.relationshipManager = null;
      }

      // 7. 为现有角色初始化关系系统
      this.initializeRelationshipSystemsForExistingCharacters();

      // 8. 生成基础社会关系网络
      this.generateBasicSocialNetwork();
      
      this.isInitialized = true;
      this.gameState.isInitialized = true;
      
      console.log('✅ 游戏引擎完整初始化完成');
      
      // 通知初始化完成事件
      this.eventBus.emit('engineInitialized', {
        timestamp: Date.now(),
        characterCount: this.characters.size,
        initializationTime: Date.now() - this.gameState.lastUpdate
      });
      
    } catch (error) {
      console.error('❌ 游戏引擎初始化失败:', error);
      throw error;
    }
  }

  initializeRelationshipSystemsForExistingCharacters() {
    console.log('🔗 为现有角色初始化关系系统');
    for (const character of this.characters.values()) {
      if (!character._relationshipSystemsInitialized) {
        // 添加关系方法到角色
        this.addRelationshipMethodsToCharacter(character);
        character._relationshipSystemsInitialized = true;
      }
    }
  }
  
  addRelationshipMethodsToCharacter(character) {
    if (this.relationshipManager) {
      // 使用关系系统管理器创建完整的关系方法
      this.relationshipManager.createCharacterRelationSystems(character);
    } else {
      // 如果关系管理器未初始化，添加基础方法
      character.getAllRelationships = () => {
        // 从现有的complexRelationshipAPI获取关系
        if (this.complexRelationshipAPI) {
          return this.complexRelationshipAPI.getCharacterRelationships(character.id) || [];
        }
        return [];
      };
    }
  }
  
  generateBasicSocialNetwork() {
    console.log('开始生成基础社会关系网络...');
    
    const characters = Array.from(this.characters.values());
    
    for (let i = 0; i < characters.length; i++) {
      const char1 = characters[i];
      
      // 为每个角色随机建立1-3个朋友关系
      const friendCount = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < friendCount && j < 5; j++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        if (randomIndex !== i) {
          const char2 = characters[randomIndex];
          
          // 通过情感系统建立友谊
          if (char1.emotionalSystem && char2.emotionalSystem) {
            char1.emotionalSystem.processEmotionalInteraction(char2.id, 'positive_interaction', {
              intensity: Math.random() * 20 + 30 // 30-50强度
            });
          }
        }
      }
    }
    
    console.log('基础社会关系网络生成完成');
  }


  async loadExternalData() {
    console.log('📊 加载外部数据表配置');
    
    try {
      // 预加载关键数据表
      await this.dataManager.dataTableManager.getVirtueSystemConfig();
      await this.dataManager.dataTableManager.getCharacterNamesConfig();
      await this.dataManager.dataTableManager.getBalanceConfig();
      
      console.log('✅ 外部数据表加载完成');
    } catch (error) {
      console.warn('⚠️ 外部数据表加载失败，使用内置配置:', error);
      // 继续使用 gameConfig.js 中的配置
    }
  }
  
  setupEventAdapters() {
    console.log('🔌 设置完整事件适配器系统');
    
    // 为所有系统添加事件支持
    addEventSupportToCharacters(this.characters, this.eventBus);
    addEventSupportToResourceSystem(this.resourceSystem, this.eventBus);
    addEventSupportToLocationSystem(this.locationSystem, this.eventBus);
    addEventSupportToVirtueSystem(this.virtueSystem, this.eventBus);
    addEventSupportToSkillSystem(this.skillSystem, this.eventBus);
    addEventSupportToBehaviorSystem(this.behaviorSystem, this.eventBus);
    addEventSupportToDecisionEngine(this.decisionEngine, this.eventBus);
    
    // 设置核心事件监听器
    this.setupCoreEventListeners();
    
    console.log('✅ 事件适配器系统设置完成');
  }
  
  setupCoreEventListeners() {
    // 数据管理相关事件
    this.dataManager.on('character_created', (data) => {
      console.log(`👤 新角色创建: ${data.character.name}`);
      this.syncCharactersMap();
      this.updatePopulationStats();
    });
    
    this.dataManager.on('character_updated', (data) => {
      //console.log(`🔄 角色更新: ${data.characterId}`);
      this.syncCharactersMap();
    });
    
    this.dataManager.on('character_removed', (data) => {
      console.log(`🗑️ 角色删除: ${data.characterId}`);
      this.syncCharactersMap();
      this.updatePopulationStats();
    });
    
    // 时间系统事件
    this.eventBus.on('timeChanged', (data) => {
      this.gameState.day = data.currentDay;
      this.gameState.season = data.currentSeason;
      this.gameState.weather = data.currentWeather;
    });
    
    // 游戏状态事件
    this.eventBus.on('stateChanged', (data) => {
      this.handleStateChange(data);
    });
    
    // 系统错误事件
    this.eventBus.on('systemError', (error) => {
      console.error('🚨 系统错误:', error);
      this.handleSystemError(error);
    });
  }
  
  setupStateManagement() {
    console.log('📊 设置状态管理系统');
    
    // 设置状态管理器的数据源
    if (typeof this.stateManager.setDataSources === 'function') {
      this.stateManager.setDataSources({
        characters: () => this.dataManager.getAllCharacters(),
        resources: () => this.resourceSystem.getAllResources?.() || {},
        locations: () => this.locationSystem.getAllLocations?.() || {},
        time: () => this.timeSystem.getTimeComponents?.() || {}
      });
    } else {
      console.log('⚠️ GameStateManager 暂无 setDataSources 方法，跳过');
    }
      
    console.log('✅ 状态管理系统设置完成');
  }
  
  initializeGameSystems() {
    console.log('⚙️ 初始化游戏系统依赖关系');
    
    // 设置系统间的依赖关系
    this.decisionEngine.resourceSystem = this.resourceSystem;
    this.decisionEngine.memorySystem = this.memorySystem;
    this.decisionEngine.dataManager = this.dataManager;
    
    this.behaviorSystem.decisionEngine = this.decisionEngine;
    this.behaviorSystem.actionProcessor = this.actionProcessor;
    this.behaviorSystem.dataManager = this.dataManager;
    
    this.actionProcessor.resourceSystem = this.resourceSystem;
    this.actionProcessor.locationSystem = this.locationSystem;
    this.actionProcessor.dataManager = this.dataManager;
    
    // 设置角色生成器的依赖
    this.characterGenerator.dataManager = this.dataManager;
    this.characterGenerator.nameGenerator = this.nameGenerator;
    this.characterGenerator.familySystem = this.familySystem;
    
    console.log('✅ 游戏系统依赖关系初始化完成');
  }
  
  async createInitialPopulation() {
    console.log('👥 创建初始人口');
    
    const config = DEFAULT_CONFIG.CHARACTER_GENERATION;
    const initialCount = config?.INITIAL_POPULATION || 16;
    
    // 创建初始家族
    const families = [
      { surname: '谢', size: 4, type: 'founder' },
      { surname: '潘', size: 3, type: 'founder' },
      { surname: '魏', size: 3, type: 'founder' },
      { surname: '华', size: 2, type: 'founder' },
      { surname: '奚', size: 2, type: 'founder' },
      { surname: '苏', size: 2, type: 'founder' }
    ];
    
    let totalCreated = 0;
    
    for (const family of families) {
      const created = await this.createFamilyCharacters(
        family.surname, 
        family.size, 
        family.type
      );
      totalCreated += created;
    }
    
    console.log(`✅ 初始人口创建完成: ${totalCreated} 人`);
    this.statistics.totalCharactersCreated = totalCreated;
  }
  
  async createFamilyCharacters(surname, size, origin = 'founder') {
    console.log(`👨‍👩‍👧‍👦 创建${surname}家族，${size}人`);
    
    try {
      // 调用CharacterGenerator的家族生成方法
      const familyMembers = await this.characterGenerator.generateFamilyMembers({
        familyName: surname,
        size: size,
        socialClass: origin === 'founder' ? '门阀士族' : '平民',
        type: 'five_generation'
      });
      
      // 🆕 重要：为家族成员建立血缘关系
      if (familyMembers && familyMembers.length > 1) {
        this._establishFamilyBloodRelations(familyMembers, surname);
      }
      
      console.log(`✅ ${surname}家族创建完成: ${familyMembers.length}人`);
      return familyMembers.length;
      
    } catch (error) {
      console.error(`❌ ${surname}家族创建失败:`, error);
      return 0;
    }
  }
  
  // 添加这个新方法
  _establishFamilyBloodRelations(familyMembers, familyName) {
    console.log(`🔗 为${familyName}家族建立血缘关系`);
    
    // 简单建立家族内所有人的血缘关系
    for (let i = 0; i < familyMembers.length; i++) {
      for (let j = i + 1; j < familyMembers.length; j++) {
        const member1 = familyMembers[i];
        const member2 = familyMembers[j];
        
        // 通过familySystem注册血缘关系
        if (this.familySystem && this.familySystem.setBloodRelation) {
          this.familySystem.setBloodRelation(member1.id, member2.id, '族人');
        }
      }
    }
  }
  
  generateFamilyMemberAge(index, familySize) {
    // 生成合理的家族年龄分布
    const ageRanges = [
      { min: 45, max: 65 }, // 家长
      { min: 40, max: 60 }, // 配偶
      { min: 16, max: 35 }, // 子女
      { min: 12, max: 25 }, // 年轻子女
      { min: 5, max: 15 }   // 幼子
    ];
    
    const range = ageRanges[Math.min(index, ageRanges.length - 1)];
    return Utils.Math.randomInt(range.min, range.max);
  }
  
  // =============== 角色管理接口 ===============
  
  /**
   * 创建新角色 - 通过数据管理器
   */
  async createCharacter(config) {
    console.log('🆕 创建新角色');
    return await this.dataManager.createCharacter(config);
  }
  
  /**
   * 获取角色 - 通过数据管理器
   */
  getCharacter(characterId) {
    return this.dataManager.getCharacter(characterId);
  }
  
  /**
   * 获取所有角色 - 通过数据管理器
   */
  getAllCharacters() {
    return this.dataManager.getAllCharacters();
  }
  
  /**
   * 添加角色到游戏 - 兼容性方法
   */
  addCharacter(character) {
    console.log(`➕ 添加角色到游戏: ${character.name}`);
    this.dataManager.addCharacter(character);
    this.syncCharactersMap();
    this.updatePopulationStats();
    return character;
  }
  
  /**
   * 移除角色 - 通过数据管理器
   */
  removeCharacter(characterId) {
    console.log(`➖ 移除角色: ${characterId}`);
    const removedCharacter = this.dataManager.removeCharacter(characterId);
    this.syncCharactersMap();
    this.updatePopulationStats();
    return removedCharacter;
  }
  
  /**
   * 更新角色数据 - 通过数据管理器
   */
  updateCharacter(characterId, updateData, source = 'engine') {
    return this.dataManager.updateCharacterData(characterId, updateData, source);
  }
  
  /**
   * 批量生成移民 - 通过角色生成器
   */
  async generateImmigrants(count = null) {
    console.log('🚶 生成新移民');
    return await this.characterGenerator.generateImmigrantWave(count);
  }
  
  /**
   * 生成新生儿 - 通过角色生成器
   */
  async generateNewborn(fatherId, motherId) {
    console.log('👶 生成新生儿');
    return await this.characterGenerator.generateNewborn(fatherId, motherId);
  }
  
  // =============== 兼容性维护 ===============
  
  /**
   * 同步角色Map - 保持向后兼容
   */
  syncCharactersMap() {
    // 确保 this.characters 与数据管理器同步
    this.characters.clear();
    
    const allCharacters = this.dataManager.getAllCharacters();
    for (const character of allCharacters) {
      this.characters.set(character.id, character);
    }
    
    //console.log(`🔄 角色Map同步完成: ${this.characters.size} 个角色`);
  }
  
  updatePopulationStats() {
    this.gameState.population = this.characters.size;
  }
  
  // =============== 游戏循环系统 ===============
  
  start() {
    if (!this.isInitialized) {
      console.warn('⚠️ 游戏引擎尚未初始化完成');
      return;
    }
    
    if (this.gameState.isRunning) {
      console.warn('⚠️ 游戏已在运行中');
      return;
    }
    
    console.log('▶️ 开始游戏循环');
    this.gameState.isRunning = true;
    this.gameState.lastUpdate = Date.now();
    this.lastUpdateTime = performance.now();
    
    this.gameLoop();
    
    this.eventBus.emit('gameStarted', {
      timestamp: Date.now(),
      population: this.gameState.population
    });
  }
  
  pause() {
    console.log('⏸️ 切换游戏暂停状态');
    this.gameState.isPaused = !this.gameState.isPaused;
    
    this.eventBus.emit('gamePaused', {
      isPaused: this.gameState.isPaused,
      timestamp: Date.now()
    });
  }
  
  stop() {
    console.log('⏹️ 停止游戏');
    this.gameState.isRunning = false;
    this.gameState.isPaused = false;
    
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
    
    this.eventBus.emit('gameStopped', {
      timestamp: Date.now(),
      totalCycles: this.statistics.totalUpdateCycles
    });
  }
  
  gameLoop(currentTime = performance.now()) {
    if (!this.gameState.isRunning) return;
    
    const deltaTime = currentTime - this.lastUpdateTime;
    
    // 控制帧率
    if (deltaTime >= (1000 / this.gameState.targetFPS)) {
      
      if (!this.gameState.isPaused) {
        this.update(deltaTime);
        this.statistics.totalUpdateCycles++;
        
        // 计算FPS
        this.updateFPS(currentTime);
      }
      
      this.lastUpdateTime = currentTime;
    }
    
    // 继续循环
    this.gameLoopId = requestAnimationFrame((time) => this.gameLoop(time));
  }
  
  updateFPS(currentTime) {
    this.frameCount++;
    
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.gameState.actualFPS = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }
  }
  
  update(deltaTime) {
    const startTime = performance.now();
    
    // 更新时间系统
    this.timeSystem.update(deltaTime);
    
    // 更新游戏状态
    this.gameState.day = this.timeSystem.getCurrentDay?.() || this.gameState.day;
    this.gameState.season = this.timeSystem.getCurrentSeason?.() || this.gameState.season;
    
    // 更新所有角色
    this.updateAllCharacters(deltaTime);
    
    // 更新其他系统
    this.resourceSystem.update?.(deltaTime);
    this.locationSystem.update?.(deltaTime);
    this.behaviorSystem.update?.(deltaTime);
    
    // 同步状态管理器
    if (this.statistics.totalUpdateCycles % 10 === 0) {
      this.stateManager.syncWithModules();
    }
    
    // 发送更新事件
    this.eventBus.emit('gameUpdated', {
      deltaTime,
      day: this.gameState.day,
      season: this.gameState.season,
      population: this.gameState.population,
      timestamp: Date.now()
    });
    
    // 更新性能统计
    const updateTime = performance.now() - startTime;
    this.statistics.averageFrameTime = 
      (this.statistics.averageFrameTime * 0.9) + (updateTime * 0.1);
  }
  
  updateAllCharacters(deltaTime) {
    const characters = this.getAllCharacters();
    
    for (const character of characters) {
      try {
        this.updateSingleCharacter(character, deltaTime);
      } catch (error) {
        console.error(`角色更新失败 ${character.name}:`, error);
        // 数据管理器会尝试自动修复
      }
    }
  }
  
  updateSingleCharacter(character, deltaTime) {
    const updateData = {};
    let hasUpdates = false;
    
    // 基础需求衰减
    if (character.physicalState) {
      const oldHunger = character.physicalState.hunger;
      const oldThirst = character.physicalState.thirst;
      
      character.physicalState.hunger = Math.max(0, 
        character.physicalState.hunger - (0.1 * this.gameState.speed)
      );
      character.physicalState.thirst = Math.max(0,
        character.physicalState.thirst - (0.15 * this.gameState.speed)
      );
      character.physicalState.stamina = Math.max(0,
        character.physicalState.stamina - (0.05 * this.gameState.speed)
      );
      
      if (oldHunger !== character.physicalState.hunger || 
          oldThirst !== character.physicalState.thirst) {
        updateData.physicalState = character.physicalState;
        hasUpdates = true;
      }
    }
    
    // 年龄增长
    const ageIncrement = deltaTime / (365 * 24 * 60 * 60 * 1000) * this.gameState.speed;
    if (ageIncrement > 0.001) { // 避免频繁的微小更新
      const oldAge = character.age;
      character.age += ageIncrement;
      
      if (Math.floor(character.age) > Math.floor(oldAge)) {
        updateData.age = character.age;
        hasUpdates = true;
        
        // 年龄里程碑事件
        this.eventBus.emit('characterAged', {
          characterId: character.id,
          newAge: Math.floor(character.age),
          oldAge: Math.floor(oldAge)
        });
      }
    }
    
    // 行为决策（每5秒执行一次）
    if (this.statistics.totalUpdateCycles % 300 === 0) {
      this.processCharacterDecision(character);
    }
    
    // 通过数据管理器更新数据（批量）
    if (hasUpdates) {
      updateData.lastGameUpdate = Date.now();
      this.dataManager.updateCharacterData(character.id, updateData, 'game_loop');
    }
  }
  
  processCharacterDecision(character) {
    if (this.decisionEngine && character.id) {
      try {
        const decision = this.decisionEngine.makeDecision(character.id);
        if (decision) {
          this.executeCharacterAction(character, decision);
        }
      } catch (error) {
        console.error(`角色决策处理失败 ${character.name}:`, error);
      }
    }
  }
  
  executeCharacterAction(character, action) {
    if (this.actionProcessor) {
      try {
         // 创建context对象
        const context = {
          currentTime: Date.now(),
          timeOfDay: DEFAULT_CONFIG.TIME_OF_DAY?.[0] || '白天',
          weather: this.gameState.weather,
          season: this.gameState.season,
          locationPopulation: this.locationSystem.getLocationPopulation()
        };
        const result = this.actionProcessor.processAction(character, action, context);
        
        if (result.success) {
          // 行为执行成功，可能影响德行、技能等
          this.eventBus.emit('characterActionExecuted', {
            characterId: character.id,
            action: action,
            result: result,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error(`角色行为执行失败 ${character.name}:`, error);
      }
    }
  }
  
  // =============== 事件处理方法 ===============
  
  handleStateChange(data) {
    // 处理状态变化
    if (data.type === 'characters') {
      this.syncCharactersMap();
    } else if (data.type === 'resources') {
      // 资源状态变化处理
      this.handleResourceStateChange(data);
    } else if (data.type === 'time') {
      // 时间状态变化处理
      this.handleTimeStateChange(data);
    }
  }
  
  handleResourceStateChange(data) {
    // 检查资源短缺警告
    if (data.newValue && data.newValue.food < 50) {
      this.eventBus.emit('resourceShortage', {
        type: 'food',
        currentAmount: data.newValue.food,
        severity: 'warning'
      });
    }
  }
  
  handleTimeStateChange(data) {
    // 处理季节变化
    if (data.season !== this.gameState.season) {
      this.eventBus.emit('seasonChanged', {
        oldSeason: this.gameState.season,
        newSeason: data.season,
        timestamp: Date.now()
      });
    }
  }
  
  handleSystemError(error) {
    // 系统错误处理
    console.error('系统错误详情:', error);
    
    // 尝试自动恢复
    if (error.type === 'data_corruption') {
      this.attemptDataRecovery();
    } else if (error.type === 'memory_leak') {
      this.performMemoryCleanup();
    }
  }
  
  attemptDataRecovery() {
    console.log('🔧 尝试数据自动恢复');
    
    try {
      // 通过数据管理器修复数据
      const repairResult = this.dataManager.repairAllData?.();
      
      if (repairResult?.success) {
        console.log('✅ 数据自动恢复成功');
      } else {
        console.warn('⚠️ 数据自动恢复失败');
      }
    } catch (error) {
      console.error('❌ 数据恢复过程出错:', error);
    }
  }
  
  performMemoryCleanup() {
    console.log('🧹 执行内存清理');
    
    // 清理缓存
    this.dataManager.invalidateCache();
    
    // 清理事件监听器
    this.eventBus.removeStaleListeners?.();
    
    // 垃圾回收提示
    if (window.gc) {
      window.gc();
    }
  }
  
  // =============== 调试和统计接口 ===============
  
  getGameState() {
    return {
      ...this.gameState,
      characters: this.characters.size,
      isInitialized: this.isInitialized,
      initializationProgress: this.initializationProgress,
      
      // 系统状态
      timeSystemState: this.timeSystem.getState?.() || {},
      resourceSystemState: this.resourceSystem.getState?.() || {},
      
      // 性能统计
      statistics: this.statistics,
      
      // 数据管理器统计
      dataManagerStats: this.dataManager.getStats()
    };
  }
  
  getDebugInfo() {
    return {
      // 基础游戏状态
      gameState: this.getGameState(),
      
      // 各系统调试信息
      systems: {
        eventBus: this.eventBus.getStats?.() || {},
        stateManager: this.stateManager.getStats?.() || {},
        dataManager: this.dataManager.getStats(),
        characterGenerator: this.characterGenerator.getGenerationStats?.() || {}
      },
      
      // 内存使用情况
      memory: {
        charactersCount: this.characters.size,
        dataStoreSize: this.dataManager.dataStore?.size || 0,
        backupStoreSize: this.dataManager.backupStore?.size || 0,
        cacheSize: this.dataManager.cache?.size || 0
      },
      
      // 性能指标
      performance: {
        averageFrameTime: this.statistics.averageFrameTime,
        actualFPS: this.gameState.actualFPS,
        targetFPS: this.gameState.targetFPS,
        totalUpdateCycles: this.statistics.totalUpdateCycles
      }
    };
  }
  
  getStats() {
    return {
      // 游戏统计
      totalPlayTime: Date.now() - (this.gameState.lastUpdate || Date.now()),
      totalCharacters: this.characters.size,
      totalUpdateCycles: this.statistics.totalUpdateCycles,
      
      // 角色统计
      charactersByLocation: this.getCharactersByLocationStats(),
      charactersByAge: this.getCharactersByAgeStats(),
      charactersByGender: this.getCharactersByGenderStats(),
      
      // 系统统计
      systemStats: {
        dataManagerStats: this.dataManager.getStats(),
        generatorStats: this.characterGenerator.getGenerationStats?.() || {}
      }
    };
  }
  
  getCharactersByLocationStats() {
    const stats = {};
    for (const character of this.characters.values()) {
      const location = character.currentLocation || '未知';
      stats[location] = (stats[location] || 0) + 1;
    }
    return stats;
  }
  
  getCharactersByAgeStats() {
    const stats = { child: 0, adult: 0, elder: 0 };
    for (const character of this.characters.values()) {
      if (character.age < 16) stats.child++;
      else if (character.age < 60) stats.adult++;
      else stats.elder++;
    }
    return stats;
  }
  
  getCharactersByGenderStats() {
    const stats = { male: 0, female: 0 };
    for (const character of this.characters.values()) {
      if (character.gender === '男') stats.male++;
      else if (character.gender === '女') stats.female++;
    }
    return stats;
  }
  
  // =============== 高级功能接口 ===============
  
  /**
   * 设置游戏速度
   */
  setGameSpeed(speed) {
    speed = Math.max(0.1, Math.min(10, speed)); // 限制在0.1x到10x之间
    this.gameState.speed = speed;
    
    this.eventBus.emit('gameSpeedChanged', {
      newSpeed: speed,
      timestamp: Date.now()
    });
    
    console.log(`⚡ 游戏速度设置为: ${speed}x`);
  }
  
  /**
   * 保存游戏状态
   */
  async saveGame(saveName = null) {
    console.log('💾 保存游戏状态');
    
    const saveData = {
      version: '1.0.0',
      timestamp: Date.now(),
      saveName: saveName || `存档_${new Date().toISOString()}`,
      
      gameState: this.gameState,
      characters: this.dataManager.getAllCharacters(),
      statistics: this.statistics,
      
      // 系统状态
      timeSystemState: this.timeSystem.exportState?.() || {},
      resourceSystemState: this.resourceSystem.exportState?.() || {}
    };
    
    try {
      // 这里可以实现具体的存档逻辑
      // localStorage, IndexedDB, 或服务器保存
      
      this.eventBus.emit('gameSaved', {
        saveName: saveData.saveName,
        timestamp: saveData.timestamp
      });
      
      console.log('✅ 游戏状态保存成功');
      return saveData;
      
    } catch (error) {
      console.error('❌ 游戏保存失败:', error);
      throw error;
    }
  }
  
  /**
   * 加载游戏状态
   */
  async loadGame(saveData) {
    console.log('📂 加载游戏状态');
    
    try {
      // 停止当前游戏
      if (this.gameState.isRunning) {
        this.stop();
      }
      
      // 恢复游戏状态
      this.gameState = { ...this.gameState, ...saveData.gameState };
      this.statistics = { ...this.statistics, ...saveData.statistics };
      
      // 恢复角色数据
      if (saveData.characters) {
        this.characters.clear();
        for (const characterData of saveData.characters) {
          await this.dataManager.addCharacter(characterData);
        }
      }
      
      // 恢复系统状态
      if (saveData.timeSystemState) {
        this.timeSystem.importState?.(saveData.timeSystemState);
      }
      if (saveData.resourceSystemState) {
        this.resourceSystem.importState?.(saveData.resourceSystemState);
      }
      
      // 同步数据
      this.syncCharactersMap();
      this.updatePopulationStats();
      
      this.eventBus.emit('gameLoaded', {
        saveName: saveData.saveName,
        timestamp: Date.now()
      });
      
      console.log('✅ 游戏状态加载成功');
      
    } catch (error) {
      console.error('❌ 游戏加载失败:', error);
      throw error;
    }
  }
  
  // =============== 事件接口 ===============
  
  on(event, listener) {
    this.eventBus.on(event, listener);
  }
  
  off(event, listener) {
    this.eventBus.off(event, listener);
  }
  
  emit(event, data) {
    this.eventBus.emit(event, data);
  }
  
  // =============== 清理和销毁 ===============
  
  destroy() {
    console.log('🗑️ 销毁游戏引擎');
    
    // 停止游戏循环
    this.stop();
    
    // 清理事件监听器
    this.eventBus.removeAllListeners?.();
    
    // 清理数据
    this.characters.clear();
    this.dataManager = null;
    this.stateManager = null;
    
    // 重置状态
    this.isInitialized = false;
    this.gameState.isInitialized = false;
    
    console.log('✅ 游戏引擎已销毁');
  }
  
  // =============== 兼容性方法 ===============
  
  /**
   * 获取角色生成器实例 - 兼容性方法
   */
  getCharacterGenerator() {
    return this.characterGenerator;
  }
  
  /**
   * 获取数据管理器实例 - 兼容性方法
   */
  getDataManager() {
    return this.dataManager;
  }
  
  /**
   * 获取事件总线实例 - 兼容性方法
   */
  getEventBus() {
    return this.eventBus;
  }
  
  /**
   * 检查游戏是否准备就绪
   */
  isReady() {
    return this.isInitialized && 
           this.dataManager && 
           this.characters.size > 0;
  }
  
  /**
   * 获取游戏版本信息
   */
  getVersion() {
    return {
      engine: '2.0.0',
      architecture: 'unified-data-management',
      build: Date.now(),
      features: [
        'unified-data-manager',
        'event-driven-architecture', 
        'state-management',
        'character-generation',
        'family-system',
        'virtue-system',
        'auto-recovery'
      ]
    };
  }
}

export default GameEngine;