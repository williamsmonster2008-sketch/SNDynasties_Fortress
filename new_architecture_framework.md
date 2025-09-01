# 南北朝坞堡模拟器 - 新架构框架设计文档

## 🏗️ 新架构总览

### 架构分层图
```
┌─────────────────────────────────────────────────────────────┐
│                    表现层 (Presentation Layer)                │
├─────────────────┬─────────────────┬─────────────────────────┤
│   GameInterface │   UI Components │      用户交互界面        │
└─────────────────┴─────────────────┴─────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   状态管理层 (State Layer)                    │
├─────────────────┬─────────────────┬─────────────────────────┤
│  GameStateManager│    EventBus     │      状态同步调度        │
└─────────────────┴─────────────────┴─────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    业务逻辑层 (Business Layer)                │
├─────────────────┬─────────────────┬─────────────────────────┤
│   GameEngine    │ CharacterGenerator│     游戏核心逻辑        │
└─────────────────┴─────────────────┴─────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    数据管理层 (Data Layer)                    │
├─────────────────┬─────────────────┬─────────────────────────┤
│UnifiedDataManager│ DataTableManager│      数据访问控制        │
└─────────────────┴─────────────────┴─────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    数据存储层 (Storage Layer)                 │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Memory Store  │   Backup Store  │      数据持久化存储      │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 📊 各模块职能详细分析

### 1. 数据管理层 (Data Management Layer)

#### 🎯 UnifiedDataManager - 统一数据管理器
**主要职能：**
- 数据的唯一权威源头
- 所有数据CRUD操作的统一接口
- 数据完整性验证和自动修复
- 数据版本控制和备份管理

**负责的数据类型：**
```javascript
{
  // 角色数据
  characters: Map<characterId, Character>,
  
  // 家族数据  
  families: Map<familyId, Family>,
  
  // 资源数据
  resources: Map<resourceType, ResourceData>,
  
  // 地点数据
  locations: Map<locationId, Location>,
  
  // 关系数据
  relationships: Map<relationshipId, Relationship>
}
```

**数据来源：**
- `CharacterGenerator` → 新创建的角色数据
- `GameEngine` → 游戏循环中的数据更新
- `FamilySystem` → 家族关系数据
- `外部数据表` → CSV/JSON配置数据

**数据存储位置：**
```javascript
class UnifiedDataManager {
  constructor() {
    // 主数据存储 - 内存中的权威数据
    this.dataStore = new Map();
    
    // 备份存储 - 多版本备份
    this.backupStore = new Map();
    
    // 缓存存储 - 查询性能优化
    this.cache = new Map();
  }
}
```

**数据读取接口：**
```javascript
// 单个数据读取
getCharacter(id) → Character
getFamily(id) → Family  
getResource(type) → ResourceData

// 批量数据读取
getAllCharacters() → Character[]
getAllFamilies() → Family[]
getCharactersByLocation(location) → Character[]
```

**数据更新流程：**
```
请求数据更新
    ↓
验证数据合法性
    ↓
创建数据快照（用于回滚）
    ↓
执行数据更新
    ↓
验证更新结果
    ↓
保存到主存储 + 备份存储
    ↓  
发送数据变更事件
    ↓
