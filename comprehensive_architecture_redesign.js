// ==================== 南北朝坞堡游戏系统架构重构方案 ====================

/*
当前问题分析：
1. game_interface_fixed.html 承担了太多不属于界面层的职责
2. 各模块之间的职责边界不清晰
3. 数据流混乱，没有统一的状态管理
4. 缺乏自动更新机制，需要手动刷新

重构目标：
1. 清晰的模块分层架构
2. 统一的数据流和状态管理
3. 自动的界面更新机制
4. 完整的家族关系系统（支持三代）
*/

// ==================== 架构设计 ====================

/*
新的模块架构：

1. 数据层 (Data Layer)
   - character_module.js: 角色数据模型
   - family_system.js: 家族系统（新建）
   - relationship_system.js: 关系系统

2. 逻辑层 (Logic Layer)  
   - game_engine.js: 游戏引擎核心
   - character_generator.js: 角色生成器
   - name_generator.js: 姓名生成器（新建）

3. 状态管理层 (State Management)
   - game_state_manager.js: 统一状态管理（新建）
   - event_bus.js: 事件总线（新建）

4. 表现层 (Presentation Layer)
   - game_interface.js: 界面控制器（重构）
   - ui_components.js: UI组件（新建）
*/

// ==================== 1. family_system.js (新建) ====================

/**
 * 家族系统 - 专门管理家族结构和关系
 */
export class FamilySystem {
    constructor() {
        this.families = new Map();
        this.generationRules = {
            grandfather: { generation: 1, minAge: 60, maxAge: 85 },
            grandmother: { generation: 1, minAge: 55, maxAge: 80 },
            family_head: { generation: 2, minAge: 30, maxAge: 55 },
            spouse: { generation: 2, minAge: 25, maxAge: 50 },
            child: { generation: 3, minAge: 1, maxAge: 25 },
            relative: { generation: 2, minAge: 18, maxAge: 65 }
        };
    }

    /**
     * 创建家族
     * @param {string} familyName - 家族姓氏
     * @param {number} targetSize - 目标人数
     * @param {string} familyType - 家族类型
     */
    createFamily(familyName, targetSize = 5, familyType = 'auto') {
        console.log(`🏠 创建${familyName}家族，目标${targetSize}人`);
        
        if (familyType === 'auto') {
            familyType = this.decideFamilyType(targetSize);
        }
        
        const familyStructure = {
            familyName: familyName,
            familyType: familyType,
            generations: {
                first: [],   // 祖父母辈
                second: [],  // 父母辈
                third: []    // 子女辈
            },
            relationships: new Map(), // 存储具体关系
            createdAt: Date.now()
        };
        
        switch (familyType) {
            case 'three_generation':
                this.buildThreeGenerationFamily(familyStructure, targetSize);
                break;
            case 'nuclear_with_elders':
                this.buildNuclearWithElders(familyStructure, targetSize);
                break;
            case 'nuclear':
                this.buildNuclearFamily(familyStructure, targetSize);
                break;
            case 'extended':
                this.buildExtendedFamily(familyStructure, targetSize);
                break;
        }
        
        this.establishFamilyRelationships(familyStructure);
        this.families.set(familyName, familyStructure);
        
        console.log(`✅ ${familyName}家族创建完成`);
        this.logFamilyStructure(familyStructure);
        
        return familyStructure;
    }

    /**
     * 决定家族类型
     */
    decideFamilyType(size) {
        if (size >= 8) return 'three_generation';
        if (size >= 6) return Math.random() < 0.6 ? 'nuclear_with_elders' : 'extended';
        if (size >= 4) return Math.random() < 0.4 ? 'nuclear_with_elders' : 'nuclear';
        return 'nuclear';
    }

    /**
     * 构建三代家族
     */
    buildThreeGenerationFamily(structure, targetSize) {
        const { generations } = structure;
        
        // 第一代：祖父母（1-2人）
        const grandfatherRole = { role: 'grandfather', generation: 1 };
        generations.first.push(grandfatherRole);
        
        if (Math.random() < 0.8) {
            const grandmotherRole = { role: 'grandmother', generation: 1 };
            generations.first.push(grandmotherRole);
        }
        
        // 第二代：父母（1-2人）
        const fatherRole = { role: 'family_head', generation: 2 };
        generations.second.push(fatherRole);
        
        if (Math.random() < 0.9) {
            const motherRole = { role: 'spouse', generation: 2 };
            generations.second.push(motherRole);
        }
        
        // 第三代：子女（剩余名额的80%）
        const usedSlots = generations.first.length + generations.second.length;
        const childrenCount = Math.min(4, Math.max(1, Math.floor((targetSize - usedSlots) * 0.8)));
        
        for (let i = 0; i < childrenCount; i++) {
            const childRole = { role: 'child', generation: 3, birthOrder: i };
            generations.third.push(childRole);
        }
        
        // 其他亲属填充剩余名额
        const remainingSlots = targetSize - usedSlots - childrenCount;
        for (let i = 0; i < remainingSlots; i++) {
            const relativeRole = { role: 'relative', generation: 2 };
            generations.second.push(relativeRole);
        }
    }

