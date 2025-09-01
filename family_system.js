/**
 * family_system.js - 南北朝坞堡模拟器家族血缘关系系统（重构版）
 * 
 * 功能：专注于血缘关系和家族结构管理
 * 特点：只处理血缘称谓、辈分关系、家族结构，不涉及情感或社会身份
 * 
 * 架构定位：三层关系架构的第一层（血缘关系层）
 * - 第一层：血缘关系（FamilySystem）← 当前模块
 * - 第二层：社会身份（SocialIdentitySystem）
 * - 第三层：情感关系（EmotionalRelationshipSystem）
 * 
 * 重构变化：
 * ✅ 移除所有非血缘关系的判断逻辑
 * ✅ 专注于血缘称谓和家族结构
 * ✅ 提供纯粹的血缘关系查询接口
 * ✅ 支持五代同堂的复杂血缘网络
 */

import { Utils } from './utils_module.js';
import { DEFAULT_CONFIG } from './gameConfig.js';

/**
 * 血缘关系类型（纯血缘，无情感或身份混合）
 */
export const BloodRelationType = {
  // 直系血亲
  ANCESTOR: 'ancestor',           // 祖先
  DESCENDANT: 'descendant',       // 后代
  
  // 平辈关系
  SIBLING: 'sibling',            // 兄弟姐妹
  COUSIN: 'cousin',              // 堂表兄弟姐妹
  
  // 配偶关系（血缘法律关系）
  SPOUSE: 'spouse',              // 配偶
  
  // 姻亲关系
  IN_LAW: 'in_law',              // 姻亲
  
  // 旁系血亲
  UNCLE_AUNT: 'uncle_aunt',      // 叔伯姑舅
  NEPHEW_NIECE: 'nephew_niece',  // 侄甥
  
  // 无血缘关系
  NO_RELATION: 'no_relation'     // 无血缘关系
};

/**
 * 血缘关系称谓映射
 */
export const BloodRelationTitles = {
  // 直系上级称谓（晚辈称呼长辈）
  ancestor_titles: {
    1: { male: '父亲', female: '母亲' },
    2: { male: '祖父', female: '祖母' },
    3: { male: '曾祖父', female: '曾祖母' },
    4: { male: '高祖父', female: '高祖母' }
  },
  
  // 直系下级称谓（长辈称呼晚辈）
  descendant_titles: {
    1: { male: '儿子', female: '女儿' },
    2: { male: '孙子', female: '孙女' },
    3: { male: '曾孙', female: '曾孙女' },
    4: { male: '玄孙', female: '玄孙女' }
  },
  
  // 平辈称谓
  sibling_titles: {
    older: { male: '兄长', female: '姐姐' },
    younger: { male: '弟弟', female: '妹妹' }
  },
  
  // 旁系称谓
  collateral_titles: {
    uncle_aunt: {
      father_side: {
        older: { male: '伯父', female: '伯母' },
        younger: { male: '叔父', female: '叔母' }
      },
      mother_side: {
        male: '舅父', 
        female: '舅母'
      }
    },
    cousin_titles: {
      older: { male: '堂兄', female: '堂姐' },
      younger: { male: '堂弟', female: '堂妹' }
    }
  },
  
  // 配偶称谓
  spouse_titles: {
    male: '夫君',
    female: '妻子'
  }
};

/**
 * 家族血缘关系系统
 */
class FamilySystem {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    
    // 家族数据存储
    this.families = new Map();           // 家族数据
    this.bloodRelations = new Map();     // 血缘关系映射
    this.familyTrees = new Map();        // 家族树结构
    
    // 血缘关系配置
    this.generationConfig = this._initGenerationConfig();
    this.kinshipTitles = BloodRelationTitles;
    
    // 家族命名初始化
    this.familyNames = null;
    
