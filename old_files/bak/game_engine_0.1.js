/**
 * GameEngine_Integrated.js - 南北朝坞堡模拟器集成版游戏主引擎
 * 
 * 功能：统一管理和调度所有子系统，完整集成resource_system和relationship_system
 * 版本：v2.0 - 完整集成版
 * 
 * 主要改进：
 * - ✅ 完整集成ResourceSystem资源管理系统
 * - ✅ 完整集成RelationshipSystem关系系统  
 * - ✅ 增强子系统间的协调和通信
 * - ✅ 完善事件系统集成
 * - ✅ 优化性能监控和错误处理
 * - ✅ 增强角色生命周期管理
 */

import { DEFAULT_CONFIG } from './gameConfig.js';
import { Utils } from './utils_module.js';
import TimeSystem from './time_system_v2.js';
import Character from './character_module.js';
import BehaviorSystem from './behavior_system.js';
import ResourceSystem from './resource_system.js';
import DecisionEngine from './decision_engine.js';
import VirtueSystem from './virtue_system.js'; 
import MemorySystem from './memory_system.js';
import { LocationSystem, LocationMovementManager } from './location_system.js';
import CharacterGenerator from './character_generator.js'; 

export class GameEngineIntegrated {
  constructor(config = {}) {
    // 引擎配置
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };
    
    // 游戏状态
    this.gameState = {
      isInitialized: false,
      isRunning: false,
      isPaused: false,
      currentPhase: 'initialization', // initialization, settlement, development, prosperity
      totalPopulation: 0,
      foundingYear: 1,
      currentSeason: '春季',
      weatherType: '晴朗',
      currentTime: 0,
      lastSaveTime: null,
      virtueStats: {          
        totalVirtueSystems: 0,
        averageVirtueLevel: 0,
        dominantVirtues: [],
        characterVirtueRankings: []
      }
    };
    
    // 子系统管理 - 完整集成版
    this.systems = {
      time: null,           // ✅ 时间系统
      resource: null,       // ✅ 资源系统 - 新集成
      relationship: null,   // ✅ 关系系统 - 新集成  
      behavior: null,       // ✅ 行为系统
      decision: null,       // ✅ 决策引擎
      memory: null,         // ⚠️  记忆系统 - 待集成
      virtue: null,
      action: null          // ⚠️  行为处理器 - 待集成
    };
    
    // 角色管理
    this.characters = new Map(); // characterId -> Character
    this.characterGroups = {
      founders: [],     // 创始流民
      newcomers: [],    // 新来的流民
      children: [],     // 出生的孩子
      deceased: []      // 已故人员
    };

    this.characterGenerator = null;
    
    // 简化事件系统 (内置)
    this.eventListeners = new Map();
    this.eventQueue = [];
    
    // 坞堡发展状态
    this.fortressState = {
      foundationLevel: 1,   // 基础设施等级
      defenseLevel: 1,      // 防御等级
      prosperityLevel: 1,   // 繁荣度
      reputationLevel: 1,   // 声誉等级
      culturalLevel: 1,     // 文化水平
      populationCapacity: 50, // 人口容量
      currentThreats: [],   // 当前威胁
      historicalEvents: []  // 重大历史事件
    };
    
    // 性能监控
    this.performance = {
      frameTime: 0,
      updateTime: 0,
      systemTimes: {},
      memoryUsage: 0,
      fps: 0,
      updateCount: 0,
      systemStatus: {
        time: 'idle',
        resource: 'idle',
        relationship: 'idle',
        behavior: 'idle',
        decision: 'idle'
      }
    };
    
    // 游戏统计
    this.statistics = {
      gameStartTime: Date.now(),
      totalGameDays: 0,
      totalBirths: 0,
      totalDeaths: 0,
      totalImmigrants: 0,
      majorEvents: 0,
      averageHappiness: 50,
      totalProduction: {},
      totalConsumption: {},
      resourceShortages: 0,
      relationshipEvents: 0
    };
    
