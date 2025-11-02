# 方案C - 混合方案完整执行计划

> **策略**: 新版规范结构 + 分阶段迁移旧版高级功能

---

## 📦 已生成的文件清单

### Phase 1 文件 (立即使用)

| 文件名 | 用途 | 状态 |
|--------|------|------|
| **behavior_patterns_v2_complete.json** | 12个行为完整版 | ✅ 已生成 |
| **locations.json** | 5个地点蓝图 | ✅ 已生成 |
| **interaction_patterns.json** | 4个互动模式 | ✅ 已生成 |

### Phase 2-3 文件 (预留)

| 文件名 | 用途 | 状态 |
|--------|------|------|
| **behavior_context_modifiers.json** | 天气/季节/时段修正 | ✅ 框架已生成 |
| **behavior_chains.json** | 行为链系统 | ✅ 框架已生成 |
| **decision_weights.json** | 决策权重 | ⏳ Phase 2创建 |

---

## 🎯 Phase 1 执行步骤 (本周完成)

### 步骤1: 文件放置 ✅

```bash
项目根目录/
├── data_tables/
│   ├── locations.json                        ← 使用已生成的
│   ├── behavior_patterns.json                ← 替换为 behavior_patterns_v2_complete.json
│   ├── interaction_patterns.json             ← 使用已生成的
│   └── (其他现有配置...)
```

**操作**:
1. 下载 `behavior_patterns_v2_complete.json`
2. 重命名为 `behavior_patterns.json`
3. 放到 `data_tables/` 目录

### 步骤2: 修改 unified_data_manager.js ✅

按照 `unified_data_manager_修改指南.md` 执行:

#### 2.1 DataTableManager 构造函数
```javascript
class DataTableManager {
  constructor(validator) {  // ← 添加参数
    this.validator = validator;
    // ...
  }
}
```

#### 2.2 添加新的便捷方法
```javascript
async getLocations() {
  return await this.loadTable('locations', 'json');
}

async getInteractionPatterns() {
  return await this.loadTable('interaction_patterns', 'json');
}
```

#### 2.3 添加 Schema 校验器
在 `DataValidator.setupDefaultValidators()` 中添加:
- location 校验器
- behavior 校验器
- interaction 校验器

#### 2.4 添加自动校验方法
在 `DataTableManager` 中添加 `_validateDataTable()` 方法

### 步骤3: 运行CLI校验 ✅

```bash
node validate_data_tables.js
```

**预期输出**:
```
✅ locations.json 校验通过 (5条)
✅ behavior_patterns.json 校验通过 (12条)  ← 注意数量变为12
✅ interaction_patterns.json 校验通过 (4条)
```

### 步骤4: 游戏中测试加载 ✅

启动游戏，在控制台:
```javascript
// 测试新的12个行为
const behaviors = await gameEngine.dataManager.dataTableManager.getBehaviorPatterns();
console.log('行为列表:', behaviors.behaviors.map(b => b.name));
// 应输出: ["进食饮水", "休息睡眠", "盥洗沐浴", "垦荒耕钟", "拓地伐林", 
//          "手工雕琢", "觅求好友", "饮酒聚宴", "追求伴侣", "经义研读", 
//          "踏青出游", "祝祷祭祀"]
```

### 步骤5: 创建最小Demo ⏳

**目标**: 两角色 + 单地点 + 进食 + 问候

**Demo脚本**:
```javascript
// 创建测试角色
const char1 = await gameEngine.dataManager.createCharacter({
  name: "郭建功",
  age: 25,
  gender: "男"
});

const char2 = await gameEngine.dataManager.createCharacter({
  name: "李淑慧",
  age: 23,
  gender: "女"
});

// 设置地点
char1.currentLocation = "井台";
char2.currentLocation = "井台";

// 触发行为
// 1. 两人问候
await gameEngine.triggerInteraction("greet_casual", char1, char2);

// 2. 进食
await gameEngine.triggerBehavior("eat_drink", char1);
await gameEngine.triggerBehavior("eat_drink", char2);

// 查看状态变化
console.log("角色1状态:", char1.physicalState, char1.emotionalState);
console.log("角色2状态:", char2.physicalState, char2.emotionalState);
console.log("关系:", char1.relationships.get(char2.id));
```

