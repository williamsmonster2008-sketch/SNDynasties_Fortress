/**
 * ui_components.js - 南北朝坞堡模拟器UI组件库
 * 
 * 功能：提供可复用的UI组件，响应状态变化，南北朝视觉风格
 * 特色：组件化设计、自动数据绑定、历史主题样式
 * 
 * 设计理念：
 * - 组件化：每个UI元素都是独立的组件
 * - 响应式：自动响应状态管理器的数据变化
 * - 主题化：统一的南北朝视觉风格
 * - 可复用：组件可以在不同场景下复用
 */

import { Utils } from './utils_module.js';
import { DEFAULT_CONFIG } from './gameConfig.js';

/**
 * 基础UI组件类
 */
export class UIComponent {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      theme: 'nanbeichao',
      autoUpdate: true,
      animations: true,
      ...options
    };
    
    this.element = null;
    this.isVisible = true;
    this.isEnabled = true;
    this.eventListeners = new Map();
    this.dataBindings = new Map();
    this.animationQueue = [];
    
    // 只有非弹窗组件才自动创建
    if (this.constructor.name !== 'CharacterDetailModal') {
      setTimeout(() => {
        this.create();
        this.bindEvents();
      }, 0);
    }
  }

  /**
   * 创建组件DOM结构
   */
  create() {
    // 子类实现
    throw new Error('create() method must be implemented by subclass');
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 子类可以重写
  }

  /**
   * 更新组件数据
   */
  update(data) {
    if (!this.options.autoUpdate) return;
    
    // 应用数据绑定
    this.dataBindings.forEach((binding, key) => {
      if (data.hasOwnProperty(key)) {
        binding(data[key]);
      }
    });
  }

  /**
   * 添加数据绑定
   */
  addDataBinding(dataKey, updateFunction) {
    this.dataBindings.set(dataKey, updateFunction);
  }

  /**
   * 显示/隐藏组件
   */
  setVisible(visible) {
    this.isVisible = visible;
    if (this.element) {
      this.element.style.display = visible ? '' : 'none';
    }
  }

  /**
   * 启用/禁用组件
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (this.element) {
      this.element.classList.toggle('disabled', !enabled);
    }
  }

  /**
   * 销毁组件
   */
  destroy() {
    this.eventListeners.clear();
    this.dataBindings.clear();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  /**
   * 快速显示不同类型的通知
   */
  info(message, options = {}) {
    return this.showNotification(message, 'info', options);
  }

  success(message, options = {}) {
    return this.showNotification(message, 'success', options);
  }

  warning(message, options = {}) {
    return this.showNotification(message, 'warning', options);
  }

  error(message, options = {}) {
    return this.showNotification(message, 'error', { ...options, persistent: true });
  }

  event(message, options = {}) {
    return this.showNotification(message, 'event', options);
  }

  /**
   * 清除所有通知
   */
  clearAll() {
    this.notifications.forEach(notification => {
      this.removeNotificationElement(notification.element);
    });
    this.notifications = [];
  }
}

/**
 * 操作面板组件
 */
export class ActionPanel extends UIComponent {
  constructor(container, options = {}) {
    super(container, {
      layout: 'grid', // 'grid' 或 'list'
      showCategories: true,
      enableSearch: true,
      ...options
    });
    
    this.actions = [];
    this.filteredActions = [];
    this.selectedCharacter = null;
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = 'action-panel nanbeichao-panel';
    
    this.element.innerHTML = `
      <div class="panel-header">
        <h3>行为指令</h3>
        ${this.options.enableSearch ? `
          <div class="search-container">
            <input type="text" class="action-search" placeholder="搜索行为...">
            <button class="search-clear">✕</button>
          </div>
        ` : ''}
      </div>
      
      <div class="character-info">
        <div class="selected-character">
          <span class="character-name">请选择角色</span>
          <span class="character-status"></span>
        </div>
      </div>
      
      ${this.options.showCategories ? `
        <div class="category-tabs">
          <button class="category-tab active" data-category="all">全部</button>
          <button class="category-tab" data-category="生产类">生产</button>
          <button class="category-tab" data-category="生理需求类">生理</button>
          <button class="category-tab" data-category="社交责任类">社交</button>
          <button class="category-tab" data-category="娱乐类">娱乐</button>
        </div>
      ` : ''}
      
      <div class="actions-container ${this.options.layout}">
        <div class="actions-grid"></div>
      </div>
      
      <div class="action-details">
        <div class="selected-action-info">
          选择一个行为查看详细信息
        </div>
      </div>
    `;
    
    this.container.appendChild(this.element);
    this.loadActions();
  }

  loadActions() {
    // 从配置中加载行为
    const behaviorCategories = DEFAULT_CONFIG.BEHAVIOR_CATEGORIES || {};
    this.actions = [];
    
    Object.entries(behaviorCategories).forEach(([categoryName, categoryData]) => {
      if (categoryData.actions) {
        categoryData.actions.forEach(actionName => {
          this.actions.push({
            name: actionName,
            category: categoryName,
            displayName: actionName,
            energyCost: categoryData.energyCost || 20,
            timeSlots: categoryData.timeSlots || ['上午', '下午'],
            priority: categoryData.priority || 'medium',
            description: this.generateActionDescription(actionName, categoryName)
          });
        });
      }
    });
    
    this.filteredActions = [...this.actions];
    this.renderActions();
  }

  generateActionDescription(actionName, category) {
    const descriptions = {
      '垦荒耕种': '开垦荒地，种植粮食作物，是坞堡生存的基础',
      '水产捕捞': '在河边捕鱼，获取蛋白质丰富的食物',
      '手工雕琢': '制作精美的手工艺品，提高生活品质',
      '住宅修建': '建造和维修住所，改善居住条件',
      '商铺经营': '经营买卖，与外来商队交换物资',
      '经义研读': '研读经典，提升文化修养和智慧',
      '进食饮水': '补充身体所需的营养和水分',
      '休息睡眠': '恢复体力和精神，保持健康状态',
      '社集看戏': '观看戏曲表演，放松心情',
      '祝祷祭祀': '向祖先和神灵祈祷，寻求保佑'
    };
    
    return descriptions[actionName] || `执行${actionName}，属于${category}`;
  }

  renderActions() {
    const grid = this.element.querySelector('.actions-grid');
    grid.innerHTML = '';
    
    this.filteredActions.forEach(action => {
      const actionElement = this.createActionElement(action);
      grid.appendChild(actionElement);
    });
  }

  createActionElement(action) {
    const element = document.createElement('div');
    element.className = 'action-item';
    element.dataset.action = action.name;
    element.dataset.category = action.category;
    
    // 根据优先级设置样式
    const priorityClass = {
      'critical': 'priority-critical',
      'high': 'priority-high',
      'medium': 'priority-medium',
      'low': 'priority-low'
    }[action.priority] || 'priority-medium';
    
    element.classList.add(priorityClass);
    
    element.innerHTML = `
      <div class="action-icon">${this.getActionIcon(action.name)}</div>
      <div class="action-info">
        <div class="action-name">${action.displayName}</div>
        <div class="action-meta">
          <span class="energy-cost">💪 ${action.energyCost}</span>
          <span class="time-slots">⏰ ${Array.isArray(action.timeSlots) ? action.timeSlots.slice(0, 2).join('/') : (action.timeSlots || '全天')}</span>
        </div>
      </div>
      <div class="action-status"></div>
    `;
    
    element.addEventListener('click', () => {
      this.selectAction(action);
    });
    
    return element;
  }

  getActionIcon(actionName) {
    const icons = {
      '垦荒耕种': '🌾',
      '水产捕捞': '🎣',
      '手工雕琢': '🔨',
      '住宅修建': '🏠',
      '商铺经营': '💰',
      '经义研读': '📚',
      '进食饮水': '🍽️',
      '休息睡眠': '😴',
      '社集看戏': '🎭',
      '祝祷祭祀': '🙏',
      '畜牧养殖': '🐄',
      '熔炼铸锻': '⚒️',
      '纺织缝纫': '🧵',
      '采石挖矿': '⛏️',
      '野外狩猎': '🏹',
      '饮酒聚宴': '🍷',
      '击剑格斗': '⚔️'
    };
    
    return icons[actionName] || '🎯';
  }

