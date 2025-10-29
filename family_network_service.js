/**
 * family_network_service.js - 家族网络构建服务
 * 
 * Service Layer 模块 - 负责家族网络的具体构建
 * 架构层级：Service Layer (服务层) - 业务逻辑处理
 * 
 * 核心功能：
 * 1. 各类家族单元的具体构建 - 基于 PopulationPlanningService 的规划结果
 * 2. 集成年龄约束的完整家庭构建 - 基于 FERTILITY_CONFIG 确保年龄合理性
 * 3. 老人带孙的家庭单元 - 考虑代际年龄差和存活率
 * 4. 跨家族单元姻亲关系 - 基于 MARRIAGE_RULES 的社会等级约束
 */

import { PopulationRules, configManager } from './population_rules.js';
import { Utils } from './utils_module.js';

/**
 * 家族ID管理器 - 统一管理家族成员ID分配
 */
class FamilyIdManager {
  constructor(unitId, familyNetworkService) {
    this.unitId = unitId;
    this.familyNetworkService = familyNetworkService;
  }
  
  allocateId(role = 'member') {
    return this.familyNetworkService._generateCharacterId(this.unitId, role);
  }
}

/**
 * 家族网络构建服务
 */
export class FamilyNetworkService {
  constructor(gameEngine = null) {
    // 存储gameEngine引用
    this.gameEngine = gameEngine;
    // 构建状态
    this.builtNetworks = [];
    this.currentNetwork = null;
    this.configInitialized = false;
    
    // 角色ID计数器 - 在 initialize() 中获取真实配置
    this.characterIdCounter = null;

    // 全局家族关系管理
    this.globalFamilyRegistry = new Map();
    this.affiliationTransitions = [];
    this.settlementNetwork = {
      families: [],
      crossFamilyRelations: [],
      marriagePool: new Map(),
      settlementId: null
    };
    
    //console.log('👨‍👩‍👧‍👦 FamilyNetworkService - 家族网络构建服务初始化');
  }

  
  _getUnitCharacters(unit, status = 'all') {
    const allChars = unit.allCharacters || unit.characters || [];
    
    switch(status) {
      case 'living':
        return unit.livingCharacters || allChars.filter(c => c.vitalStatus === 'living');
      case 'deceased':
        return allChars.filter(c => c.vitalStatus === 'deceased');
      default:
        return allChars;
    }
  }



  /**
   * 初始化配置
   */
  async initialize() {
    try {
      //console.log('🔋 正在初始化 FamilyNetworkService 配置...');
      
      // 确保配置已加载
      await configManager.initializeConfigurations();
      
      // 获取配置引用 - 使用新的统一接口
      this.fertilityConfig = PopulationRules.getFertilityConfig();
      this.generationConfig = PopulationRules.getGenerationConfig();
      this.marriageSystem = PopulationRules.getMarriageRules(); // 更新：使用统一的 marriage_system
      this.socialClassRules = PopulationRules.getSocialClassCompatibility();

      // 新增：加载家族归属配置
      this.affiliationRules = PopulationRules.getFamilyAffiliationRules();
      this.affiliationTransitions = new Map(); // 记录归属变更历史
      this.crossFamilyTies = new Map(); // 跨家族关系网络      
      this.characterIdCounter = 1;
      
      this.configInitialized = true;
      //console.log('✅ FamilyNetworkService 配置初始化完成');
      
    } catch (error) {
      console.error('❌ FamilyNetworkService 配置初始化失败:', error);
      throw error;
    }
  }

  /**
   * 确保配置已初始化
   */
  _ensureConfigInitialized() {
    if (!this.configInitialized) {
      throw new Error('FamilyNetworkService 未初始化，请先调用 initialize() 方法');
    }
  }

  _normalizeGender(raw) {
    if (raw === undefined || raw === null) return null;
    const value = String(raw).trim();
    const lower = value.toLowerCase();
    if (value === '男' || lower === 'male' || lower === 'm') return 'male';
    if (value === '女' || lower === 'female' || lower === 'f') return 'female';
    return null;
  }

  _mapGenderToDisplay(code) {
    if (code === 'male') return '男';
    if (code === 'female') return '女';
    return '未知';
  }

  _getGenderCode(value) {
    if (value === undefined || value === null) return null;
    let raw = value;
    if (typeof value === 'object') {
      raw = value.genderCode ?? value.gender;
    }
    return this._normalizeGender(raw);
  }

  _hasExistingMarriage(structure, memberId) {
    if (!structure?.marriages || !memberId) return false;
    return structure.marriages.some(m => m.husband === memberId || m.wife === memberId);
  }

  _recordMarriage(structure, members, husbandId, wifeId, generation) {
    if (!structure.marriages) {
      structure.marriages = [];
    }

    const husband = members.get(husbandId);
    const wife = members.get(wifeId);

    if (husband) {
      const husbandGender = this._getGenderCode(husband.gender || husband.genderCode);
      if (husbandGender !== 'male') {
        console.error(`❌ 数据错误: ${husband.name || husbandId} 被标记为丈夫但性别是 ${this._mapGenderToDisplay(husbandGender)}`);
        console.error(`   配偶信息: ${wife?.name || wifeId}`);
        return;
      }
    }

    if (wife) {
      const wifeGender = this._getGenderCode(wife.gender || wife.genderCode);
      if (wifeGender !== 'female') {
        console.error(`❌ 数据错误: ${wife.name || wifeId} 被标记为妻子但性别是 ${this._mapGenderToDisplay(wifeGender)}`);
        console.error(`   配偶信息: ${husband?.name || husbandId}`);
        return;
      }
    }

    const exists = structure.marriages.some(
      marriage => marriage.husband === husbandId && marriage.wife === wifeId && marriage.generation === generation
    );

    if (!exists) {
      structure.marriages.push({
        husband: husbandId,
        wife: wifeId,
        generation
      });
    }

    if (husband) {
      husband.hasSpouse = true;
      husband.vitalStatus = husband.vitalStatus || 'living';
      if (husband.spouseId && husband.spouseId !== wifeId) {
        console.warn(`检测到成员 ${husbandId} 已存在其他配偶 ${husband.spouseId}，覆盖为 ${wifeId}`);
      }
      husband.spouseId = wifeId;
      husband.marriageStatus = husband.marriageStatus || 'married';
    }
    if (wife) {
      wife.hasSpouse = true;
      wife.vitalStatus = wife.vitalStatus || 'living';
      if (wife.spouseId && wife.spouseId !== husbandId) {
        console.warn(`检测到成员 ${wifeId} 已存在其他配偶 ${wife.spouseId}，覆盖为 ${husbandId}`);
      }
      wife.spouseId = husbandId;
      wife.marriageStatus = wife.marriageStatus || 'married';
    }
  }

  _enforceMonogamyAndSyncSpouses(structure, members) {
    if (!structure?.marriages || !Array.isArray(structure.marriages)) return;

    const seenHusbands = new Set();
    const seenWives = new Set();
    const filtered = [];
    const removed = [];

    const getGenderCode = id => {
      const member = members instanceof Map ? members.get(id) : null;
      return member ? this._getGenderCode(member) : null;
    };

    for (const marriage of structure.marriages) {
      const { husband, wife } = marriage;

      if (!husband || !wife) {
        removed.push({ ...marriage, reason: 'missing_partner' });
        continue;
      }

      const duplicateHusband = seenHusbands.has(husband);
      const duplicateWife = seenWives.has(wife);

      if (duplicateHusband || duplicateWife) {
        removed.push({ ...marriage, reason: duplicateHusband ? 'duplicate_husband' : 'duplicate_wife' });
        continue;
      }

      const husbandGender = getGenderCode(husband);
      const wifeGender = getGenderCode(wife);

      const invalidGender =
        (husbandGender && husbandGender !== 'male') ||
        (wifeGender && wifeGender !== 'female');

      if (invalidGender) {
        removed.push({ ...marriage, reason: 'gender_mismatch', husbandGender, wifeGender });
        continue;
      }

      seenHusbands.add(husband);
      seenWives.add(wife);
      filtered.push(marriage);
    }

    if (removed.length > 0) {
      console.warn(`检测到并移除 ${removed.length} 条无效婚姻记录`, removed);
    }

    structure.marriages = filtered;

    if (members instanceof Map) {
      for (const member of members.values()) {
        member.hasSpouse = false;
        if ('spouseId' in member) {
          delete member.spouseId;
        }
        if (member.marriageStatus === 'married') {
          delete member.marriageStatus;
        }
      }

      for (const marriage of filtered) {
        const husband = members.get(marriage.husband);
        const wife = members.get(marriage.wife);
        if (husband) {
          husband.hasSpouse = true;
          husband.spouseId = marriage.wife;
          husband.marriageStatus = 'married';
        }
        if (wife) {
          wife.hasSpouse = true;
          wife.spouseId = marriage.husband;
          wife.marriageStatus = 'married';
        }
      }
    }
  }

  /**
   * 构建家族单元网络 - 主要入口方法
   * @param {Object} populationPlan - 来自 PopulationPlanningService 的规划结果
   * @returns {Object} 家族网络构建结果
   */
  async buildFamilyUnits(populationPlan) {
    this._ensureConfigInitialized();
    
    //console.log('开始构建家族网络:', populationPlan.planId);
    
    // 初始化定居点网络
    this.settlementNetwork.settlementId = `settlement_${Date.now()}`;
  
    try {
      // 根据模式分发到不同的构建方法
      if (PopulationRules.getRefugeeMode()) {
        //console.log('执行Refugee模式构建');
        return await this._buildRefugeeFamilyUnits(populationPlan);
      } else {
        //console.log('执行Population模式构建');
        return await this._buildPopulationFamilyUnits(populationPlan);
      }
    } catch (error) {
      console.error('家族网络构建失败:', error);
      throw error;
    }
  }

  async _buildRefugeeFamilyUnits(populationPlan) {
    // 阶段1：构建refugee家族详细结构
    //console.log('阶段1: 构建refugee家族单元详细结构');
    const detailedFamilyUnits = await this._buildDetailedFamilyUnits(populationPlan.familyUnits);
    
    // 阶段2：注册家族到全局网络
    detailedFamilyUnits.forEach(family => {
      this._registerFamilyToSettlement(family);
    });
  
    // Refugee模式不建立跨家族关系
    const crossUnitRelations = [];
    
    // 阶段3：生成血缘网络数据
    //console.log('阶段3: 生成血缘网络数据');
    const bloodlineNetwork = this._generateBloodlineNetwork(detailedFamilyUnits, crossUnitRelations);
  
    // 阶段4：验证网络完整性
    const validationResult = this._validateNetworkIntegrity(bloodlineNetwork);
    
    const finalResult = this._buildFinalNetworkResult(populationPlan, detailedFamilyUnits, crossUnitRelations, bloodlineNetwork, validationResult);
    this._storeBloodRelationsToFamilySystem(
      finalResult.bloodlineNetwork.allCharacters,
      finalResult      
    );
    return finalResult;

  }

  async _buildPopulationFamilyUnits(populationPlan) {
    // Population模式：处理现有家族的发展
    //console.log('阶段1: 处理现有家族新生儿');
    const existingFamilyUnits = await this._expandExistingFamilies(populationPlan.familyUnits);
    
    // 注册到全局网络
    existingFamilyUnits.forEach(family => {
      this._registerFamilyToSettlement(family);
    });
  
    // Population模式建立跨家族联姻
    //console.log('阶段2: 建立跨单元姻亲关系');
    const crossUnitRelations = this._establishCrossUnitRelations(existingFamilyUnits);
    
    // 生成血缘网络数据
    const bloodlineNetwork = this._generateBloodlineNetwork(existingFamilyUnits, crossUnitRelations);
    
    // 验证网络完整性
    const validationResult = this._validateNetworkIntegrity(bloodlineNetwork);
  
    const finalResult = this._buildFinalNetworkResult(populationPlan, existingFamilyUnits, crossUnitRelations, bloodlineNetwork, validationResult);
    this._storeBloodRelationsToFamilySystem(
      finalResult.bloodlineNetwork.allCharacters,
      finalResult
    );
    return finalResult;
  }

  _buildFinalNetworkResult(populationPlan, familyUnits, crossUnitRelations, bloodlineNetwork, validationResult) {
    const familyNetwork = {
      networkId: `network_${Date.now()}`,
      sourcePlanId: populationPlan.planId,
      familyUnits: familyUnits,
      crossUnitRelations: crossUnitRelations,
      settlementNetwork: this.settlementNetwork,
      bloodlineNetwork: bloodlineNetwork,
      statistics: this._generateNetworkStatistics(familyUnits, crossUnitRelations),
      validation: validationResult,
      createdAt: Date.now(),
      builderVersion: 'FamilyNetworkService v2.0'
    };
  
    this.currentNetwork = familyNetwork;
    this.builtNetworks.push(familyNetwork);
    
    this._unifyIDsInFamilyNetwork(familyNetwork);
    return familyNetwork;
  }

  _unifyIDsInFamilyNetwork(familyNetwork) {
    familyNetwork.familyUnits.forEach(unit => {
      // 建立数字ID到字符串ID的映射
      const idMap = new Map();
      this._getUnitCharacters(unit).forEach((char, index) => {
        // 假设数字ID从1开始，与characters数组索引+1对应
        idMap.set(index + 1, char.characterId);
      });
      
      // 转换internalRelations中的ID
      unit.internalRelations.forEach(relation => {
        if (relation.participants) {
          relation.participants = relation.participants.map(id => 
            idMap.get(id) || id
          );
        }
      });
    });
  }

  // ==================== 详细单元构建 ====================

  /**
   * 构建详细的家族单元
   * @param {Array} familyUnitPlans - 来自规划服务的家族单元计划
   * @returns {Array} 详细的家族单元列表
   */
  async _buildDetailedFamilyUnits(familyUnitPlans) {
    const detailedUnits = [];
  
    for (const unitPlan of familyUnitPlans) {
      // 统一使用完整5代家族生成
      const detailedUnit = await this._buildComplete5GenerationFamily(unitPlan);
      console.log('详细单元构建结果:', {
        unitId: detailedUnit.unitId,
        hasCharacters: !!this._getUnitCharacters(detailedUnit),
        hasFamilyStructure: !!detailedUnit.familyStructure,
        marriagesCount: detailedUnit.familyStructure?.marriages?.length
      });
      detailedUnits.push(detailedUnit);
    }
    //console.log('_buildDetailedFamilyUnits最终返回:', detailedUnits.length, '个家族单元');
    return detailedUnits;
  }

  /**
   * 构建完整家庭单元
   * @param {Object} unitPlan - 完整家庭单元计划
   * @returns {Object} 详细的完整家庭单元
   */
  async _buildComplete5GenerationFamily(unitPlan) {        
    const members = new Map();
    // 1. 生成完整5代家族结构 - 传入unitId
    const fullFamily = await this._generateComplete5GenerationStructure(unitPlan.socialClass, unitPlan.unitId, members);
    console.log('传入_applyMortalityAndResize的fullFamily中角色数据:', {
      firstCharacter: fullFamily.characters[0],
      characterKeys: Object.keys(fullFamily.characters[0] || {}),
      hasCharacterId: fullFamily.characters[0]?.characterId
    });


    // 2. 应用死亡率调整到目标规模    
    const finalFamily = this._applyMortalityAndResize(fullFamily, unitPlan);
        
    return {
      ...finalFamily,
      originalMembers: finalFamily.originalMembers  // 继续传递
    };
  }

  async _generateComplete5GenerationStructure(socialClass, unitId, members) {
    const familyData = await this._generateFiveGenerationFamilyAges(socialClass,unitId,members);
    
    // 基于新格式处理数据 - 传入unitId
    return await this._processNewFormatData(familyData, socialClass, unitId);
  }
  
  
  /**
   * 生成家族名称
   * @param {string} socialClass - 社会等级
   * @param {string} unitId - 单元ID
   * @returns {string} 家族名称
   */
  async _generateFamilyName(socialClass) {
    try {
      if (!this.gameEngine?.dataManager?.dataTableManager) {
        throw new Error('DataManager不可用');
      }
      
      const nameData = await this.gameEngine.dataManager.dataTableManager.getCharacterNamesConfig();
      
      // 过滤出对应社会等级的记录
      const classRecords = nameData.filter(row => row.social_class === socialClass);
      
      if (classRecords.length === 0) {
        // 如果没找到对应等级，使用所有记录
        const allSurnames = [...new Set(nameData.map(row => row.surname))];
        const randomSurname = allSurnames[Math.floor(Math.random() * allSurnames.length)];
        return randomSurname;
      }
      
      // 从对应社会等级中获取唯一的姓氏列表
      const surnames = [...new Set(classRecords.map(row => row.surname))];
      const randomSurname = surnames[Math.floor(Math.random() * surnames.length)];
      
      return randomSurname;
      
    } catch (error) {
      console.warn('CSV访问错误:', error);
      throw error;
    }
  }
  
  async _processNewFormatData(familyData, socialClass, unitId) {
    
    const { members, structure, familyName } = familyData;  // 🔧 解构获取 familyName
    const characters = [];

    this._enforceMonogamyAndSyncSpouses(structure, members);        

    for (const [memberId, memberData] of members) {
      // 🔧 修复：外来配偶和母亲应该使用自己的originalFamily，而不是家族姓氏
      const isNativeMember = memberData?.hasOwnProperty('isNative') ? memberData.isNative : true;

      // 🔧 调试：检查外来成员的originalFamily
      if (!isNativeMember) {
        console.log(`🔍 外来成员 ${memberData.characterId}:`, {
          originalFamily: memberData.originalFamily,
          currentFamily: memberData.currentFamily,
          gender: memberData.gender
        });
      }

      const character = {
        characterId: memberData.characterId, // 使用来自members Map的ID
        age: memberData.age,
        gender: memberData.gender,
        generation: memberData.generation,
        socialClass: memberData.socialClass || socialClass, // 使用成员自己的社会等级
        isNative: isNativeMember,

        // 添加unitId字段
        unitId: unitId, // 确保unitId被正确设置
        // 🔧 关键修复：所有成员的familyName都应该是家族名，用于血缘关系查询
        // 外来成员嫁入/入赘后，familyName是夫家/妻家的家族名
        familyName: familyName,
        // 🔧 关键修复：originalFamily记录成员的原生家族
        // 本家成员：originalFamily = familyName
        // 外来成员：originalFamily = 他们的原生姓氏（用于生成姓名）
        originalFamily: memberData.originalFamily || (isNativeMember ? familyName : '未知'),
        birthOrder: memberData.birthOrder ?? null,
        birthIndex: memberData.birthIndex ?? null,

        familyRole: this._determineFamilyRole(memberData),
        relationships: this._extractBloodRelationships(memberId, structure)
      };

      characters.push(character);
    }

    return {
      characters: characters,
      familyStructure: structure,
      originalMembers: members,  // 保留原始引用
      totalMembers: characters.length
    };
  }

