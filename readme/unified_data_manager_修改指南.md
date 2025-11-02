# unified_data_manager.js 修改指南 - 集成Phase 1新数据表

> **目标**: 添加locations.json、behavior_patterns.json、interaction_patterns.json的加载支持

---

## 📝 修改步骤

### 步骤1: 在 DataTableManager 类中添加新的便捷方法

**位置**: `DataTableManager` 类的底部，已有的 `getGenerationNameConfig()` 方法后面

**添加代码**:

```javascript
// ============ Phase 1 新增数据表加载方法 ============

/**
 * 获取地点配置
 */
async getLocations() {
  return await this.loadTable('locations', 'json');
}

/**
 * 获取行为模式配置
 */
async getBehaviorPatterns() {
  // 注意: 这个方法已存在，保留原样或确保返回新的behavior_patterns.json
  return await this.loadTable('behavior_patterns', 'json');
}

/**
 * 获取互动模式配置  
 */
async getInteractionPatterns() {
  return await this.loadTable('interaction_patterns', 'json');
}
```

**说明**: 
- `getLocations()` - 新方法
- `getBehaviorPatterns()` - 可能已存在，确认是否指向正确文件
- `getInteractionPatterns()` - 新方法

---

### 步骤2: 扩展 DataValidator 类 - 添加新的校验规则

**位置**: `DataValidator` 类的 `setupDefaultValidators()` 方法内

**在现有的 `virtueSystem` 校验器后添加**:

```javascript
// ============ Phase 1 新增数据校验器 ============

// 地点数据校验器
this.validators.set('location', {
  required: ['id', 'name', 'category', 'capacity', 'allowedActions'],
  types: {
    id: 'string',
    name: 'string',
    displayName: 'string',
    category: 'string',
    description: 'string',
    capacity: 'object',
    attributes: 'object',
    allowedActions: 'array',
    connections: 'array',
    movementCost: 'number',
    isPublic: 'boolean',
    requiresOwnership: 'boolean'
  },
  constraints: {
    // ID必须是小写字母+数字+下划线
    id: (value) => /^[a-z_0-9]+$/.test(value),
    // 名称长度限制
    name: (value) => value.length > 0 && value.length <= 20,
    // 类别枚举
    category: (value) => ['residence', 'production', 'social', 'religious', 'commercial'].includes(value),
    // 移动成本范围
    movementCost: (value) => value >= 1 && value <= 10,
    // allowedActions不能为空
    allowedActions: (arr) => Array.isArray(arr) && arr.length > 0
  }
});

// 行为模式校验器
this.validators.set('behavior', {
  required: ['id', 'name', 'category', 'requirements', 'effects', 'duration', 'validLocations'],
  types: {
    id: 'string',
    name: 'string',
    displayName: 'string',
    category: 'string',
    description: 'string',
    requirements: 'object',
    effects: 'object',
    duration: 'object',
    validLocations: 'array',
    validTimeOfDay: 'array',
    priority: 'number',
    canBeInterrupted: 'boolean',
    mutuallyExclusive: 'array',
    tags: 'array'
  },
  constraints: {
    // ID必须是小写字母+下划线
    id: (value) => /^[a-z_]+$/.test(value),
    // 名称长度
    name: (value) => value.length > 0 && value.length <= 20,
    // 类别枚举
    category: (value) => ['physiological', 'production', 'social', 'religious', 'entertainment', 'crime'].includes(value),
    // 优先级范围
    priority: (value) => value >= 0 && value <= 100,
    // validLocations不能为空
    validLocations: (arr) => Array.isArray(arr) && arr.length > 0
  }
});

// 互动模式校验器
this.validators.set('interaction', {
  required: ['id', 'name', 'category', 'participantRequirements', 'phases', 'outcomes', 'duration'],
  types: {
    id: 'string',
    name: 'string',
    displayName: 'string',
    category: 'string',
    description: 'string',
    participantRequirements: 'object',
    relationshipRequirements: 'object',
    validLocations: 'array',
    validTimeOfDay: 'array',
    phases: 'array',
    outcomes: 'object',
    duration: 'number',
    priority: 'number',
    canBeRejected: 'boolean',
    interruptible: 'boolean',
    tags: 'array'
  },
  constraints: {
    // ID必须是小写字母+下划线
    id: (value) => /^[a-z_]+$/.test(value),
    // 名称长度
    name: (value) => value.length > 0,
    // 类别枚举
    category: (value) => ['social_basic', 'cooperation', 'conflict', 'social_entertainment', 'romance'].includes(value),
    // 时长限制(分钟)
    duration: (value) => value > 0 && value <= 1440,
    // 优先级范围
    priority: (value) => value >= 0 && value <= 100,
    // phases至少有1个阶段
    phases: (arr) => Array.isArray(arr) && arr.length > 0
  }
});
```

