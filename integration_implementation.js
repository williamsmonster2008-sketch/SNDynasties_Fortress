/**
 * integration_implementation.js - 三层关系系统整合实施脚本
 * 
 * 功能：具体修复现有模块中发现的问题
 * 执行：在 GameEngine 初始化后调用
 */

/**
 * 实施修复的具体步骤和代码
 */
export class IntegrationImplementation {
  
  /**
   * 在 GameEngine 中添加的整合代码
   */
  static getGameEngineIntegrationCode() {
    return `
// ==================== 在 GameEngine 构造函数中添加 ====================

// 导入三层关系系统整合器
import ThreeLayerRelationshipIntegrator from './relationship_systems_integration.js';

// 在构造函数末尾添加：
async initializeRelationshipSystems() {
  console.log('🔄 开始初始化三层关系系统');
  
  // 创建并执行整合
  this.relationshipIntegrator = new ThreeLayerRelationshipIntegrator(this);
  await this.relationshipIntegrator.integrate();
  
  // 获取关系系统管理器
  this.relationshipManager = this.relationshipIntegrator.getRelationshipManager();
  
  console.log('✅ 三层关系系统初始化完成');
}

// 修改现有的 initializeGame 方法，在其中调用：
async initializeGame() {
  // ... 现有初始化代码 ...
  
  // 初始化三层关系系统（在所有其他系统之后）
  await this.initializeRelationshipSystems();
  
  // ... 其余代码 ...
}
`;
  }

  /**
   * CharacterGenerator 需要修复的具体问题
   */
  static getCharacterGeneratorFixes() {
    return {
      issues: [
        {
          location: 'buildCharacterConfig 方法',
          problem: '直接调用内部姓名生成逻辑',
          fix: '改为调用 gameEngine.nameGenerator.generateName()',
          code: `
// ❌ 原有代码（需要删除）:
const name = this.generateRandomName(gender, socialClass);

// ✅ 修复后代码:
const nameResult = await this.gameEngine.nameGenerator.generateName({
  gender: gender,
  socialClass: socialClass,
  familyName: options.familyName,
  generation: options.generation || 3,
  role: options.role || 'resident'
});
const name = nameResult.fullName;
`
        },
        {
          location: 'generateRandomCharacter 方法',
          problem: '直接创建 RelationshipSystem',
          fix: '移除关系系统创建代码，由 DataManager 统一管理',
          code: `
// ❌ 原有代码（需要删除）:
character.relationshipSystem = new RelationshipSystem(character.id);

// ✅ 修复后：完全删除这行代码，改为在配置中标记
config.useThreeLayerRelationships = true;
`
        }
      ],
      
      methodsToRemove: [
        'generateRandomName',
        'generateName', 
        'createRelationshipSystem'
      ],
      
      methodsToAdd: [
        'createCharacterFamily'
      ]
    };
  }

  /**
   * Character Module 需要修复的具体问题
   */
  static getCharacterModuleFixes() {
    return {
      issues: [
        {
          location: 'Character 构造函数',
          problem: '直接引用 RelationshipSystem',
          fix: '移除旧关系系统引用，标记需要新系统',
          code: `
// ❌ 原有代码（需要修改）:
this.relationshipSystem = new RelationshipSystem(this.id);

// ✅ 修复后代码:
// 删除上述代码，添加：
this._needsThreeLayerRelationships = true;
this._relationshipSystemsInitialized = false;
`
        },
        {
          location: '关系查询方法',
          problem: '调用旧的关系系统方法',
          fix: '更新为三层关系系统方法',
          code: `
// ❌ 原有代码:
getRelationship(otherCharacterId) {
  return this.relationshipSystem.getRelationship(otherCharacterId);
}

// ✅ 修复后代码:
getRelationship(otherCharacterId) {
  this.initializeRelationshipSystems();
  return this.getComplexRelationship(otherCharacterId);
}
`
        }
      ],
      
      methodsToUpdate: [
        'getRelationship',
        'getRelationshipType', 
        'getAllRelationships'
      ],
      
      methodsToAdd: [
        'initializeRelationshipSystems',
        'getComplexRelationship',
        'getBloodRelation',
        'hasBloodRelation'
      ]
    };
  }

