# 南北朝坞堡模拟器 - 完整亲属关系算法框架

## 一、核心设计原则

### 1.1 路径长度定义
- **父子/母子关系**: path = 1 (直接生育关系)
- **兄弟姐妹关系**: path = 2 (通过共同父母: 兄→父→弟)
- **配偶关系**: 不计入血缘路径,单独处理

### 1.2 关系分类体系
```
血缘关系 (Blood Relations)
├── 父系血亲 (Paternal) - 同姓,显示在家族谱系中
├── 母系血亲 (Maternal) - 异姓,仅在人际关系中显示
└── 姻亲关系 (In-Law) - 通过婚姻连接,仅在人际关系中显示
```

---

## 二、父系血亲(同姓)

### 2.1 判断规则
- **路径类型**: 只经过父子关系的路径
- **显示范围**: 出现在家族谱系树中
- **称谓前缀**: 
  - pathLength ≤ 6: 堂/从堂
  - pathLength ≥ 7: 族

### 2.2 完整称谓映射表

#### pathLength = 1
| gap | 称谓 | 路径示例 |
|-----|------|---------|
| 1 | 父亲/儿子 | 父→我 |

#### pathLength = 2
| gap | 称谓 | 路径示例 |
|-----|------|---------|
| 0 | 兄弟/姐妹 | 兄→父→我 |
| 2 | 祖父/孙子 | 祖父→父→我 |

#### pathLength = 3
| gap | 称谓 | 路径示例 |
|-----|------|---------|
| 1 | 叔父/侄子 | 叔父→祖父→父→我 |
| 3 | 曾祖父/曾孙 | 曾祖→祖→父→我 |

#### pathLength = 4
| gap | 称谓 | 路径示例 |
|-----|------|---------|
| 0 | **堂兄弟/堂姐妹** | 堂兄→叔父→祖父→父→我 |
| 2 | 叔祖父/侄孙 | 叔祖→祖父→父→我 |
| 4 | 高祖父/玄孙 | 高祖→曾祖→祖→父→我 |

#### pathLength = 5
| gap | 称谓 | 路径示例 |
|-----|------|---------|
| 1 | **堂叔父/堂侄** | 堂叔→叔祖→曾祖→祖→父→我 |
| 3 | 叔曾祖/侄曾孙 | 叔曾祖→曾祖→祖→父→我 |
| 5 | 天祖父/来孙 | 天祖→高祖→曾祖→祖→父→我 |

#### pathLength = 6
| gap | 称谓 | 路径示例 |
|-----|------|---------|
| 0 | **从堂兄弟/从堂姐妹** | 从堂兄→堂叔→叔祖→曾祖→祖→父→我 |
| 2 | 堂叔祖父/堂侄孙 | 堂叔祖→叔祖→曾祖→祖→父→我 |
| 4 | 叔高祖/堂侄玄孙 | 叔高祖→高祖→曾祖→祖→父→我 |

#### pathLength = 7
| gap | 称谓 | 说明 |
|-----|------|------|
| 1 | **族叔父/族侄** | 加"族"前缀 |
| 3 | 族叔曾祖/族侄曾孙 | |
| 5 | 族叔天祖/族侄来孙 | |

#### pathLength = 8
| gap | 称谓 | 说明 |
|-----|------|------|
| 0 | **族兄弟/族姐妹** | 加"族"前缀 |
| 2 | 族叔祖父/族侄孙 | |
| 4 | 族叔高祖/族侄玄孙 | |

#### pathLength ≥ 9
统一显示为"族人"或"亲属"

### 2.3 规律总结
- pathLength为奇数 → gap为奇数 (1,3,5...)
- pathLength为偶数 → gap为偶数 (0,2,4...)
- 0 ≤ gap ≤ pathLength

---

## 三、母系血亲(异姓)

### 3.1 判断规则
- **路径类型**: 经过母亲/外祖母等女性祖先的路径
- **显示范围**: 仅在人际关系中显示,不出现在家族谱系树
- **称谓前缀**:
  - pathLength ≤ 6: 表/从表 (不用"堂")
  - pathLength ≥ 7: 远表 (不用"族")

### 3.2 完整称谓映射表

#### pathLength = 1
| gap | 称谓 | 路径示例 |
|-----|------|---------|
| 1 | 母亲/儿女 | 母→我 |

