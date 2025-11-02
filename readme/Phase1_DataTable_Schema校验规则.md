# Phase 1 数据表 Schema 校验规则

> **目的**: 定义数据结构规范,在加载时自动检查数据合法性

---

## 📋 一、locations.json Schema

### 必需字段 (required)
```javascript
{
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
    // 基础约束
    id: (value) => /^[a-z_0-9]+$/.test(value),  // 小写字母+数字+下划线
    name: (value) => value.length > 0 && value.length <= 20,
    category: (value) => ['residence', 'production', 'social', 'religious', 'commercial'].includes(value),
    
    // capacity对象约束
    'capacity.maxOccupants': (value) => value > 0 && value <= 100,
    'capacity.optimalOccupants': (value) => value > 0,
    'capacity.comfortLevel': (value) => value >= 0 && value <= 100,
    
    // 数组约束
    allowedActions: (arr) => arr.length > 0,
    connections: (arr) => Array.isArray(arr),
    
    // 数值约束
    movementCost: (value) => value >= 1 && value <= 10
  },
  
  nestedObjectRules: {
    capacity: {
      required: ['maxOccupants', 'optimalOccupants', 'comfortLevel'],
      constraints: {
        // optimalOccupants必须 <= maxOccupants
        custom: (obj) => obj.optimalOccupants <= obj.maxOccupants
      }
    },
    attributes: {
      constraints: {
        // 所有属性值必须在0-100之间
        custom: (obj) => Object.values(obj).every(v => v >= 0 && v <= 100)
      }
    }
  }
}
```

### 校验示例

```javascript
// ✅ 合法数据
{
  "id": "dwelling_01",
  "name": "民居",
  "category": "residence",
  "capacity": {
    "maxOccupants": 6,
    "optimalOccupants": 4,
    "comfortLevel": 70
  },
  "allowedActions": ["休息睡眠", "进食饮水"],
  "movementCost": 1,
  "isPublic": false
}

// ❌ 不合法数据 - 将被拦截
{
  "id": "Dwelling-01",           // ❌ 包含大写字母和连字符
  "name": "",                     // ❌ name为空
  "category": "unknown",          // ❌ category不在枚举中
  "capacity": {
    "maxOccupants": 4,
    "optimalOccupants": 6,        // ❌ optimal > max
    "comfortLevel": 150           // ❌ 超过100
  },
  "allowedActions": [],           // ❌ 空数组
  "movementCost": 0               // ❌ 小于1
}
```

---

## 📋 二、behavior_patterns.json Schema

### 必需字段
```javascript
{
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
    tags: 'array'
  },
  
  constraints: {
    id: (value) => /^[a-z_]+$/.test(value),
    name: (value) => value.length > 0 && value.length <= 20,
    category: (value) => ['physiological', 'production', 'social', 'religious', 'entertainment', 'crime'].includes(value),
    
    // 优先级约束
    priority: (value) => value >= 0 && value <= 100,
    
    // 数组约束
    validLocations: (arr) => arr.length > 0,
    validTimeOfDay: (arr) => arr.every(time => ['清晨', '白昼', '午间', '傍晚', '夜晚'].includes(time)),
    
    // 时长约束
    'duration.min': (value) => value > 0,
    'duration.max': (value) => value > 0,
    'duration.unit': (value) => ['seconds', 'minutes', 'hours'].includes(value)
  },
  
  nestedObjectRules: {
    duration: {
      required: ['min', 'max', 'unit'],
      constraints: {
        custom: (obj) => obj.min <= obj.max  // min必须 <= max
      }
    },
    requirements: {
      optionalFields: ['needs', 'states', 'skills', 'resources'],
      constraints: {
        // needs中的值必须是对象,包含min/max/urgent字段
        needs: (obj) => {
          return Object.values(obj).every(requirement => 
            typeof requirement === 'object' &&
            (requirement.min !== undefined || requirement.max !== undefined || requirement.urgent !== undefined)
          );
        }
      }
    },
    effects: {
      optionalFields: ['needs', 'states', 'skills', 'resources'],
      constraints: {
        // effects中的数值必须在-100到100之间
        custom: (obj) => {
          for (const category of Object.values(obj)) {
            if (typeof category === 'object') {
              for (const value of Object.values(category)) {
                if (typeof value === 'number' && (value < -100 || value > 100)) {
                  return false;
                }
              }
            }
          }
          return true;
        }
      }
    }
  }
}
```

