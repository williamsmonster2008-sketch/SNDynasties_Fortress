/**
 * EventSystem.js - 南北朝坞堡模拟器事件系统
 * 
 * 功能：管理游戏中的各种事件，营造真实的南北朝历史氛围
 * 优先级：⭐⭐⭐⭐ (第四阶段重要模块)
 * 
 * 主要职责：
 * - 生成和管理各类历史事件
 * - 处理事件触发条件和概率
 * - 执行事件效果和后果
 * - 管理事件链和连锁反应
 * - 记录重大历史事件
 * - 提供南北朝时代特色事件
 */

import { DEFAULT_CONFIG } from './gameConfig.js';
import { Utils } from './utils_module.js';

/**
 * 事件基础类
 */
export class GameEvent {
  constructor(id, config) {
    this.id = id;
    this.name = config.name;
    this.description = config.description;
    this.type = config.type; // natural, social, cultural, personal, economic, historical
    this.category = config.category; // disaster, opportunity, neutral
    this.rarity = config.rarity; // common, uncommon, rare, legendary
    this.triggerConditions = config.triggerConditions || [];
    this.effects = config.effects || {};
    this.choices = config.choices || [];
    this.duration = config.duration || 0; // 事件持续时间（天）
    this.cooldown = config.cooldown || 0; // 冷却时间（天）
    this.isRepeatable = config.isRepeatable || false;
    this.historicalContext = config.historicalContext || '';
    this.lastTriggered = null;
    this.timesTriggered = 0;
  }

  /**
   * 检查事件是否可以触发
   * @param {Object} gameState - 游戏状态
   * @returns {boolean} 是否可以触发
   */
  canTrigger(gameState) {
    // 检查冷却时间
    if (this.lastTriggered && 
        gameState.currentDay - this.lastTriggered < this.cooldown) {
      return false;
    }

    // 检查是否可重复
    if (!this.isRepeatable && this.timesTriggered > 0) {
      return false;
    }

    // 检查触发条件
    return this.checkTriggerConditions(gameState);
  }

  /**
   * 检查触发条件
   * @param {Object} gameState - 游戏状态
   * @returns {boolean} 条件是否满足
   */
  checkTriggerConditions(gameState) {
    return this.triggerConditions.every(condition => {
      switch (condition.type) {
        case 'population':
          return this._checkPopulationCondition(condition, gameState);
        case 'resource':
          return this._checkResourceCondition(condition, gameState);
        case 'season':
          return this._checkSeasonCondition(condition, gameState);
        case 'development':
          return this._checkDevelopmentCondition(condition, gameState);
        case 'time':
          return this._checkTimeCondition(condition, gameState);
        case 'random':
          return Math.random() < condition.probability;
        default:
          return true;
      }
    });
  }

  /**
   * 执行事件
   * @param {Object} gameState - 游戏状态
   * @param {Object} gameEngine - 游戏引擎
   * @returns {Object} 事件执行结果
   */
  execute(gameState, gameEngine) {
    this.lastTriggered = gameState.currentDay;
    this.timesTriggered++;

    const result = {
      eventId: this.id,
      eventName: this.name,
      description: this.description,
      category: this.category,
      effects: {},
      choices: this.choices,
      success: true,
      message: '',
      historicalRecord: null
    };

    try {
      // 执行事件效果
      result.effects = this._applyEffects(this.effects, gameState, gameEngine);
      
      // 生成事件消息
      result.message = this._generateEventMessage(result.effects);
      
      // 记录历史事件
      if (this.rarity === 'rare' || this.rarity === 'legendary') {
        result.historicalRecord = this._createHistoricalRecord(gameState);
      }

      console.log(`🎭 触发事件: ${this.name}`);
      
    } catch (error) {
      console.error(`事件执行失败: ${this.name}`, error);
      result.success = false;
      result.message = '事件执行时发生了意外情况';
    }

    return result;
  }

  // 私有方法
  _checkPopulationCondition(condition, gameState) {
    const population = gameState.population?.total || 0;
    switch (condition.operator) {
      case '>': return population > condition.value;
      case '<': return population < condition.value;
      case '>=': return population >= condition.value;
      case '<=': return population <= condition.value;
      case '==': return population === condition.value;
      default: return true;
    }
  }

  _checkResourceCondition(condition, gameState) {
    const resourceAmount = gameState.resources?.[condition.resource]?.amount || 0;
    switch (condition.operator) {
      case '>': return resourceAmount > condition.value;
      case '<': return resourceAmount < condition.value;
      case '>=': return resourceAmount >= condition.value;
      case '<=': return resourceAmount <= condition.value;
      default: return true;
    }
  }

  _checkSeasonCondition(condition, gameState) {
    return condition.seasons.includes(gameState.currentSeason);
  }

  _checkDevelopmentCondition(condition, gameState) {
    const level = gameState.fortress?.[condition.aspect] || 1;
    return level >= condition.minLevel;
  }

  _checkTimeCondition(condition, gameState) {
    const currentDay = gameState.currentDay || 1;
    return currentDay >= condition.afterDay;
  }