  /**
   * 确定家族角色（通用方法）
   * @param {Object} memberData - 成员数据，包含generation和gender
   * @returns {string} 家族角色
   */
  _determineFamilyRole(memberData) {
    if (!memberData) return 'unknown';
    
    const familyRolesConfig = PopulationRules.getFamilyRolesConfig();
    const roleMap = familyRolesConfig.generationRoles;
    
    return roleMap[memberData.generation]?.[memberData.gender] || 'family_member';
  }
  
  _extractBloodRelationships(memberId, structure) {
    const relationships = [];
    
    // 提取配偶关系
    const marriage = structure.marriages.find(m => 
      m.husband === memberId || m.wife === memberId
    );
    if (marriage) {
      const spouseId = marriage.husband === memberId ? marriage.wife : marriage.husband;
      relationships.push({ type: 'spouse', targetId: spouseId });
    }
    
    // 提取父子关系
    const asParent = structure.parentChild.filter(rel => 
      rel.father === memberId || rel.mother === memberId
    );
    asParent.forEach(rel => {
      relationships.push({ type: 'child', targetId: rel.child });
    });
    
    const asChild = structure.parentChild.find(rel => rel.child === memberId);
    if (asChild) {
      relationships.push({ type: 'father', targetId: asChild.father });
      relationships.push({ type: 'mother', targetId: asChild.mother });
    }
    
    // 提取兄弟关系
    const siblingGroup = structure.siblings.find(group => group.includes(memberId));
    if (siblingGroup) {
      siblingGroup.forEach(siblingId => {
        if (siblingId !== memberId) {
          relationships.push({ type: 'sibling', targetId: siblingId });
        }
      });
    }
    
    return relationships;
  }
   
 
  _determineGender(role) {
    if (role.includes('父') || role.includes('祖父')) return '男';
    if (role.includes('母') || role.includes('祖母')) return '女';
    return Math.random() < 0.5 ? '男' : '女';
  }

    

  // ==================== 角色创建相关 ====================

  /**
   * 生成角色ID
   * @param {string} unitId - 单元ID
   * @param {string} role - 角色
   * @returns {string} 角色ID
   */
  _generateCharacterId(unitId, role) {
    return `char_${unitId}_${role}_${this.characterIdCounter++}`;
  }

    
  // ==================== 家庭年龄生成方法 ====================

    
  async _generateFiveGenerationFamilyAges(socialClass,unitId,members) {
    // ✅ 先创建 idManager
    const idManager = new FamilyIdManager(unitId, this);
    

    const fertilityCfg = PopulationRules.getFertilityConfig();
    const coupleAgeDiff = fertilityCfg.couple_age_difference;
    
    // 1. 计算高祖父最小可能年龄（能支持五代的最小年龄）
    const minGreatGreatGrandfatherAge = fertilityCfg.min_breeding_age + (fertilityCfg.min_generation_gap * 4);
    
    // 2. 生成高祖父年龄
    const generation1Range = this.generationConfig?.['1']?.age_range;
    const gen1Min = generation1Range ? generation1Range[0] : minGreatGreatGrandfatherAge;
    const gen1Max = generation1Range ? generation1Range[1] : fertilityCfg.max_lifespan;
    const rawGreatGreatGrandfatherAge = Utils.Math.randomInt(
      Math.max(minGreatGreatGrandfatherAge, gen1Min),
      Math.max(gen1Min, Math.min(gen1Max, fertilityCfg.max_lifespan))
    );
    const greatGreatGrandfatherAge = this._clampAgeByGeneration(
      rawGreatGreatGrandfatherAge,
      1
    );
    
    // 3. 生成高祖母年龄
    const rawGreatGreatGrandmotherAge = Math.max(
      Math.min(
        fertilityCfg.max_lifespan,
        Utils.Math.randomInt(
          greatGreatGrandfatherAge + coupleAgeDiff.min,
          greatGreatGrandfatherAge + coupleAgeDiff.max
        )
      ),
      minGreatGreatGrandfatherAge
    );
    const greatGreatGrandmotherAge = this._clampAgeByGeneration(
      rawGreatGreatGrandmotherAge,
      1
    );
    
    // 4. 获取前两代家族结构（人数+关系）    
    const structure = await this._generateInitialFamilyStructure(
      idManager, 
      members, 
      greatGreatGrandfatherAge, 
      greatGreatGrandmotherAge,
      unitId,
      socialClass
    );   

    // 🔧 新增：从 structure 中提取 familyName
    const familyName = structure.familyName;

    // 5. 基于前两代关系数据生成三至五代家族结构
    const result = await this._generateAgesFromStructure(
      structure, 
      fertilityCfg, 
      socialClass, 
      unitId, 
      idManager, 
      members,
      familyName  // 🔧 传入 familyName
    );
    
    return {
      ...result,
      familyName: familyName
    };
        
  }

   
  async _generateInitialFamilyStructure(idManager, members, ancestorAge, ancestorSpouseAge, unitId, socialClass) {    
    console.log(`_generateInitialFamilyStructure开始，members.size: ${members.size}`);
    // 🔧 新增：生成 familyName
    const familyName = await this._generateFamilyName(socialClass);

    const result = {
      generations: {},
      marriages: [],
      parentChild: [],
      siblings: [],
      familyName: familyName  // 🔧 添加到返回对象
    };
    
    
    // 第1代固定2人（高祖父母）
    const husbandId = idManager.allocateId('patriarch_gen1');
    const wifeId = idManager.allocateId('matriarch_gen1');
    result.generations.第1代 = 2;

    // 🔧 为patriarch设置originalFamily
    members.set(husbandId, {
      characterId: husbandId,
      age: ancestorAge,
      gender: '男',
      generation: 1,
      vitalStatus: 'living',
      canBreed: true,
      currentFamily: unitId,
      socialClass: socialClass,
      originalFamily: familyName,  // 🔧 使用生成的familyName
      birthOrder: 0,
      birthIndex: 0
    });

    // 🔧 为matriarch生成外来姓氏
    const matriarchSurname = await this._generateSpouseFamilyName(socialClass, familyName);

    members.set(wifeId, { 
      characterId: wifeId, 
      age: ancestorSpouseAge, 
      gender: '女', 
      generation: 1,
      vitalStatus: 'living',
      canBreed: true,
      isNative: false,
      currentFamily: unitId,
      socialClass: socialClass,
      originalFamily: matriarchSurname,  // 🔧 使用异姓
      birthOrder: 0,
      birthIndex: 0
    });
    
    result.marriages.push({
      husband: husbandId,
      wife: wifeId,
      generation: 1
    });

    
    
    // ✅ 修改：只生成第2代，后续各代改为实时生成
    const firstGenMarriage = result.marriages[0];
    let totalChildren = 0;
    
    // 基于第1代夫妻生成第2代子女
    const config = PopulationRules.getGapPlanningConfig();
    const fertilityWeights = config.fertilityTypeWeights;
    const types = Object.keys(fertilityWeights);
    const weights = Object.values(fertilityWeights);
    const fertilityType = Utils.Math.weightedRandom(types, weights);
    const fertilityConfig = config.fertilityRates[fertilityType];
    let fertilityRate = Utils.Math.randomFloat(fertilityConfig.min, fertilityConfig.max);
    
    // 逃难模式调整
    const refugeeMode = PopulationRules.getRefugeeMode();
    if (refugeeMode.enabled && refugeeMode.affectedGenerations.includes(2)) {
      fertilityRate *= refugeeMode.fertilityRateModifier;
    }
  
    const childrenCount = Math.round(fertilityRate);
    //console.log(`🔍 第1代夫妻生育率=${fertilityRate.toFixed(2)}，第2代子女数=${childrenCount}`);
    totalChildren += childrenCount;
    
    if (childrenCount > 0) {
      const siblingGroup = [];
      for (let i = 0; i < childrenCount; i++) {
        const childId = idManager.allocateId(`child_gen2_${i}`);
        siblingGroup.push(childId);
        
        members.set(childId, {
          characterId: childId,
          generation: 2,
          gender: Math.random() < 0.5 ? '男' : '女',
          isNative: true,
          vitalStatus: 'living',
          canBreed: true,
          birthOrder: i + 1,
          birthIndex: i,
          currentFamily: unitId,
          socialClass: socialClass,
          originalFamily: null  // 🔧 新增：标记为本族成员，稍后在_processNewFormatData中设置为familyName
        });

        //console.log(`创建第2代成员: ${childId}`);
        
        result.parentChild.push({
          father: firstGenMarriage.husband,
          mother: firstGenMarriage.wife,
          child: childId
        });
      }
      
      if (siblingGroup.length > 1) {
        result.siblings.push(siblingGroup);
      }
      // ✅ 新增：为第2代成员分配年龄
      //console.log('🎯 为第2代成员分配年龄...');
      this._assignChildrenAges(result, members, 2);
    }
    
    result.generations.第2代 = totalChildren;
    //console.log(`第2代: ${totalChildren}人`);
    
    return result;
  }

  
  async _generateAgesFromStructure(structure, fertilityCfg, socialClass, unitId, idManager, members, familyName) {     
        
    // 🔧 新增：为本族成员设置 originalFamily
    for (const memberData of members.values()) {
      if (memberData.originalFamily === null || memberData.originalFamily === undefined) {
        memberData.originalFamily = familyName;
      }
    }

    // 逐代处理(_generateInitialFamilyStructure中已经完成第2代成员的年龄和ID处理)
    for (let gen = 2; gen <= 5; gen++) {      
                       
      // 只为存活的成员添加外来配偶
      await this._addSpousesForGeneration(structure, members, gen, fertilityCfg, socialClass, unitId, idManager);
     
      // ✅ 新增：基于本代实际婚姻立即生成下一代子女关系
      if (gen < 5) {
        this._generateNextGenerationChildren(structure, members, gen, idManager);
      }


      // 为下一代子女分配年龄并进行夭折筛选
      this._assignChildrenAges(structure, members, gen + 1 );      

      
      //console.log(`=== 第${gen}代处理完成 ===\n`);
    }

    this._enforceMonogamyAndSyncSpouses(structure, members);
    
    const totalLiving = Array.from(members.values()).filter(m => m.vitalStatus === 'living').length;
    //console.log(`📊 家族总存活人数: ${totalLiving}`);
  
    return {
      members: members,
      structure: structure
    };
  }

  
  async _addSpousesForGeneration(structure, members, generation, fertilityCfg, socialClass,unitId, idManager) {
    const manager = idManager ?? new FamilyIdManager(unitId, this);
    const minMarriageAge = this.fertilityConfig.min_breeding_age;
    const thisGenSingles = Array.from(members.values()).filter(member => {
      const isRightGeneration = member.generation === generation;
      const canBreed = member.canBreed !== false;
      const hasValidAge = member.age && member.age >= minMarriageAge;
      const alreadyMarried = member.hasSpouse || this._hasExistingMarriage(structure, member.characterId);
      const marriedAway = member.marriedAway === true;

      if (alreadyMarried) {
        member.hasSpouse = true;
      }

      return isRightGeneration && canBreed && hasValidAge && !alreadyMarried && !marriedAway;
    });

    const config = PopulationRules.getGapPlanningConfig();
    const marriageConfig = config.marriageRates[socialClass];
    const marriageRate = Utils.Math.randomFloat(marriageConfig.min, marriageConfig.max);
    const selectedToMarry = thisGenSingles.filter(member => Math.random() < marriageRate);

    for (const member of selectedToMarry) {
      const genderCode = this._getGenderCode(member);
      if (!genderCode) continue;

      if (member.hasSpouse || this._hasExistingMarriage(structure, member.characterId)) {
        member.hasSpouse = true;
        continue;
      }

      // 🔧 新增：检查structure.marriages中是否已存在此成员的婚姻记录
      const alreadyInMarriages = structure.marriages.some(m => 
        m.husband === member.characterId || m.wife === member.characterId
      );
      if (alreadyInMarriages) {
        member.hasSpouse = true;
        continue;
      }
      
      if (member.canBreed === false) {
        //console.log(`成员 ${member.characterId} 已被标记不能育，跳过婚配`);
        continue;
      }

      if (genderCode === 'male') {
        const husbandId = member.characterId;
        const wifeId = manager.allocateId(`spouse_wife_${generation}`);
        const excludeSurname = member.originalFamily || member.familyName;

        // 🔧 调试日志
        console.log(`🔍 为G${generation}男性生成配偶:`, {
          husband: member.characterId,
          excludeSurname: excludeSurname,
          memberOriginalFamily: member.originalFamily,
          memberFamilyName: member.familyName
        });

        const spouseSurname = await this._generateSpouseFamilyName(socialClass, excludeSurname);
        console.log(`  生成配偶姓氏: ${spouseSurname}`);

        const coupleAgeDiff = fertilityCfg.couple_age_difference;
        const ageDiff = Utils.Math.randomInt(coupleAgeDiff.min, coupleAgeDiff.max);
        const rawWifeAge = Math.random() < 0.6 ? member.age - ageDiff : member.age + ageDiff;
        const wifeAge = Math.max(minMarriageAge, Math.min(this.fertilityConfig.max_breeding_age.female, rawWifeAge));
        const normalizedWifeAge = this._clampAgeByGeneration(wifeAge, generation);

        members.set(wifeId, {
          characterId: wifeId,
          age: normalizedWifeAge,
          gender: '女',
          genderCode: 'female',
          generation,
          isNative: false,
          vitalStatus: 'living',
          canBreed: true,
          originalFamily: spouseSurname,
          familyName: member.familyName || spouseSurname,
          currentFamily: member.currentFamily || unitId,
          socialClass: this._determineSpouseSocialClass(socialClass)
        });

        this._recordMarriage(structure, members, husbandId, wifeId, generation);
        member.hasSpouse = true;
        continue;
      }

      if (genderCode === 'female') {
        const marriagePattern = this._determineRefugeeMarriagePattern(member);

        if (marriagePattern === 'matrilocal') {
          const husbandId = manager.allocateId(`spouse_husband_${generation}`);
          const excludeSurname = member.originalFamily || member.familyName;
          
          // 🔧 调试日志
          console.log(`🔍 为G${generation}女性生成入赘配偶:`, {
            wife: member.characterId,
            excludeSurname: excludeSurname,
            memberOriginalFamily: member.originalFamily,
            memberFamilyName: member.familyName
          });
          
          const spouseSurname = await this._generateSpouseFamilyName(socialClass, excludeSurname);
          console.log(`  生成配偶姓氏: ${spouseSurname}`);
          
          const coupleAgeDiff = fertilityCfg.couple_age_difference;
          const ageDiff = Utils.Math.randomInt(coupleAgeDiff.min, coupleAgeDiff.max);
          const rawHusbandAge = Math.random() < 0.4 ? member.age - ageDiff : member.age + ageDiff;
          const husbandAge = Math.max(minMarriageAge, Math.min(this.fertilityConfig.max_breeding_age.male, rawHusbandAge));
          const normalizedHusbandAge = this._clampAgeByGeneration(husbandAge, generation);

          members.set(husbandId, {
            characterId: husbandId,
            age: normalizedHusbandAge,
            gender: '男',
            genderCode: 'male',
            generation,
            isNative: false,
            vitalStatus: 'living',
            canBreed: true,
            originalFamily: spouseSurname,
            familyName: member.familyName || spouseSurname,
            currentFamily: member.currentFamily || unitId,
            socialClass: this._determineSpouseSocialClass(socialClass),
            marriageType: 'matrilocal',
            adoptedIntoFamily: member.currentFamily || unitId
          });

          this._recordMarriage(structure, members, husbandId, member.characterId, generation);
          member.hasSpouse = true;
        } else {
          member.hasSpouse = true;
          member.marriedAway = true;
          member.canBreed = false;
          member.vitalStatus = member.vitalStatus || 'living';
          member.marriedDate = Date.now();
          member.lostContactDate = Date.now();
          member.lastKnownLocation = 'unknown';
          member.needsSeparation = true;
        }
      }
    }
  }

