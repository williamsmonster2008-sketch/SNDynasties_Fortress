# 南北朝坞堡模拟器 - 统一数据架构设计方案

## 🎯 核心问题分析

**当前架构的根本问题：**
1. **数据权威性混乱** - 没有唯一的数据源，多处数据创建和修改
2. **生命周期管理缺失** - 数据创建后缺乏持续的完整性保护
3. **传递机制不一致** - 有时拷贝对象，有时传递引用，导致数据不同步
4. **验证和修复分散** - 各个模块都在做数据验证，但没有统一标准

## 🏗️ 新架构核心原则

### 1. 单一数据源原则 (Single Source of Truth)
- 每个数据实体只在 `GameEngine` 中有唯一权威存储
- 所有其他模块只能通过 `DataManager` 访问数据
- 禁止任何模块直接修改数据对象

### 2. 数据不变性原则 (Data Immutability)  
- 数据修改必须通过 `DataManager` 的标准接口
- 每次修改生成新的版本号和时间戳
- 自动保存到多个备份位置

### 3. 实时一致性原则 (Real-time Consistency)
- 数据修改后立即通知所有相关模块
- UI组件自动同步最新数据状态
- 异常时自动回滚到上一个有效状态

## 📊 统一数据管理器架构

```javascript
// 核心数据管理器
class UnifiedDataManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.dataStore = new Map(); // 所有数据的唯一存储
    this.validators = new Map(); // 数据验证器
    this.listeners = new Map();  // 数据变更监听器
    this.backupStore = new Map(); // 备份存储
    this.versionCounter = 0;
  }

  // =============== 数据创建接口 ===============
  
  createCharacter(config) {
    // 1. 数据验证
    const validatedConfig = this.validateCharacterConfig(config);
    
    // 2. 创建完整角色对象
    const character = this.buildCompleteCharacter(validatedConfig);
    
    // 3. 分配版本号
    character._version = ++this.versionCounter;
    character._createdAt = Date.now();
    character._lastModified = Date.now();
    
    // 4. 存储到权威位置
    this.dataStore.set(character.id, character);
    this.gameEngine.characters.set(character.id, character);
    
    // 5. 创建备份
    this.createBackup(character.id, character);
    
    // 6. 通知创建事件
    this.notifyDataChange('character_created', {
      characterId: character.id,
      character: character
    });
    
    return character;
  }
  
  // =============== 数据读取接口 ===============
  
  getCharacter(characterId) {
    // 1. 从权威存储获取
    let character = this.dataStore.get(characterId);
    
    if (!character) {
      throw new DataNotFoundError(`角色 ${characterId} 不存在`);
    }
    
    // 2. 完整性验证
    const validationResult = this.validateCharacterIntegrity(character);
    
    if (!validationResult.isValid) {
      // 3. 尝试自动修复
      character = this.autoRepairCharacter(character, validationResult.issues);
      
      // 4. 修复后重新保存
      this.updateCharacterData(characterId, character, 'auto_repair');
    }
    
    return character;
  }
  
  // =============== 数据更新接口 ===============
  
  updateCharacterData(characterId, updateData, source = 'manual') {
    // 1. 获取当前数据
    const currentCharacter = this.getCharacter(characterId);
    
    // 2. 创建快照
    const snapshot = this.createSnapshot(currentCharacter);
    
    // 3. 应用更新
    const updatedCharacter = this.applyUpdate(currentCharacter, updateData);
    
    // 4. 验证更新结果
    const validationResult = this.validateCharacterIntegrity(updatedCharacter);
    
    if (!validationResult.isValid) {
      // 回滚到快照状态
      this.restoreFromSnapshot(characterId, snapshot);
      throw new DataUpdateError('数据更新验证失败');
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
    
    // 8. 通知更新事件
    this.notifyDataChange('character_updated', {
      characterId,
      before: snapshot,
      after: updatedCharacter,
      source
    });
    
    return updatedCharacter;
  }
}
```

## 🔧 完整的角色构建流程