    // 调试和开发工具
    this.debug = {
      enabled: true,
      logLevel: 'info',
      showPerformance: true,
      recordHistory: true,
      history: []
    };
  }

  // ==================== 初始化和启动 ====================

  /**
   * 初始化游戏引擎 - 完整集成版
   */
  async initialize(initialData = {}) {
    try {
      console.log('🏛️ 开始初始化南北朝坞堡模拟器 - 集成版...');
      
      // 1. 初始化时间系统
      await this._initializeTimeSystem();
      
      // 2. 初始化资源系统 - 新集成
      await this._initializeResourceSystem();
      
      // 3. 初始化关系系统 - 新集成
      await this._initializeRelationshipSystem();
      
      // 4. 初始化德行系统 - 新集成 
      await this._initializeVirtueSystem();  
      
      // 5. 初始化行为系统
      await this._initializeBehaviorSystem();
      
      // 6. 初始化记忆系统
      await this._initializeMemorySystem();
      
      // 7. 初始化决策引擎
      await this._initializeDecisionEngine();

      // 8. 初始化位置系统 
      await this._initializeLocationSystem();
      
      // 9. 创建初始人口和关系网络
      await this._createInitialPopulation(initialData.population || {});
      
      // 10. 建立家庭关系和社交网络
      await this._establishInitialRelationships();
      
      // 11. 设置初始资源配给
      await this._distributeInitialResources();
      
      // 12. 绑定系统间事件通信
      this._setupSystemInteractions();

      // 13. 德行系统事件绑定
      //this.on('characterActionCompleted', this._onCharacterActionCompleted.bind(this));
      this.on('virtueChanged', (data) => {
        console.log(`德行变化: ${data.characterId} - ${JSON.stringify(data.virtueChanges)}`);
      });
      
      this.gameState.isInitialized = true;
      console.log('✅ 游戏引擎初始化完成 - 所有模块已集成');
      
      return true;
      
    } catch (error) {
      console.error('❌ 游戏引擎初始化失败:', error);
      return false;
    }
  }

  /**
   * 初始化时间系统
   */
  async _initializeTimeSystem() {
    this.systems.time = new TimeSystem();
    
    // 绑定时间事件
    this.systems.time.on('timeAdvanced', this._onTimeAdvanced.bind(this));
    this.systems.time.on('newDay', this._onNewDay.bind(this));
    this.systems.time.on('newSeason', this._onNewSeason.bind(this));
    
    this.performance.systemStatus.time = 'ready';
    console.log('✅ TimeSystem 已初始化');
  }

  /**
   * 初始化资源系统 - 新集成
   */
  async _initializeResourceSystem() {
    this.systems.resource = new ResourceSystem(this);
    
    // 绑定资源事件
    this.on('resourceAdded', this._onResourceAdded.bind(this));
    this.on('resourceConsumed', this._onResourceConsumed.bind(this));
    this.on('resourceShortage', this._onResourceShortage.bind(this));
    
    this.performance.systemStatus.resource = 'ready';
    console.log('✅ ResourceSystem 已初始化并集成');
  }

  /**
   * 初始化关系系统 - 新集成
   */
  async _initializeRelationshipSystem() {
    // 关系系统是角色级别的，这里准备全局关系管理器
    this.globalRelationships = new Map(); // characterId -> RelationshipSystem
    this.socialNetwork = {
      totalRelationships: 0,
      strongBonds: 0,
      familyUnits: 0,
      conflicts: 0
    };
    
    this.performance.systemStatus.relationship = 'ready';
    console.log('✅ RelationshipSystem 全局管理器已初始化');
  }
  
  /**
  * 初始化德行系统 - 新集成
  */
 async _initializeVirtueSystem() {
   // 全局德行管理器
   this.globalVirtues = new Map(); // characterId -> VirtueSystem
   this.virtueNetworkAnalysis = {
     totalSystems: 0,
     averageVirtueScores: {},
     virtueCompatibilityMatrix: [],
     moralLeaders: [],
     ethicalConflicts: []
   };
   
   this.performance.systemStatus.virtue = 'ready';
   console.log('✅ VirtueSystem 全局管理器已初始化');
  } 

  /**
   * 初始化行为系统
   */
  async _initializeBehaviorSystem() {
    this.systems.behavior = new BehaviorSystem();
    
    this.performance.systemStatus.behavior = 'ready';
    console.log('✅ BehaviorSystem 已初始化');
  }

  /**
   * 初始化记忆系统
   */
  async _initializeMemorySystem() {
    this.systems.memory = new MemorySystem({
      maxMemories: 200,
      baseDecay: 0.02,
      importanceThreshold: 0.1,
      emotionalMultiplier: 1.5,
      poolSize: 100
    });
    
    // 绑定记忆系统事件
    this.on('characterActionCompleted', this._onCharacterActionCompleted.bind(this));
    this.on('globalEvent', this._onGlobalEvent.bind(this));
    
    this.performance.systemStatus.memory = 'ready';
    console.log('✅ MemorySystem 已初始化并集成');
  }

  /**
   * 初始化决策引擎
   */
  async _initializeDecisionEngine() {
    this.systems.decision = new DecisionEngine(
      this.systems.resource, // 传入资源系统
      this.systems.memory    // 传入记忆系统
    );
  
    this.performance.systemStatus.decision = 'ready';
    console.log('✅ DecisionEngine 已初始化并与ResourceSystem、MemorySystem集成');
  }

  /**
 * 初始化位置系统 - 新增方法
 */
  async _initializeLocationSystem() {
    this.systems.location = new LocationSystem();
    this.locationMovementManager = new LocationMovementManager(this.systems.location, this);
  
    this.characterGenerator = new CharacterGenerator(this);

    this.performance.systemStatus.location = 'ready';
    console.log('✅ LocationSystem 和 LocationMovementManager 已初始化');
  }

  /**
   * 创建初始人口
   */
  async _createInitialPopulation(populationConfig = {}) {
    const {
      families = 4,
      averageFamilySize = 5,
      ageDistribution = 'natural'
    } = populationConfig;
    
    console.log(`👥 创建初始人口：${families}个家庭，平均${averageFamilySize}人/家庭`);
    
    for (let i = 0; i < families; i++) {
      const family = await this._createFamily(i, averageFamilySize);
      this.characterGroups.founders.push(...family);
      
      // 为每个家庭成员创建关系系统
      for (const character of family) {
        const relationshipSystem = new RelationshipSystem(character.id);
        this.globalRelationships.set(character.id, relationshipSystem);
        character.relationshipSystem = relationshipSystem;
      }
    }
    
    this.gameState.totalPopulation = this.characterGroups.founders.length;
    console.log(`✅ 初始人口创建完成：${this.gameState.totalPopulation}人`);
  }

  /**
   * 创建家庭
   */
  async _createFamily(familyIndex, size) {
    const family = [];
    const familyName = `${['王', '李', '张', '刘', '陈', '杨', '赵', '黄'][familyIndex] || '氏'}`;
    
    // 创建家长（30-50岁）
    const father = this._createCharacter({
      age: Utils.Math.randomInt(30, 50),
      gender: '男',
      role: 'family_head',
      familyName: familyName,
      name: `${familyName}${['大郎', '二郎', '三郎'][familyIndex % 3]}`
    });
    
    const mother = this._createCharacter({
      age: Utils.Math.randomInt(28, 45),
      gender: '女',
      role: 'spouse',
      familyName: familyName,
      name: `${familyName}氏`
    });
    
    family.push(father, mother);
    
    // 创建子女和其他家庭成员
    const remainingMembers = size - 2;
    for (let i = 0; i < remainingMembers; i++) {
      let character;
      
      if (Math.random() < 0.7 && i < 3) { // 70%概率是子女
        character = this._createCharacter({
          age: Utils.Math.randomInt(5, 25),
          gender: Math.random() < 0.5 ? '男' : '女',
          role: 'child',
          familyName: familyName,
          name: `${familyName}${i < 2 ? ['小郎', '小娘'][Math.floor(Math.random() * 2)] : '幼子'}`
        });
      } else { // 其他亲属
        character = this._createCharacter({
          age: Utils.Math.randomInt(15, 70),
          gender: Math.random() < 0.5 ? '男' : '女',
          role: 'relative',
          familyName: familyName,
          name: `${familyName}${['叔', '婶', '兄', '嫂'][Math.floor(Math.random() * 4)]}`
        });
      }
      
      family.push(character);
    }
    
    console.log(`👨‍👩‍👧‍👦 创建家庭 ${familyName}：${family.length}人`);
    return family;
  }

  /**
   * 创建角色
   */
  _createCharacter(config) {
    if (this.characterGenerator && !config.name) {
      const generatedCharacter = this.characterGenerator.generateRandomCharacter({
        age: config.age,
        gender: config.gender,
        origin: 'founder',
        familyName: config.familyName,
        role: config.role
      });
    
      // 使用生成的角色，但保留传入的配置
      config = {
        ...generatedCharacter,
        ...config,  // 保留原始配置覆盖
        id: Utils.String.generateId()
      };
    }

    const character = new Character({
      id: config.id || Utils.String.generateId(),
      name: config.name,
      age: config.age,
      gender: config.gender,
      familyName: config.familyName,
      role: config.role
    });

    // 🔥 确保角色有完整的显示数据
    character.currentLocation = config.location || '住宅区';
    character.currentActivity = null;
    character.isAlive = true;
    character.moduleSource = '游戏引擎';
    character.lastActive = Date.now();
    
    // 确保有基础状态
    if (!character.physicalState) {
        character.physicalState = {
            health: 80 + Math.random() * 20,
            energy: 60 + Math.random() * 30,
            hunger: 50 + Math.random() * 30
        };
    }
    
    if (!character.emotionalState) {
        character.emotionalState = {
            mood: Math.random() * 60 - 30,
            stress: Math.random() * 40
        };
    }

    // 为角色添加初始记忆
    if (this.systems.memory) {
      this.systems.memory.addMemory(
        character.id,
        {
          type: 'life_event',
          action: '到达坞堡',
          location: '山谷入口',
          description: `${character.name}作为流民到达了这个安宁的山谷`,
          isSignificant: true
        },
        0.9, // 高重要性
        0.3, // 轻微正面情感
        {
          gameTime: this.systems.time.gameTime.totalSeconds,
        season: this.gameState.currentSeason,
        isFoundingMemory: true
       }
      );
    }
  
    this.characters.set(character.id, character);
    return character;
  }

  
  /**
   * 建立初始关系网络 - 新功能
   */
  async _establishInitialRelationships() {
    console.log('💕 建立初始家庭关系网络...');
    
    // 按家庭建立关系
    const families = this._groupCharactersByFamily();
    
    for (const [familyName, members] of families) {
      // 建立家庭内部关系
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const memberA = members[i];
          const memberB = members[j];
          
          // 建立双向家庭关系
          const relSystemA = this.globalRelationships.get(memberA.id);
          const relSystemB = this.globalRelationships.get(memberB.id);
          
          if (relSystemA && relSystemB) {
            relSystemA.establishRelationship(memberB.id, {
              primaryType: 'family',
              familiarity: Utils.Math.randomInt(60, 90),
              affection: Utils.Math.randomInt(50, 80),
              trust: Utils.Math.randomInt(60, 90),
              kinship: Utils.Math.randomInt(70, 95)
            });
            
            relSystemB.establishRelationship(memberA.id, {
              primaryType: 'family',
              familiarity: Utils.Math.randomInt(60, 90),
              affection: Utils.Math.randomInt(50, 80),
              trust: Utils.Math.randomInt(60, 90),
              kinship: Utils.Math.randomInt(70, 95)
            });
          }
        }
      }
      
      this.socialNetwork.familyUnits++;
      console.log(`👨‍👩‍👧‍👦 ${familyName}家庭关系网络已建立`);
    }
    
    // 建立家庭间的初始社交关系
    await this._establishInterfamilyRelationships(families);
    
    this._updateSocialNetworkStats();
    console.log(`✅ 关系网络建立完成：${this.socialNetwork.totalRelationships}个关系`);
  }

  /**
   * 建立家庭间关系
   */
  async _establishInterfamilyRelationships(families) {
    const familyLeaders = [];
    
    for (const [familyName, members] of families) {
      const leader = members.find(m => m.role === 'family_head');
      if (leader) familyLeaders.push(leader);
    }
    
    // 家族首领间建立邻里关系
    for (let i = 0; i < familyLeaders.length; i++) {
      for (let j = i + 1; j < familyLeaders.length; j++) {
        const leaderA = familyLeaders[i];
        const leaderB = familyLeaders[j];
        
        const relSystemA = this.globalRelationships.get(leaderA.id);
        const relSystemB = this.globalRelationships.get(leaderB.id);
        
        if (relSystemA && relSystemB) {
          // 建立邻里关系
          relSystemA.establishRelationship(leaderB.id, {
            primaryType: 'acquaintance',
            familiarity: Utils.Math.randomInt(20, 40),
            affection: Utils.Math.randomInt(40, 70),
            trust: Utils.Math.randomInt(30, 60)
          });
          
          relSystemB.establishRelationship(leaderA.id, {
            primaryType: 'acquaintance',
            familiarity: Utils.Math.randomInt(20, 40),
            affection: Utils.Math.randomInt(40, 70),
            trust: Utils.Math.randomInt(30, 60)
          });
        }
      }
    }
  }

  /**
   * 分配初始资源 - 新功能
   */
  async _distributeInitialResources() {
    console.log('📦 分配初始资源给各家庭...');
    
    const families = this._groupCharactersByFamily();
    const totalFamilies = families.size;
    
    // 按家庭分配基础资源
    for (const [familyName, members] of families) {
      const familySize = members.length;
      
      // 基础食物分配（按人口）
      const foodPerPerson = 12; // 每人12天的食物
      const familyFood = foodPerPerson * familySize;
      
      // 分配给家庭（通过家长管理）
      const familyHead = members.find(m => m.role === 'family_head') || members[0];
      familyHead.resources = {
        food: familyFood,
        water: familySize * 8,
        cloth: familySize * 3,
        tools: Math.ceil(familySize / 2)
      };
      
      console.log(`👨‍👩‍👧‍👦 ${familyName}家庭（${familySize}人）获得资源：食物${familyFood}，水${familySize * 8}`);
    }
    
    console.log('✅ 初始资源分配完成');
  }

  /**
   * 设置系统间交互 - 新功能
   */
  _setupSystemInteractions() {
    // 时间系统 -> 其他系统
    this.systems.time.on('timeAdvanced', (timeData) => {
      this.gameState.currentTime = timeData.totalSeconds;
      
      // 更新资源系统
      if (this.systems.resource) {
        this.systems.resource.simulateDecay(timeData.deltaTime);
      }
      
      // 更新所有角色的关系系统
      for (const [characterId, relationshipSystem] of this.globalRelationships) {
        relationshipSystem.update(timeData.deltaTime);
      }
    });
    
    // 资源系统 -> 统计系统
    this.on('resourceShortage', (data) => {
      this.statistics.resourceShortages++;
      this._triggerEmergencyResourceAllocation(data);
    });
    
    // 关系系统 -> 统计系统
    this.on('relationshipEvent', (data) => {
      this.statistics.relationshipEvents++;
    });
    
    console.log('🔗 系统间交互设置完成');
  }

  // ==================== 游戏运行控制 ====================

  /**
   * 启动游戏
   */
  start() {
    if (!this.gameState.isInitialized) {
      console.error('❌ 游戏引擎未初始化，无法启动');
      return false;
    }
    
    this.gameState.isRunning = true;
    this.systems.time.start();
    this._startGameLoop();
    
    console.log('▶️ 游戏已启动');
    this.emit('gameStarted', { timestamp: Date.now() });
    return true;
  }

  /**
   * 暂停游戏
   */
  pause() {
    if (!this.gameState.isRunning) return;
    
    this.gameState.isPaused = true;
    this.systems.time.pause();
    
    console.log('⏸️ 游戏已暂停');
    this.emit('gamePaused', { timestamp: Date.now() });
  }

  /**
   * 恢复游戏
   */
  resume() {
    if (!this.gameState.isPaused) return;
    
    this.gameState.isPaused = false;
    this.systems.time.resume();
    
    console.log('▶️ 游戏已恢复');
    this.emit('gameResumed', { timestamp: Date.now() });
  }

  /**
   * 停止游戏
   */
  stop() {
    if (!this.gameState.isRunning) return;
    
    this.gameState.isRunning = false;
    this.gameState.isPaused = false;
    this.systems.time.stop();
    
    console.log('⏹️ 游戏已停止');
    this.emit('gameStopped', { timestamp: Date.now() });
  }

  // ==================== 游戏主循环 ====================

  /**
   * 启动游戏主循环
   */
  _startGameLoop() {
    let lastTime = performance.now();
    
    const gameLoop = (currentTime) => {
      if (!this.gameState.isRunning) return;
      
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      // 性能监控
      const updateStart = performance.now();
      
      // 更新游戏逻辑
      if (!this.gameState.isPaused) {
        this._updateGame(deltaTime);
      }
      
      // 更新性能统计
      this.performance.updateTime = performance.now() - updateStart;
      this.performance.frameTime = deltaTime;
      this.performance.fps = Math.round(1000 / deltaTime);
      this.performance.updateCount++;
      
      // 继续下一帧
      requestAnimationFrame(gameLoop);
    };
    
    requestAnimationFrame(gameLoop);
  }

  /**
   * 更新游戏逻辑
   */
  _updateGame(deltaTime) {
    // 处理事件队列
    this._processEventQueue();
    
    // 更新所有角色
    this._updateCharacters(deltaTime);
    
    // 处理角色决策和行为
    this._processCharacterActions();
    
    // 🆕 更新德行系统
    this._updateVirtueSystem(deltaTime);
    
    // 🆕 在这里添加位置系统更新
    this._updateLocationSystem(deltaTime);

    // 更新坞堡状态
    this._updateFortressState();
    
    // 更新社交网络统计
    this._updateSocialNetworkStats();
    
    // 检查并触发随机事件
    this._checkRandomEvents();
    
    // 清理和优化
    this._performCleanup();
  }

  // ==================== 事件处理 ====================

  /**
   * 时间推进事件处理
   */
  _onTimeAdvanced(timeData) {
    this.gameState.currentTime = timeData.totalSeconds;
    this.statistics.totalGameDays = timeData.totalDays;
    
    // 更新系统状态
    for (const systemName of Object.keys(this.systems)) {
      if (this.systems[systemName]) {
        this.performance.systemStatus[systemName] = 'running';
      }
    }
  }

  /**
   * 新一天事件处理
   */
  _onNewDay(timeData) {
    console.log(`🌅 新的一天：第${Math.floor(timeData.totalDays)}天`);
    
    // 每日资源消耗
    this._processDailyResourceConsumption();
    
    // 每日关系维护
    this._processDailyRelationshipMaintenance();

    // 每日记忆处理 
    if (this.systems.memory) {
      this.systems.memory.processBatchMemoryDecay(1); // 处理1天的记忆衰减
      console.log('🧠 已处理每日记忆衰减');
    }
      
    this.emit('newDay', timeData);
  }

  /**
   * 新季节事件处理
   */
  _onNewSeason(season) {
    console.log(`🌸 季节变更：${season}`);
    this.gameState.currentSeason = season;
    
    // 季节性资源调整
    if (this.systems.resource) {
      this.systems.resource.applySeasonalEffects(season);
    }
    
    this.emit('newSeason', season);
  }

  /**
   * 资源添加事件处理
   */
  _onResourceAdded(data) {
    console.log(`📦 资源增加：${data.type} +${data.amount}`);
  }

  /**
   * 资源消耗事件处理
   */
  _onResourceConsumed(data) {
    console.log(`📦 资源消耗：${data.type} -${data.amount} (${data.purpose})`);
  }

  /**
   * 资源短缺事件处理
   */
  _onResourceShortage(data) {
    console.warn(`🚨 资源短缺警报：${data.name} 当前${data.current}，警戒线${data.threshold}`);
    
    // 触发紧急资源分配
    this._triggerEmergencyResourceAllocation(data);
  }

  // ==================== 工具方法 ====================

  /**
   * 按家庭分组角色
   */
  _groupCharactersByFamily() {
    const families = new Map();
    
    for (const character of this.characters.values()) {
      const familyName = character.familyName || '无名氏';
      if (!families.has(familyName)) {
        families.set(familyName, []);
      }
      families.get(familyName).push(character);
    }
    
    return families;
  }

  /**
   * 更新社交网络统计
   */
  _updateSocialNetworkStats() {
    let totalRelationships = 0;
    let strongBonds = 0;
    let conflicts = 0;
    
    for (const relationshipSystem of this.globalRelationships.values()) {
      const analysis = relationshipSystem.analyzeSocialNetwork();
      totalRelationships += analysis.totalRelationships;
      strongBonds += analysis.strongRelationships;
    }
    
    this.socialNetwork.totalRelationships = totalRelationships;
    this.socialNetwork.strongBonds = strongBonds;
    this.socialNetwork.conflicts = conflicts;
  }

  /**
   * 紧急资源分配
   */
  _triggerEmergencyResourceAllocation(shortageData) {
    console.log(`🚨 触发紧急资源分配：${shortageData.name}`);
    
    // 简单的紧急分配逻辑
    const availableAmount = this.systems.resource.getResourceAmount(shortageData.type);
    if (availableAmount > 0) {
      // 实施配给制
      console.log(`📋 实施${shortageData.name}配给制`);
    }
  }

  /**
   * 每日资源消耗处理
   */
  _processDailyResourceConsumption() {
    const population = this.gameState.totalPopulation;
    
    // 基础消耗计算
    const dailyFoodConsumption = population * 2; // 每人每天2单位食物
    const dailyWaterConsumption = population * 1.5; // 每人每天1.5单位水
    
    // 执行消耗
    this.systems.resource.consumeResource('food', dailyFoodConsumption, '每日食物消耗');
    this.systems.resource.consumeResource('water', dailyWaterConsumption, '每日饮水消耗');
  }

  /**
   * 每日关系维护处理
   */
  _processDailyRelationshipMaintenance() {
    // 关系自然衰减已在relationshipSystem.update中处理
    // 这里处理一些特殊的每日关系事件
  }

  /**
   * 处理事件队列
   */
  _processEventQueue() {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      this._handleEvent(event);
    }
  }

  /**
   * 更新所有角色
   */
  _updateCharacters(deltaTime) {
    const timeData = this.systems.time.gameTime.getTimeComponents();
    const environment = {
      season: this.gameState.currentSeason,
      weather: this.gameState.weatherType,
      timeOfDay: this.systems.time.gameTime.getCurrentTimeOfDay(),
      currentTime: timeData.totalSeconds
    };
    
    for (const character of this.characters.values()) {
      if (character.isAlive) {
        character.update(deltaTime, environment);
      }
    }
  }

  /**
   * 处理角色决策和行为
   */
  _processCharacterActions() {
    const timeData = this.systems.time.gameTime.getTimeComponents();
    const context = {
      currentTime: timeData.totalSeconds,
      timeOfDay: this.systems.time.gameTime.getCurrentTimeOfDay(),
      season: this.gameState.currentSeason,
      weather: { type: this.gameState.weatherType },
      locationPopulation: this._getLocationPopulation(),
      resourceSystem: this.systems.resource
    };
    
    // 为每个活跃角色进行决策
    for (const character of this.characters.values()) {
      if (!character.isAlive || character.currentBehavior) continue;
      
      try {
        // 使用决策引擎选择行为
        const decision = this.systems.decision.makeDecision(character, context);
        
        if (decision && decision.action) {
          // 执行选中的行为
          const behaviorResult = this.systems.behavior.startBehavior(
            decision.action,
            { ...context, character }
          );
          
          if (behaviorResult.success) {
            character.currentBehavior = decision.action;
            if (this.locationMovementManager) {
              this.locationMovementManager.updateLocationByAction(character, decision.action);
            }
            console.log(`👤 ${character.name} 开始执行：${decision.action}`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ 角色${character.name}决策失败:`, error.message);
      }
    }
  }

  /**
   * 更新坞堡状态
   */
  _updateFortressState() {
    // 基于人口和资源计算繁荣度
    const resourceStats = this.systems.resource.getStatistics();
    const population = this.gameState.totalPopulation;
    
    // 繁荣度计算（基于资源和人口）
    let prosperityScore = 50;
    if (resourceStats.shortages === 0) prosperityScore += 20;
    if (population > 15) prosperityScore += 10;
    if (this.socialNetwork.strongBonds > population * 0.3) prosperityScore += 15;
    
    this.fortressState.prosperityLevel = Math.min(5, Math.floor(prosperityScore / 20));
    
    // 更新人口容量
    this.fortressState.populationCapacity = Math.max(
      50, 
      this.fortressState.foundationLevel * 15 + this.fortressState.defenseLevel * 10
    );
  }

  /**
   * 检查随机事件
   */
  _checkRandomEvents() {
    // 简单的随机事件系统
    if (Math.random() < 0.001) { // 0.1%的概率每帧
      this._triggerRandomEvent();
    }
  }

  /**
   * 触发随机事件
   */
  _triggerRandomEvent() {
    const events = [
      {
        name: '商旅来访',
        description: '有商旅队伍路过坞堡，带来了珍贵物资',
        effects: () => {
          this.systems.resource.addResource('food', 10, 80, '商旅贸易');
          this.systems.resource.addResource('cloth', 5, 90, '商旅贸易');
        }
      },
      {
        name: '野兽袭击',
        description: '野兽袭击了坞堡，造成了一些损失',
        effects: () => {
          this.systems.resource.consumeResource('food', 5, '野兽袭击损失');
        }
      },
      {
        name: '丰收季节',
        description: '今年是个丰收年，食物产量大增',
        effects: () => {
          this.systems.resource.addResource('food', 20, 85, '丰收收获');
        }
      },
      {
        name: '流民来投',
        description: '有流民听闻坞堡安全，前来投靠',
        effects: () => {
          this.triggerImmigrantWave();
        }
      }
    ];
        
    const event = Utils.Array.randomChoice(events);
    if (event) {
      console.log(`🎲 随机事件：${event.name} - ${event.description}`);
      event.effects();
      this.statistics.majorEvents++;
      
      this.fortressState.historicalEvents.push({
        name: event.name,
        description: event.description,
        timestamp: this.gameState.currentTime,
        gameDay: Math.floor(this.statistics.totalGameDays)
      });
    }
  }

  /**
   * 获取地点人口分布
   */
  _getLocationPopulation() {
    const distribution = {
      '住宅区': 0,
      '农田': 0,
      '工坊': 0,
      '市集': 0,
      '祠堂': 0
    };
    
    for (const character of this.characters.values()) {
      if (character.currentLocation && distribution.hasOwnProperty(character.currentLocation)) {
        distribution[character.currentLocation]++;
      } else {
        distribution['住宅区']++; // 默认在住宅区
      }
    }
    
    return distribution;
  }

  /**
   * 清理和优化
   */
  _performCleanup() {
    // 每1000帧执行一次清理
    if (this.performance.updateCount % 1000 === 0) {
      // 清理资源系统过期数据
      if (this.systems.resource) {
        this.systems.resource.cleanup();
      }
      
      // 清理关系系统过期数据
      for (const relationshipSystem of this.globalRelationships.values()) {
        relationshipSystem.cleanupInactiveRelationships();
      }
      
      // 清理历史事件（保留最近50个）
      if (this.fortressState.historicalEvents.length > 50) {
        this.fortressState.historicalEvents = this.fortressState.historicalEvents.slice(-50);
      }
      
      console.log('🧹 执行了系统清理和优化');
    }
  }

  // ==================== 简化事件系统 ====================

  /**
   * 绑定事件监听器
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件${event}处理器错误:`, error);
        }
      }
    }
  }

  /**
   * 处理事件
   */
  _handleEvent(event) {
    this.emit(event.type, event.data);
  }

  // ==================== 状态管理 ====================

  /**
   * 获取游戏状态
   */
  getGameState() {
    return {
      // 基础游戏状态
      isInitialized: this.gameState.isInitialized,
      isRunning: this.gameState.isRunning,
      isPaused: this.gameState.isPaused,
      currentPhase: this.gameState.currentPhase,
      totalPopulation: this.gameState.totalPopulation,
      currentTime: this.gameState.currentTime,
      currentSeason: this.gameState.currentSeason,
      weatherType: this.gameState.weatherType,
      virtueStats: this.gameState.virtueStats,
      
      // 性能数据
      performance: this.performance,
      
      // 系统状态
      systemStatus: {
        time: this.systems.time ? {
          currentTime: this.systems.time.gameTime.totalSeconds,
          isRunning: this.systems.time.isRunning,
          timeScale: this.systems.time.gameTime.timeScale
        } : null,
        
        resource: this.systems.resource ? {
          resourceCount: this.systems.resource.resources.size,
          shortageAlerts: this.systems.resource.shortageAlerts.size,
          recentLogs: this.systems.resource.consumptionLog.slice(-5)
        } : null,
        
        // 🆕 添加位置系统状态
        location: this.systems.location ? {
          totalLocations: this.systems.location.locations.size,
          locationStats: this.systems.location.getStatistics(),
          movementStats: this.locationMovementManager ? this.locationMovementManager.getMovementStats() : null
        } : null,

        // 🆕 添加记忆系统状态
        memory: this.systems.memory ? {
          totalCharacters: this.systems.memory.memories.size,
          totalMemories: this.systems.memory.stats.totalMemories,
          averageImportance: this.systems.memory.stats.averageImportance.toFixed(2),
          globalMemories: this.systems.memory.globalMemories.length,
          memoryRecalls: this.systems.memory.stats.memoryRecalls
        } : null,
        
        relationships: {
          totalSystems: this.globalRelationships.size,
          networkStats: this.socialNetwork
        }
      },
      
      recentEvents: this.fortressState.historicalEvents.slice(-5)
    };
  }

  /**
   * 获取角色列表
   */
  getCharacters() {
    return Array.from(this.characters.values()).map(character => ({
      id: character.id,
      name: character.name,
      age: character.age,
      gender: character.gender,
      familyName: character.familyName,
      role: character.role,
      isAlive: character.isAlive,
      currentBehavior: character.currentBehavior,
      currentLocation: character.currentLocation || '住宅区'
    }));
  }

  /**
   * 获取关系网络状态
   */
  getRelationshipNetworkState() {
    const networkData = {
      totalCharacters: this.characters.size,
      totalRelationships: this.socialNetwork.totalRelationships,
      strongBonds: this.socialNetwork.strongBonds,
      familyUnits: this.socialNetwork.familyUnits,
      conflicts: this.socialNetwork.conflicts,
      characterRelationships: {}
    };
    
    // 获取每个角色的关系概要
    for (const [characterId, relationshipSystem] of this.globalRelationships) {
      const analysis = relationshipSystem.analyzeSocialNetwork();
      const character = this.characters.get(characterId);
      
      networkData.characterRelationships[characterId] = {
        name: character ? character.name : '未知',
        totalRelationships: analysis.totalRelationships,
        strongRelationships: analysis.strongRelationships,
        networkDensity: analysis.networkDensity,
        familyMembers: relationshipSystem.getFamilyMembers().length,
        friends: relationshipSystem.getFriends().length
      };
    }
    
    return networkData;
  }

  /**
   * 获取系统健康状态
   */
  getSystemHealth() {
    return {
      systems: this.performance.systemStatus,
      isInitialized: this.gameState.isInitialized,
      isRunning: this.gameState.isRunning,
      isPaused: this.gameState.isPaused,
      fps: this.performance.fps,
      updateTime: this.performance.updateTime,
      memoryUsage: this.performance.memoryUsage,
      errors: this.debug.history.filter(entry => entry.level === 'error').length
    };
  }

  // ==================== 调试和开发工具 ====================

  /**
   * 添加调试日志
   */
  _debugLog(level, message, data = null) {
    if (this.debug.enabled) {
      const logEntry = {
        timestamp: Date.now(),
        level: level,
        message: message,
        data: data
      };
      
      this.debug.history.push(logEntry);
      
      // 保持历史记录在合理大小
      if (this.debug.history.length > 1000) {
        this.debug.history = this.debug.history.slice(-500);
      }
      
      // 输出到控制台
      if (level === 'error') {
        console.error(`[${level.toUpperCase()}] ${message}`, data);
      } else if (level === 'warn') {
        console.warn(`[${level.toUpperCase()}] ${message}`, data);
      } else {
        console.log(`[${level.toUpperCase()}] ${message}`, data);
      }
    }
  }

  /**
   * 触发测试事件
   */
  triggerTestEvent(eventType) {
    switch (eventType) {
      case 'resource_bonus':
        this.systems.resource.addResource('food', 50, 90, '测试奖励');
        this.systems.resource.addResource('tools', 5, 85, '测试奖励');
        break;
        
      case 'population_growth':
        this._addNewResident();
        break;
      
      case 'immigrant_wave':
        this.triggerImmigrantWave();
        break;  

      case 'relationship_event':
        this._triggerRelationshipEvent();
        break;
      
      case 'virtue_test':
        this.triggerVirtueTestEvent('virtue_development');
        break;
          
      case 'virtue_challenge':
        this.triggerVirtueTestEvent('virtue_challenge');
        break;
          
      case 'virtue_interaction':
        this.triggerVirtueTestEvent('virtue_interaction');
        break;        
      
      case 'random_event':
        this._triggerRandomEvent();
        break;
        
      default:
        console.log('未知测试事件类型:', eventType);
    }
  }

  /**
   * 添加新居民（测试用）
   */
  _addNewResident() {
    const newResident = this.characterGenerator.generateRandomCharacter({
      origin: 'immigrant',
      ageCategory: 'adult',
      location: '住宅区'
    });
    
  /**
   * 触发移民潮事件 - 新增方法
   */
  triggerImmigrantWave() 
  {
    if (!this.characterGenerator) {
      console.warn('⚠️ 角色生成器未初始化');
      return;
    }
  
    const immigrants = this.characterGenerator.generateImmigrantWave(
      Utils.Math.randomInt(1, 3), // 1-3个新移民
      { ageCategory: 'adult' }
    );
  
    immigrants.forEach(immigrant => {
      // 为每个移民设置完整的系统集成
      const relationshipSystem = new RelationshipSystem(immigrant.id);
      this.globalRelationships.set(immigrant.id, relationshipSystem);
      immigrant.relationshipSystem = relationshipSystem;

      const virtueSystem = new VirtueSystem(immigrant.id, {
        personalityType: immigrant.personalityType || 'balanced',
        baseGrowthRate: 1.0
      });
      this.globalVirtues.set(immigrant.id, virtueSystem);
      immigrant.virtueSystem = virtueSystem;

      this.characterGroups.newcomers.push(immigrant);
    });
  
    this.gameState.totalPopulation += immigrants.length;
    this.virtueNetworkAnalysis.totalSystems += immigrants.length;
  
    console.log(`🚶 移民潮：${immigrants.length}名新移民加入坞堡`);
  }
    
    // 创建关系系统
    const relationshipSystem = new RelationshipSystem(newResident.id);
    this.globalRelationships.set(newResident.id, relationshipSystem);
    newResident.relationshipSystem = relationshipSystem;
 
    // 🆕 初始化角色德行系统
    const virtueConfig = {
      personalityType: newResident.personalityType || 'balanced',
      baseGrowthRate: 1.0,
      experienceBonus: 0.2
     };

    const virtueSystem = new VirtueSystem(newResident.id, virtueConfig);
    this.globalVirtues.set(newResident.id, virtueSystem);

   // 将德行系统引用添加到角色对象
    newResident.virtueSystem = virtueSystem;

   // 更新全局德行统计
    this.virtueNetworkAnalysis.totalSystems++;

    console.log(`✅ 角色 ${newResident.name} 的德行系统已创建`);

    this.characterGroups.newcomers.push(newResident);
    this.gameState.totalPopulation++;
    
    console.log(`👤 新居民加入坞堡：${newResident.name}`);
  }

  /**
   * 触发关系事件（测试用）
   */
  _triggerRelationshipEvent() {
    const characters = Array.from(this.characters.values());
    if (characters.length < 2) return;
    
    const characterA = Utils.Array.randomChoice(characters);
    const characterB = Utils.Array.randomChoice(characters.filter(c => c.id !== characterA.id));
    
    const relationshipSystemA = this.globalRelationships.get(characterA.id);
    if (relationshipSystemA) {
      const result = relationshipSystemA.processInteraction(
        characterB.id,
        'conversation',
        { location: '市集', mood: 'friendly' }
      );
      
      console.log(`💬 ${characterA.name} 与 ${characterB.name} 进行了交谈`);
      this.statistics.relationshipEvents++;
    }
  }
/**
 * 更新德行系统 - 新增方法
 */
_updateVirtueSystem(deltaTime) {
  if (!this.globalVirtues.size) return;
  
  // 更新所有角色的德行系统
  for (const [characterId, virtueSystem] of this.globalVirtues) {
    const character = this.characters.get(characterId);
    if (!character || !character.isAlive) continue;
    
    // 基于角色最近行为更新德行
    if (character.recentActions && character.recentActions.length > 0) {
      const recentAction = character.recentActions[character.recentActions.length - 1];
      virtueSystem.processActionInfluence(recentAction.type, recentAction.context);
    }
    
    // 德行自然发展
    virtueSystem.naturalDevelopment(deltaTime);
  }
  
  // 定期更新德行网络分析
  if (this.systems.time.gameTime.totalSeconds % 3600 === 0) { // 每游戏小时
    this._updateVirtueNetworkAnalysis();
  }
}

/**
 * 更新德行网络分析 - 新增方法
 */
_updateVirtueNetworkAnalysis() {
  const allVirtueSystems = Array.from(this.globalVirtues.values());
  
  if (allVirtueSystems.length === 0) return;
  
  // 计算平均德行分数
  const virtueAverages = {};
  const virtueNames = ['仁', '义', '礼', '智', '信', '温', '良', '恭', '俭', '让'];
  
  virtueNames.forEach(virtue => {
    const scores = allVirtueSystems.map(vs => vs.getVirtueScore(virtue));
    virtueAverages[virtue] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  });
  
  this.virtueNetworkAnalysis.averageVirtueScores = virtueAverages;
  
  // 识别道德领袖（德行分数最高的角色）
  const characterVirtueScores = [];
  for (const [characterId, virtueSystem] of this.globalVirtues) {
    const character = this.characters.get(characterId);
    if (character && character.isAlive) {
      const totalScore = virtueSystem.getTotalVirtueScore();
      characterVirtueScores.push({
        characterId,
        name: character.name,
        totalScore,
        dominantVirtues: virtueSystem.getDominantVirtues().slice(0, 3)
      });
    }
  }
  
  // 按德行分数排序
  characterVirtueScores.sort((a, b) => b.totalScore - a.totalScore);
  
  this.virtueNetworkAnalysis.moralLeaders = characterVirtueScores.slice(0, 5);
  this.gameState.virtueStats.characterVirtueRankings = characterVirtueScores;
  
  // 更新全局德行统计
  this.gameState.virtueStats.totalVirtueSystems = allVirtueSystems.length;
  this.gameState.virtueStats.averageVirtueLevel = 
    characterVirtueScores.reduce((sum, char) => sum + char.totalScore, 0) / characterVirtueScores.length;
  this.gameState.virtueStats.dominantVirtues = 
    Object.entries(virtueAverages)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([virtue]) => virtue);
}