  _applyEffects(effects, gameState, gameEngine) {
    const appliedEffects = {};

    // 人口效果
    if (effects.population) {
      appliedEffects.population = this._applyPopulationEffects(effects.population, gameEngine);
    }

    // 资源效果
    if (effects.resources) {
      appliedEffects.resources = this._applyResourceEffects(effects.resources, gameEngine);
    }

    // 坞堡发展效果
    if (effects.fortress) {
      appliedEffects.fortress = this._applyFortressEffects(effects.fortress, gameEngine);
    }

    // 角色效果
    if (effects.characters) {
      appliedEffects.characters = this._applyCharacterEffects(effects.characters, gameEngine);
    }

    return appliedEffects;
  }

  _applyPopulationEffects(populationEffects, gameEngine) {
    const results = {};

    if (populationEffects.death) {
      results.deaths = this._triggerDeaths(populationEffects.death, gameEngine);
    }

    if (populationEffects.immigration) {
      results.immigrants = this._triggerImmigration(populationEffects.immigration, gameEngine);
    }

    if (populationEffects.birth) {
      results.births = this._triggerBirths(populationEffects.birth, gameEngine);
    }

    return results;
  }

  _applyResourceEffects(resourceEffects, gameEngine) {
    const results = {};

    for (const [resource, change] of Object.entries(resourceEffects)) {
      if (gameEngine.systems.resource) {
        const currentAmount = gameEngine.systems.resource.getResourceAmount(resource);
        const changeAmount = typeof change === 'object' ? 
          Utils.Math.randomInt(change.min, change.max) : change;

        if (changeAmount > 0) {
          gameEngine.systems.resource.addResource(resource, changeAmount, 70, this.name);
        } else {
          gameEngine.systems.resource.consumeResource(resource, Math.abs(changeAmount), this.name);
        }

        results[resource] = changeAmount;
      }
    }

    return results;
  }

  _applyFortressEffects(fortressEffects, gameEngine) {
    const results = {};

    for (const [aspect, change] of Object.entries(fortressEffects)) {
      if (gameEngine.fortressState[aspect]) {
        const oldValue = gameEngine.fortressState[aspect];
        gameEngine.fortressState[aspect] = Math.max(1, oldValue + change);
        results[aspect] = gameEngine.fortressState[aspect] - oldValue;
      }
    }

    return results;
  }

  _applyCharacterEffects(characterEffects, gameEngine) {
    const results = [];
    const characters = gameEngine.getAliveCharacters();

    if (characterEffects.all) {
      // 影响所有角色
      for (const character of characters) {
        const result = this._applyCharacterEffect(character, characterEffects.all);
        if (result) results.push(result);
      }
    }

    if (characterEffects.random) {
      // 影响随机角色
      const targetCount = Math.min(characterEffects.random.count || 1, characters.length);
      const targets = Utils.Array.sample(characters, targetCount);
      
      for (const character of targets) {
        const result = this._applyCharacterEffect(character, characterEffects.random.effects);
        if (result) results.push(result);
      }
    }

    return results;
  }

  _applyCharacterEffect(character, effects) {
    const result = { characterId: character.id, characterName: character.name, changes: {} };

    // 健康影响
    if (effects.health) {
      const oldHealth = character.health;
      character.health = Utils.Math.clamp(character.health + effects.health, 0, 100);
      result.changes.health = character.health - oldHealth;
    }

    // 心情影响
    if (effects.mood) {
      const oldMood = character.mood;
      character.mood = Utils.Math.clamp(character.mood + effects.mood, -100, 100);
      result.changes.mood = character.mood - oldMood;
    }

    // 技能影响
    if (effects.skills) {
      result.changes.skills = {};
      for (const [skill, change] of Object.entries(effects.skills)) {
        const oldLevel = character.skills?.[skill] || 0;
        if (!character.skills) character.skills = {};
        character.skills[skill] = Utils.Math.clamp(oldLevel + change, 0, 100);
        result.changes.skills[skill] = character.skills[skill] - oldLevel;
      }
    }

    // 德行影响
    if (effects.virtues) {
      result.changes.virtues = {};
      for (const [virtue, change] of Object.entries(effects.virtues)) {
        const oldLevel = character.virtues?.[virtue] || 50;
        if (!character.virtues) character.virtues = {};
        character.virtues[virtue] = Utils.Math.clamp(oldLevel + change, 0, 100);
        result.changes.virtues[virtue] = character.virtues[virtue] - oldLevel;
      }
    }

    return Object.keys(result.changes).length > 0 ? result : null;
  }

  _triggerDeaths(deathConfig, gameEngine) {
    const characters = gameEngine.getAliveCharacters();
    const deaths = [];

    if (deathConfig.count) {
      // 指定死亡人数
      const deathCount = Math.min(deathConfig.count, characters.length);
      const victims = Utils.Array.sample(characters, deathCount);
      
      for (const victim of victims) {
        gameEngine._emitEvent('characterDied', victim);
        deaths.push(victim.name);
      }
    } else if (deathConfig.probability) {
      // 按概率死亡
      for (const character of characters) {
        if (Math.random() < deathConfig.probability) {
          gameEngine._emitEvent('characterDied', character);
          deaths.push(character.name);
        }
      }
    }

    return deaths;
  }