---

## 🚀 Phase 2 执行步骤 (~3周后)

### 目标: 集成上下文修正系统

### 步骤1: 放置Phase 2文件

```bash
data_tables/
├── behavior_context_modifiers.json    ← 新增
├── behavior_chains.json               ← 新增
└── decision_weights.json              ← 待创建
```

### 步骤2: 扩展 DecisionEngine

在 `decision_engine.js` 中添加:

```javascript
class DecisionEngine {
  constructor(gameEngine) {
    // ...现有代码...
    
    // Phase 2: 加载上下文修正器
    this.contextModifiers = null;
    this.behaviorChains = null;
    this.decisionWeights = null;
  }
  
  async initialize() {
    // 加载配置
    const dataManager = this.gameEngine.dataManager.dataTableManager;
    this.contextModifiers = await dataManager.loadTable('behavior_context_modifiers', 'json');
    this.behaviorChains = await dataManager.loadTable('behavior_chains', 'json');
    // this.decisionWeights = await dataManager.loadTable('decision_weights', 'json');
  }
  
  /**
   * Phase 2: 应用上下文修正
   */
  applyContextModifiers(behavior, character, context) {
    const weather = context.weather;
    const season = context.season;
    const timeOfDay = context.timeOfDay;
    
    let score = behavior.baseScore;
    
    // 天气修正
    if (this.contextModifiers.weatherModifiers[weather]) {
      const weatherMod = this.contextModifiers.weatherModifiers[weather];
      if (behavior.category === 'production') {
        score *= weatherMod.workEfficiencyBonus;
      }
      score += weatherMod.moodBonus * 0.1;
    }
    
    // 季节修正
    if (this.contextModifiers.seasonModifiers[season]) {
      const seasonMod = this.contextModifiers.seasonModifiers[season];
      const behaviorBonus = seasonMod.seasonalBonus?.[behavior.id];
      if (behaviorBonus) {
        score *= behaviorBonus;
      }
    }
    
    // 时段修正
    if (this.contextModifiers.timeOfDayModifiers[timeOfDay]) {
      const timeMod = this.contextModifiers.timeOfDayModifiers[timeOfDay];
      if (behavior.category === 'production') {
        score *= timeMod.workEfficiency;
      }
      if (behavior.category === 'social') {
        score *= timeMod.socialActivity;
      }
    }
    
    return score;
  }
  
  /**
   * Phase 2: 检查行为链
   */
  checkBehaviorChain(character, currentTime) {
    // 检查角色是否在某个行为链中
    const activeChain = character.activeChain;
    if (activeChain) {
      const chain = this.behaviorChains.chains.find(c => c.id === activeChain);
      if (chain) {
        // 获取当前阶段应该做的行为
        const currentPhase = this._getCurrentPhase(chain, currentTime);
        if (currentPhase) {
          return currentPhase.behaviors;
        }
      }
    }
    
    // 检查是否应该触发新的行为链
    for (const chain of this.behaviorChains.chains) {
      if (this._shouldTriggerChain(chain, character)) {
        character.activeChain = chain.id;
        return chain.sequence[0].behaviors;
      }
    }
    
    return null;
  }
}
```

### 步骤3: 测试上下文系统

```javascript
// 测试天气影响
gameEngine.setWeather("风雪");
const decision1 = decisionEngine.makeDecision(char1, context);
console.log("风雪天气决策:", decision1.action);

// 测试行为链
char1.activeChain = "work_day";
const decision2 = decisionEngine.makeDecision(char1, context);
console.log("劳动日行为链:", decision2.action);
```

---

## 🚀 Phase 3 执行步骤 (~6周后)

### 目标: 完善决策权重系统