/**
 * 获取德行网络状态 - 新增方法
 */
getVirtueNetworkState() {
  return {
    totalSystems: this.virtueNetworkAnalysis.totalSystems,
    averageVirtueScores: this.virtueNetworkAnalysis.averageVirtueScores,
    moralLeaders: this.virtueNetworkAnalysis.moralLeaders,
    globalStats: this.gameState.virtueStats,
    systemsDetail: Array.from(this.globalVirtues.entries()).map(([characterId, virtueSystem]) => {
      const character = this.characters.get(characterId);
      return {
        characterId,
        characterName: character ? character.name : 'Unknown',
        virtueSnapshot: virtueSystem.getVirtueSnapshot(),
        dominantVirtues: virtueSystem.getDominantVirtues().slice(0, 3),
        totalScore: virtueSystem.getTotalVirtueScore()
      };
    })
  };
}

/**
 * 德行系统事件处理器 - 新增方法
 */
_onCharacterActionCompleted(eventData) {
  const { characterId, action, result, context } = eventData;
  const virtueSystem = this.globalVirtues.get(characterId);
  
  // 添加记忆系统处理
  if (this.systems.memory && this.characters.has(characterId)) {
    const character = this.characters.get(characterId);
    
    // 计算记忆重要性
    let importance = 0.3; // 基础重要性
    if (result.success) importance += result.success * 0.3;
    if (result.skillGained) importance += 0.2;
    if (result.resourcesGained || result.resourcesLost) importance += 0.1;
    
    // 计算情感影响
    let emotionalImpact = 0;
    if (result.success !== undefined) {
      emotionalImpact = (result.success - 0.5) * 2; // -1 到 1
    }
    if (result.danger) emotionalImpact -= 0.3;
    if (result.socialGain) emotionalImpact += 0.2;
    
    // 添加记忆
    this.systems.memory.addMemory(
      characterId,
      {
        type: 'action',
        action: action,
        location: character.currentLocation,
        success: result.success || 0.5,
        description: `${character.name}在${character.currentLocation}进行了${action}`,
        skill: result.skillUsed,
        isRisky: result.danger || false,
        isWise: result.wisdom || false
      },
      Math.min(1, importance),
      Math.max(-1, Math.min(1, emotionalImpact)),
      {
        gameTime: this.systems.time.gameTime.totalSeconds,
        season: this.gameState.currentSeason,
        weather: this.gameState.weatherType,
        timeOfDay: this.systems.time.gameTime.getCurrentTimeOfDay()
      }
    );
  }

  if (virtueSystem) {
    // 基于行为结果更新德行
    virtueSystem.processActionInfluence(action, {
      result,
      context,
      timestamp: this.systems.time.gameTime.totalSeconds
    });
    
    // 触发德行变化事件
    this.emit('virtueChanged', {
      characterId,
      action,
      virtueChanges: virtueSystem.getRecentChanges()
    });
  }
}

