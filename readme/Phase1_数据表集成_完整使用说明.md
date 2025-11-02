# Phase 1 数据表集成 - 完整使用说明

> **目标**: 将3个新数据表集成到项目中并通过校验

---

## 📦 需要的文件

### 1. 数据表文件 (放到 `data_tables/` 目录)

- ✅ `locations.json` - 5个地点蓝图
- ✅ `behavior_patterns.json` - 6个行为模式
- ✅ `interaction_patterns.json` - 4个互动模式

### 2. 代码修改文件

- ✅ `unified_data_manager.js` - 修改指南已生成
- ✅ `validate_data_tables.js` - CLI校验工具已生成

---

## 🔧 集成步骤 (按顺序执行)

### 步骤1: 放置数据文件

```bash
# 将以下文件复制到项目的 data_tables/ 目录
项目根目录/data_tables/
├── locations.json              ← 新建
├── behavior_patterns.json      ← 新建
├── interaction_patterns.json   ← 新建
└── (其他现有配置文件...)
```

**文件来源**: 
- 从 `/mnt/user-data/outputs/` 下载这3个JSON文件
- 放到你的项目 `data_tables/` 目录

---

### 步骤2: 修改 unified_data_manager.js

按照 `unified_data_manager_修改指南.md` 中的说明修改代码:

#### 2.1 修改 DataTableManager 构造函数

```javascript
class DataTableManager {
  constructor(validator) {  // ← 新增参数
    this.validator = validator;  // ← 保存validator引用
    this.tables = new Map();
    this.loadPromises = new Map();
    this.parsers = {
      json: (text) => JSON.parse(text),
      csv: (text) => this.parseCSV(text)
    };
  }
```

#### 2.2 添加新的加载方法

在 `DataTableManager` 类的 `getGenerationNameConfig()` 后面添加:

```javascript
/**
 * 获取地点配置
 */
async getLocations() {
  return await this.loadTable('locations', 'json');
}

/**
 * 获取互动模式配置  
 */
async getInteractionPatterns() {
  return await this.loadTable('interaction_patterns', 'json');
}
```

#### 2.3 添加校验逻辑

在 `_loadTableFromFile()` 方法的 `return parser(text);` 之前添加:

```javascript
const data = parser(text);

// 自动校验
this._validateDataTable(fileName, data);

return data;
```

在 `DataTableManager` 类中添加新方法:

```javascript
/**
 * 自动校验数据表
 */
_validateDataTable(tableName, data) {
  if (!this.validator) {
    console.warn('⚠️ validator未初始化,跳过校验');
    return;
  }
  
  // locations.json 校验
  if (tableName === 'locations' && data.locations && Array.isArray(data.locations)) {
    let validCount = 0;
    let errorCount = 0;
    
    for (const location of data.locations) {
      const validation = this.validator.validate('location', location);
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
      const validation = this.validator.validate('behavior', behavior);
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
      const validation = this.validator.validate('interaction', interaction);
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

#### 2.4 在 DataValidator 中添加校验器

在 `setupDefaultValidators()` 方法的 `virtueSystem` 校验器后面添加:

```javascript
// 地点数据校验器
this.validators.set('location', {
  required: ['id', 'name', 'category', 'capacity', 'allowedActions'],
  types: {
    id: 'string',
    name: 'string',
    category: 'string',
    capacity: 'object',
    allowedActions: 'array',
    movementCost: 'number',
    isPublic: 'boolean'
  },
  constraints: {
    id: (value) => /^[a-z_0-9]+$/.test(value),
    name: (value) => value.length > 0 && value.length <= 20,
    category: (value) => ['residence', 'production', 'social', 'religious', 'commercial'].includes(value),
    movementCost: (value) => value >= 1 && value <= 10,
    allowedActions: (arr) => Array.isArray(arr) && arr.length > 0
  }
});

// 行为模式校验器
this.validators.set('behavior', {
  required: ['id', 'name', 'category', 'requirements', 'effects', 'duration', 'validLocations'],
  types: {
    id: 'string',
    name: 'string',
    category: 'string',
    requirements: 'object',
    effects: 'object',
    duration: 'object',
    validLocations: 'array',
    priority: 'number',
    canBeInterrupted: 'boolean'
  },
  constraints: {
    id: (value) => /^[a-z_]+$/.test(value),
    name: (value) => value.length > 0 && value.length <= 20,
    category: (value) => ['physiological', 'production', 'social', 'religious', 'entertainment', 'crime'].includes(value),
    priority: (value) => value >= 0 && value <= 100,
    validLocations: (arr) => Array.isArray(arr) && arr.length > 0
  }
});

// 互动模式校验器
this.validators.set('interaction', {
  required: ['id', 'name', 'category', 'participantRequirements', 'phases', 'outcomes', 'duration'],
  types: {
    id: 'string',
    name: 'string',
    category: 'string',
    participantRequirements: 'object',
    phases: 'array',
    outcomes: 'object',
    duration: 'number'
  },
  constraints: {
    id: (value) => /^[a-z_]+$/.test(value),
    name: (value) => value.length > 0,
    category: (value) => ['social_basic', 'cooperation', 'conflict', 'social_entertainment', 'romance'].includes(value),
    duration: (value) => value > 0 && value <= 1440,
    phases: (arr) => Array.isArray(arr) && arr.length > 0
  }
});
```

#### 2.5 修改 UnifiedDataManager 构造函数

```javascript
constructor(gameEngine) {
  this.gameEngine = gameEngine;
  
  // 核心组件 - 先创建validator,再传入DataTableManager
  this.validator = new DataValidator();
  this.dataTableManager = new DataTableManager(this.validator);  // ← 传入validator
  
  // ...后续代码保持不变...
}
```

---

### 步骤3: 使用CLI工具校验

#### 3.1 放置CLI工具

```bash
# 将 validate_data_tables.js 放到项目根目录
项目根目录/
├── validate_data_tables.js    ← 新建
├── data_tables/
│   ├── locations.json
│   ├── behavior_patterns.json
│   └── interaction_patterns.json
└── ...
```

#### 3.2 运行校验

```bash
# 在项目根目录运行
node validate_data_tables.js
```

#### 3.3 预期输出

**成功时**:
```
═══════════════════════════════════════════════
   南北朝坞堡模拟器 - Phase 1 数据表校验工具