清理相关缓存
```

#### 🗂️ DataTableManager - 数据表管理器
**主要职能：**
- 外部数据表的加载和解析
- CSV/JSON格式数据的统一访问
- 数据表缓存和热更新

**负责的数据表：**
```javascript
{
  // 配置类数据表
  virtue_system: "德行系统配置",
  balance_config: "游戏平衡参数", 
  
  // 内容类数据表
  character_names: "南北朝姓名库",
  skill_definitions: "技能定义表",
  location_configs: "地点配置表",
  event_templates: "事件模板表"
}
```

**数据存储位置：**
```javascript
class DataTableManager {
  constructor() {
    // 表数据缓存
    this.tables = new Map();
    
    // 加载状态管理
    this.loadPromises = new Map();
  }
}
```

### 2. 业务逻辑层 (Business Logic Layer)

#### 🎮 GameEngine - 游戏引擎核心
**主要职能：**
- 游戏系统的统一协调者
- 游戏循环和时间管理
- 模块间的依赖注入和生命周期管理
- 游戏状态的总体控制

**负责协调的系统：**
```javascript
class GameEngine {
  constructor() {
    // 新架构核心组件
    this.dataManager = new UnifiedDataManager(this);
    this.eventBus = new EventBus();
    this.stateManager = new GameStateManager(this);
    
    // 业务系统组件
    this.characterGenerator = new CharacterGenerator(this);
    this.familySystem = new FamilySystem();
    this.nameGenerator = new NameGenerator();
    
    // 原有游戏系统（保持不变）
    this.timeSystem = new TimeSystem();
    this.resourceSystem = new ResourceSystem(this);
    this.virtueSystem = new VirtueSystem();
    this.skillSystem = new SkillSystem();
    this.behaviorSystem = new BehaviorSystem();
    this.decisionEngine = new DecisionEngine(this);
    this.actionProcessor = new ActionProcessor(this);
    this.memorySystem = new MemorySystem();
    this.locationSystem = new LocationSystem();
    this.relationshipSystem = new RelationshipSystem();
  }
}
```

#### ⏰ TimeSystem - 时间系统
**主要职能：**
- 游戏时间的计算和管理
- 季节、节气、时辰的转换
- 时间相关事件的触发
- 时间倍速和暂停控制

**管理的时间数据：**
```javascript
{
  // 游戏时间状态
  totalSeconds: "游戏总秒数",
  currentDay: "当前游戏天数",
  currentSeason: "当前季节(春夏秋冬)",
  currentWeather: "当前天气",
  currentTimeOfDay: "当前时辰",
  
  // 时间控制
  timeScale: "时间倍速因子",
  isPaused: "是否暂停",
  lastUpdateTime: "上次更新时间戳",
  
  // 节气系统
  solarTerm: "当前节气",
  seasonProgress: "季节进度",
  
  // 天气系统
  weatherPattern: "天气模式",
  weatherDuration: "天气持续时间"
}
```

**数据来源和依赖：**
```javascript
// 配置数据来源
DataTableManager.getBalanceConfig() → 时间系统平衡参数
DEFAULT_CONFIG.TIME_CONFIG → 基础时间配置
DEFAULT_CONFIG.WEATHER_SYSTEM → 天气系统配置

// 系统依赖
Utils.Math → 随机数生成
EventBus → 时间变化事件通知
```

**数据输出和影响：**
```javascript
TimeSystem.update(deltaTime)
    ↓
计算新的时间状态
    ↓
检测时间节点变化(新的一天、季节变更等)
    ↓
EventBus.emit('timeChanged', timeData)
EventBus.emit('seasonChanged', seasonData) // 季节变更时
EventBus.emit('weatherChanged', weatherData) // 天气变更时
    ↓
GameEngine接收时间事件 → 更新gameState
    ↓
其他系统响应时间变化：
- ResourceSystem → 季节性生产调整
- BehaviorSystem → 时间相关行为触发
- DecisionEngine → 时间敏感决策
- CharacterGenerator → 年龄增长处理
    ↓
StateManager.syncTimeStates() → 时间状态统计
    ↓
UI显示时间信息更新
```

**在新架构中的定位：**
- **层级**：业务逻辑层 (Business Logic Layer)
- **角色**：时间管理服务提供者
- **职责边界**：只负责时间计算，不直接修改角色/资源数据
- **通信方式**：通过EventBus通知时间变化，其他系统订阅响应

**数据流向控制：**
```
GameEngine (协调中心)
    ↓
系统间数据请求 → DataManager → 返回数据
    ↓
系统执行业务逻辑
    ↓  
数据变更 → DataManager → 触发事件
    ↓