  _generateNextGenerationChildren(structure, members, currentGen, idManager) {
    const nextGen = currentGen + 1;
    // ✅ 使用与_assignChildrenAges相同的查找逻辑
    const currentGenMarriages = structure.marriages.filter(m => m.generation === currentGen);
    
    
    let totalChildren = 0;
    const config = PopulationRules.getGapPlanningConfig();
    
    currentGenMarriages.forEach((marriage, index) => {
    
      // 复用原有的生育率计算逻辑
      const fertilityWeights = config.fertilityTypeWeights;
      const types = Object.keys(fertilityWeights);
      const weights = Object.values(fertilityWeights);
      const fertilityType = Utils.Math.weightedRandom(types, weights);
      const fertilityConfig = config.fertilityRates[fertilityType];
      let fertilityRate = Utils.Math.randomFloat(fertilityConfig.min, fertilityConfig.max);
      
      // 逃难模式生育率调整
      const refugeeMode = PopulationRules.getRefugeeMode();
      if (refugeeMode.enabled && refugeeMode.affectedGenerations.includes(nextGen)) {
        fertilityRate *= refugeeMode.fertilityRateModifier;
      }
      
      const childrenCount = Math.round(fertilityRate);
      //console.log(`🔍 第${currentGen}代第${index+1}对夫妻：生育率=${fertilityRate.toFixed(2)}，子女数=${childrenCount}`);
      totalChildren += childrenCount;
      
      if (childrenCount > 0) {
        //console.log(`📝 为父母 ${marriage.husband} × ${marriage.wife} 创建${childrenCount}个子女关系`);
        const siblingGroup = [];
        for (let i = 0; i < childrenCount; i++) {
          // ✅ 改为使用 idManager
          const childId = idManager.allocateId(`child_gen${nextGen}`);
          siblingGroup.push(childId);

          // 🔧 新增：立即创建成员对象
          const gender = Math.random() < 0.5 ? '男' : '女';
          const genderCode = gender === '男' ? 'male' : 'female';
          
          members.set(childId, {
            characterId: childId,
            age: 0,  // 年龄稍后在_assignChildrenAges中分配
            gender: gender,
            genderCode: genderCode,
            generation: nextGen,
            vitalStatus: 'living',
            canBreed: true,
            isNative: true,
            birthOrder: i + 1,
            birthIndex: i,
            currentFamily: members.get(marriage.husband)?.currentFamily,
            socialClass: members.get(marriage.husband)?.socialClass,
            originalFamily: null  // 标记为待设置，在_processNewFormatData中设置为familyName
          });
          
          structure.parentChild.push({
            father: marriage.husband,
            mother: marriage.wife,
            child: childId,
            birthOrder: i + 1,
            birthIndex: i
          });
          //console.log(`创建子女 ${childId}`);
        }
        
        if (siblingGroup.length > 1) {
          structure.siblings.push(siblingGroup);
        }
      }
    });
    
    //console.log(`✅ 第${nextGen}代: ${totalChildren}人`);
  }

  
  _assignChildrenAges(structure, members, generation) {
    //console.log(`_assignChildrenAges(gen=${generation})开始`);
    const prevGenMarriages = structure.marriages.filter(m => m.generation === generation - 1);
    // 直接检查要查找的母亲ID是否存在
    prevGenMarriages.forEach((marriage, index) => {
      //console.log(`婚姻${index+1}: 要查找的母亲ID: ${marriage.wife}`);
      //console.log(`该ID在members中是否存在: ${members.has(marriage.wife)}`);
      
      // if (!members.has(marriage.wife)) {
      //   console.log(`members中所有包含spouse_wife的ID:`);
      //   Array.from(members.keys()).filter(id => id.includes('spouse_wife')).forEach(id => {
      //     console.log(`  - ${id}`);
      //   });
      // }
    });

    prevGenMarriages.forEach(parentMarriage => {
      //console.log(`🔍 父母: ${parentMarriage.husband} × ${parentMarriage.wife}`);
      const children = structure.parentChild.filter(rel => 
        rel.father === parentMarriage.husband && rel.mother === parentMarriage.wife
      );
      
      //console.log(`🔍 找到${children.length}个子女:`, children.map(c => c.child));
      
      // if (children.length > 0) {
      //   console.log(`🔍 开始为${children.length}个子女分配年龄...`);
      // } else {
      //   console.log(`❌ 未找到子女，检查parentChild记录`);
      //   console.log(`📋 所有parentChild记录:`, structure.parentChild.slice(0, 5)); // 只显示前5条
      // }
      const father = members.get(parentMarriage.husband);
      const mother = members.get(parentMarriage.wife);

      //console.log(`🔍 查找父亲: ${parentMarriage.husband} -> ${father ? '找到' : '未找到'}`);
      //console.log(`🔍 查找母亲: ${parentMarriage.wife} -> ${mother ? '找到' : '未找到'}`);    
      
      if (father && mother) {
        // 检查父母年龄是否合理
        const minBreedingAge = this.fertilityConfig.min_breeding_age;
  
        if (father.age < minBreedingAge || mother.age < minBreedingAge) {
          console.warn(`父母年龄过小，跳过生育 - 父亲:${father.age}岁, 母亲:${mother.age}岁 (最低${minBreedingAge}岁)`);
          return;
        }

        //console.log(`🔍 准备第二次查找，当前parentChild记录数: ${structure.parentChild.length}`);
        //console.log(`🔍 查找条件 - father: ${parentMarriage.husband}, mother: ${parentMarriage.wife}`);
        

        const children = structure.parentChild.filter(rel => 
          rel.father === parentMarriage.husband && rel.mother === parentMarriage.wife
        );
        //console.log(`🔍 第二次查找结果: ${children.length}个子女`);        
        
        if (children.length > 0) {
          // 🔧 修复：检查母亲的生育窗口能否容纳这么多孩子
          const fertilityCfg = PopulationRules.getFertilityConfig();
          const earliestBirth = fertilityCfg.min_breeding_age;
          const latestBirth = Math.min(mother.age, fertilityCfg.max_breeding_age.female);
          const fertilitySpan = latestBirth - earliestBirth;
          const maxPossibleChildren = Math.max(1, Math.floor(fertilitySpan / 2)); // 至少2年一个孩子

          let actualChildrenCount = children.length;
          if (actualChildrenCount > maxPossibleChildren) {
            console.warn(`⚠️ 调整子女数量 - 母亲${mother.age}岁, 生育窗口${fertilitySpan}年, 原计划${actualChildrenCount}个孩子 → 调整为${maxPossibleChildren}个`);
            actualChildrenCount = maxPossibleChildren;
          }

          //console.log(`🔍 开始为${actualChildrenCount}个子女分配年龄...`);
          // 使用新的子女年龄计算方法
          const MIN_PARENT_CHILD_AGE_GAP = 13;
          const childrenAges = this._generateChildrenBasedOnFertility(
            mother.age,
            father.age,
            actualChildrenCount  // 使用调整后的数量
          );
          
          const sortedRelations = [...children]
            .slice(0, actualChildrenCount)
            .sort((a, b) => {
              const orderA = a.birthOrder ?? a.birthIndex ?? 0;
              const orderB = b.birthOrder ?? b.birthIndex ?? 0;
              return orderA - orderB;
            });

          let previousAge = null;

          sortedRelations.forEach((childRel, index) => {
            const existingData = members.get(childRel.child) || {};
            const childGender = existingData.gender || (Math.random() < 0.5 ? '男' : '女');
            const birthOrder = existingData.birthOrder ?? childRel.birthOrder ?? index + 1;
            const birthIndex = existingData.birthIndex ?? childRel.birthIndex ?? index;

            let targetAge = Math.max(1, childrenAges[Math.min(index, childrenAges.length - 1)]);
            targetAge = this._clampAgeByGeneration(targetAge, generation);

            const parentAgeLimits = [];
            if (Number.isFinite(father?.age)) {
              parentAgeLimits.push(father.age - MIN_PARENT_CHILD_AGE_GAP);
            }
            if (Number.isFinite(mother?.age)) {
              parentAgeLimits.push(mother.age - MIN_PARENT_CHILD_AGE_GAP);
            }

            if (parentAgeLimits.length > 0) {
              const maxAllowedAge = Math.min(...parentAgeLimits.filter(Number.isFinite));
              if (Number.isFinite(maxAllowedAge)) {
                targetAge = Math.min(targetAge, maxAllowedAge);
              }
            }

            targetAge = Math.max(1, targetAge);
            targetAge = this._clampAgeByGeneration(targetAge, generation);

            if (Number.isFinite(father?.age) && father.age - targetAge < MIN_PARENT_CHILD_AGE_GAP) {
              targetAge = Math.max(1, father.age - MIN_PARENT_CHILD_AGE_GAP);
            }
            if (Number.isFinite(mother?.age) && mother.age - targetAge < MIN_PARENT_CHILD_AGE_GAP) {
              targetAge = Math.max(1, mother.age - MIN_PARENT_CHILD_AGE_GAP);
            }

            targetAge = Math.max(1, this._clampAgeByGeneration(targetAge, generation));

            if (previousAge !== null && targetAge >= previousAge) {
              targetAge = Math.max(1, previousAge - 1);
              targetAge = this._clampAgeByGeneration(targetAge, generation);
            }

            previousAge = targetAge;

            const childRecord = {
              ...existingData,
              characterId: childRel.child,
              age: targetAge,
              gender: childGender,
              generation: generation,
              isNative: existingData.hasOwnProperty('isNative') ? existingData.isNative : true,
              currentFamily: existingData.currentFamily || mother?.currentFamily || father?.currentFamily || null,
              socialClass: existingData.socialClass || mother?.socialClass || father?.socialClass || null,
              vitalStatus: existingData.vitalStatus || 'living',
              canBreed: existingData.hasOwnProperty('canBreed') ? existingData.canBreed : true,
              birthOrder,
              birthIndex
            };

            members.set(childRel.child, childRecord);
          });
          // 调试：夭折前的原始年龄分布
          //console.log(`第${generation}代夭折前原始年龄:`);
          children.forEach(childRel => {
            const child = members.get(childRel.child);
            // if (child) {
            //   console.log(`- ID:${childRel.child}, 年龄:${child.age}, 性别:${child.gender}`);
            // }
          });
          //console.log(`🔍 _assignChildrenAges完成后members数量: ${members.size}`);
          // 🆕 新增：对本代子女进行未成年夭折筛选
          this._applyChildhoodMortality(children, members, generation);
          //console.log(`🔍 夭折处理后members数量: ${members.size}`);
          // console.log(`🔍 夭折处理后存活的第${generation}代成员:`, 
          //   Array.from(members.values()).filter(m => m.generation === generation && m.vitalStatus === 'living'));
        }
        // else {
        //   console.log(`❌ 第二次查找未找到子女，但第一次找到了，parentChild可能被修改`);
        // }
      }
      // else {
      //   console.log(`❌ 父母信息不完整，跳过处理`);
      // }
    });
    // console.log(`🔍 第${generation}代处理完成，当前members中第${generation}代成员数:`, 
    //   Array.from(members.values()).filter(m => m.generation === generation).length);
  }

  _clampAgeByGeneration(age, generation) {
    if (!Number.isFinite(age)) {
      return 1;
    }

    const generationConfig = this.generationConfig?.[generation];
    if (generationConfig?.age_range?.length === 2) {
      const [minAge, maxAge] = generationConfig.age_range;
      return Utils.Math.clamp(Math.round(age), minAge, maxAge);
    }

    return Math.max(1, Math.round(age));
  }


  _generateChildrenBasedOnFertility(motherAge, fatherAge, childrenCount) {
    const fertilityCfg = PopulationRules.getFertilityConfig();
    const children = [];

    // 母亲最早生育年龄
    const earliestBirth = fertilityCfg.min_breeding_age;
    const latestBirth = Math.min(motherAge, fertilityCfg.max_breeding_age.female);

    // 🚨 检测异常：父母年龄太小
    if (motherAge < earliestBirth) {
      console.error(`❌❌❌ 母亲年龄异常: ${motherAge}岁 < 最小生育年龄${earliestBirth}岁`);
      return [1]; // 返回1岁的孩子作为兜底
    }
    if (fatherAge < earliestBirth) {
      console.error(`❌❌❌ 父亲年龄异常: ${fatherAge}岁 < 最小生育年龄${earliestBirth}岁`);
    }

    // 生育年龄跨度
    const fertilitySpan = latestBirth - earliestBirth;
    const maxPossibleChildren = Math.max(1, fertilitySpan); // 最少1年1个孩子

    if (childrenCount > maxPossibleChildren) {
      console.warn(`子女数量超出母亲生育能力 - 母亲${motherAge}岁, 生育窗口${fertilitySpan}年, 要求${childrenCount}个孩子, 最多${maxPossibleChildren}个`);
      // 调整为最大可能数量
      childrenCount = maxPossibleChildren;
    }
   

    // 确定母亲首次生育年龄（使用配置的分布率）
    const firstBirthAge = this._getWeightedBirthAge(earliestBirth, latestBirth, 0, childrenCount, fertilityCfg);
    //console.log(`生育年龄计算 - 母亲:${motherAge}岁, 父亲:${fatherAge}岁, 子女数:${childrenCount}`);
    //console.log(`生育窗口: ${earliestBirth}-${latestBirth}岁, 首次生育:${firstBirthAge}岁`);
    
    let currentBirthAge = firstBirthAge;

    for (let i = 0; i < childrenCount; i++) {
      if (i === 0) {
        // 第一个孩子
        const childAge = motherAge - currentBirthAge;
        const finalChildAge = Math.max(childAge, 1);

        console.log(`🔍 第${i+1}个孩子:`, {
          母亲生育年龄: currentBirthAge,
          计算出的孩子年龄: childAge,
          最终孩子年龄: finalChildAge,
          是否异常: childAge < 1 || currentBirthAge < earliestBirth || currentBirthAge > latestBirth
        });

        children.push(finalChildAge);
      } else {
        // 计算剩余孩子数和剩余时间
        const remainingChildren = childrenCount - i;
        const remainingTime = latestBirth - currentBirthAge;

        //console.log(`🔍 准备计算第${i+1}个孩子, 当前生育年龄=${currentBirthAge}, 剩余时间=${remainingTime}`);

        // 下一个孩子的生育年龄
        const nextGap = this._getWeightedBirthGap(i, remainingTime, remainingChildren, fertilityCfg);
        currentBirthAge += nextGap;

        const childAge = motherAge - currentBirthAge;
        const finalChildAge = Math.max(childAge, 1);

        console.log(`🔍 第${i+1}个孩子:`, {
          生育间隔: nextGap,
          母亲生育年龄: currentBirthAge,
          计算出的孩子年龄: childAge,
          最终孩子年龄: finalChildAge,
          是否超出生育窗口: currentBirthAge > latestBirth,
          是否异常: childAge < 1 || currentBirthAge < earliestBirth
        });

        children.push(finalChildAge);
      }
    }
    
    return children.sort((a, b) => b - a); // 从大到小排序
  }

  _getWeightedBirthAge(earliestBirth, latestBirth, birthOrder, totalChildren, fertilityCfg) {
    const config = fertilityCfg.birth_age_distribution;
    const orderKey = birthOrder === 0 ? 'first_birth' : (birthOrder < 3 ? 'subsequent_birth' : 'late_birth');
    const { min_factor, max_factor } = config[orderKey];

    const ageRange = latestBirth - earliestBirth;
    const minAge = earliestBirth + Math.floor(ageRange * min_factor);
    const maxAge = earliestBirth + Math.floor(ageRange * max_factor);

    const birthAge = Utils.Math.randomInt(minAge, maxAge);

    // 🔍 详细调试：追踪生育年龄计算
    console.log(`🔍 _getWeightedBirthAge 计算:`, {
      输入: { earliestBirth, latestBirth, birthOrder, totalChildren },
      配置: { orderKey, min_factor, max_factor },
      计算: { ageRange, minAge, maxAge },
      结果: birthAge,
      是否异常: birthAge < earliestBirth || birthAge > latestBirth
    });

    return birthAge;
  }
  
  _getWeightedBirthGap(birthOrder, remainingTime, remainingChildren, fertilityCfg) {
    const config = fertilityCfg.birth_age_distribution;
    const orderKey = birthOrder < 3 ? 'subsequent_birth' : 'late_birth';
    const { min_factor, max_factor } = config[orderKey];

    const baseGap = remainingTime / remainingChildren;
    const minGap = Math.max(1, Math.floor(baseGap * min_factor));
    const maxGap = Math.max(1, Math.floor(baseGap * max_factor));

    const gap = Utils.Math.randomInt(minGap, maxGap);

    // 🔍 详细调试：追踪生育间隔计算
    console.log(`🔍 _getWeightedBirthGap 计算:`, {
      输入: { birthOrder, remainingTime, remainingChildren },
      配置: { orderKey, min_factor, max_factor },
      计算: { baseGap, minGap, maxGap },
      结果: gap,
      是否异常: gap < 0 || gap > remainingTime
    });

    return gap;
  }




  /**
   * 对家族成员进行亡故筛选
   * @param {Array} children - 子女关系数组
   * @param {Map} members - 成员数据Map
   * @param {number} generation - 当前世代
   */
  _applyChildhoodMortality(children, members, generation) {
    const mortalityConfig = PopulationRules.getMortalityConfig();
    const childhoodMortalityRate = mortalityConfig.childhood_mortality || 0.65;
    const marriageSystem = PopulationRules.getMarriageRules();
    
    // 🔧 添加缺少的变量定义
    const totalChildren = children.length;
    let survivedChildren = 0;
    let diedChildren = 0;
    
    //console.log(`💀 第${generation}代亡故筛选开始 - 总数: ${totalChildren}, 使用亡故率: ${childhoodMortalityRate}`);
    
    children.forEach(childRel => {
      const child = members.get(childRel.child);
      if (child && Math.random() < childhoodMortalityRate) {
        // 标记为夭折
        child.vitalStatus = 'died_young';
        child.canBreed = false; // 夭折者不能参与生育
        
        // 🆕 优化：基于配置的育龄标准判断未成年死亡
        const minBreedingAge = child.gender === '男' ? 
          marriageSystem.age_requirements.marriageable_age.male.min : 
          marriageSystem.age_requirements.marriageable_age.female.min;
        
        child.deathAge = Math.min(child.age, minBreedingAge - 1); // 未达到育龄即死亡
        
        diedChildren++; // 🔧 添加计数
        //console.log(`💀 第${generation}代成员 ${childRel.child} 亡故，年龄 ${child.age}，性别 ${child.gender}，育龄标准 ${minBreedingAge}`);
      } else if (child) {
        child.vitalStatus = 'living';
        child.canBreed = true; // 存活者可以参与生育
        survivedChildren++; // 🔧 添加计数
      }
    });
    
    //console.log(`第${generation}代夭折后剩余年龄:`);
    children.forEach(childRel => {
      const child = members.get(childRel.child);
      // if (child && child.vitalStatus === 'living') {
      //   console.log(`- ID:${childRel.child}, 年龄:${child.age}, 性别:${child.gender}, 状态:${child.vitalStatus}`);
      // }
    });
  }


   
  _applyMortalityAndResize(fullFamily, unitPlan) {   
    
    //首先过滤离散人员
    const separatedMembers = [];
    const activeMembers = [];
    
    fullFamily.characters.forEach(member => {
      if (member.needsSeparation) {
        // 直接在这里处理分离逻辑
        separatedMembers.push({
          ...member,
          separationReason: 'married_away',
          originalFamily: member.familyName,
          canReappearInFutureWaves: true,
          reappearanceProbability: 0.15
        });
      } else {
        activeMembers.push(member);
      }
    });
    
    const mortalityRate = unitPlan.patternConfig?.mortality_rate 
  || PopulationRules.getMortalityConfig().baseMortalityRate;
    const targetSize = unitPlan.targetSize;
    
    // 检查输入数据格式
    if (!fullFamily || !fullFamily.characters) {
      console.error('❌ fullFamily 格式错误:', fullFamily);
      return { livingMembers: [], deceasedMembers: [] };
    }

    // 1. 随机选择死者（考虑存活率约束）
    const livingMembers = [];
    const deceasedMembers = [];
    
    activeMembers.forEach(member => {
      if (Math.random() < mortalityRate || this._canDie(member)) {
        member.vitalStatus = 'deceased';
        member.deathAge = this._calculateDeathAge(member, fullFamily);
        deceasedMembers.push(member);
      } else {
        member.vitalStatus = 'living';
        livingMembers.push(member);
      }
    });

    // 按死亡优先级排序（老人和儿童优先）
    livingMembers.sort((a, b) => this._calculateMortalityPriority(b) - this._calculateMortalityPriority(a));
    
    // 2. 调整到目标规模、删除前N个高死亡率成员
    while (livingMembers.length > targetSize) {
      const member = livingMembers.shift();
      member.vitalStatus = 'deceased';
      deceasedMembers.push(member);
    }

    // 同步死亡状态到原始members Map
    const originalMembers = fullFamily.originalMembers;
    if (originalMembers) {
      deceasedMembers.forEach(deadMember => {
        // 通过characterId找到对应的member并同步死亡状态
        for (const [memberId, memberData] of originalMembers) {
          if (memberData.characterId === deadMember.characterId) {
            memberData.vitalStatus = 'deceased';
            memberData.deathAge = deadMember.deathAge || deadMember.age;
            break;
          }
        }
      });
    }

    // 修复2：清理死者的婚姻关系（在return之前添加）
    // 添加所有存活的配偶到livingMembers
    fullFamily.characters.forEach(member => {
      if (member.vitalStatus === 'living' && !livingMembers.find(lm => lm.characterId === member.characterId)) {
        livingMembers.push(member);
      }
    });

    const livingMemberIds = new Set(livingMembers.map(m => m.characterId));    
    const updatedMarriages = fullFamily.familyStructure.marriages.map(marriage => {
      const husbandAlive = livingMemberIds.has(marriage.husband);
      const wifeAlive = livingMemberIds.has(marriage.wife);
      
      //console.log(`婚姻检查: 夫${marriage.husband}(${husbandAlive}) - 妻${marriage.wife}(${wifeAlive})`);
      
      if (husbandAlive && wifeAlive) {
        return { ...marriage, status: 'active' }; // 明确标记为活跃
      } else {
        //console.log(`标记为丧偶: 夫${marriage.husband} - 妻${marriage.wife}`);
        return { ...marriage, status: 'widowed' }; // 标记为丧偶
      }
    }).filter(marriage => {
      const shouldKeep = marriage.status === 'active'; // 改为只保留活跃婚姻
      // if (!shouldKeep) {
      //   console.log(`清理丧偶婚姻: ${marriage.husband} - ${marriage.wife}`);
      // }
      return shouldKeep;
    });

    
    return {
      unitId: fullFamily.unitId || unitPlan.unitId,
      livingCharacters: livingMembers,        // 存活角色
      separatedMembers: separatedMembers,     // 离散角色
      allCharacters: fullFamily.characters,   // 完整家谱（包含死者和离散角色）
      deceasedMembers: deceasedMembers,
      originalMembers: originalMembers,  // 继续传递更新后的members
      familyHistory: fullFamily,
      familyStructure: {
        ...fullFamily.familyStructure,
        marriages: updatedMarriages // 使用更新后的婚姻关系
      },
      bloodRelations: fullFamily.bloodRelations,  // 添加完整血缘关系
      internalRelations: this._extractRelations(fullFamily.familyStructure)
    };
  }