/**
 * 触发德行测试事件 - 新增方法
 */
triggerVirtueTestEvent(eventType = 'virtue_development') {
  const characters = Array.from(this.characters.values()).filter(c => c.isAlive);
  if (characters.length === 0) return;
  
  const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
  const virtueSystem = this.globalVirtues.get(randomCharacter.id);
  
  if (!virtueSystem) return;
  
  switch (eventType) {
    case 'virtue_development':
      // 模拟德行发展事件
      virtueSystem.processActionInfluence('学习经典', {
        intensity: 2.0,
        context: '认真学习古代经典',
        timestamp: this.systems.time.gameTime.totalSeconds
      });
      console.log(`🌟 ${randomCharacter.name} 通过学习经典提升了德行`);
      break;
      
    case 'virtue_challenge':
      // 模拟德行挑战事件
      virtueSystem.processActionInfluence('面对诱惑', {
        intensity: -1.5,
        context: '面临道德选择的考验',
        timestamp: this.systems.time.gameTime.totalSeconds
      });
      console.log(`⚠️ ${randomCharacter.name} 面临了德行挑战`);
      break;
      
    case 'virtue_interaction':
      // 模拟德行互动事件
      if (characters.length > 1) {
        const otherCharacter = characters.find(c => c.id !== randomCharacter.id);
        const otherVirtueSystem = this.globalVirtues.get(otherCharacter.id);
        
        if (otherVirtueSystem) {
          const compatibility = virtueSystem.calculateCompatibility(otherVirtueSystem);
          console.log(`🤝 ${randomCharacter.name} 与 ${otherCharacter.name} 的德行兼容性: ${compatibility.toFixed(1)}%`);
        }
      }
      break;
  }
  
  // 触发德行变化事件
  this.emit('virtueChanged', {
    characterId: randomCharacter.id,
    eventType,
    virtueSnapshot: virtueSystem.getVirtueSnapshot()
  });
}