  selectAction(action) {
    // 移除其他选中状态
    this.element.querySelectorAll('.action-item.selected').forEach(item => {
      item.classList.remove('selected');
    });
    
    // 添加选中状态
    const actionElement = this.element.querySelector(`[data-action="${action.name}"]`);
    actionElement?.classList.add('selected');
    
    // 更新详情显示
    this.updateActionDetails(action);
    
    // 触发事件
    this.container.dispatchEvent(new CustomEvent('actionSelected', {
      detail: { action, character: this.selectedCharacter }
    }));
  }

  updateActionDetails(action) {
    const detailsContainer = this.element.querySelector('.selected-action-info');
    
    detailsContainer.innerHTML = `
      <div class="action-detail-header">
        <span class="action-detail-icon">${this.getActionIcon(action.name)}</span>
        <h4>${action.displayName}</h4>
      </div>
      
      <div class="action-description">
        ${action.description}
      </div>
      
      <div class="action-requirements">
        <div class="requirement-item">
          <span class="requirement-label">体力消耗:</span>
          <span class="requirement-value">${action.energyCost}</span>
        </div>
        <div class="requirement-item">
          <span class="requirement-label">适合时段:</span>
          <span class="requirement-value">${action.timeSlots.join(', ')}</span>
        </div>
        <div class="requirement-item">
          <span class="requirement-label">行为类别:</span>
          <span class="requirement-value">${action.category}</span>
        </div>
      </div>
      
      <div class="action-controls">
        <button class="execute-btn ${this.selectedCharacter ? '' : 'disabled'}" 
                ${this.selectedCharacter ? '' : 'disabled'}>
          执行行为
        </button>
      </div>
    `;
    
    // 绑定执行按钮事件
    const executeBtn = detailsContainer.querySelector('.execute-btn');
    executeBtn?.addEventListener('click', () => {
      if (this.selectedCharacter) {
        this.executeAction(action);
      }
    });
  }

  executeAction(action) {
    if (!this.selectedCharacter) return;
    
    this.container.dispatchEvent(new CustomEvent('actionExecuteRequested', {
      detail: { 
        action: action, 
        character: this.selectedCharacter 
      }
    }));
  }

  setSelectedCharacter(character) {
    this.selectedCharacter = character;
    
    const characterInfo = this.element.querySelector('.selected-character');
    if (character) {
      characterInfo.innerHTML = `
        <span class="character-name">${character.name}</span>
        <span class="character-status">
          💚 ${Math.round(character.physicalState?.health || 80)}%
          ⚡ ${Math.round(character.physicalState?.energy || 70)}%
        </span>
      `;
    } else {
      characterInfo.innerHTML = `
        <span class="character-name">请选择角色</span>
        <span class="character-status"></span>
      `;
    }
    
    // 更新行为可用性
    this.updateActionAvailability();
  }

  updateActionAvailability() {
    if (!this.selectedCharacter) return;
    
    const actionItems = this.element.querySelectorAll('.action-item');
    actionItems.forEach(item => {
      const actionName = item.dataset.action;
      const action = this.actions.find(a => a.name === actionName);
      
      if (action) {
        const canExecute = this.canCharacterExecuteAction(this.selectedCharacter, action);
        item.classList.toggle('unavailable', !canExecute);
        
        const statusElement = item.querySelector('.action-status');
        if (!canExecute) {
          statusElement.innerHTML = '❌';
          statusElement.title = '当前无法执行';
        } else {
          statusElement.innerHTML = '';
          statusElement.title = '';
        }
      }
    });
  }

  canCharacterExecuteAction(character, action) {
    // 检查体力
    const currentEnergy = character.physicalState?.energy || 70;
    if (currentEnergy < action.energyCost) {
      return false;
    }
    
    // 检查健康状态
    const currentHealth = character.physicalState?.health || 80;
    if (currentHealth < 20 && action.energyCost > 10) {
      return false;
    }
    
    return true;
  }

  bindEvents() {
    // 搜索功能
    if (this.options.enableSearch) {
      const searchInput = this.element.querySelector('.action-search');
      const clearBtn = this.element.querySelector('.search-clear');
      
      searchInput?.addEventListener('input', (e) => {
        this.filterActions(e.target.value);
      });
      
      clearBtn?.addEventListener('click', () => {
        searchInput.value = '';
        this.filterActions('');
      });
    }
    
    // 分类标签
    if (this.options.showCategories) {
      const categoryTabs = this.element.querySelectorAll('.category-tab');
      categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          // 更新标签状态
          categoryTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          
          // 过滤行为
          const category = tab.dataset.category;
          this.filterByCategory(category);
        });
      });
    }
  }

  filterActions(searchTerm) {
    if (!searchTerm.trim()) {
      this.filteredActions = [...this.actions];
    } else {
      this.filteredActions = this.actions.filter(action =>
        action.name.includes(searchTerm) ||
        action.displayName.includes(searchTerm) ||
        action.description.includes(searchTerm)
      );
    }
    this.renderActions();
  }

  filterByCategory(category) {
    if (category === 'all') {
      this.filteredActions = [...this.actions];
    } else {
      this.filteredActions = this.actions.filter(action => 
        action.category === category
      );
    }
    this.renderActions();
  }
}

/**
 * 角色卡片组件
 */
export class CharacterCard extends UIComponent {
  constructor(container, character, options = {}) {
    console.log('=== CharacterCard 创建 ===');
    console.log('character data:', character);
    console.log('character type:', typeof character);
    super(container, options);
    this.character = character;
    this.setupDataBindings();

    // 等DOM创建后立即更新
    setTimeout(() => {
      // 关联组件到DOM元素
      if (this.element) {
        this.element._characterCardComponent = this;
      }
      this.updateDisplay();
    }, 100);
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = 'character-card nanbeichao-card';
    
    this.element.innerHTML = `
      <div class="character-header">
        <div class="character-avatar">
          <span class="avatar-icon">${this.getAvatarIcon()}</span>
          <div class="status-indicator"></div>
        </div>
        <div class="character-info">
          <h3 class="character-name">${this.character?.name || '未知'}</h3>
          <div class="character-meta">
            <span class="age">${this.character?.age ? Math.floor(this.character.age) : 0}岁</span>
            <span class="gender">${this.character?.gender || '未知'}</span>
            <span class="role">${this.translateRole(this.character?.role || 'unknown')}</span>
          </div>
        </div>
        <div class="character-virtues">
          <div class="virtue-summary"></div>
          <div class="trait-indicators"></div>
        </div>
      </div>
      
      <div class="character-status">
        <div class="status-bar health-bar">
          <label>健康</label>
          <div class="bar-container">
            <div class="bar-fill health-fill"></div>
            <span class="bar-text">--</span>
          </div>
        </div>
        
        <div class="status-bar energy-bar">
          <label>体力</label>
          <div class="bar-container">
            <div class="bar-fill energy-fill"></div>
            <span class="bar-text">--</span>
          </div>
        </div>
        
        <div class="status-bar mood-bar">
          <label>心情</label>
          <div class="bar-container">
            <div class="bar-fill mood-fill"></div>
            <span class="bar-text">--</span>
          </div>
        </div>
      </div>
      
      <div class="character-activity">
        <div class="current-activity">
          <span class="activity-icon">🎯</span>
          <span class="activity-text">休息中</span>
        </div>
        <div class="current-location">
          <span class="location-icon">📍</span>
          <span class="location-text">住宅区</span>
        </div>
      </div>
      
      <div class="character-actions">
        <button class="action-btn select-btn">选择</button>
        <button class="action-btn details-btn">详情</button>
      </div>
    `;
    
    this.container.appendChild(this.element);
    this.updateDisplay();
  }

  setupDataBindings() {
    // 健康状态绑定
    this.addDataBinding('health', (health) => {
      this.updateStatusBar('health', health);
    });
    
    // 体力状态绑定
    this.addDataBinding('energy', (energy) => {
      this.updateStatusBar('energy', energy);
    });
    
    // 心情状态绑定
    this.addDataBinding('mood', (mood) => {
      this.updateStatusBar('mood', mood);
    });
    
    // 活动状态绑定
    this.addDataBinding('currentActivity', (activity) => {
      this.updateActivity(activity);
    });
    
    // 位置绑定
    this.addDataBinding('currentLocation', (location) => {
      this.updateLocation(location);
    });
  }