```javascript
// 构建完整角色对象
buildCompleteCharacter(config) {
  // 1. 创建基础角色
  const character = new Character(config);
  
  // 2. 创建并绑定德行系统
  character.virtueSystem = new VirtueSystem(character.id, {
    virtues: this.generateInitialVirtues(config),
    traits: this.generateInitialTraits(config)
  });
  
  // 3. 验证德行系统完整性
  this.ensureVirtueSystemMethods(character.virtueSystem);
  
  // 4. 创建并绑定其他系统
  character.skillSystem = new SkillSystem(character.id);
  character.physicalState = new PhysicalState(character.id);
  character.emotionalState = new EmotionalState(character.id);
  
  // 5. 建立系统间的关联
  this.linkCharacterSystems(character);
  
  // 6. 最终验证
  this.validateCompleteCharacter(character);
  
  return character;
}

// 确保德行系统方法完整性
ensureVirtueSystemMethods(virtueSystem) {
  const requiredMethods = [
    'getDominantVirtues',
    'getPersonalityTraits', 
    'getOverallRating',
    'applyBehaviorEffect',
    'exportData',
    'createSnapshot',
    'restoreFromSnapshot'
  ];
  
  for (const method of requiredMethods) {
    if (typeof virtueSystem[method] !== 'function') {
      // 动态添加缺失的方法
      virtueSystem[method] = this.getDefaultMethod(method);
      console.warn(`⚠️ 德行系统缺失方法 ${method}，已自动添加`);
    }
  }
}
```

## 🔄 数据传递和同步机制

```javascript
// 数据传递控制器
class DataTransferController {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.activeReferences = new Map(); // 跟踪活跃的数据引用
  }
  
  // 安全的数据传递给UI
  transferToUI(dataType, dataId) {
    switch (dataType) {
      case 'character':
        return this.transferCharacterToUI(dataId);
      case 'characters':
        return this.transferAllCharactersToUI();
      default:
        throw new Error(`不支持的数据类型: ${dataType}`);
    }
  }
  
  transferCharacterToUI(characterId) {
    // 1. 从数据管理器获取最新数据
    const character = this.dataManager.getCharacter(characterId);
    
    // 2. 记录引用
    this.activeReferences.set(characterId, {
      lastAccess: Date.now(),
      version: character._version,
      uiComponent: 'CharacterCard'
    });
    
    // 3. 返回原始对象引用（不拷贝）
    return character;
  }
  
  transferAllCharactersToUI() {
    const characters = [];
    
    for (const characterId of this.dataManager.getAllCharacterIds()) {
      characters.push(this.transferCharacterToUI(characterId));
    }
    
    return characters;
  }
}
```

## 🛡️ 数据完整性保护系统

```javascript
// 数据完整性监控器
class DataIntegrityMonitor {
  constructor(dataManager) {
    this.dataManager = dataManager;
    this.checkInterval = 5000; // 5秒检查一次
    this.repairLog = [];
  }
  
  startMonitoring() {
    setInterval(() => {
      this.performIntegrityCheck();
    }, this.checkInterval);
    
    console.log('🔍 数据完整性监控已启动');
  }
  
  performIntegrityCheck() {
    const allCharacters = this.dataManager.getAllCharacters();
    
    for (const [characterId, character] of allCharacters) {
      const issues = this.checkCharacterIntegrity(character);
      
      if (issues.length > 0) {
        console.warn(`🚨 发现角色 ${character.name} 数据问题:`, issues);
        this.repairCharacterIssues(characterId, character, issues);
      }
    }
  }
  
  checkCharacterIntegrity(character) {
    const issues = [];
    
    // 检查德行系统
    if (!character.virtueSystem) {
      issues.push({ type: 'missing_virtue_system', severity: 'critical' });
    } else {
      if (!(character.virtueSystem.virtues instanceof Map)) {
        issues.push({ type: 'invalid_virtues_structure', severity: 'high' });
      }
      
      if (typeof character.virtueSystem.getDominantVirtues !== 'function') {
        issues.push({ type: 'missing_methods', method: 'getDominantVirtues', severity: 'high' });
      }
    }
    
    // 检查基础数据
    if (!character.name || !character.id) {
      issues.push({ type: 'missing_basic_data', severity: 'critical' });
    }
    
    return issues;
  }
  
  repairCharacterIssues(characterId, character, issues) {
    let repaired = false;
    
    for (const issue of issues) {
      switch (issue.type) {
        case 'missing_virtue_system':
          character.virtueSystem = new VirtueSystem(characterId);
          repaired = true;
          break;
          
        case 'missing_methods':
          this.dataManager.ensureVirtueSystemMethods(character.virtueSystem);
          repaired = true;
          break;
          
        case 'invalid_virtues_structure':
          this.rebuildVirtueSystemStructure(character.virtueSystem);
          repaired = true;
          break;
      }
    }
    
    if (repaired) {
      this.dataManager.updateCharacterData(characterId, character, 'integrity_repair');
      this.repairLog.push({
        characterId,
        issues,
        repairedAt: Date.now()
      });
      
      console.log(`✅ 已修复角色 ${character.name} 的数据问题`);
    }
  }
}
```

## 📋 具体实施步骤

