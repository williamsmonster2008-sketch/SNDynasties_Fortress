/**
 * virtue_system_event_adapter.js - 德行系统事件适配器
 * 
 * 功能：为现有的德行系统添加事件支持
 * 设计：非侵入性适配器，包装现有方法，添加事件发射
 * 特色：支持南北朝时期的德行体系和道德评价
 */

/**
 * 为德行系统添加事件支持
 * @param {Object} virtueSystem - 德行系统实例
 * @param {Object} eventBus - 事件总线实例
 */
export function addEventSupportToVirtueSystem(virtueSystem, eventBus) {
  if (!virtueSystem || !eventBus) {
    console.warn('⚠️ 德行系统或事件总线未提供，跳过事件适配');
    return;
  }

  console.log('🌟 为德行系统添加事件支持...');

  // 存储之前的德行等级，用于检测等级变化
  const previousVirtueLevels = new Map();

  // 包装德行变化方法
  if (virtueSystem.changeVirtue) {
    const originalChangeVirtue = virtueSystem.changeVirtue.bind(virtueSystem);
    virtueSystem.changeVirtue = function(characterId, virtueType, change, reason = '未知原因') {
      const oldValue = this.getVirtue?.(characterId, virtueType) || 0;
      const oldLevel = this.getVirtueLevel?.(characterId, virtueType) || '无德';
      
      const result = originalChangeVirtue(characterId, virtueType, change, reason);
      
      const newValue = this.getVirtue?.(characterId, virtueType) || 0;
      const newLevel = this.getVirtueLevel?.(characterId, virtueType) || '无德';
      
      // 发送德行变化事件
      eventBus.emit('virtueChanged', {
        characterId,
        virtueType,
        oldValue,
        newValue,
        change,
        reason,
        timestamp: Date.now()
      });

      // 检查德行等级变化
      if (oldLevel !== newLevel) {
        eventBus.emit('virtueLevelChanged', {
          characterId,
          virtueType,
          oldLevel,
          newLevel,
          isImprovement: this.isVirtueLevelBetter?.(newLevel, oldLevel) || (newValue > oldValue),
          timestamp: Date.now()
        });

        // 特殊德行等级达成事件
        this.checkSpecialVirtueAchievements(characterId, virtueType, newLevel, eventBus);
      }

      // 检查德行组合效果
      this.checkVirtueCombinations(characterId, eventBus);
      
      return result;
    };
  }

  // 包装德行评价方法
  if (virtueSystem.evaluateCharacterVirtue) {
    const originalEvaluateCharacterVirtue = virtueSystem.evaluateCharacterVirtue.bind(virtueSystem);
    virtueSystem.evaluateCharacterVirtue = function(characterId) {
      const result = originalEvaluateCharacterVirtue(characterId);
      
      eventBus.emit('virtueEvaluated', {
        characterId,
        evaluation: result,
        timestamp: Date.now()
      });
      
      // 检查是否达到特殊评价
      if (result && result.overallRating) {
        this.checkSpecialEvaluations(characterId, result, eventBus);
      }
      
      return result;
    };
  }

  // 包装德行惩罚方法
  if (virtueSystem.applyVirtuePenalty) {
    const originalApplyVirtuePenalty = virtueSystem.applyVirtuePenalty.bind(virtueSystem);
    virtueSystem.applyVirtuePenalty = function(characterId, penaltyType, severity, reason) {
      const result = originalApplyVirtuePenalty(characterId, penaltyType, severity, reason);
      
      eventBus.emit('virtuePenaltyApplied', {
        characterId,
        penaltyType,
        severity,
        reason,
        result,
        timestamp: Date.now()
      });
      
      return result;
    };
  }

  // 包装德行奖励方法
  if (virtueSystem.applyVirtueReward) {
    const originalApplyVirtueReward = virtueSystem.applyVirtueReward.bind(virtueSystem);
    virtueSystem.applyVirtueReward = function(characterId, rewardType, magnitude, reason) {
      const result = originalApplyVirtueReward(characterId, rewardType, magnitude, reason);
      
      eventBus.emit('virtueRewardApplied', {
        characterId,
        rewardType,
        magnitude,
        reason,
        result,
        timestamp: Date.now()
      });
      
      return result;
    };
  }

  // 添加特殊德行成就检查方法
  virtueSystem.checkSpecialVirtueAchievements = function(characterId, virtueType, newLevel, eventBus) {
    const achievements = {
      '孝': {
        '至孝': '达到孝道的最高境界，成为孝子典范',
        '大孝': '孝行感天动地，为人所敬仰'
      },
      '忠': {
        '忠烈': '忠心耿耿，宁死不屈',
        '忠贞': '对主公忠贞不二'
      },
      '礼': {
        '知礼': '深谙礼法，行为得体',
        '明礼': '礼仪周全，为人师表'
      },
      '义': {
        '义薄云天': '义气冲天，令人敬佩',
        '大义': '具有崇高的道德品质'
      },
      '智': {
        '睿智': '智慧超群，洞察深刻',
        '贤明': '聪明睿智，决策英明'
      },
      '信': {
        '诚信': '一诺千金，信守承诺',
        '守信': '言出必行，从不失信'
      }
    };

    if (achievements[virtueType] && achievements[virtueType][newLevel]) {
      eventBus.emit('virtueAchievementUnlocked', {
        characterId,
        virtueType,
        level: newLevel,
        description: achievements[virtueType][newLevel],
        timestamp: Date.now()
      });
    }

    // 检查是否达到德行圣人级别
    const allVirtues = this.getAllVirtues?.(characterId) || {};
    const highLevelVirtues = Object.entries(allVirtues).filter(([type, value]) => {
      const level = this.getVirtueLevel?.(characterId, type);
      return ['至孝', '忠烈', '明礼', '义薄云天', '睿智', '诚信'].includes(level);
    });

    if (highLevelVirtues.length >= 3) {
      eventBus.emit('virtueAchievementUnlocked', {
        characterId,
        virtueType: 'overall',
        level: '德行圣人',
        description: '在多个德行方面都达到了极高境界，成为德行典范',
        timestamp: Date.now()
      });
    }
  };

  // 添加德行组合效果检查方法
  virtueSystem.checkVirtueCombinations = function(characterId, eventBus) {
    const allVirtues = this.getAllVirtues?.(characterId) || {};
    
    // 孝忠双全
    if (this.getVirtueLevel?.(characterId, '孝') === '至孝' && 
        this.getVirtueLevel?.(characterId, '忠') === '忠烈') {
      eventBus.emit('virtueComboAchieved', {
        characterId,
        comboType: '孝忠双全',
        description: '既孝顺父母，又忠于君主，德行完备',
        timestamp: Date.now()
      });
    }

    // 智勇双全
    if (this.getVirtueLevel?.(characterId, '智') === '睿智' && 
        this.getVirtueLevel?.(characterId, '勇') === '勇猛') {
      eventBus.emit('virtueComboAchieved', {
        characterId,
        comboType: '智勇双全',
        description: '既有过人智慧，又有无畏勇气',
        timestamp: Date.now()
      });
    }

    // 仁义道德
    const moralVirtues = ['仁', '义', '礼', '智', '信'];
    const highMoralCount = moralVirtues.filter(virtue => {
      const level = this.getVirtueLevel?.(characterId, virtue);
      return level && !['无德', '低德'].includes(level);
    }).length;

    if (highMoralCount >= 4) {
      eventBus.emit('virtueComboAchieved', {
        characterId,
        comboType: '仁义道德',
        description: '在仁义道德各方面都有很高造诣',
        timestamp: Date.now()
      });
    }
  };

  // 添加特殊评价检查方法
  virtueSystem.checkSpecialEvaluations = function(characterId, evaluation, eventBus) {
    if (!evaluation.overallRating) return;

    const specialEvaluations = {
      '德高望重': '德行极高，为众人敬仰',
      '品德高尚': '品德优良，堪为表率',
      '道德败坏': '品行不端，为人不齿',
      '无德无行': '毫无道德品质可言'
    };

    if (specialEvaluations[evaluation.overallRating]) {
      eventBus.emit('specialVirtueEvaluation', {
        characterId,
        evaluation: evaluation.overallRating,
        description: specialEvaluations[evaluation.overallRating],
        socialImpact: this.calculateSocialImpact(evaluation.overallRating),
        timestamp: Date.now()
      });
    }
  };

  // 添加社会影响计算方法
  virtueSystem.calculateSocialImpact = function(overallRating) {
    const impacts = {
      '德高望重': { reputation: +50, influence: +30, respect: +40 },
      '品德高尚': { reputation: +30, influence: +20, respect: +25 },
      '品行端正': { reputation: +15, influence: +10, respect: +15 },
      '普通': { reputation: 0, influence: 0, respect: 0 },
      '品行不端': { reputation: -15, influence: -10, respect: -20 },
      '道德败坏': { reputation: -40, influence: -25, respect: -35 },
      '无德无行': { reputation: -60, influence: -40, respect: -50 }
    };

    return impacts[overallRating] || impacts['普通'];
  };

  // 添加德行变化监控
  virtueSystem.startVirtueMonitoring = function() {
    setInterval(() => {
      // 检查所有角色的德行状态
      const allCharacters = this.getAllCharactersWithVirtues?.() || {};
      
      Object.entries(allCharacters).forEach(([characterId, virtues]) => {
        // 检查德行衰减
        Object.entries(virtues).forEach(([virtueType, value]) => {
          if (value > 0 && this.shouldDecayVirtue?.(characterId, virtueType)) {
            const decayAmount = this.calculateVirtueDecay?.(characterId, virtueType) || 1;
            this.changeVirtue(characterId, virtueType, -decayAmount, '时间流逝导致的德行衰减');
          }
        });

        // 检查德行冲突
        this.checkVirtueConflicts(characterId, virtues, eventBus);
      });
    }, 60000); // 每分钟检查一次
  };

  // 添加德行冲突检查方法
  virtueSystem.checkVirtueConflicts = function(characterId, virtues, eventBus) {
    // 检查矛盾的德行组合
    if (virtues['忠'] > 80 && virtues['孝'] > 80) {
      const character = this.getCharacterInfo?.(characterId);
      if (character && character.hasConflictingSituations) {
        eventBus.emit('virtueConflict', {
          characterId,
          conflictType: '忠孝难两全',
          description: '在忠君与孝亲之间面临两难选择',
          severity: 'high',
          timestamp: Date.now()
        });
      }
    }

    // 检查其他德行冲突...
    if (virtues['义'] > 80 && virtues['利'] > 80) {
      eventBus.emit('virtueConflict', {
        characterId,
        conflictType: '义利冲突',
        description: '在道义与利益之间存在矛盾',
        severity: 'medium',
        timestamp: Date.now()
      });
    }
  };

  // 启动德行监控
  if (virtueSystem.startVirtueMonitoring) {
    virtueSystem.startVirtueMonitoring();
  }

  console.log('✅ 德行系统事件支持已添加');
}

export default addEventSupportToVirtueSystem;