  bindEvents() {
    const selectBtn = this.element.querySelector('.select-btn');
    const detailsBtn = this.element.querySelector('.details-btn');
    
    selectBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onSelect();
    });
    
    detailsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('🔍 详情按钮被点击');
      this.onShowDetails();
    });
    
    // 整个卡片点击选择
    this.element.addEventListener('click', () => {
      this.onSelect();
    });
  }

  updateDisplay() {
    if (!this.character) return;
    
    console.log('🔄 updateDisplay 被调用:', this.character.name);
    const characterId = this.character?.id;
    const engineChar = characterId && window.gameEngine?.characters?.get(characterId);
    //console.log('德行系统存在:', !!engineChar?.virtueSystem);
    // 同步引擎中的最新德行系统数据
    if (engineChar && engineChar.virtueSystem) {
      this.character.virtueSystem = engineChar.virtueSystem;
    }

    // 更新状态条
    const health = this.character.physicalState?.health || 80;
    const energy = this.character.physicalState?.energy || 70;
    const mood = this.getMoodValue();
    
    this.updateStatusBar('health', health);
    this.updateStatusBar('energy', energy);
    this.updateStatusBar('mood', mood);
    
    // 更新活动和位置
    this.updateActivity(this.character.currentActivity || '休息中');
    this.updateLocation(this.character.currentLocation || '住宅区');
    
    // 更新状态指示器
    this.updateStatusIndicator();

    // 更新德行相关数据
    this.updateVirtueDisplay();
    console.log('✅ updateVirtueDisplay 已调用');
  }

  updateStatusBar(type, value) {
    if (!this.element) return; // 添加这行

    const fillElement = this.element.querySelector(`.${type}-fill`);
    const textElement = this.element.querySelector(`.${type}-bar .bar-text`);
    
    if (fillElement && textElement) {
      const percentage = Math.max(0, Math.min(100, value));
      fillElement.style.width = `${percentage}%`;
      textElement.textContent = `${Math.round(percentage)}%`;
      
      // 设置颜色
      fillElement.className = `bar-fill ${type}-fill ${this.getStatusColor(type, percentage)}`;
    }
  }

  getStatusColor(type, value) {
    if (value >= 70) return 'status-good';
    if (value >= 40) return 'status-warning';
    return 'status-danger';
  }

  updateActivity(activity) {
    if (!this.element) return; // 添加这行

    const activityText = this.element.querySelector('.activity-text');
    if (activityText) {
      activityText.textContent = activity || '空闲';
    }
  }

  updateLocation(location) {
    if (!this.element) return; // 添加这行

    const locationText = this.element.querySelector('.location-text');
    if (locationText) {
      locationText.textContent = location || '未知';
    }
  }

  updateStatusIndicator() {
    if (!this.element) return; // 添加这行

    const indicator = this.element.querySelector('.status-indicator');
    if (!indicator) return;
    
    if (!this.character.isAlive) {
      indicator.className = 'status-indicator deceased';
      indicator.title = '已故';
    } else {
      const health = this.character.physicalState?.health || 80;
      if (health < 30) {
        indicator.className = 'status-indicator critical';
        indicator.title = '健康危急';
      } else if (health < 60) {
        indicator.className = 'status-indicator warning';
        indicator.title = '健康不佳';
      } else {
        indicator.className = 'status-indicator healthy';
        indicator.title = '健康良好';
      }
    }
  }

  updateVirtueDisplay() {
    console.log('🌟 updateVirtueDisplay 开始执行');
    console.log('角色:', this.character?.name);
    //console.log('德行系统:', !!this.character?.virtueSystem);
    // 强制从引擎获取最新德行数据
    if (this.character?.id && window.gameEngine?.characters) {
      const engineChar = window.gameEngine.characters.get(this.character.id);
      if (engineChar?.virtueSystem) {
        this.character.virtueSystem = engineChar.virtueSystem;
      }
    }

    if (!this.character?.virtueSystem) {
      console.log('❌ 德行系统不存在，退出');
      return;
    }
        
    const virtueArea = this.element.querySelector('.character-virtues');
    if (virtueArea) {
      virtueArea.style.display = 'block';
      virtueArea.style.minHeight = '30px';
      virtueArea.style.padding = '5px';
    }
    
    const virtueSummary = this.element.querySelector('.virtue-summary');
    const traitIndicators = this.element.querySelector('.trait-indicators');
    
    if (virtueSummary) {
      try {
        const dominantVirtues = this.character.virtueSystem.getDominantVirtues();
        //console.log('🔍 获取到的主导德行:', dominantVirtues);
        
        if (dominantVirtues && dominantVirtues.length > 0) {
          virtueSummary.innerHTML = `
            <div class="virtue-item">
              <span class="virtue-icon">🌟</span>
              <span class="virtue-name">${dominantVirtues[0].name}</span>
              <span class="virtue-score">${Math.round(dominantVirtues[0].score)}</span>
            </div>
          `;
          virtueSummary.style.display = 'block';
          //console.log('✅ 德行摘要已更新');
        }
      } catch (error) {
        console.error('❌ 更新德行摘要失败:', error);
        virtueSummary.innerHTML = '🌟 德行: --';
        virtueSummary.style.display = 'block';
      }
    }
    
    if (traitIndicators) {
      try {
        const traits = this.character.virtueSystem.getPersonalityTraits();
        console.log('🔍 获取到的性格特质:', traits);
        
        if (traits && traits.length > 0) {
          const topTraits = traits.slice(0, 3);
          traitIndicators.innerHTML = topTraits.map(trait => {
            // 从描述中提取主要内容，去掉括号内容
            const cleanDescription = (trait.description || trait.name).replace(/（.*?）/g, '');
            return `<span class="trait-tag">${cleanDescription}</span>`;
          }).join('<br>');
          traitIndicators.style.display = 'block';
          console.log('✅ 特质指示器已更新');
        }
      } catch (error) {
        console.error('❌ 更新特质指示器失败:', error);
      }
    }  
    
    // if (virtueArea) {
    //   // 强制从引擎获取最新德行数据
    //   const engineChar = window.gameEngine?.characters?.get(this.character?.id);
    //   // 获取真实德行数据
    //   const virtues = this.character.virtueSystem?.virtues;
    //   if (virtues && virtues.size > 0) {
    //     let virtueText = '德行: ';
    //     let count = 0;
    //     for (const [name, value] of virtues) {
    //       if (count < 3) { // 只显示前3个
    //         virtueText += `${name}${Math.round(value)} `;
    //         count++;
    //       }
    //     }
    //     virtueSummary.innerHTML = virtueText;
    //   } else {
    //     virtueSummary.innerHTML = '德行: 数据加载中...';
    //   }
    // } 
  }


  getAvatarIcon() {
    if (!this.character.isAlive) return '💀';
    return this.character.gender === '男' ? '👨' : '👩';
  }

  getMoodValue() {
    if (this.character.emotionalState) {
      return this.character.emotionalState.happiness || 50;
    }
    return 50;
  }

  translateRole(role) {
    const translations = {
      'family_head': '家长',
      'spouse': '配偶',
      'child': '子女',
      'grandfather': '祖父',
      'grandmother': '祖母',
      'great_grandfather': '曾祖父',
      'great_grandmother': '曾祖母',
      'great_great_grandfather': '高祖父',
      'great_great_grandmother': '高祖母',
      'uncle': '叔父',
      'aunt': '姑母',
      'relative': '亲属'
    };
    return translations[role] || '成员';
  }

  onSelect() {
    this.element.classList.add('selected');
    // 移除其他卡片的选中状态
    const allCards = this.container.querySelectorAll('.character-card.selected');
    allCards.forEach(card => {
      if (card !== this.element) {
        card.classList.remove('selected');
      }
    });
    
    // 触发选择事件
    this.container.dispatchEvent(new CustomEvent('characterSelected', {
      detail: { character: this.character, card: this }
    }));
  }

  onShowDetails() {
    console.log('🔍 onShowDetails 被调用');
    // 改为在document上触发事件
    document.dispatchEvent(new CustomEvent('characterDetailsRequested', {
      detail: { character: this.character, card: this }
    }));
  }
}

