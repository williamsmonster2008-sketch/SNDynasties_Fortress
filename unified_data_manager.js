/**
 * unified_data_manager.js - 南北朝坞堡模拟器统一数据管理器
 * 
 * 核心职责：
 * - 统一的数据创建、读取、更新、删除接口
 * - 数据完整性验证和自动修复
 * - 实时数据同步和版本控制
 * - 数据备份和恢复机制
 * - 外部数据表加载和管理
 */

import { Utils } from './utils_module.js';
import VirtueSystem from './virtue_system.js';
import Character from './character_module.js';

// 数据管理错误类
class DataManagerError extends Error {
  constructor(message, type = 'general', context = {}) {
    super(message);
    this.name = 'DataManagerError';
    this.type = type;
    this.context = context;
    this.timestamp = Date.now();
  }
}

// 数据表加载器
class DataTableManager {
  constructor() {
    this.tables = new Map();
    this.loadPromises = new Map();
    this.parsers = {
      json: (text) => JSON.parse(text),
      csv: (text) => this.parseCSV(text)
    };
  }

  async loadTable(fileName, format = 'auto') {
    const cacheKey = `${fileName}_${format}`;
    
    if (this.tables.has(cacheKey)) {
      return this.tables.get(cacheKey);
    }

    // 避免重复加载
    if (this.loadPromises.has(cacheKey)) {
      return await this.loadPromises.get(cacheKey);
    }

    const loadPromise = this._loadTableFromFile(fileName, format);
    this.loadPromises.set(cacheKey, loadPromise);
    
    try {
      const data = await loadPromise;
      this.tables.set(cacheKey, data);
      return data;
    } finally {
      this.loadPromises.delete(cacheKey);
    }
  }

  async _loadTableFromFile(fileName, format) {
    // 自动检测格式
    if (format === 'auto') {
      format = this.detectFormat(fileName);
    }

    const filePath = this.getFilePath(fileName, format);
    
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder('utf-8').decode(buffer);
      const parser = this.parsers[format];
      
      if (!parser) {
        throw new Error(`不支持的格式: ${format}`);
      }

      return parser(text);
    } catch (error) {
      console.error(`加载数据表失败: ${filePath}`, error);
      throw new DataManagerError(`加载数据表失败: ${fileName}`, 'load_error', {
        fileName,
        format,
        filePath,
        originalError: error.message
      });
    }
  }

  parseCSV(text) {
    // 处理可能的编码问题
    let cleanText = text;
    // 移除BOM标记
    if (cleanText.charCodeAt(0) === 0xFEFF) {
      cleanText = cleanText.slice(1);
    }
    
    // 处理常见编码问题
    try {
        cleanText = decodeURIComponent(escape(cleanText));
    } catch (e) {
        // 如果解码失败，使用原始文本
    }

    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        const value = values[index] || '';
        // 尝试转换数据类型
        row[header] = this.parseValue(value);
      });
      return row;
    });
  }

  parseValue(value) {
    if (value === '') return '';
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(value) && !isNaN(parseFloat(value))) {
      return parseFloat(value);
    }
    return value;
  }

  parseYAML(text) {
    throw new Error('YAML格式已禁用，请使用JSON或CSV格式');
  }
f
  parseTOML(text) {
    throw new Error('TOML格式已禁用，请使用JSON或CSV格式');
  }

  detectFormat(fileName) {
    if (fileName.includes('.csv')) return 'csv';
    return 'json'; // 默认JSON
  }

  getFilePath(fileName, format) {
    // 简化文件路径结构
    const baseDir = 'data_tables/';
    const ext = format === 'auto' ? '.json' : `.${format}`;
    
    return `${baseDir}${fileName}${ext}`;
  }

  // 便捷方法
  async getVirtueSystemConfig() {
    return await this.loadTable('virtue_config', 'json');
  }

  async getCharacterNamesConfig() {
    return await this.loadTable('character_names', 'csv');
  }

  async getBalanceConfig() {
    return await this.loadTable('balance_config', 'json');
  }

  async getSkillConfig() {
    return await this.loadTable('skill_config', 'json');
  }
  
  async getPersonalityConfig() {
    return await this.loadTable('personality_config', 'json');
  }
  
  async getBehaviorPatterns() {
    return await this.loadTable('behavior_patterns', 'json');
  }
  
  async getEmotionalReactions() {
    return await this.loadTable('emotional_reactions', 'json');
  }
}

