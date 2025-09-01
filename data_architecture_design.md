# 南北朝坞堡模拟器 - 完整数据架构设计文档

## 📋 数据架构核心原则

### 1. 数据主权原则 (Data Sovereignty)
- **唯一数据源**：每个数据实体只有一个权威存储位置
- **引用传递**：所有模块共享同一数据对象引用，不创建副本
- **变更追踪**：所有数据变更都有明确的来源和时间戳

### 2. 生命周期完整性 (Lifecycle Integrity)
- **创建验证**：数据创建时必须通过完整性验证
- **持久化保护**：数据创建后立即持久化，防止丢失
- **更新同步**：数据更新时自动同步到所有相关模块
- **销毁清理**：数据销毁时清理所有引用和依赖

### 3. 一致性保证 (Consistency Guarantee)
- **事务性操作**：复杂数据操作要么全部成功要么全部回滚
- **并发控制**：防止同时修改导致的数据冲突
- **完整性约束**：确保数据关系的逻辑正确性

## 🏗️ 数据实体设计

### 核心数据实体
```javascript
// 1. 角色数据实体
interface CharacterDataEntity {
  // 核心标识
  id: string;
  version: number;
  createdAt: timestamp;
  lastUpdated: timestamp;
  
  // 基础信息（不可变数据）
  basicInfo: {
    name: string;
    gender: string;
    birthDate: timestamp;
    familyId: string;
    role: string;
  };
  
  // 动态状态（可变数据）
  dynamicState: {
    age: number;
    location: string;
    activity: string;
    goals: array;
  };
  
  // 子系统数据（复合数据）
  subsystems: {
    virtueSystem: VirtueSystemData;
    skillSystem: SkillSystemData;
    physicalState: PhysicalStateData;
    emotionalState: EmotionalStateData;
  };
  
  // 元数据
  metadata: {
    isValid: boolean;
    lastValidation: timestamp;
    dataIntegrity: object;
  };
}

// 2. 家族数据实体
interface FamilyDataEntity {
  id: string;
  familyName: string;
  version: number;
  
  structure: {
    generations: Map<generation, CharacterId[]>;
    relationships: Map<relationshipId, RelationshipData>;
    hierarchy: TreeStructure;
  };
  
  properties: {
    reputation: number;
    wealth: number;
    influence: number;
    traditions: string[];
  };
  
  metadata: {
    memberCount: number;
    createdAt: timestamp;
    lastRestructure: timestamp;
  };
}

// 3. 资源数据实体
interface ResourceDataEntity {
  type: string;
  category: string;
  
  inventory: {
    current: number;
    maximum: number;
    reserved: number;
    available: number;
  };
  
  flow: {
    production: ProductionData[];
    consumption: ConsumptionData[];
    trade: TradeData[];
  };
  
  metadata: {
    lastUpdate: timestamp;
    trend: string;
    forecast: number;
  };
}
```

## 🔄 数据流控制层

### 1. 数据创建控制器 (DataCreationController)
```javascript
class DataCreationController {
  constructor(gameEngine, configManager, validationService) {
    this.gameEngine = gameEngine;
    this.config = configManager;
    this.validator = validationService;
    this.creationLog = new Map();
  }
  
  // 角色数据创建
  async createCharacterData(creationConfig) {
    // 1. 预验证配置
    const validatedConfig = await this.validator.validateCreationConfig(creationConfig);
    
    // 2. 创建基础对象
    const character = new Character(validatedConfig.basicInfo);
    
    // 3. 创建子系统数据
    const subsystemPromises = [
      this.createVirtueSystemData(character.id, validatedConfig.virtueConfig),
      this.createSkillSystemData(character.id, validatedConfig.skillConfig),
      this.createPhysicalStateData(character.id, validatedConfig.physicalConfig),
      this.createEmotionalStateData(character.id, validatedConfig.emotionalConfig)
    ];
    
    const [virtueSystem, skillSystem, physicalState, emotionalState] = 
      await Promise.all(subsystemPromises);
    
    // 4. 绑定子系统
    character.virtueSystem = virtueSystem;
    character.skillSystem = skillSystem;
    character.physicalState = physicalState;
    character.emotionalState = emotionalState;
    
    // 5. 完整性验证
    const validationResult = await this.validator.validateCompleteCharacter(character);
    if (!validationResult.isValid) {
      throw new DataCreationError(validationResult.errors);
    }
    
    // 6. 持久化保存
    await this.persistenceController.saveCharacterData(character);
    
    // 7. 注册到游戏引擎
    this.gameEngine.characters.set(character.id, character);
    
    // 8. 记录创建日志
    this.creationLog.set(character.id, {
      config: validatedConfig,
      result: character,
      timestamp: Date.now()
    });
    
    return character;
  }
  
  createVirtueSystemData(characterId, config) {
    const virtueSystem = new VirtueSystem(characterId, config);
    
    // 确保数据结构完整
    if (!(virtueSystem.virtues instanceof Map) || !(virtueSystem.traits instanceof Map)) {
      throw new DataStructureError('德行系统Map结构初始化失败');
    }
    
    return virtueSystem;
  }
}
```