/**
 * 资源显示组件
 */
export class ResourceDisplay extends UIComponent {
  constructor(container, options = {}) {
    console.log('=== ResourceDisplay 构造函数开始 ===');
    console.log('container:', container);
    console.log('options:', options);
    try {
      super(container, {
        showIcons: true,
        showTrends: true,
        compactMode: false,
        ...options
      });
      console.log('super() 调用完成');
    } catch (error) {
      console.error('super() 调用失败:', error);
      throw error;
    }
    //this.resources = new Map();
    //console.log('this.resources 初始化完成:', this.resources);

    // 添加这个检查
    Object.defineProperty(this, 'resources', {
      value: new Map(),
      writable: false, // 防止被覆盖
      enumerable: true,
      configurable: true
    });

    console.log('this.resources 保护后:', this.resources);

    this.setupDataBindings();
    console.log('setupDataBindings() 后:', this.resources);
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = `resource-display ${this.options.compactMode ? 'compact' : ''}`;
    
    this.element.innerHTML = `
      <div class="resource-header">
        <h3>坞堡资源</h3>
        <button class="refresh-btn" title="刷新">🔄</button>
      </div>
      <div class="resource-grid"></div>
    `;
    
    this.container.appendChild(this.element);
    this.createResourceItems();
  }

  setupDataBindings() {
    this.addDataBinding('resources', (resourceData) => {
      this.updateResources(resourceData);
    });
  }

  createResourceItems() {
    console.log('=== createResourceItems 调试 ===');
    console.log('this:', this);
    console.log('this.resources:', this.resources);
    console.log('this.resources instanceof Map:', this.resources instanceof Map);
    console.log('typeof this.resources:', typeof this.resources);
    console.log('this.constructor.name:', this.constructor.name);
    const grid = this.element.querySelector('.resource-grid');
    console.log('grid:', grid);
    
    // 基础资源类型
    const resourceTypes = [
      { type: 'food', name: '粮食', icon: '🌾', critical: 20 },
      { type: 'water', name: '水源', icon: '💧', critical: 15 },
      { type: 'wood', name: '木材', icon: '🪵', critical: 10 },
      { type: 'stone', name: '石料', icon: '🪨', critical: 5 },
      { type: 'cloth', name: '布匹', icon: '🧵', critical: 5 },
      { type: 'metal', name: '金属', icon: '⚒️', critical: 3 },
      { type: 'medicine', name: '草药', icon: '🌿', critical: 2 },
      { type: 'tools', name: '工具', icon: '🔨', critical: 3 }
    ];
    
    resourceTypes.forEach((resourceConfig, index) => {
      console.log(`处理资源 ${index}:`, resourceConfig.type);
      const item = this.createResourceItem(resourceConfig);
      grid.appendChild(item);
      
      console.log('准备调用 this.resources.set，this.resources:', this.resources);
      this.resources.set(resourceConfig.type, {
        element: item,
        config: resourceConfig,
        amount: 0,
        trend: 0
      });
    });
  }

  createResourceItem(config) {
    const item = document.createElement('div');
    item.className = 'resource-item';
    item.dataset.type = config.type;
    
    item.innerHTML = `
      <div class="resource-icon">${config.icon}</div>
      <div class="resource-info">
        <div class="resource-name">${config.name}</div>
        <div class="resource-amount">0</div>
        ${this.options.showTrends ? '<div class="resource-trend"></div>' : ''}
      </div>
      <div class="resource-status"></div>
    `;
    
    return item;
  }

  updateResources(resourceData) {
    if (!resourceData.total) return;
    
    Object.entries(resourceData.total).forEach(([type, data]) => {
      this.updateResourceItem(type, data);
    });
    
    // 更新短缺警报
    this.updateShortageAlerts(resourceData.shortage || []);
  }

  updateResourceItem(type, data) {
    const resourceInfo = this.resources.get(type);
    if (!resourceInfo) return;
    
    const { element, config } = resourceInfo;
    const amount = data.amount || 0;
    const oldAmount = resourceInfo.amount;
    
    // 更新数量显示
    const amountElement = element.querySelector('.resource-amount');
    amountElement.textContent = amount;
    
    // 更新趋势
    if (this.options.showTrends) {
      const trend = amount - oldAmount;
      const trendElement = element.querySelector('.resource-trend');
      if (trendElement) {
        if (trend > 0) {
          trendElement.innerHTML = '<span class="trend-up">↗</span>';
          trendElement.className = 'resource-trend positive';
        } else if (trend < 0) {
          trendElement.innerHTML = '<span class="trend-down">↘</span>';
          trendElement.className = 'resource-trend negative';
        } else {
          trendElement.innerHTML = '<span class="trend-stable">→</span>';
          trendElement.className = 'resource-trend stable';
        }
      }
    }
    
    // 更新状态指示器
    const statusElement = element.querySelector('.resource-status');
    if (amount === 0) {
      statusElement.className = 'resource-status depleted';
      statusElement.title = '已耗尽';
    } else if (amount <= config.critical) {
      statusElement.className = 'resource-status critical';
      statusElement.title = '短缺';
    } else if (amount <= config.critical * 2) {
      statusElement.className = 'resource-status warning';
      statusElement.title = '偏少';
    } else {
      statusElement.className = 'resource-status sufficient';
      statusElement.title = '充足';
    }
    
    // 更新存储的数量
    resourceInfo.amount = amount;
  }

  updateShortageAlerts(shortageList) {
    // 移除旧的警报
    this.element.querySelectorAll('.shortage-alert').forEach(alert => {
      alert.remove();
    });
    
    // 添加新的警报
    if (shortageList.length > 0) {
      const alertContainer = document.createElement('div');
      alertContainer.className = 'shortage-alerts';
      
      const alertHeader = document.createElement('div');
      alertHeader.className = 'alert-header';
      alertHeader.innerHTML = `<span class="alert-icon">⚠️</span>资源短缺警报`;
      alertContainer.appendChild(alertHeader);
      
      shortageList.forEach(resourceType => {
        const resourceInfo = this.resources.get(resourceType);
        if (resourceInfo) {
          const alert = document.createElement('div');
          alert.className = 'shortage-alert';
          alert.innerHTML = `${resourceInfo.config.icon} ${resourceInfo.config.name}`;
          alertContainer.appendChild(alert);
        }
      });
      
      this.element.appendChild(alertContainer);
    }
  }

  bindEvents() {
    const refreshBtn = this.element.querySelector('.refresh-btn');
    refreshBtn?.addEventListener('click', () => {
      this.onRefresh();
    });
    
    // 资源项点击事件
    this.element.addEventListener('click', (e) => {
      const resourceItem = e.target.closest('.resource-item');
      if (resourceItem) {
        this.onResourceClick(resourceItem.dataset.type);
      }
    });
  }

  onRefresh() {
    this.container.dispatchEvent(new CustomEvent('resourceRefreshRequested'));
  }

  onResourceClick(resourceType) {
    this.container.dispatchEvent(new CustomEvent('resourceSelected', {
      detail: { resourceType }
    }));
  }
}

/**
 * 统计面板组件
 */