  _triggerImmigration(immigrationConfig, gameEngine) {
    const immigrants = [];
    const count = immigrationConfig.count || Utils.Math.randomInt(1, 3);

    for (let i = 0; i < count; i++) {
      const immigrant = gameEngine._createCharacter({
        age: Utils.Math.randomInt(20, 40),
        gender: Math.random() < 0.5 ? '男' : '女',
        role: 'immigrant'
      });
      
      gameEngine._emitEvent('characterImmigrated', immigrant);
      immigrants.push(immigrant.name);
    }

    return immigrants;
  }

  _triggerBirths(birthConfig, gameEngine) {
    const births = [];
    const couples = gameEngine._findMarriedCouples();
    
    for (const couple of couples) {
      if (Math.random() < (birthConfig.probability || 0.1)) {
        const baby = gameEngine._createBaby(couple);
        gameEngine._emitEvent('characterBorn', baby);
        births.push(baby.name);
      }
    }

    return births;
  }

  _generateEventMessage(effects) {
    let message = this.description;

    // 根据效果生成更详细的消息
    if (effects.resources) {
      const resourceChanges = Object.entries(effects.resources)
        .map(([resource, change]) => {
          const resourceName = this._getResourceName(resource);
          return change > 0 ? `${resourceName}增加${change}` : `${resourceName}减少${Math.abs(change)}`;
        })
        .join('，');
      
      if (resourceChanges) {
        message += `\n资源变化：${resourceChanges}`;
      }
    }

    return message;
  }

  _getResourceName(resourceType) {
    const names = {
      food: '粮食', water: '水源', wood: '木材', stone: '石料',
      cloth: '布匹', metal: '金属', medicine: '草药', tools: '工具'
    };
    return names[resourceType] || resourceType;
  }

  _createHistoricalRecord(gameState) {
    return {
      eventId: this.id,
      eventName: this.name,
      description: this.description,
      gameDay: gameState.currentDay,
      gameYear: gameState.timeInfo?.year || 1,
      season: gameState.currentSeason,
      population: gameState.population?.total || 0,
      historicalContext: this.historicalContext,
      timestamp: Date.now()
    };
  }
}

/**
 * 事件系统主类
 */
export class EventSystem {
  constructor(gameEngine = null) {
    this.gameEngine = gameEngine;
    
    // 事件注册表
    this.events = new Map();
    this.eventsByType = new Map();
    this.eventsByRarity = new Map();
    
    // 事件调度
    this.scheduledEvents = [];
    this.activeEvents = [];
    this.eventHistory = [];
    
    // 系统配置
    this.config = {
      baseEventChance: 0.1, // 每日基础事件概率
      rarityMultipliers: {
        common: 1.0,
        uncommon: 0.3,
        rare: 0.1,
        legendary: 0.01
      },
      maxActiveEvents: 5,
      historyLimit: 100
    };

    // 统计数据
    this.stats = {
      totalEvents: 0,
      eventsByType: {},
      eventsByRarity: {},
      averageEventsPerDay: 0
    };

    this.initialize();
  }

  /**
   * 初始化事件系统
   */
  initialize() {
    console.log('🎭 事件系统初始化中...');
    
    // 注册所有事件
    this._registerEvents();
    
    // 建立事件索引
    this._buildEventIndices();
    
    console.log(`📅 已注册${this.events.size}个事件`);
  }

  /**
   * 注册所有游戏事件
   */
  _registerEvents() {
    // 自然事件
    this._registerNaturalEvents();
    
    // 社会事件
    this._registerSocialEvents();
    
    // 文化事件
    this._registerCulturalEvents();
    
    // 个人事件
    this._registerPersonalEvents();
    
    // 经济事件
    this._registerEconomicEvents();
    
    // 历史事件
    this._registerHistoricalEvents();
  }