### 第一步：创建统一数据管理器
1. 创建 `unified_data_manager.js` 文件
2. 实现完整的数据 CRUD 接口
3. 添加数据验证和修复机制

### 第二步：重构游戏引擎
1. 修改 `game_engine.js`，集成 `UnifiedDataManager`
2. 移除所有直接的数据操作代码
3. 所有数据访问通过 `dataManager` 进行

### 第三步：修改角色生成器  
1. 重构 `character_generator.js`
2. 使用 `dataManager.createCharacter()` 接口
3. 确保德行系统的完整初始化

### 第四步：更新界面系统
1. 修改 `game_interface.js`，使用 `dataManager.getCharacter()`
2. 确保 UI 组件获取的是最新数据引用
3. 移除所有临时修复代码

### 第五步：部署数据监控
1. 启动数据完整性监控
2. 移除 `index.html` 中的临时守护进程
3. 建立自动备份和恢复机制

## ✅ 实施后的预期效果

1. **数据一致性 100%** - 所有模块看到的都是同一份数据
2. **自动错误修复** - 数据问题自动检测和修复
3. **性能提升** - 减少数据拷贝和验证开销
4. **维护简化** - 统一的数据管理，问题容易定位和解决

## 📊 静态数据表设计

### 外部化配置原则
你说得对！静态数据应该从代码中分离，使用表格形式存储。这样便于：
- 游戏平衡调整
- 内容扩充
- 数据版本管理
- 非程序员也能修改

### 数据格式选择对比

#### 1. JSON格式 (推荐用于配置)
**优点：** 结构化、支持嵌套、JavaScript原生支持  
**缺点：** 不适合大量表格数据
```json
{
  "virtueCategories": {
    "仁": { "name": "仁德", "traits": [...] }
  }
}
```

#### 2. CSV格式 (推荐用于数据表)
**优点：** Excel可编辑、体积小、适合大量数据  
**缺点：** 只支持平面结构
```csv
virtue_id,virtue_name,trait_name,negative_desc,positive_desc,weight
ren,仁德,相爱倾向,不易坠入爱河,容易产生爱意,1.0
```

#### 3. TOML格式 (推荐用于配置)
**优点：** 人类可读性强、注释友好、配置管理优秀  
**缺点：** 需要解析器
```toml
[virtue_system.仁]
name = "仁德"
description = "仁者爱人，关乎情感与人际"

[[virtue_system.仁.traits]]
name = "相爱倾向"
negative = "不易坠入爱河"
positive = "容易产生爱意"
weight = 1.0
```

#### 4. YAML格式 (推荐用于复杂配置)
**优点：** 人类可读、支持注释、结构清晰  
**缺点：** 缩进敏感
```yaml
virtue_system:
  仁:
    name: "仁德" 
    description: "仁者爱人，关乎情感与人际"
    traits:
      - name: "相爱倾向"
        negative: "不易坠入爱河"
        positive: "容易产生爱意"
        weight: 1.0
```

### 推荐的混合方案

#### 数据表文件结构
```
/data_tables/
  ├── config/                    // 复杂配置文件
  │   ├── virtue_system.yaml     // 德行系统配置 (YAML)
  │   ├── skill_system.toml      // 技能系统配置 (TOML)  
  │   └── balance_config.toml    // 游戏平衡参数 (TOML)
  ├── data/                      // 数据表文件
  │   ├── character_names.csv    // 南北朝姓名库 (CSV)
  │   ├── location_configs.csv   // 地点配置 (CSV)
  │   └── event_templates.csv    // 事件模板 (CSV)
  └── json/                      // JSON备用格式
      ├── virtue_system.json     // 德行系统 (JSON备份)
      └── character_names.json   // 姓名库 (JSON备份)
```

### 通用数据表加载器

```javascript
class DataTableManager {
  constructor() {
    this.tables = new Map();
    this.parsers = {
      json: (text) => JSON.parse(text),
      csv: (text) => this.parseCSV(text),
      yaml: (text) => this.parseYAML(text), // 需要引入yaml解析库
      toml: (text) => this.parseTOML(text)  // 需要引入toml解析库
    };
  }

  async loadTable(fileName, format = 'auto') {
    if (this.tables.has(fileName)) {
      return this.tables.get(fileName);
    }

    // 自动检测格式
    if (format === 'auto') {
      format = this.detectFormat(fileName);
    }

    const response = await fetch(`/data_tables/${this.getFilePath(fileName, format)}`);
    const text = await response.text();
    
    const parser = this.parsers[format];
    if (!parser) {
      throw new Error(`不支持的格式: ${format}`);
    }

    const data = parser(text);
    this.tables.set(fileName, data);
    return data;
  }

  // CSV解析器
  parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
  }

  // 检测文件格式
  detectFormat(fileName) {
    if (fileName.endsWith('.csv')) return 'csv';
    if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) return 'yaml';
    if (fileName.endsWith('.toml')) return 'toml';
    return 'json'; // 默认JSON
  }

  getFilePath(fileName, format) {
    const formatDirs = {
      csv: 'data/',
      yaml: 'config/',
      toml: 'config/',
      json: 'json/'
    };
    return `${formatDirs[format] || ''}${fileName}`;
  }
}
```