### 校验示例

```javascript
// ✅ 合法数据
{
  "id": "eat_drink",
  "name": "进食饮水",
  "category": "physiological",
  "requirements": {
    "needs": {
      "hunger": { "min": 0, "urgent": 30 }
    }
  },
  "effects": {
    "needs": {
      "hunger": 40
    }
  },
  "duration": {
    "min": 15,
    "max": 30,
    "unit": "minutes"
  },
  "validLocations": ["民居"],
  "priority": 85
}

// ❌ 不合法数据
{
  "id": "EatDrink",                // ❌ 包含大写
  "name": "这是一个超过二十个字符的超长行为名称",  // ❌ 超过20字符
  "category": "unknown",            // ❌ category不在枚举中
  "duration": {
    "min": 30,
    "max": 15,                      // ❌ max < min
    "unit": "days"                  // ❌ unit不合法
  },
  "validLocations": [],             // ❌ 空数组
  "priority": 150                   // ❌ 超过100
}
```

---

## 📋 三、interaction_patterns.json Schema

### 必需字段
```javascript
{
  required: ['id', 'name', 'category', 'participantRequirements', 'phases', 'outcomes', 'duration'],
  
  types: {
    id: 'string',
    name: 'string',
    category: 'string',
    participantRequirements: 'object',
    relationshipRequirements: 'object',
    validLocations: 'array',
    phases: 'array',
    outcomes: 'object',
    duration: 'number',
    priority: 'number',
    canBeRejected: 'boolean',
    interruptible: 'boolean'
  },
  
  constraints: {
    id: (value) => /^[a-z_]+$/.test(value),
    name: (value) => value.length > 0,
    category: (value) => ['social_basic', 'cooperation', 'conflict', 'social_entertainment', 'romance'].includes(value),
    
    duration: (value) => value > 0 && value <= 1440,  // 最长24小时
    priority: (value) => value >= 0 && value <= 100,
    
    // phases必须至少有1个阶段
    phases: (arr) => arr.length > 0,
    
    // participantRequirements约束
    'participantRequirements.minParticipants': (value) => value >= 2,
    'participantRequirements.maxParticipants': (value) => value >= 2 && value <= 20
  },
  
  nestedObjectRules: {
    participantRequirements: {
      required: ['minParticipants', 'maxParticipants'],
      constraints: {
        custom: (obj) => obj.minParticipants <= obj.maxParticipants
      }
    },
    phases: {
      arrayElementSchema: {
        required: ['phaseId', 'phaseName', 'duration', 'actions'],
        constraints: {
          duration: (value) => value > 0,
          actions: (arr) => arr.length > 0
        }
      }
    },
    outcomes: {
      requiredKeys: ['success'],  // 至少要有success结果
      constraints: {
        // 每个outcome必须有probability和effects字段
        custom: (obj) => {
          return Object.values(obj).every(outcome => 
            outcome.probability !== undefined &&
            outcome.effects !== undefined
          );
        }
      }
    }
  }
}
```

---

## 🔧 四、Schema 校验器实现

### 4.1 在 DataValidator 类中添加校验规则

```javascript
// unified_data_manager.js中扩展

setupDefaultValidators() {
  // ...现有的character, virtueSystem校验器...
  
  // 新增: locations校验器
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
      category: (value) => ['residence', 'production', 'social', 'religious', 'commercial'].includes(value),
      movementCost: (value) => value >= 1 && value <= 10
    }
  });
  
  // 新增: behavior校验器
  this.validators.set('behavior', {
    required: ['id', 'name', 'category', 'requirements', 'effects', 'duration'],
    types: {
      id: 'string',
      name: 'string',
      category: 'string',
      requirements: 'object',
      effects: 'object',
      duration: 'object',
      priority: 'number'
    },
    constraints: {
      id: (value) => /^[a-z_]+$/.test(value),
      category: (value) => ['physiological', 'production', 'social', 'religious', 'entertainment', 'crime'].includes(value),
      priority: (value) => value >= 0 && value <= 100
    }
  });
  
  // 新增: interaction校验器
  this.validators.set('interaction', {
    required: ['id', 'name', 'category', 'participantRequirements', 'phases', 'outcomes'],
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
      category: (value) => ['social_basic', 'cooperation', 'conflict', 'social_entertainment', 'romance'].includes(value),
      duration: (value) => value > 0 && value <= 1440,
      phases: (arr) => arr.length > 0
    }
  });
}
```