  /**
   * 注册自然事件
   */
  _registerNaturalEvents() {
    const naturalEvents = [
      {
        id: 'good_harvest',
        name: '五谷丰登',
        description: '今年风调雨顺，庄稼获得了前所未有的丰收。仓廪充实，百姓喜悦。',
        type: 'natural',
        category: 'opportunity',
        rarity: 'common',
        triggerConditions: [
          { type: 'season', seasons: ['秋季'] },
          { type: 'random', probability: 0.3 }
        ],
        effects: {
          resources: { food: { min: 50, max: 100 } },
          characters: {
            all: { mood: 15, health: 5 }
          }
        },
        isRepeatable: true,
        historicalContext: '农业社会中，丰收是最大的喜事，直接关系到百姓的生死存亡。'
      },

      {
        id: 'drought',
        name: '大旱之灾',
        description: '连月无雨，河水断流，庄稼枯萎。百姓苦不堪言，急需寻找新的水源。',
        type: 'natural',
        category: 'disaster',
        rarity: 'uncommon',
        triggerConditions: [
          { type: 'season', seasons: ['夏季', '秋季'] },
          { type: 'random', probability: 0.15 }
        ],
        effects: {
          resources: { 
            water: -30, 
            food: -20 
          },
          characters: {
            all: { mood: -10, health: -5 }
          }
        },
        duration: 30,
        cooldown: 180,
        historicalContext: '干旱是古代农业社会的主要自然灾害之一，常常导致饥荒和人口流失。'
      },

      {
        id: 'flood',
        name: '洪水泛滥',
        description: '连日暴雨，河水暴涨，冲毁了部分农田和房屋。所幸人员安全，但损失惨重。',
        type: 'natural',
        category: 'disaster',
        rarity: 'uncommon',
        triggerConditions: [
          { type: 'season', seasons: ['夏季'] },
          { type: 'random', probability: 0.12 }
        ],
        effects: {
          resources: { 
            food: -15, 
            wood: -25,
            tools: -10
          },
          fortress: { foundationLevel: -1 }
        },
        cooldown: 120,
        historicalContext: '洪涝灾害在南北朝时期频发，常常冲毁农田和居住区。'
      },

      {
        id: 'epidemic',
        name: '瘟疫流行',
        description: '不知从何处传来的疫病在坞堡中蔓延，许多人染病在床。急需草药治疗。',
        type: 'natural',
        category: 'disaster',
        rarity: 'rare',
        triggerConditions: [
          { type: 'population', operator: '>', value: 30 },
          { type: 'random', probability: 0.05 }
        ],
        effects: {
          characters: {
            random: {
              count: 5,
              effects: { health: -30, mood: -15 }
            }
          },
          resources: { medicine: -20 },
          population: { death: { probability: 0.1 } }
        },
        duration: 45,
        cooldown: 365,
        historicalContext: '南北朝时期医疗条件有限，疫病传播往往造成严重后果。'
      },

      {
        id: 'earthquake',
        name: '地龙翻身',
        description: '大地震动，山摇地动。虽然坞堡结构坚固，但仍有部分建筑受损，人心惶惶。',
        type: 'natural',
        category: 'disaster',
        rarity: 'rare',
        triggerConditions: [
          { type: 'random', probability: 0.02 }
        ],
        effects: {
          fortress: { 
            foundationLevel: -1,
            defenseLevel: -1
          },
          characters: {
            all: { mood: -20 }
          },
          resources: { stone: -30, wood: -20 }
        },
        cooldown: 1095, // 3年
        historicalContext: '地震在古代被视为不祥之兆，往往引起社会恐慌。'
      }
    ];

    naturalEvents.forEach(event => this.registerEvent(event));
  }

  /**
   * 注册社会事件
   */
  _registerSocialEvents() {
    const socialEvents = [
      {
        id: 'merchant_caravan',
        name: '商队到访',
        description: '一支商队路过坞堡，带来了远方的货物和消息。这是难得的贸易机会。',
        type: 'social',
        category: 'opportunity',
        rarity: 'common',
        triggerConditions: [
          { type: 'development', aspect: 'prosperityLevel', minLevel: 2 },
          { type: 'random', probability: 0.2 }
        ],
        effects: {
          resources: {
            cloth: { min: 10, max: 20 },
            metal: { min: 5, max: 15 },
            medicine: { min: 3, max: 8 }
          }
        },
        choices: [
          {
            id: 'trade',
            text: '与商队交易',
            cost: { resources: { food: 20, wood: 15 } },
            benefit: { resources: { cloth: 25, metal: 15 } }
          },
          {
            id: 'decline',
            text: '礼貌拒绝',
            benefit: { characters: { all: { mood: 5 } } }
          }
        ],
        isRepeatable: true,
        historicalContext: '南北朝时期商业发展，商队往来频繁，是物资交流的重要渠道。'
      },

      {
        id: 'bandit_attack',
        name: '匪患侵扰',
        description: '一群流寇窥视坞堡的财富，企图抢掠。幸好守备森严，但仍需提高警惕。',
        type: 'social',
        category: 'disaster',
        rarity: 'uncommon',
        triggerConditions: [
          { type: 'resource', resource: 'food', operator: '>', value: 100 },
          { type: 'random', probability: 0.15 }
        ],
        effects: {
          resources: {
            food: -15,
            tools: -5
          },
          characters: {
            random: {
              count: 2,
              effects: { health: -15, mood: -10 }
            }
          }
        },
        choices: [
          {
            id: 'fight',
            text: '奋起抵抗',
            requirements: { fortress: { defenseLevel: 2 } },
            benefit: { characters: { all: { virtues: { 义: 5, 勇: 8 } } } },
            risk: { characters: { random: { count: 1, effects: { health: -25 } } } }
          },
          {
            id: 'pay_tribute',
            text: '缴纳保护费',
            cost: { resources: { food: 30, cloth: 10 } },
            benefit: { characters: { all: { mood: -5 } } }
          }
        ],
        cooldown: 90,
        historicalContext: '南北朝战乱频仍，流寇横行，坞堡常需自卫。'
      },

      {
        id: 'refugee_arrival',
        name: '流民来投',
        description: '一群饱受战乱之苦的流民来到坞堡，希望得到庇护。他们虽然贫困，但勤劳肯干。',
        type: 'social',
        category: 'neutral',
        rarity: 'common',
        triggerConditions: [
          { type: 'population', operator: '<', value: 40 },
          { type: 'random', probability: 0.25 }
        ],
        effects: {
          population: { immigration: { count: { min: 2, max: 5 } } }
        },
        choices: [
          {
            id: 'accept_all',
            text: '全部收留',
            cost: { resources: { food: 25, wood: 15 } },
            benefit: { 
              characters: { all: { virtues: { 仁: 8 }, mood: 10 } },
              fortress: { prosperityLevel: 1 }
            }
          },
          {
            id: 'selective',
            text: '挑选精壮',
            benefit: { population: { immigration: { count: 2 } } },
            cost: { characters: { all: { virtues: { 仁: -3 }, mood: -5 } } }
          },
          {
            id: 'refuse',
            text: '拒绝收留',
            benefit: { resources: { food: 0 } },
            cost: { characters: { all: { virtues: { 仁: -10 }, mood: -10 } } }
          }
        ],
        isRepeatable: true,
        historicalContext: '南北朝时期战乱不断，大量人口流离失所，投靠坞堡是常见现象。'
      },

      {
        id: 'government_inspection',
        name: '官府巡查',
        description: '郡县官员来到坞堡巡查，检验治理成效。这既是机会也是挑战。',
        type: 'social',
        category: 'neutral',
        rarity: 'uncommon',
        triggerConditions: [
          { type: 'development', aspect: 'prosperityLevel', minLevel: 3 },
          { type: 'time', afterDay: 180 },
          { type: 'random', probability: 0.1 }
        ],
        effects: {
          fortress: { reputationLevel: 1 }
        },
        choices: [
          {
            id: 'impress',
            text: '盛情款待',
            cost: { resources: { food: 30, cloth: 15 } },
            benefit: { 
              fortress: { reputationLevel: 2 },
              resources: { metal: 20, tools: 10 }
            }
          },
          {
            id: 'modest',
            text: '平常接待',
            cost: { resources: { food: 15 } },
            benefit: { fortress: { reputationLevel: 1 } }
          }
        ],
        cooldown: 365,
        historicalContext: '南北朝政府对地方坞堡的管理相对宽松，但仍会定期巡查。'
      }
    ];

    socialEvents.forEach(event => this.registerEvent(event));
  }