/**
 * 更新位置系统 - 新增方法
 */
_updateLocationSystem(deltaTime) {
  if (this.systems.location) {
    this.systems.location.update(deltaTime);
  }
  
  if (this.locationMovementManager) {
    // 每5秒检查一次角色位置
    if (this.performance.updateCount % 120 === 0) { // 假设60fps，120帧=2秒
      this.locationMovementManager.updateAllCharacterLocations();
      
      if (this.debug.enabled) {
        console.log('🔄 执行了位置更新检查');
      }
    }
  }
}

/**
 * 处理全局事件
 */
_onGlobalEvent(eventData) {
  const { event, importance, emotionalImpact, context } = eventData;
  
  if (this.systems.memory) {
    this.systems.memory.addGlobalMemory(
      event,
      importance || 0.7,
      emotionalImpact || 0,
      context || {
        gameTime: this.systems.time.gameTime.totalSeconds,
        season: this.gameState.currentSeason
      }
    );
  }
}
 
  /**
   * 获取详细调试信息
   */
  getDebugInfo() {
    return {
      debug: this.debug,
      systemDetails: {
        time: this.systems.time ? {
          currentTime: this.systems.time.gameTime.totalSeconds,
          isRunning: this.systems.time.isRunning,
          timeScale: this.systems.time.gameTime.timeScale
        } : null,
        
        resource: this.systems.resource ? {
          resourceCount: this.systems.resource.resources.size,
          shortageAlerts: this.systems.resource.shortageAlerts.size,
          recentLogs: this.systems.resource.consumptionLog.slice(-5)
        } : null,
        
        relationships: {
          totalSystems: this.globalRelationships.size,
          networkStats: this.socialNetwork
        }
      },
      recentEvents: this.fortressState.historicalEvents.slice(-5)
    };
  }
}

// ==================== 导出 ====================
export default GameEngineIntegrated;

/**
 * 使用示例：
 * 
 * // 创建并初始化游戏引擎
 * const gameEngine = new GameEngineIntegrated();
 * 
 * // 初始化游戏
 * await gameEngine.initialize({
 *   population: { families: 4, averageFamilySize: 5 }
 * });
 * 
 * // 启动游戏
 * gameEngine.start();
 * 
 * // 获取游戏状态
 * const state = gameEngine.getGameState();
 * console.log('游戏状态:', state);
 * 
 * // 获取角色信息
 * const characters = gameEngine.getCharacters();
 * console.log('角色列表:', characters);
 * 
 * // 获取关系网络
 * const network = gameEngine.getRelationshipNetworkState();
 * console.log('关系网络:', network);
 * 
 * // 触发测试事件
 * gameEngine.triggerTestEvent('resource_bonus');
 * gameEngine.triggerTestEvent('relationship_event');
 */