---

### 步骤3: 在 DataTableManager 的 loadTable 方法中添加自动校验

**位置**: `DataTableManager._loadTableFromFile()` 方法的最后，`return parser(text);` 之前

**修改为**:

```javascript
async _loadTableFromFile(fileName, format) {
  // ...前面代码保持不变...
  
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

    const data = parser(text);
    
    // ============ 新增: 自动校验逻辑 ============
    this._validateDataTable(fileName, data);
    
    return data;
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

/**
 * 新增方法: 自动校验数据表
 */
_validateDataTable(tableName, data) {
  // 获取validator实例(需要从UnifiedDataManager传入，或创建共享实例)
  // 这里假设有全局validator可用
  const validator = this.validator || new DataValidator();
  
  // locations.json 校验
  if (tableName === 'locations' && data.locations && Array.isArray(data.locations)) {
    let validCount = 0;
    let errorCount = 0;
    
    for (const location of data.locations) {
      const validation = validator.validate('location', location);
      if (!validation.isValid) {
        console.error(`❌ 地点数据不合法: ${location.id || 'unknown'}`, validation.errors);
        errorCount++;
      } else {
        validCount++;
      }
    }
    
    if (errorCount > 0) {
      throw new Error(`locations.json 包含 ${errorCount} 个不合法数据`);
    }
    
    console.log(`✅ locations.json 校验通过 (${validCount}条)`);
  }
  
  // behavior_patterns.json 校验
  if (tableName === 'behavior_patterns' && data.behaviors && Array.isArray(data.behaviors)) {
    let validCount = 0;
    let errorCount = 0;
    
    for (const behavior of data.behaviors) {
      const validation = validator.validate('behavior', behavior);
      if (!validation.isValid) {
        console.error(`❌ 行为数据不合法: ${behavior.id || 'unknown'}`, validation.errors);
        errorCount++;
      } else {
        validCount++;
      }
    }
    
    if (errorCount > 0) {
      throw new Error(`behavior_patterns.json 包含 ${errorCount} 个不合法数据`);
    }
    
    console.log(`✅ behavior_patterns.json 校验通过 (${validCount}条)`);
  }
  
  // interaction_patterns.json 校验
  if (tableName === 'interaction_patterns' && data.interactions && Array.isArray(data.interactions)) {
    let validCount = 0;
    let errorCount = 0;
    
    for (const interaction of data.interactions) {
      const validation = validator.validate('interaction', interaction);
      if (!validation.isValid) {
        console.error(`❌ 互动数据不合法: ${interaction.id || 'unknown'}`, validation.errors);
        errorCount++;
      } else {
        validCount++;
      }
    }
    
    if (errorCount > 0) {
      throw new Error(`interaction_patterns.json 包含 ${errorCount} 个不合法数据`);
    }
    
    console.log(`✅ interaction_patterns.json 校验通过 (${validCount}条)`);
  }
}
```