  /**
   * 注册文化事件
   */
  _registerCulturalEvents() {
    const culturalEvents = [
      {
        id: 'spring_festival',
        name: '春节庆典',
        description: '新春佳节到来，坞堡内张灯结彩，家家户户团聚欢庆，共度佳节。',
        type: 'cultural',
        category: 'opportunity',
        rarity: 'common',
        triggerConditions: [
          { type: 'season', seasons: ['春季'] },
          { type: 'time', afterDay: 1 } // 每年都会触发
        ],
        effects: {
          characters: {
            all: { mood: 20, virtues: { 礼: 3 } }
          },
          resources: { food: -10 } // 节日消耗
        },
        isRepeatable: true,
        historicalContext: '春节是中华民族最重要的传统节日，南北朝时期已有庆祝传统。'
      },

      {
        id: 'scholar_visit',
        name: '学者造访',
        description: '一位博学的儒生路过坞堡，愿意传授经典学问，为年轻人开启智慧之门。',
        type: 'cultural',
        category: 'opportunity',
        rarity: 'uncommon',
        triggerConditions: [
          { type: 'development', aspect: 'culturalLevel', minLevel: 2 },
          { type: 'random', probability: 0.12 }
        ],
        effects: {
          characters: {
            random: {
              count: 3,
              effects: { 
                skills: { '经义研读': 15 },
                virtues: { 智: 8, 礼: 5 }
              }
            }
          }
        },
        choices: [
          {
            id: 'invite_stay',
            text: '邀请长期居住',
            cost: { resources: { food: 20, cloth: 10 } },
            benefit: { 
              fortress: { culturalLevel: 1 },
              characters: { all: { skills: { '经义研读': 5 } } }
            }
          },
          {
            id: 'short_visit',
            text: '短期交流',
            benefit: { 
              characters: { random: { count: 5, effects: { skills: { '经义研读': 8 } } } }
            }
          }
        ],
        cooldown: 180,
        historicalContext: '南北朝时期儒学复兴，学者游历讲学是常见现象。'
      },

      {
        id: 'buddhist_monk',
        name: '佛僧传法',
        description: '一位德高望重的佛僧来到坞堡，为百姓讲经说法，传播慈悲智慧。',
        type: 'cultural',
        category: 'opportunity',
        rarity: 'uncommon',
        triggerConditions: [
          { type: 'population', operator: '>', value: 25 },
          { type: 'random', probability: 0.08 }
        ],
        effects: {
          characters: {
            all: { 
              mood: 10,
              virtues: { 仁: 5, 温: 8, 让: 10 }
            }
          }
        },
        choices: [
          {
            id: 'build_temple',
            text: '修建佛寺',
            cost: { resources: { wood: 40, stone: 30, food: 20 } },
            benefit: { 
              fortress: { culturalLevel: 2 },
              characters: { all: { virtues: { 仁: 10, 温: 10 } } }
            }
          },
          {
            id: 'listen_only',
            text: '虚心聆听',
            benefit: { characters: { all: { virtues: { 温: 5 } } } }
          }
        ],
        cooldown: 270,
        historicalContext: '南北朝是佛教在中国大发展的时期，佛僧传法深受民众欢迎。'
      },

      {
        id: 'craftsman_innovation',
        name: '工艺革新',
        description: '坞堡内的工匠们在长期实践中摸索出新的工艺技法，大大提高了生产效率。',
        type: 'cultural',
        category: 'opportunity',
        rarity: 'rare',
        triggerConditions: [
          { type: 'development', aspect: 'foundationLevel', minLevel: 3 },
          { type: 'resource', resource: 'tools', operator: '>', value: 15 },
          { type: 'random', probability: 0.03 }
        ],
        effects: {
          characters: {
            random: {
              count: 2,
              effects: { 
                skills: { '手工雕琢': 20, '熔炼铸锻': 15 },
                virtues: { 智: 10, 俭: 8 }
              }
            }
          },
          fortress: { foundationLevel: 1 }
        },
        isRepeatable: true,
        cooldown: 365,
        historicalContext: '南北朝时期手工业技术不断发展，工艺创新推动了生产力提升。'
      }
    ];

    culturalEvents.forEach(event => this.registerEvent(event));
  }