  _calculateMortalityPriority(member) {
    const mortalityConfig = PopulationRules.getMortalityConfig();
    const generationRate = mortalityConfig.byGeneration[member.generation.toString()] || 0.5;
    
    // 直接返回世代死亡率作为优先级
    return generationRate;
  }
    
  
  _canDie(member) {
    const mortalityConfig = PopulationRules.getMortalityConfig();
    
    // 🔍 调试：检查世代字段和配置
    // console.log('🔍 成员世代信息:', member.generation, typeof member.generation);
    // console.log('🔍 加载的死亡率配置:', mortalityConfig.byGeneration);
    
    const generationRate = mortalityConfig.byGeneration[member.generation.toString()] || mortalityConfig.baseMortalityRate;
    
    // 🔍 调试：检查死亡率匹配
    //console.log(`🔍 世代${member.generation}的死亡率:`, generationRate);
    
    const canDieRoll = Math.random();
    const result = canDieRoll < generationRate;
    
    //console.log(`🔍 世代死亡检查 - 随机数: ${canDieRoll.toFixed(3)}, 死亡率: ${generationRate}, 结果: ${result}`);
    
    return result;
  }
  
  _calculateDeathAge(member, familyData) {
    const fertilityCfg = PopulationRules.getFertilityConfig();
    
    // 从新的数据结构中查找后代
    const descendants = this._getUnitCharacters(familyData).filter(character => {
      // 通过父子关系查找后代
      return familyData.familyStructure.parentChild.some(relation => 
        (relation.father === member.id || relation.mother === member.id) && 
        relation.child === character.id
      );
    });
    
    if (descendants.length === 0) {
      return Utils.Math.randomInt(1, member.age);
    }
    
    const oldestDescendant = Math.max(...descendants.map(d => d.age));
    const minDeathAge = oldestDescendant + fertilityCfg.min_generation_gap;
    
    return Utils.Math.randomInt(minDeathAge, member.age);
  }
  

  _determineRefugeeMarriagePattern(wife, husband) {
    // 添加参数处理
    if (arguments.length === 1) {
      husband = null;
    }
    
    // Refugee模式使用简化的入赘判断
    if (this._checkRefugeeMatrilocalConditions(wife, husband)) {
      return 'matrilocal';
    }
    return 'patrilocal';
  }
  
  _checkRefugeeMatrilocalConditions(wife, husband) {
    // 添加参数验证
    if (!wife) {
      console.warn('婚配条件检查：妻子对象为空');
      return false;
    }
    if (!husband) {
      console.warn('婚配条件检查：丈夫对象为空，返回默认值');
      return Math.random() < 0.25; // 25%概率入赘
    }
    
    if (!wife.socialClass || !husband.socialClass) {
      console.warn('婚配条件检查：社会阶层数据缺失', {
        wifeName: wife.name,
        wifeClass: wife.socialClass,
        husbandName: husband.name, 
        husbandClass: husband.socialClass
      });
      return false;
    }
    const scenarios = this.affiliationRules.marriage_mobility_rules.special_marriage_patterns.matrilocal_marriage.scenarios;
    const scenario = scenarios.noble_family_heir_shortage;
    
    // 简化的社会等级匹配
    const wifeClassMatch = scenario.conditions.wife_social_class.includes(wife.socialClass);
    const husbandClassMatch = scenario.conditions.husband_social_class.includes(husband.socialClass);
    
    // Refugee模式特殊判断：基于概率而非详细调查
    const refugeeHeirShortage = Math.random() < 0.25; // 25%概率缺少继承人
    const refugeeBloodlineCrisis = Math.random() < 0.3; // 30%概率血脉危机
    
    const baseCondition = wifeClassMatch && husbandClassMatch && refugeeHeirShortage && refugeeBloodlineCrisis;
    
    // 使用配置的概率
    return baseCondition && Math.random() < scenario.probability;
  }
  
  async _generateSpouseFamilyName(currentSocialClass, excludeSurname) {
    try {
      const nameData = await this.gameEngine.dataManager.dataTableManager.getCharacterNamesConfig();
     // 过滤出对应社会等级的姓氏，排除本家族姓氏
      const classRecords = nameData.filter(row => 
        row.social_class === currentSocialClass && 
        row.surname !== excludeSurname
      );
      
      if (classRecords.length > 0) {
        const randomRecord = classRecords[Math.floor(Math.random() * classRecords.length)];
        return randomRecord.surname;
      }
      
      // 降级方案：从其他等级选择
      const fallbackRecords = nameData.filter(row => 
        row.surname !== excludeSurname
      );
      
      if (fallbackRecords.length > 0) {
        const randomRecord = fallbackRecords[Math.floor(Math.random() * fallbackRecords.length)];
        return randomRecord.surname;
      }
      
      throw new Error('无法找到合适的配偶姓氏');
    } catch (error) {
      console.error('配偶姓氏生成失败:', error);
      throw error;
    }
  }
  
  /**
   * 确定配偶社会等级 (更新版本)
   */
  _determineSpouseSocialClass(currentFamilySocialClass) {
    const compatibility = this.socialClassRules.compatibility_matrix;
    const currentClassConfig = compatibility[currentFamilySocialClass];
    
    if (!currentClassConfig) {
      return currentFamilySocialClass; // 默认同等级
    }
    
    // 根据偏好匹配选择配偶等级
    const preferredMatches = currentClassConfig.preferred_matches || [currentFamilySocialClass];
    const avoidedMatches = currentClassConfig.avoided_matches || [];
    
    // 过滤掉被避免的等级
    const validMatches = preferredMatches.filter(match => !avoidedMatches.includes(match));
    
    if (validMatches.length === 0) {
      return currentFamilySocialClass;
    }
    
    // 使用配置中的匹配概率
    const probabilities = this.socialClassRules.matching_probabilities;
    if (validMatches.includes(currentFamilySocialClass) && Math.random() < probabilities.same_class) {
      return currentFamilySocialClass;
    }
    
    // 随机选择其他兼容等级
    return Utils.Array.randomChoice(validMatches);
  }

 

  _planGenerationMarriages(socialClass, structure) {
    //console.log('定居模式：规划各代婚配率');
    const config = PopulationRules.getGapPlanningConfig();
    
    // 为2-4代规划婚配（第5代太年轻）
    for (let gen = 2; gen <= 4; gen++) {
      const thisGenMembers = structure.parentChild
        .filter(rel => structure.marriages.some(m => 
          m.generation === gen - 1 && 
          (m.husband === rel.father || m.wife === rel.father)
        ))
        .map(rel => rel.child);
      
      if (thisGenMembers.length >= 2) {
        const marriageConfig = config.marriageRates[socialClass];
        const marriageRate = Utils.Math.randomFloat(marriageConfig.min, marriageConfig.max);
        
        // 改为个体概率判断
        const marriedMembers = thisGenMembers.filter(memberId => Math.random() < marriageRate);
        
        //console.log(`第${gen}代定居婚配：${marriedMembers.length}/${thisGenMembers.length}人结婚`);
        
        // 这里可以添加具体的婚配规划逻辑
        // 或标记哪些成员需要在后续跨族联姻中处理
      }
    }
  }

  
  

  // ==================== 关系建立相关 ====================
  _extractRelations(familyStructure) {
    const relations = [];
    const relationKeys = new Set(); // 🔧 添加去重Set

    if (!familyStructure) {
      return relations;
    }

    // 辅助函数：生成关系唯一键
    const getRelationKey = (type, participants) => {
      const sortedIds = [...participants].sort();
      return `${type}_${sortedIds.join('_')}`;
    };

    // 辅助函数：添加关系（带去重）
    const addRelation = (relation) => {
      const key = getRelationKey(relation.type, relation.participants);
      if (!relationKeys.has(key)) {
        relationKeys.add(key);
        relations.push(relation);
      }
    };

    // 提取婚配关系
    if (familyStructure.marriages) {
      familyStructure.marriages.forEach(marriage => {
        addRelation({
          type: 'marriage',
          participants: [marriage.husband, marriage.wife],
          data: marriage
        });
      });
    }

    // 🔧 修复：提取亲子关系 - 保持为单条parent_child关系，不再拆分
    if (familyStructure.parentChild) {
      familyStructure.parentChild.forEach(relation => {
        // 保持完整的父母-子女三元关系，不拆分
        const key = `parent_child_${relation.father}_${relation.mother}_${relation.child}`;
        if (!relationKeys.has(key)) {
          relationKeys.add(key);
          relations.push({
            type: 'parent_child',
            participants: [relation.father, relation.mother, relation.child],
            data: {
              father: relation.father,
              mother: relation.mother,
              child: relation.child
            }
          });
        }
      });
    }

    // 提取兄弟关系
    if (familyStructure.siblings) {
      familyStructure.siblings.forEach(siblingGroup => {
        addRelation({
          type: 'siblings',
          participants: siblingGroup,
          data: { siblings: siblingGroup }
        });
      });
    }

    //console.log(`✅ 提取关系完成: ${relations.length}条（已去重）`);
    return relations;
  }


   
  /**
   * 创建关系记录
   * @param {Object} character1 - 角色1
   * @param {Object} character2 - 角色2
   * @param {string} relation1to2 - 角色1对角色2的关系
   * @param {string} relation2to1 - 角色2对角色1的关系
   * @returns {Object} 关系记录
   */
  _createRelation(character1, character2, relation1to2, relation2to1) {
    return {
      relationId: `rel_${character1.characterId}_${character2.characterId}_${Date.now()}`,
      character1Id: character1.characterId,
      character2Id: character2.characterId,
      relation1to2: relation1to2,
      relation2to1: relation2to1,
      relationType: 'blood_relation',
      intimacy: this._calculateInitialIntimacy(relation1to2),
      createdAt: Date.now()
    };
  }

  /**
   * 计算初始亲密度
   * @param {string} relation - 关系类型
   * @returns {number} 亲密度分数
   */
  _calculateInitialIntimacy(relation) {
    const intimacyMap = {
      'spouse': 85,
      'father': 75,
      'mother': 80,
      'child': 75,
      'sibling': 70,
      'grandfather': 60,
      'grandmother': 65,
      'grandchild': 60,
      'friend': 40
    };
    
    return intimacyMap[relation] || 30;
  }

  // ==================== 跨单元关系建立 ====================

  _registerFamilyToSettlement(family) {
    // 注册家族到定居点
    this.globalFamilyRegistry.set(family.unitId, family);
    this.settlementNetwork.families.push(family.unitId);

    // 使用allCharacters而不是characters，以包含完整家谱
    const characters = family.allCharacters || family.characters || [];
    
       // 记录潜在联姻候选人
    characters.forEach(member => {
      // 只考虑存活的成员作为联姻候选人
      if (member.vitalStatus === 'living' && 
          this._isMarriageCandidate(member, family.familyHistory?.familyStructure)) {
        this.settlementNetwork.marriagePool.set(member.id, {
          familyId: family.unitId,
          member: member,
          available: !member.spouse
        });
      }
    });
  }

  _isMarriageCandidate(member, familyStructure) {
    const marriageConfig = PopulationRules.getMarriageRules();
    
    //console.log(`婚配候选检查 - ID:${member.id}, 年龄:${member.age}, 性别:${member.gender}, 存活状态:${member.vitalStatus}`);
    
    // 检查生存状态
    if (member.vitalStatus === 'deceased') {
      //console.log(`成员${member.id}已死亡，不可婚配`);
      return false;
    }
    
    // 如果vitalStatus未定义，假设为活着（这是个bug，需要修复）
    if (member.vitalStatus === undefined) {
      console.log(`成员${member.id}的vitalStatus未定义，假设为活着`);
    }
    
    // 检查适婚年龄
    const ageRange = marriageConfig.age_requirements.marriageable_age[member.gender === '男' ? 'male' : 'female'];
    if (member.age < ageRange.min || member.age > ageRange.max) {
      console.log(`成员${member.id}年龄${member.age}不在适婚范围${ageRange.min}-${ageRange.max}`);
      return false;
    }
    
    // 检查是否已有配偶
    const hasSpouse = this._hasSpouse(member.id, familyStructure);
    //console.log(`成员${member.id}是否有配偶: ${hasSpouse}`);
    
    if (hasSpouse) {
      console.log(`成员${member.id}已有配偶，不可再婚`);
      return false;
    }
    
    //console.log(`成员${member.id}符合婚配条件`);
    return true;
  }
  
  _hasSpouse(memberId, familyStructure) {
    // 添加参数检查
    if (!familyStructure || !familyStructure.marriages) {
      console.warn('familyStructure 或 marriages 未定义');
      return false;
    }
    // 在婚配关系中查找是否已有配偶
    return familyStructure.marriages.some(marriage => 
      marriage.husband === memberId || marriage.wife === memberId
    );
  }
 

  // 未来扩展接口
  createCrossFamilyMarriage(family1Id, family2Id) {
    // 预留：跨家族联姻创建接口
  }

  getSettlementNetwork() {
    return this.settlementNetwork;
  }

  /**
   * 建立跨单元姻亲关系
   * @param {Array} detailedFamilyUnits - 详细家族单元列表
   * @returns {Array} 跨单元关系列表
   */
  _establishCrossUnitRelations(detailedFamilyUnits) {
    const crossUnitRelations = [];
    
    //console.log('💑 开始建立跨单元姻亲关系...');

    // 检查是否有外来配偶生成逻辑
    detailedFamilyUnits.forEach((unit, index) => {
      console.log(`🔍 家族单元${index}原始成员数:`, this._getUnitCharacters(unit)?.length);
    });

    // 收集所有可能的结婚对象
    const marriageableMales = this._collectMarriageableMales(detailedFamilyUnits);
    const marriageableFemales = this._collectMarriageableFemales(detailedFamilyUnits);

    //console.log(`找到 ${marriageableMales.length} 个适婚男性, ${marriageableFemales.length} 个适婚女性`);

    // 基于社会等级和年龄匹配
    const marriages = this._planCrossUnitMarriages(marriageableMales, marriageableFemales);

    //console.log(`规划了 ${marriages.length} 桩跨单元婚姻`);

    // 为每桩婚姻创建关系记录
    marriages.forEach((marriage, index) => {
      const relation = this._createCrossUnitMarriage(marriage, index);
      crossUnitRelations.push(relation);
      
      // 更新角色的婚姻状态
      this._updateMarriageStatus(marriage.male, marriage.female, relation);
      // 检查处理后的结果
      detailedFamilyUnits.forEach((unit, index) => {
        console.log(`🔍 家族单元${index}处理后成员数:`, this._getUnitCharacters(unit)?.length);
      });
    });

    return crossUnitRelations;
  }

  /**
   * 收集适婚男性
   * @param {Array} familyUnits - 家族单元列表
   * @returns {Array} 适婚男性列表
   */
  _collectMarriageableMales(familyUnits) {
    //console.log('收集可婚配男性，检查unitId传递');
    
    const males = [];
    
    familyUnits.forEach((unit, index) => { // 改为index
      console.log(`家族单元${index}: unitId=${unit.unitId}, 成员数=${this._getUnitCharacters(unit)?.length}`);
      
      if (this._getUnitCharacters(unit) && unit.familyStructure) {
        this._getUnitCharacters(unit).forEach(character => {
          //console.log(`检查成员${character.id}: gender=${character.gender}, unitId=${character.unitId}, 来源单元=${unit.unitId}`);
          
          if (character.gender === '男' && this._isMarriageCandidate(character, unit.familyStructure)) {
            // 确保角色包含unitId信息
            const maleWithUnit = {
              ...character,
              unitId: character.unitId || unit.unitId  // 如果角色没有unitId，使用单元的unitId
            };
            
            //console.log(`添加可婚配男性: ID=${maleWithUnit.id}, unitId=${maleWithUnit.unitId}`);
            males.push(maleWithUnit);
          }
        });
      }
    });
    
    //console.log(`最终可婚配男性unitId情况:`, males.map(m => ({id: m.id, unitId: m.unitId})));
    return males;
  }

