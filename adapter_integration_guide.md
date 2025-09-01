# 🔌 事件适配器集成指南

## 📋 更新说明

我已经更新了 `game_engine.js` 来集成所有新创建的事件适配器。以下是具体的更改：

## ✅ 已集成的适配器

### 1. **导入所有适配器**
```javascript
import { addEventSupportToCharacters } from './character_module_event_adapter.js';
import { addEventSupportToResourceSystem } from './resource_system_event_adapter.js';
import { addEventSupportToLocationSystem } from './location_system_event_adapter.js';
import { addEventSupportToVirtueSystem } from './virtue_system_event_adapter.js';
import { addEventSupportToSkillSystem } from './skill_system_event_adapter.js';
import { addEventSupportToBehaviorSystem } from './behavior_system_event_adapter.js';
import { addEventSupportToDecisionEngine } from './decision_engine_event_adapter.js';
```

### 2. **在 setupEventAdapters() 中激活所有适配器**
```javascript
setupEventAdapters() {
  // 为所有现有模块添加事件支持
  addEventSupportToCharacters(this.characters, this.eventBus);
  addEventSupportToResourceSystem(this.resourceSystem, this.eventBus);
  addEventSupportToLocationSystem(this.locationSystem, this.eventBus);
  addEventSupportToVirtueSystem(this.virtueSystem, this.eventBus);
  addEventSupportToSkillSystem(this.skillSystem, this.eventBus);
  addEventSupportToBehaviorSystem(this.behaviorSystem, this.eventBus);
  addEventSupportToDecisionEngine(this.decisionEngine, this.eventBus);
}
```

### 3. **新增事件监听器**
现在游戏引擎监听所有新的事件类型：

#### 地点事件
- `characterMoved` - 角色移动事件
- `locationUpdated` - 地点状态更新
- `locationCapacityWarning` - 地点容量警告

#### 德行事件  
- `virtueChanged` - 德行值变化
- `virtueAchievementUnlocked` - 德行成就解锁
- `virtueComboAchieved` - 德行组合达成

#### 技能事件
- `skillLearned` - 技能学习
- `skillLevelUp` - 技能升级  
- `skillAchievementUnlocked` - 技能成就解锁

#### 行为事件
- `behaviorExecuted` - 行为执行
- `behaviorConflict` - 行为冲突
- `habitFormation` - 习惯形成

#### 决策事件
- `decisionMade` - 决策制定
- `goalSet` - 目标设定
- `planCreated` - 计划创建

### 4. **新增事件处理方法**
为每类事件添加了专门的处理方法：

- `handleCharacterMoved()` - 处理角色移动
- `handleLocationUpdated()` - 处理地点更新
- `handleVirtueChanged()` - 处理德行变化
- `handleVirtueAchievement()` - 处理德行成就
- `handleSkillLearned()` - 处理技能学习
- `handleSkillLevelUp()` - 处理技能升级
- `handleBehaviorExecuted()` - 处理行为执行
- `handleBehaviorConflict()` - 处理行为冲突
- `handleDecisionMade()` - 处理决策制定
- `handleGoalSet()` - 处理目标设定

### 5. **增强的状态同步**
`syncGameState()` 方法现在收集所有系统的统计信息：

```javascript
const currentState = {
  // 基础状态
  population, day, season, weather, time, resources, characters,
  
  // 新增状态
  locations: this.locationSystem.getAllLocations?.() || {},
  virtues: this.gatherVirtueStatistics(),
  skills: this.gatherSkillStatistics(),
  behaviors: this.gatherBehaviorStatistics(),
  decisions: this.gatherDecisionStatistics(),
  locationStatistics: this.gatherLocationStatistics(),
  familyStatistics: this.gatherFamilyStatistics()
};
```

## 🎯 新功能说明

### 智能事件通知
现在游戏会自动通知重要事件：

```javascript
// 德行提升通知
"李大郎的孝道提升了15点（原因：赡养老人）"

// 技能升级通知  
"⬆️ 王二娘的纺织缝纫技能提升到第10级！"

// 行为冲突警告
"⚠️ 张三在求神拜佛和赌博对弈之间存在行为冲突"

// 地点容量警告
"农田人员接近饱和，当前18/20"
```