  /**
   * 注册个人事件
   */
  _registerPersonalEvents() {
    const personalEvents = [
      {
        id: 'marriage_proposal',
        name: '良缘佳配',
        description: '坞堡内有一对青年男女情投意合，双方家长也认为是良配，准备举办婚礼。',
        type: 'personal',
        category: 'opportunity',
        rarity: 'common',
        triggerConditions: [
          { type: 'population', operator: '>', value: 15 },
          { type: 'random', probability: 0.15 }
        ],
        effects: {
          characters: {
            random: {
              count: 2,
              effects: { mood: 25, virtues: { 礼: 5 } }
            }
          },
          population: { marriage: true }
        },
        choices: [
          {
            id: 'grand_wedding',
            text: '盛大婚礼',
            cost: { resources: { food: 25, cloth: 15 } },
            benefit: { 
              characters: { all: { mood: 15, virtues: { 礼: 3 } } }
            }
          },
          {
            id: 'simple_ceremony',
            text: '简单仪式',
            cost: { resources: { food: 10 } },
            benefit: { characters: { all: { mood: 8 } } }
          }
        ],
        isRepeatable: true,
        historicalContext: '婚姻在古代社会是重要的人生大事，关系到家族延续。'
      },

      {
        id: 'skill_breakthrough',
        name: '技艺精进',
        description: '经过长期的勤学苦练，有人在某项技能上取得了重大突破，技艺大进。',
        type: 'personal',
        category: 'opportunity',
        rarity: 'uncommon',
        triggerConditions: [
          { type: 'random', probability: 0.1 }
        ],
        effects: {
          characters: {
            random: {
              count: 1,
              effects: { 
                skills: { '随机技能': 25 },
                virtues: { 俭: 5, 智: 8 },
                mood: 20
              }
            }
          }
        },
        isRepeatable: true,
        historicalContext: '技能的精进需要长期积累，突破往往带来成就感和社会认可。'
      },

      {
        id: 'elder_wisdom',
        name: '长者传道',
        description: '坞堡中德高望重的长者愿意将毕生所学传授给年轻一代，分享人生智慧。',
        type: 'personal',
        category: 'opportunity',
        rarity: 'uncommon',
        triggerConditions: [
          { type: 'population', operator: '>', value: 20 },
          { type: 'random', probability: 0.08 }
        ],
        effects: {
          characters: {
            random: {
              count: 4,
              effects: { 
                virtues: { 智: 8, 礼: 5, 恭: 6 },
                skills: { '经义研读': 10 }
              }
            }
          }
        },
        isRepeatable: true,
        historicalContext: '尊老敬贤是中华传统美德，长者的智慧传承对社区发展很重要。'
      }
    ];

    personalEvents.forEach(event => this.registerEvent(event));
  }

  /**
   * 注册经济事件
   */
  _registerEconomicEvents() {
    const economicEvents = [
      {
        id: 'resource_discovery',
        name: '资源发现',
        description: '在山林中发现了新的资源点，为坞堡的发展提供了新的物质基础。',
        type: 'economic',
        category: 'opportunity',
        rarity: 'uncommon',
        triggerConditions: [
          { type: 'development', aspect: 'foundationLevel', minLevel: 2 },
          { type: 'random', probability: 0.12 }
        ],
        effects: {
          resources: {
            wood: { min: 30, max: 50 },
            stone: { min: 20, max: 40 },
            metal: { min: 5, max: 15 }
          }
        },
        choices: [
          {
            id: 'organize_extraction',
            text: '组织开采',
            cost: { resources: { tools: 5, food: 15 } },
            benefit: { 
              resources: { wood: 40, stone: 30, metal: 10 },
              characters: { random: { count: 3, effects: { skills: { '采石挖矿': 10 } } } }
            }
          },
          {
            id: 'gradual_use',
            text: '缓慢利用',
            benefit: { resources: { wood: 20, stone: 15 } }
          }
        ],
        cooldown: 180,
        historicalContext: '自然资源的发现和利用是古代社会发展的重要因素。'
      },

      {
        id: 'market_demand',
        name: '市场需求',
        description: '邻近地区对坞堡生产的某种商品需求大增，这是扩大贸易的好机会。',
        type: 'economic',
        category: 'opportunity',
        rarity: 'common',
        triggerConditions: [
          { type: 'development', aspect: 'prosperityLevel', minLevel: 2 },
          { type: 'resource', resource: 'cloth', operator: '>', value: 20 },
          { type: 'random', probability: 0.2 }
        ],
        effects: {
          resources: {
            cloth: -15,
            food: 25,
            metal: 10
          }
        },
        choices: [
          {
            id: 'increase_production',
            text: '增加产量',
            cost: { resources: { tools: 3, wood: 10 } },
            benefit: { 
              resources: { cloth: 30, food: 40 },
              characters: { all: { skills: { '纺织缝纫': 5 } } }
            }
          },
          {
            id: 'maintain_current',
            text: '维持现状',
            benefit: { resources: { food: 15 } }
          }
        ],
        isRepeatable: true,
        historicalContext: '商品贸易是坞堡经济发展的重要组成部分。'
      }
    ];

    economicEvents.forEach(event => this.registerEvent(event));
  }