    /**
     * 建立家族内部关系
     */
    establishFamilyRelationships(structure) {
        const { generations, relationships } = structure;
        
        // 建立配偶关系
        const fathers = generations.second.filter(r => r.role === 'family_head');
        const mothers = generations.second.filter(r => r.role === 'spouse');
        const grandfathers = generations.first.filter(r => r.role === 'grandfather');
        const grandmothers = generations.first.filter(r => r.role === 'grandmother');
        
        // 祖父母配偶关系
        if (grandfathers.length > 0 && grandmothers.length > 0) {
            this.setRelationship(relationships, grandfathers[0], grandmothers[0], 'spouse');
        }
        
        // 父母配偶关系
        if (fathers.length > 0 && mothers.length > 0) {
            this.setRelationship(relationships, fathers[0], mothers[0], 'spouse');
        }
        
        // 父子关系
        const parents = [...fathers, ...mothers];
        const children = generations.third;
        
        parents.forEach(parent => {
            children.forEach(child => {
                this.setRelationship(relationships, parent, child, 'parent_child');
            });
        });
        
        // 祖孙关系
        const grandparents = [...grandfathers, ...grandmothers];
        grandparents.forEach(grandparent => {
            children.forEach(child => {
                this.setRelationship(relationships, grandparent, child, 'grandparent_grandchild');
            });
        });
    }

    /**
     * 设置关系
     */
    setRelationship(relationships, roleA, roleB, relationType) {
        const keyAB = `${roleA.id || roleA.role}_${roleB.id || roleB.role}`;
        const keyBA = `${roleB.id || roleB.role}_${roleA.id || roleA.role}`;
        
        relationships.set(keyAB, { type: relationType, from: roleA, to: roleB });
        relationships.set(keyBA, { type: relationType, from: roleB, to: roleA });
    }

    /**
     * 获取角色间关系
     */
    getRelationship(familyName, fromCharId, toCharId) {
        const family = this.families.get(familyName);
        if (!family) return '未知关系';
        
        const relationKey = `${fromCharId}_${toCharId}`;
        const relationship = family.relationships.get(relationKey);
        
        if (!relationship) return '族人';
        
        return this.translateRelationship(relationship, fromCharId, toCharId);
    }

    /**
     * 翻译关系为具体描述
     */
    translateRelationship(relationship, fromCharId, toCharId) {
        const { type, from, to } = relationship;
        
        switch (type) {
            case 'spouse':
                return from.role === 'family_head' ? '妻子' : '丈夫';
            case 'parent_child':
                if (from.generation < to.generation) {
                    return to.gender === '男' ? '儿子' : '女儿';
                } else {
                    return from.role === 'family_head' ? '父亲' : '母亲';
                }
            case 'grandparent_grandchild':
                if (from.generation < to.generation) {
                    return to.gender === '男' ? '孙子' : '孙女';
                } else {
                    return from.role === 'grandfather' ? '祖父' : '祖母';
                }
            default:
                return '族人';
        }
    }

    logFamilyStructure(structure) {
        console.log(`📊 ${structure.familyName}家族结构 (${structure.familyType}):`);
        Object.entries(structure.generations).forEach(([gen, members]) => {
            if (members.length > 0) {
                const genName = { first: '祖父母辈', second: '父母辈', third: '子女辈' }[gen];
                console.log(`  ${genName}: ${members.length}人`);
            }
        });
    }
}

// ==================== 2. name_generator.js (新建) ====================

/**
 * 姓名生成器 - 专门处理角色姓名生成
 */
export class NameGenerator {
    constructor() {
        this.initializeNameDatabase();
    }

