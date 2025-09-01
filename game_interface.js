/**
 * game_interface.js - 南北朝坞堡模拟器界面控制器
 * 
 * 功能：纯界面控制器，替代混乱的game_interface_fixed.html
 * 设计：只负责界面逻辑，不处理业务逻辑，通过事件总线与业务逻辑通信
 * 
 * 重构目标：
 * - 移除所有业务逻辑，专注界面控制
 * - 使用ui_components.js组件化界面
 * - 通过event_bus.js与业务逻辑通信
 * - 订阅game_state_manager.js的状态变化
 */

import UIComponentFactory, { themeManager } from './ui_components.js';
import { Utils } from './utils_module.js';

export class GameInterface {
  constructor(gameEngine, eventBus, stateManager) {
    // 等待DOM准备
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.initialize(gameEngine, eventBus, stateManager);
        });
      } else {
        this.initialize(gameEngine, eventBus, stateManager);
      }
    }

    initialize(gameEngine, eventBus, stateManager) {
      console.log('=== GameInterface.initialize 开始 ===');
      console.log('this:', this);
      console.log('this.containers:', this.containers);
      this.gameEngine = gameEngine;
      this.eventBus = eventBus;
      this.stateManager = stateManager;
    
    // UI组件容器
    this.components = {
      characterCards: new Map(),
      resourceDisplay: null,
      statisticsPanel: null,
      notificationSystem: null,
      actionPanel: null
    };
    
    // 界面状态
    this.selectedCharacter = null;
    this.currentView = 'overview'; // 'overview', 'characters', 'resources', 'locations'
    this.isInitialized = false;
    
    // 界面容器
    this.containers = {
      gameContainer: document.getElementById('game-container'),
      uiRoot: document.getElementById('ui-root')
    };
    
    console.log('this.containers after init:', this.containers);
    
    this.init();
  }

  /**
   * 初始化界面
   */
  init() {
    console.log('=== GameInterface.init 开始 ===');
    console.log('this.containers:', this.containers);
    
    // 确保容器已初始化
    if (!this.containers) {
      this.containers = {
        gameContainer: document.getElementById('game-container'),
        uiRoot: document.getElementById('ui-root')
      };
    }
  
    console.log('this.containers 确认后:', this.containers);
  
    this.setupContainers();
    this.createComponents();
    this.setupEventListeners();
    this.subscribeToStateChanges();
    this.setupKeyboardShortcuts();
    
    // 应用主题
    themeManager.applyTheme('nanbeichao');
    
    this.isInitialized = true;
    this.refreshAll();
    
    console.log('🎨 界面控制器初始化完成');
  }

  /**
   * 设置界面容器
   */
  setupContainers() {
    console.log('=== setupContainers 开始 ===');
    
    const mainContainer = document.getElementById('game-container');
    
    // 确保main容器有正确的布局结构
    if (mainContainer && !mainContainer.querySelector('.interface-body')) {
      // 重新构建正确的布局结构
      mainContainer.innerHTML = `
        <div id="header" class="interface-header"></div>
        <div class="interface-body">
          <div id="sidebar" class="interface-sidebar"></div>
          <div id="content" class="interface-content"></div>
        </div>
        <div id="footer" class="interface-footer"></div>
      `;
    }
    
    // 创建并填充所有容器
    this.containers = {
      main: mainContainer,
      header: this.createHeaderContainer(mainContainer),
      sidebar: this.createSidebarContainer(mainContainer),
      content: this.createContentContainer(mainContainer),
      footer: this.createFooterContainer(mainContainer)
    };
    
    console.log('setupContainers 完成，this.containers:', this.containers);
  }

  /**
   * 创建主要容器
   */
  createMainContainer() {
    const container = document.createElement('div');
    container.id = 'game-container';
    container.className = 'game-interface';
    
    container.innerHTML = `
      <div id="header" class="interface-header"></div>
      <div class="interface-body">
        <div id="sidebar" class="interface-sidebar"></div>
        <div id="content" class="interface-content"></div>
      </div>
      <div id="footer" class="interface-footer"></div>
    `;
    
    document.body.appendChild(container);
    return container;
  }

  createHeaderContainer(mainContainer) {
    let header = mainContainer.querySelector('#header');
  
    // 如果header不存在，创建它
    if (!header) {
      header = document.createElement('div');
      header.id = 'header';
      header.className = 'interface-header';
      mainContainer.appendChild(header);
    }
    
    header.innerHTML = `
      <div class="header-title">
        <h1>南北朝坞堡模拟器</h1>
        <div class="time-display">
          <span id="current-time">春季 初一 黎明</span>
          <span id="weather-display">晴朗</span>
        </div>
      </div>
      
      <div class="header-controls">
        <div class="speed-controls">
          <button id="pause-btn" class="control-btn">⏸️</button>
          <button id="play-btn" class="control-btn">▶️</button>
          <button id="speed-up-btn" class="control-btn">⏩</button>
        </div>
        
        <div class="view-tabs">
          <button data-view="overview" class="tab-btn active">总览</button>
          <button data-view="characters" class="tab-btn">人物</button>
          <button data-view="resources" class="tab-btn">资源</button>
          <button data-view="locations" class="tab-btn">地点</button>
        </div>
        
        <div class="utility-controls">
          <button id="save-btn" class="control-btn">💾</button>
          <button id="load-btn" class="control-btn">📁</button>
          <button id="settings-btn" class="control-btn">⚙️</button>
        </div>
      </div>
    `;
    
    return header;
  }

  createSidebarContainer(mainContainer) {
    // 从interface-body中获取sidebar
    const interfaceBody = mainContainer.querySelector('.interface-body');
    let sidebar = interfaceBody ? interfaceBody.querySelector('#sidebar') : null;
  
    // 如果sidebar不存在，创建它
    if (!sidebar) {
      sidebar = document.createElement('div');
      sidebar.id = 'sidebar';
      sidebar.className = 'interface-sidebar';
      
      if (interfaceBody) {
        interfaceBody.appendChild(sidebar);
      } else {
        mainContainer.appendChild(sidebar);
      }
    }
  
    sidebar.innerHTML = `
      <div class="sidebar-section" id="quick-stats">
        <h3>快速统计</h3>
        <div id="population-display"></div>
        <div id="resource-summary"></div>
      </div>
      
      <div class="sidebar-section" id="notifications-area">
        <h3>消息通知</h3>
        <div id="notification-list"></div>
      </div>
      
      <div class="sidebar-section" id="actions-area">
        <h3>快速操作</h3>
        <div id="action-buttons"></div>
      </div>
    `;
    
    return sidebar;
  }

  createContentContainer(mainContainer) {
    let content = mainContainer.querySelector('#content');
    
    //如果content不存在，创建它
    if (!content) {
      content = document.createElement('div');
      content.id = 'content';
      content.className = 'interface-content';
      mainContainer.appendChild(content);
    }

    content.innerHTML = `
      <div class="content-header">
        <h2 id="view-title">总览</h2>
        <div class="content-controls">
          <input type="text" id="search-input" placeholder="搜索..." class="search-input">
          <select id="filter-select" class="filter-select">
            <option value="all">全部</option>
          </select>
        </div>
      </div>
      
      <div class="content-body">
        <!-- 总览视图 -->
        <div id="overview-view" class="view-panel active">
          <div class="overview-grid">
            <div class="overview-card" id="population-overview"></div>
            <div class="overview-card" id="resources-overview"></div>
            <div class="overview-card" id="production-overview"></div>
            <div class="overview-card" id="events-overview"></div>
          </div>
        </div>
        
        <!-- 人物视图 -->
        <div id="characters-view" class="view-panel">
          <div class="characters-grid" id="characters-container"></div>
        </div>
        
        <!-- 资源视图 -->
        <div id="resources-view" class="view-panel">
          <div class="resources-grid" id="resources-container"></div>
        </div>
        
        <!-- 地点视图 -->
        <div id="locations-view" class="view-panel">
          <div class="locations-grid" id="locations-container"></div>
        </div>
      </div>
    `;
    
    return content;
  }

  createFooterContainer(mainContainer) {
    let footer = mainContainer.querySelector('#footer');
    
    //如果footer不存在，创建它
    if (!footer) {
      footer = document.createElement('div');
      footer.id = 'footer';
      footer.className = 'interface-footer';
      mainContainer.appendChild(footer);
    }

    footer.innerHTML = `
      <div class="footer-status">
        <span id="game-status">运行中</span>
        <span id="population-count">人口: 0</span>
        <span id="selected-info">未选择</span>
      </div>
      
      <div class="footer-controls">
        <button id="expand-view" class="footer-btn">🔍</button>
        <button id="help-btn" class="footer-btn">❓</button>
      </div>
    `;
    
    return footer;
  }

  /**
   * 创建UI组件
   */
  createComponents() {
    // 确保容器存在后再创建组件
    const notificationContainer = this.containers.sidebar.querySelector('#notification-list');
    if (notificationContainer) {
      this.components.notificationSystem = UIComponentFactory.createNotificationSystem(
        notificationContainer,
        { maxNotifications: 10, autoHide: true }
      );
    }

    // 统计面板 
    const statsContainer = this.containers.sidebar.querySelector('#quick-stats');
    if (statsContainer) {
      this.components.statisticsPanel = UIComponentFactory.createStatisticsPanel(
        statsContainer,
        { layout: 'compact', showTrends: true }
      );
    }
    
    // 资源显示
    const resourceContainer = this.containers.content.querySelector('#resources-overview');
    if (resourceContainer) {
      this.components.resourceDisplay = UIComponentFactory.createResourceDisplay(
        resourceContainer,
        { showDetails: true, warningThreshold: 20 }
      );
    }
  

    // 操作面板
    const actionContainer = this.containers.sidebar.querySelector('#action-buttons');
    if (actionContainer) {
      this.components.actionPanel = UIComponentFactory.createActionPanel(
        actionContainer,
        { layout: 'list', showCategories: false }
      );
    }

    console.log('✅ UI组件创建完成');
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 游戏控制按钮
    document.getElementById('pause-btn')?.addEventListener('click', () => this.pauseGame());
    document.getElementById('play-btn')?.addEventListener('click', () => this.resumeGame());
    document.getElementById('speed-up-btn')?.addEventListener('click', () => this.speedUpGame());

    // 视图切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
    });

    // 工具按钮
    document.getElementById('save-btn')?.addEventListener('click', () => this.saveGame());
    document.getElementById('load-btn')?.addEventListener('click', () => this.loadGame());
    document.getElementById('settings-btn')?.addEventListener('click', () => this.openSettings());

    // 搜索和过滤
    document.getElementById('search-input')?.addEventListener('input', (e) => this.handleSearch(e.target.value));
    document.getElementById('filter-select')?.addEventListener('change', (e) => this.handleFilter(e.target.value));
 
    // 角色详情事件（添加调试）
    document.addEventListener('characterDetailsRequested', (event) => {
      console.log('🔍 详情事件被捕获:', event.detail);
      this.showCharacterDetails(event.detail.character);
    });


    console.log('🎯 事件监听器设置完成');
  }
 
  showCharacterDetails(character) {
    console.log('🔍 showCharacterDetails 被调用:', character.name);
    
    // 如果已有弹窗，先关闭
    if (this.components.detailModal && this.components.detailModal.element) {
      this.components.detailModal.close();
    }
    
    // 创建新弹窗
    this.components.detailModal = UIComponentFactory.createCharacterDetailModal(document.body);
    this.components.detailModal.show(character);
  }


  /**
   * 订阅状态变化
   */
  subscribeToStateChanges() {
    // 订阅人口变化
    this.stateManager.subscribe('population', (newPopulation) => {
      this.updatePopulationDisplay(newPopulation);
      this.refreshOverviewView();
    });

    // 订阅资源变化
    this.stateManager.subscribe('resources', (newResources) => {
      this.updateResourcesDisplay(newResources);
    });

    // 订阅时间变化
    this.stateManager.subscribe('time', (newTime) => {
      this.updateTimeDisplay(newTime);
    });

    // 订阅角色变化
    this.stateManager.subscribe('characters', (characters) => {
      this.updateCharactersDisplay(characters);
    });

    // 监听事件总线事件
    this.eventBus.on('characterStateChanged', (data) => {
      this.handleCharacterStateChange(data);
    });

    this.eventBus.on('resourceChanged', (data) => {
      this.handleResourceChange(data);
    });

    this.eventBus.on('gameEvent', (data) => {
      this.showNotification(data.message, data.type || 'info');
    });

    console.log('📡 状态订阅设置完成');
  }

  /**
   * 设置键盘快捷键
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 's':
            e.preventDefault();
            this.saveGame();
            break;
          case 'o':
            e.preventDefault();
            this.loadGame();
            break;
          case '1':
            e.preventDefault();
            this.switchView('overview');
            break;
          case '2':
            e.preventDefault();
            this.switchView('characters');
            break;
          case '3':
            e.preventDefault();
            this.switchView('resources');
            break;
          case '4':
            e.preventDefault();
            this.switchView('locations');
            break;
        }
      }
      
      // 空格键暂停/继续
      if (e.key === ' ' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.togglePause();
      }
    });

    console.log('⌨️ 键盘快捷键设置完成');
  }

  /**
   * 游戏控制方法
   */
  pauseGame() {
    this.eventBus.emit('gameControl', { action: 'pause' });
    this.updateGameStatus('已暂停');
  }

  resumeGame() {
    this.eventBus.emit('gameControl', { action: 'resume' });
    this.updateGameStatus('运行中');
  }

  speedUpGame() {
    this.eventBus.emit('gameControl', { action: 'speedUp' });
  }

  togglePause() {
    this.eventBus.emit('gameControl', { action: 'toggle' });
  }

  saveGame() {
    this.eventBus.emit('gameControl', { action: 'save' });
    this.showNotification('游戏已保存', 'success');
  }

  loadGame() {
    this.eventBus.emit('gameControl', { action: 'load' });
  }

  openSettings() {
    this.showNotification('设置面板开发中...', 'info');
  }

  /**
   * 视图切换
   */
  switchView(viewName) {
    if (this.currentView === viewName) return;
  
    // 更新标签状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
  
    // 隐藏所有视图面板
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.style.display = 'none';
      panel.classList.remove('active');
    });
  
    // 显示目标视图面板
    const targetPanel = document.getElementById(`${viewName}-view`);
    if (targetPanel) {
      targetPanel.style.display = 'block';
      targetPanel.classList.add('active');
    }
  
    // 特殊处理：确保角色容器正确显示
    if (viewName === 'characters') {
      const charactersContainer = document.getElementById('characters-container');
      if (charactersContainer) {
        charactersContainer.style.display = 'grid';
        // 重新触发角色显示更新
        const characters = this.stateManager.getState('characters');
        if (characters) {
          setTimeout(() => this.updateCharactersDisplay(characters), 100);
        }
      }
    }
  
    this.currentView = viewName;
    this.refreshCurrentView();
  
    console.log(`🔄 切换到视图: ${viewName}`);
  }

  /**
   * 搜索处理
   */
  handleSearch(query) {
    const normalizedQuery = query.toLowerCase().trim();
    
    // 根据当前视图执行搜索
    switch(this.currentView) {
      case 'characters':
        this.searchCharacters(normalizedQuery);
        break;
      case 'resources':
        this.searchResources(normalizedQuery);
        break;
      case 'locations':
        this.searchLocations(normalizedQuery);
        break;
    }
  }

  /**
   * 过滤处理
   */
  handleFilter(filterValue) {
    switch(this.currentView) {
      case 'characters':
        this.filterCharacters(filterValue);
        break;
      case 'resources':
        this.filterResources(filterValue);
        break;
      case 'locations':
        this.filterLocations(filterValue);
        break;
    }
  }

  /**
   * 状态更新方法
   */
  updatePopulationDisplay(population) {
    const populationElement = document.getElementById('population-count');
    if (populationElement) {
      populationElement.textContent = `人口: ${population.total || population || 0}`;
    }

    // 更新统计面板
    if (this.components.statisticsPanel) {
      this.components.statisticsPanel.update({ population });
    }
  }

  updateResourcesDisplay(resources) {
    if (this.components.resourceDisplay) {
      this.components.resourceDisplay.update(resources);
    }

    // 更新侧边栏资源摘要
    const resourceSummary = document.getElementById('resource-summary');
    if (resourceSummary && resources) {
      resourceSummary.innerHTML = this.generateResourceSummary(resources);
    }
  }

  updateTimeDisplay(timeData) {
    const timeElement = document.getElementById('current-time');
    const weatherElement = document.getElementById('weather-display');
    
    if (timeElement && timeData) {
      timeElement.textContent = `${timeData.season} ${timeData.day} ${timeData.period}`;
    }
    
    if (weatherElement && timeData.weather) {
      weatherElement.textContent = timeData.weather;
    }
  }

  updateCharactersDisplay(characters) {
    console.log('🚀 updateCharactersDisplay 被调用');
    console.log('📦 接收到的 characters:', characters);
    console.log('📦 characters 类型:', typeof characters);
    
    if (!characters) {
      console.log('❌ characters 为空，退出');
      return;
    }
  
    const container = document.getElementById('characters-container');
    console.log('📦 container 元素:', container);
    if (!container) {
      console.log('❌ container 未找到，退出');
      return;
    }
  
    //处理不同格式的角色数据
    // let characterArray = [];
    // if (characters instanceof Map) {
    //  characterArray = Array.from(characters.values());
    //  console.log('📦 处理 Map 格式，数量:', characterArray.length);
    // } else if (Array.isArray(characters)) {
    //  characterArray = characters;
    //  console.log('📦 处理 Array 格式，数量:', characterArray.length);
    // } else if (characters && typeof characters === 'object') {
    //  characterArray = Object.values(characters);
    //  console.log('📦 处理 Object 格式，数量:', characterArray.length);
    // } else {
    //  console.warn('❌ 角色数据格式错误:', characters);
    //  return;
    // }

    // 直接从游戏引擎获取最新的角色数据，确保包含德行系统
    let characterArray = [];
    if (this.gameEngine && this.gameEngine.characters) {
      characterArray = Array.from(this.gameEngine.characters.values());
      console.log('📦 直接从游戏引擎获取角色，数量:', characterArray.length);
      
      // 验证德行系统
      characterArray.forEach(char => {
        console.log(`${char.name}: 德行系统 ${!!char.virtueSystem}`);
      });
    } else {
      console.warn('⚠️ 无法从游戏引擎获取角色数据');
      return;
    }



    // console.log('🔍 最终角色数组:', characterArray);
    // 在这里添加：
    // characterArray.forEach(char => {
    //   if (!char.virtueSystem && window.gameEngine?.characters?.get(char.id)?.virtueSystem) {
    //     char.virtueSystem = window.gameEngine.characters.get(char.id).virtueSystem;
    //     console.log(`🔧 恢复 ${char.name} 的德行系统`);
    //   }
    // });

    // console.log('🔍 第一个角色示例:', characterArray[0]);   
    //🔍 第一个角色示例: Character {...}

    
    console.log('✅ 德行系统恢复完成'); 
  
    // 获取当前和新的角色ID集合
    const currentCharacterIds = new Set(this.components.characterCards.keys());
    const newCharacterMap = new Map(characterArray.map(char => [char.id, char]));
    const newCharacterIds = new Set(newCharacterMap.keys());
  
    console.log(`📊 角色对比: 当前${currentCharacterIds.size}个，新${newCharacterIds.size}个`);
  
    // 移除不存在的角色卡片
    currentCharacterIds.forEach(id => {
      if (!newCharacterIds.has(id)) {
        const card = this.components.characterCards.get(id);
        if (card && card.element && card.element.parentNode) {
          card.element.parentNode.remove(); // 移除cardContainer
        }
        this.components.characterCards.delete(id);
        console.log(`➖ 移除角色卡片: ${id}`);
      }
    });
  
    // 添加或更新角色卡片
    characterArray.forEach(character => {
      if (!this.components.characterCards.has(character.id)) {
        // 创建新的角色卡片
        console.log(`➕ 创建新角色卡片: ${character.name}`);
        
        try {
          const cardContainer = document.createElement('div');
          console.log('📦 cardContainer 创建成功');
          
          container.appendChild(cardContainer);
          console.log('📦 cardContainer 已添加到容器');
    
          console.log('📦 开始创建 CharacterCard...');
          const characterCard = UIComponentFactory.createCharacterCard(cardContainer, character, {
            showActions: true,
            compactMode: false
          });
          console.log('📦 CharacterCard 创建成功:', characterCard);
    
          //console.log('📦 开始更新角色数据...');
          // 等待create()方法完成后再调用update()
          setTimeout(() => {
            //console.log('📦 延迟后开始更新角色数据...');
            //console.log('📦 element状态:', characterCard.element);
            
            if (characterCard.element) {
              characterCard.update(character);
              //console.log('📦 角色数据更新完成');
            } else {
              console.warn('⚠️ element仍为null，再次延迟尝试');
              setTimeout(() => {
                if (characterCard.element) {
                  characterCard.update(character);
                  console.log('📦 延迟更新完成');
                } else {
                  console.error('❌ element创建失败');
                }
              }, 50);
            }
          }, 20); // 稍微比UIComponent的延时长一点
          //console.log('📦 角色数据更新完成');
                   
          this.components.characterCards.set(character.id, characterCard);
          // 确保德行系统完全加载后再更新显示
          setTimeout(() => {
            if (character.virtueSystem) {
              characterCard.updateDisplay();
              // 强制更新德行显示
              characterCard.updateVirtueDisplay();
            }
          }, 200);
          console.log('📦 角色卡片已保存到组件映射');
    
          // 添加点击事件
          cardContainer.addEventListener('click', () => {
            this.selectCharacter(character);
          });
          console.log('📦 点击事件已添加');
          
        } catch (error) {
          console.error(`❌ 创建角色卡片失败 ${character.name}:`, error);
          console.error('错误堆栈:', error.stack);
        }
      }  else {
        // 更新现有角色卡片的数据
        const existingCard = this.components.characterCards.get(character.id);
        if (existingCard) {
          existingCard.character = character; // 更新角色引用
          existingCard.update(character);
          existingCard.updateVirtueDisplay(); // 强制更新德行显示
          console.log(`🔄 更新角色卡片: ${character.name}`);
        }
      }
    });

    // 在这里添加最终检查代码：
    console.log('🔍 最终容器检查:');
    console.log('  characters-container位置:', container.getBoundingClientRect());
    console.log('  characters-container可见:', getComputedStyle(container).display !== 'none');
    console.log('  characters-view位置:', document.getElementById('characters-view')?.getBoundingClientRect());
    console.log('  content区域位置:', document.getElementById('content')?.getBoundingClientRect());

    // 检查前几个子元素
    for (let i = 0; i < Math.min(3, container.children.length); i++) {
      const child = container.children[i];
      console.log(`  子元素${i+1}:`, {
        tagName: child.tagName,
        className: child.className,
        childCount: child.children.length,
        display: getComputedStyle(child).display,
        position: child.getBoundingClientRect()
      });
    }
  
    console.log(`✅ 角色显示更新完成，共${this.components.characterCards.size}个卡片`);
  }

  updateGameStatus(status) {
    const statusElement = document.getElementById('game-status');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }

  /**
   * 事件处理方法
   */
  handleCharacterStateChange(data) {
    const characterCard = this.components.characterCards.get(data.characterId);
    if (characterCard) {
      // 获取最新角色数据并更新卡片
      const character = this.stateManager.getState('characters')[data.characterId];
      if (character) {
        characterCard.update(character);
      }
    }

    // 显示状态变化通知
    this.showNotification(
      `${data.characterId}: ${data.stateName} 变为 ${data.newValue}`,
      'info'
    );
  }

  handleResourceChange(data) {
    // 显示资源变化通知
    const changeText = data.change > 0 ? `+${data.change}` : `${data.change}`;
    this.showNotification(
      `${data.type}: ${changeText} (来源: ${data.source})`,
      data.change > 0 ? 'success' : 'warning'
    );
  }

  /**
   * 角色选择
   */
  selectCharacter(character) {
    this.selectedCharacter = character;
    
    // 更新选中状态
    this.components.characterCards.forEach((card, id) => {
      card.element.classList.toggle('selected', id === character.id);
    });

    // 更新操作面板
    if (this.components.actionPanel) {
      this.components.actionPanel.setSelectedCharacter(character);
    }

    // 更新底部信息
    const selectedInfo = document.getElementById('selected-info');
    if (selectedInfo) {
      selectedInfo.textContent = `已选择: ${character.name}`;
    }

    console.log(`👤 选择角色: ${character.name}`);
  }

  /**
   * 通知显示
   */
  showNotification(message, type = 'info', options = {}) {
    if (this.components.notificationSystem) {
      this.components.notificationSystem.showNotification(message, type, options);
    }
  }

  /**
   * 工具方法
   */
  generateResourceSummary(resources) {
    const critical = [];
    const warning = [];
    
    Object.entries(resources).forEach(([type, data]) => {
      if (data.amount < 20) critical.push(type);
      else if (data.amount < 50) warning.push(type);
    });

    let html = '';
    if (critical.length > 0) {
      html += `<div class="resource-alert critical">⚠️ 紧急: ${critical.join(', ')}</div>`;
    }
    if (warning.length > 0) {
      html += `<div class="resource-alert warning">⚡ 不足: ${warning.join(', ')}</div>`;
    }
    if (html === '') {
      html = '<div class="resource-alert good">✅ 资源充足</div>';
    }

    return html;
  }

  searchCharacters(query) {
    this.components.characterCards.forEach((card, id) => {
      const character = this.stateManager.getState('characters')[id];
      const matches = character && (
        character.name.toLowerCase().includes(query) ||
        character.occupation?.toLowerCase().includes(query) ||
        character.location?.toLowerCase().includes(query)
      );
      card.setVisible(!query || matches);
    });
  }

  searchResources(query) {
    // 资源搜索逻辑
    console.log(`🔍 搜索资源: ${query}`);
  }

  searchLocations(query) {
    // 地点搜索逻辑  
    console.log(`🔍 搜索地点: ${query}`);
  }

  filterCharacters(filterValue) {
    // 角色过滤逻辑
    console.log(`🔽 过滤角色: ${filterValue}`);
  }

  filterResources(filterValue) {
    // 资源过滤逻辑
    console.log(`🔽 过滤资源: ${filterValue}`);
  }

  filterLocations(filterValue) {
    // 地点过滤逻辑
    console.log(`🔽 过滤地点: ${filterValue}`);
  }

  /**
   * 刷新方法
   */
  refreshAll() {
    if (!this.isInitialized) return;

    const state = this.stateManager.getState();
    
    if (state.population !== undefined) this.updatePopulationDisplay(state.population);
    if (state.resources) this.updateResourcesDisplay(state.resources);
    if (state.time) this.updateTimeDisplay(state.time);
    if (state.characters) this.updateCharactersDisplay(state.characters);

    this.refreshCurrentView();
    
    console.log('🔄 界面全部刷新完成');
  }

  refreshCurrentView() {
    switch(this.currentView) {
      case 'overview':
        this.refreshOverviewView();
        break;
      case 'characters':
        this.refreshCharactersView();
        break;
      case 'resources':
        this.refreshResourcesView();
        break;
      case 'locations':
        this.refreshLocationsView();
        break;
    }
  }

  refreshOverviewView() {
    // 刷新总览视图
    const state = this.stateManager.getState();
    
    // 更新总览卡片
    this.updateOverviewCards(state);
  }

  refreshCharactersView() {
    const characters = Array.from(this.gameEngine.characters.values());
    this.updateCharactersDisplay(characters);
  }

  refreshResourcesView() {
    // 资源视图已在 updateResourcesDisplay 中处理
  }

  refreshLocationsView() {
    // 刷新地点视图
    console.log('🏠 刷新地点视图');
  }

  updateOverviewCards(state) {
    const overviewCards = {
      'population-overview': this.generatePopulationOverview(state),
      'resources-overview': this.generateResourcesOverview(state),
      'production-overview': this.generateProductionOverview(state),
      'events-overview': this.generateEventsOverview(state)
    };

    Object.entries(overviewCards).forEach(([id, content]) => {
      const card = document.getElementById(id);
      if (card) {
        card.innerHTML = content;
      }
    });
  }

  generatePopulationOverview(state) {
    console.log('🔍 总览页面 state:', state);
    console.log('🔍 总览页面 population:', state.population);
    const population = state.population || 0;
    const characters = state.characters || {};
    const characterCount = Object.keys(characters).length;

    return `
      <h4>人口统计</h4>
      <div class="overview-stats">
        <div class="stat-item">
          <span class="stat-label">总人口</span>
          <span class="stat-value">${population.total || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">活跃角色</span>
          <span class="stat-value">${characterCount}</span>
        </div>
      </div>
    `;
  }

  generateResourcesOverview(state) {
    const resources = state.resources || {};
    const resourceCount = Object.keys(resources).length;
    
    return `
      <h4>资源概况</h4>
      <div class="overview-stats">
        <div class="stat-item">
          <span class="stat-label">资源种类</span>
          <span class="stat-value">${resourceCount}</span>
        </div>
      </div>
      ${this.generateResourceSummary(resources)}
    `;
  }

  generateProductionOverview(state) {
    return `
      <h4>生产状况</h4>
      <div class="overview-stats">
        <div class="stat-item">
          <span class="stat-label">生产效率</span>
          <span class="stat-value">正常</span>
        </div>
      </div>
    `;
  }

  generateEventsOverview(state) {
    return `
      <h4>近期事件</h4>
      <div class="overview-stats">
        <div class="stat-item">
          <span class="stat-label">事件数量</span>
          <span class="stat-value">0</span>
        </div>
      </div>
    `;
  }

  /**
   * 销毁界面
   */
  destroy() {
    // 移除事件监听器
    document.removeEventListener('keydown', this.handleKeydown);
    
    // 销毁组件
    Object.values(this.components).forEach(component => {
      if (component && typeof component.destroy === 'function') {
        component.destroy();
      }
    });
    
    // 清空容器
    Object.values(this.containers).forEach(container => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });
    
    console.log('🗑️ 界面控制器已销毁');
  }
}