EventBus → StateManager → UI更新
```

**游戏状态管理：**
```javascript
{
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
  initializationProgress: 0
}
```

#### 🗂️ 其他业务系统
**在新架构中作为GameEngine的协调管理对象，保持原有功能：**

##### 📦 ResourceSystem - 资源管理系统
- **职责边界**：资源的生产、消耗、存储、交易管理
- **数据来源**：角色行为产生的资源变化、时间系统的季节影响
- **数据存储**：内部的 `this.resources = new Map()` 存储各类资源数据
- **数据输出**：通过EventBus发送 `resource_changed` 事件
- **与新架构交互**：通过事件适配器集成，不直接访问数据管理器

##### 🗺️ LocationSystem - 地点系统
- **职责边界**：地点状态、容量、角色分布、地点功能管理
- **数据来源**：角色移动行为、建设活动、时间系统影响
- **数据存储**：内部的 `this.locations = new Map()` 存储地点信息
- **数据输出**：通过EventBus发送 `character_moved`、`location_updated` 事件
- **与新架构交互**：通过事件适配器集成，响应角色位置变更

##### 🔧 SkillSystem - 技能系统
- **职责边界**：技能学习、等级提升、技能效果计算
- **数据来源**：角色的学习行为、师承关系、实践活动
- **数据存储**：技能数据存储在各个角色对象的 `skillSystem` 属性中
- **数据输出**：通过EventBus发送 `skill_learned`、`skill_level_up` 事件
- **与新架构交互**：通过事件适配器集成，技能数据变更通过角色更新流程

##### 🎯 BehaviorSystem - 行为系统  
- **职责边界**：行为模式分析、行为决策执行、习惯形成管理
- **数据来源**：DecisionEngine的决策结果、角色状态变化
- **数据存储**：行为历史和模式存储在 MemorySystem 中
- **数据输出**：通过EventBus发送 `behavior_executed`、`habit_formation` 事件
- **与新架构交互**：通过事件适配器集成，行为执行结果影响角色德行等数据

##### 🤔 DecisionEngine - 决策引擎
- **职责边界**：角色决策制定、目标设定、计划创建
- **数据来源**：角色当前状态、需求分析、环境因素
- **数据存储**：决策历史存储在 MemorySystem 中
- **数据输出**：通过EventBus发送 `decision_made`、`goal_set` 事件
- **与新架构交互**：通过事件适配器集成，决策结果驱动行为执行

##### ⚡ ActionProcessor - 行为处理器
- **职责边界**：具体行为的执行处理、资源消耗计算、结果应用
- **数据来源**：BehaviorSystem提供的行为指令
- **数据存储**：行为执行结果直接应用到相关系统（资源、位置等）
- **数据输出**：行为执行完成后的状态变更
- **与新架构交互**：执行结果通过各系统的事件适配器传播

##### 🧠 MemorySystem - 记忆系统
- **职责边界**：角色记忆存储、经验积累、历史事件记录
- **数据来源**：角色的所有行为和经历
- **数据存储**：记忆数据存储在各个角色对象的 `memorySystem` 属性中
- **数据输出**：为DecisionEngine提供历史经验数据
- **与新架构交互**：记忆数据变更通过角色更新流程同步

##### 💕 RelationshipSystem - 关系系统
- **职责边界**：角色间关系管理、好感度计算、社交网络分析
- **数据来源**：角色间的互动行为、共同经历、德行相似度
- **数据存储**：关系数据存储在全局的关系网络中
- **数据输出**：关系变化影响角色行为决策
- **与新架构交互**：关系数据独立管理，通过接口与其他系统交互

##### 🌟 VirtueSystem - 德行系统（全局）
- **职责边界**：德行规则定义、德行效果计算、德行成就管理
- **数据来源**：GameConfig中的德行配置、行为对德行的影响规则
- **数据存储**：全局德行规则，具体角色德行数据存储在各角色的 `virtueSystem` 中
- **数据输出**：德行变化通过事件适配器通知
- **与新架构交互**：德行数据变更通过角色更新流程同步，全局德行规则保持独立
**主要职能：**
- 角色数据的智能生成
- 角色生命周期管理（出生、死亡、迁移）
- 角色池和统计管理
- 特殊角色类型生成

**生成的数据类型：**
```javascript
// 角色基础数据
{
  id: "unique_id",
  name: "生成的姓名",
  age: "智能年龄",
  gender: "男/女",
  
  // 外观数据
  appearance: {
    height: "身高",
    weight: "体重", 
    beauty: "相貌",
    strength: "体格"
  },
  
  // 性格数据
  personality: {
    introversion: "内向度",
    stability: "稳定性",
    confidence: "自信度",
    cooperation: "合作度",
    curiosity: "好奇心"
  },
  
  // 德行配置
  virtueConfig: {
    "相爱倾向": "数值",
    "勇敢倾向": "数值",
    // ... 更多德行特质
  },
  
  // 背景数据
  background: {
    type: "出身类型",
    description: "背景描述",
    skills: ["初始技能"],
    traits: "背景特质加成"
  }
}
```

**数据来源和依赖：**
```javascript
// 外部数据依赖
DataTableManager.getCharacterNamesConfig() → 姓名生成
DataTableManager.getVirtueSystemConfig() → 德行配置
DataTableManager.getBalanceConfig() → 平衡参数