    initializeNameDatabase() {
        // 南北朝时期姓氏
        this.surnames = [
            '王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周',
            '慕容', '宇文', '独孤', '长孙', '尉迟', '司马', '欧阳'
        ];

        // 男性名字
        this.maleNames = [
            '明德', '文华', '志远', '建功', '景行', '承恩', '弘道', '元亮',
            '世民', '公瑾', '孟德', '文远', '子龙', '云长', '翼德'
        ];

        // 女性名字
        this.femaleNames = [
            '淑德', '慧心', '雅韵', '清音', '素娥', '婉儿', '如意', '芳华',
            '丽质', '玉容', '翠娟', '青莲', '红梅', '紫薇', '碧玉'
        ];

        // 角色称谓
        this.roleTitles = {
            grandfather: { male: ['老爷', '老太爷'], female: [] },
            grandmother: { male: [], female: ['老夫人', '老太太'] },
            family_head: { male: ['大郎', '家主'], female: ['大娘'] },
            spouse: { male: ['郎君'], female: ['氏', '夫人'] },
            child: { male: ['小郎', '二郎', '三郎'], female: ['小娘', '二娘', '三娘'] },
            relative: { male: ['叔', '伯'], female: ['婶', '伯母'] }
        };
    }

    /**
     * 生成角色姓名
     */
    generateName(config) {
        const { role, gender, familyName, generation, useTitle = false } = config;
        
        const surname = familyName || this.getRandomSurname();
        let firstName = '';
        
        if (useTitle && this.roleTitles[role]) {
            const titles = this.roleTitles[role][gender === '男' ? 'male' : 'female'];
            if (titles.length > 0) {
                firstName = titles[Math.floor(Math.random() * titles.length)];
            }
        }
        
        if (!firstName) {
            const namePool = gender === '男' ? this.maleNames : this.femaleNames;
            firstName = namePool[Math.floor(Math.random() * namePool.length)];
        }
        
        return {
            fullName: surname + firstName,
            surname: surname,
            firstName: firstName
        };
    }

    getRandomSurname() {
        return this.surnames[Math.floor(Math.random() * this.surnames.length)];
    }
}

// ==================== 3. game_state_manager.js (新建) ====================

/**
 * 游戏状态管理器 - 统一管理所有游戏状态
 */
export class GameStateManager {
    constructor() {
        this.state = {
            characters: new Map(),
            families: new Map(),
            gameStatus: {
                isRunning: false,
                isPaused: false,
                isInitialized: false
            },
            statistics: {
                totalPopulation: 0,
                totalFamilies: 0,
                totalDecisions: 0
            }
        };
        
        this.subscribers = new Map();
        this.eventBus = null;
    }

    /**
     * 设置事件总线
     */
    setEventBus(eventBus) {
        this.eventBus = eventBus;
    }

    /**
     * 订阅状态变化
     */
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, []);
        }
        this.subscribers.get(key).push(callback);
    }

    /**
     * 更新状态
     */
    updateState(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        // 通知订阅者
        if (this.subscribers.has(key)) {
            this.subscribers.get(key).forEach(callback => {
                callback(value, oldValue);
            });
        }
        
        // 发送事件
        if (this.eventBus) {
            this.eventBus.emit('stateChanged', { key, value, oldValue });
        }
        
        // 自动更新统计信息
        this.updateStatistics();
    }

    /**
     * 获取状态
     */
    getState(key = null) {
        return key ? this.state[key] : this.state;
    }

    /**
     * 添加角色
     */
    addCharacter(character) {
        this.state.characters.set(character.id, character);
        this.updateState('characters', this.state.characters);
    }

    /**
     * 添加家族
     */
    addFamily(familyName, familyData) {
        this.state.families.set(familyName, familyData);
        this.updateState('families', this.state.families);
    }

    /**
     * 更新统计信息
     */
    updateStatistics() {
        const newStats = {
            totalPopulation: this.state.characters.size,
            totalFamilies: this.state.families.size,
            totalDecisions: this.state.statistics.totalDecisions
        };
        
        this.updateState('statistics', newStats);
    }
}

// ==================== 4. event_bus.js (新建) ====================

/**
 * 事件总线 - 模块间通信
 */