  /**
   * NameGenerator 集成检查
   */
  static getNameGeneratorIntegrationCheck() {
    return `
// NameGenerator 接口检查
function checkNameGeneratorIntegration(gameEngine) {
  const issues = [];
  
  // 检查 NameGenerator 是否存在
  if (!gameEngine.nameGenerator) {
    issues.push({
      type: 'missing',
      message: 'NameGenerator 未初始化',
      fix: 'await import NameGenerator 并创建实例'
    });
  }
  
  // 检查必要方法
  const requiredMethods = ['generateName', 'loadConfigurations'];
  if (gameEngine.nameGenerator) {
    for (const method of requiredMethods) {
      if (typeof gameEngine.nameGenerator[method] !== 'function') {
        issues.push({
          type: 'missing_method',
          message: \`NameGenerator 缺少 \${method} 方法\`,
          method: method
        });
      }
    }
  }
  
  // 检查 CharacterGenerator 中的重复代码
  if (gameEngine.characterGenerator) {
    const conflictMethods = ['generateName', 'generateRandomName'];
    for (const method of conflictMethods) {
      if (typeof gameEngine.characterGenerator[method] === 'function') {
        issues.push({
          type: 'conflict',
          message: \`CharacterGenerator 中存在重复的 \${method} 方法\`,
          fix: \`删除 CharacterGenerator.\${method}\`
        });
      }
    }
  }
  
  return issues;
}
`;
  }

  /**
   * 完整的修复实施计划
   */
  static getImplementationPlan() {
    return {
      step1: {
        title: "创建新文件",
        files: [
          'family_system.js (已创建)',
          'social_identity_system.js (已创建)', 
          'emotional_relationship_system.js (已创建)',
          'complex_relationship_api.js (已创建)',
          'relationship_systems_integration.js (已创建)'
        ]
      },
      
      step2: {
        title: "删除冲突文件",
        files: [
          'relationship_system.js (已删除)'
        ]
      },
      
      step3: {
        title: "修改现有文件",
        files: [
          {
            file: 'game_engine.js',
            changes: [
              '添加三层关系系统导入',
              '在 initializeGame 中调用关系系统初始化',
              '添加 relationshipManager 引用'
            ]
          },
          {
            file: 'character_generator.js', 
            changes: [
              '移除内部姓名生成方法',
              '移除关系系统创建代码',
              '添加 NameGenerator 调用',
              '修改角色配置构建逻辑'
            ]
          },
          {
            file: 'character_module.js',
            changes: [
              '移除 RelationshipSystem 引用',
              '添加三层关系系统初始化方法',
              '更新关系查询方法',
              '添加向后兼容接口'
            ]
          }
        ]
      },
      
      step4: {
        title: "验证和测试",
        tasks: [
          '检查所有接口是否正常工作',
          '验证三层关系显示格式',
          '测试角色创建和关系建立',
          '确认向后兼容性'
        ]
      }
    };
  }

