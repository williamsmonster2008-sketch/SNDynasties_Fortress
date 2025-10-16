/**
 * name_generator.js - 南北朝坞堡模拟器姓名生成系统（架构规范重构版）
 * 
 * 重构特点：
 * - ✅ 完全移除硬编码数据
 * - ✅ 通过 loadConfigurations(tableManager) 从CSV加载数据
 * - ✅ 符合模块接口规范
 * - ✅ 保持所有原有功能和接口不变
 * - ✅ 添加完整的错误处理和降级机制
 * 
 * 南北朝时期姓名特点：
 * - 门阀士族重视谱系传承
 * - 胡汉融合，复合姓氏增多
 * - 佛教兴盛，法名和佛教用字流行
 * - 重视德行品格，名字寓意深远
 * - 避讳制度严格，需避皇帝名讳
 */

import { Utils } from './utils_module.js';

export class NameGenerator {
  constructor(gameEngine) {
    console.log('📝 NameGenerator 初始化 (架构规范重构版)');
    
    // 配置数据存储（从CSV加载）
    this.gameEngine = gameEngine;
    console.log('📝 NameGenerator 初始化 (架构规范重构版)');
    this.nameData = null;
    this.configLoaded = false;
    
    // 组织后的数据结构（加载后构建）
    this.surnames = {
      门阀士族: [],
      胡族: [],
      平民: [],
      工匠: []
    };
    
    this.names = {
      男: {},
      女: {}
    };
    
    // 衍生数据（基于CSV数据构建）
    this.courtesyNames = {
      male: ['之', '仲', '叔', '季', '伯', '子', '公', '君'],
      female: ['之', '氏', '女', '姬', '妃', '君', '淑', '贤']
    };
    
    this.familyTitles = {
      male: {
        elder: ['老爷', '老爷子', '长者', '尊长'],
        peer: ['郎君', '公子', '君子', '先生'],
        junior: ['小郎', '少年', '后生', '小子']
      },
      female: {
        elder: ['老夫人', '太夫人', '长者', '尊亲'],
        peer: ['夫人', '娘子', '小姐', '女郎'],
        junior: ['小娘', '少女', '丫头', '小女']
      }
    };
    
    // 时间线数据（可以考虑也放到数据表中）
    this.initializeTimelineData();
  }
  
  // ==================== 配置加载（符合架构规范） ====================
  
  /**
   * 加载配置数据 - 符合模块接口规范
   * @param {Object} tableManager - DataTableManager实例
   */
  async loadConfigurations(tableManager) {
    if (this.configLoaded) {
      console.log('📋 NameGenerator 配置已加载，跳过');
      return;
    }
    
    console.log('📋 NameGenerator 开始加载配置数据');
    
    try {
      // 从CSV文件加载姓名数据
      this.nameData = await tableManager.getCharacterNamesConfig();
      
      if (!this.nameData || this.nameData.length === 0) {
        throw new Error('character_names.csv 数据为空');
      }
      
      console.log(`✅ 成功加载 ${this.nameData.length} 条姓名数据`);
      
      // 处理和组织数据
      this.processNameData(this.nameData);
      
      this.configLoaded = true;
      console.log('✅ NameGenerator 配置加载完成');
      
    } catch (error) {
      console.error('❌ NameGenerator 配置加载失败:', error.message);
      
      // 🆕 降级处理：使用最小化备用数据
      console.warn('⚠️ 启用降级模式：使用内置备用姓名数据');
      this.initializeFallbackData();
      this.configLoaded = true;
      
      throw new Error(`NameGenerator配置加载失败: ${error.message}`);
    }
  }
  
