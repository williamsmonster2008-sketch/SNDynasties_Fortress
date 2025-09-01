# 南北朝坞堡模拟器 - 模块接口关系规范

## 🏗️ 整体架构层次

```
┌─────────────────────────────────────────────────────────────┐
│                    表现层 (Presentation)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  game_interface │  │  ui_components  │  │    index.html   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   状态管理层 (State)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ game_state_mgr  │  │   event_bus     │  │ unified_data_mgr│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    逻辑层 (Logic)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   game_engine   │  │ character_gen   │  │ name_generator  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ family_system   │  │ virtue_system   │  │  skill_system   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    数据层 (Data)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ character_module│  │resource_system  │  │location_system  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📋 模块职责和接口规范

### 1. 🎯 GameEngine (游戏引擎核心)
**职责：**
- 统一的系统协调和生命周期管理
- 角色数据的权威存储 (`this.characters` Map)
- 游戏循环和时间管理

**核心接口：**
```javascript
class GameEngine {
  // 初始化
  constructor()
  async initialize()
  
  // 角色管理（通过DataManager）
  async createCharacter(config)     // → dataManager.createCharacter()
  getCharacter(id)                  // → dataManager.getCharacter()
  getAllCharacters()                // → dataManager.getAllCharacters()
  
  // 系统访问
  getCharacterGenerator()           // → this.characterGenerator
  getFamilySystem()                 // → this.familySystem
  getNameGenerator()                // → this.nameGenerator
}
```

**依赖关系：**
- 创建并拥有：UnifiedDataManager, CharacterGenerator, FamilySystem, NameGenerator
- 集成现有系统：VirtueSystem, SkillSystem, ResourceSystem等
- 通过事件适配器为所有系统添加事件支持

---

### 2. 📊 UnifiedDataManager (统一数据管理器)
**职责：**
- 所有数据的唯一权威源和CRUD操作
- 数据完整性验证和自动修复
- 数据备份和版本控制

**核心接口：**
```javascript
class UnifiedDataManager {
  constructor(gameEngine)
  
  // 角色数据接口
  async createCharacter(config)     // 创建角色对象+子系统
  getCharacter(characterId)         // 获取完整角色数据
  updateCharacter(id, data, source) // 更新角色数据
  
  // 数据表管理
  dataTableManager: {
    getCharacterNamesConfig()       // → CSV数据
    getVirtueSystemConfig()         // → JSON配置
    getBalanceConfig()              // → JSON配置
    getSkillDefinitionsConfig()     // → CSV数据
  }
}
```

**依赖关系：**
- 被GameEngine拥有和使用
- 创建和管理：Character对象, VirtueSystem, SkillSystem
- 加载外部数据表：character_names.csv, virtue_system.json等

---

### 3. 🎭 CharacterGenerator (角色生成器)
**职责：**
- 角色配置的构建和协调
- 生成逻辑的统计和管理
- 批量角色生成（移民波次等）

**核心接口：**
```javascript
class CharacterGenerator {
  constructor(gameEngine)
  
  // 配置管理
  async loadConfigurations()        // 加载balance_config.json
  
  // 角色生成
  async generateRandomCharacter(options)
  async generateImmigrantWave(count)
  async generateFamilyMembers(familyConfig)  // → 调用familySystem.createFamily()
  
  // 配置构建
  buildCharacterConfig(options)     // 构建完整配置对象
  
  // 基础生成方法（基于外部配置）
  generateRandomSocialClass()       // 基于balance_config
  generateRandomAge(category)       // 基于balance_config
  generateRandomOccupation(class)   // 基于balance_config
}
```

**依赖关系：**
- 被GameEngine拥有和调用
- 调用：nameGenerator.generateName() 获取姓名
- 调用：familySystem.createFamily() 创建家族
- 调用：dataManager.createCharacter() 创建角色
- **不直接创建：** VirtueSystem, SkillSystem（由DataManager负责）

---

### 4. 📝 NameGenerator (姓名生成器)
**职责：**
- 南北朝历史特色姓名生成
- 门阀士族、胡族复姓支持
- 字、号、称谓生成

**核心接口：**
```javascript
class NameGenerator {
  constructor()
  
  // 配置管理
  async loadConfigurations(tableManager)  // 加载character_names.csv
  
  // 姓名生成
  generateName(config) {
    // config: { gender, socialClass, familyName, generation, role, useCourtesyName }
    // 返回: { fullName, surname, givenName, courtesyName, nameInfo }
  }
  
  // 专门方法
  generateFamilyNames(familyName, generations)
}
```

**依赖关系：**
- 被CharacterGenerator调用
- 加载：character_names.csv（通过DataTableManager）
- **独立运行，不依赖其他系统**

---

### 5. 👨‍👩‍👧‍👦 FamilySystem (家族系统)
**职责：**
- 五代同堂家族结构创建
- 家族关系网络管理
- 家族等级制度维护

**核心接口：**
```javascript
class FamilySystem {
  constructor()
  