export class StatisticsPanel extends UIComponent {
  constructor(container, options = {}) {
    console.log('=== StatisticsPanel 构造函数开始 ===');
    console.log('container:', container);
    console.log('options:', options);

    super(container, {
      showCharts: false,
      updateInterval: 5000,
      ...options
    });

    console.log('super() 调用完成');
    //console.log('准备初始化 this.resources');
    
    //this.resources = new Map();
    //console.log('this.resources 初始化完成:', this.resources);
    //console.log('this.resources instanceof Map:', this.resources instanceof Map);
    this.stats = {};
    this.setupDataBindings();
    this.startAutoUpdate();
    console.log('=== StatisticsPanel 构造函数结束 ===');
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = 'statistics-panel nanbeichao-panel';
    
    this.element.innerHTML = `
      <div class="panel-header">
        <h3>坞堡统计</h3>
        <div class="panel-controls">
          <button class="minimize-btn" title="最小化">📊</button>
          <button class="close-btn" title="关闭">✕</button>
        </div>
      </div>
      
      <div class="panel-content">
        <div class="stats-grid">
          <div class="stat-card population-card">
            <div class="stat-icon">👥</div>
            <div class="stat-info">
              <div class="stat-label">总人口</div>
              <div class="stat-value" id="total-population">0</div>
              <div class="stat-detail">
                <span class="detail-item">男性: <span id="male-count">0</span></span>
                <span class="detail-item">女性: <span id="female-count">0</span></span>
              </div>
            </div>
          </div>
          
          <div class="stat-card families-card">
            <div class="stat-icon">🏠</div>
            <div class="stat-info">
              <div class="stat-label">家族数</div>
              <div class="stat-value" id="family-count">0</div>
              <div class="stat-detail">
                <span class="detail-item">平均规模: <span id="avg-family-size">0</span></span>
              </div>
            </div>
          </div>
          
          <div class="stat-card virtues-card">
            <div class="stat-icon">🌟</div>
            <div class="stat-info">
              <div class="stat-label">德行水平</div>
              <div class="stat-value" id="virtue-level">--</div>
              <div class="stat-detail">
                <span class="detail-item">主导德行: <span id="dominant-virtue">--</span></span>
              </div>
            </div>
          </div>
          
          <div class="stat-card relationships-card">
            <div class="stat-icon">💕</div>
            <div class="stat-info">
              <div class="stat-label">关系网络</div>
              <div class="stat-value" id="relationship-count">0</div>
              <div class="stat-detail">
                <span class="detail-item">密度: <span id="network-density">0%</span></span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="daily-summary">
          <h4>今日概况</h4>
          <div class="summary-items">
            <div class="summary-item">
              <span class="summary-label">完成行为:</span>
              <span class="summary-value" id="actions-completed">0</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">失败行为:</span>
              <span class="summary-value" id="actions-failed">0</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.container.appendChild(this.element);
  }

  setupDataBindings() {
    this.addDataBinding('population', (data) => {
      this.updatePopulationStats(data);
    });
    
    this.addDataBinding('families', (data) => {
      this.updateFamilyStats(data);
    });
    
    this.addDataBinding('virtues', (data) => {
      this.updateVirtueStats(data);
    });
    
    this.addDataBinding('relationships', (data) => {
      this.updateRelationshipStats(data);
    });
    
    this.addDataBinding('behaviors', (data) => {
      this.updateBehaviorStats(data);
    });
  }

  updatePopulationStats(data) {
    if (!this.element) return; // 添加这行检查

    const totalElement = this.element.querySelector('#total-population');
    const maleElement = this.element.querySelector('#male-count');
    const femaleElement = this.element.querySelector('#female-count');
    
    if (totalElement) totalElement.textContent = data.total || 0;
    if (maleElement) maleElement.textContent = data.male || 0;
    if (femaleElement) femaleElement.textContent = data.female || 0;
  }

  updateFamilyStats(data) {
    if (!this.element) return; // 添加这行检查

    const countElement = this.element.querySelector('#family-count');
    const avgSizeElement = this.element.querySelector('#avg-family-size');
    
    if (countElement) countElement.textContent = data.total || 0;
    if (avgSizeElement) {
      const avgSize = data.averageSize ? data.averageSize.toFixed(1) : '0.0';
      avgSizeElement.textContent = avgSize;
    }
  }

  updateVirtueStats(data) {
    if (!this.element || !data.virtueSystem) return;
  
    const virtueArea = this.element.querySelector('.character-virtues');
    if (!virtueArea) return;
  
    // 设置德行区域可见样式
    virtueArea.style.display = 'block';
    virtueArea.style.minHeight = '30px';
    virtueArea.style.padding = '5px';
  
    const summaryEl = virtueArea.querySelector('.virtue-summary');
    const traitsEl = virtueArea.querySelector('.trait-indicators');
    
    if (summaryEl) {
      // 计算德行平均值
      const allTraitValues = Array.from(data.virtueSystem.traits.values()).map(trait => trait.value);
      const avgValue = allTraitValues.reduce((sum, val) => sum + val, 0) / allTraitValues.length;
      summaryEl.textContent = `德行: ${Math.round(avgValue)}`;
      summaryEl.style.display = 'block';
    }
    
    if (traitsEl) {
      const dominantVirtues = data.virtueSystem.getDominantVirtues();
      const dominantName = dominantVirtues[0]?.name || '无';
      traitsEl.textContent = `主导: ${dominantName}`;
      traitsEl.style.display = 'block';
    }
  }

  updateRelationshipStats(data) {
    if (!this.element) return; // 添加这行检查

    const countElement = this.element.querySelector('#relationship-count');
    const densityElement = this.element.querySelector('#network-density');
    
    if (countElement) countElement.textContent = data.totalRelationships || 0;
    if (densityElement) {
      const density = data.networkDensity ? (data.networkDensity * 100).toFixed(1) : '0.0';
      densityElement.textContent = `${density}%`;
    }
  }

  updateBehaviorStats(data) {
    if (!this.element) return; // 添加这行检查

    const completedElement = this.element.querySelector('#actions-completed');
    const failedElement = this.element.querySelector('#actions-failed');
    
    if (completedElement) completedElement.textContent = data.completedToday || 0;
    if (failedElement) failedElement.textContent = data.failedToday || 0;
  }

  startAutoUpdate() {
    if (this.options.updateInterval > 0) {
      this.updateTimer = setInterval(() => {
        this.container.dispatchEvent(new CustomEvent('statisticsUpdateRequested'));
      }, this.options.updateInterval);
    }
  }

  bindEvents() {
    const minimizeBtn = this.element.querySelector('.minimize-btn');
    const closeBtn = this.element.querySelector('.close-btn');
    
    minimizeBtn?.addEventListener('click', () => {
      this.toggleMinimized();
    });
    
    closeBtn?.addEventListener('click', () => {
      this.setVisible(false);
    });
  }

  toggleMinimized() {
    this.element.classList.toggle('minimized');
  }

  destroy() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    super.destroy();
  }
}

/**
 * 通知组件
 */
export class NotificationSystem extends UIComponent {
  constructor(container, options = {}) {
    super(container, {
      maxNotifications: 5,
      autoHideDelay: 5000,
      position: 'top-right',
      ...options
    });
    
    this.notifications = [];
    this.notificationId = 0;
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = `notification-system ${this.options.position}`;
    this.container.appendChild(this.element);
  }

  /**
   * 显示通知
   */
  showNotification(message, type = 'info', options = {}) {
    const notification = this.createNotification(message, type, options);
    this.addNotification(notification);
    
    // 自动隐藏
    if (this.options.autoHideDelay > 0 && type !== 'error') {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, this.options.autoHideDelay);
    }
    
    return notification.id;
  }

  createNotification(message, type, options) {
    const id = ++this.notificationId;
    const notification = {
      id,
      message,
      type,
      timestamp: Date.now(),
      persistent: options.persistent || false
    };
    
    const element = document.createElement('div');
    element.className = `notification notification-${type}`;
    element.dataset.id = id;
    
    const icon = this.getNotificationIcon(type);
    element.innerHTML = `
      <div class="notification-icon">${icon}</div>
      <div class="notification-content">
        <div class="notification-message">${message}</div>
        <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
      </div>
      <button class="notification-close">✕</button>
    `;
    
    // 绑定关闭事件
    const closeBtn = element.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.removeNotification(id);
    });
    
    notification.element = element;
    return notification;
  }

  addNotification(notification) {
    this.notifications.unshift(notification);
    this.element.appendChild(notification.element);
    
    // 限制通知数量
    while (this.notifications.length > this.options.maxNotifications) {
      const oldest = this.notifications.pop();
      this.removeNotificationElement(oldest.element);
    }
    
    // 添加动画
    setTimeout(() => {
      notification.element.classList.add('show');
    }, 10);
  }

  removeNotification(id) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      const notification = this.notifications[index];
      this.removeNotificationElement(notification.element);
      this.notifications.splice(index, 1);
    }
  }

  removeNotificationElement(element) {
    element.classList.add('hide');
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }, 300);
  }

  getNotificationIcon(type) {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      event: '📢'
    };
    return icons[type] || icons.info;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * 快速显示不同类型的通知
   */
  info(message, options = {}) {
    return this.showNotification(message, 'info', options);
  }

  success(message, options = {}) {
    return this.showNotification(message, 'success', options);
  }

  warning(message, options = {}) {
    return this.showNotification(message, 'warning', options);
  }

  error(message, options = {}) {
    return this.showNotification(message, 'error', { ...options, persistent: true });
  }

  event(message, options = {}) {
    return this.showNotification(message, 'event', options);
  }

  /**
   * 清除所有通知
   */
  clearAll() {
    this.notifications.forEach(notification => {
      this.removeNotificationElement(notification.element);
    });
    this.notifications = [];
  }
}

/**
 * UI主题管理器
 */
export class ThemeManager {
  constructor() {
    this.currentTheme = 'nanbeichao';
    this.themes = {
      nanbeichao: {
        name: '南北朝风格',
        primaryColor: '#8B4513',
        secondaryColor: '#D2691E',
        accentColor: '#DAA520',
        backgroundColor: '#F5F5DC',
        textColor: '#2F1B14'
      }
    };
  }

  applyTheme(themeName = 'nanbeichao') {
    const theme = this.themes[themeName];
    if (!theme) return;

    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      if (key !== 'name') {
        root.style.setProperty(`--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
      }
    });

    this.currentTheme = themeName;
    this.injectThemeStyles();
  }

  injectThemeStyles() {
    const existingStyle = document.getElementById('ui-components-theme');
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'ui-components-theme';
    style.textContent = this.generateThemeCSS();
    document.head.appendChild(style);
  }

  generateThemeCSS() {
    return `
      /* 南北朝坞堡UI组件样式 */
      .nanbeichao-card {
        background: var(--theme-background-color, #F5F5DC);
        border: 2px solid var(--theme-secondary-color, #D2691E);
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(139, 69, 19, 0.2);
        transition: all 0.3s ease;
      }
      
      .nanbeichao-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(139, 69, 19, 0.3);
      }
      
      .nanbeichao-panel {
        background: var(--theme-background-color, #F5F5DC);
        border: 1px solid var(--theme-primary-color, #8B4513);
        border-radius: 6px;
        color: var(--theme-text-color, #2F1B14);
      }
      
      .character-card {
        padding: 12px;
        margin: 8px;
        cursor: pointer;
        min-width: 200px;
      }
      
      .character-card.selected {
        border-color: var(--theme-accent-color, #DAA520);
        background: linear-gradient(135deg, #FFF8DC, var(--theme-background-color, #F5F5DC));
      }
      
      .disabled {
        opacity: 0.6;
        pointer-events: none;
      }
    `;
  }
}