  /**
   * 自动检测和修复脚本
   */
  static getAutoFixScript() {
    return `
/**
 * 自动检测和修复现有代码中的接口冲突
 */
async function autoFixIntegrationIssues(gameEngine) {
  const fixes = [];
  
  try {
    // 1. 检查和修复 CharacterGenerator
    if (gameEngine.characterGenerator) {
      const generator = gameEngine.characterGenerator;
      
      // 移除冲突方法
      const conflictMethods = ['generateName', 'generateRandomName', 'createRelationshipSystem'];
      for (const method of conflictMethods) {
        if (typeof generator[method] === 'function') {
          delete generator[method];
          fixes.push(\`删除 CharacterGenerator.\${method} 冲突方法\`);
        }
      }
      
      // 添加新的集成方法
      if (!generator.createCharacterFamily) {
        generator.createCharacterFamily = function(options) {
          return gameEngine.relationshipManager?.createFamily(options);
        };
        fixes.push('添加 CharacterGenerator.createCharacterFamily 方法');
      }
    }
    
    // 2. 检查和修复 Character 实例
    for (const [characterId, character] of gameEngine.characters) {
      // 移除旧的关系系统引用
      if (character.relationshipSystem) {
        delete character.relationshipSystem;
        fixes.push(\`移除角色 \${character.name} 的旧关系系统引用\`);
      }
      
      // 标记需要新关系系统
      if (!character._relationshipSystemsInitialized) {
        character._needsThreeLayerRelationships = true;
        fixes.push(\`标记角色 \${character.name} 需要三层关系系统\`);
      }
    }
    
    // 3. 检查 UnifiedDataManager 集成
    if (gameEngine.dataManager) {
      const dataManager = gameEngine.dataManager;
      
      // 确保角色创建流程包含关系系统初始化
      if (!dataManager._relationshipSystemIntegrated) {
        const originalCreateCharacter = dataManager.createCharacter;
        
        dataManager.createCharacter = async function(config) {
          const character = await originalCreateCharacter.call(this, config);
          
          // 为新角色初始化三层关系系统
          if (gameEngine.relationshipManager && config.useThreeLayerRelationships !== false) {
            gameEngine.relationshipManager.createCharacterRelationSystems(character);
          }
          
          return character;
        };
        
        dataManager._relationshipSystemIntegrated = true;
        fixes.push('集成三层关系系统到 DataManager 角色创建流程');
      }
    }
    
    console.log('🔧 自动修复完成:', fixes);
    return { success: true, fixes: fixes };
    
  } catch (error) {
    console.error('❌ 自动修复失败:', error);
    return { success: false, error: error.message };
  }
}

// 使用示例：在 GameEngine 中调用
// const fixResult = await autoFixIntegrationIssues(this);
`;
  }