#### pathLength = 2
| gap | 称谓 | 路径示例 |
|-----|------|---------|
| 2 | 外祖父/外孙 | 外祖父→母→我 |
| 2 | 外祖母/外孙 | 外祖母→母→我 |

#### pathLength = 3
| gap | 称谓 | 路径示例 |
|-----|------|---------|
| 1 | 舅父/外甥 | 舅父→外祖父→母→我 |
| 1 | 姨母/外甥 | 姨母→外祖母→母→我 |
| 2 | 舅祖父/外侄孙 | 舅祖→外祖母→母→我 |
| 3 | 外曾祖父/外曾孙 | 外曾祖→外祖→母→我 |

#### pathLength = 4
| gap | 称谓 | 路径示例 |
|-----|------|---------|
| 0 | **表兄弟/表姐妹** | 表兄→舅父→外祖父→母→我 |
| 2 | 外舅曾祖/表侄孙 | 外舅曾祖→外曾祖母→外祖母→母→我 |
| 4 | 外高祖父/外玄孙 | 外高祖→外曾祖→外祖→母→我 |

#### pathLength = 5
| gap | 称谓 | 路径示例 |
|-----|------|---------|
| 1 | **表叔父/表侄** | 表叔→表兄→舅父→外祖父→母→我 |
| 3 | 外舅曾祖/表侄曾孙 | 外舅曾祖→外曾祖→外祖→母→我 |
| 5 | 外天祖父/外来孙 | 外天祖→外高祖→外曾祖→外祖→母→我 |

#### pathLength = 6
| gap | 称谓 | 路径示例 |
|-----|------|---------|
| 0 | **从表兄弟/从表姐妹** | 从表兄→表叔→舅祖→外曾祖→外祖→母→我 |
| 2 | 表叔祖父/表侄孙 | |
| 4 | 外舅高祖/表侄玄孙 | |

#### pathLength = 7-8
| gap | 称谓 | 说明 |
|-----|------|------|
| 0 | **远表兄弟/远表姐妹** | 加"远表"前缀 |
| 1 | 远表叔父/远表侄 | |
| 2+ | 远表长辈/远表晚辈 | |

#### pathLength ≥ 9
统一显示为"远表亲属"

### 3.3 父系vs母系对比

| 关系类型 | 父系称谓 | 母系称谓 |
|---------|---------|---------|
| 直系祖先(gap=2) | 祖父 | 外祖父 |
| 直系祖先(gap=3) | 曾祖父 | 外曾祖父 |
| 旁系长辈(gap=1,path=3) | 叔父/姑母 | 舅父/姨母 |
| 旁系长辈(gap=2,path=4) | 叔祖父 | 舅祖父 |
| 同辈(gap=0,path=4) | 堂兄弟 | 表兄弟 |
| 同辈(gap=0,path=6) | 从堂兄弟 | 从表兄弟 |
| 同辈(gap=0,path≥7) | 族兄弟 | 远表兄弟 |
| 旁系晚辈(gap=1,path=5) | 堂侄 | 表侄 |

---

## 四、姻亲关系

### 4.1 核心原理
**姻亲不通过血缘路径计算,而是"借用"配偶或血亲的关系**

### 4.2 姻亲分类

#### 类型A: 血亲的配偶(直接姻亲)
```
规则: 血亲的配偶继承血亲的关系,调整性别称谓
算法: 
  1. 计算我与血亲的关系(path, gap)
  2. 获取血亲的配偶
  3. 转换性别称谓
```

**示例:**
| 血亲关系 | 血亲配偶称谓 |
|---------|------------|
| 姑母 (path=3,gap=1) | 姑父 |
| 叔父 (path=3,gap=1) | 叔母 |
| 堂兄 (path=4,gap=0) | 堂嫂 |
| 堂姐 (path=4,gap=0) | 堂姐夫 |
| 表兄 (path=4,gap=0,母系) | 表嫂 |
| 叔祖父 (path=4,gap=2) | 叔祖母 |

#### 类型B: 配偶的血亲(间接姻亲)
```
规则: 配偶的血亲根据配偶性别和我的性别,转换称谓
算法:
  1. 获取我的配偶
  2. 计算配偶与目标的关系(path, gap)
  3. 根据性别组合转换称谓
```