// 创建并导出 themeManager 实例
const themeManager = new ThemeManager();
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    themeManager.applyTheme('nanbeichao');
  });
}

export { themeManager };

export class CharacterDetailModal extends UIComponent {
  constructor(container, options = {}) {
    super(container, { ...options, autoCreate: false });
    this.character = null;
    this.previousBodyOverflow = null;
  }
  
  show(character) {
    console.log('🔍 show() 方法被调用:', character.name);
    this.character = character;
    
    // 如果已存在弹窗，先删除
    if (this.element) {
      console.log('🔍 删除现有弹窗');
      this.element.remove();
    }
    
    this.create();
  }
  
  create() {
    console.log('🔍 create() 方法被调用');
    this.element = document.createElement('div');
    this.element.className = 'character-detail-modal';
    this.element.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 1000; display: flex;
      justify-content: center; align-items: flex-start; padding: 48px 16px;
      overflow-y: auto;
    `;

    if (typeof document !== 'undefined') {
      if (this.previousBodyOverflow === null) {
        this.previousBodyOverflow = document.body.style.overflow || '';
      }
      document.body.style.overflow = 'hidden';
    }

    this._ensureFamilyTreeStyles();
    
    this.element.innerHTML = `
      <div class="modal-content" style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 16px 32px rgba(0,0,0,0.2); width: min(90%, 720px); max-height: 85vh; overflow-y: auto; box-sizing: border-box; overscroll-behavior: contain; position: relative;">
        <h3>${this.character.name} 详情</h3>
        <button class="close-btn" style="float: right;">×</button>
        <div class="character-details">
          <div class="basic-info">
            <h4>基本信息</h4>
            <p>年龄: ${this.character.age}岁 | 性别: ${this.character.gender}</p>
            <p>职业: ${this.character.occupation} | 社会地位: ${this.character.socialStatus}</p>
          </div>
          <div class="virtue-details">
            <h4>德行系统</h4>
            <div id="virtue-full-display">加载中...</div>
          </div>
          <div class="relationships">
            <h4>人际关系</h4>
            <div id="relationships-display">加载中...</div>
          </div>
          <div class="family-tree">
            <h4>家族谱系</h4>
            <div id="family-tree-display">加载中...</div>
            <div id="family-tree-detail" class="family-tree-detail">选择成员以查看亲疏</div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.element);