### 综合统计信息
状态管理器现在提供丰富的统计数据：

```javascript
// 德行统计
{
  totalVirtuePoints: 1250,
  averageVirtueLevel: 25,
  virtueDistribution: { "孝": 180, "忠": 165, "礼": 140 }
}

// 技能统计
{
  totalSkillPoints: 800,
  averageSkillLevel: 16,
  skillDistribution: { "农耕": 120, "手工雕琢": 95, "武艺": 80 },
  masteredSkills: 12
}

// 行为统计
{
  totalBehaviors: 350,
  behaviorFrequency: { "垦荒耕种": 45, "进食饮水": 60, "休息睡眠": 35 },
  conflictCount: 3
}

// 家族统计
{
  totalFamilies: 3,
  averageFamilySize: 6.7,
  familyDistribution: { "李": 8, "王": 6, "张": 6 },
  generationCount: { "李": 3, "王": 2, "张": 2 }
}
```

## 🚀 使用示例

### 监听特定事件

```javascript
// 监听德行成就
gameEngine.eventBus.on('virtueAchievementUnlocked', (data) => {
    console.log(`🌟 ${data.characterId} 在 ${data.virtueType} 达到 ${data.level}!`);
    // 可以触发特殊庆祝动画或奖励
});

// 监听技能升级
gameEngine.eventBus.on('skillLevelUp', (data) => {
    if (data.newLevel >= 20) {
        console.log(`🎖️ ${data.characterId} 成为 ${data.skillName} 大师！`);
    }
});

// 监听行为冲突
gameEngine.eventBus.on('behaviorConflict', (data) => {
    // 可以显示选择对话框让玩家决定如何解决冲突
    showConflictResolutionDialog(data);
});
```

### 访问统计数据

```javascript
// 获取当前所有统计信息
const allStats = gameEngine.stateManager.getAllStates();

// 德行排行榜
const virtueStats = allStats.virtues;
console.log('平均德行水平:', virtueStats.averageVirtueLevel);

// 技能分布
const skillStats = allStats.skills;
console.log('技能大师数量:', skillStats.masteredSkills);

// 家族信息
const familyStats = allStats.familyStatistics;
console.log('最大家族:', Object.keys(familyStats.familyDistribution)
    .reduce((a, b) => familyStats.familyDistribution[a] > familyStats.familyDistribution[b] ? a : b));
```

### 响应地点事件

```javascript
// 监听角色移动，更新UI
gameEngine.eventBus.on('characterMoved', (data) => {
    updateCharacterLocationOnMap(data.characterId, data.toLocation);
    
    if (data.toLocation === '市集') {
        // 角色进入市集，显示交易选项
        showMarketOptions(data.characterId);
    }
});

// 监听地点容量警告
gameEngine.eventBus.on('locationCapacityWarning', (data) => {
    if (data.level === 'critical') {
        showLocationOvercrowdingAlert(data.locationName);
    }
});
```

## 🔧 自定义扩展

### 添加新的事件监听

如果你想添加自己的事件处理逻辑：

```javascript
// 在游戏引擎初始化后添加
gameEngine.eventBus.on('skillCombined', (data) => {
    // 处理技能组合事件
    console.log(`技能组合: ${data.sourceSkills.join(' + ')} = ${data.resultSkill}`);
    
    // 发送特殊通知
    gameEngine.eventBus.emit('gameEvent', {
        type: 'success',
        message: `🎉 发现新技能组合：${data.resultSkill}！`
    });
});

// 监听决策困难
gameEngine.eventBus.on('poorDecisionWarning', (data) => {
    // 为决策困难的角色提供建议
    providDecisionAdvice(data.characterId, data.decision);
});
```

### 创建自定义统计

```javascript
// 扩展状态同步，添加自定义统计
const originalSyncGameState = gameEngine.syncGameState.bind(gameEngine);
gameEngine.syncGameState = function() {
    // 调用原方法
    originalSyncGameState();
    
    // 添加自定义统计
    const customStats = {
        happinessIndex: this.calculateHappinessIndex(),
        productivityIndex: this.calculateProductivityIndex(),
        socialHarmony: this.calculateSocialHarmony()
    };
    
    this.stateManager.updateState('customStatistics', customStats);
};
```

