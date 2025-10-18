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
import { PopulationRules } from './population_rules.js';
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
    4: { male: '高祖父', female: '高祖母' },
    5: { male: '天祖父', female: '天祖母' }
  },
  
  // 直系下级称谓（长辈称呼晚辈）
  descendant_titles: {
    1: { male: '儿子', female: '女儿' },
    2: { male: '孙子', female: '孙女' },
    3: { male: '曾孙', female: '曾孙女' },
    4: { male: '玄孙', female: '玄孙女' },
    5: { male: '来孙', female: '来孙女' }
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
    this.familyGraphCache = new Map();   // 关系图缓存
    this.familyMemberCache = new Map();  // 家族成员索引缓存
    this.familyLineageCache = new Map(); // 亲缘索引缓存
    // 删除 this.familyTrees = new Map(); 因为相关方法已删除
    
    // 血缘关系配置
    this.generationConfig = this._initGenerationConfig();
    this.kinshipTitles = BloodRelationTitles;
    
    // 删除不再使用的家族命名配置
    // this.familyNames = null; 因为姓名生成已移至FamilyNetworkService
    
    //console.log('✅ FamilySystem 血缘关系系统初始化完成');
  }

  _normalizeGender(raw) {
    if (raw === undefined || raw === null) return null;
    const value = String(raw).trim().toLowerCase();
    if (value === '男' || value === 'male' || value === 'm') return 'male';
    if (value === '女' || value === 'female' || value === 'f') return 'female';
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
  
    if (raw === undefined || raw === null) return null;
    const text = String(raw).trim().toLowerCase();
  
    if (text === '男' || text === 'male' || text === 'm') return 'male';
    if (text === '女' || text === 'female' || text === 'f') return 'female';
    return null;
  }

  

  //更新血缘关系数据
  updateBloodRelationIds(familyName, idMapping) {
    //console.log(`🔧 开始更新血缘关系ID: ${familyName}`);
    //console.log(`🔧 ID映射表:`, Array.from(idMapping.entries()));
    
    const familyBloodRelations = this.bloodRelations.get(familyName);
    if (!familyBloodRelations) {
      console.log(`🔧 未找到${familyName}的血缘关系`);
      return;
    }
    
    //console.log(`🔧 更新前关系键:`, Array.from(familyBloodRelations.keys()));
    const newRelations = new Map();
    
    for (const [relationKey, relation] of familyBloodRelations) {
      const [fromCharacterId, toCharacterId] = relationKey.split('_');
      const newFromCharacterId = idMapping.get(fromCharacterId) || fromCharacterId;
      const newToCharacterId = idMapping.get(toCharacterId) || toCharacterId;
      const newKey = `${newFromCharacterId}_${newToCharacterId}`;
      
      //console.log(`🔧 关系键更新: ${relationKey} → ${newKey}`);
  
      // 深度更新关系对象中的所有ID引用
      const updatedRelation = {
        ...relation,
        fromCharacterId: newFromCharacterId,
        toCharacterId: newToCharacterId
      };
      
      // 更新人员引用中的ID
      if (updatedRelation.fromPerson) {
        updatedRelation.fromPerson = {
          ...updatedRelation.fromPerson,
          characterId: newFromCharacterId,
          id: newFromCharacterId
        };
      }
      
      if (updatedRelation.toPerson) {
        updatedRelation.toPerson = {
          ...updatedRelation.toPerson,
          characterId: newToCharacterId,
          id: newToCharacterId
        };
      }
      
      newRelations.set(newKey, updatedRelation);
    }
    
    this.bloodRelations.set(familyName, newRelations);
    //console.log(`🔧 更新后关系键:`, Array.from(newRelations.keys()));
    
    // 同时更新families中的成员ID
    const family = this.families.get(familyName);
    if (family && family.members) {
      family.members.forEach(member => {
        const oldId = member.characterId || member.id;
        if (idMapping.has(oldId)) {
          const newId = idMapping.get(oldId);
          member.characterId = newId;
          member.id = newId;
        }
      });
      //console.log(`🔧 家族成员ID同步更新完成`);
    }
  }


  /**
   * 从FamilyNetworkService接收并存储血缘关系数据
   * @param {Array} characters - 角色列表
   * @param {Object} relationshipData - 关系数据 {bloodRelations: [...]}
   */
  storeBloodRelationsFromService(characters, relationshipData) {
    //console.log('🔗 接收FamilyNetworkService完整数据并存储');
    // 添加数据验证
    if (!characters || !Array.isArray(characters)) {
      console.warn('characters数据无效:', characters);
      return;
    }
    
    if (!relationshipData) {
      console.warn('relationshipData数据为空');
      return;
    }
    
    // 确保bloodRelations存在
    const bloodRelations = relationshipData.bloodRelations || [];
    //console.log('血缘关系数据:', bloodRelations.length, '条');
    
    // 按家族分组
    const familyGroups = new Map();
    characters.forEach(character => {
      const familyName = character.familyName || character.surname || '未知';
      if (!familyGroups.has(familyName)) {
        familyGroups.set(familyName, []);
      }
      familyGroups.get(familyName).push(character);
    });
    
    // 存储血缘关系和家族成员数据
    for (const [familyName, familyMembers] of familyGroups) {
      // 存储血缘关系
      const familyBloodRelations = this._convertServiceDataToFamilyFormat(
        familyMembers, 
        relationshipData.bloodRelations || []
      );
      this.bloodRelations.set(familyName, familyBloodRelations);
      
      // 存储家族成员数据（简化结构，供getFamilyMembers使用）
      const familyData = {
        familyName: familyName,
        members: familyMembers,  // 直接存储成员列表
        totalMembers: familyMembers.length,
        createdAt: Date.now(),
        source: 'FamilyNetworkService'
      };
      this.families.set(familyName, familyData);
      this.familyGraphCache.delete(familyName);
      this.familyLineageCache.delete(familyName);
      this._cacheFamilyMembers(familyName, familyMembers);
      
      //console.log(`✅ ${familyName}家族数据存储完成: ${familyMembers.length}成员, ${familyBloodRelations.size}关系`);
    }
  }
  
  
  /**
   * 转换服务数据为FamilySystem格式
   * @param {Array} familyMembers - 家族成员
   * @param {Array} serviceBloodRelations - 服务层血缘关系数据
   * @returns {Map} FamilySystem格式的血缘关系
   */
  _convertServiceDataToFamilyFormat(familyMembers, serviceBloodRelations) {
    const getGenderCode = (member) => this._normalizeGender(member?.genderCode ?? member?.gender);
    const familyBloodRelations = new Map();
    const processedRelations = new Set();

    const memberMap = new Map();
    familyMembers.forEach(member => {
      const id = member.characterId || member.id;
      if (id) {
        memberMap.set(id, member);
      }
    });

    const familyMemberIds = new Set(memberMap.keys());
    const parentToChildren = new Map();
    const childToParents = new Map();
    const siblingMap = new Map();

    // 🔧 婚姻唯一性追踪
    const marriageTracker = new Map(); // 角色ID -> { spouseId, role ('husband'|'wife') }

    //console.log('🔍 [FamilySystem] 开始转换关系数据');
    //console.log(`🔍 [FamilySystem] 家族成员数: ${familyMembers.length}`);
    //console.log(`🔍 [FamilySystem] 原始关系数: ${serviceBloodRelations.length}`);

    const registerParentChild = (parentId, childId) => {
      if (!parentId || !childId) return;
      if (!parentToChildren.has(parentId)) parentToChildren.set(parentId, new Set());
      parentToChildren.get(parentId).add(childId);
      if (!childToParents.has(childId)) childToParents.set(childId, new Set());
      childToParents.get(childId).add(parentId);
    };

    const trackSiblings = (idA, idB) => {
      if (!idA || !idB) return;
      if (!siblingMap.has(idA)) siblingMap.set(idA, new Set());
      if (!siblingMap.has(idB)) siblingMap.set(idB, new Set());
      siblingMap.get(idA).add(idB);
      siblingMap.get(idB).add(idA);
    };

    serviceBloodRelations.forEach(relation => {
      if (relation.type === 'parent_child') {
        const { father, mother, child } = relation.data;
        const fatherMember = memberMap.get(father);
        const motherMember = memberMap.get(mother);
        const childMember = memberMap.get(child);

        if (!familyMemberIds.has(child)) return;

        // 性别校验：确保父亲是male，母亲是female
        const fatherGender = getGenderCode(fatherMember);
        const motherGender = getGenderCode(motherMember);

        if (fatherGender && fatherGender !== 'male') {
          console.warn(`⚠️ 性别错误: ${father} 被标记为父亲但性别是 ${fatherGender}`);
          return; // 跳过此关系
        }

        if (motherGender && motherGender !== 'female') {
          console.warn(`⚠️ 性别错误: ${mother} 被标记为母亲但性别是 ${motherGender}`);
          return; // 跳过此关系
        }

        registerParentChild(father, child);
        registerParentChild(mother, child);

        const addParentRelation = (parentId, parentMember, label) => {
          if (!familyMemberIds.has(parentId)) return;
          const key = `${parentId}_${child}`;
          if (processedRelations.has(key)) return;
          processedRelations.add(key);
          familyBloodRelations.set(key, {
            fromCharacterId: parentId,
            toCharacterId: child,
            bloodRelationType: label,
            generationGap: 1,
            bloodlineStrength: 100,
            fromPerson: parentMember,
            toPerson: childMember,
            establishedAt: Date.now()
          });
        };

        addParentRelation(father, fatherMember, 'father_child');
        addParentRelation(mother, motherMember, 'mother_child');
      } else if (relation.type === 'siblings') {
        const siblings = relation.participants || [];
        //console.log(`🔍 [Siblings] 关系: ${siblings.length}个兄弟姐妹`);

        for (let i = 0; i < siblings.length; i++) {
          for (let j = i + 1; j < siblings.length; j++) {
            const sibling1 = siblings[i];
            const sibling2 = siblings[j];
            if (!familyMemberIds.has(sibling1) || !familyMemberIds.has(sibling2)) continue;

            const key = `${sibling1}_${sibling2}`;
            if (!processedRelations.has(key)) {
              processedRelations.add(key);
              familyBloodRelations.set(key, {
                fromCharacterId: sibling1,
                toCharacterId: sibling2,
                bloodRelationType: BloodRelationType.SIBLING,
                generationGap: 0,
                bloodlineStrength: 100,
                fromPerson: memberMap.get(sibling1),
                toPerson: memberMap.get(sibling2),
                establishedAt: Date.now()
              });
            }

            trackSiblings(sibling1, sibling2);
          }
        }
      } else if (relation.type === 'marriage') {
        const [husband, wife] = relation.participants || [];
        if (!familyMemberIds.has(husband) || !familyMemberIds.has(wife)) return;

        // 性别校验：确保husband是male，wife是female
        const husbandMember = memberMap.get(husband);
        const wifeMember = memberMap.get(wife);
        const husbandGender = getGenderCode(husbandMember);
        const wifeGender = getGenderCode(wifeMember);

        if (husbandGender && husbandGender !== 'male') {
          console.warn(`⚠️ 性别错误: ${husband} 被标记为夫君但性别是 ${husbandGender}`);
          return; // 跳过此关系
        }

        if (wifeGender && wifeGender !== 'female') {
          console.warn(`⚠️ 性别错误: ${wife} 被标记为妻子但性别是 ${wifeGender}`);
          return; // 跳过此关系
        }

        // 🔧 婚姻唯一性和一致性校验
        const husbandRecord = marriageTracker.get(husband);
        const wifeRecord = marriageTracker.get(wife);

        // 检查husband是否已有配偶记录
        if (husbandRecord) {
          if (husbandRecord.spouseId !== wife || husbandRecord.role !== 'husband') {
            console.warn(`⚠️ 婚姻冲突: ${husband}(${husbandMember?.name || husband}, 性别:${getGenderCode(husbandMember) || '未知'}) 已有配偶 ${husbandRecord.spouseName}(ID:${husbandRecord.spouseId}, 角色:${husbandRecord.role}), 无法再与 ${wife}(${wifeMember?.name || wife}) 建立婚姻关系`);
            return; // 跳过此重复婚姻
          }
          // 如果是相同配偶和角色,允许继续(去重逻辑会处理)
        } else {
          marriageTracker.set(husband, { spouseId: wife, spouseName: wifeMember?.name || wife, role: 'husband' });
        }

        // 检查wife是否已有配偶记录
        if (wifeRecord) {
          if (wifeRecord.spouseId !== husband || wifeRecord.role !== 'wife') {
            console.warn(`⚠️ 婚姻冲突: ${wife}(${wifeMember?.name || wife}, 性别:${getGenderCode(wifeMember) || '未知'}) 已有配偶 ${wifeRecord.spouseName}(ID:${wifeRecord.spouseId}, 角色:${wifeRecord.role}), 无法再与 ${husband}(${husbandMember?.name || husband}) 建立婚姻关系`);
            return; // 跳过此重复婚姻
          }
          // 如果是相同配偶和角色,允许继续(去重逻辑会处理)
        } else {
          marriageTracker.set(wife, { spouseId: husband, spouseName: husbandMember?.name || husband, role: 'wife' });
        }

        const key = `${husband}_${wife}`;
        if (!processedRelations.has(key)) {
          processedRelations.add(key);
          familyBloodRelations.set(key, {
            fromCharacterId: husband,
            toCharacterId: wife,
            bloodRelationType: 'marriage',
            generationGap: 0,
            bloodlineStrength: 100,
            fromPerson: husbandMember,
            toPerson: wifeMember,
            establishedAt: Date.now()
          });
        }
      } else {
        const fromId = relation.fromCharacterId || relation.participants?.[0];
        const toId = relation.toCharacterId || relation.participants?.[1];
        if (!fromId || !toId || !familyMemberIds.has(fromId) || !familyMemberIds.has(toId)) return;

        const key = `${fromId}_${toId}`;
        if (processedRelations.has(key)) return;

        processedRelations.add(key);
        familyBloodRelations.set(key, {
          fromCharacterId: fromId,
          toCharacterId: toId,
          bloodRelationType: relation.type || relation.bloodRelationType,
          generationGap: relation.generationGap || 0,
          bloodlineStrength: relation.strength || relation.bloodlineStrength || 100,
          fromPerson: memberMap.get(fromId),
          toPerson: memberMap.get(toId),
          establishedAt: relation.establishedAt || Date.now()
        });
      }
    });

    this._addDerivedRelations({
      familyBloodRelations,
      memberMap,
      parentToChildren,
      childToParents,
      siblingMap,
      processedRelations,
      familyMemberIds
    });

    this._enforceUniqueParents(familyBloodRelations, memberMap);

    //console.log(`🔄 转换血缘关系: ${serviceBloodRelations.length}条原始 -> ${familyBloodRelations.size}条去重后`);
    return familyBloodRelations;
  }

  _addDerivedRelations({
    familyBloodRelations,
    memberMap,
    parentToChildren,
    childToParents,
    siblingMap,
    processedRelations,
    familyMemberIds
  }) {
    const addRelation = (fromId, toId, type, strength = 80, generationOverride = null) => {
      if (!fromId || !toId) return;
      if (!familyMemberIds.has(fromId) || !familyMemberIds.has(toId)) return;

      const key = `${fromId}_${toId}`;
      if (processedRelations.has(key)) return;

      const fromPerson = memberMap.get(fromId);
      const toPerson = memberMap.get(toId);
      if (!fromPerson || !toPerson) return;

      let generationGap = generationOverride ?? 0;
      if (generationOverride === null && Number.isFinite(fromPerson.generation) && Number.isFinite(toPerson.generation)) {
        generationGap = Math.abs((toPerson.generation || 0) - (fromPerson.generation || 0));
      }

      processedRelations.add(key);
      familyBloodRelations.set(key, {
        fromCharacterId: fromId,
        toCharacterId: toId,
        bloodRelationType: type,
        generationGap,
        bloodlineStrength: strength,
        fromPerson,
        toPerson,
        establishedAt: Date.now()
      });
    };

    const addBidirectional = (idA, idB, typeAB, typeBA, strength = 70) => {
      addRelation(idA, idB, typeAB, strength);
      addRelation(idB, idA, typeBA, strength);
    };

    parentToChildren.forEach((children, parentId) => {
      if (!children || children.size === 0) return;
      const siblings = siblingMap.get(parentId);
      if (!siblings || siblings.size === 0) return;

      children.forEach(childId => {
        const childPerson = memberMap.get(childId);
        if (!childPerson) return;

        siblings.forEach(uncleId => {
          const unclePerson = memberMap.get(uncleId);
          if (!unclePerson) return;

          // 家族边界检查：叔伯姑舅关系需要验证家族归属
          // 同姓才是真正的叔伯（父方），不同姓则是舅父姨母（母方）
          const childFamily = childPerson.familyName || childPerson.surname || '';
          const uncleFamily = unclePerson.familyName || unclePerson.surname || '';

          // 只有同姓才添加叔伯关系，不同姓的通过母系处理
          if (childFamily === uncleFamily) {
            addBidirectional(childId, uncleId, BloodRelationType.UNCLE_AUNT, BloodRelationType.NEPHEW_NIECE, 65);
          }

          const cousinChildren = parentToChildren.get(uncleId);
          if (!cousinChildren || cousinChildren.size === 0) return;

          cousinChildren.forEach(cousinId => {
            if (cousinId === childId) return;
            const cousinPerson = memberMap.get(cousinId);
            if (!cousinPerson) return;

            // 家族边界检查：堂兄弟必须同姓，不同姓不建立堂兄弟关系
            const cousinFamily = cousinPerson.familyName || cousinPerson.surname || '';
            if (childFamily === cousinFamily) {
              addBidirectional(childId, cousinId, BloodRelationType.COUSIN, BloodRelationType.COUSIN, 60);
            }
          });
        });
      });
    });

    childToParents.forEach((parents, childId) => {
      if (!parents || parents.size === 0) return;
      parents.forEach(parentId => {
        const grandParents = childToParents.get(parentId);
        if (!grandParents || grandParents.size === 0) return;

        grandParents.forEach(grandParentId => {
          addRelation(grandParentId, childId, BloodRelationType.ANCESTOR, 75, 2);
          addRelation(childId, grandParentId, BloodRelationType.DESCENDANT, 75, 2);
        });
      });
    });

    const maxGenerationDepth = 4;
    const computeLineageStrength = depth => Math.max(40, 85 - depth * 5);

    const addLineageRelations = (originId, direction) => {
      if (!originId) return;
      const visited = new Set([originId]);
      const queue = [{ id: originId, depth: 0 }];

      while (queue.length > 0) {
        const { id: currentId, depth } = queue.shift();
        if (depth >= maxGenerationDepth) continue;

        const relatives =
          direction === 'up'
            ? childToParents.get(currentId)
            : parentToChildren.get(currentId);

        if (!relatives || relatives.size === 0) continue;

        relatives.forEach(relativeId => {
          if (!relativeId || !familyMemberIds.has(relativeId)) return;
          const nextDepth = depth + 1;
          const strength = computeLineageStrength(nextDepth);

          if (direction === 'up') {
            addRelation(relativeId, originId, BloodRelationType.ANCESTOR, strength, nextDepth);
            addRelation(originId, relativeId, BloodRelationType.DESCENDANT, strength, nextDepth);
          } else {
            addRelation(originId, relativeId, BloodRelationType.DESCENDANT, strength, nextDepth);
            addRelation(relativeId, originId, BloodRelationType.ANCESTOR, strength, nextDepth);
          }

          if (nextDepth < maxGenerationDepth && !visited.has(relativeId)) {
            visited.add(relativeId);
            queue.push({ id: relativeId, depth: nextDepth });
          }
        });
      }
    };

    familyMemberIds.forEach(memberId => {
      addLineageRelations(memberId, 'up');
      addLineageRelations(memberId, 'down');
    });
  }

   /**
   * 获取血缘关系称谓
   * @param {string} familyName - 家族名
   * @param {string} fromCharacterId - 询问者ID
   * @param {string} toCharacterId - 被询问者ID
   * @returns {Object|null} 血缘关系信息
   */
  _enforceUniqueParents(familyBloodRelations, memberMap) {
    if (!familyBloodRelations || typeof familyBloodRelations.forEach !== 'function') {
      return;
    }
    const getGenderCode = (member) => this._normalizeGender(member?.genderCode ?? member?.gender);


    const parentMap = memberMap && typeof memberMap.get === 'function' ? memberMap : null;
    const childAssignments = new Map();

    familyBloodRelations.forEach((relation, key) => {
      if (!relation || !relation.toCharacterId) {
        return;
      }
      if (relation.bloodRelationType !== 'father_child' && relation.bloodRelationType !== 'mother_child') {
        return;
      }

      const childId = relation.toCharacterId;
      const roleKey = relation.bloodRelationType === 'father_child' ? 'father' : 'mother';
      const record = childAssignments.get(childId) || { father: [], mother: [] };
      record[roleKey].push({ key, relation });
      childAssignments.set(childId, record);
    });

    childAssignments.forEach(record => {
      if (record.father && record.father.length > 1) {
        const bestFather = this._selectBestParentCandidate(record.father, parentMap, 'father');
        record.father.forEach(entry => {
          if (entry !== bestFather) {
            familyBloodRelations.delete(entry.key);
          }
        });
      }
      if (record.mother && record.mother.length > 1) {
        const bestMother = this._selectBestParentCandidate(record.mother, parentMap, 'mother');
        record.mother.forEach(entry => {
          if (entry !== bestMother) {
            familyBloodRelations.delete(entry.key);
          }
        });
      }
    });
  }

  _selectBestParentCandidate(options, memberMap, role) {
    if (!options || options.length === 0) {
      return null;
    }

    const getMember = (id) => {
      if (!memberMap || !id) return null;
      return memberMap.get(id) || null;
    };

    let bestOption = null;
    let bestScore = -Infinity;

    options.forEach(option => {
      if (!option || !option.relation) {
        return;
      }
      const parentId = option.relation.fromCharacterId;
      const parentData = getMember(parentId);
      let score = 0;

      if (parentData) {
        score += 2;
        if (parentData.vitalStatus !== 'deceased') {
          score += 1;
        }

        // 性别校验：根据角色类型匹配正确的性别
        const parentGenderCode = this._getGenderCode(parentData);
        if (role === 'father') {
          // 父亲角色：male加分，female减分
          if (parentGenderCode === 'male') {
            score += 3;
          } else if (parentGenderCode === 'female') {
            score -= 2;
          }
        } else if (role === 'mother') {
          // 母亲角色：female加分，male减分
          if (parentGenderCode === 'female') {
            score += 3;
          } else if (parentGenderCode === 'male') {
            score -= 2;
          }
        }
      }
      

      if (option.relation && option.relation.establishedAt) {
        score += 0.5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestOption = option;
      }
    });

    return bestOption || options[0];
  }

  _lookupRelation(familyBloodRelations, fromCharacterId, toCharacterId) {
    if (!familyBloodRelations) return null;
    const forwardKey = `${fromCharacterId}_${toCharacterId}`;
    if (familyBloodRelations.has(forwardKey)) {
      return { relation: familyBloodRelations.get(forwardKey), reversed: false };
    }
    const reverseKey = `${toCharacterId}_${fromCharacterId}`;
    if (familyBloodRelations.has(reverseKey)) {
      return { relation: familyBloodRelations.get(reverseKey), reversed: true };
    }
    return null;
  }

   getKinship(familyName, fromCharacterId, toCharacterId) {
    const familyBloodRelations = this.bloodRelations.get(familyName);
    if (!familyBloodRelations) {
      return null;
    }

    if (!fromCharacterId || !toCharacterId) {
      return null;
    }

    const directResult = this._lookupRelation(familyBloodRelations, fromCharacterId, toCharacterId);

    if (directResult) {
      const { relation, reversed } = directResult;
      const effectiveRelation = reversed ? {
        ...relation,
        fromCharacterId: relation.toCharacterId,
        toCharacterId: relation.fromCharacterId,
        fromPerson: relation.toPerson,
        toPerson: relation.fromPerson,
        bloodRelationType: this._reverseRelationType(relation.bloodRelationType)
      } : relation;

      return {
        title: this._getBloodRelationTitle(effectiveRelation),
        type: effectiveRelation.bloodRelationType,
        strength: relation.bloodlineStrength || 100,
        generationGap: effectiveRelation.generationGap,
        establishedAt: relation.establishedAt
      };
    }

    const proximity = this.calculateBloodProximity(familyName, fromCharacterId, toCharacterId, {
      includePath: false
    });

    if (!proximity) {
      return null;
    }

    return {
      title: proximity.title,
      type: proximity.type,
      strength: proximity.closeness,
      generationGap: proximity.generationGap,
      establishedAt: Date.now()
    };
  }

  calculateBloodProximity(familyName, sourceId, targetId, options = {}) {
    if (!familyName || !sourceId || !targetId) return null;
    if (sourceId === targetId) {
      return {
        title: '本人',
        type: 'self',
        closeness: 100,
        generationGap: 0,
        distance: 0,
        path: []
      };
    }

    const proximityMap = this._calculateProximityMap(familyName, sourceId, options);
    if (!proximityMap) return null;

    const targetInfo = proximityMap.get(targetId);
    if (!targetInfo) return null;

    return {
      title: targetInfo.title,
      type: targetInfo.relationType,
      closeness: targetInfo.closeness,
      generationGap: targetInfo.generationGap,
      distance: targetInfo.distance,
      path: targetInfo.path
    };
  }

  _calculateProximityMap(familyName, sourceId, options = {}) {
    const familyBloodRelations = this.bloodRelations.get(familyName);
    if (!familyBloodRelations) return null;

    const graph = this._getFamilyRelationGraph(familyName);
    if (!graph) return null;

    const members = this._getFamilyMembersMap(familyName);
    const sourceMember = members.get(sourceId);
    const maxDepth = options.maxDepth ?? 6;

    const result = new Map();
    const queue = [{
      id: sourceId,
      path: [],
      strengths: []
    }];
    const visitedDepth = new Map([[sourceId, 0]]);

    result.set(sourceId, {
      title: '本人',
      relationType: 'self',
      generationGap: 0,
      closeness: 100,
      distance: 0,
      path: [],
      generationDelta: 0
    });

    while (queue.length > 0) {
      const current = queue.shift();
      const depth = current.path.length;
      const neighbors = graph.get(current.id) || [];

      neighbors.forEach(edge => {
        const neighborId = edge.id;
        const nextDepth = depth + 1;
        if (nextDepth > maxDepth) return;
        if (neighborId === sourceId) return;

        const recordedDepth = visitedDepth.get(neighborId);
        if (recordedDepth !== undefined && recordedDepth <= nextDepth) return;

        const nextPath = [...current.path, { from: current.id, to: neighborId, relation: edge.relation }];
        const nextStrengths = [...current.strengths, edge.relation.bloodlineStrength || 60];

        visitedDepth.set(neighborId, nextDepth);

        const neighborMember = members.get(neighborId);
        const description = this._describeKinshipFromPath(nextPath, sourceMember, neighborMember);
        const closeness = nextStrengths.length > 0
          ? Math.round(nextStrengths.reduce((sum, val) => sum + val, 0) / nextStrengths.length)
          : Math.max(20, 100 - nextDepth * 15);

        result.set(neighborId, {
          title: description.title,
          relationType: description.relationType,
          generationGap: description.generationGap,
          closeness,
          distance: nextDepth,
          path: nextPath.map(item => ({
            from: item.from,
            to: item.to,
            relationType: item.relation.bloodRelationType
          })),
          generationDelta: description.generationDelta ?? 0
        });

        queue.push({
          id: neighborId,
          path: nextPath,
          strengths: nextStrengths
        });
      });
    }

    return result;
  }

  _describeKinshipFromPath(path, sourceMember, targetMember) {
    if (!path || path.length === 0) {
      return {
        title: '本人',
        relationType: 'self',
        generationGap: 0,
        generationDelta: 0
      };
    }

    const lastRelation = path[path.length - 1].relation;
    if (path.length === 1) {
      return {
        title: this._getBloodRelationTitle(lastRelation),
        relationType: lastRelation.bloodRelationType,
        generationGap: lastRelation.generationGap ?? 0,
        generationDelta: this._computeGenerationDeltaFromRelation(lastRelation)
      };
    }

    let generationDelta = 0;

    let hasSibling = false;

    let hasCousin = false;

    let hasMarriage = false;

    let hasInLaw = false;

    let hasUncleAunt = false;

    let hasNephew = false;



    path.forEach(edge => {

      const relation = edge.relation;

      const relationType = relation.bloodRelationType;



      if (relationType === BloodRelationType.SIBLING) hasSibling = true;

      if (relationType === BloodRelationType.COUSIN) hasCousin = true;

      if (relationType === BloodRelationType.UNCLE_AUNT) hasUncleAunt = true;

      if (relationType === BloodRelationType.NEPHEW_NIECE) hasNephew = true;

      if (relationType === BloodRelationType.IN_LAW) hasInLaw = true;

      if (relationType === 'marriage' || relationType === BloodRelationType.SPOUSE) hasMarriage = true;



      const fromGen = relation.fromPerson?.generation;

      const toGen = relation.toPerson?.generation;

      if (Number.isFinite(fromGen) && Number.isFinite(toGen)) {

        generationDelta += (toGen - fromGen);

      } else {

        generationDelta += this._computeGenerationDeltaFromRelation(relation);

      }

    });



    const normalizedTargetGender = this._getGenderCode(targetMember);
    const genderKey = normalizedTargetGender === 'female' ? 'female' : 'male';
    const gap = Math.abs(generationDelta);



    const resolveUncleAuntTitle = () => {

      let parentGender = null;

      for (let i = 0; i < path.length; i++) {

        const relationType = path[i].relation?.bloodRelationType;

        if (relationType === BloodRelationType.SIBLING) {

          const prevEdge = path[i - 1];

          const candidateGender =

            prevEdge?.relation?.toPerson?.gender ?? prevEdge?.relation?.fromPerson?.gender ?? null;

          if (candidateGender) {

            parentGender = candidateGender;

          }

          break;

        }

      }

      const parentGenderCode = this._getGenderCode(parentGender);
      const isMaternal = parentGenderCode === 'female';
      const isMale = normalizedTargetGender === 'male';

      return isMaternal ? (isMale ? '舅父' : '姨母') : (isMale ? '叔父' : '姑母');

    };



    const resolveNephewTitle = () => {
      const isMale = normalizedTargetGender === 'male';
      return isMale ? '侄子' : '侄女';
    };
    



    const resolveCousinTitle = () => {

      if (!this.kinshipTitles?.collateral_titles?.cousin_titles) {
        return normalizedTargetGender === 'male' ? '堂兄弟' : '堂姐妹';
      }

      const ageDiff = (targetMember?.age ?? 0) - (sourceMember?.age ?? 0);

      const isOlder = Math.abs(ageDiff) >= 1 ? ageDiff > 0 : false;

      const category = isOlder ? 'older' : 'younger';

      const titles = this.kinshipTitles.collateral_titles.cousin_titles[category];

      if (!titles) {
        return normalizedTargetGender === 'male' ? '堂兄弟' : '堂姐妹';
      }

      const titleKey = normalizedTargetGender === 'male' ? 'male' : 'female';

      return titles[titleKey] || (titleKey === 'male' ? '堂兄弟' : '堂姐妹');

    };



    const resolveInLawTitle = () => {

      const isMale = normalizedTargetGender === 'male';

      if (gap === 0) {
        return '姻亲';
      }

      if (generationDelta < 0) {
        return gap === 1 ? (isMale ? '岳父' : '岳母') : '姻亲长辈';
      }

      return gap === 1 ? (isMale ? '女婿' : '儿媳') : '姻亲晚辈';

    };



    if (hasMarriage || hasInLaw) {

      const title = hasMarriage && !hasInLaw && gap === 0

        ? (this.kinshipTitles?.spouse_titles?.[genderKey] || (genderKey === 'male' ? '夫君' : '妻子'))

        : resolveInLawTitle();



      const relationType = hasMarriage && !hasInLaw && gap === 0

        ? BloodRelationType.SPOUSE

        : BloodRelationType.IN_LAW;



      return {

        title,

        relationType,

        generationGap: relationType === BloodRelationType.SPOUSE ? 0 : gap,

        generationDelta

      };

    }



    if (hasUncleAunt || (hasSibling && generationDelta < 0)) {

      return {

        title: resolveUncleAuntTitle(),

        relationType: BloodRelationType.UNCLE_AUNT,

        generationGap: gap || 1,

        generationDelta

      };

    }



    if (hasNephew || (hasSibling && generationDelta > 0)) {

      return {

        title: resolveNephewTitle(),

        relationType: BloodRelationType.NEPHEW_NIECE,

        generationGap: gap || 1,

        generationDelta

      };

    }



    if (hasCousin || (hasSibling && generationDelta === 0)) {

      return {

        title: resolveCousinTitle(),

        relationType: BloodRelationType.COUSIN,

        generationGap: 0,

        generationDelta

      };

    }



    if (hasSibling) {

      const title = normalizedTargetGender === 'male' ? '兄弟' : '姐妹';

      return {

        title,

        relationType: BloodRelationType.SIBLING,

        generationGap: 0,

        generationDelta

      };

    }



    if (generationDelta < 0) {

      const title = this.kinshipTitles.ancestor_titles[gap]?.[genderKey] || 直系长辈代;

      return {

        title,

        relationType: BloodRelationType.ANCESTOR,

        generationGap: gap,

        generationDelta

      };

    }



    if (generationDelta > 0) {

      const title = this.kinshipTitles.descendant_titles[gap]?.[genderKey] || 直系晚辈代;

      return {

        title,

        relationType: BloodRelationType.DESCENDANT,

        generationGap: gap,

        generationDelta

      };

    }



    return {

      title: '亲属',

      relationType: BloodRelationType.NO_RELATION,

      generationGap: 0,

      generationDelta

    };

  }  _computeGenerationDeltaFromRelation(relation) {
    const type = relation.bloodRelationType;
    const gap = relation.generationGap ?? 1;
    switch (type) {
      case BloodRelationType.ANCESTOR:
        return -Math.abs(gap);
      case BloodRelationType.DESCENDANT:
        return Math.abs(gap);
      case 'father_child':
      case 'mother_child':
        return relation.fromPerson?.generation < relation.toPerson?.generation ? 1 : -1;
      case BloodRelationType.UNCLE_AUNT:
        return -1;
      case BloodRelationType.NEPHEW_NIECE:
        return 1;
      default:
        return 0;
    }
  }

  _getFamilyRelationGraph(familyName) {
    if (this.familyGraphCache.has(familyName)) {
      return this.familyGraphCache.get(familyName);
    }

    const familyBloodRelations = this.bloodRelations.get(familyName);
    if (!familyBloodRelations) return null;

    const graph = this._buildRelationGraph(familyBloodRelations);
    this.familyGraphCache.set(familyName, graph);
    return graph;
  }

  _buildRelationGraph(familyBloodRelations) {
    const graph = new Map();

    familyBloodRelations.forEach(relation => {
      const fromId = relation.fromCharacterId;
      const toId = relation.toCharacterId;
      if (!fromId || !toId) return;

      // 添加前向边
      if (!graph.has(fromId)) graph.set(fromId, []);
      graph.get(fromId).push({ id: toId, relation });

      // 🔧 婚姻关系特殊处理：不创建反向边，避免重复
      const isMarriage = relation.bloodRelationType === 'marriage' || relation.bloodRelationType === BloodRelationType.SPOUSE;

      if (!isMarriage) {
        // 非婚姻关系：正常创建反向边
        if (!graph.has(toId)) graph.set(toId, []);
        graph.get(toId).push({
          id: fromId,
          relation: {
            ...relation,
            fromCharacterId: toId,
            toCharacterId: fromId,
            fromPerson: relation.toPerson,
            toPerson: relation.fromPerson,
            bloodRelationType: this._reverseRelationType(relation.bloodRelationType)
          }
        });
      } else {
        // 婚姻关系：只创建反向查找的空邻接表，但不添加反向边
        if (!graph.has(toId)) graph.set(toId, []);
      }
    });

    return graph;
  }

  _getFamilyMembersMap(familyName) {
    if (!this.familyMemberCache.has(familyName)) {
      const family = this.families.get(familyName);
      if (!family || !Array.isArray(family.members)) {
        this.familyMemberCache.set(familyName, new Map());
      } else {
        this._cacheFamilyMembers(familyName, family.members);
      }
    }
    return this.familyMemberCache.get(familyName) || new Map();
  }

  _cacheFamilyMembers(familyName, members = []) {
    const memberMap = new Map();
    members.forEach(member => {
      if (!member) return;
      const memberId = member.characterId || member.id;
      if (!memberId) return;
      const existing = memberMap.get(memberId) || {};
      memberMap.set(memberId, {
        ...existing,
        ...member,
        characterId: memberId,
        id: member.id ?? existing.id ?? memberId,
        name: member.name ?? existing.name,
        displayName: member.displayName ?? existing.displayName,
        gender: member.gender ?? existing.gender,
        age: member.age ?? existing.age,
        generation: member.generation ?? existing.generation ?? null,
        vitalStatus: member.vitalStatus ?? existing.vitalStatus ?? 'unknown'
      });
    });

    if (this.gameEngine?.characters) {
      this.gameEngine.characters.forEach(character => {
        if (!character || character.familyName !== familyName) return;
        const memberId = character.characterId || character.id;
        if (!memberId) return;
        const existing = memberMap.get(memberId) || {};
        memberMap.set(memberId, {
          ...existing,
          characterId: memberId,
          id: existing.id ?? character.id ?? memberId,
          name: existing.name || character.name || character.displayName,
          displayName: existing.displayName || character.displayName || character.name,
          gender: existing.gender || character.gender,
          age: existing.age ?? character.age,
          generation: existing.generation ?? character.generation ?? null,
          vitalStatus: existing.vitalStatus || character.vitalStatus || 'unknown'
        });
      });
    }

    this.familyMemberCache.set(familyName, memberMap);
  }

  _getLineageIndices(familyName) {
    if (this.familyLineageCache.has(familyName)) {
      return this.familyLineageCache.get(familyName);
    }

    const relations = this.bloodRelations.get(familyName);
    if (!relations) {
      const empty = {
        parentToChildren: new Map(),
        childToParents: new Map(),
        spouses: new Map()
      };
      this.familyLineageCache.set(familyName, empty);
      return empty;
    }

    const indices = this._extractLineageIndices(relations);
    this.familyLineageCache.set(familyName, indices);
    return indices;
  }

  _extractLineageIndices(familyBloodRelations) {
    const parentToChildren = new Map();
    const childToParents = new Map();
    const spouses = new Map();

    familyBloodRelations.forEach(relation => {
      const fromId = relation.fromCharacterId;
      const toId = relation.toCharacterId;
      if (!fromId || !toId) return;

      const type = relation.bloodRelationType;
      if (type === 'father_child' || type === 'mother_child') {
        if (!parentToChildren.has(fromId)) parentToChildren.set(fromId, new Set());
        parentToChildren.get(fromId).add(toId);

        if (!childToParents.has(toId)) childToParents.set(toId, new Set());
        childToParents.get(toId).add(fromId);
      } else if (type === 'marriage' || type === BloodRelationType.SPOUSE) {
        // 🔧 婚姻关系只创建husband→wife单向索引
        if (!spouses.has(fromId)) spouses.set(fromId, new Set());
        if (!spouses.has(toId)) spouses.set(toId, new Set()); // 保证wife有空Set
        spouses.get(fromId).add(toId);  // 只添加husband → wife
        // 不添加反向索引：spouses.get(toId).add(fromId);
      }
    });

    return {
      parentToChildren,
      childToParents,
      spouses
    };
  }

  _getRelativeGenerationLabel(relativeLevel) {
    const labels = {
      '-5': '天祖辈',
      '-4': '高祖辈',
      '-3': '曾祖辈',
      '-2': '祖父母辈',
      '-1': '父母辈',
      '0': '本辈',
      '1': '子女辈',
      '2': '孙辈',
      '3': '曾孙辈',
      '4': '玄孙辈',
      '5': '来孙辈'
    };

    if (labels[relativeLevel?.toString()]) {
      return labels[relativeLevel.toString()];
    }
    if (relativeLevel < -5) {
      return `上${Math.abs(relativeLevel)}代`;
    }
    if (relativeLevel > 5) {
      return `下${relativeLevel}代`;
    }
    return '族亲';
  }

  getFamilyTreeData(familyName, focusCharacterId, options = {}) {
    if (!familyName || !focusCharacterId) return null;

    const family = this.families.get(familyName);
    if (!family || !Array.isArray(family.members) || family.members.length === 0) {
      return null;
    }

    const memberMap = this._getFamilyMembersMap(familyName);
    const focusMember = memberMap.get(focusCharacterId);
    if (!focusMember) return null;

    const ancestorLevels = options.ancestorLevels ?? 4;
    const descendantLevels = options.descendantLevels ?? 4;
    const maxDepth = ancestorLevels + descendantLevels + 2;

    const proximityMap = this._calculateProximityMap(familyName, focusCharacterId, { maxDepth });
    if (!proximityMap) return null;

    const focusGeneration = Number.isFinite(focusMember.generation)
      ? focusMember.generation
      : this._inferGenerationFromAge(focusMember.age || 0);

    const nodes = [];
    const levels = new Map();
    const nodesSet = new Set();

    memberMap.forEach((member, memberId) => {
      const proximity = proximityMap.get(memberId);
      if (!proximity) return;

      const memberGeneration = Number.isFinite(member.generation)
        ? member.generation
        : this._inferGenerationFromAge(member.age || 0);

      let relativeLevel = 0;
      if (Number.isFinite(memberGeneration) && Number.isFinite(focusGeneration)) {
        relativeLevel = memberGeneration - focusGeneration;
      } else if (proximity.relationType === BloodRelationType.ANCESTOR) {
        relativeLevel = -Math.abs(proximity.generationGap || proximity.distance || 1);
      } else if (proximity.relationType === BloodRelationType.DESCENDANT) {
        relativeLevel = Math.abs(proximity.generationGap || proximity.distance || 1);
      }

      if (relativeLevel < -ancestorLevels || relativeLevel > descendantLevels) {
        return;
      }

      const node = {
        id: memberId,
        name: member.name || member.displayName || '未命名',
        gender: member.gender || '未知',
        age: member.age ?? null,
        generation: memberGeneration,
        relativeLevel,
        relationTitle: proximity.title,
        relationType: proximity.relationType,
        closeness: proximity.closeness,
        distance: proximity.distance,
        isFocus: memberId === focusCharacterId,
        vitalStatus: member.vitalStatus || 'unknown',
        path: proximity.path
      };

      nodes.push(node);
      nodesSet.add(memberId);

      if (!levels.has(relativeLevel)) {
        levels.set(relativeLevel, []);
      }
      levels.get(relativeLevel).push(node);
    });

    nodes.sort((a, b) => {
      if (a.relativeLevel === b.relativeLevel) {
        return (b.closeness || 0) - (a.closeness || 0);
      }
      return a.relativeLevel - b.relativeLevel;
    });

    const levelData = Array.from(levels.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([level, members]) => ({
        level,
        label: this._getRelativeGenerationLabel(level),
        members: members.sort((a, b) => (b.closeness || 0) - (a.closeness || 0))
      }));

    const { parentToChildren, spouses } = this._getLineageIndices(familyName);
    const edges = [];
    const edgeKeys = new Set();

    const addEdge = (from, to, type, keyOverride = null) => {
      if (!nodesSet.has(from) || !nodesSet.has(to)) return;
      const key = keyOverride || `${from}->${to}:${type}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      edges.push({ from, to, type });
    };

    parentToChildren.forEach((children, parentId) => {
      children.forEach(childId => {
        addEdge(parentId, childId, 'parent_child');
      });
    });

    spouses.forEach((partners, id) => {
      partners.forEach(partnerId => {
        const pairKey = id < partnerId ? `${id}<->${partnerId}` : `${partnerId}<->${id}`;
        addEdge(id, partnerId, 'spouse', pairKey);
      });
    });

    const ancestorCount = nodes.filter(node => node.relativeLevel < 0).length;
    const descendantCount = nodes.filter(node => node.relativeLevel > 0).length;

    return {
      familyName,
      focusId: focusCharacterId,
      focusMember,
      nodes,
      levels: levelData,
      edges,
      generatedAt: Date.now(),
      options: { ancestorLevels, descendantLevels },
      summary: {
        total: nodes.length,
        ancestors: ancestorCount,
        descendants: descendantCount,
        sameGeneration: nodes.length - ancestorCount - descendantCount
      }
    };
  }
  
  /**
   * 反转血缘关系类型（用于反向查询）
   * @param {string} relationType - 原始关系类型
   * @returns {string} 反转后的关系类型
   */
  _reverseRelationType(relationType) {
    const reverseMap = {
      [BloodRelationType.ANCESTOR]: BloodRelationType.DESCENDANT,
      [BloodRelationType.DESCENDANT]: BloodRelationType.ANCESTOR,
      [BloodRelationType.UNCLE_AUNT]: BloodRelationType.NEPHEW_NIECE,
      [BloodRelationType.NEPHEW_NIECE]: BloodRelationType.UNCLE_AUNT,
      [BloodRelationType.SIBLING]: BloodRelationType.SIBLING,
      [BloodRelationType.COUSIN]: BloodRelationType.COUSIN,
      [BloodRelationType.SPOUSE]: BloodRelationType.SPOUSE,
      [BloodRelationType.IN_LAW]: BloodRelationType.IN_LAW,
      marriage: 'marriage',
      father_child: BloodRelationType.DESCENDANT,
      mother_child: BloodRelationType.DESCENDANT
    };
    
    return reverseMap[relationType] || relationType;
  }


  /**
   * 检查是否为同一家族
   */
  _isSameFamily(familyName1, familyName2) {
    if (familyName1 === familyName2) return true;
    
    // 去掉"氏"字比较
    const surname1 = familyName1.replace(/氏$/, '');
    const surname2 = familyName2.replace(/氏$/, '');
    
    return surname1 === surname2;
  }

  /**
   * 获取血缘关系称谓
   * @param {Object} bloodRelation - 血缘关系数据
   * @returns {string} 称谓
   */
  _getBloodRelationTitle(bloodRelation) {
    if (!bloodRelation) {
      console.warn('血缘关系数据为空');
      return '未知关系';
    }

    let { bloodRelationType, generationGap = 0, fromPerson, toPerson } = bloodRelation;
    if (!bloodRelationType) {
      console.warn('血缘关系类型缺失:', bloodRelation);
      return '族人';
    }

    const fromGender = fromPerson?.gender || '未知';
    const toGender = toPerson?.gender || '未知';
    const toGenderKey = toGender === '男' ? 'male' : (toGender === '女' ? 'female' : 'male');
    const fromGen = Number.isFinite(fromPerson?.generation) ? fromPerson.generation : null;
    const toGen = Number.isFinite(toPerson?.generation) ? toPerson.generation : null;
    const generationDiff = fromGen !== null && toGen !== null ? toGen - fromGen : null;

    const resolveAncestorTitle = gap => {
      const cfg = this.kinshipTitles.ancestor_titles[Math.abs(gap)] || this.kinshipTitles.ancestor_titles[1];
      if (cfg) return cfg[toGenderKey] || (toGender === '男' ? '父亲' : '母亲');
      return toGender === '男' ? '父亲' : '母亲';
    };

    const resolveDescendantTitle = gap => {
      const cfg = this.kinshipTitles.descendant_titles[Math.abs(gap)] || this.kinshipTitles.descendant_titles[1];
      if (cfg) return cfg[toGenderKey] || (toGender === '男' ? '儿子' : '女儿');
      return toGender === '男' ? '儿子' : '女儿';
    };

    const resolveSiblingTitle = () => {
      if (!fromPerson || !toPerson) return toGender === '男' ? '兄弟' : '姐妹';
      const ageDiff = (toPerson.age ?? 0) - (fromPerson.age ?? 0);
      let isOlder;
      if (Math.abs(ageDiff) >= 1) {
        isOlder = ageDiff > 0;
      } else if (Number.isFinite(toPerson.birthOrder) && Number.isFinite(fromPerson.birthOrder)) {
        if (toPerson.birthOrder === fromPerson.birthOrder && Number.isFinite(toPerson.birthIndex) && Number.isFinite(fromPerson.birthIndex)) {
          isOlder = (toPerson.birthIndex ?? 0) < (fromPerson.birthIndex ?? 0);
        } else {
          isOlder = toPerson.birthOrder < fromPerson.birthOrder;
        }
      } else {
        isOlder = ageDiff > 0;
      }
      const category = isOlder ? 'older' : 'younger';
      const cfg = this.kinshipTitles.sibling_titles[category];
      if (cfg) return cfg[toGenderKey] || (toGender === '男' ? '兄弟' : '姐妹');
      return toGender === '男' ? '兄弟' : '姐妹';
    };

    const resolveCousinTitle = () => {
      if (!fromPerson || !toPerson) return toGender === '男' ? '堂兄弟' : '堂姐妹';
      const ageDiff = (toPerson.age ?? 0) - (fromPerson.age ?? 0);
      let isOlder;
      if (Math.abs(ageDiff) >= 1) {
        isOlder = ageDiff > 0;
      } else if (Number.isFinite(toPerson.birthOrder) && Number.isFinite(fromPerson.birthOrder)) {
        if (toPerson.birthOrder === fromPerson.birthOrder && Number.isFinite(toPerson.birthIndex) && Number.isFinite(fromPerson.birthIndex)) {
          isOlder = (toPerson.birthIndex ?? 0) < (fromPerson.birthIndex ?? 0);
        } else {
          isOlder = toPerson.birthOrder < fromPerson.birthOrder;
        }
      } else {
        isOlder = ageDiff > 0;
      }
      const category = isOlder ? 'older' : 'younger';
      const cfg = this.kinshipTitles.collateral_titles.cousin_titles[category];
      if (cfg) return cfg[toGenderKey] || '堂亲';
      return '堂亲';
    };

    switch (bloodRelationType) {
      case 'father_child':
      case 'mother_child': {
        if (generationDiff !== null && generationDiff <= 0) {
          return resolveAncestorTitle(Math.abs(generationDiff) || 1);
        }
        return resolveDescendantTitle(Math.abs(generationDiff) || 1);
      }
      case 'marriage':
      case BloodRelationType.SPOUSE: {
        const titles = this.kinshipTitles.spouse_titles || {};
        return titles[toGenderKey] || (toGender === '男' ? '夫君' : '妻子');
      }
      case BloodRelationType.ANCESTOR: {
        const gap = generationDiff !== null && generationDiff <= 0 ? Math.abs(generationDiff) : generationGap || 1;
        return resolveAncestorTitle(gap);
      }
      case BloodRelationType.DESCENDANT: {
        if (generationDiff !== null && generationDiff <= 0) {
          return resolveAncestorTitle(Math.abs(generationDiff) || generationGap || 1);
        }
        const gap = generationDiff !== null && generationDiff > 0 ? generationDiff : generationGap || 1;
        return resolveDescendantTitle(gap);
      }
      case BloodRelationType.SIBLING:
        return resolveSiblingTitle();
      case BloodRelationType.UNCLE_AUNT:
        return toGender === '男' ? '叔父' : '姑母';
      case BloodRelationType.NEPHEW_NIECE:
        return toGender === '男' ? '侄子' : '侄女';
      case BloodRelationType.COUSIN:
        return resolveCousinTitle();
      case BloodRelationType.NO_RELATION:
        return '陌生人';
      default:
        console.warn('未识别的血缘关系类型:', bloodRelationType);
        return '族人';
    }
  }  getFamilyStatistics(familyName) {
    const family = this.families.get(familyName);
    if (!family) return null;
    
    // 获取血缘关系数据
    const bloodRelations = this.bloodRelations.get(familyName);
    
    const stats = {
      familyName: familyName,
      totalMembers: family.totalMembers || (family.members ? family.members.length : 0),
      generationCount: 0,
      generationBreakdown: {},
      averageAge: 0,
      oldestMember: null,
      youngestMember: null,
      familyHead: family.familyHead || null,
      bloodRelationsCount: bloodRelations ? bloodRelations.size : 0,
      familyReputation: family.familyReputation || 0
    };
    
    let totalAge = 0;
    let oldestAge = 0;
    let youngestAge = 100;
    let memberCount = 0;
    
    // 适配新的数据结构
    if (family.members) {
      // 新结构：直接从members数组统计
      const generationGroups = {};
      
      family.members.forEach(member => {
        const age = member.age || 0;
        const generation = member.generation || this._inferGenerationFromAge(age);
        const genKey = this._getGenerationKey(generation);
        
        // 分组统计
        if (!generationGroups[genKey]) {
          generationGroups[genKey] = [];
        }
        generationGroups[genKey].push(member);
        
        // 年龄统计
        totalAge += age;
        memberCount++;
        
        if (age > oldestAge) {
          oldestAge = age;
          stats.oldestMember = member;
        }
        
        if (age < youngestAge) {
          youngestAge = age;
          stats.youngestMember = member;
        }
      });
      
      // 构建代数分解
      Object.entries(generationGroups).forEach(([genKey, members]) => {
        if (members.length > 0) {
          stats.generationCount++;
          stats.generationBreakdown[genKey] = {
            count: members.length,
            members: members.map(m => ({
              name: m.name || '未命名',
              role: m.role || '成员',
              age: m.age || 0,
              gender: m.gender || '未知'
            }))
          };
        }
      });
      
    } else if (family.generations) {
      // 旧结构：从generations对象统计
      Object.entries(family.generations).forEach(([genKey, members]) => {
        if (members && members.length > 0) {
          stats.generationCount++;
          stats.generationBreakdown[genKey] = {
            count: members.length,
            members: members.map(m => ({
              name: m.name || '未命名',
              role: m.role || '成员',
              age: m.age || 0,
              gender: m.gender || '未知'
            }))
          };
          
          members.forEach(member => {
            const age = member.age || 0;
            totalAge += age;
            memberCount++;
            
            if (age > oldestAge) {
              oldestAge = age;
              stats.oldestMember = member;
            }
            
            if (age < youngestAge) {
              youngestAge = age;
              stats.youngestMember = member;
            }
          });
        }
      });
    }
    
    // 计算平均年龄
    stats.averageAge = memberCount > 0 ? Math.round(totalAge / memberCount) : 0;
    
    // 更新实际成员计数
    if (memberCount > 0) {
      stats.totalMembers = memberCount;
    }
    
    return stats;
  }
  
  /**
   * 根据年龄推断代数（辅助方法）
   * @param {number} age - 年龄
   * @returns {number} 推断的代数
   */
  _inferGenerationFromAge(age) {
    if (age >= 75) return 1; // 高祖辈
    if (age >= 55) return 2; // 曾祖辈
    if (age >= 35) return 3; // 祖辈
    if (age >= 17) return 4; // 父母辈
    return 5; // 子女辈
  }

  /**
   * 辅助方法：初始化代数配置
   */
  _initGenerationConfig() {
    try {
      if (this.gameEngine?.PopulationRules?.initialized) {
        return this.gameEngine.PopulationRules.getGenerationConfig();
      }
    } catch (error) {
      console.warn('PopulationRules 未就绪，使用默认世代配置');
    }
    
    // 返回合理的默认配置
    return {
      "1": { "age_range": [75, 90], "survival_rate": 0.05, "name": "高祖辈" },
      "2": { "age_range": [55, 75], "survival_rate": 0.3, "name": "曾祖辈" },
      "3": { "age_range": [35, 55], "survival_rate": 0.6, "name": "祖父母辈" },
      "4": { "age_range": [17, 40], "survival_rate": 0.8, "name": "父母辈" },
      "5": { "age_range": [1, 17], "survival_rate": 0.4, "name": "子女辈" }
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

  updateMemberIds(familyName, oldId, newId) {
    //console.log(`开始更新成员ID: ${oldId} -> ${newId}`);
    
    // 更新bloodRelations中的ID
    const familyBloodRelations = this.bloodRelations.get(familyName);
    if (familyBloodRelations) {
      const newRelations = new Map();
      for (const [relationKey, relation] of familyBloodRelations) {
        const updatedKey = relationKey.replace(oldId, newId);
        const updatedRelation = { ...relation };
        
        // 更新关系数据中的ID
        if (updatedRelation.fromCharacterId === oldId) {
          updatedRelation.fromCharacterId = newId;
        }
        if (updatedRelation.toCharacterId === oldId) {
          updatedRelation.toCharacterId = newId;
        }
        
        // 更新人员引用中的ID
        if (updatedRelation.fromPerson && (updatedRelation.fromPerson.characterId === oldId || updatedRelation.fromPerson.id === oldId)) {
          updatedRelation.fromPerson = { ...updatedRelation.fromPerson };
          updatedRelation.fromPerson.characterId = newId;
          if (updatedRelation.fromPerson.id === oldId) {
            updatedRelation.fromPerson.id = newId;
          }
        }
        
        if (updatedRelation.toPerson && (updatedRelation.toPerson.characterId === oldId || updatedRelation.toPerson.id === oldId)) {
          updatedRelation.toPerson = { ...updatedRelation.toPerson };
          updatedRelation.toPerson.characterId = newId;
          if (updatedRelation.toPerson.id === oldId) {
            updatedRelation.toPerson.id = newId;
          }
        }
        
        newRelations.set(updatedKey, updatedRelation);
      }
      
      this.bloodRelations.set(familyName, newRelations);
      //console.log(`血缘关系ID更新完成: ${familyBloodRelations.size}条关系`);
    }
    
    // 更新families中的成员ID
    const family = this.families.get(familyName);
    if (family && family.members) {
      family.members.forEach(member => {
        if (member.characterId === oldId || member.id === oldId) {
          member.characterId = newId;
          if (member.id === oldId) {
            member.id = newId;
          }
        }
      });
      
      // 更新族长引用
      if (family.familyHead && (family.familyHead.characterId === oldId || family.familyHead.id === oldId)) {
        family.familyHead.characterId = newId;
        if (family.familyHead.id === oldId) {
          family.familyHead.id = newId;
        }
      }
      
      //console.log(`家族成员ID更新完成: ${family.members.length}个成员`);
    }
    
    //console.log(`成员ID更新完成: ${oldId} -> ${newId}`);
  }

  
  /**
   * 获取家族所有成员
   * @param {string} familyName - 家族名
   * @returns {Array} 家族成员列表
   */
  getFamilyMembers(familyName) {
    const family = this.families.get(familyName);
    if (!family) return [];
    
    // 适配新的数据结构
    if (family.members) {
      return family.members.sort((a, b) => (a.generation || 5) - (b.generation || 5) || a.age - b.age);
    }
    
    // 兼容旧结构
    if (family.generations) {
      const allMembers = [];
      Object.values(family.generations).forEach(members => {
        allMembers.push(...members);
      });
      return allMembers.sort((a, b) => a.generation - b.generation || a.age - b.age);
    }
    
    return [];
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
      let targetId = null;
      let targetPerson = null;
      
      // 检查正向关系（当前角色为fromCharacterId）
      if (relationData.fromCharacterId === characterId) {
        targetId = relationData.toCharacterId;
        targetPerson = relationData.toPerson;
      }
      // 检查反向关系（当前角色为toCharacterId）
      else if (relationData.toCharacterId === characterId) {
        targetId = relationData.fromCharacterId;
        targetPerson = relationData.fromPerson;
      }
      
      if (targetId && targetPerson) {
        const kinshipInfo = this.getKinship(familyName, characterId, targetId);
        if (kinshipInfo) {
          relations.push({
            targetId: targetId,
            targetName: targetPerson.name,
            kinshipTitle: kinshipInfo.title,
            relationType: kinshipInfo.type,
            bloodlineStrength: kinshipInfo.strength,
            generationGap: kinshipInfo.generationGap
          });
        }
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
    const memberCount = family.members ? family.members.length : family.totalMembers || 0;
    if (memberCount === 0) {
      errors.push('家族无成员');
    }
    
    // 检查血缘关系完整性（从bloodRelations Map获取）
    const bloodRelations = this.bloodRelations.get(familyName);
    if (!bloodRelations || bloodRelations.size === 0) {
      warnings.push('家族无血缘关系记录');
    }
    
    // 检查成员数据完整性（适配新结构）
    if (family.members) {
      family.members.forEach(member => {
        if (!member.characterId && !member.id) {
          errors.push(`成员 ${member.name || 'unknown'} 缺少ID`);
        }
        if (!member.name) {
          errors.push(`成员ID ${member.characterId || member.id} 缺少姓名`);
        }
        if (member.age < 0 || member.age > 100) {
          warnings.push(`成员 ${member.name} 年龄异常: ${member.age}岁`);
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      memberCount: memberCount,
      relationCount: bloodRelations ? bloodRelations.size : 0
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
    
    // 获取独立存储的血缘关系数据
    const bloodRelations = this.bloodRelations.get(familyName);
    
    return {
      ...family,
      bloodRelations: bloodRelations ? Array.from(bloodRelations.entries()) : [],
      exportedAt: Date.now(),
      version: '2.0'  // 版本号升级，标识新数据格式
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
      
      // 移除bloodRelations字段，避免数据重复
      const family = {
        ...familyData,
        importedAt: Date.now()
      };
      delete family.bloodRelations; // 移除，因为现在独立存储
      
      // 分别存储家族数据和血缘关系
      this.families.set(family.familyName, family);
      this.bloodRelations.set(family.familyName, bloodRelations);
      // 移除 familyTrees 存储，因为 _buildFamilyTree 方法已删除
      
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
      relations: this.bloodRelations.delete(familyName)
      // 移除 familyTrees 清理，因为不再使用
    };
    
    const success = deleted.family || deleted.relations;
    
    if (success) {
      console.log(`✅ 家族 ${familyName} 数据已清理`);
    }
    
    return success;
  }
}

export default FamilySystem;