**示例 - 妻子家(我是男性):**
| 配偶视角关系 | 我的称谓 |
|------------|---------|
| 父亲 (path=1,gap=1) | 岳父 |
| 母亲 (path=1,gap=1) | 岳母 |
| 兄长 (path=2,gap=0) | 大舅子/内兄 |
| 弟弟 (path=2,gap=0) | 小舅子/内弟 |
| 姐姐 (path=2,gap=0) | 姨姐 |
| 妹妹 (path=2,gap=0) | 姨妹 |
| 祖父 (path=2,gap=2) | 岳祖父 |
| 祖母 (path=2,gap=2) | 岳祖母 |
| 叔伯 (path=3,gap=1) | 内叔伯 |

**示例 - 夫家(我是女性):**
| 配偶视角关系 | 我的称谓 |
|------------|---------|
| 父亲 (path=1,gap=1) | 公公 |
| 母亲 (path=1,gap=1) | 婆婆 |
| 兄长 (path=2,gap=0) | 大伯 |
| 弟弟 (path=2,gap=0) | 小叔 |
| 姐姐 (path=2,gap=0) | 大姑/姑姐 |
| 妹妹 (path=2,gap=0) | 小姑/姑妹 |

#### 类型C: 复合姻亲(可选实现)
```
规则: 配偶的血亲的配偶
示例: 妻子的姨母的丈夫 = 姨夫
算法: 递归组合类型A和类型B
```

### 4.3 配偶关系的特殊处理
- 配偶关系**不计入血缘路径**
- 配偶关系作为**跳转点**连接两个家族
- 在图遍历时,配偶边不增加pathLength

---

## 五、实现架构

### 5.1 数据结构

#### Path结构
```javascript
{
  from: 'char_001',
  to: 'char_002',
  relationType: 'father_child', // 或 'mother_child', 'sibling'
  gender: 'male',               // 这一步经过的人的性别
  throughMarriage: false        // 是否通过婚姻跳转
}
```

#### Relation结构
```javascript
{
  title: '堂兄',                 // 称谓
  relationType: 'cousin',        // 关系类型
  pathType: 'paternal',          // 路径类型: paternal/maternal/in_law
  pathLength: 4,                 // 路径长度
  generationGap: 0,              // 代际差绝对值
  generationDelta: 0,            // 代际差(带正负)
  closeness: 60,                 // 亲密度
  baseRelation: {...}            // 姻亲的基础关系(可选)
}
```

### 5.2 核心算法流程

```javascript
/**
 * 获取两人关系的完整流程
 */
function getRelationship(fromId, toId) {
  // 1. 计算最短路径
  const paths = findAllPaths(fromId, toId);
  if (!paths || paths.length === 0) return null;
  
  // 2. 路径分类
  const classifiedPaths = paths.map(path => ({
    path: path,
    type: classifyPath(path),        // paternal/maternal/in_law
    length: path.length
  }));
  
  // 3. 选择最优路径(优先级: 父系 > 母系 > 姻亲, 路径短优先)
  const bestPath = selectBestPath(classifiedPaths);
  
  // 4. 根据路径类型调用对应的称谓判断
  const sourceMember = getMember(fromId);
  const targetMember = getMember(toId);
  
  switch (bestPath.type) {
    case 'paternal':
      return determinePaternalTitle(bestPath, sourceMember, targetMember);
    case 'maternal':
      return determineMaternalTitle(bestPath, sourceMember, targetMember);
    case 'in_law':
      return determineInLawTitle(bestPath, sourceMember, targetMember);
  }
}

/**
 * 路径分类
 */
function classifyPath(path) {
  let hasFemaleAncestor = false;
  let hasMarriage = false;
  
  for (const step of path) {
    // 检查是否通过婚姻
    if (step.throughMarriage) {
      hasMarriage = true;
      break;
    }
    
    // 检查是否经过母系(mother_child且向上追溯)
    if (step.relationType === 'mother_child' && isAscending(step)) {
      hasFemaleAncestor = true;
    }
  }
  
  if (hasMarriage) return 'in_law';
  if (hasFemaleAncestor) return 'maternal';
  return 'paternal';
}

/**
 * 父系称谓判断
 */
function determinePaternalTitle(pathInfo, sourceMember, targetMember) {
  const pathLength = pathInfo.length;
  const generationDelta = targetMember.generation - sourceMember.generation;
  const generationGap = Math.abs(generationDelta);
  const isOlder = generationDelta > 0;
  const isMale = targetMember.gender === '男';
  
  // 根据 pathLength + gap 查表返回称谓
  // (详见第二章的完整映射表)
  
  return { title, relationType, pathLength, generationGap, generationDelta };
}

/**
 * 母系称谓判断
 */
function determineMaternalTitle(pathInfo, sourceMember, targetMember) {
  // 同上,使用第三章的母系映射表
}

/**
 * 姻亲称谓判断
 */
function determineInLawTitle(pathInfo, sourceMember, targetMember) {
  // 分析路径中的婚姻跳转点
  const marriagePoint = findMarriagePoint(pathInfo.path);
  
  if (marriagePoint.beforeMarriage.length === 0) {
    // 类型A: 血亲的配偶
    const bloodRelation = determinePaternalOrMaternalTitle(
      marriagePoint.afterMarriage, 
      sourceMember, 
      marriagePoint.spouse
    );
    return convertToSpouseTitle(bloodRelation, targetMember);
    
  } else {
    // 类型B: 配偶的血亲
    const spouseRelation = determinePaternalOrMaternalTitle(
      marriagePoint.afterMarriage,
      marriagePoint.spouse,
      targetMember
    );
    return convertToInLawTitle(spouseRelation, sourceMember, marriagePoint.spouse);
  }
}
```