  /**
   * 收集适婚女性
   * @param {Array} familyUnits - 家族单元列表
   * @returns {Array} 适婚女性列表
   */
  _collectMarriageableFemales(familyUnits) {
    //console.log('收集可婚配女性');
    
    const females = [];
    
    familyUnits.forEach(unit => {
      console.log('检查家族单元:', {
        unitId: unit.unitId,
        charactersCount: this._getUnitCharacters(unit)?.length,
        hasFamilyStructure: !!unit.familyStructure
      });
      
      if (this._getUnitCharacters(unit) && unit.familyStructure) {
        this._getUnitCharacters(unit).forEach(character => {
          // 修正：传入正确的参数
          if (character.gender === '女' && this._isMarriageCandidate(character, unit.familyStructure)) {
            females.push(character);
          }
        });
      }
    });
    
    //console.log('可婚配女性数量:', females.length);
    return females;
  }

  /**
   * 规划跨单元婚姻
   * @param {Array} males - 适婚男性列表
   * @param {Array} females - 适婚女性列表
   * @returns {Array} 婚姻配对列表
   */
  _planCrossUnitMarriages(males, females) {
    console.log('跨单元婚姻规划开始:', {
      malesCount: males.length,
      femalesCount: females.length,
      males: males.map(m => ({id: m.id, age: m.age, socialClass: m.socialClass})),
      females: females.map(f => ({id: f.id, age: f.age, socialClass: f.socialClass}))
    });
    
    const marriages = [];
    const usedMales = new Set();
    const usedFemales = new Set();

    // 按社会等级分组
    const malesByClass = this._groupByClass(males);
    const femalesByClass = this._groupByClass(females);
    
    // 在这里添加分组调试
    console.log('分组结果详细:', {
      malesByClass: malesByClass,
      femalesByClass: femalesByClass
    });

    console.log('各等级人数统计:', {
      males: Object.keys(malesByClass).map(cls => `${cls}: ${malesByClass[cls]?.length || 0}人`),
      females: Object.keys(femalesByClass).map(cls => `${cls}: ${femalesByClass[cls]?.length || 0}人`)
    });

    // 优先门当户对的婚姻
    Object.keys(malesByClass).forEach(socialClass => {
      const classMales = malesByClass[socialClass] || [];
      const classFemales = femalesByClass[socialClass] || [];
      //console.log(`处理${socialClass}等级内婚配: ${classMales.length}男 vs ${classFemales.length}女`);

      this._matchWithinClass(classMales, classFemales, marriages, usedMales, usedFemales);
      //console.log(`${socialClass}等级内婚配结果: ${marriages.length}桩婚姻`);
    });

    //console.log('等级内婚配完成，开始跨等级婚配');
    // 然后考虑跨等级婚姻（有限制）
    this._matchCrossClass(malesByClass, femalesByClass, marriages, usedMales, usedFemales);

    console.log(`跨等级婚配完成，总计: ${marriages.length}桩婚姻`);

    return marriages;
  }

  /**
   * 按社会等级分组
   * @param {Array} characters - 角色列表
   * @returns {Object} 按等级分组的角色
   */
  _groupByClass(characters) {
    const grouped = {};
    
    characters.forEach(character => {
      const socialClass = character.socialClass;
      if (!grouped[socialClass]) {
        grouped[socialClass] = [];
      }
      grouped[socialClass].push(character);
    });

    return grouped;
  }

  /**
   * 同等级内婚配
   * @param {Array} males - 男性列表
   * @param {Array} females - 女性列表
   * @param {Array} marriages - 婚姻列表
   * @param {Set} usedMales - 已使用男性
   * @param {Set} usedFemales - 已使用女性
   */
  _matchWithinClass(males, females, marriages, usedMales, usedFemales) {
    males.forEach(male => {
      if (usedMales.has(male.id)) return; // 改为male.id
  
      const suitableFemales = females.filter(female => 
        !usedFemales.has(female.id) && // 改为female.id
        this._isCompatibleMatch(male, female)
      );
  
      if (suitableFemales.length > 0) {
        const bestMatch = this._selectBestMatch(male, suitableFemales);
        
        marriages.push({
          male: male,
          female: bestMatch,
          matchType: 'same_class',
          compatibility: this._calculateCompatibility(male, bestMatch)
        });
  
        usedMales.add(male.id); // 改为male.id
        usedFemales.add(bestMatch.id); // 改为bestMatch.id
      }
    });
  }

  /**
   * 跨等级婚配
   * @param {Object} malesByClass - 按等级分组的男性
   * @param {Object} femalesByClass - 按等级分组的女性
   * @param {Array} marriages - 婚姻列表
   * @param {Set} usedMales - 已使用男性
   * @param {Set} usedFemales - 已使用女性
   */
  _matchCrossClass(malesByClass, femalesByClass, marriages, usedMales, usedFemales) {
    const classHierarchy = ['门阀士族', '寒门', '庶族', '胡族', '平民'];
    
    // 原有的向下婚配逻辑...
    classHierarchy.forEach((maleClass, index) => {
      const males = (malesByClass[maleClass] || []).filter(m => !usedMales.has(m.id));
      
      // 男性可以娶低一级的女性
      if (index < classHierarchy.length - 1) {
        const lowerClass = classHierarchy[index + 1];
        const females = (femalesByClass[lowerClass] || []).filter(f => !usedFemales.has(f.id));
        
        if (males.length > 0 && females.length > 0) {
          this._matchBetweenClasses(males, females, marriages, usedMales, usedFemales, 'downward');
        }
      }
      
      // 添加：男性也可以娶高一级的女性（但限制更严格）
      if (index > 0) {
        const higherClass = classHierarchy[index - 1];
        const females = (femalesByClass[higherClass] || []).filter(f => !usedFemales.has(f.id));
        
        //console.log(`${maleClass}男性可以娶${higherClass}女性: ${females.length}人可用`);
        
        if (males.length > 0 && females.length > 0) {
          //console.log(`尝试${maleClass} -> ${higherClass}的向上跨等级婚配`);
          this._matchBetweenClasses(males, females, marriages, usedMales, usedFemales, 'upward');
        }
      }
    });
  }

  /**
   * 不同等级间婚配
   * @param {Array} males - 男性列表
   * @param {Array} females - 女性列表
   * @param {Array} marriages - 婚姻列表
   * @param {Set} usedMales - 已使用男性
   * @param {Set} usedFemales - 已使用女性
   * @param {string} direction - 婚配方向
   */
  _matchBetweenClasses(males, females, marriages, usedMales, usedFemales, direction) {
    console.log(`_matchBetweenClasses开始: ${males.length}男 vs ${females.length}女, 方向:${direction}`);
    
    const maxCrossClassMarriages = Math.min(males.length, females.length, 2);
    let matchCount = 0;
    
    //console.log(`最大跨等级婚姻数: ${maxCrossClassMarriages}`);
  
    males.forEach((male, index) => {
      console.log(`处理男性${index}: ID:${male.id}, 年龄:${male.age}, 等级:${male.socialClass}`);
      
      if (matchCount >= maxCrossClassMarriages) {
        console.log('已达到最大跨等级婚姻数');
        return;
      }
      
      if (usedMales.has(male.id)) {
        console.log(`男性${male.id}已被使用`);
        return;
      }
  
      const suitableFemales = females.filter(female => {
        const notUsed = !usedFemales.has(female.id);
        const compatible = this._isCompatibleCrossClassMatch(male, female);
        
        //console.log(`女性${female.id}(年龄:${female.age}, 等级:${female.socialClass}) - 未使用:${notUsed}, 兼容:${compatible}`);
        
        return notUsed && compatible;
      });
  
      //console.log(`男性${male.id}找到合适女性: ${suitableFemales.length}人`);
  
      if (suitableFemales.length > 0) {
        const bestMatch = this._selectBestMatch(male, suitableFemales);
        
        marriages.push({
          male: male,
          female: bestMatch,
          matchType: 'cross_class',
          compatibility: this._calculateCompatibility(male, bestMatch)
        });
  
        usedMales.add(male.id);
        usedFemales.add(bestMatch.id);
        matchCount++;
        
        //console.log(`成功配对: 男${male.id} - 女${bestMatch.id}`);
      }
    });
    
    //console.log(`_matchBetweenClasses完成，新增婚姻: ${matchCount}桩`);
  }

  /**
   * 判断是否为兼容匹配
   * @param {Object} male - 男性角色
   * @param {Object} female - 女性角色
   * @returns {boolean} 是否兼容
   */
  _isCompatibleMatch(male, female) {
    // 不能同一单元内结婚
    if (male.unitId === female.unitId) return false;
    
    // 年龄差检查 - 使用配置中的年龄限制
    const ageConfig = this.marriageSystem.age_requirements.age_matching;
    const maxAgeDiff = ageConfig.preferred_difference || 15;
    
    const ageDiff = Math.abs(male.age - female.age);
    if (ageDiff > maxAgeDiff) return false;
    
    // 男性通常比女性大 - 使用配置中的最优范围
    const optimalRange = ageConfig.optimal_range;
    if (male.age < female.age - (optimalRange?.max || 3)) return false;
    
    return true;
  }

  /**
   * 判断是否为兼容的跨等级匹配
   * @param {Object} male - 男性角色
   * @param {Object} female - 女性角色
   * @returns {boolean} 是否兼容
   */
  _isCompatibleCrossClassMatch(male, female) {
    if (!this._isCompatibleMatch(male, female)) return false;
    
    // 跨等级婚姻需要更严格的年龄要求
    const ageConfig = this.marriageSystem.age_requirements.age_matching;
    const strictAgeDiff = ageConfig.preferred_difference || 10;
    
    const ageDiff = Math.abs(male.age - female.age);
    if (ageDiff > strictAgeDiff) return false;
    
    return true;
  }

  /**
   * 选择最佳匹配
   * @param {Object} male - 男性角色
   * @param {Array} females - 候选女性列表
   * @returns {Object} 最佳匹配女性
   */
  _selectBestMatch(male, females) {
    // 计算每个女性的匹配度
    const scored = females.map(female => ({
      female: female,
      score: this._calculateCompatibility(male, female)
    }));

    // 按匹配度排序，选择最高的
    scored.sort((a, b) => b.score - a.score);
    
    return scored[0].female;
  }

  /**
   * 计算兼容性分数
   * @param {Object} male - 男性角色
   * @param {Object} female - 女性角色
   * @returns {number} 兼容性分数
   */
  _calculateCompatibility(male, female) {
    let score = 50;

    // 年龄匹配度
    const ageDiff = Math.abs(male.age - female.age);
    if (ageDiff <= 3) score += 20;
    else if (ageDiff <= 6) score += 10;
    else if (ageDiff <= 10) score += 5;

    // 社会等级匹配度
    if (male.socialClass === female.socialClass) {
      score += 25;
    }

    // 家族单元类型兼容性
    if (male.unitType === 'single_adult' && female.unitType === 'single_adult') {
      score += 15;
    }

    return Math.min(score, 100);
  }

  /**
   * 创建跨单元婚姻关系
   * @param {Object} marriage - 婚姻配对
   * @param {number} index - 婚姻序号
   * @returns {Object} 婚姻关系记录
   */
  _createCrossUnitMarriage(marriage, index) {
    const marriageRecord = {
      relationId: `cross_marriage_${index}_${Date.now()}`,
      relationType: 'cross_unit_marriage',
      husbandId: marriage.male.characterId,
      wifeId: marriage.female.characterId,
      husbandUnit: marriage.male.unitId,
      wifeUnit: marriage.female.unitId,
      matchType: marriage.matchType,
      compatibility: marriage.compatibility,
      marriageDate: Date.now(),
      createdBy: 'FamilyNetworkService'
    };
  
    // 🆕 新增：处理婚姻后的家族归属变更
    try {
      const affiliationChanges = this.processMarriageAffiliation(
        marriage.male, 
        marriage.female, 
        marriage.matchType
      );
      
      // 将归属变更信息添加到婚姻记录
      marriageRecord.affiliationChanges = affiliationChanges;
      
      // 更新角色的家族归属信息
      this._updateCharacterAffiliation(marriage.male, affiliationChanges.husbandChanges);
      this._updateCharacterAffiliation(marriage.female, affiliationChanges.wifeChanges);
      
      //console.log(`✅ 婚姻归属处理完成: ${marriage.male.name} × ${marriage.female.name}`);
      
    } catch (error) {
      console.error('❌ 婚姻归属处理失败:', error);
      // 即使归属处理失败，也保留基本的婚姻记录
    }
    return marriageRecord;
  }

  /**
   * 更新角色的家族归属信息
   */
  _updateCharacterAffiliation(character, affiliationChange) {
    if (affiliationChange.affiliation === 'no_change') {
      return;
    }
    
    // 更新角色的家族信息
    if (affiliationChange.newFamily) {
      character.currentFamily = affiliationChange.newFamily;
    }
    
    if (affiliationChange.surnameChange && affiliationChange.newSurname) {
      character.familyName = affiliationChange.newSurname;
    }
    
    // 记录归属变更历史
    if (!character.affiliationHistory) {
      character.affiliationHistory = [];
    }
    
    character.affiliationHistory.push({
      event: 'marriage_affiliation_change',
      oldFamily: affiliationChange.originalFamily,
      newFamily: affiliationChange.newFamily,
      changeType: affiliationChange.affiliation,
      timestamp: Date.now()
    });
    
    console.log(`📝 更新角色归属: ${character.name} → ${affiliationChange.newFamily}`);
  }

  /**
   * 更新婚姻状态 (更新版本 - 集成归属流动系统)
   * @param {Object} male - 男性角色
   * @param {Object} female - 女性角色
   * @param {Object} relation - 关系记录
   */
  _updateMarriageStatus(male, female, relation) {
    if (!male || !female) return;

    if (male.spouseId && male.spouseId !== female.characterId) {
      console.warn('跨单元婚姻尝试为已有配偶的男性再次配对，已跳过', {
        maleId: male.characterId || male.id,
        existingSpouse: male.spouseId,
        newSpouse: female.characterId
      });
      return;
    }

    if (female.spouseId && female.spouseId !== male.characterId) {
      console.warn('跨单元婚姻尝试为已有配偶的女性再次配对，已跳过', {
        femaleId: female.characterId || female.id,
        existingSpouse: female.spouseId,
        newSpouse: male.characterId
      });
      return;
    }

    // 基本婚姻状态更新
    male.marriageStatus = 'married';
    male.spouseId = female.characterId;
    male.marriageDate = relation.marriageDate;
    male.hasSpouse = true;

    female.marriageStatus = 'married';
    female.spouseId = male.characterId;
    female.marriageDate = relation.marriageDate;
    female.hasSpouse = true;

    // 🎕 新增：处理婚姻后的家族归属变更
    try {
      const affiliationChanges = this.processMarriageAffiliation(
        male,
        female,
        relation.matchType || 'normal'
      );

      // 根据归属变更结果更新角色信息
      this._applyAffiliationChanges(male, female, affiliationChanges);

      // 将归属信息添加到关系记录
      relation.affiliationChanges = affiliationChanges;

      //console.log(`✅ 婚姻状态和归属更新完成: ${male.name} × ${female.name}`, affiliationChanges);

    } catch (error) {
      console.error('❌ 婚姻归属处理失败，使用默认规则:', error);

      // 降级处理：使用传统的女性嫁入规则
      this._applyDefaultMarriageRules(male, female);
    }
  }

  /**
   * 应用归属变更到角色
   * @param {Object} male - 男性角色
   * @param {Object} female - 女性角色
   * @param {Object} affiliationChanges - 归属变更信息
   */
  _applyAffiliationChanges(male, female, affiliationChanges) {
    // 处理丈夫的归属变更
    if (affiliationChanges.husbandChanges.affiliation !== 'no_change') {
      this._updateCharacterAffiliation(male, affiliationChanges.husbandChanges);
      
      // 入赘情况的特殊处理
      if (affiliationChanges.husbandChanges.affiliation === 'matrilocal_adoption') {
        male.marriageType = 'matrilocal';
        male.adoptedIntoFamily = affiliationChanges.husbandChanges.newFamily;
        
        // 入赘可能需要改姓
        if (affiliationChanges.husbandChanges.surnameChange) {
          male.originalSurname = male.familyName; // 保留原姓
          male.familyName = affiliationChanges.husbandChanges.newSurname;
        }
      }
    }

    // 处理妻子的归属变更
    if (affiliationChanges.wifeChanges.affiliation !== 'no_change') {
      this._updateCharacterAffiliation(female, affiliationChanges.wifeChanges);
      
      // 嫁入情况的处理
      if (affiliationChanges.wifeChanges.affiliation === 'patrilocal_marriage') {
        female.marriageType = 'patrilocal';
        female.marriedIntoFamily = affiliationChanges.wifeChanges.newFamily;
        female.originalFamily = affiliationChanges.wifeChanges.originalFamily; // 保留娘家信息
      }
      
      // 政治联姻的部分保留
      else if (affiliationChanges.wifeChanges.affiliation === 'partial_retention') {
        female.marriageType = 'political';
        female.marriedIntoFamily = affiliationChanges.wifeChanges.newFamily;
        female.retainedFamilyTies = true; // 保持与娘家的强联系
      }
    }
  }

  /**
   * 应用默认婚姻规则 (降级处理)
   * @param {Object} male - 男性角色
   * @param {Object} female - 女性角色
   */
  _applyDefaultMarriageRules(male, female) {
    // 传统的女性嫁入男方家族
    female.marriageType = 'patrilocal';
    female.marriedIntoFamily = male.currentFamily || male.familyName;
    female.originalFamily = female.currentFamily || female.familyName;
    
    // 男性保持原家族
    male.marriageType = 'traditional';
    
    //console.log(`📝 应用默认婚姻规则: ${female.name} 嫁入 ${male.familyName}家族`);
  }

  // ==================== 血缘网络生成 ====================