  /**
   * 验证整合是否成功的测试脚本
   */
  static getValidationScript() {
    return `
/**
 * 验证三层关系系统整合是否成功
 */
function validateIntegration(gameEngine) {
  const results = {
    overall: { passed: true, score: 0, maxScore: 0 },
    systems: [],
    characters: [],
    interfaces: []
  };
  
  // 1. 验证三层关系系统存在
  const systemChecks = [
    { name: 'RelationshipManager', path: 'relationshipManager' },
    { name: 'FamilySystem', path: 'relationshipManager.familySystem' },
    { name: 'SocialIdentitySystem', path: 'relationshipManager.socialIdentitySystem' },
    { name: 'EmotionalRelationshipSystem', path: 'relationshipManager.emotionalRelationshipSystem' },
    { name: 'ComplexRelationshipAPI', path: 'relationshipManager.complexRelationshipAPI' }
  ];
  
  for (const check of systemChecks) {
    const exists = getNestedProperty(gameEngine, check.path);
    results.systems.push({
      name: check.name,
      exists: !!exists,
      initialized: exists?.isInitialized || false
    });
    results.overall.maxScore += 2;
    if (exists) results.overall.score += 1;
    if (exists?.isInitialized) results.overall.score += 1;
  }
  
  // 2. 验证角色的关系系统
  const sampleSize = Math.min(3, gameEngine.characters.size);
  let sampleCount = 0;
  
  for (const [characterId, character] of gameEngine.characters) {
    if (sampleCount >= sampleSize) break;
    
    const characterResult = {
      id: characterId,
      name: character.name,
      hasThreeLayerSystems: false,
      hasSocialIdentitySystem: !!character.socialIdentitySystem,
      hasEmotionalSystem: !!character.emotionalSystem,
      hasComplexRelationshipMethod: typeof character.getComplexRelationship === 'function',
      hasBloodRelationMethod: typeof character.getBloodRelation === 'function',
      initialized: character._relationshipSystemsInitialized || false
    };
    
    characterResult.hasThreeLayerSystems = 
      characterResult.hasSocialIdentitySystem && 
      characterResult.hasEmotionalSystem &&
      characterResult.hasComplexRelationshipMethod &&
      characterResult.hasBloodRelationMethod;
    
    results.characters.push(characterResult);
    results.overall.maxScore += 5;
    
    if (characterResult.hasSocialIdentitySystem) results.overall.score += 1;
    if (characterResult.hasEmotionalSystem) results.overall.score += 1;
    if (characterResult.hasComplexRelationshipMethod) results.overall.score += 1;
    if (characterResult.hasBloodRelationMethod) results.overall.score += 1;
    if (characterResult.initialized) results.overall.score += 1;
    
    sampleCount++;
  }
  
  // 3. 验证接口修复
  const interfaceChecks = [
    {
      name: 'CharacterGenerator.createCharacterFamily',
      exists: gameEngine.characterGenerator && typeof gameEngine.characterGenerator.createCharacterFamily === 'function'
    },
    {
      name: 'CharacterGenerator 无冲突方法',
      exists: gameEngine.characterGenerator && 
              !gameEngine.characterGenerator.generateName && 
              !gameEngine.characterGenerator.createRelationshipSystem
    },
    {
      name: 'DataManager 关系系统集成',
      exists: gameEngine.dataManager && gameEngine.dataManager._relationshipSystemIntegrated
    }
  ];
  
  for (const check of interfaceChecks) {
    results.interfaces.push(check);
    results.overall.maxScore += 1;
    if (check.exists) results.overall.score += 1;
  }
  
  // 计算总体通过率
  results.overall.passed = results.overall.score / results.overall.maxScore >= 0.8;
  results.overall.percentage = Math.round((results.overall.score / results.overall.maxScore) * 100);
  
  return results;
}

// 辅助函数：获取嵌套属性
function getNestedProperty(obj, path) {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

// 打印验证结果
function printValidationResults(results) {
  console.log('\\n📊 三层关系系统整合验证结果:');
  console.log(\`总体通过率: \${results.overall.percentage}% (\${results.overall.score}/\${results.overall.maxScore})\`);
  
  console.log('\\n🔧 系统状态:');
  results.systems.forEach(sys => {
    const status = sys.exists && sys.initialized ? '✅' : sys.exists ? '⚠️' : '❌';
    console.log(\`  \${status} \${sys.name}: \${sys.exists ? '存在' : '缺失'} \${sys.initialized ? '已初始化' : '未初始化'}\`);
  });
  
  console.log('\\n👤 角色状态:');
  results.characters.forEach(char => {
    const status = char.hasThreeLayerSystems && char.initialized ? '✅' : '⚠️';
    console.log(\`  \${status} \${char.name}: \${char.hasThreeLayerSystems ? '完整' : '不完整'}\`);
  });
  
  console.log('\\n🔌 接口状态:');
  results.interfaces.forEach(iface => {
    const status = iface.exists ? '✅' : '❌';
    console.log(\`  \${status} \${iface.name}\`);
  });
  
  if (results.overall.passed) {
    console.log('\\n🎉 整合验证通过！三层关系系统已成功整合。');
  } else {
    console.log('\\n⚠️ 整合验证未完全通过，请检查上述问题。');
  }
}
`;
  }