### 5.3 称谓转换辅助函数

```javascript
/**
 * 转换为配偶称谓(类型A)
 */
function convertToSpouseTitle(bloodRelation, spouseGender) {
  const conversionMap = {
    '姑母': { male: '姑父', female: '姑母' },
    '叔父': { male: '叔父', female: '叔母' },
    '伯父': { male: '伯父', female: '伯母' },
    '堂兄': { male: '堂兄', female: '堂嫂' },
    '堂弟': { male: '堂弟', female: '堂弟媳' },
    '堂姐': { male: '堂姐夫', female: '堂姐' },
    '表兄': { male: '表兄', female: '表嫂' },
    '舅父': { male: '舅父', female: '舅母' },
    // ... 更多映射
  };
  
  const map = conversionMap[bloodRelation.title];
  return map ? map[spouseGender === '男' ? 'male' : 'female'] : bloodRelation.title;
}

/**
 * 转换为姻亲称谓(类型B)
 */
function convertToInLawTitle(spouseRelation, myGender, spouseGender) {
  // 我是男性,配偶是女性(妻子家)
  if (myGender === '男' && spouseGender === '女') {
    const wifeRelationMap = {
      '父亲': '岳父',
      '母亲': '岳母',
      '兄长': '大舅子',
      '弟弟': '小舅子',
      '祖父': '岳祖父',
      // ... 更多映射
    };
    return wifeRelationMap[spouseRelation.title] || '姻亲';
  }
  
  // 我是女性,配偶是男性(夫家)
  if (myGender === '女' && spouseGender === '男') {
    const husbandRelationMap = {
      '父亲': '公公',
      '母亲': '婆婆',
      '兄长': '大伯',
      '弟弟': '小叔',
      // ... 更多映射
    };
    return husbandRelationMap[spouseRelation.title] || '姻亲';
  }
  
  return '姻亲';
}
```

---

## 六、实施计划

### 阶段1: 父系血亲(优先级最高)
**目标**: 修复当前堂兄弟/堂侄判断错误的问题

**任务**:
1. 实现 `_determineKinshipByPathLength()` - 父系称谓判断
2. 修改 `_describeKinshipFromPath()` - 调用新方法
3. 新增 `_getRelationTypeFromTitle()` - 称谓到类型映射
4. 清理 `_addDerivedRelations()` - 删除旧的cousin判断逻辑
5. 清空 `familyMemberCache` - 解决name缓存问题

**验证**:
- 堂兄弟(path=4,gap=0)显示正确
- 堂侄(path=5,gap=1)显示正确
- 从堂兄弟(path=6,gap=0)显示正确
- 族兄弟(path=8,gap=0)显示正确