### 2. 数据持久化控制器 (DataPersistenceController)
```javascript
class DataPersistenceController {
  constructor(gameEngine, stateManager) {
    this.gameEngine = gameEngine;
    this.stateManager = stateManager;
    this.saveQueue = new Map();
    this.backupScheduler = new BackupScheduler();
  }
  
  // 实时保存机制
  saveCharacterData(character, saveType = 'immediate') {
    const saveOperation = {
      entityType: 'character',
      entityId: character.id,
      data: this.serializeCharacterData(character),
      timestamp: Date.now(),
      saveType: saveType
    };
    
    switch (saveType) {
      case 'immediate':
        return this.executeSaveOperation(saveOperation);
      case 'batched':
        this.saveQueue.set(character.id, saveOperation);
        return this.scheduleBatchSave();
      case 'background':
        return this.scheduleBackgroundSave(saveOperation);
    }
  }
  
  serializeCharacterData(character) {
    return {
      basicInfo: character.getBasicInfo(),
      virtueSystem: character.virtueSystem?.exportData() || null,
      skillSystem: character.skillSystem?.exportData() || null,
      physicalState: character.physicalState?.getState() || null,
      emotionalState: character.emotionalState?.getState() || null,
      relationships: character.relationshipSystem?.exportData() || null,
      serializedAt: Date.now()
    };
  }
  
  // 批量保存优化
  executeBatchSave() {
    const operations = Array.from(this.saveQueue.values());
    this.saveQueue.clear();
    
    return Promise.all(operations.map(op => this.executeSaveOperation(op)));
  }
}
```

### 3. 数据传递控制器 (DataTransferController)
```javascript
class DataTransferController {
  constructor(gameEngine, validationService) {
    this.gameEngine = gameEngine;
    this.validator = validationService;
    this.transferLog = new Map();
    this.integrityChecker = new DataIntegrityChecker();
  }
  
  // 安全的数据传递
  transferCharacterToUI(characterId) {
    // 1. 从权威源获取数据
    const character = this.gameEngine.characters.get(characterId);
    
    if (!character) {
      throw new DataNotFoundError(`角色 ${characterId} 不存在`);
    }
    
    // 2. 完整性检查
    const integrityResult = this.integrityChecker.checkCharacter(character);
    
    if (!integrityResult.isValid) {
      // 尝试自动修复
      const repairResult = this.autoRepairCharacterData(character, integrityResult.issues);
      
      if (!repairResult.success) {
        throw new DataIntegrityError(`角色 ${characterId} 数据损坏且无法修复`);
      }
    }
    
    // 3. 记录传递日志
    this.transferLog.set(characterId, {
      timestamp: Date.now(),
      destination: 'UI',
      dataVersion: character.version
    });
    
    // 4. 返回原始对象引用
    return character;
  }
  
  autoRepairCharacterData(character, issues) {
    const repairResults = [];
    
    for (const issue of issues) {
      switch (issue.type) {
        case 'missing_virtue_system':
          character.virtueSystem = this.createDefaultVirtueSystem(character.id);
          repairResults.push({ issue: issue.type, status: 'repaired' });
          break;
          
        case 'invalid_virtue_structure':
          character.virtueSystem = this.rebuildVirtueSystem(character);
          repairResults.push({ issue: issue.type, status: 'rebuilt' });
          break;
          
        case 'missing_methods':
          this.addMissingMethods(character.virtueSystem);
          repairResults.push({ issue: issue.type, status: 'methods_added' });
          break;
      }
    }
    
    return {
      success: repairResults.every(r => r.status !== 'failed'),
      repairs: repairResults
    };
  }
}
```