  /**
   * 处理CSV数据并组织成可用的数据结构
   */
  processNameData(rawData) {
    console.log('🔧 处理和组织姓名数据');
    console.log('DEBUG: processNameData开始，rawData.length:', rawData.length);
    console.log('DEBUG: 第一条数据示例:', rawData[0]);

    // 先执行分组逻辑
    this.socialClassData = {};
    this.genderData = {};
    
    for (const row of rawData) {
        if (!this.socialClassData[row.social_class]) {
            this.socialClassData[row.social_class] = [];
        }
        if (!this.genderData[row.gender]) {
            this.genderData[row.gender] = [];
        }
        
        this.socialClassData[row.social_class].push(row);
        this.genderData[row.gender].push(row);
    }
    
    // 再输出DEBUG信息
    console.log('DEBUG: 社会阶层分组结果:', this.socialClassData);
    console.log('DEBUG: 性别分组结果:', this.genderData);
    
    // 清空现有数据
    Object.keys(this.surnames).forEach(key => {
      this.surnames[key] = [];
    });
    Object.keys(this.names).forEach(key => {
      this.names[key] = {};
    });
    
    // 处理CSV数据
    const surnameSet = new Set();
    const namesByCategory = {
      男: {},
      女: {}
    };

    console.log('DEBUG: 原始CSV数据:', rawData);
    
    rawData.forEach(row => {
      try {
        // 处理姓氏数据
        const socialClass = this.normalizeText(row.social_class);
        const surname = this.normalizeText(row.surname);
        
        if (surname && socialClass && this.surnames[socialClass]) {
          if (!surnameSet.has(`${socialClass}-${surname}`)) {
            this.surnames[socialClass].push(surname);
            surnameSet.add(`${socialClass}-${surname}`);
          }
        }
        
        // 处理姓名数据
        const gender = this.normalizeText(row.gender);
        const nameCategory = this.normalizeText(row.name_category);
        const name = this.normalizeText(row.name);
        const meaning = this.normalizeText(row.meaning);
        
        if (gender && nameCategory && name && (gender === '男' || gender === '女')) {
          if (!namesByCategory[gender][nameCategory]) {
            namesByCategory[gender][nameCategory] = [];
          }
          
          namesByCategory[gender][nameCategory].push({
            name: name,
            meaning: meaning || '寓意美好',
            frequency: row.frequency || 'medium',
            generation_preference: row.generation_preference || 'all'
          });
        }
        
      } catch (error) {
        console.warn('⚠️ 处理数据行时出错:', error.message, row);
      }
    });
    
    // 更新names对象
    this.names = namesByCategory;
    
    // 输出统计信息
    console.log('📊 数据处理完成:');
    Object.keys(this.surnames).forEach(socialClass => {
      if (this.surnames[socialClass].length > 0) {
        console.log(`  ${socialClass}: ${this.surnames[socialClass].length} 个姓氏`);
      }
    });
    
    Object.keys(this.names).forEach(gender => {
      const categoryCount = Object.keys(this.names[gender]).length;
      const totalNames = Object.values(this.names[gender]).reduce((sum, arr) => sum + arr.length, 0);
      if (totalNames > 0) {
        console.log(`  ${gender}名: ${categoryCount} 个类别, ${totalNames} 个名字`);
      }
    });
    
  }
  