### 4.2 数据表加载时自动校验

```javascript
// DataTableManager中添加校验

async loadTable(tableName, format = 'auto') {
  // ... 加载逻辑 ...
  
  const data = await this._loadFile(filePath, actualFormat);
  
  // 🔍 新增: 自动校验
  if (tableName === 'locations' && Array.isArray(data.locations)) {
    for (const location of data.locations) {
      const validation = this.validator.validate('location', location);
      if (!validation.isValid) {
        console.error(`❌ 地点数据不合法: ${location.id}`, validation.errors);
        throw new Error(`地点 ${location.id} 校验失败`);
      }
    }
    console.log(`✅ locations.json 校验通过 (${data.locations.length}条)`);
  }
  
  if (tableName === 'behavior_patterns' && Array.isArray(data.behaviors)) {
    for (const behavior of data.behaviors) {
      const validation = this.validator.validate('behavior', behavior);
      if (!validation.isValid) {
        console.error(`❌ 行为数据不合法: ${behavior.id}`, validation.errors);
        throw new Error(`行为 ${behavior.id} 校验失败`);
      }
    }
    console.log(`✅ behavior_patterns.json 校验通过 (${data.behaviors.length}条)`);
  }
  
  if (tableName === 'interaction_patterns' && Array.isArray(data.interactions)) {
    for (const interaction of data.interactions) {
      const validation = this.validator.validate('interaction', interaction);
      if (!validation.isValid) {
        console.error(`❌ 互动数据不合法: ${interaction.id}`, validation.errors);
        throw new Error(`互动 ${interaction.id} 校验失败`);
      }
    }
    console.log(`✅ interaction_patterns.json 校验通过 (${data.interactions.length}条)`);
  }
  
  this.tableCache.set(tableName, data);
  return data;
}
```

---

## 🧪 五、校验测试脚本

### 5.1 CLI校验工具

```javascript
// validate_data_tables.js - 独立校验脚本

import { UnifiedDataManager } from './unified_data_manager.js';

async function validateAllTables() {
  console.log('🔍 开始校验所有数据表...\n');
  
  const dataManager = new UnifiedDataManager({ /* mock gameEngine */ });
  const errors = [];
  
  try {
    // 校验 locations.json
    await dataManager.dataTableManager.loadTable('locations', 'json');
    console.log('✅ locations.json 校验通过\n');
  } catch (error) {
    errors.push({ table: 'locations.json', error: error.message });
    console.error('❌ locations.json 校验失败:', error.message, '\n');
  }
  
  try {
    // 校验 behavior_patterns.json
    await dataManager.dataTableManager.loadTable('behavior_patterns', 'json');
    console.log('✅ behavior_patterns.json 校验通过\n');
  } catch (error) {
    errors.push({ table: 'behavior_patterns.json', error: error.message });
    console.error('❌ behavior_patterns.json 校验失败:', error.message, '\n');
  }
  
  try {
    // 校验 interaction_patterns.json
    await dataManager.dataTableManager.loadTable('interaction_patterns', 'json');
    console.log('✅ interaction_patterns.json 校验通过\n');
  } catch (error) {
    errors.push({ table: 'interaction_patterns.json', error: error.message });
    console.error('❌ interaction_patterns.json 校验失败:', error.message, '\n');
  }
  
  // 汇总结果
  if (errors.length === 0) {
    console.log('🎉 所有数据表校验通过!');
    process.exit(0);
  } else {
    console.error(`\n❌ 发现 ${errors.length} 个错误:`);
    errors.forEach(({ table, error }) => {
      console.error(`  - ${table}: ${error}`);
    });
    process.exit(1);
  }
}

validateAllTables();
```

### 5.2 运行方式

```bash
# 命令行运行校验
node validate_data_tables.js

# 集成到CI/CD
npm run validate-data
```

---

## 📝 六、总结

### Schema 校验的核心价值

1. **数据质量保证** - 100%数据符合规范
2. **提前发现错误** - 加载时而非运行时
3. **团队协作** - Schema就是"数据契约"
4. **易于调试** - 明确错误位置和原因

### Phase 1 交付物

✅ 3个数据表文件:
- locations.json
- behavior_patterns.json
- interaction_patterns.json

✅ 完整Schema定义
✅ 自动校验逻辑
✅ CLI校验工具

下一步可以开始集成到`unified_data_manager.js`中!