### 4. 数据更新控制器 (DataUpdateController)
```javascript
class DataUpdateController {
  constructor(gameEngine, eventBus, persistenceController) {
    this.gameEngine = gameEngine;
    this.eventBus = eventBus;
    this.persistence = persistenceController;
    this.updateQueue = new Map();
    this.conflictResolver = new DataConflictResolver();
  }
  
  // 线程安全的数据更新
  async updateCharacterVirtue(characterId, updateData, updateContext) {
    // 1. 获取更新锁
    const updateLock = await this.acquireUpdateLock(characterId);
    
    try {
      // 2. 获取最新数据
      const character = this.gameEngine.characters.get(characterId);
      
      if (!character?.virtueSystem) {
        throw new DataUpdateError('德行系统不存在，无法更新');
      }
      
      // 3. 记录更新前状态
      const beforeSnapshot = character.virtueSystem.createSnapshot();
      
      // 4. 执行更新操作
      const updateResult = character.virtueSystem.processUpdate(updateData, updateContext);
      
      // 5. 验证更新结果
      const validationResult = this.validator.validateVirtueUpdate(character.virtueSystem);
      
      if (!validationResult.isValid) {
        // 回滚到更新前状态
        character.virtueSystem.restoreFromSnapshot(beforeSnapshot);
        throw new DataUpdateError(validationResult.errors);
      }
      
      // 6. 持久化更新
      await this.persistence.saveCharacterData(character);
      
      // 7. 通知相关模块
      this.eventBus.emit('characterVirtueUpdated', {
        characterId,
        beforeSnapshot,
        afterSnapshot: character.virtueSystem.createSnapshot(),
        updateContext
      });
      
      return updateResult;
      
    } finally {
      // 8. 释放更新锁
      this.releaseUpdateLock(characterId, updateLock);
    }
  }
}
```

### 5. 数据验证服务 (DataValidationService)
```javascript
class DataValidationService {
  // 角色数据完整性验证
  validateCompleteCharacter(character) {
    const validationChecks = [
      this.checkBasicInfo(character),
      this.checkVirtueSystem(character.virtueSystem),
      this.checkSkillSystem(character.skillSystem),
      this.checkPhysicalState(character.physicalState),
      this.checkEmotionalState(character.emotionalState)
    ];
    
    const results = validationChecks.map(check => check.execute());
    const isValid = results.every(result => result.isValid);
    
    return {
      isValid,
      results,
      errors: results.filter(r => !r.isValid).map(r => r.error)
    };
  }
  
  checkVirtueSystem(virtueSystem) {
    return {
      execute: () => {
        if (!virtueSystem) {
          return { isValid: false, error: 'VirtueSystem不存在' };
        }
        
        if (!(virtueSystem.virtues instanceof Map)) {
          return { isValid: false, error: 'virtues不是Map对象' };
        }
        
        if (!(virtueSystem.traits instanceof Map)) {
          return { isValid: false, error: 'traits不是Map对象' };
        }
        
        if (typeof virtueSystem.getDominantVirtues !== 'function') {
          return { isValid: false, error: 'getDominantVirtues方法缺失' };
        }
        
        if (typeof virtueSystem.getPersonalityTraits !== 'function') {
          return { isValid: false, error: 'getPersonalityTraits方法缺失' };
        }
        
        return { isValid: true };
      }
    };
  }
}
```

## 🎯 统一数据管理器设计