### 步骤1: 创建 decision_weights.json

从旧版迁移:
```json
{
  "urgencyFactors": {
    "physical_needs": 3.0,
    "emotional_distress": 2.0,
    "social_obligations": 1.5,
    "work_deadlines": 1.8
  },
  "personalityInfluence": {
    "virtue_traits": 1.5,
    "ability_match": 1.3,
    "social_class": 1.2
  }
}
```

### 步骤2: 集成到 DecisionEngine

```javascript
calculateFinalScore(behavior, character, context) {
  let score = behavior.priority;
  
  // Phase 1: 基础需求匹配
  score += this._calculateNeedMatch(behavior, character);
  
  // Phase 2: 上下文修正
  score = this.applyContextModifiers(behavior, character, context);
  
  // Phase 3: 决策权重
  score *= this._calculateUrgencyWeight(behavior, character);
  score *= this._calculatePersonalityWeight(behavior, character);
  
  return score;
}
```

---

## 📊 各阶段对比

| 特性 | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| **行为数量** | 12个 ✅ | 12个 | 12个+ |
| **地点数量** | 5个 ✅ | 5个+ | 10个+ |
| **互动数量** | 4个 ✅ | 4个+ | 10个+ |
| **天气影响** | ❌ | ✅ | ✅ |
| **季节影响** | ❌ | ✅ | ✅ |
| **时段影响** | 基础 | ✅完整 | ✅完整 |
| **行为链** | ❌ | ✅ | ✅ |
| **决策权重** | 基础 | 基础 | ✅完整 |
| **Schema校验** | ✅ | ✅ | ✅ |

---

## ✅ 验收标准

### Phase 1 验收 (本周)

- [ ] 3个数据表文件正确放置
- [ ] CLI校验工具运行成功
- [ ] 游戏加载时显示校验通过日志
- [ ] 12个行为全部可用
- [ ] 最小Demo成功运行

### Phase 2 验收 (~3周后)

- [ ] 上下文修正系统生效
- [ ] 行为链可以正常触发和执行
- [ ] 天气/季节/时段影响明显
- [ ] 决策结果符合上下文

### Phase 3 验收 (~6周后)

- [ ] 决策权重系统完整
- [ ] AI决策更智能和合理
- [ ] 长程模拟稳定运行

---

## 🎯 当前行动清单

### 立即执行 (今天)

1. ✅ 下载 `behavior_patterns_v2_complete.json`
2. ✅ 重命名为 `behavior_patterns.json`
3. ✅ 放到 `data_tables/` 目录
4. ⏳ 按修改指南修改 `unified_data_manager.js`
5. ⏳ 运行 CLI 校验工具测试

### 本周完成

1. ⏳ 完成 unified_data_manager.js 修改
2. ⏳ 测试数据加载
3. ⏳ 创建最小 Demo
4. ⏳ 继续 Phase 1 其他任务

### Phase 2 准备 (预留)

- behavior_context_modifiers.json 已准备
- behavior_chains.json 已准备
- DecisionEngine 扩展方案已设计

---

## 📚 相关文档

- [behavior_patterns_版本对比分析.md](computer:///mnt/user-data/outputs/behavior_patterns_版本对比分析.md) - 详细对比
- [unified_data_manager_修改指南.md](computer:///mnt/user-data/outputs/unified_data_manager_修改指南.md) - 代码修改步骤
- [Phase1_数据表集成_完整使用说明.md](computer:///mnt/user-data/outputs/Phase1_数据表集成_完整使用说明.md) - 集成指南

---

**方案优势**:
- ✅ Phase 1立即可用 (12个行为)
- ✅ 结构规范，易维护
- ✅ 分阶段实施，风险可控
- ✅ 保留旧版所有高级功能
- ✅ 模块化设计，职责清晰

**执行建议**: 先完成Phase 1，稳定运行后再推进Phase 2-3

---

**文档版本**: v1.0  
**创建日期**: 2025-11-02  
**当前阶段**: Phase 1 执行中