// 数据验证器
class DataValidator {
  constructor() {
    this.validators = new Map();
    this.setupDefaultValidators();
  }

  setupDefaultValidators() {
    // 角色数据验证器
    this.validators.set('character', {
      required: ['id', 'name', 'age', 'gender'],
      types: {
        id: 'string',
        name: 'string',
        age: 'number',
        gender: 'string'
      },
      constraints: {
        age: (value) => value >= 0 && value <= 120,
        gender: (value) => ['男', '女'].includes(value)
      }
    });

    // 德行系统验证器
    this.validators.set('virtueSystem', {
      required: ['characterId', 'virtues', 'traits'],
      types: {
        characterId: 'string',
        virtues: 'object',
        traits: 'object'
      },
      constraints: {
        virtues: (value) => value instanceof Map,
        traits: (value) => value instanceof Map
      }
    });
  }

  validate(dataType, data) {
    const validator = this.validators.get(dataType);
    if (!validator) {
      return { isValid: true, errors: [] };
    }

    const errors = [];

    // 检查必需字段
    for (const field of validator.required || []) {
      if (data[field] === undefined || data[field] === null) {
        errors.push({
          field,
          type: 'missing_required',
          message: `缺少必需字段: ${field}`
        });
      }
    }

    // 检查数据类型
    for (const [field, expectedType] of Object.entries(validator.types || {})) {
      if (data[field] !== undefined) {
        const actualType = typeof data[field];
        if (actualType !== expectedType && expectedType !== 'object') {
          errors.push({
            field,
            type: 'type_mismatch',
            message: `字段 ${field} 类型错误，期望 ${expectedType}，实际 ${actualType}`
          });
        }
      }
    }

    // 检查约束条件
    for (const [field, constraint] of Object.entries(validator.constraints || {})) {
      if (data[field] !== undefined && !constraint(data[field])) {
        errors.push({
          field,
          type: 'constraint_violation',
          message: `字段 ${field} 不满足约束条件`
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// 统一数据管理器主类
export class UnifiedDataManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    
    // 核心组件
    this.dataTableManager = new DataTableManager();
    this.validator = new DataValidator();
    
    // 数据存储
    this.dataStore = new Map(); // 权威数据存储
    this.backupStore = new Map(); // 备份存储
    this.versionCounter = 0;
    
    // 监听器和订阅者
    this.listeners = new Map();
    this.subscriptions = new Map();
    
    // 缓存和优化
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30秒缓存超时
    this.lastSyncTime = 0;
    this.isSyncing = false; // 添加同步锁
    this.syncCooldown = 5000; // 5秒冷却时间
    
    // 统计信息
    this.stats = {
      createdCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      validationFailures: 0,
      autoRepairs: 0
    };

    console.log('🔧 统一数据管理器初始化完成');
  }

  // =============== 数据创建接口 ===============

  async createCharacter(config) {   
    
    try {
      // 1. 数据验证
      const validatedConfig = await this.validateCharacterConfig(config);
      
      // 2. 加载外部配置
      const virtueConfig = await this.dataTableManager.getVirtueSystemConfig();
      const nameConfig = await this.dataTableManager.getCharacterNamesConfig();
      
      // 3. 构建完整角色对象
      const character = await this.buildCompleteCharacter(validatedConfig, {
        virtueConfig,
        nameConfig
      });
      
      
      
      // 4. 分配版本和元数据
      character._version = ++this.versionCounter;
      character._createdAt = Date.now();
      character._lastModified = Date.now();
      character._source = 'create_character';
      
      // 5. 存储到权威位置
      this.dataStore.set(character.id, character);
      this.gameEngine.characters.set(character.id, character);
      
      // 6. 创建备份
      this.createBackup(character.id, character);
      
      // 7. 清理相关缓存
      this.invalidateCache(['characters', 'character_stats']);
      
      // 8. 通知数据变更
      this.notifyDataChange('character_created', {
        characterId: character.id,
        character: character,
        timestamp: Date.now()
      });
      
      // 9. 更新统计
      this.stats.createdCount++;
      
      console.log(`✅ 角色创建完成: ${character.name} (ID: ${character.id})`);
      return character;
      
    } catch (error) {
      console.error('❌ 角色创建失败:', error);
      throw new DataManagerError(`角色创建失败: ${error.message}`, 'create_error', {
        config,
        originalError: error
      });
    }
  }

  async validateCharacterConfig(config) {
    console.log('验证角色配置:', config);
    
    if (!config) {
      throw new DataManagerError('角色配置不能为空', 'validation_error');
    }
  
    // 生成缺失的必需字段（在验证之前）
    const validatedConfig = { ...config };
         
    if (!validatedConfig.id) {
      validatedConfig.id = Utils.String.generateId();
    }
         
    if (!validatedConfig.name) {
      validatedConfig.name = await this.generateRandomName(validatedConfig.gender);
    }
  
    // 现在检查必需字段
    const errors = [];
    if (!validatedConfig.name) errors.push('缺少name字段');
    if (!validatedConfig.id) errors.push('缺少id字段');
         
    if (errors.length > 0) {
      console.log('验证失败，错误:', errors);
      throw new DataManagerError(`角色配置验证失败: ${errors.join(', ')}`);
    }
  
    // 基础验证
    const validation = this.validator.validate('character', validatedConfig);
    if (!validation.isValid) {
      console.log('validator验证失败:', validation.errors);
      throw new DataManagerError('角色配置验证失败', 'validation_error', {
        errors: validation.errors
      });
    }
  
    return validatedConfig;
  }

  async buildCompleteCharacter(config, externalConfig = {}) {
    // 1. 创建基础角色对象
    const character = new Character(config);  

    // 确保characterId正确传递
    if (config.characterId && !character.characterId) {
      character.characterId = config.characterId;
      console.log(`🔧 手动修复角色characterId: ${character.name} → ${config.characterId}`);
    }
    

    // 🔧 修复：手动确保familyName和surname正确传递
    if (config.familyName && !character.familyName) {
      character.familyName = config.familyName;
      console.log(`🔧 手动修复角色familyName: ${character.name} → ${config.familyName}`);
    }
    
    if (config.surname && !character.surname) {
      character.surname = config.surname;
      console.log(`🔧 手动修复角色surname: ${character.name} → ${config.surname}`);
    }
    // 🔧 修复：手动确保所有家族相关字段正确传递
    if (config.originalFamily && !character.originalFamily) {
      character.originalFamily = config.originalFamily;
      console.log(`🔧 手动修复角色originalFamily: ${character.name} → ${config.originalFamily}`);
    }

    if (config.currentFamily && !character.currentFamily) {
      character.currentFamily = config.currentFamily;
      console.log(`🔧 手动修复角色currentFamily: ${character.name} → ${config.currentFamily}`);
    }

    if (config.socialClass && !character.socialClass) {
      character.socialClass = config.socialClass;
      console.log(`🔧 手动修复角色socialClass: ${character.name} → ${config.socialClass}`);
    }


    // 2. 创建并绑定德行系统
    character.virtueSystem = await this.createVirtueSystemForCharacter(
      character.id, 
      config.virtueConfig || {},
      externalConfig.virtueConfig
    );
    
    // 3. 验证德行系统完整性
    this.ensureVirtueSystemMethods(character.virtueSystem);
    
    // 4. 创建其他系统
    // 这里可以继续添加技能系统、物理状态等
    
    // 5. 最终验证
    const validationResult = this.validateCompleteCharacter(character);
    if (!validationResult.isValid) {
      throw new DataManagerError('完整角色验证失败', 'validation_error', {
        errors: validationResult.errors
      });
    }
    
    return character;
  }

  async createVirtueSystemForCharacter(characterId, config, externalConfig) {
    console.log('DEBUG: VirtueSystem创建参数', { characterId, config, externalConfig });
    const virtueSystem = new VirtueSystem(characterId, {
      ...config,
      externalConfig
    });

    console.log('DEBUG: VirtueSystem创建后状态', {
      virtues: virtueSystem.virtues,
      traits: virtueSystem.traits,
      methods: typeof virtueSystem.getDominantVirtues
    });

    // 确保初始化完成
    if (!virtueSystem.virtues || !virtueSystem.traits) {
      throw new DataManagerError('德行系统初始化失败', 'system_error', {
        characterId
      });
    }
    
    // 加载外部配置并初始化
    try {
      const virtueConfig = await this.dataTableManager.getVirtueSystemConfig();
      virtueSystem.config = virtueConfig || virtueSystem._getDefaultConfig();
      //console.log('🔍 加载的德行配置:', virtueConfig ? '外部配置' : '默认配置');
    } catch (error) {
      console.warn('⚠️ 加载外部德行配置失败，使用默认配置');
      virtueSystem.config = virtueSystem._getDefaultConfig();
    }
    virtueSystem._initializeVirtueStructure();
    // 添加这行调试
    //console.log('🔍 初始化后德行分类数量:', virtueSystem.virtueCategories.size);
    //console.log('🔍 德行配置keys:', virtueSystem.config ? Object.keys(virtueSystem.config.virtueCategories) : 'config为空');


    // 计算并存储德行分类数值
    for (const [categoryKey, categoryData] of virtueSystem.virtueCategories) {
      let totalScore = 0;
      let traitCount = categoryData.traits.length;
      
      categoryData.traits.forEach(trait => {
        totalScore += Math.abs(trait.value);
      });
      
      virtueSystem.virtues.set(categoryKey, Math.round(totalScore / traitCount));
    }

    return virtueSystem;
  }

  ensureVirtueSystemMethods(virtueSystem) {
    const requiredMethods = [
      'getDominantVirtues',
      'getPersonalityTraits',
      'getOverallRating',
      'applyBehaviorEffect',
      'exportData'
    ];

    for (const method of requiredMethods) {
      if (typeof virtueSystem[method] !== 'function') {
        // 动态添加缺失的方法
        virtueSystem[method] = this.getDefaultVirtueMethod(method, virtueSystem);
        console.warn(`⚠️ 德行系统缺失方法 ${method}，已自动添加`);
      }
    }
  }

  getDefaultVirtueMethod(methodName, virtueSystem) {
    const defaultMethods = {
      getDominantVirtues: () => {
        const virtues = [];
        for (const [name, data] of virtueSystem.virtues || new Map()) {
          virtues.push({ virtue: name, name: data.name, score: 50 });
        }
        return virtues.slice(0, 3);
      },
      getPersonalityTraits: () => {
        const traits = [];
        for (const [name, trait] of virtueSystem.traits || new Map()) {
          traits.push({
            name,
            value: trait.value || 0,
            level: '中性',
            description: '表现平常'
          });
        }
        return traits.slice(0, 8);
      },
      getOverallRating: () => 50,
      applyBehaviorEffect: () => {},
      exportData: () => ({ virtues: {}, traits: {} })
    };

    return defaultMethods[methodName] || (() => {});
  }

  validateCompleteCharacter(character) {
    const errors = [];

    // 验证基础数据
    const basicValidation = this.validator.validate('character', character);
    if (!basicValidation.isValid) {
      errors.push(...basicValidation.errors);
    }

    // 验证德行系统
    if (!character.virtueSystem) {
      errors.push({
        field: 'virtueSystem',
        type: 'missing_system',
        message: '德行系统缺失'
      });
    } else {
      const virtueValidation = this.validator.validate('virtueSystem', character.virtueSystem);
      if (!virtueValidation.isValid) {
        errors.push(...virtueValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 便捷方法
  async getVirtueSystemConfig() {
    return await this.dataTableManager.getVirtueSystemConfig();
  }

  async getCharacterNamesConfig() {
    return await this.dataTableManager.getCharacterNamesConfig();
  }

  async getBalanceConfig() {
    return await this.dataTableManager.getBalanceConfig();
  }

  async getSkillConfig() {
    return await this.dataTableManager.getSkillConfig();
  }

  async getPersonalityConfig() {
    return await this.dataTableManager.getPersonalityConfig();
  }

  async getBehaviorPatterns() {
    return await this.dataTableManager.getBehaviorPatterns();
  }

  async getEmotionalReactions() {
    return await this.dataTableManager.getEmotionalReactions();
  }


  // =============== 数据读取接口 ===============

  getCharacter(characterId) {
    //console.log(`🔍 获取角色数据: ${characterId}`);
    
    // 1. 从权威存储获取
    let character = this.dataStore.get(characterId);
    
    if (!character) {
      // 尝试从游戏引擎获取
      character = this.gameEngine.characters.get(characterId);
      if (character) {
        // 同步到权威存储
        this.dataStore.set(characterId, character);
      } else {
        throw new DataManagerError(`角色不存在: ${characterId}`, 'not_found');
      }
    }

    // 2. 数据完整性检查
    const issues = this.checkDataIntegrity(character);
    if (issues.length > 0) {
      console.warn(`🚨 角色 ${character.name} 数据存在问题:`, issues);
      character = this.autoRepairCharacter(character, issues);
    }

    return character;
  }

  getAllCharacters() {
    // console.log('📊 获取所有角色数据');  // 注释掉这行日志
    
    const characters = [];
    
    // 移除所有同步调用，直接返回数据
    for (const [characterId, character] of this.dataStore) {
      try {
        const validCharacter = this.getCharacter(characterId);
        characters.push(validCharacter);
      } catch (error) {
        console.error(`跳过损坏的角色数据: ${characterId}`, error);
      }
    }
  
    return characters;
  }


  shouldSync() {
    const now = Date.now();
    
    // 如果正在同步，拒绝
    if (this.isSyncing) return false;
    
    // 冷却时间内，拒绝
    if (now - this.lastSyncTime < this.syncCooldown) return false;
    
    // 只有在数据真正不一致时才同步
    return this.dataStore.size !== this.gameEngine.characters.size;
  }
  
  performSafeSync() {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    this.lastSyncTime = Date.now();
    
    try {
      // 只进行单向同步，避免循环
      this.syncFromEngineToStore();
    } finally {
      this.isSyncing = false;
    }
  }
  
  syncFromEngineToStore() {
    console.log('🔄 执行单向同步（引擎→存储）');
    
    for (const [id, character] of this.gameEngine.characters) {
      if (!this.dataStore.has(id)) {
        this.dataStore.set(id, character);
      }
    }
  }
  // =============== 数据更新接口 ===============

  updateCharacterData(characterId, updateData, source = 'manual') {
    //console.log(`🔄 更新角色数据: ${characterId}`, source);

    try {
      // 1. 获取当前数据
      const currentCharacter = this.getCharacter(characterId);
      
      // 2. 创建快照
      const snapshot = this.createSnapshot(currentCharacter);
      
      // 3. 应用更新
      const updatedCharacter = this.applyUpdate(currentCharacter, updateData);
      
      // 4. 验证更新结果
      const validationResult = this.validateCompleteCharacter(updatedCharacter);
      if (!validationResult.isValid) {
        // 回滚到快照状态
        this.restoreFromSnapshot(characterId, snapshot);
        throw new DataManagerError('数据更新验证失败', 'validation_error', {
          errors: validationResult.errors
        });
      }
      
      // 5. 更新版本信息
      updatedCharacter._version = ++this.versionCounter;
      updatedCharacter._lastModified = Date.now();
      updatedCharacter._lastSource = source;
      
      // 6. 保存更新
      this.dataStore.set(characterId, updatedCharacter);
      this.gameEngine.characters.set(characterId, updatedCharacter);
      
      // 7. 创建新备份
      this.createBackup(characterId, updatedCharacter);
      
      // 8. 清理缓存
      this.invalidateCache(['characters', 'character_stats']);
      
      // 9. 通知更新事件
      this.notifyDataChange('character_updated', {
        characterId,
        before: snapshot,
        after: updatedCharacter,
        source,
        timestamp: Date.now()
      });
      
      // 10. 更新统计
      this.stats.updatedCount++;
      
      //console.log(`✅ 角色数据更新完成: ${updatedCharacter.name}`);
      return updatedCharacter;
      
    } catch (error) {
      console.error(`❌ 角色数据更新失败: ${characterId}`, error);
      throw error;
    }
  }

  applyUpdate(character, updateData) {
    const updated = { ...character };
    
    // 深度合并更新数据
    for (const [key, value] of Object.entries(updateData)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        updated[key] = { ...updated[key], ...value };
      } else {
        updated[key] = value;
      }
    }
    
    return updated;
  }

  // =============== 数据完整性和修复 ===============

  checkDataIntegrity(character) {
    const issues = [];

    // 检查基础数据
    if (!character.id || !character.name) {
      issues.push({ type: 'missing_basic_data', severity: 'critical' });
    }

    // 检查德行系统
    if (!character.virtueSystem) {
      issues.push({ type: 'missing_virtue_system', severity: 'critical' });
    } else {
      if (!(character.virtueSystem.virtues instanceof Map)) {
        issues.push({ type: 'invalid_virtue_structure', severity: 'high' });
      }
      
      if (typeof character.virtueSystem.getDominantVirtues !== 'function') {
        issues.push({ type: 'missing_virtue_methods', severity: 'high' });
      }
    }

    return issues;
  }

  autoRepairCharacter(character, issues) {
    console.log(`🔧 自动修复角色 ${character.name} 的数据问题`);
    
    let repaired = false;
    
    for (const issue of issues) {
      switch (issue.type) {
        case 'missing_virtue_system':
          character.virtueSystem = new VirtueSystem(character.id);
          repaired = true;
          break;
          
        case 'missing_virtue_methods':
          this.ensureVirtueSystemMethods(character.virtueSystem);
          repaired = true;
          break;
          
        case 'invalid_virtue_structure':
          this.rebuildVirtueSystemStructure(character.virtueSystem);
          repaired = true;
          break;
      }
    }
    
    if (repaired) {
      // 保存修复后的数据
      this.updateCharacterData(character.id, character, 'auto_repair');
      this.stats.autoRepairs++;
      console.log(`✅ 角色 ${character.name} 数据修复完成`);
    }
    
    return character;
  }

  // =============== 数据管理接口补充 ===============
  
  /**
   * 添加已存在的角色到管理器
   */
  addCharacter(character) {
    if (!character || !character.id) {
      throw new DataManagerError('无效的角色对象', 'validation_error');
    }
    
    // 验证角色数据
    const validationResult = this.validateCompleteCharacter(character);
    if (!validationResult.isValid) {
      throw new DataManagerError('角色数据验证失败', 'validation_error', {
        errors: validationResult.errors
      });
    }
    
    // 分配版本号
    character._version = ++this.versionCounter;
    character._addedAt = Date.now();
    character._lastModified = Date.now();
    
    // 存储角色
    this.dataStore.set(character.id, character);
    this.gameEngine.characters.set(character.id, character);
    
    // 创建备份
    this.createBackup(character.id, character);
    
    // 通知添加事件
    this.notifyDataChange('character_added', {
      characterId: character.id,
      character: character,
      timestamp: Date.now()
    });
    
    console.log(`✅ 角色已添加到管理器: ${character.name}`);
    return character;
  }
  
  /**
   * 删除角色
   */
  removeCharacter(characterId) {
    const character = this.dataStore.get(characterId);
    if (!character) {
      throw new DataManagerError(`角色不存在: ${characterId}`, 'not_found');
    }
    
    // 创建删除前快照
    const snapshot = this.createSnapshot(character);
    
    // 从存储中移除
    this.dataStore.delete(characterId);
    this.gameEngine.characters.delete(characterId);
    
    // 保留备份（用于恢复）
    this.createBackup(`deleted_${characterId}_${Date.now()}`, snapshot);
    
    // 通知删除事件
    this.notifyDataChange('character_removed', {
      characterId,
      character: snapshot,
      timestamp: Date.now()
    });
    
    this.stats.deletedCount++;
    console.log(`🗑️ 角色已删除: ${character.name}`);
    return snapshot;
  }
  
  /**
   * 批量创建角色
   */
  async createMultipleCharacters(configs) {    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < configs.length; i++) {
      try {
        const character = await this.createCharacter(configs[i]);
        results.push(character);
      } catch (error) {
        errors.push({
          index: i,
          config: configs[i],
          error: error.message
        });
        console.error(`批量创建角色失败 [${i}]:`, error);
      }
    }
    
    return {
      success: results.length,
      failed: errors.length,
      results,
      errors
    };
  }
  
  /**
   * 批量更新角色
   */
  updateMultipleCharacters(updates) {
    const results = [];
    const errors = [];
    
    for (const update of updates) {
      try {
        const character = this.updateCharacterData(
          update.characterId, 
          update.data, 
          update.source || 'batch_update'
        );
        results.push(character);
      } catch (error) {
        errors.push({
          characterId: update.characterId,
          error: error.message
        });
        console.error(`批量更新角色失败 [${update.characterId}]:`, error);
      }
    }
    
    return {
      success: results.length,
      failed: errors.length,
      results,
      errors
    };
  }
  
  /**
   * 与游戏引擎同步
   */
  syncWithEngine() {
    
    if (this._isSyncing) return;
    this._isSyncing = true;

    // 从游戏引擎同步到数据管理器
    for (const [id, character] of this.gameEngine.characters) {
      if (!this.dataStore.has(id)) {
        this.dataStore.set(id, character);
        console.log(`🔄 同步角色到数据管理器: ${character.name}`);
      }
    }
    
    // 从数据管理器同步到游戏引擎
    for (const [id, character] of this.dataStore) {
      if (!this.gameEngine.characters.has(id) || this.gameEngine.characters.get(id) !== character) {
        this.gameEngine.characters.set(id, character);
        console.log(`🔄 同步角色到游戏引擎: ${character.name}`);
      }
    }
    
    this._isSyncing = false;
  }
  
  /**
   * 获取所有角色ID
   */
  getAllCharacterIds() {
    return Array.from(this.dataStore.keys()).filter(key => 
      this.dataStore.get(key)?.id // 确保是角色数据
    );
  }
  
  /**
   * 按条件查询角色
   */
  getCharactersByCondition(condition) {
    const results = [];
    
    for (const [id, character] of this.dataStore) {
      if (condition(character)) {
        results.push(character);
      }
    }
    
    return results;
  }
  
  /**
   * 按地点获取角色
   */
  getCharactersByLocation(location) {
    return this.getCharactersByCondition(char => 
      char.currentLocation === location
    );
  }
  
  /**
   * 按年龄范围获取角色
   */
  getCharactersByAgeRange(minAge, maxAge) {
    return this.getCharactersByCondition(char => 
      char.age >= minAge && char.age <= maxAge
    );
  }

  syncDataStores() {
    
    this.lastSyncTime = Date.now(); // 记录同步时间
    console.log('🔄 开始双向数据同步');
    
    // 1. 从游戏引擎同步到权威存储
    for (const [id, character] of this.gameEngine.characters) {
      if (!this.dataStore.has(id)) {
        this.dataStore.set(id, character);
        console.log(`📥 同步角色到权威存储: ${character.name || id}`);
      }
    }
    
    // 2. 从权威存储同步到游戏引擎
    for (const [id, character] of this.dataStore) {
      if (!this.gameEngine.characters.has(id)) {
        this.gameEngine.characters.set(id, character);
        console.log(`📤 同步角色到游戏引擎: ${character.name || id}`);
      }
    }
    
    console.log(`✅ 数据同步完成 - 权威存储: ${this.dataStore.size}个, 游戏引擎: ${this.gameEngine.characters.size}个`);
  }

  createSnapshot(data, source) {
    const snapshot = {
      data: this.removeCircularReferences(data),
      source: source,
      timestamp: Date.now(),
      version: this.versionCounter
    };
    return snapshot;
  }
  
  removeCircularReferences(obj) {
    const seen = new WeakSet();
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    }));
  }

  createBackup(id, data) {
    this.backupStore.set(`${id}_${Date.now()}`, this.createSnapshot(data));
    
    // 清理旧备份（保留最近10个）
    const backupKeys = Array.from(this.backupStore.keys())
      .filter(key => key.startsWith(id))
      .sort()
      .reverse();
    
    if (backupKeys.length > 10) {
      for (const oldKey of backupKeys.slice(10)) {
        this.backupStore.delete(oldKey);
      }
    }
  }

  notifyDataChange(event, data) {
    const listeners = this.listeners.get(event) || [];
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error(`数据变更监听器错误 (${event}):`, error);
      }
    }
  }

  invalidateCache(keys = []) {
    if (keys.length === 0) {
      this.cache.clear();
    } else {
      for (const key of keys) {
        this.cache.delete(key);
      }
    }
  }

  // =============== 事件监听接口 ===============

  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(listener);
  }

  off(event, listener) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // =============== 统计和诊断 ===============

  getStats() {
    return {
      ...this.stats,
      dataStoreSize: this.dataStore.size,
      backupStoreSize: this.backupStore.size,
      cacheSize: this.cache.size,
      loadedTables: this.dataTableManager.tables.size
    };
  }

  async generateRandomName(gender) {
    try {
      const nameConfig = await this.dataTableManager.getCharacterNamesConfig();
      // 这里可以根据CSV数据生成随机名字
      // 简化实现
      return gender === '男' ? '张明德' : '李淑慧';
    } catch (error) {
      console.warn('无法加载姓名配置，使用默认名字');
      return gender === '男' ? '王小明' : '李小红';
    }
  }
}

export default UnifiedDataManager;