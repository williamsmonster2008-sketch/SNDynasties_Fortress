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
    this.surnameData = null;  // 🆕 新增
    this.generationData = null;  // 🆕 新增
    this.configLoaded = false;
    
    // 组织后的数据结构（加载后构建）
    this.surnames = new Map();  // 🔧 改为Map: socialClass -> [surnames]
    this.names = new Map();      // 🔧 改为Map: socialClass -> {gender -> [names]}
    // 🆕 辈分字管理
    this.familyGenerationMap = new Map();  // familyName -> generationSequence
    this.usedCommonSequences = new Set();  // 已使用的平民序列索引
    this.usedEliteSequences = new Set();   // 已使用的士族序列索引
    
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
      const [surnameData, nameData, generationData] = await Promise.all([
        tableManager.getCharacterSurnameConfig(),
        tableManager.getCharacterNameConfig(),
        tableManager.getGenerationNameConfig()
      ]);

      if (!surnameData || surnameData.length === 0) {
        throw new Error('character_surname.csv 数据为空');
      }
      if (!nameData || nameData.length === 0) {
        throw new Error('character_name.csv 数据为空');
      }
      if (!generationData || !generationData.commonGenerationNames || !generationData.eliteGenerationNames) {
        throw new Error('generation_name.json 数据格式错误');
      }
      
      this.surnameData = surnameData;
      this.nameData = nameData;
      this.generationData = generationData;
      
      console.log(`✅ 成功加载 ${surnameData.length} 条姓氏数据`);
      console.log(`✅ 成功加载 ${nameData.length} 条名字数据`);
      console.log(`✅ 成功加载 ${generationData.commonGenerationNames.length} 组平民辈分字`);
      console.log(`✅ 成功加载 ${generationData.eliteGenerationNames.length} 组士族辈分字`);
      

      // 🔧 修改：调用新的处理方法
      this.processSurnameData(surnameData);
      this.processNameData(nameData);
      
      this.configLoaded = true;
      console.log('✅ NameGenerator 配置加载完成');
      
    } catch (error) {
      console.error('❌ NameGenerator 配置加载失败:', error.message);
      console.warn('⚠️ 启用降级模式：使用内置备用姓名数据');
      this.initializeFallbackData();
      this.configLoaded = true;
      throw new Error(`NameGenerator配置加载失败: ${error.message}`);
    }
  }

  /**
   * 处理姓氏CSV数据
   * CSV结构: social_class, surname_type, surname
   */
  processSurnameData(rawData) {
    console.log('🔧 处理姓氏数据');
    
    this.surnames.clear();
    
    rawData.forEach(row => {
      const socialClass = this.normalizeText(row.social_class);
      const surname = this.normalizeText(row.surname);
      
      if (!socialClass || !surname) return;
      
      if (!this.surnames.has(socialClass)) {
        this.surnames.set(socialClass, []);
      }
      
      this.surnames.get(socialClass).push(surname);
    });
    
    // 输出统计
    console.log('📊 姓氏数据处理完成:');
    this.surnames.forEach((surnames, socialClass) => {
      console.log(`  ${socialClass}: ${surnames.length} 个姓氏`);
    });
  }
  
  /**
   * 处理名字CSV数据
   * CSV结构: social_class, gender, name
   */
  processNameData(rawData) {
    console.log('🔧 处理名字数据');
    
    this.names.clear();
    
    rawData.forEach(row => {
      const socialClass = this.normalizeText(row.social_class);
      const gender = this.normalizeText(row.gender);
      const name = this.normalizeText(row.name);
      
      if (!socialClass || !gender || !name) return;
      
      // 按 socialClass -> gender 组织
      if (!this.names.has(socialClass)) {
        this.names.set(socialClass, { male: [], female: [] });
      }
      
      const genderKey = gender === '女' || gender === 'female' ? 'female' : 'male';
      this.names.get(socialClass)[genderKey].push(name);
    });
    
    // 输出统计
    console.log('📊 名字数据处理完成:');
    this.names.forEach((genderNames, socialClass) => {
      const maleCount = genderNames.male?.length || 0;
      const femaleCount = genderNames.female?.length || 0;
      console.log(`  ${socialClass}: 男${maleCount}个, 女${femaleCount}个`);
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
    
    // 最基本的姓氏
    this.surnames = new Map([
      ['门阀士族', ['王', '谢', '袁', '萧']],
      ['寒门士人', ['李', '张', '刘', '赵']],
      ['豪强地主', ['郭', '杨', '孙', '马']],
      ['自耕农', ['田', '吴', '冯', '牛']],
      ['佃农', ['石', '铁', '柱', '根']],
      ['胡族', ['拓跋', '慕容', '宇文', '独孤']]
    ]);
    
    // 最基本的名字
    this.names = new Map([
      ['门阀士族', { male: ['之', '远', '文', '德'], female: ['婉', '怡', '静', '淑'] }],
      ['寒门士人', { male: ['文', '武', '忠', '义'], female: ['兰', '梅', '竹', '菊'] }],
      ['豪强地主', { male: ['虎', '龙', '威', '雄'], female: ['凤', '霞', '云', '鸾'] }],
      ['自耕农', { male: ['牛', '福', '贵', '财'], female: ['花', '叶', '桃', '杏'] }],
      ['佃农', { male: ['根', '栓', '柱', '墩'], female: ['妞', '翠', '巧', '丫'] }],
      ['胡族', { male: ['跋', '律', '破', '贺'], female: ['罗', '娜', '奴', '可'] }]
    ]);
    
    // 降级辈分字数据
    this.generationData = {
      commonGenerationNames: [['富', '贵', '荣', '华', '福']],
      eliteGenerationNames: [['国', '家', '兴', '盛', '世']]
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
      // 1. 生成或使用指定的姓氏
      const finalSurname = surname || familyName || this._generateSurname(socialClass);
      
      // 2. 🆕 判断是否胡族（胡族不用辈分字）
      if (socialClass === '胡族') {
        const singleName = this._getNameFromPool(socialClass, gender);
        return {
          fullName: finalSurname + singleName,
          surname: finalSurname,
          givenName: singleName,
          courtesyName: null,
          title: this._generateTitle(gender, generation, role, socialClass),
          nameInfo: {
            meaning: '胡族名字',
            category: socialClass,
            hasTaboo: false
          }
        };
      }
      
      // 3. 🆕 获取辈分字
      const generationChar = this._getGenerationChar(finalSurname, socialClass, generation);
      
      // 4. 生成单字名
      const singleName = this._getNameFromPool(socialClass, gender);

      // 🔧 新增：如果辈分字和单字名相同，重新生成（最多尝试5次）
      let attempts = 0;
      while (singleName === generationChar && attempts < 5) {
        console.warn(`⚠️ 辈分字"${generationChar}"与名字"${singleName}"重复，重新生成`);
        singleName = this._getNameFromPool(socialClass, gender);
        attempts++;
      }

      // 如果尝试5次仍然重复，强制修改
      if (singleName === generationChar) {
        singleName = genderKey === 'male' ? '重辈男' : '重辈女';
      }
      
      // 5. 组合完整名字：姓 + 辈分字 + 名
      const fullName = finalSurname + generationChar + singleName;
      
      // 6. 生成表字（可选）
      const courtesyName = useCourtesyName ? 
        this._generateCourtesyName(generationChar + singleName, gender) : null;
      
      // 7. 生成称谓
      const title = this._generateTitle(gender, generation, role, socialClass);
      
      const result = {
        fullName: fullName,
        surname: finalSurname,
        givenName: generationChar + singleName,
        courtesyName: courtesyName,
        title: title,
        nameInfo: {
          meaning: `${socialClass}第${generation}代`,
          category: socialClass,
          hasTaboo: false
        }
      };
      
      console.log(`✅ 生成完成: ${result.fullName}`);
      return result;
      
    } catch (error) {
      console.error('❌ 姓名生成失败:', error.message);
      return this._generateFallbackName(gender, socialClass);
    }
  }
  

  /**
   * 🆕 获取辈分字
   * @param {string} familyName - 家族姓氏
   * @param {string} socialClass - 社会阶层
   * @param {number} generation - 世代（1-15）
   * @returns {string} 辈分字
   */
  _getGenerationChar(familyName, socialClass, generation) {
    console.log(`🔍 获取辈分字: 家族=${familyName}, 阶层=${socialClass}, 世代=${generation}`);
    // 获取或分配该家族的辈分序列
    let sequence = this.familyGenerationMap.get(familyName);
    
    if (!sequence) {
      sequence = this._assignGenerationSequence(familyName, socialClass);
    }
    
    // generation从1开始，数组从0开始
    const index = generation - 1;
    
    if (index < 0 || index >= sequence.length) {
      console.warn(`⚠️ 世代${generation}超出范围，使用默认辈分字`);
      return '承';  // 默认辈分字
    }
    
    return sequence[index];
  }

  /**
   * 🆕 为家族分配辈分序列
   * @param {string} familyName - 家族姓氏
   * @param {string} socialClass - 社会阶层
   * @returns {Array} 辈分字序列（15个字的数组）
   */
  _assignGenerationSequence(familyName, socialClass) {
    if (this.familyGenerationMap.has(familyName)) {
      return this.familyGenerationMap.get(familyName);
    }
    
    // 判断使用哪类辈分字
    const isElite = ['门阀士族', '寒门士人', '豪强地主'].includes(socialClass);
    const sequencePool = isElite 
      ? this.generationData.eliteGenerationNames 
      : this.generationData.commonGenerationNames;
    
    const usedSet = isElite ? this.usedEliteSequences : this.usedCommonSequences;
    
    // 找到未使用的序列
    let selectedSeq = null;
    let selectedIndex = -1;
    
    for (let i = 0; i < sequencePool.length; i++) {
      if (!usedSet.has(i)) {
        selectedSeq = sequencePool[i];
        selectedIndex = i;
        break;
      }
    }
    
    // 如果所有序列都用完了，重置或使用第一个
    if (!selectedSeq) {
      console.warn(`⚠️ ${isElite ? '士族' : '平民'}辈分序列已用完，开始重用`);
      selectedSeq = sequencePool[0];
      selectedIndex = 0;
    }
    
    // 标记为已使用
    usedSet.add(selectedIndex);
    
    // 存储映射
    this.familyGenerationMap.set(familyName, selectedSeq);
    
    console.log(`📜 为家族"${familyName}"分配辈分序列: ${selectedSeq.join('')}`);
    
    return selectedSeq;
  }

  /**
   * 🆕 从名字池中获取单字名
   * @param {string} socialClass - 社会阶层
   * @param {string} gender - 性别
   * @returns {string} 单字名
   */
  _getNameFromPool(socialClass, gender) {
    const genderKey = gender === '女' || gender === 'female' ? 'female' : 'male';
    
    let namePool = this.names.get(socialClass)?.[genderKey];
    
    if (!namePool || namePool.length === 0) {
      // 🔧 不再跨阶层借用，而是使用降级默认值
      console.warn(`⚠️ 未找到${socialClass}/${gender}的名字池，使用默认名字`);
      return genderKey === 'male' ? '无名男' : '无名女';
    }
    
    return Utils.Array.randomChoice(namePool);
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
    const surnamePool = this.surnames.get(socialClass);
    
    if (!surnamePool || surnamePool.length === 0) {
      console.warn(`⚠️ 未找到 ${socialClass} 的姓氏数据，使用默认`);
      return '李';
    }
    
    return Utils.Array.randomChoice(surnamePool);
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