  /**
   * 生成血缘网络数据
   * @param {Array} detailedFamilyUnits - 详细家族单元
   * @param {Array} crossUnitRelations - 跨单元关系
   * @returns {Object} 血缘网络数据
   */
  _generateBloodlineNetwork(detailedFamilyUnits, crossUnitRelations) {
    //console.log('🔗 生成血缘网络数据...');

    const bloodlineNetwork = {
      networkId: `bloodline_${Date.now()}`,
      
      // 所有角色
      allCharacters: this._collectAllCharacters(detailedFamilyUnits),
      
      // 所有关系
      allRelations: this._collectAllRelations(detailedFamilyUnits, crossUnitRelations),
      
      // 家族树
      familyTrees: this._buildFamilyTrees(detailedFamilyUnits, crossUnitRelations),
      
      // 关系索引
      relationIndex: this._buildRelationIndex(detailedFamilyUnits, crossUnitRelations),
      
      // 生成统计
      statistics: this._calculateBloodlineStatistics(detailedFamilyUnits, crossUnitRelations)
    };

    //console.log(`✅ 血缘网络生成完成: ${bloodlineNetwork.allCharacters.length}个角色, ${bloodlineNetwork.allRelations.length}条关系`);

    return bloodlineNetwork;
  }

  /**
   * 收集所有角色
   * @param {Array} familyUnits - 家族单元列表
   * @returns {Array} 所有角色列表
   */
  _collectAllCharacters(familyUnits) {
    const allCharacters = [];
    
    familyUnits.forEach(unit => {
      // 适配不同的数据结构
      if (this._getUnitCharacters(unit)) {
        allCharacters.push(...this._getUnitCharacters(unit));
      } else if (unit.livingMembers) {
        allCharacters.push(...unit.livingMembers);
      } else {
        console.warn('单元缺少角色数据:', unit);
      }
    });
  
    return allCharacters;
  }

  /**
   * 收集所有关系
   * @param {Array} familyUnits - 家族单元列表
   * @param {Array} crossUnitRelations - 跨单元关系
   * @returns {Array} 所有关系列表
   */
  _collectAllRelations(familyUnits) {
    const allRelations = [];
    const relationKeys = new Set(); // 🔧 添加全局去重Set

    // 辅助函数：生成关系唯一键
    const getRelationKey = (relation) => {
      if (relation.type === 'marriage') {
        const sorted = [relation.participants[0], relation.participants[1]].sort();
        return `marriage_${sorted.join('_')}`;
      } else if (relation.type === 'parent_child') {
        return `parent_child_${relation.data.father}_${relation.data.mother}_${relation.data.child}`;
      } else if (relation.type === 'siblings') {
        return `siblings_${relation.participants.sort().join('_')}`;
      }
      // 兜底：使用participants生成键
      return `${relation.type}_${relation.participants?.join('_') || 'unknown'}`;
    };

    familyUnits.forEach(unit => {
      // 🔧 修复：优先使用internalRelations，避免重复提取
      if (unit.internalRelations && Array.isArray(unit.internalRelations)) {
        unit.internalRelations.forEach(relation => {
          const key = getRelationKey(relation);
          if (!relationKeys.has(key)) {
            relationKeys.add(key);
            allRelations.push(relation);
          }
        });
      } else if (unit.familyHistory?.familyStructure) {
        // 只在没有internalRelations时才从familyStructure提取
        console.warn('⚠️ 单元缺少internalRelations，从familyStructure提取:', unit.unitId);
        const extractedRelations = this._extractRelations(unit.familyHistory.familyStructure);
        extractedRelations.forEach(relation => {
          const key = getRelationKey(relation);
          if (!relationKeys.has(key)) {
            relationKeys.add(key);
            allRelations.push(relation);
          }
        });
      } else {
        console.warn('❌ 单元缺少关系数据:', unit.unitId);
      }
    });

    //console.log(`✅ 收集所有关系完成: ${allRelations.length}条（已去重）`);
    return allRelations;
  }

  /**
   * 构建家族树
   * @param {Array} familyUnits - 家族单元列表
   * @param {Array} crossUnitRelations - 跨单元关系
   * @returns {Array} 家族树列表
   */
  _buildFamilyTrees(familyUnits, crossUnitRelations) {
    const familyTrees = [];
    
    // 先收集所有角色和关系
    const allCharacters = this._collectAllCharacters(familyUnits);
    const allRelations = this._collectAllRelations(familyUnits); // 收集所有血缘关系
    
    // 按家族名分组
    const familyGroups = this._groupCharactersByFamilyName(allCharacters);
    
    Object.keys(familyGroups).forEach(familyName => {
      const familyMembers = familyGroups[familyName];
      const familyTree = this._buildSingleFamilyTree(
        familyName, 
        familyMembers, 
        crossUnitRelations,
        allRelations  // 传递关系数据
      );
      familyTrees.push(familyTree);
    });
  
    return familyTrees;
  }

  /**
   * 按家族名分组角色
   * @param {Array} familyUnits - 家族单元列表
   * @returns {Object} 按家族名分组的角色
   */
  _groupCharactersByFamilyName(allCharacters) {
    const familyGroups = {};
    
    // 检查输入参数
    if (!allCharacters || !Array.isArray(allCharacters)) {
      console.warn('allCharacters 不是有效数组:', allCharacters);
      return familyGroups;
    }
    
    allCharacters.forEach(character => {
      // 检查角色对象
      if (!character) {
        console.warn('发现空角色对象');
        return;
      }
      
      const familyName = character.familyName || character.currentFamily || 'unknown';
      
      if (!familyGroups[familyName]) {
        familyGroups[familyName] = [];
      }
      
      familyGroups[familyName].push(character);
    });
    
    return familyGroups;
  }

  /**
   * 构建单个家族树
   * @param {string} familyName - 家族名
   * @param {Array} members - 家族成员
   * @param {Array} crossUnitRelations - 跨单元关系
   * @param {Array} allRelations - 成员血缘关系
   * @returns {Object} 家族树
   */
  _buildSingleFamilyTree(familyName, members, crossUnitRelations, allRelations) {
    return {
      familyName: familyName,
      totalMembers: members.length,
      generations: this._analyzeGenerations(members),
      members: members,
      relationships: this._extractFamilyRelationships(familyName, members, allRelations),
      externalMarriages: this._findExternalMarriages(members, crossUnitRelations),
      createdAt: Date.now()
    };
  }

  /**
   * 提取指定家族的血缘关系
   * @param {string} familyName - 家族名
   * @param {Array} members - 家族成员
   * @param {Array} allRelations - 家族成员血缘关系
   * @returns {Array} 血缘关系列表
   */
  _extractFamilyRelationships(familyName, members, allRelations) {
    const memberIds = new Set(members.map(m => m.characterId || m.id));
    const familyRelationships = [];
    
    allRelations.forEach(relation => {
      const fromId = relation.fromCharacterId || relation.participants?.[0];
      const toId = relation.toCharacterId || relation.participants?.[1];
      
      if (memberIds.has(fromId) && memberIds.has(toId)) {
        familyRelationships.push(relation);
      }
    });
    
    return familyRelationships;
  }


  /**
   * 分析世代结构
   * @param {Array} members - 家族成员
   * @returns {Object} 世代分析结果
   */
  _analyzeGenerations(members) {
    const generations = {
      eldest: members.filter(m => m.age >= 60),
      middle: members.filter(m => m.age >= 25 && m.age < 60),
      youngest: members.filter(m => m.age < 25)
    };

    return {
      ...generations,
      generationCount: Object.keys(generations).filter(key => generations[key].length > 0).length
    };
  }

  /**
   * 查找外部婚姻
   * @param {Array} members - 家族成员
   * @param {Array} crossUnitRelations - 跨单元关系
   * @returns {Array} 外部婚姻列表
   */
  _findExternalMarriages(members, crossUnitRelations) {
    const memberIds = new Set(members.map(m => m.characterId));
    
    return crossUnitRelations.filter(relation => 
      memberIds.has(relation.husbandId) || memberIds.has(relation.wifeId)
    );
  }

  /**
   * 构建关系索引
   * @param {Array} familyUnits - 家族单元列表
   * @param {Array} crossUnitRelations - 跨单元关系
   * @returns {Map} 关系索引
   */
  _buildRelationIndex(familyUnits, crossUnitRelations) {
    const relationIndex = new Map();
    
    const allRelations = this._collectAllRelations(familyUnits, crossUnitRelations);
    
    allRelations.forEach(relation => {
      // 为角色1建立索引
      if (relation.character1Id) {
        if (!relationIndex.has(relation.character1Id)) {
          relationIndex.set(relation.character1Id, []);
        }
        relationIndex.get(relation.character1Id).push(relation);
      }
      
      // 为角色2建立索引
      if (relation.character2Id) {
        if (!relationIndex.has(relation.character2Id)) {
          relationIndex.set(relation.character2Id, []);
        }
        relationIndex.get(relation.character2Id).push(relation);
      }
      
      // 为夫妻关系建立索引
      if (relation.husbandId) {
        if (!relationIndex.has(relation.husbandId)) {
          relationIndex.set(relation.husbandId, []);
        }
        relationIndex.get(relation.husbandId).push(relation);
      }
      
      if (relation.wifeId) {
        if (!relationIndex.has(relation.wifeId)) {
          relationIndex.set(relation.wifeId, []);
        }
        relationIndex.get(relation.wifeId).push(relation);
      }
    });

    return relationIndex;
  }

  /**
   * 计算血缘网络统计
   * @param {Array} familyUnits - 家族单元列表
   * @param {Array} crossUnitRelations - 跨单元关系
   * @returns {Object} 统计结果
   */
  _calculateBloodlineStatistics(familyUnits, crossUnitRelations) {
    const allCharacters = this._collectAllCharacters(familyUnits);
    const allRelations = this._collectAllRelations(familyUnits, crossUnitRelations);
    
    return {
      totalCharacters: allCharacters.length,
      totalRelations: allRelations.length,
      
      // 按性别统计
      genderDistribution: {
        male: allCharacters.filter(c => c.gender === '男').length,
        female: allCharacters.filter(c => c.gender === '女').length
      },
      
      // 按年龄段统计
      ageDistribution: {
        children: allCharacters.filter(c => c.age < 18).length,
        adults: allCharacters.filter(c => c.age >= 18 && c.age < 60).length,
        elderly: allCharacters.filter(c => c.age >= 60).length
      },
      
      // 按社会等级统计
      socialClassDistribution: this._calculateClassDistribution(allCharacters),
      
      // 关系类型统计
      relationshipTypes: {
        internalRelations: allRelations.filter(r => r.relationType === 'blood_relation').length,
        crossUnitMarriages: crossUnitRelations.length
      },
      
      // 家族单元统计
      familyUnitStats: {
        totalUnits: familyUnits.length,
        unitTypes: this._calculateUnitTypeDistribution(familyUnits),
        avgUnitSize: Math.round(allCharacters.length / familyUnits.length * 10) / 10
      }
    };
  }

  /**
   * 计算社会等级分布
   * @param {Array} characters - 角色列表
   * @returns {Object} 等级分布
   */
  _calculateClassDistribution(characters) {
    const distribution = {};
    
    characters.forEach(character => {
      const socialClass = character.socialClass;
      distribution[socialClass] = (distribution[socialClass] || 0) + 1;
    });

    return distribution;
  }

  /**
   * 计算单元类型分布
   * @param {Array} familyUnits - 家族单元列表
   * @returns {Object} 单元类型分布
   */
  _calculateUnitTypeDistribution(familyUnits) {
    const distribution = {};
    
    familyUnits.forEach(unit => {
      const unitType = unit.unitType;
      distribution[unitType] = (distribution[unitType] || 0) + 1;
    });

    return distribution;
  }
  // ==================== 家族归属流动管理 ====================

  /**
   * 处理婚姻后的家族归属变更
   * @param {Object} husband - 丈夫角色
   * @param {Object} wife - 妻子角色
   * @param {string} marriageType - 婚姻类型
   * @returns {Object} 归属变更结果
   */
  processMarriageAffiliation(husband, wife, marriageType = 'normal') {
    //console.log(`🔄 处理婚姻归属变更: ${husband.name} × ${wife.name}`);

    // 确定婚姻模式
    const marriagePattern = this._determineMarriagePattern(husband, wife, marriageType);
    
    // 执行归属变更
    const affiliationChanges = this._executeAffiliationTransition(husband, wife, marriagePattern);
    
    // 建立跨家族关系
    this._establishCrossFamilyTies(husband, wife, affiliationChanges);
    
    // 记录变更历史
    this._recordAffiliationTransition(husband, wife, affiliationChanges);
    
    return affiliationChanges;
  }

  /**
   * 确定婚姻模式
   */
  _determineMarriagePattern(husband, wife, marriageType) {
    const rules = this.affiliationRules.marriage_mobility_rules;
    
    // 检查入赘条件
    if (this._checkMatrilocalConditions(husband, wife)) {
      return {
        type: 'matrilocal_marriage',
        pattern: rules.special_marriage_patterns.matrilocal_marriage
      };
    }
    
    // 检查政治联姻条件
    if (this._checkPoliticalMarriageConditions(husband, wife)) {
      return {
        type: 'political_marriage', 
        pattern: rules.special_marriage_patterns.political_marriage
      };
    }
   
    // 默认嫁娶模式
    return {
      type: 'default_marriage',
      pattern: rules.default_pattern
    };
  }

  _checkPoliticalMarriageConditions(husband, wife) {
    // 临时实现：总是返回false
    return false;
  }

  /**
   * 检查入赘条件
   */
  _checkMatrilocalConditions(husband, wife) {
    const scenarios = this.affiliationRules.marriage_mobility_rules.special_marriage_patterns.matrilocal_marriage.scenarios;
    
    // 检查高门继承人短缺情况
    if (this._checkNobleHeirShortage(husband, wife, scenarios.noble_family_heir_shortage)) {
      return true;
    }
    
    // 检查经济拯救情况  
    if (this._checkEconomicRescue(husband, wife, scenarios.economic_rescue_marriage)) {
      return true;
    }
    
    return false;
  }

  _checkEconomicRescue(husband, wife, scenario) {
    // 临时实现：总是返回false
    return false;
  }

  /**
   * 检查高门继承人短缺
   */
  _checkNobleHeirShortage(husband, wife, scenario) {
    const wifeClassMatch = scenario.conditions.wife_social_class.includes(wife.socialClass);
    const husbandClassMatch = scenario.conditions.husband_social_class.includes(husband.socialClass);
    const isOnlyHeir = this._isOnlyHeir(wife);
    const hasBloodlineCrisis = this._hasBloodlineCrisis(wife.currentFamily);
    
    return wifeClassMatch && husbandClassMatch && isOnlyHeir && hasBloodlineCrisis;
  }

  /**
   * 执行归属变更
   */
  _executeAffiliationTransition(husband, wife, marriagePattern) {
    const changes = {
      marriageType: marriagePattern.type,
      husbandChanges: {},
      wifeChanges: {},
      childrenRules: {},
      timestamp: Date.now()
    };

    // 处理不同婚姻模式的归属变更
    switch (marriagePattern.type) {
      case 'matrilocal_marriage':
        changes.husbandChanges = this._processMatrilocalTransition(husband, wife);
        changes.wifeChanges = { affiliation: 'no_change', family: wife.currentFamily };
        break;
        
      case 'political_marriage':
        changes.husbandChanges = { affiliation: 'no_change', family: husband.currentFamily };
        changes.wifeChanges = this._processPartialRetention(wife, husband);
        break;
        
      default: // default_marriage
        changes.husbandChanges = { affiliation: 'no_change', family: husband.currentFamily };
        changes.wifeChanges = this._processPatrilocalTransition(wife, husband);
        break;
    }

    // 设置子女归属规则
    changes.childrenRules = this._determineChildrenAffiliation(marriagePattern);

    return changes;
  }

  _determineChildrenAffiliation(marriagePattern) {
    const inheritanceRules = PopulationRules.getBalanceConfig()?.population_generation?.children_inheritance_rules;
    
    if (!inheritanceRules) {
      return [{ rule: 'follow_father', familyAffiliation: 'husband_family' }];
    }
    
    const affiliations = [];
    
    if (marriagePattern.type === 'matrilocal_marriage') {
      // 检查母系例外条件
      const matrilinealRule = inheritanceRules.matrilineal_exception;
      affiliations.push({
        rule: matrilinealRule.effects.primary_affiliation,
        familyAffiliation: 'wife_family',
        surnameRule: matrilinealRule.effects.surname_inheritance,
        propertyRule: matrilinealRule.effects.property_inheritance
      });
    } else {
      // 默认父系制
      const patrilinealRule = inheritanceRules.patrilineal_system;
      affiliations.push({
        rule: patrilinealRule.primary_affiliation,
        familyAffiliation: 'husband_family',
        surnameRule: patrilinealRule.surname_inheritance,
        propertyRule: patrilinealRule.property_inheritance
      });
    }
    
    return affiliations;
  }

  /**
   * 处理入赘转换
   */
  _processMatrilocalTransition(husband, wife) {
    return {
      affiliation: 'matrilocal_adoption',
      originalFamily: husband.currentFamily,
      newFamily: wife.currentFamily,
      surnameChange: true,
      newSurname: wife.familyName,
      integrationPeriod: this.affiliationRules.affiliation_transition_rules.male_matrilocal_transition.status_adjustment.probationary_period,
      status: 'newcomer'
    };
  }

  /**
   * 处理嫁娶转换（女性嫁入男方家族）
   */
  _processPatrilocalTransition(wife, husband) {
    return {
      affiliation: 'patrilocal_marriage',
      originalFamily: wife.currentFamily,
      newFamily: husband.currentFamily,
      surnameChange: false, // 保持娘家姓氏记录
      integrationPeriod: this.affiliationRules.affiliation_transition_rules.female_marriage_transition.new_family_integration.adoption_period,
      status: 'newcomer'
    };
  }

  /**
   * 建立跨家族关系
   */
  _establishCrossFamilyTies(husband, wife, affiliationChanges) {
    const tieId = `family_tie_${husband.currentFamily}_${wife.currentFamily}_${Date.now()}`;
    
    this.crossFamilyTies.set(tieId, {
      husbandFamily: husband.currentFamily,
      wifeFamily: wife.currentFamily,
      marriageType: affiliationChanges.marriageType,
      establishedDate: Date.now(),
      strength: this._calculateTieStrength(affiliationChanges.marriageType),
      participants: {
        husband: husband.id,
        wife: wife.id
      }
    });
    
    //console.log(`🔗 建立跨家族关系: ${husband.currentFamily} ↔ ${wife.currentFamily}`);
  }


