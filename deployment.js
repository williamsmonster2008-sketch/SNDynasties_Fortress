/**
 * deployment.js - 南北朝坞堡模拟器部署验证和健康检查
 * 
 * 功能：验证所有文件、配置和依赖，确保系统可以正常部署和运行
 */

export class DeploymentManager {
  constructor() {
    this.checkResults = [];
    this.startTime = Date.now();
  }

  /**
   * 执行完整的部署检查
   */
  async performDeploymentCheck() {
    console.log('🚀 开始南北朝坞堡模拟器部署检查...');
    console.log(`📅 检查时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log('='.repeat(60));

    const checkSuites = [
      { name: '文件完整性检查', func: this.checkFileIntegrity },
      { name: '模块依赖检查', func: this.checkModuleDependencies },
      { name: '配置验证', func: this.validateConfiguration },
      { name: '接口兼容性检查', func: this.checkInterfaceCompatibility },
      { name: '性能基准检查', func: this.checkPerformanceBenchmarks },
      { name: '浏览器兼容性检查', func: this.checkBrowserCompatibility },
      { name: '内存使用检查', func: this.checkMemoryUsage },
      { name: '启动流程验证', func: this.validateStartupFlow }
    ];

    for (const suite of checkSuites) {
      console.log(`\n🔍 执行 ${suite.name}...`);
      try {
        await suite.func.call(this);
        this.addResult(suite.name, true);
        console.log(`  ✅ ${suite.name} 通过`);
      } catch (error) {
        this.addResult(suite.name, false, error.message);
        console.log(`  ❌ ${suite.name} 失败: ${error.message}`);
      }
    }

    this.printDeploymentReport();
    return this.getDeploymentSummary();
  }

  /**
   * 检查文件完整性
   */
  async checkFileIntegrity() {
    const requiredFiles = [
      // 核心文件
      './gameConfig.js',
      './utils_module.js',
      './time_system_v2.js',
      './resource_system.js',
      './character_module.js',
      './location_system.js',
      './virtue_system.js',
      './skill_system.js',
      './action_processor.js',
      './behavior_system.js',
      './decision_engine.js',
      './memory_system.js',
      
      // 新架构文件
      './family_system.js',
      './name_generator.js',
      './event_bus.js',
      './game_state_manager.js',
      './emotional_relationship_system.js',
      './relationship_systems_integration.js',
      './complex_relationship_api.js',
      './social_identity_system.js',
      './personality_system.js',
      './game_state_manager.js',
      './unified_data_manager.js',
      
      // 事件适配器
      './character_module_event_adapter.js',
      './resource_system_event_adapter.js',
      './location_system_event_adapter.js',
      './virtue_system_event_adapter.js',
      './skill_system_event_adapter.js',
      './behavior_system_event_adapter.js',
      './decision_engine_event_adapter.js',
      
      // 界面文件
      './ui_components.js',
      './game_interface.js',
      './index.html',
      
      // 重构后的引擎
      './game_engine.js',
      
      // 测试和部署文件
      './integration_test.js'
    ];

    const missingFiles = [];
    const corruptFiles = [];

    for (const file of requiredFiles) {
      try {
        if (typeof fetch !== 'undefined') {
          // 浏览器环境
          const response = await fetch(file, { method: 'HEAD' });
          if (!response.ok) {
            missingFiles.push(file);
          }
        } else {
          // Node.js环境 - 尝试动态导入
          try {
            await import(file);
          } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
              missingFiles.push(file);
            } else {
              corruptFiles.push({ file, error: error.message });
            }
          }
        }
      } catch (error) {
        corruptFiles.push({ file, error: error.message });
      }
    }

    if (missingFiles.length > 0) {
      throw new Error(`缺少文件: ${missingFiles.join(', ')}`);
    }

    if (corruptFiles.length > 0) {
      throw new Error(`文件损坏: ${corruptFiles.map(c => `${c.file}(${c.error})`).join(', ')}`);
    }

    console.log(`  📁 检查了 ${requiredFiles.length} 个文件，全部完整`);
  }

  /**
   * 检查模块依赖
   */
  async checkModuleDependencies() {
    const moduleTests = [
      {
        name: 'gameConfig导入',
        test: async () => {
          const config = await import('./gameConfig.js');
          if (!config.DEFAULT_CONFIG) {
            throw new Error('DEFAULT_CONFIG未导出');
          }
        }
      },
      {
        name: 'utils_module导入',
        test: async () => {
          const utils = await import('./utils_module.js');
          if (!utils.Utils) {
            throw new Error('Utils类未导出');
          }
        }
      },
      {
        name: 'event_bus导入',
        test: async () => {
          const eventBus = await import('./event_bus.js');
          if (!eventBus.default) {
            throw new Error('EventBus类未导出');
          }
        }
      },
      {
        name: 'game_state_manager导入',
        test: async () => {
          const stateManager = await import('./game_state_manager.js');
          if (!stateManager.default) {
            throw new Error('GameStateManager类未导出');
          }
        }
      },
      {
        name: 'ui_components导入',
        test: async () => {
          const uiComponents = await import('./ui_components.js');
          if (!uiComponents.default) {
            throw new Error('UIComponentFactory未导出');
          }
        }
      },
      {
        name: 'game_interface导入',
        test: async () => {
          const gameInterface = await import('./game_interface.js');
          if (!gameInterface.default) {
            throw new Error('GameInterface类未导出');
          }
        }
      },
      {
        name: 'game_engine导入',
        test: async () => {
          const gameEngine = await import('./game_engine.js');
          if (!gameEngine.GameEngine && !gameEngine.default) {
            throw new Error('GameEngine类未导出');
          }
        }
      }
    ];

    for (const moduleTest of moduleTests) {
      try {
        await moduleTest.test();
        console.log(`    ✅ ${moduleTest.name}`);
      } catch (error) {
        throw new Error(`${moduleTest.name}失败: ${error.message}`);
      }
    }

    console.log(`  📦 检查了 ${moduleTests.length} 个模块依赖，全部正常`);
  }

  /**
   * 验证配置
   */
  async validateConfiguration() {
    try {
      const { DEFAULT_CONFIG } = await import('./gameConfig.js');
      
      // 检查必要的配置项
      const requiredConfigs = [
        'LOCATIONS',
        'RESOURCE_TYPES', 
        'CHARACTER_ACTIONS',
        'DAILY_SCHEDULE'
      ];

      for (const config of requiredConfigs) {
        if (!DEFAULT_CONFIG[config]) {
          throw new Error(`缺少配置项: ${config}`);
        }
      }

      // 检查地点配置
      const locations = DEFAULT_CONFIG.LOCATIONS;
      if (Object.keys(locations).length < 5) {
        throw new Error('地点配置不足，至少需要5个地点');
      }

      // 检查资源配置
      const resources = DEFAULT_CONFIG.RESOURCE_TYPES;
      if (Object.keys(resources).length < 4) {
        throw new Error('资源类型配置不足，至少需要4种资源');
      }

      // 检查行为配置
      const actions = DEFAULT_CONFIG.CHARACTER_ACTIONS;
      if (Object.keys(actions).length < 6) {
        throw new Error('行为配置不足，至少需要6类行为');
      }

      console.log(`  ⚙️  配置验证通过，包含 ${Object.keys(locations).length} 个地点，${Object.keys(resources).length} 种资源，${Object.keys(actions).length} 类行为`);
      
    } catch (error) {
      throw new Error(`配置验证失败: ${error.message}`);
    }
  }

  /**
   * 检查接口兼容性
   */
  async checkInterfaceCompatibility() {
    try {
      // 创建测试实例
      const { default: EventBus } = await import('./event_bus.js');
      const { default: GameStateManager } = await import('./game_state_manager.js');
      const { default: FamilySystem } = await import('./family_system.js');

      // 测试事件总线接口
      const eventBus = new EventBus();
      if (typeof eventBus.on !== 'function' || typeof eventBus.emit !== 'function') {
        throw new Error('EventBus接口不完整');
      }

      // 测试状态管理器接口
      const stateManager = new GameStateManager();
      if (typeof stateManager.updateState !== 'function' || typeof stateManager.getState !== 'function') {
        throw new Error('GameStateManager接口不完整');
      }

      // 测试家族系统接口
      const familySystem = new FamilySystem();
      if (typeof familySystem.createFamily !== 'function') {
        throw new Error('FamilySystem接口不完整');
      }

      // 测试适配器接口
      const { addEventSupportToCharacters } = await import('./character_module_event_adapter.js');
      const { addEventSupportToResourceSystem } = await import('./resource_system_event_adapter.js');
      
      if (typeof addEventSupportToCharacters !== 'function') {
        throw new Error('角色事件适配器接口错误');
      }
      
      if (typeof addEventSupportToResourceSystem !== 'function') {
        throw new Error('资源事件适配器接口错误');
      }

      console.log('  🔌 所有关键接口兼容性检查通过');

    } catch (error) {
      throw new Error(`接口兼容性检查失败: ${error.message}`);
    }
  }

  /**
   * 性能基准检查
   */
  async checkPerformanceBenchmarks() {
    const benchmarks = [];

    // 事件处理性能测试
    try {
      const { default: EventBus } = await import('./event_bus.js');
      const eventBus = new EventBus();
      
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        eventBus.emit('test', { data: i });
      }
      const eventTime = performance.now() - startTime;
      
      benchmarks.push({ test: '事件处理', time: eventTime, limit: 100 });
      
      if (eventTime > 100) {
        throw new Error(`事件处理性能不佳: ${eventTime.toFixed(2)}ms`);
      }
    } catch (error) {
      throw new Error(`事件性能测试失败: ${error.message}`);
    }

    // 状态管理性能测试
    try {
      const { default: GameStateManager } = await import('./game_state_manager.js');
      const stateManager = new GameStateManager();
      
      const startTime = performance.now();
      for (let i = 0; i < 500; i++) {
        stateManager.updateState(`test${i % 10}`, { value: i });
      }
      const stateTime = performance.now() - startTime;
      
      benchmarks.push({ test: '状态管理', time: stateTime, limit: 50 });
      
      if (stateTime > 50) {
        throw new Error(`状态管理性能不佳: ${stateTime.toFixed(2)}ms`);
      }
    } catch (error) {
      throw new Error(`状态管理性能测试失败: ${error.message}`);
    }

    // 姓名生成性能测试
    try {
      const { default: NameGenerator } = await import('./name_generator.js');
      const nameGenerator = new NameGenerator();
      
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        nameGenerator.generateName(i % 2 === 0 ? '男' : '女', '李');
      }
      const nameTime = performance.now() - startTime;
      
      benchmarks.push({ test: '姓名生成', time: nameTime, limit: 20 });
      
      if (nameTime > 20) {
        throw new Error(`姓名生成性能不佳: ${nameTime.toFixed(2)}ms`);
      }
    } catch (error) {
      throw new Error(`姓名生成性能测试失败: ${error.message}`);
    }

    console.log('  ⚡ 性能基准检查:');
    benchmarks.forEach(b => {
      console.log(`    • ${b.test}: ${b.time.toFixed(2)}ms (限制: ${b.limit}ms)`);
    });
  }

  /**
   * 检查浏览器兼容性
   */
  async checkBrowserCompatibility() {
    if (typeof window === 'undefined') {
      console.log('  🌐 跳过浏览器兼容性检查（非浏览器环境）');
      return;
    }

    const features = [
      { name: 'ES6 Classes', test: () => typeof class{} === 'function' },
      { name: 'Arrow Functions', test: () => typeof (() => {}) === 'function' },
      { name: 'Promises', test: () => typeof Promise !== 'undefined' },
      { name: 'async/await', test: () => { try { eval('async function test() {}'); return true; } catch(e) { return false; } } },
      { name: 'Modules', test: () => { try { new Function('import("")'); return true; } catch(e) { return false; } } },
      { name: 'Map/Set', test: () => typeof Map !== 'undefined' && typeof Set !== 'undefined' },
      { name: 'localStorage', test: () => typeof localStorage !== 'undefined' },
      { name: 'JSON', test: () => typeof JSON !== 'undefined' },
      { name: 'requestAnimationFrame', test: () => typeof requestAnimationFrame !== 'undefined' },
      { name: 'performance.now', test: () => typeof performance !== 'undefined' && typeof performance.now === 'function' }
    ];

    const unsupportedFeatures = [];
    features.forEach(feature => {
      try {
        if (!feature.test()) {
          unsupportedFeatures.push(feature.name);
        }
      } catch (error) {
        unsupportedFeatures.push(feature.name);
      }
    });

    if (unsupportedFeatures.length > 0) {
      throw new Error(`浏览器不支持以下特性: ${unsupportedFeatures.join(', ')}`);
    }

    console.log(`  🌐 浏览器兼容性检查通过，支持所有 ${features.length} 项必需特性`);
  }

  /**
   * 检查内存使用
   */
  async checkMemoryUsage() {
    if (typeof performance === 'undefined' || !performance.memory) {
      console.log('  💾 跳过内存使用检查（性能API不可用）');
      return;
    }

    const initialMemory = performance.memory.usedJSHeapSize;

    // 创建一些对象来测试内存使用
    const testObjects = [];
    for (let i = 0; i < 1000; i++) {
      testObjects.push({
        id: i,
        name: `测试对象${i}`,
        data: new Array(100).fill(i),
        timestamp: Date.now()
      });
    }

    const peakMemory = performance.memory.usedJSHeapSize;
    const memoryIncrease = peakMemory - initialMemory;

    // 清理测试对象
    testObjects.length = 0;

    // 强制垃圾回收（如果支持）
    if (window.gc) {
      window.gc();
    }

    const finalMemory = performance.memory.usedJSHeapSize;
    const memoryLeak = finalMemory - initialMemory;

    if (memoryIncrease > 50 * 1024 * 1024) { // 50MB
      throw new Error(`内存使用过高: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }

    if (memoryLeak > 10 * 1024 * 1024) { // 10MB
      console.log('  ⚠️  检测到可能的内存泄漏');
    }

    console.log(`  💾 内存使用检查: 峰值增加 ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * 验证启动流程
   */
  async validateStartupFlow() {
    try {
      // 模拟游戏启动流程
      console.log('    🔄 模拟游戏启动...');

      // 1. 导入核心模块
      const { GameEngine } = await import('./game_engine.js');
      const GameEngineClass = GameEngine || (await import('./game_engine.js')).default;

      // 2. 创建游戏引擎实例
      const gameEngine = new GameEngineClass();

      // 3. 验证初始化
      if (!gameEngine.eventBus || !gameEngine.stateManager) {
        throw new Error('游戏引擎核心组件未正确初始化');
      }

      // 4. 初始化游戏
      await gameEngine.initialize();

      // 5. 验证初始状态
      if (gameEngine.characters.size === 0) {
        throw new Error('初始角色未创建');
      }

      // 6. 测试游戏控制
      gameEngine.start();
      if (!gameEngine.gameState.isRunning) {
        throw new Error('游戏启动失败');
      }

      gameEngine.pause();
      if (!gameEngine.gameState.isPaused) {
        throw new Error('游戏暂停失败');
      }

      gameEngine.stop();
      if (gameEngine.gameState.isRunning) {
        throw new Error('游戏停止失败');
      }

      // 7. 清理
      gameEngine.destroy();

      console.log('    ✅ 启动流程验证完成');

    } catch (error) {
      throw new Error(`启动流程验证失败: ${error.message}`);
    }
  }

  /**
   * 添加检查结果
   */
  addResult(checkName, success, error = null) {
    this.checkResults.push({
      check: checkName,
      success,
      error,
      timestamp: Date.now()
    });
  }

  /**
   * 打印部署报告
   */
  printDeploymentReport() {
    const totalChecks = this.checkResults.length;
    const passedChecks = this.checkResults.filter(r => r.success).length;
    const failedChecks = totalChecks - passedChecks;
    const checkDuration = Date.now() - this.startTime;

    console.log('\n' + '='.repeat(60));
    console.log('🚀 南北朝坞堡模拟器部署检查完成');
    console.log('='.repeat(60));
    console.log(`📊 总计: ${totalChecks} 项检查`);
    console.log(`✅ 通过: ${passedChecks} 项`);
    console.log(`❌ 失败: ${failedChecks} 项`);
    console.log(`⏱️  耗时: ${(checkDuration / 1000).toFixed(2)} 秒`);
    console.log(`📈 成功率: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

    if (failedChecks > 0) {
      console.log('\n❌ 失败的检查:');
      this.checkResults
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  • ${r.check}: ${r.error}`);
        });
    }

    console.log('\n🎯 部署状态评估:');
    if (passedChecks === totalChecks) {
      console.log('🎉 所有检查通过！系统已准备就绪，可以正式部署！');
      console.log('✨ 南北朝坞堡模拟器部署成功！');
    } else if (passedChecks / totalChecks >= 0.9) {
      console.log('⚠️  大部分检查通过，建议修复少量问题后部署');
    } else if (passedChecks / totalChecks >= 0.7) {
      console.log('⚠️  部分检查失败，建议修复后再部署');
    } else {
      console.log('❌ 大量检查失败，不建议现在部署');
    }

    this.printDeploymentRecommendations(passedChecks / totalChecks);
  }

  /**
   * 打印部署建议
   */
  printDeploymentRecommendations(successRate) {
    console.log('\n📋 部署建议:');
    
    if (successRate >= 1.0) {
      console.log('1. 🚀 立即部署到生产环境');
      console.log('2. 📝 更新部署文档');
      console.log('3. 🎮 开始用户验收测试');
      console.log('4. 📊 设置监控和日志');
    } else if (successRate >= 0.9) {
      console.log('1. 🔧 修复剩余的检查项目');
      console.log('2. 🧪 重新运行部署检查');
      console.log('3. ⚠️  在测试环境中验证修复');
      console.log('4. 🚀 确认无误后部署');
    } else if (successRate >= 0.7) {
      console.log('1. 🔍 仔细检查失败项目');
      console.log('2. 🛠️  修复核心问题');
      console.log('3. 🧪 运行完整的集成测试');
      console.log('4. 🔄 重新进行部署检查');
    } else {
      console.log('1. ❌ 暂停部署计划');
      console.log('2. 🔧 全面检查系统架构');
      console.log('3. 🧪 运行详细的调试测试');
      console.log('4. 📞 考虑寻求技术支持');
    }

    console.log('\n🔗 相关链接:');
    console.log('• 📖 项目文档: ./fortress_game_refactor_plan.md');
    console.log('• 🧪 集成测试: ./integration_test.js');
    console.log('• 🎮 游戏引擎: ./game_engine.js');
    console.log('• 🖥️  界面控制: ./game_interface.js');

    console.log('='.repeat(60));
  }

  /**
   * 获取部署摘要
   */
  getDeploymentSummary() {
    const summary = {
      totalChecks: this.checkResults.length,
      passedChecks: this.checkResults.filter(r => r.success).length,
      failedChecks: this.checkResults.filter(r => !r.success).length,
      duration: Date.now() - this.startTime,
      successRate: 0,
      deploymentReady: false,
      failedItems: []
    };

    summary.successRate = summary.totalChecks > 0 ? 
      (summary.passedChecks / summary.totalChecks) * 100 : 0;
    
    summary.deploymentReady = summary.successRate >= 90;
    
    summary.failedItems = this.checkResults
      .filter(r => !r.success)
      .map(r => ({ check: r.check, error: r.error }));

    return summary;
  }
}

/**
 * 快速部署检查函数
 */
export async function quickDeploymentCheck() {
  const deploymentManager = new DeploymentManager();
  return await deploymentManager.performDeploymentCheck();
}

/**
 * 健康检查函数
 */
export async function healthCheck() {
  console.log('🏥 执行系统健康检查...');
  
  try {
    // 检查关键模块
    const { GameEngine } = await import('./game_engine.js');
    const GameEngineClass = GameEngine || (await import('./game_engine.js')).default;
    
    const gameEngine = new GameEngineClass();
    await gameEngine.initialize();
    
    // 快速功能测试
    gameEngine.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    gameEngine.stop();
    
    gameEngine.destroy();
    
    console.log('✅ 系统健康检查通过');
    return { healthy: true, message: '系统运行正常' };
    
  } catch (error) {
    console.log(`❌ 系统健康检查失败: ${error.message}`);
    return { healthy: false, message: error.message };
  }
}

export default DeploymentManager;