  // 家族创建
  createFamily(options) {
    // options: { familyName, size, type }
    // 返回: familyStructure with members[]
  }
  
  createFiveGenerationFamily(familyName, targetSize, familyType)
  
  // 关系管理
  establishFamilyRelationships(familyStructure)
  getRelationshipBetween(person1, person2)
}
```

**依赖关系：**
- 被GameEngine拥有，被CharacterGenerator调用
- **只生成家族结构数据，不创建Character对象**
- 返回的members[]由CharacterGenerator用来创建实际角色

---

### 6. ⭐ VirtueSystem (德行系统)
**职责：**
- 个体角色的德行特质管理
- 行为对德行的影响计算
- 德行成就和境界判定

**核心接口：**
```javascript
class VirtueSystem {
  constructor(characterId, config)  // 每个角色独有一个实例
  
  // 核心方法
  getDominantVirtues()              // 返回主导德行
  getPersonalityTraits()            // 返回性格特质
  applyBehaviorEffect(behavior, intensity)
  
  // 数据访问
  exportData()                      // 导出德行数据
  getOverallRating()                // 整体德行评分
}
```

**依赖关系：**
- 被UnifiedDataManager在createCharacter时创建
- 加载：virtue_system.json（通过DataTableManager）
- 每个Character实例拥有一个VirtueSystem实例

---

### 7. 🛠️ SkillSystem (技能系统)
**职责：**
- 个体角色的技能管理
- 技能学习和升级
- 技能对行为的影响

**核心接口：**
```javascript
class SkillSystem {
  constructor(characterId, config)  // 每个角色独有一个实例
  
  // 技能管理
  initializeSkills(skillConfig)     // 基于skill_definitions.csv
  getSkillLevel(skillName)
  improveSkill(skillName, amount)
  
  // 效果计算
  getSkillEffectiveness(skillName)
  getAvailableSkills()
}
```

**依赖关系：**
- 被UnifiedDataManager在createCharacter时创建
- 加载：skill_definitions.csv（通过DataTableManager）
- 每个Character实例拥有一个SkillSystem实例

---

## 🔄 关键数据流和调用链

### 角色创建完整流程：
```
用户界面 → GameInterface.onAddImmigrant()
    ↓
GameEngine.characterGenerator.generateRandomCharacter()
    ↓
CharacterGenerator.buildCharacterConfig() {
    调用 nameGenerator.generateName() → 获取姓名
    调用 generateRandomSocialClass() → 基于balance_config
    调用 generateRandomAge() → 基于balance_config
}
    ↓
GameEngine.dataManager.createCharacter(config)
    ↓
UnifiedDataManager.createCharacter() {
    创建 new Character(config)
    创建 new VirtueSystem(characterId, virtueConfig)
    创建 new SkillSystem(characterId, skillConfig)
    验证数据完整性
    存储到 gameEngine.characters
}
    ↓
EventBus.emit('character_created')
    ↓
GameStateManager.syncCharacterStates()
    ↓
UI自动更新显示
```

### 家族创建完整流程：
```
用户请求创建家族
    ↓
CharacterGenerator.generateFamilyMembers(familyConfig)
    ↓
FamilySystem.createFamily() {
    返回 familyStructure with members[]
}
    ↓
For each member in familyStructure.members:
    CharacterGenerator.generateRandomCharacter({
        name: member.name,  // FamilySystem生成的
        age: member.age,    // FamilySystem生成的
        role: member.role   // FamilySystem分配的
    })
    ↓
    DataManager.createCharacter() // 同上面的角色创建流程
```

## ⚠️ 关键接口约定

### 1. 数据所有权规则
```javascript
// ✅ 正确：唯一数据源
GameEngine.characters.get(id)  // 权威数据源

// ❌ 错误：重复数据源  
CharacterGenerator.characters  // 不应该存在
FamilySystem.characters       // 不应该存在
```

### 2. 系统创建责任
```javascript
// ✅ 正确：专门系统负责创建
UnifiedDataManager.createCharacter() {
  new Character(config)
  new VirtueSystem(characterId, virtueConfig)  
  new SkillSystem(characterId, skillConfig)
}

// ❌ 错误：生成器直接创建系统
CharacterGenerator.generateVirtueConfig()  // 应该删除
CharacterGenerator.generateSkillConfig()   // 应该删除
```

### 3. 配置加载责任
```javascript
// ✅ 正确：各系统加载自己的配置
NameGenerator.loadConfigurations(tableManager)     // 加载character_names.csv
VirtueSystem.loadConfigurations(tableManager)      // 加载virtue_system.json  
SkillSystem.loadConfigurations(tableManager)       // 加载skill_definitions.csv
CharacterGenerator.loadConfigurations(tableManager) // 只加载balance_config.json

// ❌ 错误：生成器加载所有配置
CharacterGenerator.loadConfigurations() {
  this.nameConfig = ...     // 应该删除
  this.virtueConfig = ...   // 应该删除
  this.skillConfig = ...    // 应该删除
}
```

### 4. 方法调用链约定
```javascript
// ✅ 正确的调用链
CharacterGenerator → NameGenerator.generateName()
CharacterGenerator → FamilySystem.createFamily()  
CharacterGenerator → DataManager.createCharacter()
DataManager → new VirtueSystem()
DataManager → new SkillSystem()