// 系统依赖
NameGenerator → 专业姓名生成
FamilySystem → 家族关系处理
Utils → 随机数生成工具
```

**数据输出和流向：**
```javascript
CharacterGenerator.generateRandomCharacter()
    ↓
构建完整角色配置
    ↓
DataManager.createCharacter(config)
    ↓
创建Character实例 + VirtueSystem等子系统
    ↓
存储到DataStore + BackupStore
    ↓
EventBus.emit('character_created')
    ↓
StateManager.syncCharacterStates()
    ↓
UI自动更新显示
```

### 3. 状态管理层 (State Management Layer)

#### 📊 GameStateManager - 游戏状态管理器
**主要职能：**
- 统一的游戏状态存储和管理
- 状态变更的自动通知机制
- 状态历史记录和回滚
- 状态的序列化和反序列化

**管理的状态类型：**
```javascript
{
  // 时间相关状态
  time: {
    currentDay: "当前游戏天数",
    currentSeason: "当前季节",
    currentWeather: "当前天气", 
    timeOfDay: "当前时辰",
    seasonProgress: "季节进度百分比"
  },
  
  // 角色相关状态
  characters: {
    totalCount: "角色总数",
    byLocation: "按地点分布",
    byAge: "年龄分布统计", 
    byGender: "性别分布统计",
    averageStats: "平均属性统计"
  },
  
  // 资源相关状态  
  resources: {
    food: "食物总量",
    water: "水源总量",
    materials: "建材总量",
    tools: "工具总量"
  },
  
  // 家族相关状态
  families: {
    totalFamilies: "家族总数",
    averageSize: "平均家族规模",
    prosperityLevels: "繁荣等级分布"
  },
  
  // 地点相关状态
  locations: {
    occupancyRates: "各地点占用率",
    comfortLevels: "舒适度水平", 
    functionalityScores: "功能性评分"
  },
  
  // 技能相关状态
  skills: {
    totalSkills: "技能总数",
    averageLevel: "平均技能水平",
    masterCrafters: "大师级工匠数",
    skillDistribution: "技能分布"
  },
  
  // 德行相关状态
  virtues: {
    totalVirtueSystems: "德行系统总数", 
    averageVirtueLevel: "平均德行水平",
    dominantVirtues: "主导德行趋势"
  }
}
```

**状态更新流程：**
```
数据管理器触发数据变更事件
    ↓
GameStateManager接收事件
    ↓
调用对应的状态同步方法
    ↓
重新计算相关统计数据
    ↓
更新状态存储
    ↓
发送状态变更通知
    ↓