### 阶段2: 母系血亲
**目标**: 支持表亲、舅姨等母系称谓

**任务**:
1. 扩展Path结构 - 添加gender和throughMarriage字段
2. 实现 `_classifyPath()` - 路径分类(paternal/maternal)
3. 实现 `_determineMaternalTitle()` - 母系称谓判断
4. 修改 `_describeKinshipFromPath()` - 根据路径类型分发

**验证**:
- 表兄弟(path=4,gap=0,maternal)显示正确
- 舅父(path=3,gap=1,maternal)显示正确
- 外祖父(path=2,gap=2,maternal)显示正确

### 阶段3: 简单姻亲
**目标**: 支持血亲配偶和配偶直系亲属

**任务**:
1. 实现 `_calculateInLawRelation()` - 姻亲关系计算
2. 实现 `_convertToSpouseTitle()` - 配偶称谓转换(类型A)
3. 实现 `_convertToInLawTitle()` - 姻亲称谓转换(类型B)
4. 修改 `getRelationship()` - 增加姻亲判断分支

**验证**:
- 姑父(类型A)显示正确
- 岳父母(类型B)显示正确
- 大舅子(类型B)显示正确

### 阶段4: 复杂姻亲(可选)
**目标**: 支持配偶的旁系血亲配偶

**任务**:
1. 实现递归姻亲关系判断
2. 处理多重跳转的复杂路径

**验证**:
- 姨夫(妻子的姨母的丈夫)显示正确

### 阶段5: 优化与完善
**任务**:
1. 性能优化 - 路径缓存、索引优化
2. 边界情况处理 - 数据缺失、循环引用
3. 称谓别名 - 支持多种称呼方式
4. 文档完善 - API文档、示例代码

---

## 七、测试用例

### 7.1 父系血亲测试
```javascript
// 堂兄弟
我(郭, gen=4) → 堂兄(郭, gen=4, path=4) 
预期: "堂兄"

// 从堂兄弟
我(郭, gen=5) → 从堂兄(郭, gen=5, path=6)
预期: "从堂兄弟"

// 族兄弟
我(郭, gen=6) → 族兄(郭, gen=6, path=8)
预期: "族兄弟"

// 堂侄
我(郭, gen=3) → 堂侄(郭, gen=4, path=5)
预期: "堂侄"

// 堂叔父
我(郭, gen=4) → 堂叔(郭, gen=3, path=5)
预期: "堂叔父"
```

### 7.2 母系血亲测试
```javascript
// 外祖父
我(郭) → 外祖父(王, path=2, gap=2, maternal)
预期: "外祖父"

// 舅父
我(郭) → 舅父(王, path=3, gap=1, maternal)
预期: "舅父"

// 表兄弟
我(郭) → 表兄(王, path=4, gap=0, maternal)
预期: "表兄"

// 从表兄弟
我(郭) → 从表兄(王, path=6, gap=0, maternal)
预期: "从表兄"
```

### 7.3 姻亲测试
```javascript
// 姑父(类型A)
我(郭) → 姑母(郭) → 姑父(李)
预期: "姑父"

// 岳父(类型B)
我(郭) → 妻(王) → 岳父(王)
预期: "岳父"

// 大舅子(类型B)
我(郭) → 妻(王) → 内兄(王)
预期: "大舅子"或"内兄"
```

---

## 八、注意事项

### 8.1 性别称谓处理
- 多数称谓需要根据对方性别调整(兄/弟、姐/妹、父/母)
- 少数称谓固定(叔父、姑母、舅父、姨母)
- 配偶称谓转换需要特别注意

### 8.2 长幼排序
- 同辈关系需要年龄判断(兄/弟、姐/妹)
- 当前实现暂不区分,统一用"兄弟"、"姐妹"
- 后续可通过birthOrder字段优化

### 8.3 家族谱系显示
- **只显示父系同姓成员**
- 外来配偶(嫁入/入赘)可显示,但其父系亲属不显示
- 母系、姻亲只在人际关系中显示

### 8.4 路径计算优化
- 使用BFS保证最短路径
- 配偶关系作为图的边,但不计入pathLength
- 路径缓存避免重复计算

### 8.5 边界情况
- generation字段缺失 → 使用generationLevel兜底
- path不存在 → 返回null或"无关系"
- 多条等长路径 → 优先选择父系 > 母系 > 姻亲