  _calculateTieStrength(marriageType) {
    const relationshipConfig = PopulationRules.getBalanceConfig()?.population_generation?.family_relationship_maintenance?.cross_family_ties;
    
    if (!relationshipConfig) {
      return 50; // 默认值
    }
    
    // 根据婚姻类型确定关系强度
    if (marriageType === 'matrilocal_marriage') {
      return Math.floor(relationshipConfig.maternal_relatives.relationship_strength * 100);
    } else {
      return Math.floor(relationshipConfig.paternal_relatives.relationship_strength * 100);
    }
  }


  _recordAffiliationTransition(husband, wife, affiliationChanges) {
    // 只保留一个数组初始化
    if (!Array.isArray(this.affiliationTransitions)) {
      this.affiliationTransitions = [];
    }
    
    const transitionRecord = {
      id: `transition_${husband.id}_${wife.id}_${Date.now()}`,
      husbandId: husband.id,
      wifeId: wife.id,
      marriageType: affiliationChanges.marriageType,
      husbandFamilyChange: affiliationChanges.husbandFamilyChange,
      wifeFamilyChange: affiliationChanges.wifeFamilyChange,
      childrenAffiliation: affiliationChanges.childrenAffiliation,
      timestamp: Date.now()
    };
    
    this.affiliationTransitions.push(transitionRecord);
    //console.log(`记录家族归属转换: ${husband.name} & ${wife.name}`);
  }

  async _expandExistingFamilies(existingFamilyData) {
    //console.log('处理现有家族的自然发展');
    
    const expandedUnits = [];
    
    for (const familyUnit of existingFamilyData) {
      const expandedUnit = await this._expandSingleFamily(familyUnit);
      expandedUnits.push(expandedUnit);
    }
    
    return expandedUnits;
  }
  
  async _expandSingleFamily(familyUnit) {
    const expandedFamily = {
      ...familyUnit,
      unitId: familyUnit.unitId,
      expansionTimestamp: Date.now()
    };
    
    // 1. 年龄推进（基于时间流逝）
    this._updateMemberAges(expandedFamily);
    
    // 2. 生命状态更新
    this._updateVitalStatus(expandedFamily);
    
    // 3. 生成新生儿
    const newborns = await this._generateNewborns(expandedFamily);
    
    // 4. 更新家族结构
    if (newborns.length > 0) {
      expandedFamily.allCharacters = [...expandedFamily.allCharacters, ...newborns];
      this._updateFamilyStructure(expandedFamily, newborns);
    }
    
    return expandedFamily;
  }
  
  _updateMemberAges(familyUnit) {
    const timeElapsed = this._calculateTimeElapsed(familyUnit.lastUpdated);
    
    familyUnit.allCharacters.forEach(character => {
      character.age += timeElapsed;
    });
  }
  
  async _generateNewborns(familyUnit) {
    const newborns = [];
    const marriedCouples = this._findMarriedCouples(familyUnit);
    
    for (const couple of marriedCouples) {
      if (this._isOfChildbearingAge(couple) && this._shouldHaveChild(couple)) {
        const childrenCount = this._determineChildrenCount(couple);
        
        for (let i = 0; i < childrenCount; i++) {
          const newborn = await this._createNewborn(couple, familyUnit);
          
          // 调用位置：为新生儿建立关系
          newborn.relationships = this._establishNewbornRelationships(newborn, couple);
          
          newborns.push(newborn);
        }
      }
    }
    
    return newborns;
  }

  async _createNewborn(couple, familyUnit) {
    const newborn = {
      characterId: this._generateCharacterId(familyUnit.unitId, `newborn_${Date.now()}`),
      name: null, // 待NameGenerator填充
      age: 0,
      gender: Math.random() < 0.5 ? '男' : '女',
      generation: Math.max(couple.husband.generation, couple.wife.generation) + 1,
      socialClass: couple.husband.socialClass,
      familyName: couple.husband.familyName,
      originalFamily: couple.husband.familyName,
      familyRole: this._determineFamilyRole({ 
        generation: Math.max(couple.husband.generation, couple.wife.generation) + 1,
        gender: Math.random() < 0.5 ? '男' : '女'
      }),
      
      // 父母ID信息（供_updateFamilyStructure使用）
      fatherId: couple.husband.characterId,
      motherId: couple.wife.characterId,
      
      vitalStatus: 'living',
      isNative: true,
      birthDate: Date.now(),
      
      // 关系数据（在_generateNewborns中填充）
      relationships: [],
      
      // 创建信息
      createdAt: Date.now(),
      createdBy: 'Population_Mode_FamilyNetworkService'
    };
    
    return newborn;
  }

  _calculateAgeAdjustment(wifeAge) {
    const config = PopulationRules.getBalanceConfig();
    const fertilityCurve = config.population_generation.fertility_system.age_fertility_curve;
    
    // 遍历年龄段找到对应的生育率
    for (const [maxAge, fertilityRate] of fertilityCurve) {
      if (wifeAge <= maxAge) {
        return fertilityRate;
      }
    }
    
    // 兜底返回最后一个配置值
    return fertilityCurve[fertilityCurve.length - 1][1];
  }

  _determineChildrenCount(couple) {
    const config = PopulationRules.getBalanceConfig();
    const birthOutcomes = config.population_generation.fertility_system.birth_outcomes;
    
    const random = Math.random();
    
    for (const [probability, childrenCount] of birthOutcomes) {
      if (random < probability) {
        return childrenCount;
      }
    }
    
    // 兜底返回单胎
    return 1;
  }

  _shouldHaveChild(couple) {
    const config = PopulationRules.getGapPlanningConfig();
    
    // 获取生育类型和基础生育率
    const fertilityWeights = config.generationPlanning.fertilityTypeWeights;
    const types = Object.keys(fertilityWeights);
    const weights = Object.values(fertilityWeights);
    const fertilityType = Utils.Math.weightedRandom(types, weights);
    
    const fertilityConfig = config.generationPlanning.fertilityRates[fertilityType];
    const baseFertilityRate = Utils.Math.randomFloat(fertilityConfig.min, fertilityConfig.max);
    
    // 年龄调整
    const ageAdjustment = this._calculateAgeAdjustment(couple.wife.age);
    
    // 定居模式修正
    const balanceConfig = PopulationRules.getBalanceConfig();
    const settlementModifier = balanceConfig.population_generation.fertility_system.settlement_fertility_modifier;
    
    let finalRate = baseFertilityRate * ageAdjustment;
    if (!PopulationRules.getRefugeeMode().enabled) {
      finalRate *= settlementModifier;
    }
    
    return Math.random() < finalRate;
  }

  _findMarriedCouples(familyUnit) {
    const couples = [];
    const marriages = familyUnit.familyStructure?.marriages || [];
    
    marriages.forEach(marriage => {
      const husband = familyUnit.allCharacters.find(c => c.characterId === marriage.husband);
      const wife = familyUnit.allCharacters.find(c => c.characterId === marriage.wife);
      
      if (husband && wife && husband.vitalStatus === 'living' && wife.vitalStatus === 'living') {
        couples.push({ husband, wife });
      }
    });
    
    return couples;
  }
  
  _isOfChildbearingAge(couple) {
    const fertilityCfg = PopulationRules.getFertilityConfig();
    return couple.wife.age >= fertilityCfg.min_breeding_age && 
           couple.wife.age <= fertilityCfg.max_breeding_age.female &&
           couple.husband.age >= fertilityCfg.min_breeding_age;
  }
  

  /**
   * 为新生儿建立基本的家族关系
   * @param {Object} newborn - 新生儿角色对象
   * @param {Object} parents - 父母信息 {husband, wife}
   * @returns {Array} 关系数组
   */
  _establishNewbornRelationships(newborn, parents) {
    const relationships = [];
    
    // 建立与父亲的关系
    relationships.push({
      type: 'father',
      targetId: parents.husband.characterId,
      intimacy: 75, // 新生儿与父亲的初始亲密度
      establishedAt: Date.now()
    });
    
    // 建立与母亲的关系
    relationships.push({
      type: 'mother', 
      targetId: parents.wife.characterId,
      intimacy: 80, // 新生儿与母亲的初始亲密度
      establishedAt: Date.now()
    });
    
    // 查找兄弟姐妹
    const siblings = this._findExistingSiblings(parents, newborn.familyName);
    siblings.forEach(sibling => {
      relationships.push({
        type: 'sibling',
        targetId: sibling.characterId,
        intimacy: 60,
        establishedAt: Date.now()
      });
    });
    
    return relationships;
  }

  /**
   * 更新家族结构以包含新生儿
   * @param {Object} familyUnit - 家族单元
   * @param {Array} newborns - 新生儿列表
   */
  _updateFamilyStructure(familyUnit, newborns) {
    if (!familyUnit.familyStructure) {
      familyUnit.familyStructure = {
        marriages: [],
        parentChild: [],
        siblings: []
      };
    }
    
    newborns.forEach(newborn => {
      // 查找新生儿的父母
      const parents = this._findNewbornParents(newborn, familyUnit);
      
      if (parents) {
        // 添加父子关系记录
        familyUnit.familyStructure.parentChild.push({
          father: parents.husband.characterId,
          mother: parents.wife.characterId,
          child: newborn.characterId,
          birthDate: Date.now()
        });
        
        // 更新兄弟姐妹关系
        this._updateSiblingGroups(familyUnit, newborn, parents);
      }
    });
    
    // 更新家族统计信息
    this._updateFamilyStatistics(familyUnit);
  }

  /**
   * 查找新生儿的兄弟姐妹
   * @param {Object} parents - 父母信息
   * @param {string} familyName - 家族名
   * @returns {Array} 兄弟姐妹列表
   */
  _findExistingSiblings(parents, familyName) {
    const siblings = [];
    
    // 在家族中查找同父母的其他子女
    const allChildren = this.currentNetwork?.familyUnits
      ?.find(unit => unit.familyName === familyName)
      ?.allCharacters?.filter(character => 
        character.relationships?.some(rel => 
          (rel.type === 'father' && rel.targetId === parents.husband.characterId) ||
          (rel.type === 'mother' && rel.targetId === parents.wife.characterId)
        )
      ) || [];
    
    return allChildren;
  }

  /**
   * 更新兄弟姐妹分组
   * @param {Object} familyUnit - 家族单元
   * @param {Object} newborn - 新生儿
   * @param {Object} parents - 父母信息
   */
  _updateSiblingGroups(familyUnit, newborn, parents) {
    // 查找是否已有兄弟姐妹组
    let siblingGroup = familyUnit.familyStructure.siblings.find(group =>
      group.some(siblingId => {
        const sibling = familyUnit.allCharacters.find(c => c.characterId === siblingId);
        return sibling?.relationships?.some(rel =>
          (rel.type === 'father' && rel.targetId === parents.husband.characterId) &&
          sibling.relationships.some(rel2 => 
            rel2.type === 'mother' && rel2.targetId === parents.wife.characterId
          )
        );
      })
    );
    
    if (siblingGroup) {
      // 添加到现有兄弟姐妹组
      siblingGroup.push(newborn.characterId);
    } else {
      // 创建新的兄弟姐妹组（如果有其他同父母子女）
      const siblings = this._findExistingSiblings(parents, newborn.familyName);
      if (siblings.length > 0) {
        const newGroup = [newborn.characterId, ...siblings.map(s => s.characterId)];
        familyUnit.familyStructure.siblings.push(newGroup);
      }
    }
  }

  /**
   * 查找新生儿的父母
   * @param {Object} newborn - 新生儿
   * @param {Object} familyUnit - 家族单元
   * @returns {Object|null} 父母信息
   */
  _findNewbornParents(newborn, familyUnit) {
    // 新生儿对象应该已经包含父母ID信息
    const fatherId = newborn.fatherId;
    const motherId = newborn.motherId;
    
    if (!fatherId || !motherId) return null;
    
    const father = familyUnit.allCharacters.find(c => c.characterId === fatherId);
    const mother = familyUnit.allCharacters.find(c => c.characterId === motherId);
    
    return father && mother ? { husband: father, wife: mother } : null;
  }

  /**
   * 更新家族统计信息
   * @param {Object} familyUnit - 家族单元
   */
  _updateFamilyStatistics(familyUnit) {
    familyUnit.totalMembers = familyUnit.allCharacters.length;
    familyUnit.livingMembers = familyUnit.allCharacters.filter(c => c.vitalStatus === 'living').length;
    familyUnit.lastUpdated = Date.now();
    
    // 更新世代分布
    familyUnit.generationDistribution = {};
    familyUnit.allCharacters.forEach(character => {
      const gen = character.generation || 'unknown';
      familyUnit.generationDistribution[gen] = (familyUnit.generationDistribution[gen] || 0) + 1;
    });
  }
  

  /**
   * 辅助方法：判断是否为独生女继承人
   */
  _isOnlyHeir(character) {
    // 简化判断逻辑，实际应该检查家族中是否有其他男性继承人
    return character.gender === '女' && character.familyRole === 'daughter' && Math.random() < 0.3;
  }

  /**
   * 辅助方法：判断家族是否有血脉危机
   */
  _hasBloodlineCrisis(familyId) {
    // 简化判断逻辑，实际应该检查家族男性成员数量
    return Math.random() < 0.4;
  }


  /**
 * 计算时间流逝
 * @param {number} lastUpdated - 上次更新时间戳
 * @returns {number} 流逝的年数
 */
_calculateTimeElapsed(lastUpdated) {
  if (!lastUpdated) {
    // 如果没有上次更新时间，默认流逝1年
    return 1;
  }
  
  const currentTime = Date.now();
  const timeDiff = currentTime - lastUpdated;
  
  // 将毫秒转换为年（简化计算）
  // 实际游戏中应该基于游戏时间系统
  const millisecondsPerYear = 365 * 24 * 60 * 60 * 1000;
  const yearsElapsed = Math.floor(timeDiff / millisecondsPerYear);
  
  // 最小流逝1年，最大流逝5年
  return Math.max(1, Math.min(5, yearsElapsed));
}

/**
 * 更新家族成员生命状态
 * @param {Object} familyUnit - 家族单元
 */
_updateVitalStatus(familyUnit) {
  const mortalityConfig = PopulationRules.getMortalityConfig();
  
  familyUnit.allCharacters.forEach(character => {
    if (character.vitalStatus === 'living') {
      // 基于年龄计算死亡概率
      const deathProbability = this._calculateDeathProbability(character.age, mortalityConfig);
      
      if (Math.random() < deathProbability) {
        character.vitalStatus = 'deceased';
        character.deathAge = character.age;
        character.deathDate = Date.now();
        
        //console.log(`角色 ${character.name} 去世，享年 ${character.age} 岁`);
        
        // 更新相关家族结构（丧偶处理）
        this._handleCharacterDeath(character, familyUnit);
      }
    }
  });
}

/**
 * 计算角色死亡概率
 * @param {number} age - 角色年龄
 * @param {Object} mortalityConfig - 死亡率配置
 * @returns {number} 死亡概率 (0-1)
 */
_calculateDeathProbability(age, mortalityConfig) {
  const balanceConfig = PopulationRules.getBalanceConfig();
  const mortalityRates = balanceConfig.population_generation.mortalityRates;
  
  if (!mortalityRates || !mortalityRates.age_mortality_curve) {
    console.warn('死亡率配置缺失，使用默认值');
    return 0.05; // 5%默认死亡率
  }
  
  const mortalityCurve = mortalityRates.age_mortality_curve;
  
  // 遍历年龄段找到对应的死亡率
  for (const [maxAge, mortalityRate] of mortalityCurve) {
    if (age <= maxAge) {
      return mortalityRate;
    }
  }
  
  // 超出配置范围时使用配置的默认超高龄死亡率
  return mortalityRates.default_elderly_mortality || 0.999999;
}

/**
 * 处理角色死亡的相关影响
 * @param {Object} deceasedCharacter - 去世的角色
 * @param {Object} familyUnit - 家族单元
 */
_handleCharacterDeath(deceasedCharacter, familyUnit) {
  // 处理丧偶情况
  if (deceasedCharacter.relationships) {
    const spouseRelation = deceasedCharacter.relationships.find(rel => rel.type === 'spouse');
    if (spouseRelation) {
      const spouse = familyUnit.allCharacters.find(c => c.characterId === spouseRelation.targetId);
      if (spouse && spouse.vitalStatus === 'living') {
        spouse.marriageStatus = 'widowed';
        spouse.widowedDate = Date.now();
        
        // 更新婚姻结构状态
        this._updateMarriageStructureForDeath(familyUnit, deceasedCharacter.characterId, spouse.characterId);
      }
    }
  }
}

/**
 * 更新婚姻结构以反映死亡
 * @param {Object} familyUnit - 家族单元
 * @param {string} deceasedId - 去世者ID
 * @param {string} spouseId - 配偶ID
 */
_updateMarriageStructureForDeath(familyUnit, deceasedId, spouseId) {
  if (familyUnit.familyStructure?.marriages) {
    familyUnit.familyStructure.marriages.forEach(marriage => {
      if (marriage.husband === deceasedId || marriage.wife === deceasedId) {
        marriage.status = 'widowed';
        marriage.endDate = Date.now();
        marriage.endReason = 'death';
      }
    });
  }
}


  // ==================== 网络验证 ====================

  /**
   * 验证网络完整性
   * @param {Object} bloodlineNetwork - 血缘网络数据
   * @returns {Object} 验证结果
   */
  _validateNetworkIntegrity(bloodlineNetwork) {
    //console.log('✅ 验证血缘网络完整性...');

    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      validationScore: 0,
      details: {}
    };

    try {
      // 1. 角色数据完整性验证
      this._validateCharacterData(bloodlineNetwork, validationResult);
      
      // 2. 关系数据一致性验证
      this._validateRelationshipConsistency(bloodlineNetwork, validationResult);
      
      // 3. 年龄逻辑性验证
      this._validateAgeLogic(bloodlineNetwork, validationResult);
      
      // 4. 婚姻规则验证
      this._validateMarriageRules(bloodlineNetwork, validationResult);
      
      // 5. 家族结构合理性验证
      this._validateFamilyStructure(bloodlineNetwork, validationResult);

      // 计算总体验证分数
      validationResult.validationScore = this._calculateValidationScore(validationResult);
      
      // 判断是否通过验证
      validationResult.isValid = validationResult.errors.length === 0 && 
                                 validationResult.validationScore >= 70;

      //console.log(`验证完成: ${validationResult.isValid ? '通过' : '失败'}, 分数: ${validationResult.validationScore}`);

    } catch (error) {
      validationResult.isValid = false;
      validationResult.errors.push(`验证过程出错: ${error.message}`);
      console.error('网络验证失败:', error);
    }