export class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * 订阅事件
     */
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        this.events.get(eventName).push(callback);
    }

    /**
     * 发送事件
     */
    emit(eventName, data = null) {
        if (this.events.has(eventName)) {
            this.events.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件处理错误 [${eventName}]:`, error);
                }
            });
        }
    }

    /**
     * 取消订阅
     */
    off(eventName, callback) {
        if (this.events.has(eventName)) {
            const callbacks = this.events.get(eventName);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
}

// ==================== 5. 重构后的 game_interface.js ====================

/**
 * 游戏界面控制器 - 只负责界面逻辑，不处理业务逻辑
 */
export class GameInterface {
    constructor() {
        this.stateManager = null;
        this.eventBus = null;
        this.selectedCharacter = null;
        
        this.initializeInterface();
    }

    /**
     * 设置依赖
     */
    setDependencies(stateManager, eventBus) {
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        this.setupEventListeners();
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 监听状态变化，自动更新界面
        this.stateManager.subscribe('characters', (characters) => {
            this.updateCharacterList(Array.from(characters.values()));
        });
        
        this.stateManager.subscribe('families', (families) => {
            this.updateFamilyInfo(families);
        });
        
        this.stateManager.subscribe('statistics', (stats) => {
            this.updateStatistics(stats);
        });
        
        // 监听游戏事件
        this.eventBus.on('gameStarted', () => {
            this.onGameStarted();
        });
        
        this.eventBus.on('characterCreated', (character) => {
            this.onCharacterCreated(character);
        });
    }

    /**
     * 更新角色列表 - 纯界面逻辑
     */
    updateCharacterList(characters) {
        console.log('🔄 更新角色列表界面');
        
        const characterGrid = document.getElementById('character-grid');
        if (!characterGrid) return;
        
        characterGrid.innerHTML = '';
        
        characters.forEach(character => {
            const card = this.createCharacterCard(character);
            characterGrid.appendChild(card);
        });
        
        console.log(`✅ 角色列表更新完成: ${characters.length}人`);
    }

    /**
     * 创建角色卡片 - 纯UI组件
     */
    createCharacterCard(character) {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.onclick = () => this.selectCharacter(character);
        
        card.innerHTML = `
            <div class="character-info">
                <div class="character-name">${character.name}</div>
                <div class="character-details">
                    <span>年龄: ${character.age}岁</span>
                    <span>性别: ${character.gender}</span>
                </div>
                <div class="character-role">
                    ${this.translateRole(character.role)}
                </div>
                <div class="character-stats">
                    <div class="stat">健康: ${Math.floor(character.physicalState?.health || 80)}%</div>
                    <div class="stat">体力: ${Math.floor(character.physicalState?.energy || 70)}%</div>
                    <div class="stat">心情: ${Math.floor(character.emotionalState?.mood || 50)}%</div>
                </div>
            </div>
        `;
        
        return card;
    }

    /**
     * 选择角色
     */
    selectCharacter(character) {
        this.selectedCharacter = character;
        this.updateCharacterDetails(character);
        this.eventBus.emit('characterSelected', character);
    }

    /**
     * 更新角色详情
     */
    updateCharacterDetails(character) {
        // 从状态管理器获取家族信息
        const families = this.stateManager.getState('families');
        const familyData = families.get(character.familyName);
        
        // 显示角色详情（纯界面逻辑）
        const detailsPanel = document.getElementById('character-details');
        if (!detailsPanel) return;
        
        detailsPanel.innerHTML = `
            <div class="character-detail-header">
                <h3>👤 ${character.name}</h3>
            </div>
            <div class="detail-section">
                <h4>📊 状态信息</h4>
                <!-- 状态显示 -->
            </div>
            <div class="detail-section">
                <h4>👨‍👩‍👧‍👦 家族信息</h4>
                <!-- 家族关系显示 -->
            </div>
        `;
    }

    // 其他纯界面方法...
}

// ==================== 使用说明 ====================

/*
重构实施计划：

阶段1: 创建新模块
1. 创建 family_system.js
2. 创建 name_generator.js  
3. 创建 game_state_manager.js
4. 创建 event_bus.js

阶段2: 重构现有模块
1. 精简 game_engine.js，移除界面相关代码
2. 增强 relationship_system.js，添加世代关系
3. 重构 character_module.js，专注数据模型

阶段3: 重写界面层
1. 创建新的 game_interface.js 替换混乱的 game_interface_fixed.html
2. 分离UI组件到 ui_components.js
3. 建立清晰的数据流：数据层 → 状态管理 → 界面更新

阶段4: 集成测试
1. 测试模块间通信
2. 验证自动更新机制
3. 确认家族关系准确性

优势：
✅ 清晰的模块职责分离
✅ 统一的状态管理和自动更新
✅ 完整的三代家族支持
✅ 易于维护和扩展的架构
✅ 消除当前的混乱代码
*/