## 📊 监控和调试

### 事件流监控

```javascript
// 监控所有事件（调试用）
gameEngine.eventBus.on('*', (eventName, data) => {
    console.log(`[EVENT] ${eventName}:`, data);
});

// 只监控特定类型的事件
const importantEvents = ['virtueChanged', 'skillLevelUp', 'behaviorConflict'];
importantEvents.forEach(eventName => {
    gameEngine.eventBus.on(eventName, (data) => {
        console.log(`[IMPORTANT] ${eventName}:`, data);
    });
});
```

### 性能监控

```javascript
// 监控事件处理性能
gameEngine.eventBus.on('decisionMade', (data) => {
    if (data.processingTime > 1000) {
        console.warn(`决策处理时间过长: ${data.processingTime}ms`);
    }
});

// 监控状态更新频率
let stateUpdateCount = 0;
gameEngine.stateManager.subscribe('*', () => {
    stateUpdateCount++;
});

setInterval(() => {
    console.log(`状态更新频率: ${stateUpdateCount}/分钟`);
    stateUpdateCount = 0;
}, 60000);
```

## ⚠️ 注意事项

### 1. **事件监听器内存管理**
确保在不需要时移除事件监听器：

```javascript
// 添加监听器
const handler = (data) => console.log(data);
gameEngine.eventBus.on('someEvent', handler);

// 移除监听器
gameEngine.eventBus.off('someEvent', handler);
```

### 2. **避免事件循环**
小心不要在事件处理器中触发相同的事件：

```javascript
// ❌ 错误：可能导致无限循环
gameEngine.eventBus.on('virtueChanged', (data) => {
    gameEngine.virtueSystem.changeVirtue(data.characterId, 'bonus', 1);
});

// ✅ 正确：添加条件判断
gameEngine.eventBus.on('virtueChanged', (data) => {
    if (data.reason !== 'bonus' && data.change > 10) {
        gameEngine.virtueSystem.changeVirtue(data.characterId, 'bonus', 1, 'bonus');
    }
});
```

### 3. **错误处理**
在事件处理器中添加适当的错误处理：

```javascript
gameEngine.eventBus.on('complexEvent', (data) => {
    try {
        // 复杂的处理逻辑
        processComplexEvent(data);
    } catch (error) {
        console.error('事件处理出错:', error);
        gameEngine.eventBus.emit('gameEvent', {
            type: 'error',
            message: `事件处理失败: ${error.message}`
        });
    }
});
```

## 🧪 测试建议

### 验证适配器集成

```javascript
// 测试所有适配器是否正常工作
async function testAllAdapters() {
    const tests = [
        () => testCharacterAdapter(),
        () => testResourceAdapter(),
        () => testLocationAdapter(),
        () => testVirtueAdapter(),
        () => testSkillAdapter(),
        () => testBehaviorAdapter(),
        () => testDecisionAdapter()
    ];
    
    for (const test of tests) {
        try {
            await test();
            console.log(`✅ ${test.name} 测试通过`);
        } catch (error) {
            console.error(`❌ ${test.name} 测试失败:`, error);
        }
    }
}

function testVirtueAdapter() {
    let eventReceived = false;
    
    gameEngine.eventBus.on('virtueChanged', () => {
        eventReceived = true;
    });
    
    // 触发德行变化
    const character = Array.from(gameEngine.characters.values())[0];
    gameEngine.virtueSystem.changeVirtue(character.id, '孝', 5, '测试');
    
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (eventReceived) resolve();
            else reject(new Error('德行事件未触发'));
        }, 100);
    });
}
```

## 🎉 完成检查清单

确保以下所有项目都已完成：

- [x] 导入所有7个事件适配器
- [x] 在 setupEventAdapters() 中激活所有适配器
- [x] 添加所有新事件的监听器
- [x] 实现所有事件处理方法
- [x] 增强 syncGameState() 收集所有统计信息
- [x] 添加统计收集方法
- [x] 测试所有适配器功能

现在你的游戏引擎已经完全集成了所有事件适配器，拥有了完整的事件驱动架构！🚀