---

## 九、扩展方向

### 9.1 称谓别名系统
支持多种称呼方式:
- 正式称谓: "堂兄"
- 口语称谓: "堂哥"
- 亲昵称谓: "二哥"

### 9.2 地域差异
不同地区称谓习惯不同:
- 北方: 姑父、姨父
- 南方: 姑丈、姨丈

### 9.3 历史考据
南北朝时期称谓的特殊性:
- 门阀士族的称谓更加严格
- 胡族的称谓系统差异
- 可参考《颜氏家训》等文献

### 9.4 动态关系
支持关系随时间变化:
- 婚姻导致的关系重组
- 收养导致的关系变化
- 出继(过继)的处理

### 9.5 关系强度计算
基于路径计算亲密度:
- 路径越短,亲密度越高
- 父系 > 母系 > 姻亲
- 用于AI决策、情感系统等

---

## 十、API接口设计

### 10.1 核心查询接口

```javascript
/**
 * 获取两人的关系
 * @param {string} fromId - 源角色ID
 * @param {string} toId - 目标角色ID
 * @returns {Object|null} 关系对象
 */
getRelationship(fromId, toId)

// 返回格式:
{
  title: '堂兄',              // 称谓
  relationType: 'cousin',     // 关系类型
  pathType: 'paternal',       // paternal/maternal/in_law
  pathLength: 4,              // 路径长度
  generationGap: 0,           // 代际差
  generationDelta: 0,         // 代际差(带方向)
  closeness: 60,              // 亲密度(0-100)
  path: [...]                 // 详细路径(可选)
}
```

### 10.2 家族树接口

```javascript
/**
 * 获取家族树数据(仅父系)
 * @param {string} familyName - 家族姓氏
 * @param {string} focusCharacterId - 焦点角色ID
 * @returns {Object} 家族树数据
 */
getFamilyTreeData(familyName, focusCharacterId)

// 返回格式:
{
  familyName: '郭',
  focusId: 'char_001',
  nodes: [
    {
      id: 'char_002',
      name: '郭建功',
      relationTitle: '父亲',
      generation: 3,
      relativeLevel: -1,  // 相对层级
      vitalStatus: 'living'
    },
    // ...
  ],
  levels: [
    {
      level: -1,
      label: '父母辈',
      members: [...]
    },
    // ...
  ],
  edges: [...],           // 关系连线
  summary: {
    total: 25,
    ancestors: 8,
    descendants: 10,
    sameGeneration: 7
  }
}
```

### 10.3 人际关系接口

```javascript
/**
 * 获取角色的所有人际关系(含母系、姻亲)
 * @param {string} characterId - 角色ID
 * @returns {Array} 关系列表
 */
getAllRelationships(characterId)

// 返回格式:
[
  {
    targetId: 'char_002',
    targetName: '郭建功',
    title: '父亲',
    relationType: 'ancestor',
    pathType: 'paternal',
    closeness: 100
  },
  {
    targetId: 'char_003',
    targetName: '王淑慧',
    title: '外祖母',
    relationType: 'ancestor',
    pathType: 'maternal',
    closeness: 75
  },
  {
    targetId: 'char_004',
    targetName: '李明',
    title: '岳父',
    relationType: 'in_law',
    pathType: 'in_law',
    closeness: 50
  },
  // ...
]
```

### 10.4 批量查询接口

```javascript
/**
 * 批量获取关系
 * @param {string} fromId - 源角色ID
 * @param {Array<string>} toIds - 目标角色ID列表
 * @returns {Map} ID到关系的映射
 */
batchGetRelationships(fromId, toIds)

// 返回格式:
Map {
  'char_002' => { title: '父亲', ... },
  'char_003' => { title: '堂兄', ... },
  // ...
}
```

---

## 十一、性能优化策略

### 11.1 路径缓存
```javascript
// 缓存已计算的路径
this.pathCache = new Map(); // key: 'fromId_toId', value: path

// 清除策略
- 角色创建/删除时清除相关缓存
- 婚姻关系变化时清除相关缓存
- 定期清理长时间未使用的缓存
```