  /**
   * 注册历史事件
   */
  _registerHistoricalEvents() {
    const historicalEvents = [
      {
        id: 'northern_wei_collapse',
        name: '北魏分裂',
        description: '北魏帝国分裂为东魏、西魏，天下大乱。各地坞堡需要更加注重自保。',
        type: 'historical',
        category: 'neutral',
        rarity: 'legendary',
        triggerConditions: [
          { type: 'time', afterDay: 1095 }, // 3年后
          { type: 'random', probability: 0.5 }
        ],
        effects: {
          fortress: { defenseLevel: 1 },
          characters: {
            all: { virtues: { 义: 5 }, mood: -10 }
          },
          population: { immigration: { count: { min: 3, max: 8 } } }
        },
        duration: 365,
        cooldown: 0, // 历史事件不重复
        historicalContext: '公元534年北魏分裂，标志着南北朝进入新阶段。'
      },

      {
        id: 'buddhism_prosperity',
        name: '佛法兴盛',
        description: '佛教在北方大兴，许多贵族和平民皈依佛法，社会风气为之一变。',
        type: 'historical',
        category: 'opportunity',
        rarity: 'rare',
        triggerConditions: [
          { type: 'time', afterDay: 730 }, // 2年后
          { type: 'development', aspect: 'culturalLevel', minLevel: 2 },
          { type: 'random', probability: 0.3 }
        ],
        effects: {
          characters: {
            all: { virtues: { 仁: 8, 温: 10, 让: 12 } }
          },
          fortress: { culturalLevel: 2 }
        },
        choices: [
          {
            id: 'embrace_buddhism',
            text: '拥抱佛法',
            benefit: { 
              characters: { all: { virtues: { 仁: 15, 温: 15 }, mood: 20 } },
              fortress: { culturalLevel: 3 }
            }
          },
          {
            id: 'maintain_tradition',
            text: '坚持传统',
            benefit: { 
              characters: { all: { virtues: { 礼: 10, 恭: 8 } } }
            }
          }
        ],
        historicalContext: '南北朝时期是佛教在中国的黄金发展期。'
      }
    ];

    historicalEvents.forEach(event => this.registerEvent(event));
  }

  /**
   * 注册单个事件
   * @param {Object} eventConfig - 事件配置
   */
  registerEvent(eventConfig) {
    const event = new GameEvent(eventConfig.id, eventConfig);
    this.events.set(eventConfig.id, event);
  }

  /**
   * 建立事件索引
   */
  _buildEventIndices() {
    // 按类型分类
    for (const event of this.events.values()) {
      if (!this.eventsByType.has(event.type)) {
        this.eventsByType.set(event.type, []);
      }
      this.eventsByType.get(event.type).push(event);

      // 按稀有度分类
      if (!this.eventsByRarity.has(event.rarity)) {
        this.eventsByRarity.set(event.rarity, []);
      }
      this.eventsByRarity.get(event.rarity).push(event);
    }
  }

  /**
   * 更新事件系统（每日调用）
   * @param {Object} gameState - 游戏状态
   */
  update(gameState) {
    // 处理活动事件
    this._updateActiveEvents(gameState);
    
    // 检查并触发新事件
    this._checkEventTriggers(gameState);
    
    // 清理过期事件
    this._cleanupEvents(gameState);
    
    // 更新统计数据
    this._updateStats();
  }

  /**
   * 更新活动事件
   */
  _updateActiveEvents(gameState) {
    this.activeEvents = this.activeEvents.filter(activeEvent => {
      const event = this.events.get(activeEvent.eventId);
      if (!event || !event.duration) return false;
      
      const daysElapsed = gameState.currentDay - activeEvent.startDay;
      return daysElapsed < event.duration;
    });
  }

  /**
   * 检查事件触发
   */
  _checkEventTriggers(gameState) {
    if (this.activeEvents.length >= this.config.maxActiveEvents) {
      return; // 活动事件过多，暂停触发新事件
    }

    // 按稀有度检查事件
    for (const [rarity, events] of this.eventsByRarity.entries()) {
      const chance = this.config.baseEventChance * this.config.rarityMultipliers[rarity];
      
      if (Math.random() < chance) {
        const candidateEvents = events.filter(event => event.canTrigger(gameState));
        if (candidateEvents.length > 0) {
          const selectedEvent = Utils.Array.randomChoice(candidateEvents);
          this.triggerEvent(selectedEvent.id, gameState);
          break; // 每日最多触发一个事件
        }
      }
    }
  }