**注意**: `_validateDataTable` 方法需要访问 `validator`，有两种方式：
1. 在 `DataTableManager` 构造函数中接收 `validator` 参数
2. 在 `UnifiedDataManager` 构造函数中传入: `this.dataTableManager = new DataTableManager(this.validator);`

**推荐方式2**，修改 `UnifiedDataManager` 构造函数:

```javascript
constructor(gameEngine) {
  this.gameEngine = gameEngine;
  
  // 核心组件 - 修改这里
  this.validator = new DataValidator();  // 先创建validator
  this.dataTableManager = new DataTableManager(this.validator);  // 传入validator
  
  // ...后续代码保持不变...
}
```

**同时修改 `DataTableManager` 构造函数**:

```javascript
class DataTableManager {
  constructor(validator) {  // 新增参数
    this.validator = validator;  // 保存validator引用
    this.tables = new Map();
    this.loadPromises = new Map();
    this.parsers = {
      json: (text) => JSON.parse(text),
      csv: (text) => this.parseCSV(text)
    };
  }
  
  // ...后续代码保持不变...
}
```

---

## 📋 完整修改清单

### ✅ 需要修改的内容

1. **DataTableManager 类**:
   - [ ] 构造函数添加 `validator` 参数
   - [ ] 添加 `getLocations()` 方法
   - [ ] 添加 `getInteractionPatterns()` 方法
   - [ ] 确认 `getBehaviorPatterns()` 指向正确文件
   - [ ] 在 `_loadTableFromFile()` 中添加 `_validateDataTable()` 调用
   - [ ] 新增 `_validateDataTable()` 方法

2. **DataValidator 类**:
   - [ ] 在 `setupDefaultValidators()` 中添加 `location` 校验器
   - [ ] 添加 `behavior` 校验器
   - [ ] 添加 `interaction` 校验器

3. **UnifiedDataManager 类**:
   - [ ] 构造函数中先创建 `validator`
   - [ ] 创建 `dataTableManager` 时传入 `validator`

---

## 🧪 测试验证

修改完成后，在控制台运行:

```javascript
// 测试加载locations.json
const locations = await gameEngine.dataManager.dataTableManager.getLocations();
console.log('地点数量:', locations.locations.length);

// 测试加载behavior_patterns.json
const behaviors = await gameEngine.dataManager.dataTableManager.getBehaviorPatterns();
console.log('行为数量:', behaviors.behaviors.length);

// 测试加载interaction_patterns.json
const interactions = await gameEngine.dataManager.dataTableManager.getInteractionPatterns();
console.log('互动数量:', interactions.interactions.length);
```

**预期输出**:
```
✅ locations.json 校验通过 (5条)
地点数量: 5
✅ behavior_patterns.json 校验通过 (6条)
行为数量: 6
✅ interaction_patterns.json 校验通过 (4条)
互动数量: 4
```

---

## 📂 文件放置位置

**将生成的JSON文件放到项目的 `data_tables/` 目录**:

```
项目根目录/
├── data_tables/
│   ├── locations.json                  ← 放这里
│   ├── behavior_patterns.json          ← 放这里
│   ├── interaction_patterns.json       ← 放这里
│   ├── virtue_config.json
│   ├── balance_config.json
│   └── ...其他现有配置文件
```

---

## ⚠️ 注意事项

1. **编码问题**: JSON文件必须是UTF-8编码
2. **格式检查**: 确保JSON格式正确(无语法错误)
3. **路径正确**: `getFilePath()` 方法会自动拼接 `data_tables/` 前缀
4. **缓存清除**: 如果修改了JSON文件，需要刷新页面重新加载

---

## 🎯 下一步

完成这个步骤后，继续:
- **步骤2**: 实现完整的校验逻辑(已在本文档中)
- **步骤3**: 创建CLI校验工具
- **步骤4**: 地点系统升级

需要我帮你实际修改代码文件吗？