### 11.2 关系图索引
```javascript
// 为常用关系建立索引
this.relationIndex = {
  parents: Map<childId, [fatherId, motherId]>,
  children: Map<parentId, Set<childId>>,
  siblings: Map<personId, Set<siblingId>>,
  spouses: Map<personId, spouseId>
}
```

### 11.3 增量更新
```javascript
// 只在关系变化时重新计算
- 监听角色创建事件 → 更新索引
- 监听婚姻事件 → 更新配偶索引
- 监听生育事件 → 更新父母/子女索引
```

### 11.4 懒加载
```javascript
// 家族树数据按需加载
- 初始只加载3代内的成员
- 用户展开时再加载更远代际
- 减少初始渲染压力
```

---

## 十二、数据完整性保障

### 12.1 generation字段统一
```javascript
// 确保所有角色都有generation字段
- 创建时赋值: generation = parentGeneration + 1
- 兼容性处理: generation || generationLevel
- 双向同步: Characters ↔ FamilySystem.families
```

### 12.2 path完整性检查
```javascript
// 验证路径的合法性
function validatePath(path) {
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i].to !== path[i+1].from) {
      throw new Error('路径不连续');
    }
  }
  
  // 检查是否存在循环
  const visited = new Set();
  for (const step of path) {
    if (visited.has(step.to)) {
      throw new Error('路径存在循环');
    }
    visited.add(step.to);
  }
}
```

### 12.3 配偶关系一致性
```javascript
// 确保配偶关系双向一致
if (person1.spouseId === person2.id) {
  assert(person2.spouseId === person1.id);
}
```

### 12.4 父母数据完整性
```javascript
// 子女必须有父母(除非是初始人口)
if (character.generation > 1) {
  assert(character.fatherId || character.motherId);
}

// 父母的generation必须比子女小1
if (character.fatherId) {
  const father = getCharacter(character.fatherId);
  assert(father.generation === character.generation - 1);
}
```

---

## 十三、错误处理

### 13.1 数据缺失处理
```javascript
// generation缺失
if (!generation) {
  generation = generationLevel || estimateGeneration(age);
}

// path不存在
if (!path) {
  return { title: '族人', relationType: 'distant' };
}

// 性别缺失
if (!gender) {
  gender = '男'; // 默认值
}
```

### 13.2 循环引用检测
```javascript
// 在路径搜索中防止无限循环
function findPath(fromId, toId, maxDepth = 10) {
  const visited = new Set();
  const queue = [{ id: fromId, path: [], depth: 0 }];
  
  while (queue.length > 0) {
    const current = queue.shift();
    
    if (current.depth > maxDepth) {
      console.warn('路径过长,可能存在循环');
      continue;
    }
    
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    
    // ... 继续搜索
  }
}
```

### 13.3 矛盾关系检测
```javascript
// 检测逻辑矛盾
function detectConflicts(character) {
  // A既是B的父亲又是B的兄弟?
  // A和B互为配偶,但同时是兄弟?
  // 代际关系矛盾(祖孙年龄倒挂)?
}
```

---

## 十四、调试工具

### 14.1 关系路径可视化
```javascript
/**
 * 打印两人之间的关系路径
 */
function printRelationPath(fromId, toId) {
  const relation = getRelationship(fromId, toId);
  if (!relation) {
    console.log('无关系');
    return;
  }
  
  console.log(`关系: ${relation.title}`);
  console.log(`路径长度: ${relation.pathLength}`);
  console.log(`代际差: ${relation.generationGap}`);
  console.log(`路径类型: ${relation.pathType}`);
  
  if (relation.path) {
    console.log('详细路径:');
    relation.path.forEach((step, i) => {
      const from = getCharacter(step.from);
      const to = getCharacter(step.to);
      console.log(`  ${i+1}. ${from.name} --[${step.relationType}]--> ${to.name}`);
    });
  }
}
```

### 14.2 关系统计
```javascript
/**
 * 统计角色的关系分布
 */
function analyzeRelationships(characterId) {
  const relations = getAllRelationships(characterId);
  
  const stats = {
    total: relations.length,
    paternal: relations.filter(r => r.pathType === 'paternal').length,
    maternal: relations.filter(r => r.pathType === 'maternal').length,
    inLaw: relations.filter(r => r.pathType === 'in_law').length,
    byType: {}
  };
  
  relations.forEach(r => {
    stats.byType[r.relationType] = (stats.byType[r.relationType] || 0) + 1;
  });
  
  console.table(stats);
}
```

