/**
 * skill_system_event_adapter.js - 技能系统事件适配器
 * 
 * 功能：为现有的技能系统添加事件支持
 * 设计：非侵入性适配器，包装现有方法，添加事件发射
 * 特色：支持南北朝时期的技能体系和师徒传承
 */

/**
 * 为技能系统添加事件支持
 * @param {Object} skillSystem - 技能系统实例
 * @param {Object} eventBus - 事件总线实例
 */
export function addEventSupportToSkillSystem(skillSystem, eventBus) {
  if (!skillSystem || !eventBus) {
    console.warn('⚠️ 技能系统或事件总线未提供，跳过事件适配');
    return;
  }

  console.log('🛠️ 为技能系统添加事件支持...');

  // 包装技能学习方法
  if (skillSystem.learnSkill) {
    const originalLearnSkill = skillSystem.learnSkill.bind(skillSystem);
    skillSystem.learnSkill = function(characterId, skillName, teacher = null, method = 'self_study') {
      const hadSkillBefore = this.hasSkill?.(characterId, skillName) || false;
      const result = originalLearnSkill(characterId, skillName, teacher, method);
      
      if (result && result.success !== false) {
        eventBus.emit('skillLearned', {
          characterId,
          skillName,
          teacher: teacher?.id || teacher,
          method,
          level: result.level || 1,
          isNewSkill: !hadSkillBefore,
          timestamp: Date.now()
        });

        // 师徒关系事件
        if (teacher) {
          eventBus.emit('teachingEvent', {
            teacherId: teacher.id || teacher,
            studentId: characterId,
            skillName,
            eventType: 'skill_taught',
            result,
            timestamp: Date.now()
          });
        }

        // 检查技能成就
        this.checkSkillAchievements(characterId, skillName, result.level || 1, eventBus);
      } else {
        eventBus.emit('skillLearningFailed', {
          characterId,
          skillName,
          teacher: teacher?.id || teacher,
          reason: result?.reason || '学习失败',
          timestamp: Date.now()
        });
      }
      
      return result;
    };
  }

  // 包装技能提升方法
  if (skillSystem.improveSkill) {
    const originalImproveSkill = skillSystem.improveSkill.bind(skillSystem);
    skillSystem.improveSkill = function(characterId, skillName, experience, source = 'practice') {
      const oldLevel = this.getSkillLevel?.(characterId, skillName) || 0;
      const oldExperience = this.getSkillExperience?.(characterId, skillName) || 0;
      
      const result = originalImproveSkill(characterId, skillName, experience, source);
      
      const newLevel = this.getSkillLevel?.(characterId, skillName) || 0;
      const newExperience = this.getSkillExperience?.(characterId, skillName) || 0;
      
      // 技能提升事件
      eventBus.emit('skillImproved', {
        characterId,
        skillName,
        experienceGained: experience,
        oldExperience,
        newExperience,
        currentLevel: newLevel,
        source,
        timestamp: Date.now()
      });

      // 技能升级事件
      if (newLevel > oldLevel) {
        eventBus.emit('skillLevelUp', {
          characterId,
          skillName,
          oldLevel,
          newLevel,
          levelGained: newLevel - oldLevel,
          totalExperience: newExperience,
          timestamp: Date.now()
        });

        // 检查技能里程碑
        this.checkSkillMilestones(characterId, skillName, newLevel, eventBus);
      }
      
      return result;
    };
  }

  // 包装技能使用方法
  if (skillSystem.useSkill) {
    const originalUseSkill = skillSystem.useSkill.bind(skillSystem);
    skillSystem.useSkill = function(characterId, skillName, context = {}) {
      const skillLevel = this.getSkillLevel?.(characterId, skillName) || 0;
      const result = originalUseSkill(characterId, skillName, context);
      
      eventBus.emit('skillUsed', {
        characterId,
        skillName,
        skillLevel,
        context,
        result,
        success: result?.success !== false,
        timestamp: Date.now()
      });

      // 根据使用结果给予经验
      if (result?.success !== false) {
        const experienceGained = this.calculateUsageExperience?.(skillName, skillLevel, result) || 1;
        if (experienceGained > 0) {
          this.improveSkill(characterId, skillName, experienceGained, 'usage');
        }
      }
      
      return result;
    };
  }

  // 包装师父收徒方法
  if (skillSystem.acceptApprentice) {
    const originalAcceptApprentice = skillSystem.acceptApprentice.bind(skillSystem);
    skillSystem.acceptApprentice = function(teacherId, studentId, skillName) {
      const result = originalAcceptApprentice(teacherId, studentId, skillName);
      
      if (result && result.success !== false) {
        eventBus.emit('apprenticeshipEstablished', {
          teacherId,
          studentId,
          skillName,
          teacherLevel: this.getSkillLevel?.(teacherId, skillName),
          studentLevel: this.getSkillLevel?.(studentId, skillName),
          timestamp: Date.now()
        });

        eventBus.emit('relationshipEvent', {
          type: 'apprenticeship',
          participants: [teacherId, studentId],
          skill: skillName,
          timestamp: Date.now()
        });
      }
      
      return result;
    };
  }

  // 包装技能传承方法
  if (skillSystem.inheritSkill) {
    const originalInheritSkill = skillSystem.inheritSkill.bind(skillSystem);
    skillSystem.inheritSkill = function(fromCharacterId, toCharacterId, skillName, inheritanceType = 'family') {
      const result = originalInheritSkill(fromCharacterId, toCharacterId, skillName, inheritanceType);
      
      if (result && result.success !== false) {
        eventBus.emit('skillInherited', {
          fromCharacterId,
          toCharacterId,
          skillName,
          inheritanceType,
          inheritedLevel: result.level || 1,
          timestamp: Date.now()
        });

        // 家族技能传承特殊事件
        if (inheritanceType === 'family') {
          eventBus.emit('familySkillInheritance', {
            familyName: this.getFamilyName?.(fromCharacterId),
            skillName,
            generation: this.getGenerationDifference?.(fromCharacterId, toCharacterId),
            timestamp: Date.now()
          });
        }
      }
      
      return result;
    };
  }

  // 包装技能组合方法
  if (skillSystem.combineSkills) {
    const originalCombineSkills = skillSystem.combineSkills.bind(skillSystem);
    skillSystem.combineSkills = function(characterId, skillNames, combinationType = 'synthesis') {
      const result = originalCombineSkills(characterId, skillNames, combinationType);
      
      if (result && result.success !== false) {
        eventBus.emit('skillsCombined', {
          characterId,
          sourceSkills: skillNames,
          combinationType,
          resultSkill: result.newSkill,
          resultLevel: result.level,
          timestamp: Date.now()
        });

        // 检查特殊技能组合成就
        this.checkSkillCombinationAchievements(characterId, skillNames, result, eventBus);
      }
      
      return result;
    };
  }

  // 添加技能成就检查方法
  skillSystem.checkSkillAchievements = function(characterId, skillName, level, eventBus) {
    const achievements = {
      '农耕': {
        5: '农业新手',
        10: '经验农夫', 
        15: '农业专家',
        20: '农业大师'
      },
      '手工雕琢': {
        5: '工艺学徒',
        10: '熟练工匠',
        15: '工艺大师',
        20: '巧夺天工'
      },
      '武艺': {
        5: '武学入门',
        10: '武艺精通',
        15: '武林高手',
        20: '武道宗师'
      },
      '经义研读': {
        5: '初识文字',
        10: '博览群书',
        15: '学富五车',
        20: '文豪大儒'
      },
      '医术': {
        5: '初学医理',
        10: '小有医名',
        15: '悬壶济世',
        20: '医圣再世'
      }
    };

    if (achievements[skillName] && achievements[skillName][level]) {
      eventBus.emit('skillAchievementUnlocked', {
        characterId,
        skillName,
        level,
        achievementName: achievements[skillName][level],
        timestamp: Date.now()
      });
    }

    // 检查全技能精通
    const allSkills = this.getAllSkills?.(characterId) || {};
    const masteredSkills = Object.entries(allSkills).filter(([name, data]) => 
      (data.level || 0) >= 15
    );

    if (masteredSkills.length >= 5) {
      eventBus.emit('skillAchievementUnlocked', {
        characterId,
        skillName: 'overall',
        level: 'master',
        achievementName: '全才大师',
        description: '精通多种技能，成为真正的全才',
        timestamp: Date.now()
      });
    }
  };

  // 添加技能里程碑检查方法
  skillSystem.checkSkillMilestones = function(characterId, skillName, newLevel, eventBus) {
    const milestones = [5, 10, 15, 20, 25];
    
    if (milestones.includes(newLevel)) {
      eventBus.emit('skillMilestone', {
        characterId,
        skillName,
        level: newLevel,
        milestone: this.getMilestoneName(newLevel),
        timestamp: Date.now()
      });

      // 检查是否解锁新能力
      const unlockedAbilities = this.getUnlockedAbilities?.(skillName, newLevel) || [];
      unlockedAbilities.forEach(ability => {
        eventBus.emit('abilityUnlocked', {
          characterId,
          skillName,
          ability,
          requiredLevel: newLevel,
          timestamp: Date.now()
        });
      });
    }

    // 检查技能突破
    if (newLevel >= 20) {
      eventBus.emit('skillBreakthrough', {
        characterId,
        skillName,
        level: newLevel,
        description: '技能已达到大师级别，可以开始传授他人',
        timestamp: Date.now()
      });
    }
  };

  // 添加技能组合成就检查方法
  skillSystem.checkSkillCombinationAchievements = function(characterId, sourceSkills, result, eventBus) {
    const combinations = {
      ['农耕', '手工雕琢']: '农工结合',
      ['武艺', '医术']: '武医双修',
      ['经义研读', '医术']: '儒医传承',
      ['农耕', '经义研读']: '耕读传家',
      ['手工雕琢', '经义研读']: '文质彬彬'
    };

    const sortedSkills = [...sourceSkills].sort();
    const comboKey = sortedSkills.join(',');
    
    if (combinations[comboKey]) {
      eventBus.emit('skillComboAchievement', {
        characterId,
        sourceSkills,
        achievementName: combinations[comboKey],
        resultSkill: result.newSkill,
        timestamp: Date.now()
      });
    }
  };

  // 添加里程碑名称获取方法
  skillSystem.getMilestoneName = function(level) {
    const names = {
      5: '入门',
      10: '熟练',
      15: '精通',
      20: '大师',
      25: '宗师'
    };
    return names[level] || '未知';
  };

  // 添加技能衰减检查方法
  skillSystem.checkSkillDecay = function(characterId, skillName) {
    const lastUsed = this.getSkillLastUsed?.(characterId, skillName);
    const now = Date.now();
    const daysSinceLastUse = (now - lastUsed) / (1000 * 60 * 60 * 24);
    
    // 超过30天未使用开始衰减
    if (daysSinceLastUse > 30) {
      const decayAmount = Math.floor(daysSinceLastUse / 30);
      return Math.min(decayAmount, 5); // 最多衰减5点
    }
    
    return 0;
  };

  // 添加技能监控方法
  skillSystem.startSkillMonitoring = function() {
    setInterval(() => {
      const allCharacters = this.getAllCharactersWithSkills?.() || {};
      
      Object.entries(allCharacters).forEach(([characterId, skills]) => {
        Object.entries(skills).forEach(([skillName, skillData]) => {
          // 检查技能衰减
          const decayAmount = this.checkSkillDecay(characterId, skillName);
          if (decayAmount > 0) {
            eventBus.emit('skillDecayed', {
              characterId,
              skillName,
              decayAmount,
              newLevel: Math.max(0, (skillData.level || 0) - decayAmount),
              timestamp: Date.now()
            });
          }

          // 检查技能瓶颈
          this.checkSkillBottleneck(characterId, skillName, skillData, eventBus);
        });

        // 检查技能平衡
        this.checkSkillBalance(characterId, skills, eventBus);
      });
    }, 3600000); // 每小时检查一次
  };

  // 添加技能瓶颈检查方法
  skillSystem.checkSkillBottleneck = function(characterId, skillName, skillData, eventBus) {
    const level = skillData.level || 0;
    const experience = skillData.experience || 0;
    const requiredExp = this.getRequiredExperience?.(skillName, level + 1) || 100;
    
    // 如果经验卡在升级门槛很久
    if (experience >= requiredExp * 0.9 && experience < requiredExp) {
      const stuckTime = this.getStuckTime?.(characterId, skillName) || 0;
      if (stuckTime > 86400000) { // 超过24小时
        eventBus.emit('skillBottleneck', {
          characterId,
          skillName,
          currentLevel: level,
          currentExperience: experience,
          requiredExperience: requiredExp,
          stuckTime,
          suggestions: this.getBottleneckSuggestions?.(skillName, level),
          timestamp: Date.now()
        });
      }
    }
  };

  // 添加技能平衡检查方法
  skillSystem.checkSkillBalance = function(characterId, skills, eventBus) {
    const skillLevels = Object.values(skills).map(s => s.level || 0);
    const maxLevel = Math.max(...skillLevels);
    const minLevel = Math.min(...skillLevels);
    const avgLevel = skillLevels.reduce((a, b) => a + b, 0) / skillLevels.length;
    
    // 技能发展不平衡警告
    if (maxLevel - minLevel > 10 && skillLevels.length > 3) {
      eventBus.emit('skillImbalanceWarning', {
        characterId,
        maxLevel,
        minLevel,
        avgLevel,
        imbalanceLevel: maxLevel - minLevel,
        recommendation: '建议平衡发展各项技能',
        timestamp: Date.now()
      });
    }

    // 专精发展建议
    if (maxLevel >= 15 && maxLevel - avgLevel > 5) {
      eventBus.emit('skillSpecializationOpportunity', {
        characterId,
        specializedSkills: Object.entries(skills)
          .filter(([name, data]) => (data.level || 0) >= 15)
          .map(([name]) => name),
        recommendation: '可以考虑进一步专精发展',
        timestamp: Date.now()
      });
    }
  };

  // 添加技能匹配度计算方法
  skillSystem.calculateSkillSynergy = function(characterId) {
    const skills = this.getAllSkills?.(characterId) || {};
    const synergies = {
      '农耕': ['畜牧养殖', '工具制作'],
      '手工雕琢': ['工具制作', '建筑营造'],
      '武艺': ['体力训练', '战术指挥'],
      '医术': ['药材种植', '经义研读'],
      '经义研读': ['书法', '教学']
    };

    let totalSynergy = 0;
    Object.entries(skills).forEach(([skillName, skillData]) => {
      const relatedSkills = synergies[skillName] || [];
      relatedSkills.forEach(relatedSkill => {
        if (skills[relatedSkill]) {
          totalSynergy += Math.min(skillData.level || 0, skills[relatedSkill].level || 0) * 0.1;
        }
      });
    });

    return totalSynergy;
  };

  // 启动技能监控
  if (skillSystem.startSkillMonitoring) {
    skillSystem.startSkillMonitoring();
  }

  console.log('✅ 技能系统事件支持已添加');
}

export default addEventSupportToSkillSystem;