═══════════════════════════════════════════════

🔍 校验 data_tables/locations.json...
✅ 校验通过! (5/5条)

🔍 校验 data_tables/behavior_patterns.json...
✅ 校验通过! (6/6条)

🔍 校验 data_tables/interaction_patterns.json...
✅ 校验通过! (4/4条)

═══════════════════════════════════════════════
                   校验汇总
═══════════════════════════════════════════════
✅ locations.json: 5条有效, 0条错误, 0条警告
✅ behavior_patterns.json: 6条有效, 0条错误, 0条警告
✅ interaction_patterns.json: 4条有效, 0条错误, 0条警告
───────────────────────────────────────────────
🎉 所有数据表校验通过!
═══════════════════════════════════════════════
```

**失败时**:
```
🔍 校验 data_tables/locations.json...
❌ 校验失败! 有效: 4条, 错误: 1条

错误详情:
  dwelling_01:
    - 字段 id 不满足约束条件
    - 字段 movementCost 类型错误，期望 number，实际 string
```

---

### 步骤4: 在游戏中测试加载

启动游戏后，在浏览器控制台运行:

```javascript
// 测试加载locations.json
const locations = await gameEngine.dataManager.dataTableManager.getLocations();
console.log('地点数据:', locations);
console.log('地点数量:', locations.locations.length);

// 测试加载behavior_patterns.json
const behaviors = await gameEngine.dataManager.dataTableManager.getBehaviorPatterns();
console.log('行为数据:', behaviors);
console.log('行为数量:', behaviors.behaviors.length);

// 测试加载interaction_patterns.json
const interactions = await gameEngine.dataManager.dataTableManager.getInteractionPatterns();
console.log('互动数据:', interactions);
console.log('互动数量:', interactions.interactions.length);
```

**预期输出**:
```
✅ locations.json 校验通过 (5条)
地点数据: {$schema: "...", version: "1.0.0", locations: Array(5), ...}
地点数量: 5

✅ behavior_patterns.json 校验通过 (6条)
行为数据: {$schema: "...", version: "1.0.0", behaviors: Array(6), ...}
行为数量: 6

✅ interaction_patterns.json 校验通过 (4条)
互动数据: {$schema: "...", version: "1.0.0", interactions: Array(4), ...}
互动数量: 4
```

---

## 🐛 常见问题

### Q1: 运行CLI工具提示找不到文件

**原因**: 文件路径不正确

**解决**: 确保:
1. `validate_data_tables.js` 在项目**根目录**
2. JSON文件在 `data_tables/` 目录
3. 在项目根目录运行命令

### Q2: 校验提示编码错误

**原因**: JSON文件不是UTF-8编码

**解决**: 
1. 用支持UTF-8的编辑器打开JSON文件(如VS Code)
2. 另存为UTF-8编码
3. 删除BOM标记(如果有)

### Q3: 游戏加载时没有校验日志

**原因**: `validator` 未正确传入 `DataTableManager`

**解决**: 
检查 `UnifiedDataManager` 构造函数中的代码:
```javascript
this.validator = new DataValidator();
this.dataTableManager = new DataTableManager(this.validator);  // ← 必须传入
```

### Q4: 校验通过但游戏中获取不到数据

**原因**: 可能是缓存问题

**解决**:
1. 清除浏览器缓存
2. 硬刷新页面 (Ctrl+F5)
3. 检查浏览器控制台是否有加载错误

---

## ✅ 验收标准

完成集成后,应满足:

- [ ] CLI工具运行成功,所有数据表校验通过
- [ ] 游戏启动时控制台显示 `✅ locations.json 校验通过 (5条)`
- [ ] 游戏启动时控制台显示 `✅ behavior_patterns.json 校验通过 (6条)`
- [ ] 游戏启动时控制台显示 `✅ interaction_patterns.json 校验通过 (4条)`
- [ ] 在控制台可以成功调用 `getLocations()` 等方法
- [ ] 返回的数据结构正确,包含预期数量的条目

---

## 🎯 下一步: Phase 1 其他任务

完成数据表集成后,继续:

1. **地点系统升级** - 使用 `locations.json` 实现蓝图实例化
2. **角色状态域扩展** - 添加 `SocialState`、`ScheduleState`
3. **行为系统改造** - 使用 `behavior_patterns.json` 驱动
4. **最小Demo** - 两角色+单地点+进食+问候示例

需要帮助? 参考:
- `unified_data_manager_修改指南.md` - 详细修改说明
- `Phase1_DataTable_Schema校验规则.md` - Schema定义参考
- `南北朝坞堡模拟器_完整架构规划方案.md` - 整体规划

---

**文档版本**: v1.0  
**最后更新**: 2025-11-02  
**维护者**: Claude