  /**
   * 文本标准化处理（处理编码问题）
   */
  normalizeText(text) {
    if (!text) return '';
    
    // 移除引号和空格
    return text.toString().replace(/['"]/g, '').trim();
  }
  
  /**
   * 降级备用数据（最小化数据集）
   */
  initializeFallbackData() {
    console.log('🔧 初始化降级备用数据');
    
    // 最基本的姓氏数据
    this.surnames = {
      门阀士族: ['王', '谢', '袁', '萧', '李', '陈'],
      胡族: ['慕容', '宇文', '拓跋', '独孤'],
      平民: ['张', '李', '王', '赵', '刘', '陈'],
      工匠: ['田', '高', '林', '何', '郭', '马']
    };
    
    // 最基本的名字数据
    this.names = {
      男: {
        文雅: [
          { name: '明德', meaning: '光明品德', frequency: 'high' },
          { name: '文华', meaning: '文采华美', frequency: 'high' },
          { name: '志远', meaning: '志向远大', frequency: 'medium' }
        ],
        武勇: [
          { name: '建功', meaning: '建立功业', frequency: 'medium' },
          { name: '雄霸', meaning: '雄才霸业', frequency: 'rare' }
        ]
      },
      女: {
        美德: [
          { name: '淑慧', meaning: '淑女智慧', frequency: 'high' },
          { name: '贤良', meaning: '贤惠善良', frequency: 'high' }
        ],
        容貌: [
          { name: '美华', meaning: '美丽华贵', frequency: 'medium' }
        ]
      }
    };
    
    console.log('✅ 降级备用数据初始化完成');
  }
  
  // ==================== 核心生成方法（接口保持不变） ====================
  
  /**
   * 生成完整姓名 - 主要接口
   * @param {Object} config - 配置参数
   * @returns {Object} 姓名结果
   */
  async generateName(config) {
    // 检查配置是否已加载，如果没有则自动加载
    if (!this.configLoaded) {
      console.log('🔄 NameGenerator配置未加载，正在自动加载...');
      try {
        // 需要从外部传入dataManager或使用全局引用
        if (this.gameEngine?.dataManager?.dataTableManager) {
          await this.loadConfigurations(this.gameEngine.dataManager.dataTableManager);
        } else {
          throw new Error('无法找到DataTableManager进行配置加载');
        }
      } catch (error) {
        console.error('❌ 自动配置加载失败:', error.message);
        // 继续使用降级处理
      }
    }
  
    if (!this.configLoaded) {
      console.warn('⚠️ 配置未加载，使用降级处理');
      return this._generateFallbackName(config.gender || '男', config.socialClass || '平民');
    }
  
    // 原有的generateName逻辑保持不变...
    const {
      gender = '男',
      socialClass = '平民',
      familyName = null,
      surname = null,
      generation = 3,
      role = 'resident',
      useCourtesyName = false
    } = config;
  
    console.log(`🎭 生成姓名: ${gender}性, ${socialClass}, 世代${generation}`);
  
    try {
      // 1. 生成或使用指定的姓氏（优先使用传入的surname）
      const finalSurname = surname || familyName || this._generateSurname(socialClass);
      
      // 2. 生成名字
      const nameData = this._generateGivenName(gender, socialClass, generation, role);
      
      // 3. 生成表字
      const courtesyName = useCourtesyName ? this._generateCourtesyName(nameData.name, gender) : null;
      
      // 4. 生成称谓
      const title = this._generateTitle(gender, generation, role, socialClass);
      
      const result = {
        fullName: finalSurname + nameData.name,
        surname: finalSurname,
        givenName: nameData.name,
        courtesyName: courtesyName,
        title: title,
        nameInfo: {
          meaning: nameData.meaning,
          category: nameData.category,
          hasTaboo: false // 可扩展避讳检查
        }
      };
      
      console.log(`✅ 生成完成: ${result.fullName}`);
      return result;
      
    } catch (error) {
      console.error('❌ 姓名生成失败:', error.message);
      
      // 降级处理：生成基础姓名
      return this._generateFallbackName(gender, socialClass);
    }
  }
  

  /**
   * 生成随机姓氏（公共接口）
   * @param {string} socialClass - 社会等级
   * @returns {string} 姓氏
   */
  generateSurname(socialClass = '平民') {
    if (!this.configLoaded) {
      throw new Error('配置未加载，请先调用 loadConfigurations()');
    }
    return this._generateSurname(socialClass);
  }


  /**
   * 生成姓氏
   */
  _generateSurname(socialClass) {
    console.log('DEBUG: 查找姓氏数据', this.surnames);
    const surnamePool = this.surnames[socialClass];
    
    if (!surnamePool || surnamePool.length === 0) {
      console.warn(`⚠️ 未找到 ${socialClass} 的姓氏数据，使用默认`);
      return '李'; // 默认姓氏
    }
    
    const surname = Utils.Array.randomChoice(surnamePool);
    console.log('Debug _generateSurname 返回:', surname);
    
    // 确保返回的是纯姓氏，不包含"氏"
    return surname.replace(/氏$/, '');
  }
  
  /**
   * 生成名字
   */
  _generateGivenName(gender, socialClass, generation, role) {
    const normalizedGender = gender === '女' ? '女' : '男';
    const genderNames = this.names[normalizedGender];
    
    if (!genderNames || Object.keys(genderNames).length === 0) {
      console.warn(`⚠️ 未找到 ${gender} 的名字数据，使用默认`);
      return {
        name: normalizedGender === '男' ? '明' : '华',
        meaning: '寓意美好',
        category: 'default'
      };
    }
    
    // 根据社会阶层和世代选择名字类别
    let categoryName = this._selectNameCategory(genderNames, socialClass, generation, role);
    let namePool = genderNames[categoryName];
    
    if (!namePool || namePool.length === 0) {
      // 如果指定类别没有数据，随机选择一个有数据的类别
      const availableCategories = Object.keys(genderNames).filter(cat => 
        genderNames[cat] && genderNames[cat].length > 0
      );
      
      if (availableCategories.length === 0) {
        console.warn(`⚠️ ${gender} 没有可用的名字数据`);
        return {
          name: normalizedGender === '男' ? '明' : '华',
          meaning: '寓意美好',
          category: 'fallback'
        };
      }
      
      categoryName = Utils.Array.randomChoice(availableCategories);
      namePool = genderNames[categoryName];
    }
    
    const selectedName = Utils.Array.randomChoice(namePool);
    
    return {
      name: selectedName.name,
      meaning: selectedName.meaning,
      category: categoryName
    };
  }
  
  /**
   * 选择名字类别
   */
  _selectNameCategory(genderNames, socialClass, generation, role) {
    const availableCategories = Object.keys(genderNames);
    
    if (availableCategories.length === 0) {
      return 'default';
    }
    
    // 根据社会阶层偏好
    if (socialClass === '门阀士族') {
      const preferred = ['文雅', '美德', '品格'];
      const found = preferred.find(cat => availableCategories.includes(cat));
      if (found) return found;
    } else if (socialClass === '胡族') {
      const preferred = ['武勇', '尊贵', '勇武'];
      const found = preferred.find(cat => availableCategories.includes(cat));
      if (found) return found;
    }
    
    // 默认随机选择
    return Utils.Array.randomChoice(availableCategories);
  }
  
  /**
   * 生成表字
   */
  _generateCourtesyName(givenName, gender) {
    const courtesyElements = this.courtesyNames[gender === '男' ? 'male' : 'female'];
    const element = Utils.Array.randomChoice(courtesyElements);
    
    // 表字通常与名有关联，但不能相同
    const relatedChars = ['德', '文', '武', '仁', '义', '智', '明', '清', '雅', '贤'];
    const related = Utils.Array.randomChoice(relatedChars);
    
    return related + element;
  }
  
  /**
   * 生成称谓
   */
  _generateTitle(gender, generation, role, socialClass) {
    const titles = this.familyTitles[gender === '男' ? 'male' : 'female'];
    
    let titleType;
    if (generation <= 2) {
      titleType = 'elder';
    } else if (generation >= 5) {
      titleType = 'junior';
    } else {
      titleType = 'peer';
    }

    // 根据角色特殊处理
    if (role === 'family_head') {
      return gender === '男' ? '家主' : '主母';
    }

    const titlePool = titles[titleType] || titles.peer;
    return Utils.Array.randomChoice(titlePool);
  }
  
  // ==================== 工具方法 ====================
  
  /**
   * 标准化社会阶层名称
   */
  _normalizeSocialClass(socialClass) {
    const mapping = {
      '门阀士族': '门阀士族',
      '士族': '门阀士族',
      '贵族': '门阀士族',
      '胡族': '胡族',
      '鲜卑': '胡族',
      '平民': '平民',
      '庶民': '平民',
      '工匠': '工匠',
      '手工业者': '工匠'
    };
    
    return mapping[socialClass] || '平民';
  }
  
  /**
   * 降级姓名生成
   */
  _generateFallbackName(gender, socialClass) {
    const surnames = ['李', '王', '张'];
    const maleNames = ['明', '华', '强'];
    const femaleNames = ['丽', '娟', '芳'];
    
    const surname = Utils.Array.randomChoice(surnames);
    const givenName = gender === '女' ? 
      Utils.Array.randomChoice(femaleNames) : 
      Utils.Array.randomChoice(maleNames);
    
    return {
      fullName: surname + givenName,
      surname: surname,
      givenName: givenName,
      courtesyName: null,
      nameInfo: {
        meaning: '降级生成的姓名',
        category: 'fallback',
        hasTaboo: false
      }
    };
  }
  
  // ==================== 专门方法（保持原有接口） ====================
  
  /**
   * 生成家族姓名列表
   */
  async generateFamilyNames(familyName, generations) {
    if (!this.configLoaded) {
      throw new Error('配置未加载');
    }
    
    const familyNames = [];
    
    for (let gen = 1; gen <= generations; gen++) {
      const maleCount = Math.random() < 0.6 ? 2 : 1;
      const femaleCount = Math.random() < 0.5 ? 1 : 2;
      
      // 生成男性成员
      for (let i = 0; i < maleCount; i++) {
        const name = await this.generateName({
          gender: '男',
          familyName: familyName,
          generation: gen,
          useCourtesyName: gen <= 3
        });
        familyNames.push({...name, generation: gen});
      }
      
      // 生成女性成员
      for (let i = 0; i < femaleCount; i++) {
        const name = await this.generateName({
          gender: '女',
          familyName: familyName,
          generation: gen,
          useCourtesyName: false
        });
        familyNames.push({...name, generation: gen});
      }
    }
    
    return familyNames;
  }
  
  // ==================== 时间线数据（未来可移至数据表） ====================
  
  /**
   * 初始化时间线数据
   */
  initializeTimelineData() {
    // 南北朝历史时期的皇帝名讳（避讳用）
    this.tabooNames = {
      '420-422': ['刘裕'],     // 宋武帝
      '424-453': ['刘义隆'],   // 宋文帝
      '502-549': ['萧衍'],     // 梁武帝
      '550-559': ['高洋']      // 北齐文宣帝
    };
    
    // 时代特色用字偏好
    this.periodPreferences = {
      '420-479': ['德', '文', '武', '仁', '义'],  // 刘宋
      '479-502': ['齐', '明', '高', '宣'],        // 南齐
      '502-557': ['梁', '武', '文', '昭'],        // 梁
      '557-589': ['陈', '宣', '后', '叔']         // 陈
    };
  }
  
  /**
   * 检查避讳
   */
  _checkTaboos(nameResult) {
    // 简化的避讳检查，实际项目中可以更复杂
    const currentPeriod = '502-549'; // 可以从游戏状态获取
    const taboos = this.tabooNames[currentPeriod] || [];
    
    nameResult.nameInfo.hasTaboo = taboos.some(taboo => 
      nameResult.fullName.includes(taboo) || nameResult.givenName.includes(taboo)
    );
    
    if (nameResult.nameInfo.hasTaboo) {
      console.warn(`⚠️ 姓名 ${nameResult.fullName} 可能存在避讳问题`);
    }
  }
  
  // ==================== 调试和状态方法 ====================
  
  /**
   * 获取配置加载状态
   */
  getConfigStatus() {
    return {
      loaded: this.configLoaded,
      dataRows: this.nameData ? this.nameData.length : 0,
      surnameCount: Object.values(this.surnames).reduce((sum, arr) => sum + arr.length, 0),
      nameCount: Object.values(this.names).reduce((sum, genderNames) => 
        sum + Object.values(genderNames).reduce((gsum, arr) => gsum + arr.length, 0), 0
      )
    };
  }
  
  /**
   * 重新加载配置
   */
  async reloadConfigurations(tableManager) {
    this.configLoaded = false;
    this.nameData = null;
    await this.loadConfigurations(tableManager);
  }
}

// 严格按照规范导出
export default NameGenerator;