  /**
   * 实际的执行步骤说明
   */
  static getExecutionSteps() {
    return {
      prerequisites: [
        '确保已创建所有新的关系系统文件',
        '确保已删除旧的 relationship_system.js',
        '确保 GameEngine 可以正常运行'
      ],
      
      steps: [
        {
          step: 1,
          title: '在 GameEngine 中集成三层关系系统',
          action: '将整合代码添加到 game_engine.js',
          code: 'this.getGameEngineIntegrationCode()',
          verification: '检查 gameEngine.relationshipManager 是否存在'
        },
        
        {
          step: 2,
          title: '运行自动修复脚本',
          action: '在浏览器控制台中执行自动修复',
          code: 'await autoFixIntegrationIssues(gameEngine)',
          verification: '检查修复结果中的 fixes 数组'
        },
        
        {
          step: 3,
          title: '验证整合结果',
          action: '运行验证脚本检查整合状态',
          code: 'const results = validateIntegration(gameEngine); printValidationResults(results);',
          verification: '整合通过率应达到 80% 以上'
        },
        
        {
          step: 4,
          title: '测试复合关系功能',
          action: '测试角色间的复合关系显示',
          code: `
// 创建测试角色
const char1 = await gameEngine.characterGenerator.generateRandomCharacter();
const char2 = await gameEngine.characterGenerator.generateRandomCharacter();

// 测试复合关系
const relationship = char1.getComplexRelationship(char2.id);
console.log('复合关系显示:', relationship.displayName);
console.log('关系强度:', relationship.overallStrength);
console.log('重要性等级:', relationship.relationshipImportance);
`,
          verification: '复合关系显示格式应为"血缘关系·社会身份(情感关系)"'
        }
      ],
      
      troubleshooting: [
        {
          issue: 'RelationshipManager 未初始化',
          solution: '检查 ThreeLayerRelationshipIntegrator 的导入和调用'
        },
        {
          issue: '角色的关系方法不存在',
          solution: '确保调用了 createCharacterRelationSystems 方法'
        },
        {
          issue: 'NameGenerator 冲突',
          solution: '删除 CharacterGenerator 中的重复姓名生成方法'
        },
        {
          issue: '复合关系显示异常',
          solution: '检查三层关系系统的数据连接和格式化逻辑'
        }
      ]
    };
  }

  /**
   * 完整的实施检查清单
   */
  static getImplementationChecklist() {
    return {
      'Phase 1: 文件准备': [
        '✅ family_system.js 已创建',
        '✅ social_identity_system.js 已创建',
        '✅ emotional_relationship_system.js 已创建', 
        '✅ complex_relationship_api.js 已创建',
        '✅ relationship_systems_integration.js 已创建',
        '✅ relationship_system.js 已删除'
      ],
      
      'Phase 2: 核心整合': [
        '⏳ GameEngine 中添加三层关系系统导入',
        '⏳ GameEngine 中添加 initializeRelationshipSystems 方法',
        '⏳ GameEngine 中调用关系系统初始化',
        '⏳ 运行自动修复脚本处理冲突'
      ],
      
      'Phase 3: 模块修复': [
        '⏳ CharacterGenerator 移除冲突方法',
        '⏳ CharacterGenerator 集成 NameGenerator',
        '⏳ Character Module 移除旧关系系统引用',
        '⏳ Character Module 添加新关系方法',
        '⏳ UnifiedDataManager 集成关系系统创建'
      ],
      
      'Phase 4: 验证测试': [
        '⏳ 运行整合验证脚本',
        '⏳ 测试角色创建流程',
        '⏳ 测试复合关系显示',
        '⏳ 测试血缘关系查询',
        '⏳ 测试向后兼容性'
      ],
      
      'Phase 5: 最终确认': [
        '⏳ 所有现有功能正常工作',
        '⏳ 新的三层关系功能可用',
        '⏳ 性能没有显著下降',
        '⏳ 无JavaScript错误',
        '⏳ UI显示正常更新'
      ]
    };
  }
}

// ==================== 快速启动脚本 ====================

/**
 * 快速启动三层关系系统整合
 * 使用方法：在浏览器控制台中运行
 */
export function quickStartIntegration(gameEngine) {
  console.log('🚀 开始快速整合三层关系系统');
  
  const steps = IntegrationImplementation.getExecutionSteps();
  
  console.log('📋 执行步骤:');
  steps.steps.forEach(step => {
    console.log(`${step.step}. ${step.title}`);
    console.log(`   操作: ${step.action}`);
    console.log(`   验证: ${step.verification}`);
  });
  
  console.log('\\n⚠️ 请按步骤手动执行，每步完成后进行验证。');
  console.log('\\n🔧 可以运行以下命令进行自动修复:');
  console.log('await autoFixIntegrationIssues(gameEngine)');
  
  return steps;
}

export default IntegrationImplementation;