  /**
   * 触发指定事件
   * @param {string} eventId - 事件ID
   * @param {Object} gameState - 游戏状态
   * @returns {Object} 事件结果
   */
  triggerEvent(eventId, gameState) {
    const event = this.events.get(eventId);
    if (!event || !event.canTrigger(gameState)) {
      return { success: false, reason: '事件无法触发' };
    }

    const result = event.execute(gameState, this.gameEngine);
    
    if (result.success) {
      // 记录到历史
      this.eventHistory.push({
        eventId: eventId,
        gameDay: gameState.currentDay,
        result: result
      });

      // 添加到活动事件
      if (event.duration > 0) {
        this.activeEvents.push({
          eventId: eventId,
          startDay: gameState.currentDay,
          endDay: gameState.currentDay + event.duration
        });
      }

      // 发送事件到游戏引擎
      if (this.gameEngine) {
        this.gameEngine._emitEvent('gameEvent', result);
      }

      // 更新统计
      this.stats.totalEvents++;
      this.stats.eventsByType[event.type] = (this.stats.eventsByType[event.type] || 0) + 1;
      this.stats.eventsByRarity[event.rarity] = (this.stats.eventsByRarity[event.rarity] || 0) + 1;
    }

    return result;
  }

  /**
   * 处理事件选择
   * @param {string} eventId - 事件ID
   * @param {string} choiceId - 选择ID
   * @param {Object} gameState - 游戏状态
   * @returns {Object} 处理结果
   */
  handleEventChoice(eventId, choiceId, gameState) {
    const event = this.events.get(eventId);
    if (!event) {
      return { success: false, reason: '事件不存在' };
    }

    const choice = event.choices.find(c => c.id === choiceId);
    if (!choice) {
      return { success: false, reason: '选择不存在' };
    }

    // 检查选择要求
    if (choice.requirements && !this._checkChoiceRequirements(choice.requirements, gameState)) {
      return { success: false, reason: '不满足选择要求' };
    }

    // 应用选择效果
    const result = {
      eventId: eventId,
      choiceId: choiceId,
      success: true,
      effects: {}
    };

    // 应用成本
    if (choice.cost) {
      result.effects.cost = this._applyChoiceEffects(choice.cost, gameState, this.gameEngine);
    }

    // 应用收益
    if (choice.benefit) {
      result.effects.benefit = this._applyChoiceEffects(choice.benefit, gameState, this.gameEngine);
    }

    // 应用风险
    if (choice.risk && Math.random() < (choice.risk.probability || 0.5)) {
      result.effects.risk = this._applyChoiceEffects(choice.risk, gameState, this.gameEngine);
    }

    return result;
  }

  /**
   * 获取可用事件列表
   * @param {Object} gameState - 游戏状态
   * @returns {Array} 可用事件列表
   */
  getAvailableEvents(gameState) {
    return Array.from(this.events.values())
      .filter(event => event.canTrigger(gameState))
      .map(event => ({
        id: event.id,
        name: event.name,
        description: event.description,
        type: event.type,
        category: event.category,
        rarity: event.rarity
      }));
  }

  /**
   * 获取事件历史
   * @param {number} limit - 限制数量
   * @returns {Array} 事件历史
   */
  getEventHistory(limit = 20) {
    return this.eventHistory
      .slice(-limit)
      .reverse()
      .map(record => ({
        ...record,
        event: this.events.get(record.eventId)
      }));
  }

  /**
   * 获取系统统计
   * @returns {Object} 统计数据
   */
  getStats() {
    const totalDays = this.gameEngine?.getGameState().statistics.totalGameDays || 1;
    
    return {
      ...this.stats,
      averageEventsPerDay: this.stats.totalEvents / totalDays,
      totalRegisteredEvents: this.events.size,
      activeEventsCount: this.activeEvents.length,
      historyLength: this.eventHistory.length
    };
  }

  // ==================== 私有辅助方法 ====================

  _checkChoiceRequirements(requirements, gameState) {
    // 检查坞堡要求
    if (requirements.fortress) {
      for (const [aspect, minLevel] of Object.entries(requirements.fortress)) {
        if ((gameState.fortress?.[aspect] || 1) < minLevel) {
          return false;
        }
      }
    }

    // 检查资源要求
    if (requirements.resources) {
      for (const [resource, amount] of Object.entries(requirements.resources)) {
        if ((gameState.resources?.[resource]?.amount || 0) < amount) {
          return false;
        }
      }
    }

    return true;
  }

  _applyChoiceEffects(effects, gameState, gameEngine) {
    // 这里重用 GameEvent 的效果应用逻辑
    const tempEvent = new GameEvent('temp', { effects });
    return tempEvent._applyEffects(effects, gameState, gameEngine);
  }

  _cleanupEvents(gameState) {
    // 清理过期的事件历史
    if (this.eventHistory.length > this.config.historyLimit) {
      this.eventHistory = this.eventHistory.slice(-this.config.historyLimit);
    }
  }

  _updateStats() {
    // 更新平均事件频率等统计数据
    if (this.gameEngine) {
      const totalDays = this.gameEngine.getGameState().statistics.totalGameDays || 1;
      this.stats.averageEventsPerDay = this.stats.totalEvents / totalDays;
    }
  }
}

export default EventSystem;