UI组件自动响应更新
```

**状态存储结构：**
```javascript
class GameStateManager {
  constructor() {
    // 当前状态存储
    this.currentState = new Map();
    
    // 状态历史记录
    this.stateHistory = new Map();
    
    // 状态订阅者
    this.subscribers = new Map();
    
    // 状态变更队列
    this.updateQueue = [];
  }
}
```

#### 🌐 EventBus - 事件总线
**主要职能：**
- 模块间的松耦合通信
- 事件的发布和订阅管理
- 事件的优先级和批处理
- 事件的错误处理和重试

**事件类型和数据流：**
```javascript
// 角色相关事件
{
  'character_created': {
    characterId: "角色ID",
    character: "角色对象",
    timestamp: "创建时间"
  },
  
  'character_updated': {
    characterId: "角色ID", 
    before: "更新前快照",
    after: "更新后数据",
    source: "更新来源"
  },
  
  'character_moved': {
    characterId: "角色ID",
    fromLocation: "原地点",
    toLocation: "新地点"
  }
}

// 系统状态事件  
{
  'stateChanged': {
    stateType: "状态类型",
    oldValue: "旧值", 
    newValue: "新值",
    timestamp: "变更时间"
  },
  
  'gameUpdated': {
    deltaTime: "时间增量",
    day: "游戏天数",
    season: "当前季节",
    population: "人口数量"
  }
}

// 资源相关事件
{
  'resourceChanged': {
    type: "资源类型",
    change: "变化量",
    newTotal: "新总量",
    source: "变化原因"
  }
}
```

**事件处理流程：**
```
模块A发出事件 → EventBus.emit()
    ↓
事件路由和优先级处理
    ↓
通知所有订阅者 → 模块B.onEvent()
    ↓
错误处理和重试机制
    ↓
事件完成通知
```

### 4. 表现层 (Presentation Layer)

#### 🖼️ GameInterface - 游戏界面控制器
**主要职能：**
- 游戏界面的统一控制
- 用户交互的事件处理
- 数据到视图的绑定管理
- 界面状态的维护

**管理的界面组件：**
```javascript
{
  // 主界面区域
  mainContainer: "主容器",
  navigationTabs: "导航标签页",
  
  // 角色相关界面
  charactersContainer: "角色列表容器",
  characterCards: "角色卡片集合",
  characterDetailModal: "角色详情弹窗",
  
  // 资源相关界面  
  resourcesContainer: "资源显示容器",
  resourceBars: "资源进度条",
  
  // 控制界面
  gameControls: "游戏控制按钮",
  settingsPanel: "设置面板",
  debugPanel: "调试面板"
}
```

**数据绑定机制：**
```javascript
// 状态订阅和自动更新
gameInterface.subscribe('characters', (data) => {
  this.updateCharactersDisplay(data);
});

gameInterface.subscribe('resources', (data) => {
  this.updateResourcesDisplay(data);  
});

// 数据到视图的映射
updateCharactersDisplay(charactersData) {
  // 清理现有显示
  // 创建新的角色卡片
  // 绑定交互事件
  // 应用视觉效果
}
```

#### 🧩 UI Components - UI组件库
**主要职能：**
- 可复用UI组件的提供
- 组件的数据绑定和更新
- 组件间的通信机制
- 统一的视觉样式管理

**组件类型和职责：**
```javascript
{
  // 角色相关组件
  CharacterCard: {
    职责: "单个角色信息的显示和交互",
    数据来源: "GameStateManager.characters",
    更新触发: "character_updated事件"
  },
  
  CharacterDetailPanel: {
    职责: "角色详细信息的展示",
    数据来源: "DataManager.getCharacter()",
    更新触发: "用户点击角色卡片"
  },
  
  // 资源相关组件
  ResourceBar: {
    职责: "单个资源的进度显示",
    数据来源: "GameStateManager.resources", 
    更新触发: "resource_changed事件"
  },
  
  // 控制相关组件
  GameSpeedControl: {
    职责: "游戏速度控制",
    数据来源: "GameEngine.gameState.speed",
    更新触发: "用户操作"
  },
  
  // 统计相关组件
  StatisticsChart: {
    职责: "游戏数据的图表展示",
    数据来源: "GameStateManager.各类统计",
    更新触发: "stateChanged事件"
  }
}
```

## 🔄 数据流完整示例

### 示例1：创建新角色的完整数据流
```
用户点击"添加移民"按钮
    ↓