### 14.3 家族树验证
```javascript
/**
 * 验证家族树数据的完整性
 */
function validateFamilyTree(familyName) {
  const family = getFamilyTreeData(familyName, null);
  
  const issues = [];
  
  // 检查孤立节点
  family.nodes.forEach(node => {
    const edges = family.edges.filter(e => 
      e.from === node.id || e.to === node.id
    );
    if (edges.length === 0 && node.generation > 1) {
      issues.push(`孤立节点: ${node.name}`);
    }
  });
  
  // 检查代际一致性
  family.edges.forEach(edge => {
    if (edge.type === 'parent_child') {
      const parent = family.nodes.find(n => n.id === edge.from);
      const child = family.nodes.find(n => n.id === edge.to);
      if (parent.generation >= child.generation) {
        issues.push(`代际错误: ${parent.name} -> ${child.name}`);
      }
    }
  });
  
  if (issues.length > 0) {
    console.warn('家族树验证失败:');
    issues.forEach(issue => console.warn('  - ' + issue));
  } else {
    console.log('✅ 家族树验证通过');
  }
  
  return issues;
}
```

---

## 十五、文档维护

### 15.1 代码注释规范
```javascript
/**
 * 计算两人的血缘关系
 * 
 * @description
 * 通过BFS搜索最短路径,根据路径长度和代际差判断称谓。
 * 支持父系、母系、姻亲三种路径类型。
 * 
 * @param {string} fromId - 源角色ID
 * @param {string} toId - 目标角色ID
 * @param {Object} options - 可选参数
 * @param {number} options.maxDepth - 最大搜索深度,默认10
 * @param {boolean} options.includePath - 是否返回详细路径,默认false
 * 
 * @returns {Object|null} 关系对象,无关系时返回null
 * 
 * @example
 * const relation = calculateRelation('char_001', 'char_002');
 * console.log(relation.title); // "堂兄"
 * 
 * @see {@link determinePaternalTitle} 父系称谓判断
 * @see {@link determineMaternalTitle} 母系称谓判断
 */
function calculateRelation(fromId, toId, options = {}) {
  // ...
}
```

### 15.2 变更日志
```markdown
## [1.0.0] - 2025-01-XX
### 新增
- 完整的父系血亲称谓系统(堂/从堂/族)
- 基于path长度的关系判断算法
- 家族树数据生成接口

### 修复
- 堂兄弟和堂侄的判断错误
- generation字段不一致问题
- 家族树节点name缺失问题

## [1.1.0] - 计划中
### 新增
- 母系血亲支持(表亲、舅姨)
- 姻亲关系支持(岳父母、姑父等)
```

### 15.3 测试用例文档
```markdown
# 关系判断测试用例

## TC-001: 堂兄弟判断
**前置条件**: 
- 角色A: 郭XX, generation=4
- 角色B: 郭YY, generation=4
- path长度=4 (A→父→祖→叔→B)

**执行**: getRelationship(A.id, B.id)

**预期结果**: 
- title: "堂兄"或"堂弟"
- relationType: "cousin"
- pathLength: 4
- generationGap: 0

**实际结果**: [待填写]

**状态**: ✅通过 / ❌失败 / ⏸跳过
```

---

## 结语

本框架设计力求完整、清晰、可扩展。实施时可按阶段推进,优先完成核心功能(父系血亲),再逐步扩展母系和姻亲支持。

**关键成功因素:**
1. **数据完整性** - generation字段、配偶关系、父母数据
2. **路径准确性** - 最短路径、路径分类、配偶边处理
3. **称谓正确性** - 查表准确、性别处理、长幼排序
4. **性能优化** - 缓存策略、索引优化、懒加载
5. **测试覆盖** - 单元测试、集成测试、边界测试

**后续优化方向:**
- 支持更多历史称谓变体
- 考虑地域差异
- 动态关系(收养、过继)
- 关系强度的精细化计算
- 可视化关系图谱

---

**文档版本**: v1.0  
**最后更新**: 2025-01-XX  
**维护者**: 开发团队  
**反馈渠道**: [待填写]