    return validationResult;
  }

  /**
   * 验证角色数据完整性
   * @param {Object} bloodlineNetwork - 血缘网络
   * @param {Object} validationResult - 验证结果
   */
  _validateCharacterData(bloodlineNetwork, validationResult) {
    const characters = bloodlineNetwork.allCharacters;
    
    characters.forEach(character => {
      // 必需字段检查
      if (!character.characterId) {
        validationResult.errors.push(`角色缺少ID: ${character.name || '未知'}`);
      }
      
      if (!character.name && !character.characterId) {
        validationResult.errors.push(`角色缺少姓名和ID`);
      }
      
      if (!character.gender || !['男', '女'].includes(character.gender)) {
        validationResult.errors.push(`角色性别无效: ${character.characterId}`);
      }
      
      if (typeof character.age !== 'number' || character.age < 0 || character.age > 100) {
        validationResult.errors.push(`角色年龄无效: ${character.characterId} - ${character.age}`);
      }
      
      if (!character.socialClass) {
        validationResult.warnings.push(`角色缺少社会等级: ${character.characterId}`);
      }
    });

    validationResult.details.characterValidation = {
      totalCharacters: characters.length,
      validCharacters: characters.filter(c => c.characterId && c.gender && typeof c.age === 'number').length
    };
  }

  /**
   * 验证关系数据一致性
   * @param {Object} bloodlineNetwork - 血缘网络
   * @param {Object} validationResult - 验证结果
   */
  _validateRelationshipConsistency(bloodlineNetwork, validationResult) {
    const relations = bloodlineNetwork.allRelations;
    const characters = bloodlineNetwork.allCharacters;
    const characterIds = new Set(characters.map(c => c.characterId));

    relations.forEach(relation => {
      // 检查关系中的角色ID是否存在
      if (relation.character1Id && !characterIds.has(relation.character1Id)) {
        validationResult.errors.push(`关系引用不存在的角色: ${relation.character1Id}`);
      }
      
      if (relation.character2Id && !characterIds.has(relation.character2Id)) {
        validationResult.errors.push(`关系引用不存在的角色: ${relation.character2Id}`);
      }
      
      if (relation.husbandId && !characterIds.has(relation.husbandId)) {
        validationResult.errors.push(`婚姻关系引用不存在的丈夫: ${relation.husbandId}`);
      }
      
      if (relation.wifeId && !characterIds.has(relation.wifeId)) {
        validationResult.errors.push(`婚姻关系引用不存在的妻子: ${relation.wifeId}`);
      }
      
      // 检查关系类型是否有效
      if (!relation.relationType) {
        validationResult.warnings.push(`关系缺少类型: ${relation.relationId}`);
      }
    });

    validationResult.details.relationshipValidation = {
      totalRelations: relations.length,
      validRelations: relations.filter(r => r.relationId && r.relationType).length
    };
  }

  /**
   * 验证年龄逻辑性
   * @param {Object} bloodlineNetwork - 血缘网络
   * @param {Object} validationResult - 验证结果
   */
  _validateAgeLogic(bloodlineNetwork, validationResult) {
    const relations = bloodlineNetwork.allRelations;
    const characters = bloodlineNetwork.allCharacters;
    const characterMap = new Map(characters.map(c => [c.characterId, c]));

    relations.forEach(relation => {
      if (relation.relationType === 'blood_relation') {
        const char1 = characterMap.get(relation.character1Id);
        const char2 = characterMap.get(relation.character2Id);
        
        if (char1 && char2) {
          this._validateRelationshipAgeLogic(char1, char2, relation, validationResult);
        }
      }
    });

    validationResult.details.ageValidation = {
      checkedRelations: relations.filter(r => r.relationType === 'blood_relation').length
    };
  }

  /**
   * 验证具体关系的年龄逻辑
   * @param {Object} char1 - 角色1
   * @param {Object} char2 - 角色2
   * @param {Object} relation - 关系
   * @param {Object} validationResult - 验证结果
   */
  _validateRelationshipAgeLogic(char1, char2, relation, validationResult) {
    const ageDiff = char1.age - char2.age;
    
    if (relation.relation1to2 === 'father' || relation.relation1to2 === 'mother') {
      // 父母应该比子女大15-50岁
      if (ageDiff < 15) {
        validationResult.warnings.push(`父母年龄差过小: ${char1.characterId} vs ${char2.characterId} (${ageDiff}岁)`);
      }
      if (ageDiff > 50) {
        validationResult.warnings.push(`父母年龄差过大: ${char1.characterId} vs ${char2.characterId} (${ageDiff}岁)`);
      }
    }
    
    if (relation.relation1to2 === 'grandfather' || relation.relation1to2 === 'grandmother') {
      // 祖父母应该比孙辈大40-70岁
      if (ageDiff < 40) {
        validationResult.warnings.push(`祖孙年龄差过小: ${char1.characterId} vs ${char2.characterId} (${ageDiff}岁)`);
      }
    }
    
    if (relation.relation1to2 === 'spouse') {
      // 夫妻年龄差不应超过15岁
      if (Math.abs(ageDiff) > 15) {
        validationResult.warnings.push(`夫妻年龄差过大: ${char1.characterId} vs ${char2.characterId} (${Math.abs(ageDiff)}岁)`);
      }
    }
  }

  /**
   * 验证婚姻规则
   * @param {Object} bloodlineNetwork - 血缘网络
   * @param {Object} validationResult - 验证结果
   */
  _validateMarriageRules(bloodlineNetwork, validationResult) {
    const characters = bloodlineNetwork.allCharacters;
    const marriedCharacters = characters.filter(c => c.marriageStatus === 'married');
    
    marriedCharacters.forEach(character => {
      if (!character.spouseId) {
        validationResult.warnings.push(`已婚角色缺少配偶ID: ${character.characterId}`);
      }
      
      const spouse = characters.find(c => c.characterId === character.spouseId);
      if (!spouse) {
        validationResult.errors.push(`找不到配偶: ${character.characterId} -> ${character.spouseId}`);
      } else if (spouse.spouseId !== character.characterId) {
        validationResult.errors.push(`配偶关系不对称: ${character.characterId} <-> ${spouse.characterId}`);
      }
    });

    validationResult.details.marriageValidation = {
      marriedCharacters: marriedCharacters.length,
      validMarriages: marriedCharacters.filter(c => c.spouseId).length / 2 // 除以2因为每个婚姻计算了两次
    };
  }

  /**
   * 验证家族结构合理性
   * @param {Object} bloodlineNetwork - 血缘网络
   * @param {Object} validationResult - 验证结果
   */
  _validateFamilyStructure(bloodlineNetwork, validationResult) {
    const familyTrees = bloodlineNetwork.familyTrees;
    
    familyTrees.forEach(family => {
      // 检查家族规模是否合理
      if (family.totalMembers < 1) {
        validationResult.errors.push(`家族成员数量异常: ${family.familyName}`);
      }
      
      if (family.totalMembers > 20) {
        validationResult.warnings.push(`家族规模过大: ${family.familyName} (${family.totalMembers}人)`);
      }
      
      // 检查世代结构是否合理
      if (family.generations.generationCount < 1) {
        validationResult.warnings.push(`家族缺少有效世代: ${family.familyName}`);
      }
    });

    validationResult.details.familyStructureValidation = {
      totalFamilies: familyTrees.length,
      avgFamilySize: Math.round(familyTrees.reduce((sum, f) => sum + f.totalMembers, 0) / familyTrees.length * 10) / 10
    };
  }

  /**
   * 计算验证分数
   * @param {Object} validationResult - 验证结果
   * @returns {number} 验证分数
   */
  _calculateValidationScore(validationResult) {
    let score = 100;
    
    // 错误扣分
    score -= validationResult.errors.length * 20;
    
    // 警告扣分
    score -= validationResult.warnings.length * 5;
    
    // 确保分数在0-100范围内
    return Math.max(0, Math.min(100, score));
  }

/**
 * 存储血缘关系到FamilySystem (适配两种模式)
 * @param {Array} characters - 角色列表
 * @param {Object} networkData - 网络数据 (refugee模式的familyNetwork 或 population模式的结果)
 */
_storeBloodRelationsToFamilySystem(characters, networkData) {
  if (!this.gameEngine?.familySystem) {
    console.warn('FamilySystem不可用，跳过血缘关系存储');
    return;
  }
  
  // 检查数据来源类型
  if (networkData.bloodlineNetwork?.familyTrees) {
    // refugee模式：使用完整的家族树数据
    this._storeFromFamilyTrees(networkData.bloodlineNetwork.familyTrees);
  } else if (networkData.relationIndex || networkData.bloodRelations) {
    // population模式：基于关系索引或血缘关系Map
    this._storeFromRelationData(characters, networkData);
  } else {
    console.warn('未识别的网络数据格式');
    // 兜底方案：直接传递给FamilySystem处理
    this.gameEngine.familySystem.storeBloodRelationsFromService(characters, networkData);
  }
  //console.log('✅ 血缘关系数据已传递给FamilySystem');
}

_storeFromFamilyTrees(familyTrees) {
  familyTrees.forEach(familyTree => {
    const characters = familyTree.allMembers || familyTree.members || [];  // 家族全部members
    
    // 从familyTree中提取血缘关系数据
    const bloodRelations = familyTree.relationships || [];
    
    this.gameEngine.familySystem.storeBloodRelationsFromService(
      characters, 
      { bloodRelations: bloodRelations }
    );
  });
}

/**
 * 从家族树中提取角色列表
 * @param {Object} familyTree - 家族树对象
 * @returns {Array} 角色列表
 */
_extractCharactersFromFamilyTree(familyTree) {
  // 直接使用members字段
  return familyTree.members || [];
}


_storeFromRelationData(characters, networkData) {
  const familyGroups = this._groupCharactersByFamily(characters);
  const relations = networkData.relationIndex || networkData.bloodRelations;
  
  familyGroups.forEach((familyMembers, familyName) => {
    const familyBloodRelations = [];
    
    // 提取该家族的血缘关系
    familyMembers.forEach(member => {
      if (relations.has && relations.has(member.characterId)) {
        familyBloodRelations.push(...relations.get(member.characterId));
      }
    });
    
    this.gameEngine.familySystem.storeBloodRelationsFromService(
      familyMembers, 
      { bloodRelations: familyBloodRelations }
    );
  });
}


/**
 * 按家族分组角色
 * @param {Array} characters - 角色列表
 * @returns {Map} 家族分组Map
 */
_groupCharactersByFamily(characters) {
  const familyGroups = new Map();
  
  characters.forEach(character => {
    const familyName = character.familyName || character.originalFamily || 'unknown';
    
    if (!familyGroups.has(familyName)) {
      familyGroups.set(familyName, []);
    }
    familyGroups.get(familyName).push(character);
  });
  
  return familyGroups;
}


  // ==================== 统计与分析 ====================

  /**
   * 生成网络统计信息
   * @param {Array} detailedFamilyUnits - 详细家族单元
   * @param {Array} crossUnitRelations - 跨单元关系
   * @returns {Object} 统计信息
   */
  _generateNetworkStatistics(detailedFamilyUnits, crossUnitRelations) {
    const allCharacters = this._collectAllCharacters(detailedFamilyUnits);
    const allRelations = this._collectAllRelations(detailedFamilyUnits, crossUnitRelations);
    
    return {
      // 基本统计
      totalCharacters: allCharacters.length,
      totalRelations: allRelations.length,
      totalFamilyUnits: detailedFamilyUnits.length,
      crossUnitMarriages: crossUnitRelations.length,
      
      // 详细分布
      genderDistribution: this._calculateGenderDistribution(allCharacters),
      ageDistribution: this._calculateAgeDistribution(allCharacters),
      socialClassDistribution: this._calculateClassDistribution(allCharacters),
      unitTypeDistribution: this._calculateUnitTypeDistribution(detailedFamilyUnits),
      
      // 关系统计
      relationshipStats: this._calculateRelationshipStats(allRelations),
      
      // 网络特征
      networkCharacteristics: this._calculateNetworkCharacteristics(allCharacters, allRelations),
      
      // 生成时间
      generatedAt: Date.now()
    };
  }

  /**
   * 计算性别分布
   * @param {Array} characters - 角色列表
   * @returns {Object} 性别分布
   */
  _calculateGenderDistribution(characters) {
    const male = characters.filter(c => c.gender === '男').length;
    const female = characters.filter(c => c.gender === '女').length;
    const total = characters.length;
    
    return {
      male: male,
      female: female,
      total: total,
      maleRatio: Math.round(male / total * 100),
      femaleRatio: Math.round(female / total * 100)
    };
  }

  /**
   * 计算年龄分布
   * @param {Array} characters - 角色列表
   * @returns {Object} 年龄分布
   */
  _calculateAgeDistribution(characters) {
    const children = characters.filter(c => c.age < 18).length;
    const youngAdults = characters.filter(c => c.age >= 18 && c.age < 35).length;
    const middleAged = characters.filter(c => c.age >= 35 && c.age < 60).length;
    const elderly = characters.filter(c => c.age >= 60).length;
    
    return {
      children: children,
      youngAdults: youngAdults,
      middleAged: middleAged,
      elderly: elderly,
      avgAge: Math.round(characters.reduce((sum, c) => sum + c.age, 0) / characters.length * 10) / 10,
      medianAge: this._calculateMedianAge(characters)
    };
  }

  /**
   * 计算年龄中位数
   * @param {Array} characters - 角色列表
   * @returns {number} 年龄中位数
   */
  _calculateMedianAge(characters) {
    const ages = characters.map(c => c.age).sort((a, b) => a - b);
    const mid = Math.floor(ages.length / 2);
    
    return ages.length % 2 === 0 ? 
           (ages[mid - 1] + ages[mid]) / 2 : 
           ages[mid];
  }

  /**
   * 计算关系统计
   * @param {Array} relations - 关系列表
   * @returns {Object} 关系统计
   */
  _calculateRelationshipStats(relations) {
    const bloodRelations = relations.filter(r => r.relationType === 'blood_relation');
    const marriages = relations.filter(r => r.relationType === 'cross_unit_marriage');
    
    const relationTypes = {};
    bloodRelations.forEach(relation => {
      const type = relation.relation1to2;
      relationTypes[type] = (relationTypes[type] || 0) + 1;
    });
    
    return {
      totalBloodRelations: bloodRelations.length,
      totalMarriages: marriages.length,
      relationTypeBreakdown: relationTypes,
      avgIntimacy: this._calculateAvgIntimacy(bloodRelations)
    };
  }

  /**
   * 计算平均亲密度
   * @param {Array} relations - 关系列表
   * @returns {number} 平均亲密度
   */
  _calculateAvgIntimacy(relations) {
    if (relations.length === 0) return 0;
    
    const totalIntimacy = relations.reduce((sum, r) => sum + (r.intimacy || 0), 0);
    return Math.round(totalIntimacy / relations.length * 10) / 10;
  }

  /**
   * 计算网络特征
   * @param {Array} characters - 角色列表
   * @param {Array} relations - 关系列表
   * @returns {Object} 网络特征
   */
  _calculateNetworkCharacteristics(characters, relations) {
    return {
      density: this._calculateNetworkDensity(characters, relations),
      connectivity: this._calculateConnectivity(characters, relations),
      avgDegree: this._calculateAvgDegree(characters, relations),
      isolatedNodes: this._countIsolatedNodes(characters, relations)
    };
  }

  /**
   * 计算网络密度
   * @param {Array} characters - 角色列表
   * @param {Array} relations - 关系列表
   * @returns {number} 网络密度
   */
  _calculateNetworkDensity(characters, relations) {
    const n = characters.length;
    const maxPossibleEdges = n * (n - 1) / 2;
    const actualEdges = relations.length;
    
    return maxPossibleEdges > 0 ? 
           Math.round(actualEdges / maxPossibleEdges * 100) : 0;
  }

  /**
   * 计算连通性
   * @param {Array} characters - 角色列表
   * @param {Array} relations - 关系列表
   * @returns {number} 连通性分数
   */
  _calculateConnectivity(characters, relations) {
    const connectedCharacters = new Set();
    
    relations.forEach(relation => {
      if (relation.character1Id) connectedCharacters.add(relation.character1Id);
      if (relation.character2Id) connectedCharacters.add(relation.character2Id);
      if (relation.husbandId) connectedCharacters.add(relation.husbandId);
      if (relation.wifeId) connectedCharacters.add(relation.wifeId);
    });
    
    return Math.round(connectedCharacters.size / characters.length * 100);
  }

  /**
   * 计算平均度数
   * @param {Array} characters - 角色列表
   * @param {Array} relations - 关系列表
   * @returns {number} 平均度数
   */
  _calculateAvgDegree(characters, relations) {
    const degrees = new Map();
    
    characters.forEach(character => {
      degrees.set(character.characterId, 0);
    });
    
    relations.forEach(relation => {
      if (relation.character1Id) {
        degrees.set(relation.character1Id, (degrees.get(relation.character1Id) || 0) + 1);
      }
      if (relation.character2Id) {
        degrees.set(relation.character2Id, (degrees.get(relation.character2Id) || 0) + 1);
      }
      if (relation.husbandId) {
        degrees.set(relation.husbandId, (degrees.get(relation.husbandId) || 0) + 1);
      }
      if (relation.wifeId) {
        degrees.set(relation.wifeId, (degrees.get(relation.wifeId) || 0) + 1);
      }
    });
    
    const totalDegree = Array.from(degrees.values()).reduce((sum, degree) => sum + degree, 0);
    return Math.round(totalDegree / characters.length * 10) / 10;
  }

  /**
   * 计算孤立节点数量
   * @param {Array} characters - 角色列表
   * @param {Array} relations - 关系列表
   * @returns {number} 孤立节点数量
   */
  _countIsolatedNodes(characters, relations) {
    const connectedCharacters = new Set();
    
    relations.forEach(relation => {
      if (relation.character1Id) connectedCharacters.add(relation.character1Id);
      if (relation.character2Id) connectedCharacters.add(relation.character2Id);
      if (relation.husbandId) connectedCharacters.add(relation.husbandId);
      if (relation.wifeId) connectedCharacters.add(relation.wifeId);
    });
    
    return characters.length - connectedCharacters.size;
  }

  
}