### CSV格式示例

#### character_names.csv
```csv
period,social_class,surname_type,surname,gender,name_type,name,meaning,frequency
南北朝,门阀士族,五姓七望,李,男,文雅,明德,光明德行,high
南北朝,门阀士族,五姓七望,李,男,武勇,建功,建立功业,medium
南北朝,胡族,复姓,慕容,男,尊贵,雄霸,雄才霸业,rare
南北朝,平民,单姓,张,女,美德,淑慧,淑女智慧,high
```

#### virtue_traits.csv  
```csv
virtue_id,virtue_name,trait_id,trait_name,negative_desc,positive_desc,weight,initial_min,initial_max,stability
ren,仁德,compassion,相爱倾向,不易坠入爱河,容易产生爱意,1.0,-20,20,0.6
ren,仁德,anti_hate,抑憎倾向,易生仇恨,不易憎恨,1.2,-30,30,0.7
yi,义德,gratitude,感恩倾向,不知感恩,知恩图报,1.1,-25,25,0.5
```

### YAML格式示例

#### virtue_system.yaml
```yaml
# 南北朝德行系统配置
virtue_categories:
  仁:
    name: "仁德"
    description: "仁者爱人，关乎情感与人际"
    color: "#FF6B6B"
    importance: 9
    traits:
      - id: "compassion_tendency"
        name: "相爱倾向"
        negative: "不易坠入爱河"
        positive: "容易产生爱意"
        weight: 1.0
        stability: 0.6
        initial_range: [-20, 20]
        
  义:
    name: "义德" 
    description: "义者宜也，关乎道德与责任"
    color: "#4ECDC4"
    importance: 10
    traits:
      - id: "gratitude_tendency"
        name: "感恩倾向"
        negative: "不知感恩"
        positive: "知恩图报"
        weight: 1.1

# 行为对德行的影响
behavior_effects:
  帮助他人:
    仁:
      相爱倾向: 2
      利他倾向: 3
    义:
      担责倾向: 1
  读书学习:
    智:
      好奇倾向: 2
      专注倾向: 1
```

### TOML格式示例

#### balance_config.toml
```toml
# 游戏平衡配置文件
title = "南北朝坞堡模拟器平衡参数"
version = "1.0.0"

[skill_learning]
base_learn_rate = 1.0
mastery_threshold = 80
teaching_effectiveness = 0.8
practice_bonus = 1.2
age_decay_factor = 0.05

[relationships] 
familiarity_gain_rate = 1.0
compatibility_influence = 0.6
conflict_decay_rate = 0.1
marriage_threshold = 70
friendship_threshold = 60

[production]
base_efficiency = 1.0
skill_bonus = 0.02
weather_modifier = 0.3
tool_bonus = 0.2
teamwork_bonus = 0.1

# 季节性修正
[seasonal_modifiers.spring]
farming_bonus = 1.2
construction_bonus = 1.1
trade_bonus = 0.9

[seasonal_modifiers.summer] 
farming_bonus = 1.3
construction_bonus = 1.0
trade_bonus = 1.1
```

### 数据验证和热更新
```javascript
class ConfigValidator {
  static validateVirtueConfig(config) {
    // 验证德行配置的完整性和合理性
    const errors = [];
    
    if (!config.virtueCategories) {
      errors.push('缺少德行分类配置');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  static validateCharacterNameConfig(config) {
    // 验证姓名配置
    // ...
  }
}

// 支持热更新
class HotReloadManager {
  constructor(dataTableManager) {
    this.dataTableManager = dataTableManager;
    this.watchers = new Map();
  }

  startWatching(tableName) {
    // 监控文件变化，自动重新加载
    // (在开发环境中使用)
  }
}
```

**准备开始实施这个完整方案吗？包括：**
1. **统一数据管理器** - 解决数据流问题
2. **静态数据表** - 外部化配置数据
3. **数据验证系统** - 确保数据质量

**我将创建第一个文件 `unified_data_manager.js`。**