### 核心管理器接口
```javascript
class UnifiedDataManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    
    // 子控制器
    this.creation = new DataCreationController(this);
    this.persistence = new DataPersistenceController(this);
    this.transfer = new DataTransferController(this);
    this.update = new DataUpdateController(this);
    this.validation = new DataValidationService(this);
    
    // 数据监控
    this.monitor = new DataIntegrityMonitor(this);
    this.backup = new DataBackupManager(this);
    
    // 数据缓存
    this.cache = new DataCacheManager(this);
    
    this.initialize();
  }
  
  initialize() {
    // 启动数据监控
    this.monitor.startMonitoring();
    
    // 设置自动备份
    this.backup.scheduleRegularBackups();
    
    // 注册事件监听
    this.setupEventListeners();
  }
  
  // =========================
  // 角色数据管理接口
  // =========================
  
  async createCharacter(config) {
    return await this.creation.createCharacterData(config);
  }
  
  getCharacter(characterId) {
    return this.transfer.transferCharacterToUI(characterId);
  }
  
  getAllCharacters() {
    return this.transfer.getAllCharactersForUI();
  }
  
  async updateCharacterVirtue(characterId, behaviorType, intensity, context) {
    return await this.update.updateCharacterVirtue(characterId, behaviorType, intensity, context);
  }
  
  saveCharacter(character, saveType = 'immediate') {
    return this.persistence.saveCharacterData(character, saveType);
  }
  
  // =========================
  // 家族数据管理接口
  // =========================
  
  async createFamily(familyConfig) {
    return await this.creation.createFamilyData(familyConfig);
  }
  
  getFamily(familyId) {
    return this.transfer.transferFamilyToUI(familyId);
  }
  
  updateFamilyRelationship(familyId, relationshipData) {
    return this.update.updateFamilyRelationship(familyId, relationshipData);
  }
  
  // =========================
  // 资源数据管理接口
  // =========================
  
  getResource(resourceType) {
    return this.transfer.transferResourceToUI(resourceType);
  }
  
  updateResourceInventory(resourceType, change, source) {
    return this.update.updateResourceInventory(resourceType, change, source);
  }
  
  // =========================
  // 数据完整性管理
  // =========================
  
  async validateAllData() {
    const results = {
      characters: await this.validateAllCharacters(),
      families: await this.validateAllFamilies(),
      resources: await this.validateAllResources(),
      overall: { isValid: true, errors: [] }
    };
    
    results.overall.isValid = 
      results.characters.isValid && 
      results.families.isValid && 
      results.resources.isValid;
      
    return results;
  }
  
  async repairAllData() {
    const repairResults = {
      characters: await this.repairAllCharacterData(),
      families: await this.repairAllFamilyData(),
      resources: await this.repairAllResourceData()
    };
    
    return repairResults;
  }
}
```

## 🔧 具体实施计划

### 第一阶段：数据管理器核心
1. **创建 `unified_data_manager.js`**
   - 实现统一数据管理器
   - 建立标准化的数据操作接口
   - 添加数据完整性验证

### 第二阶段：数据控制器
1. **创建 `data_creation_controller.js`**
   - 标准化数据创建流程
   - 添加创建时验证机制
   
2. **创建 `data_persistence_controller.js`**
   - 统一数据持久化机制
   - 实现多级备份策略
   
3. **创建 `data_transfer_controller.js`**
   - 安全的数据传递机制
   - 引用完整性保护

### 第三阶段：模块重构
1. **重构 `game_engine.js`**
   - 集成 UnifiedDataManager
   - 移除直接数据操作代码
   
2. **重构 `character_generator.js`**
   - 使用 DataCreationController
   - 标准化角色创建流程
   
3. **重构 `game_interface.js`**
   - 使用 DataTransferController
   - 实现安全数据读取

### 第四阶段：完整性监控
1. **创建 `data_integrity_monitor.js`**
   - 实时数据完整性监控
   - 自动修复机制
   
2. **创建 `data_backup_manager.js`**
   - 自动备份策略
   - 数据恢复机制

## 📋 修改清单

### 需要创建的新文件
- `unified_data_manager.js` - 统一数据管理器
- `data_creation_controller.js` - 数据创建控制器
- `data_persistence_controller.js` - 数据持久化控制器
- `data_transfer_controller.js` - 数据传递控制器
- `data_update_controller.js` - 数据更新控制器
- `data_validation_service.js` - 数据验证服务
- `data_integrity_monitor.js` - 数据完整性监控
- `data_backup_manager.js` - 数据备份管理器

### 需要重构的现有文件
- `game_engine.js` - 集成统一数据管理器
- `character_generator.js` - 使用标准化创建接口
- `game_interface.js` - 使用安全传递接口
- `ui_components.js` - 使用验证读取机制

### 需要删除的临时代码
- `index.html` 中的守护进程代码
- 所有临时修复和补丁代码
- 重复的数据恢复逻辑

## 🎯 实施决策

**现在需要你决定：**

1. **立即开始实施** - 创建第一个文件 `unified_data_manager.js`
2. **继续细化设计** - 补充更多技术细节和边界情况处理
3. **先做现有架构分析** - 详细分析当前代码中的数据流问题

**你选择哪个方向？**