// 添加CSS样式
const interfaceStyles = `
  .game-interface {
    display: flex;
    flex-direction: column;
    height: 100vh;
    font-family: 'Microsoft YaHei', sans-serif;
    background: var(--theme-background-color, #F5F5DC);
    color: var(--theme-text-color, #2F1B14);
    overflow: hidden; /* 防止整体页面滚动 */
  }

  .interface-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    background: var(--theme-primary-color, #8B4513);
    color: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .header-title h1 {
    margin: 0;
    font-size: 24px;
  }

  .time-display {
    display: flex;
    gap: 10px;
    font-size: 14px;
  }

  .interface-body {
    display: flex;
    flex: 1;
    overflow: hidden !important; /* 防止body区域整体滚动 */
    min-height: 0; /* 重要>确保flex子元素可以收缩 */
  }

  .interface-sidebar {
    width: 300px;
    background: white;
    border-right: 1px solid #ddd;
    overflow-y: scroll !important; /* 强制显示滚动条 */
    overflow-x: hidden !important;
    padding: 15px;
    flex: none;
    max-height: calc(100vh - 140px);
  }

  .interface-content {
    flex: 1;
    overflow-y: scroll !important; /* 强制显示滚动条 */
    overflow-x: hidden !important;
    padding: 15px;
    min-height: 0; /* 重要：确保可以收缩 */
    max-height: calc(100vh - 140px); /* 减去header和footer高度 */
  }

  .interface-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 20px;
    background: #f8f9fa;
    border-top: 1px solid #ddd;
    font-size: 12px;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .speed-controls {
    display: flex;
    gap: 5px;
  }

  .control-btn {
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    background: rgba(255,255,255,0.2);
    color: white;
    cursor: pointer;
    transition: background 0.2s;
  }

  .control-btn:hover {
    background: rgba(255,255,255,0.3);
  }

  .view-tabs {
    display: flex;
    gap: 2px;
  }

  .tab-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px 4px 0 0;
    background: rgba(255,255,255,0.1);
    color: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-btn.active {
    background: white;
    color: var(--theme-primary-color, #8B4513);
  }

  .tab-btn:hover:not(.active) {
    background: rgba(255,255,255,0.2);
  }

  .utility-controls {
    display: flex;
    gap: 5px;
  }

  .sidebar-section {
    margin-bottom: 20px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 15px;
    background: white;
  }

  .sidebar-section h3 {
    margin: 0 0 10px 0;
    font-size: 16px;
    color: var(--theme-primary-color, #8B4513);
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 5px;
  }

  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid var(--theme-secondary-color, #D2691E);
  }

  .content-header h2 {
    margin: 0;
    color: var(--theme-primary-color, #8B4513);
  }

  .content-controls {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .search-input, .filter-select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .search-input {
    width: 200px;
  }

  .view-panel {
    display: none;
    min-height: 100%; /* 确保内容可以撑开 */
  }

  .view-panel.active {
    display: block;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
  }

  .overview-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .overview-card h4 {
    margin: 0 0 15px 0;
    color: var(--theme-primary-color, #8B4513);
    font-size: 18px;
  }

  .overview-stats {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
  }

  .stat-item:last-child {
    border-bottom: none;
  }

  .stat-label {
    font-size: 14px;
    color: #666;
  }

  .stat-value {
    font-size: 16px;
    font-weight: bold;
    color: var(--theme-primary-color, #8B4513);
  }

  .characters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 15px;
    padding-bottom: 20px; /* 增加底部空间 */
    min-height: 100%; 
  }

  body {
    overflow: hidden !important;
  }

  .resources-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
  }

  .locations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 15px;
  }

  .resource-alert {
    padding: 8px 12px;
    border-radius: 4px;
    margin: 5px 0;
    font-size: 12px;
  }

  .resource-alert.critical {
    background: #ffebee;
    color: #c62828;
    border-left: 4px solid #f44336;
  }

  .resource-alert.warning {
    background: #fff3e0;
    color: #ef6c00;
    border-left: 4px solid #ff9800;
  }

  .resource-alert.good {
    background: #e8f5e8;
    color: #2e7d32;
    border-left: 4px solid #4caf50;
  }

  .footer-status {
    display: flex;
    gap: 20px;
    align-items: center;
  }

  .footer-controls {
    display: flex;
    gap: 5px;
  }

  .footer-btn {
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 3px;
    background: white;
    cursor: pointer;
    transition: background 0.2s;
  }

  .footer-btn:hover {
    background: #f0f0f0;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .interface-sidebar {
      width: 250px;
    }
    
    .header-controls {
      flex-direction: column;
      gap: 10px;
    }
    
    .view-tabs {
      order: -1;
    }
    
    .overview-grid {
      grid-template-columns: 1fr;
    }
    
    .characters-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    .interface-body {
      flex-direction: column;
    }
    
    .interface-sidebar {
      width: 100%;
      max-height: 200px;
    }
    
    .content-controls {
      flex-direction: column;
      align-items: stretch;
    }
    
    .search-input {
      width: 100%;
    }
  }

  /* 选中状态 */
  .selected {
    border: 2px solid var(--theme-accent-color, #DAA520) !important;
    box-shadow: 0 0 10px rgba(218, 165, 32, 0.3) !important;
  }

  /* 加载动画 */
  .loading {
    opacity: 0.6;
    pointer-events: none;
  }

  .loading::after {
    content: '加载中...';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255,255,255,0.9);
    padding: 10px 20px;
    border-radius: 4px;
    font-size: 14px;
  }

  /* 动画效果 */
  .fade-in {
    animation: fadeIn 0.3s ease-in;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .slide-in {
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }

  /* 强制重置角色容器定位 */
  #characters-container {
    position: static !important;
    top: auto !important;
    left: auto !important;
    transform: none !important;
    margin-top: 0 !important;
  }

`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.id = 'game-interface-styles';
  styleElement.textContent = interfaceStyles;
  document.head.appendChild(styleElement);
}

export default GameInterface;