    console.log('🔍 弹窗创建完成，查找关闭按钮');
    const closeBtn = this.element.querySelector('.close-btn');
    console.log('🔍 关闭按钮:', closeBtn);

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('🔍 关闭按钮点击');
        this.close();
      });
    }

    // 加载德行数据
    this.loadVirtueDetails();
    // 加载关系数据  
    this.loadRelationshipDetails();
        
  }

  // 添加关闭方法
  close() {
    console.log('🔍 close() 方法被调用');
    if (this.element && this.element.parentNode) {
      console.log('🔍 移除弹窗元素');
      this.element.remove();
      this.element = null;
    } else {
      console.log('🔍 弹窗元素不存在或无父节点');
    }

    if (typeof document !== 'undefined') {
      if (this.previousBodyOverflow !== null) {
        document.body.style.overflow = this.previousBodyOverflow;
        this.previousBodyOverflow = null;
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  loadVirtueDetails() {
    const container = this.element.querySelector('#virtue-full-display');
    
    // 显示十德分类
    const categories = this.character.virtueSystem.virtueCategories;
    let html = '<div class="virtue-categories">';
    
    for (const [key, data] of categories) {
      // 计算该德行的平均分数
      let totalScore = 0;
      data.traits.forEach(trait => {
        totalScore += Math.abs(trait.value);
      });
      const avgScore = Math.round(totalScore / data.traits.length);
      html += `<div class="virtue-category">
        <strong>${data.name}</strong>: 
        <span style="color: ${data.color}">${avgScore}</span>
      </div>`;
    }
    
    html += '</div><div class="trait-details"><h5>性格倾向</h5>';
    
    // 显示倾向特质
    const traits = this.character.virtueSystem.getPersonalityTraits();
    traits.forEach(trait => {
      html += `<div>${trait.name}: ${trait.value}</div>`;
    });
    
    html += '</div>';
    container.innerHTML = html;
  }
  
  loadRelationshipDetails() {
    const container = this.element.querySelector('#relationships-display');
    const engine = window.gameEngine || null;
    const charactersMap = engine && engine.characters ? engine.characters : null;
    const latestCharacter = charactersMap ? charactersMap.get(this.character.id) : null;
    const sanitizeName = (name) => (typeof name === 'string' ? name.replace(/_\d+$/, '') : name);

    console.log('角色ID对照:', {
      thisCharacterId: this.character.id,
      latestCharacterGameId: latestCharacter ? latestCharacter.id : null,
      latestCharacterCharacterId: latestCharacter ? latestCharacter.characterId : null,
      bloodRelationsKeys: latestCharacter && latestCharacter.bloodRelations
        ? Array.from(latestCharacter.bloodRelations.keys())
        : []
    });

    const relationGroups = new Map();

    if (latestCharacter && latestCharacter.familyName && engine && engine.familySystem) {
      const fs = engine.familySystem;
      const family = fs.families.get(latestCharacter.familyName);

      if (family && Array.isArray(family.members) && family.members.length > 1) {
        const engineCharacters = charactersMap && typeof charactersMap.values === 'function'
          ? Array.from(charactersMap.values())
          : [];

        family.members.forEach(member => {
          if (!member || member.characterId === latestCharacter.characterId) {
            return;
          }

          const kinshipData = fs.getKinship(
            latestCharacter.familyName,
            latestCharacter.characterId,
            member.characterId
          );

          if (!kinshipData || !kinshipData.title) {
            return;
          }

          const targetChar = engineCharacters.find(
            characterItem => characterItem && characterItem.characterId === member.characterId
          );

          if (!targetChar) {
            return;
          }

          const displayName =
            sanitizeName(targetChar.name) ||
            member.displayName ||
            '未登记姓名';

          const gapValue = kinshipData.generationGap !== undefined && kinshipData.generationGap !== null
            ? kinshipData.generationGap
            : 0;
          const relationKey = `${kinshipData.title}|${kinshipData.type}|${gapValue}`;

          if (!relationGroups.has(relationKey)) {
            const baseClosenessRaw = kinshipData.strength !== undefined && kinshipData.strength !== null
              ? kinshipData.strength
              : (kinshipData.closeness !== undefined && kinshipData.closeness !== null
                ? kinshipData.closeness
                : 0);
            const distanceValue = kinshipData.distance !== undefined && kinshipData.distance !== null
              ? kinshipData.distance
              : 0;

            relationGroups.set(relationKey, {
              title: kinshipData.title,
              relationType: kinshipData.type,
              generationGap: gapValue,
              closeness: baseClosenessRaw,
              distance: distanceValue,
              members: new Map()
            });
          }

          const group = relationGroups.get(relationKey);
          if (!group.members.has(member.characterId)) {
            const groupClosenessRaw = kinshipData.strength !== undefined && kinshipData.strength !== null
              ? kinshipData.strength
              : (kinshipData.closeness !== undefined && kinshipData.closeness !== null
                ? kinshipData.closeness
                : 0);

            group.members.set(member.characterId, {
              name: displayName,
              vitalStatus: targetChar.vitalStatus,
              closeness: groupClosenessRaw
            });
          }

          console.log('关系已归类:', {
            relationKey,
            relationTitle: kinshipData.title,
            memberName: displayName
          });
        });
      } else {
        console.log('家族成员信息不足，无法展示人际关系', {
          hasFamily: !!family,
          hasMembers: !!(family && family.members),
          memberCount: family && family.members ? family.members.length : 0
        });
      }
    } else {
      console.log('FamilySystem 查询失败:', {
        hasCharacter: !!latestCharacter,
        hasFamilyName: latestCharacter ? !!latestCharacter.familyName : false,
        familyName: latestCharacter ? latestCharacter.familyName : null
      });
    }

    let html = '';
    if (relationGroups.size > 0) {
      const typePriority = new Map([
        ['self', -1],
        ['marriage', 0],
        ['spouse', 0],
        ['father_child', 1],
        ['mother_child', 1],
        ['ancestor', 2],
        ['descendant', 3],
        ['sibling', 4],
        ['in_law', 5],
        ['uncle_aunt', 6],
        ['nephew_niece', 7],
        ['cousin', 8],
        ['no_relation', 9]
      ]);

      const sortedGroups = Array.from(relationGroups.values()).sort((a, b) => {
        const priorityA = typePriority.has(a.relationType) ? typePriority.get(a.relationType) : 10;
        const priorityB = typePriority.has(b.relationType) ? typePriority.get(b.relationType) : 10;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        const gapAValue = a.generationGap !== undefined && a.generationGap !== null ? Math.abs(a.generationGap) : 0;
        const gapBValue = b.generationGap !== undefined && b.generationGap !== null ? Math.abs(b.generationGap) : 0;
        if (gapAValue !== gapBValue) {
          return gapAValue - gapBValue;
        }

        const closenessA = a.closeness !== undefined && a.closeness !== null ? a.closeness : 0;
        const closenessB = b.closeness !== undefined && b.closeness !== null ? b.closeness : 0;
        return closenessB - closenessA;
      });

      const suspectTitles = new Set(['父亲', '母亲', '夫君', '妻子', '岳父', '岳母']);

      html = sortedGroups.map(group => {
        const memberList = Array.from(group.members.values()).sort((a, b) => {
          const closenessA = a.closeness !== undefined && a.closeness !== null ? a.closeness : 0;
          const closenessB = b.closeness !== undefined && b.closeness !== null ? b.closeness : 0;
          return closenessB - closenessA;
        }).map(item => item.vitalStatus === 'deceased' ? `${item.name}(已故)` : item.name);

        const namesText = memberList.length > 0 ? memberList.join('、') : '未登记姓名';
        const isSuspicious = suspectTitles.has(group.title) && memberList.length > 1;
        const warningSuffix = isSuspicious ? '（疑似重复）' : '';

        return `<div>${group.title}: ${namesText}${warningSuffix}</div>`;
      }).join('');
    }

    container.innerHTML = html || '暂无人际关系记录';

    this.renderFamilyTree(latestCharacter);
  }
  renderFamilyTree(latestCharacter = null) {
    if (!this.element) {
      return;
    }

    const displayEl = this.element.querySelector('#family-tree-display');
    const detailEl = this.element.querySelector('#family-tree-detail');
    if (!displayEl) {
      return;
    }

    const engine = window.gameEngine || null;
    if (!engine || !engine.familySystem) {
      displayEl.textContent = '家族数据尚未加载';
      if (detailEl) {
        detailEl.textContent = '选择成员以查看亲疏';
      }
      return;
    }

    const charactersMap = engine.characters ? engine.characters : null;
    const currentCharacter = latestCharacter || (charactersMap ? charactersMap.get(this.character.id) : null);

    if (!currentCharacter || !currentCharacter.familyName || !currentCharacter.characterId) {
      displayEl.textContent = '未找到家族信息';
      if (detailEl) {
        detailEl.textContent = '选择成员以查看亲疏';
      }
      return;
    }

    const treeData = engine.familySystem.getFamilyTreeData(
      currentCharacter.familyName,
      currentCharacter.characterId,
      { ancestorLevels: 4, descendantLevels: 4 }
    );

    if (!treeData || !Array.isArray(treeData.nodes) || treeData.nodes.length === 0) {
      displayEl.textContent = '暂无家族树数据';
      if (detailEl) {
        detailEl.textContent = '选择成员以查看亲疏';
      }
      return;
    }

    const engineCharacters = charactersMap && typeof charactersMap.values === 'function'
      ? Array.from(charactersMap.values())
      : [];
    const findRuntimeCharacter = (memberId) => engineCharacters.find(
      characterItem => characterItem && (characterItem.characterId === memberId || characterItem.id === memberId)
    );

    treeData.nodes.forEach(node => {
      if (!node) {
        return;
      }
      const runtimeChar = findRuntimeCharacter(node.id);
      if ((!node.name || node.name === '未命名') && runtimeChar) {
        node.name = runtimeChar.name || runtimeChar.displayName || '未登记姓名';
      }
      if (!node.gender && runtimeChar && runtimeChar.gender) {
        node.gender = runtimeChar.gender;
      }
      if ((node.age === undefined || node.age === null) && runtimeChar && runtimeChar.age !== undefined) {
        node.age = runtimeChar.age;
      }
    });

    if (Array.isArray(treeData.levels)) {
      treeData.levels.forEach(level => {
        if (!level || !Array.isArray(level.members)) {
          return;
        }
        level.members.forEach(memberNode => {
          if (!memberNode) {
            return;
          }
          const runtimeChar = findRuntimeCharacter(memberNode.id);
          if ((!memberNode.name || memberNode.name === '未命名') && runtimeChar) {
            memberNode.name = runtimeChar.name || runtimeChar.displayName || '未登记姓名';
          }
        });
      });
    }

    const nodeMap = new Map();
    treeData.nodes.forEach(node => {
      if (node) {
        nodeMap.set(String(node.id), node);
      }
    });

    const levels = Array.isArray(treeData.levels) ? treeData.levels : [];
    const levelsHtml = levels.map(level => {
      const members = level && Array.isArray(level.members) ? level.members : [];
      const nodesHtml = members.length > 0
        ? members.map(memberNode => {
            const nodeIdValue = memberNode && memberNode.id !== undefined ? memberNode.id : '';
            const nameValue = memberNode && memberNode.name ? memberNode.name : '未登记姓名';
            const relationValue = memberNode && memberNode.relationTitle ? memberNode.relationTitle : '--';
            const closenessValue = memberNode && memberNode.closeness !== undefined && memberNode.closeness !== null
              ? memberNode.closeness
              : '--';
            const focusClass = memberNode && memberNode.isFocus ? 'focus' : '';
            return `<div class="family-tree-node ${focusClass}" data-node-id="${nodeIdValue}">
              <div class="family-tree-name">${nameValue}</div>
              <div class="family-tree-relation">${relationValue}</div>
              <div class="family-tree-closeness">亲疏度：${closenessValue}</div>
            </div>`;
          }).join('')
        : '<div class="family-tree-empty">--</div>';

      const levelLabel = level && level.label ? level.label : '';
      const levelValue = level && level.level !== undefined && level.level !== null ? level.level : '';
      return `<div class="family-tree-column" data-level="${levelValue}">
          <div class="family-tree-level-label">${levelLabel}</div>
          <div class="family-tree-nodes">${nodesHtml}</div>
        </div>`;
    }).join('');

    const summary = treeData.summary || {};
    const ancestorCount = summary.ancestors !== undefined && summary.ancestors !== null ? summary.ancestors : 0;
    const sameGenerationCount = summary.sameGeneration !== undefined && summary.sameGeneration !== null
      ? summary.sameGeneration
      : 0;
    const descendantCount = summary.descendants !== undefined && summary.descendants !== null
      ? summary.descendants
      : 0;

    displayEl.innerHTML = `
      <div class="family-tree-grid">${levelsHtml}</div>
      <div class="family-tree-summary">
        <span>祖辈：${ancestorCount}</span>
        <span>同辈：${sameGenerationCount}</span>
        <span>晚辈：${descendantCount}</span>
      </div>
    `;

    if (detailEl) {
      detailEl.textContent = '选择成员以查看亲疏';
    }

    let selectedNodeEl = null;
    displayEl.querySelectorAll('.family-tree-node').forEach(nodeEl => {
      nodeEl.addEventListener('click', () => {
        if (selectedNodeEl) {
          selectedNodeEl.classList.remove('selected');
        }
        selectedNodeEl = nodeEl;
        nodeEl.classList.add('selected');

        const nodeId = nodeEl.getAttribute('data-node-id');
        const nodeData = nodeId ? nodeMap.get(String(nodeId)) : null;
        this._updateFamilyTreeDetail(nodeData, treeData, detailEl);
      });
    });
  }
  _updateFamilyTreeDetail(nodeData, treeData, detailEl) {
    if (!detailEl) {
      return;
    }
    if (!nodeData) {
      detailEl.textContent = '选择成员以查看亲疏';
      return;
    }

    const nodeMap = new Map();
    if (treeData && Array.isArray(treeData.nodes)) {
      treeData.nodes.forEach(node => {
        if (node) {
          nodeMap.set(String(node.id), node);
        }
      });
    }

    const pathNames = [];
    if (nodeData.path && nodeData.path.length > 0) {
      const focusName = treeData && treeData.focusMember && treeData.focusMember.name
        ? treeData.focusMember.name
        : '本人';
      pathNames.push(focusName);
      nodeData.path.forEach(step => {
        const stepNode = nodeMap.get(String(step.to));
        if (stepNode && stepNode.name) {
          pathNames.push(stepNode.name);
        }
      });
    }

    const closenessValue = nodeData.closeness !== undefined && nodeData.closeness !== null
      ? nodeData.closeness
      : '--';
    const distanceValue = nodeData.distance !== undefined && nodeData.distance !== null
      ? nodeData.distance
      : (nodeData.path && nodeData.path.length !== undefined ? nodeData.path.length : '--');

    const pathHtml = pathNames.length > 1
      ? `<div class="family-tree-path">血缘路径：${pathNames.join(' → ')}</div>`
      : '';

    detailEl.innerHTML = `
      <div><strong>${nodeData.name}</strong>：${nodeData.relationTitle || '--'}</div>
      <div>亲疏度：${closenessValue}</div>
      <div>血缘距离：${distanceValue} 等</div>
      ${pathHtml}
    `;
  }
  _ensureFamilyTreeStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('family-tree-styles')) return;

    const style = document.createElement('style');
    style.id = 'family-tree-styles';
    style.textContent = `
      .family-tree-grid {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 8px;
      }
      .family-tree-column {
        min-width: 140px;
        background: rgba(245, 245, 220, 0.8);
        border: 1px solid rgba(139, 69, 19, 0.25);
        border-radius: 6px;
        padding: 8px;
      }
      .family-tree-level-label {
        font-weight: 600;
        text-align: center;
        margin-bottom: 6px;
        color: #5a3c24;
      }
      .family-tree-nodes {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .family-tree-node {
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(139, 69, 19, 0.2);
        border-radius: 4px;
        padding: 6px;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .family-tree-node:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      }
      .family-tree-node.focus {
        border-color: var(--theme-accent-color, #DAA520);
        background: rgba(218, 165, 32, 0.15);
      }
      .family-tree-node.selected {
        border-color: var(--theme-primary-color, #8B4513);
        box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.2);
      }
      .family-tree-name {
        font-weight: 600;
        color: #2f1b14;
      }
      .family-tree-relation {
        font-size: 12px;
        color: #705042;
      }
      .family-tree-closeness {
        font-size: 12px;
        color: #5a5a5a;
      }
      .family-tree-summary {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: #6b4e3a;
      }
      .family-tree-detail {
        margin-top: 8px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.92);
        border: 1px dashed rgba(139, 69, 19, 0.3);
        border-radius: 4px;
        font-size: 12px;
        color: #4a2e1b;
      }
      .family-tree-path {
        margin-top: 4px;
        font-size: 12px;
        color: #845d3b;
      }
      .family-tree-empty {
        text-align: center;
        color: #b08c6a;
        font-size: 12px;
        padding: 6px;
        border: 1px dashed rgba(139, 69, 19, 0.3);
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  _manuallyCorrectRelation(relation, targetGender) {
    // 修正配偶关系
    if (relation === 'husband' && targetGender === '女') {
      return '妻子';
    } else if (relation === 'wife' && targetGender === '男') {
      return '丈夫';
    }
    
    // 修正父母关系
    if (relation === 'father' && targetGender === '女') {
      return '母亲';
    } else if (relation === 'mother' && targetGender === '男') {
      return '父亲';
    }
    
    // 翻译其他关系
    const translations = {
      'father': '父亲',
      'mother': '母亲', 
      'son': '儿子',
      'daughter': '女儿',
      'husband': '丈夫',
      'wife': '妻子',
      'brother': '兄弟',
      'sister': '姐妹',
      'grandfather': '祖父',
      'grandmother': '祖母',
      'grandson': '孙子',
      'granddaughter': '孙女'
    };
    
    return translations[relation] || relation;
  }



  translateRelation(relation, category = 'blood_relations') {
    try {
      const gameEngine = window.gameEngine;
      if (!gameEngine) return relation;
      
      const dataManager = gameEngine.dataManager;
      if (!dataManager) return relation;
      
      const dataTableManager = dataManager.dataTableManager;
      if (!dataTableManager) return relation;
      
      // 修复：直接检查方法是否存在，而不是调用可能出错的方法
      if (typeof dataTableManager.getBalanceConfig !== 'function') {
        console.warn('getBalanceConfig方法不存在，使用原始关系名');
        return relation;
      }
      
      const config = dataTableManager.getBalanceConfig();
      if (!config || !config.relationship_translations) {
        return relation;
      }
      
      const categoryTranslations = config.relationship_translations[category];
      if (!categoryTranslations) return relation;
      
      return categoryTranslations[relation] || relation;
      
    } catch (error) {
      console.warn('获取关系翻译失败，使用原始名称:', error.message);
      return relation;
    }
  }
}
/**
 * UI组件工厂
 */
class UIComponentFactory {
  static createCharacterCard(container, character, options = {}) {
    return new CharacterCard(container, character, options);
  }

  static createResourceDisplay(container, options = {}) {
    return new ResourceDisplay(container, options);
  }

  static createStatisticsPanel(container, options = {}) {
    return new StatisticsPanel(container, options);
  }

  static createNotificationSystem(container, options = {}) {
    return new NotificationSystem(container, options);
  }

  static createActionPanel(container, options = {}) {
    return new ActionPanel(container, options);
  }

  static createCharacterDetailModal(container, options = {}) {
    return new CharacterDetailModal(container, options);
  }
}

// 默认导出
export default UIComponentFactory;