GameInterface.onAddImmigrant()
    ↓  
GameEngine.characterGenerator.generateImmigrantWave(1)
    ↓
CharacterGenerator.generateRandomCharacter(config)
    ↓
[内部] 构建角色配置(姓名、年龄、德行等)
    ↓
DataManager.createCharacter(config) 
    ↓
[内部] 创建Character + VirtueSystem + 其他子系统
    ↓
[内部] 数据验证 → 存储到DataStore → 创建备份
    ↓
EventBus.emit('character_created', {characterId, character})
    ↓
StateManager监听到事件 → syncCharacterStates()
    ↓  
[内部] 重新计算人口统计、地点分布等
    ↓
EventBus.emit('stateChanged', {type: 'characters', newData})
    ↓
GameInterface监听到状态变更 → updateCharactersDisplay()
    ↓
[内部] 创建新的CharacterCard → 添加到界面 → 绑定事件
    ↓
用户在界面上看到新角色出现
```

### 示例2：角色德行变化的完整数据流
```
游戏循环中角色执行"帮助他人"行为
    ↓
GameEngine.executeCharacterAction(character, action)
    ↓
BehaviorSystem.processBehavior('帮助他人')
    ↓
VirtueSystem.applyBehaviorEffect('帮助他人', character.virtueSystem)
    ↓
[内部] 德行特质数值变化(如"利他倾向"+3, "相爱倾向"+2)
    ↓
DataManager.updateCharacterData(characterId, updatedData, 'behavior')
    ↓
[内部] 数据验证 → 创建快照 → 保存更新 → 创建备份
    ↓
EventBus.emit('character_updated', {characterId, before, after})
    ↓
StateManager监听到事件 → syncVirtueStates()
    ↓
[内部] 重新计算平均德行水平、主导德行趋势等  
    ↓
EventBus.emit('stateChanged', {type: 'virtues', newData})
    ↓
GameInterface监听到状态变更 → 找到对应的CharacterCard
    ↓
CharacterCard.updateVirtueDisplay() → 德行信息视觉更新
    ↓
用户在界面上看到角色德行特质的变化
```

## 🎯 架构设计优势

### 1. **单一职责原则**
- 每个模块只负责一个明确的功能领域
- 数据管理、状态管理、界面控制完全分离

### 2. **统一数据源**  
- 所有数据通过UnifiedDataManager统一管理
- 消除数据不一致和同步问题

### 3. **事件驱动通信**
- 模块间通过EventBus松耦合通信
- 支持异步处理和错误隔离

### 4. **自动状态同步**
- 数据变更自动触发状态更新
- UI组件自动响应状态变化

### 5. **高度可扩展**
- 新功能模块可独立开发和集成
- 支持插件化架构扩展

### 6. **数据安全保护**
- 多层数据验证和自动修复
- 完善的备份和回滚机制

## 📋 与原有架构的对比

### 原有架构问题
```
❌ 数据分散在各个模块中，难以维护
❌ 界面和逻辑混合，职责不清
❌ 手动调用更新，容易遗漏
❌ 模块间强耦合，难以测试
❌ 数据同步需要手动管理
❌ 错误处理和恢复机制缺失
```

### 新架构解决方案
```
✅ 统一数据管理，单一权威源  
✅ 清晰的分层架构，职责明确
✅ 事件驱动自动更新，实时响应
✅ 松耦合通信，独立可测试
✅ 自动状态同步，数据一致性保证
✅ 完善的错误处理和数据保护机制
```

---

**这个框架设计文档明确了每个模块的职责、数据流向、存储位置和交互方式。基于这个框架，可以精确地进行模块重构。**