// ❌ 错误的调用链
CharacterGenerator → new VirtueSystem()  // 跨层调用
CharacterGenerator → new Character()     // 绕过DataManager
VirtueSystem → CharacterGenerator        // 反向依赖
```

## 📝 具体接口规范

### NameGenerator.generateName() 接口
```javascript
// 输入参数
{
  gender: '男'|'女',
  socialClass: '门阀士族'|'胡族'|'平民'|'工匠',
  familyName?: string,              // 可选，指定姓氏
  generation?: number,              // 世代数 1-5
  role?: string,                    // family_head, spouse, child等
  useCourtesyName?: boolean         // 是否生成字
}

// 返回结果
{
  fullName: string,                 // 完整姓名
  surname: string,                  // 姓氏
  givenName: string,                // 名
  courtesyName?: string,            // 字（可选）
  nameInfo: {                       // 姓名信息
    meaning: string,                // 寓意
    category: string,               // 类别
    hasTaboo?: boolean              // 是否有忌讳
  }
}
```

### FamilySystem.createFamily() 接口
```javascript
// 输入参数
{
  familyName: string,               // 家族姓氏
  size: number,                     // 目标人数
  type?: 'auto'|'nuclear'|'extended'|'five_generation'
}

// 返回结果
{
  familyName: string,
  familyType: string,
  generations: {
    first: [],   // 高祖辈成员信息
    second: [],  // 曾祖辈成员信息  
    third: [],   // 祖父母辈成员信息
    fourth: [],  // 父母辈成员信息
    fifth: []    // 子女辈成员信息
  },
  members: [                        // 所有成员的基础信息
    {
      name: string,                 // FamilySystem生成的姓名
      age: number,                  // 合适的年龄
      gender: '男'|'女',
      role: string,                 // 家族角色
      generation: number            // 世代数
    }
  ],
  relationships: Map,               // 家族关系网络
  createdAt: timestamp
}
```

### VirtueSystem 构造接口
```javascript
// 构造参数
new VirtueSystem(characterId, config)

// config参数
{
  externalConfig?: object,          // 来自virtue_system.json的配置
  initialValues?: object,           // 初始德行值
  developmentRate?: number          // 发展速率
}

// 必须实现的方法
getDominantVirtues()                // → 主导德行列表
getPersonalityTraits()              // → 性格特质列表  
applyBehaviorEffect(behavior, intensity)
getOverallRating()                  // → 整体德行评分
exportData()                        // → 可序列化的德行数据
```

### SkillSystem 构造接口
```javascript
// 构造参数
new SkillSystem(characterId, config)

// config参数  
{
  initialSkills?: object,           // 初始技能配置
  socialClass?: string,             // 社会等级影响
  age?: number,                     // 年龄影响
  externalConfig?: object           // 来自skill_definitions.csv的配置
}

// 必须实现的方法
initializeSkills(skillConfig)       // 基于CSV数据初始化
getSkillLevel(skillName)            // 获取技能等级
improveSkill(skillName, amount)     // 提升技能
getAvailableSkills()                // 获取可用技能列表
```

## 🚨 严格禁止的错误模式

### ❌ 职责越界
```javascript
// 错误：CharacterGenerator直接创建系统
const virtueSystem = new VirtueSystem();  // 应该由DataManager创建

// 错误：NameGenerator操作角色数据
nameGenerator.assignNameToCharacter();    // 应该返回姓名，不操作角色

// 错误：VirtueSystem创建角色
virtueSystem.createCharacterWithVirtues(); // 应该只管理德行数据
```

### ❌ 数据重复
```javascript
// 错误：多个数据源
CharacterGenerator.characters = new Map(); // 不应该存在
FamilySystem.members = [];                 // 不应该存储角色对象
```

### ❌ 配置混乱  
```javascript
// 错误：加载不属于自己的配置
CharacterGenerator.loadVirtueConfig();    // 应该由VirtueSystem加载
NameGenerator.loadBalanceConfig();        // 应该由CharacterGenerator加载
```

## ✅ 确认检查清单

请确认以下架构理解是否正确：

1. **[ ] GameEngine** 是唯一的角色数据源 (`this.characters`)
2. **[ ] CharacterGenerator** 只负责配置构建，不直接创建对象
3. **[ ] NameGenerator** 只负责姓名生成，不操作角色数据
4. **[ ] FamilySystem** 只生成家族结构，不创建Character对象
5. **[ ] VirtueSystem** 由DataManager创建，不由CharacterGenerator创建
6. **[ ] SkillSystem** 由DataManager创建，不由CharacterGenerator创建
7. **[ ] 各系统** 只加载自己专用的配置文件
8. **[ ] 数据流向** 严格按照 Generator→DataManager→Systems 的顺序

**请确认上述架构理解，我再进行正确的重构！**