    console.log('✅ FamilySystem 血缘关系系统初始化完成');
  }


  /**
   * 从CSV加载家族姓氏配置
   */
  async loadConfigurations(dataTableManager) {
    try {
      const csvData = await dataTableManager.getCharacterNamesConfig();
      
      // 提取所有unique的surname
      const surnameSet = new Set();
      csvData.forEach(row => {
        if (row.surname) {
          surnameSet.add(row.surname);
        }
      });
      
      this.familyNames = Array.from(surnameSet);
      console.log(`✅ FamilySystem加载到 ${this.familyNames.length} 个姓氏`);
      
    } catch (error) {
      console.warn('⚠️ FamilySystem配置加载失败，使用备用姓氏:', error);
      this.familyNames = ['王', '李', '张', '刘', '陈']; // 备用方案
    }
  }

  /**
   * 从已加载的姓氏中随机选择一个
   */
  _selectRandomSurname() {
    if (!this.familyNames || this.familyNames.length === 0) {
      console.warn('⚠️ 姓氏数据未加载，使用默认姓氏');
      return '李'; // 默认姓氏
    }
    
    const randomIndex = Math.floor(Math.random() * this.familyNames.length);
    return this.familyNames[randomIndex];
  }
  

  /**
   * 创建五代同堂家族
   * @param {string} familyName - 家族姓氏
   * @param {number} targetSize - 目标人数
   * @param {string} familyType - 家族类型
   * @returns {Object} 家族结构
   */
  createFiveGenerationFamily(familyName, targetSize = 8, familyType = 'balanced') {
    const familyId = `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建家族结构
    const familyStructure = {
      id: familyId,
      familyName: familyName,
      familyType: familyType,
      createdAt: Date.now(),
      
      // 五代成员
      generations: {
        first: [],    // 高祖辈
        second: [],   // 曾祖辈  
        third: [],    // 祖辈
        fourth: [],   // 父母辈
        fifth: []     // 子女辈
      },
      
      // 血缘关系网络
      bloodRelations: new Map(),
      
      // 家族统计
      totalMembers: 0,
      familyHead: null,
      familyReputation: 50
    };

    // 按概率生成各代成员
    this._generateFamilyMembers(familyStructure, targetSize);
    
    // 建立血缘关系网络
    this._establishBloodRelationships(familyStructure);
    
    // 设定家族族长
    this._assignFamilyHead(familyStructure);
    
    // 存储家族数据
    this.families.set(familyName, familyStructure);
    this.familyTrees.set(familyName, this._buildFamilyTree(familyStructure));
    
    // 记录创建日志
    this._logFamilyCreation(familyStructure);

    // 将所有世代成员合并到 members 数组中  
    familyStructure.members = [];
    Object.values(familyStructure.generations).forEach(generation => {
      familyStructure.members.push(...generation);
    });
    
    return familyStructure;
  }

  /**
   * 生成家族成员
   * @param {Object} familyStructure - 家族结构
   * @param {number} targetSize - 目标人数
   */
  _generateFamilyMembers(familyStructure, targetSize) {
    const { generations } = familyStructure;
    let memberCount = 0;
    
    // 按代数和角色生成成员
    Object.entries(this.generationConfig).forEach(([role, config]) => {
      if (memberCount >= targetSize) return;
      
      // 根据概率决定是否生成该角色
      if (Math.random() < config.probability) {
        const member = this._createFamilyMember(familyStructure.familyName, {
          role: role,
          config: config,
          age: Utils.Math.randomInt(config.minAge, config.maxAge)
        }, this._getGenerationKey(config.generation), memberCount);
        
        // 分配到对应的代
        const generationKey = this._getGenerationKey(config.generation);
        generations[generationKey].push(member);
        
        memberCount++;
      }
    });
    
    familyStructure.totalMembers = memberCount;
  }

  /**
   * 创建家族成员数据（不创建角色对象）
   */
  _createFamilyMember(familyName, memberPlan, generation, index) {
    const { role, config, age } = memberPlan;
    // 使用传递进来的surname（从createFamily传递）
    const familyStructure = this.families.get(familyName);
    const surname = familyStructure ? familyStructure.surname : familyName.replace(/[家氏族]$/, '');


    // 通过NameGenerator生成真正的姓名
    let memberName = surname + '郎'; // 默认值，用姓氏而不是familyName
    
    if (this.gameEngine && this.gameEngine.nameGenerator) {
      try {
        const nameResult = this.gameEngine.nameGenerator.generateName({
          gender: config.gender,
          socialClass: '门阀士族',
          surname: surname,
          generation: config.generation,
          role: role
        });
        memberName = nameResult.fullName;
      } catch (error) {
        console.warn('姓名生成失败，使用默认值:', error);
        memberName = familyName + (config.gender === '男' ? '郎' : '娘');
      }
    }
    
    return {
      id: `${familyName}_member_${index}`,
      name: memberName,
      surname: nameResult.surname,
      age: age,
      gender: config.gender,
      role: role,
      generation: config.generation,
      familyName: familyName,
      bloodRelations: new Map(),
      familyStatus: {
        generation: config.generation,
        seniority: age,
        authority: config.generation <= 3 ? 80 : 50
      }
    };
  }

  /**
   * 建立血缘关系网络
   * @param {Object} familyStructure - 家族结构
   */
  _establishBloodRelationships(familyStructure) {
    const { generations, bloodRelations } = familyStructure;
    
    // 1. 建立直系血亲关系（祖孙关系）
    this._establishDirectLineage(generations, bloodRelations);
    
    // 2. 建立配偶关系
    this._establishSpouseRelationships(generations, bloodRelations);
    
    // 3. 建立兄弟姐妹关系
    this._establishSiblingRelationships(generations, bloodRelations);
    
    // 4. 建立旁系血亲关系（叔侄等）
    this._establishCollateralRelationships(generations, bloodRelations);
    
    // 存储到系统级血缘关系映射
    this.bloodRelations.set(familyStructure.familyName, bloodRelations);
  }

  /**
   * 建立直系血亲关系
   * @param {Object} generations - 各代成员
   * @param {Map} bloodRelations - 血缘关系映射
   */
  _establishDirectLineage(generations, bloodRelations) {
    const genArray = [
      generations.first,
      generations.second, 
      generations.third,
      generations.fourth,
      generations.fifth
    ];
    
    // 建立上下代之间的直系血亲关系
    for (let i = 0; i < genArray.length - 1; i++) {
      const upperGen = genArray[i];
      const lowerGen = genArray[i + 1];
      
      upperGen.forEach(ancestor => {
        lowerGen.forEach(descendant => {
          // 创建祖先-后代关系
          this._setBloodRelation(
            bloodRelations,
            ancestor,
            descendant,
            BloodRelationType.ANCESTOR,
            i + 1  // 代数差
          );
          
          // 创建后代-祖先关系
          this._setBloodRelation(
            bloodRelations,
            descendant,
            ancestor,
            BloodRelationType.DESCENDANT,
            i + 1  // 代数差
          );
        });
      });
    }
  }

  /**
   * 建立配偶关系
   * @param {Object} generations - 各代成员
   * @param {Map} bloodRelations - 血缘关系映射
   */
  _establishSpouseRelationships(generations, bloodRelations) {
    // 各代的配偶配对模式
    const spousePatterns = [
      { gen: 'first', pairs: [['great_great_grandfather', 'great_great_grandmother']] },
      { gen: 'second', pairs: [['great_grandfather', 'great_grandmother']] },
      { gen: 'third', pairs: [['grandfather', 'grandmother']] },
      { gen: 'fourth', pairs: [['father', 'mother']] }
    ];
    
    spousePatterns.forEach(({ gen, pairs }) => {
      const generationMembers = generations[gen];
      
      pairs.forEach(([maleRole, femaleRole]) => {
        const husband = generationMembers.find(m => m.role === maleRole);
        const wife = generationMembers.find(m => m.role === femaleRole);
        
        if (husband && wife) {
          // 建立配偶关系（双向）
          this._setBloodRelation(bloodRelations, husband, wife, BloodRelationType.SPOUSE, 0);
          this._setBloodRelation(bloodRelations, wife, husband, BloodRelationType.SPOUSE, 0);
        }
      });
    });
  }

  /**
   * 建立兄弟姐妹关系
   * @param {Object} generations - 各代成员
   * @param {Map} bloodRelations - 血缘关系映射
   */
  _establishSiblingRelationships(generations, bloodRelations) {
    Object.values(generations).forEach(generationMembers => {
      // 同代成员之间建立兄弟姐妹关系
      for (let i = 0; i < generationMembers.length; i++) {
        for (let j = i + 1; j < generationMembers.length; j++) {
          const member1 = generationMembers[i];
          const member2 = generationMembers[j];
          
          // 排除配偶关系
          if (this._isSpousePair(member1.role, member2.role)) {
            continue;
          }
          
          // 建立兄弟姐妹关系（双向）
          this._setBloodRelation(bloodRelations, member1, member2, BloodRelationType.SIBLING, 0);
          this._setBloodRelation(bloodRelations, member2, member1, BloodRelationType.SIBLING, 0);
        }
      }
    });
  }

  /**
   * 建立旁系血亲关系
   * @param {Object} generations - 各代成员
   * @param {Map} bloodRelations - 血缘关系映射
   */
  _establishCollateralRelationships(generations, bloodRelations) {
    // 叔侄关系：第四代（叔伯）与第五代（侄甥）
    const unclesAunts = generations.fourth?.filter(m => 
      ['uncle', 'aunt'].includes(m.role)
    ) || [];
    
    const nephewsNieces = generations.fifth || [];
    
    unclesAunts.forEach(uncleAunt => {
      nephewsNieces.forEach(nephewNiece => {
        // 叔伯-侄甥关系
        this._setBloodRelation(
          bloodRelations,
          uncleAunt,
          nephewNiece,
          BloodRelationType.UNCLE_AUNT,
          1
        );
        
        // 侄甥-叔伯关系
        this._setBloodRelation(
          bloodRelations,
          nephewNiece,
          uncleAunt,
          BloodRelationType.NEPHEW_NIECE,
          1
        );
      });
    });
  }

  /**
   * 设置血缘关系
   * @param {Map} bloodRelations - 血缘关系映射
   * @param {Object} person1 - 第一个人
   * @param {Object} person2 - 第二个人
   * @param {string} relationType - 血缘关系类型
   * @param {number} generationGap - 代数差距
   */
  _setBloodRelation(bloodRelations, person1, person2, relationType, generationGap = 0) {
    const relationKey = `${person1.id}_${person2.id}`;
    
    const relationData = {
      fromId: person1.id,
      toId: person2.id,
      fromPerson: person1,
      toPerson: person2,
      bloodRelationType: relationType,
      generationGap: generationGap,
      establishedAt: Date.now(),
      
      // 血缘关系强度（纯血缘，不含情感）
      bloodlineStrength: this._calculateBloodlineStrength(relationType, generationGap)
    };
    
    // 存储血缘关系
    bloodRelations.set(relationKey, relationData);
    
    // 同时添加到个人的血缘关系列表
    person1.bloodRelations.set(person2.id, relationData);
  }

  /**
   * 计算血缘关系强度
   * @param {string} relationType - 关系类型
   * @param {number} generationGap - 代数差
   * @returns {number} 血缘强度
   */
  _calculateBloodlineStrength(relationType, generationGap) {
    const baseStrengths = {
      [BloodRelationType.SPOUSE]: 90,
      [BloodRelationType.SIBLING]: 85,
      [BloodRelationType.ANCESTOR]: 80 - (generationGap * 10),
      [BloodRelationType.DESCENDANT]: 80 - (generationGap * 10),
      [BloodRelationType.UNCLE_AUNT]: 60,
      [BloodRelationType.NEPHEW_NIECE]: 60,
      [BloodRelationType.COUSIN]: 50,
      [BloodRelationType.IN_LAW]: 40
    };
    
    return Math.max(10, baseStrengths[relationType] || 10);
  }

  /**
   * 计算家族辈分
   * @param {number} generation - 世代数
   * @param {number} age - 年龄
   * @returns {number} 辈分权重
   */
  _calculateSeniority(generation, age) {
    // 世代越高，年龄越大，辈分越高
    return (6 - generation) * 20 + age * 0.5;
  }

  /**
   * 计算家族权威
   * @param {string} role - 角色
   * @param {number} generation - 世代数
   * @returns {number} 权威等级
   */
  _calculateAuthority(role, generation) {
    const roleAuthority = {
      'great_great_grandfather': 100,
      'great_great_grandmother': 95,
      'great_grandfather': 90,
      'great_grandmother': 85,
      'grandfather': 80,
      'grandmother': 75,
      'father': 70,
      'mother': 65,
      'uncle': 60,
      'aunt': 55,
      'son': 40,
      'daughter': 35
    };
    
    return roleAuthority[role] || (100 - generation * 10);
  }

  /**
   * 获取血缘关系称谓
   * @param {string} familyName - 家族名
   * @param {string} fromCharId - 询问者ID
   * @param {string} toCharId - 被询问者ID
   * @returns {Object|null} 血缘关系信息
   */
  getKinship(familyName, fromCharId, toCharId) {
    if (fromCharId === toCharId) {
      return { title: '自己', type: 'self', strength: 100 };
    }
    
    const familyBloodRelations = this.bloodRelations.get(familyName);
    if (!familyBloodRelations) {
      return null;
    }
    
    const relationKey = `${fromCharId}_${toCharId}`;
    const bloodRelation = familyBloodRelations.get(relationKey);
    
    if (!bloodRelation) {
      return { title: '族人', type: BloodRelationType.NO_RELATION, strength: 0 };
    }
    
    // 获取血缘称谓
    const title = this._getBloodRelationTitle(bloodRelation);
    
    return {
      title: title,
      type: bloodRelation.bloodRelationType,
      strength: bloodRelation.bloodlineStrength,
      generationGap: bloodRelation.generationGap,
      establishedAt: bloodRelation.establishedAt
    };
  }

  /**
   * 获取血缘关系称谓
   * @param {Object} bloodRelation - 血缘关系数据
   * @returns {string} 称谓
   */
  _getBloodRelationTitle(bloodRelation) {
    const { bloodRelationType, generationGap, fromPerson, toPerson } = bloodRelation;
    
    switch (bloodRelationType) {
      case BloodRelationType.SPOUSE:
        return this.kinshipTitles.spouse_titles[toPerson.gender === '男' ? 'male' : 'female'];
        
      case BloodRelationType.ANCESTOR:
        const ancestorTitle = this.kinshipTitles.ancestor_titles[generationGap];
        return ancestorTitle ? ancestorTitle[toPerson.gender === '男' ? 'male' : 'female'] : '祖先';
        
      case BloodRelationType.DESCENDANT:
        const descendantTitle = this.kinshipTitles.descendant_titles[generationGap];
        return descendantTitle ? descendantTitle[toPerson.gender === '男' ? 'male' : 'female'] : '后代';
        
      case BloodRelationType.SIBLING:
        const isOlder = toPerson.age > fromPerson.age;
        const siblingCategory = isOlder ? 'older' : 'younger';
        return this.kinshipTitles.sibling_titles[siblingCategory][toPerson.gender === '男' ? 'male' : 'female'];
        
      case BloodRelationType.UNCLE_AUNT:
        return toPerson.gender === '男' ? '叔父' : '姑母';
        
      case BloodRelationType.NEPHEW_NIECE:
        return toPerson.gender === '男' ? '侄子' : '侄女';
        
      case BloodRelationType.COUSIN:
        const isOlderCousin = toPerson.age > fromPerson.age;
        const cousinCategory = isOlderCousin ? 'older' : 'younger';
        return this.kinshipTitles.collateral_titles.cousin_titles[cousinCategory][toPerson.gender === '男' ? 'male' : 'female'];
        
      default:
        return '族人';
    }
  }

  /**
   * 获取家族统计信息
   * @param {string} familyName - 家族名
   * @returns {Object|null} 统计信息
   */
  getFamilyStatistics(familyName) {
    const family = this.families.get(familyName);
    if (!family) return null;
    
    const stats = {
      familyName: familyName,
      totalMembers: family.totalMembers,
      generationCount: 0,
      generationBreakdown: {},
      averageAge: 0,
      oldestMember: null,
      youngestMember: null,
      familyHead: family.familyHead,
      bloodRelationsCount: family.bloodRelations.size,
      familyReputation: family.familyReputation
    };
    
    let totalAge = 0;
    let oldestAge = 0;
    let youngestAge = 100;
    
    // 统计各代信息
    Object.entries(family.generations).forEach(([genKey, members]) => {
      if (members.length > 0) {
        stats.generationCount++;
        stats.generationBreakdown[genKey] = {
          count: members.length,
          members: members.map(m => ({
            name: m.name,
            role: m.role,
            age: m.age,
            gender: m.gender
          }))
        };
        
        members.forEach(member => {
          totalAge += member.age;
          
          if (member.age > oldestAge) {
            oldestAge = member.age;
            stats.oldestMember = member;
          }
          
          if (member.age < youngestAge) {
            youngestAge = member.age;
            stats.youngestMember = member;
          }
        });
      }
    });
    
    stats.averageAge = Math.round(totalAge / family.totalMembers);
    
    return stats;
  }

  /**
   * 辅助方法：初始化代数配置
   */
  _initGenerationConfig() {
    return {
      // 第一代：高祖父母
      great_great_grandfather: { 
        generation: 1, minAge: 80, maxAge: 95, gender: '男',
        probability: 0.30, title: '高祖父'
      },
      great_great_grandmother: { 
        generation: 1, minAge: 78, maxAge: 92, gender: '女',
        probability: 0.25, title: '高祖母'
      },
      
      // 第二代：曾祖父母
      great_grandfather: { 
        generation: 2, minAge: 65, maxAge: 80, gender: '男',
        probability: 0.50, title: '曾祖父'
      },
      great_grandmother: { 
        generation: 2, minAge: 62, maxAge: 77, gender: '女',
        probability: 0.45, title: '曾祖母'
      },
      
      // 第三代：祖父母
      grandfather: { 
        generation: 3, minAge: 45, maxAge: 65, gender: '男',
        probability: 0.70, title: '祖父'
      },
      grandmother: { 
        generation: 3, minAge: 42, maxAge: 62, gender: '女',
        probability: 0.65, title: '祖母'
      },
      
      // 第四代：父母
      father: { 
        generation: 4, minAge: 25, maxAge: 45, gender: '男',
        probability: 0.95, title: '父亲'
      },
      mother: { 
        generation: 4, minAge: 22, maxAge: 42, gender: '女',
        probability: 0.90, title: '母亲'
      },
      uncle: { 
        generation: 4, minAge: 20, maxAge: 50, gender: '男',
        probability: 0.30, title: '叔父'
      },
      aunt: { 
        generation: 4, minAge: 18, maxAge: 48, gender: '女',
        probability: 0.25, title: '姑母'
      },
      
      // 第五代：子女
      son: { 
        generation: 5, minAge: 1, maxAge: 25, gender: '男',
        probability: 1.0, title: '儿子'
      },
      daughter: { 
        generation: 5, minAge: 1, maxAge: 25, gender: '女',
        probability: 1.0, title: '女儿'
      }
    };
  }

  /**
   * 辅助方法：获取代数键值
   */
  _getGenerationKey(generation) {
    const genMap = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth' };
    return genMap[generation] || 'fifth';
  }

  /**
   * 辅助方法：计算家族地位
   */
  _calculateFamilyStatus(generation, gender, role) {
    const baseStatus = {
      1: 95, 2: 90, 3: 80, 4: 70, 5: 50
    };
    
    let status = baseStatus[generation] || 50;
    
    // 族长加成
    if (['great_great_grandfather', 'great_grandfather', 'grandfather', 'father'].includes(role)) {
      status += 10;
    }
    
    return Math.min(100, status);
  }

  /**
   * 辅助方法：生成成员姓名
   */
  _generateMemberName(gender, familyName) {
    const maleNames = ['文', '武', '明', '华', '强', '军', '国', '建', '志', '勇'];
    const femaleNames = ['芳', '丽', '娟', '英', '华', '秀', '玲', '红', '梅', '霞'];
    
    const namePool = gender === '男' ? maleNames : femaleNames;
    const givenName = namePool[Math.floor(Math.random() * namePool.length)];
    
    return `${familyName}${givenName}`;
  }

  /**
   * 辅助方法：判断是否为配偶对
   */
  _isSpousePair(role1, role2) {
    const spousePairs = [
      ['great_great_grandfather', 'great_great_grandmother'],
      ['great_grandfather', 'great_grandmother'],
      ['grandfather', 'grandmother'],
      ['father', 'mother']
    ];
    
    return spousePairs.some(([male, female]) => 
      (role1 === male && role2 === female) || (role1 === female && role2 === male)
    );
  }

  /**
   * 辅助方法：分配家族族长
   */
  _assignFamilyHead(familyStructure) {
    const { generations } = familyStructure;
    
    // 优先选择最高辈分的男性
    for (const genKey of ['first', 'second', 'third', 'fourth']) {
      const males = generations[genKey]?.filter(m => m.gender === '男') || [];
      if (males.length > 0) {
        familyStructure.familyHead = males[0];
        return;
      }
    }
    
    // 如果没有男性，选择最高辈分的女性
    for (const genKey of ['first', 'second', 'third', 'fourth']) {
      const females = generations[genKey]?.filter(m => m.gender === '女') || [];
      if (females.length > 0) {
        familyStructure.familyHead = females[0];
        return;
      }
    }
  }

  /**
   * 辅助方法：计算代数排名
   */
  _calculateGenerationRank(generation, role) {
    const rankMap = {
      1: { great_great_grandfather: 1, great_great_grandmother: 2 },
      2: { great_grandfather: 1, great_grandmother: 2 },
      3: { grandfather: 1, grandmother: 2 },
      4: { father: 1, mother: 2, uncle: 3, aunt: 4 },
      5: { son: 1, daughter: 2 }
    };
    
    return rankMap[generation]?.[role] || 99;
  }

  /**
   * 辅助方法：构建家族树结构
   */
  _buildFamilyTree(familyStructure) {
    const tree = {
      familyName: familyStructure.familyName,
      root: familyStructure.familyHead,
      generations: {},
      relationships: familyStructure.bloodRelations
    };
    
    // 按代数组织家族树
    Object.entries(familyStructure.generations).forEach(([genKey, members]) => {
      tree.generations[genKey] = members.map(member => ({
        id: member.id,
        name: member.name,
        role: member.role,
        gender: member.gender,
        age: member.age,
        bloodlineTitle: member.bloodlineTitle
      }));
    });
    
    return tree;
  }

  /**
   * 辅助方法：记录家族创建日志
   */
  _logFamilyCreation(familyStructure) {
    console.log(`\n📊 ${familyStructure.familyName}家族血缘关系网络创建完成:`);
    console.log(`   总人数: ${familyStructure.totalMembers}人`);
    console.log(`   血缘关系: ${familyStructure.bloodRelations.size}条`);
    console.log(`   族长: ${familyStructure.familyHead?.name || '未设定'}`);
    
    const genNames = {
      first: '高祖辈', second: '曾祖辈', third: '祖辈',
      fourth: '父母辈', fifth: '子女辈'
    };
    
    Object.entries(familyStructure.generations).forEach(([genKey, members]) => {
      if (members.length > 0) {
        console.log(`   ${genNames[genKey]}: ${members.length}人`);
        members.forEach(member => {
          console.log(`     - ${member.name} (${member.age}岁, ${member.bloodlineTitle})`);
        });
      }
    });
  }

  /**
   * 获取家族所有成员
   * @param {string} familyName - 家族名
   * @returns {Array} 家族成员列表
   */
  getFamilyMembers(familyName) {
    const family = this.families.get(familyName);
    if (!family) return [];
    
    const allMembers = [];
    Object.values(family.generations).forEach(members => {
      allMembers.push(...members);
    });
    
    return allMembers.sort((a, b) => a.generation - b.generation || a.age - b.age);
  }

  /**
   * 获取指定角色的血缘关系列表
   * @param {string} familyName - 家族名
   * @param {string} characterId - 角色ID
   * @returns {Array} 血缘关系列表
   */
  getCharacterBloodRelations(familyName, characterId) {
    const familyBloodRelations = this.bloodRelations.get(familyName);
    if (!familyBloodRelations) return [];
    
    const relations = [];
    
    for (const [relationKey, relationData] of familyBloodRelations) {
      if (relationData.fromId === characterId) {
        const kinshipInfo = this.getKinship(familyName, characterId, relationData.toId);
        relations.push({
          targetId: relationData.toId,
          targetName: relationData.toPerson.name,
          kinshipTitle: kinshipInfo.title,
          relationType: kinshipInfo.type,
          bloodlineStrength: kinshipInfo.strength,
          generationGap: kinshipInfo.generationGap
        });
      }
    }
    
    return relations.sort((a, b) => b.bloodlineStrength - a.bloodlineStrength);
  }

  /**
   * 检查两个角色是否有血缘关系
   * @param {string} familyName - 家族名
   * @param {string} characterId1 - 角色1 ID
   * @param {string} characterId2 - 角色2 ID
   * @returns {boolean} 是否有血缘关系
   */
  hasBloodRelation(familyName, characterId1, characterId2) {
    const kinship = this.getKinship(familyName, characterId1, characterId2);
    return kinship && kinship.type !== BloodRelationType.NO_RELATION;
  }

  /**
   * 获取血缘关系强度
   * @param {string} familyName - 家族名
   * @param {string} characterId1 - 角色1 ID
   * @param {string} characterId2 - 角色2 ID
   * @returns {number} 血缘关系强度 (0-100)
   */
  getBloodlineStrength(familyName, characterId1, characterId2) {
    const kinship = this.getKinship(familyName, characterId1, characterId2);
    return kinship ? kinship.strength : 0;
  }

  /**
   * 创建单个家族
   * @param {Object} options - 创建选项
   * @returns {Object} 创建的家族信息
   */
  createFamily(options = {}) {
    // 从CSV获取surname，生成familyName  
    const surname = options.surname || this._selectRandomSurname();
    const familyName = options.familyName || (surname + "氏");
    const familySize = options.size || 8;
    const familyType = options.type || 'balanced';
    
    console.log(`🏠 创建${surname}家族 → ${familyName}`);
    
    const result = this.createFiveGenerationFamily(familyName, familySize, familyType);
    // 确保familyStructure包含surname信息
    result.surname = surname;
    result.familyName = familyName;
    
    return result;
  }

  /**
   * 辅助方法：生成随机家族名
   */
  _generateRandomFamilyName() {
    return this.familyNames[Math.floor(Math.random() * this.familyNames.length)];
  }

  /**
   * 验证血缘关系数据完整性
   * @param {string} familyName - 家族名
   * @returns {Object} 验证结果
   */
  validateFamilyIntegrity(familyName) {
    const family = this.families.get(familyName);
    if (!family) {
      return { isValid: false, errors: ['家族不存在'] };
    }
    
    const errors = [];
    const warnings = [];
    
    // 检查家族成员完整性
    if (family.totalMembers === 0) {
      errors.push('家族无成员');
    }
    
    // 检查血缘关系完整性
    if (family.bloodRelations.size === 0) {
      warnings.push('家族无血缘关系记录');
    }
    
    // 检查族长设定
    if (!family.familyHead) {
      warnings.push('未设定族长');
    }
    
    // 检查各代成员合理性
    let hasValidGeneration = false;
    Object.entries(family.generations).forEach(([genKey, members]) => {
      if (members.length > 0) {
        hasValidGeneration = true;
        
        // 检查成员数据完整性
        members.forEach(member => {
          if (!member.id || !member.name || !member.bloodlineTitle) {
            errors.push(`成员 ${member.name || 'unknown'} 数据不完整`);
          }
          if (member.age < 0 || member.age > 100) {
            warnings.push(`成员 ${member.name} 年龄异常: ${member.age}岁`);
          }
        });
      }
    });
    
    if (!hasValidGeneration) {
      errors.push('家族无有效世代');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      memberCount: family.totalMembers,
      relationCount: family.bloodRelations.size
    };
  }

  /**
   * 导出家族数据（用于保存和备份）
   * @param {string} familyName - 家族名
   * @returns {Object|null} 家族数据
   */
  exportFamilyData(familyName) {
    const family = this.families.get(familyName);
    if (!family) return null;
    
    return {
      ...family,
      bloodRelations: Array.from(family.bloodRelations.entries()),
      exportedAt: Date.now(),
      version: '1.0'
    };
  }

  /**
   * 导入家族数据（用于加载和恢复）
   * @param {Object} familyData - 家族数据
   * @returns {boolean} 导入是否成功
   */
  importFamilyData(familyData) {
    try {
      if (!familyData || !familyData.familyName) {
        console.error('无效的家族数据');
        return false;
      }
      
      // 重建血缘关系Map
      const bloodRelations = new Map(familyData.bloodRelations || []);
      
      const family = {
        ...familyData,
        bloodRelations: bloodRelations,
        importedAt: Date.now()
      };
      
      // 存储家族数据
      this.families.set(family.familyName, family);
      this.bloodRelations.set(family.familyName, bloodRelations);
      this.familyTrees.set(family.familyName, this._buildFamilyTree(family));
      
      console.log(`✅ 家族 ${family.familyName} 数据导入成功`);
      return true;
      
    } catch (error) {
      console.error('导入家族数据失败:', error);
      return false;
    }
  }

  /**
   * 清理家族数据
   * @param {string} familyName - 家族名
   * @returns {boolean} 清理是否成功
   */
  removeFamilyData(familyName) {
    const deleted = {
      family: this.families.delete(familyName),
      relations: this.bloodRelations.delete(familyName),
      tree: this.familyTrees.delete(familyName)
    };
    
    const success = deleted.family || deleted.relations || deleted.tree;
    
    if (success) {
      console.log(`✅ 家族 ${familyName} 数据已清理`);
    }
    
    return success;
  }
}

export default FamilySystem;