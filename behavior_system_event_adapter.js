/**
 * behavior_system_event_adapter.js - 行为系统事件适配器
 * 
 * 功能：为现有的行为系统添加事件支持
 * 设计：非侵入性适配器，包装现有方法，添加事件发射
 * 特色：支持南北朝时期的行为模式和社会规范
 */

/**
 * 为行为系统添加事件支持
 * @param {Object} behaviorSystem - 行为系统实例
 * @param {Object} eventBus - 事件总线实例
 */
export function addEventSupportToBehaviorSystem(behaviorSystem, eventBus) {
  if (!behaviorSystem || !eventBus) {
    console.warn('⚠️ 行为系统或事件总线未提供，跳过事件适配');
    return;
  }

  console.log('🎭 为行为系统添加事件支持...');

  // 包装行为执行方法
  if (behaviorSystem.executeBehavior) {
    const originalExecuteBehavior = behaviorSystem.executeBehavior.bind(behaviorSystem);
    behaviorSystem.executeBehavior = function(characterId, behaviorType, params = {}) {
      const character = this.getCharacter?.(characterId);
      const behaviorData = this.getBehaviorData?.(behaviorType) || {};
      
      const result = originalExecuteBehavior(characterId, behaviorType, params);
      
      eventBus.emit('behaviorExecuted', {
        characterId,
        behaviorType,
        params,
        result,
        success: result?.success !== false,
        timestamp: Date.now(),
        duration: result?.duration || 0,
        effects: result?.effects || []
      });

      // 根据行为类型发送特定事件
      this.emitSpecificBehaviorEvents(characterId, behaviorType, result, eventBus);
      
      // 检查行为模式
      this.analyzeBehaviorPattern(characterId, behaviorType, eventBus);
      
      return result;
    };
  }

  // 包装行为验证方法
  if (behaviorSystem.validateBehavior) {
    const originalValidateBehavior = behaviorSystem.validateBehavior.bind(behaviorSystem);
    behaviorSystem.validateBehavior = function(characterId, behaviorType, context = {}) {
      const result = originalValidateBehavior(characterId, behaviorType, context);
      
      if (!result.valid) {
        eventBus.emit('behaviorBlocked', {
          characterId,
          behaviorType,
          context,
          reasons: result.reasons || [],
          constraints: result.constraints || [],
          timestamp: Date.now()
        });
      } else {
        eventBus.emit('behaviorValidated', {
          characterId,
          behaviorType,
          context,
          requirements: result.requirements || [],
          timestamp: Date.now()
        });
      }
      
      return result;
    };
  }

  // 包装行为调度方法
  if (behaviorSystem.scheduleBehavior) {
    const originalScheduleBehavior = behaviorSystem.scheduleBehavior.bind(behaviorSystem);
    behaviorSystem.scheduleBehavior = function(characterId, behaviorType, scheduledTime, priority = 'normal') {
      const result = originalScheduleBehavior(characterId, behaviorType, scheduledTime, priority);
      
      eventBus.emit('behaviorScheduled', {
        characterId,
        behaviorType,
        scheduledTime,
        priority,
        scheduleId: result?.scheduleId,
        timestamp: Date.now()
      });
      
      return result;
    };
  }

  // 包装行为习惯更新方法
  if (behaviorSystem.updateBehaviorHabit) {
    const originalUpdateBehaviorHabit = behaviorSystem.updateBehaviorHabit.bind(behaviorSystem);
    behaviorSystem.updateBehaviorHabit = function(characterId, behaviorType, change) {
      const oldHabit = this.getBehaviorHabit?.(characterId, behaviorType) || 0;
      const result = originalUpdateBehaviorHabit(characterId, behaviorType, change);
      const newHabit = this.getBehaviorHabit?.(characterId, behaviorType) || 0;
      
      eventBus.emit('behaviorHabitChanged', {
        characterId,
        behaviorType,
        oldHabit,
        newHabit,
        change,
        timestamp: Date.now()
      });

      // 检查习惯形成
      this.checkHabitFormation(characterId, behaviorType, newHabit, eventBus);
      
      return result;
    };
  }

  // 添加特定行为事件发射方法
  behaviorSystem.emitSpecificBehaviorEvents = function(characterId, behaviorType, result, eventBus) {
    const behaviorCategories = {
      // 生产类行为
      'production': ['垦荒耕种', '畜牧养殖', '拓地伐林', '水产捕捞', '手工雕琢', '采石挖矿'],
      // 社交类行为
      'social': ['觅求好友', '追求伴侣', '社集看戏', '饮酒聚宴', '起舞弄乐'],
      // 学习类行为
      'learning': ['经义研读', '拜师收徒', '工艺革新', '穷经悟道'],
      // 维护类行为
      'maintenance': ['进食饮水', '休息睡眠', '盥洗沐浴', '更衣小解'],
      // 宗教类行为
      'religious': ['祝祷祭祀', '求神拜佛', '修身出家', '占卜起卦'],
      // 娱乐类行为
      'entertainment': ['赌博对弈', '踏青出游', '艺术创作'],
      // 违法类行为
      'deviant': ['偷窃劫掠', '通奸偷情', '邻里斗殴', '亲族复仇']
    };

    Object.entries(behaviorCategories).forEach(([category, behaviors]) => {
      if (behaviors.includes(behaviorType)) {
        eventBus.emit(`${category}BehaviorExecuted`, {
          characterId,
          behaviorType,
          category,
          result,
          timestamp: Date.now()
        });
      }
    });

    // 特殊行为事件
    switch (behaviorType) {
      case '拜师收徒':
        if (result.success) {
          eventBus.emit('mentorshipEstablished', {
            teacherId: result.teacherId,
            studentId: characterId,
            skill: result.skill,
            timestamp: Date.now()
          });
        }
        break;

      case '婚丧嫁娶':
        eventBus.emit('familyEvent', {
          eventType: result.eventType || 'marriage',
          participants: result.participants || [characterId],
          familyImpact: result.familyImpact || {},
          timestamp: Date.now()
        });
        break;

      case '亲族复仇':
        eventBus.emit('conflictEvent', {
          type: 'family_revenge',
          instigator: characterId,
          target: result.target,
          reason: result.reason,
          outcome: result.outcome,
          timestamp: Date.now()
        });
        break;
    }
  };

  // 添加行为模式分析方法
  behaviorSystem.analyzeBehaviorPattern = function(characterId, behaviorType, eventBus) {
    const recentBehaviors = this.getRecentBehaviors?.(characterId, 7) || []; // 最近7天
    const behaviorCount = recentBehaviors.filter(b => b.type === behaviorType).length;
    
    // 检查行为频率异常
    if (behaviorCount > 10) {
      eventBus.emit('behaviorPatternAlert', {
        characterId,
        behaviorType,
        pattern: 'excessive_frequency',
        frequency: behaviorCount,
        timeframe: '7days',
        timestamp: Date.now()
      });
    }

    // 检查行为多样性
    const uniqueBehaviors = new Set(recentBehaviors.map(b => b.type)).size;
    if (uniqueBehaviors < 3 && recentBehaviors.length > 5) {
      eventBus.emit('behaviorPatternAlert', {
        characterId,
        pattern: 'low_diversity',
        uniqueBehaviors,
        totalBehaviors: recentBehaviors.length,
        timestamp: Date.now()
      });
    }

    // 检查行为时间模式
    this.checkTemporalPatterns(characterId, recentBehaviors, eventBus);
  };

  // 添加习惯形成检查方法
  behaviorSystem.checkHabitFormation = function(characterId, behaviorType, habitLevel, eventBus) {
    const habitThresholds = {
      25: 'habit_forming',
      50: 'habit_established', 
      75: 'strong_habit',
      90: 'ingrained_habit'
    };

    Object.entries(habitThresholds).forEach(([threshold, habitType]) => {
      if (habitLevel >= parseInt(threshold) && habitLevel - 5 < parseInt(threshold)) {
        eventBus.emit('habitFormation', {
          characterId,
          behaviorType,
          habitType,
          habitLevel,
          threshold: parseInt(threshold),
          timestamp: Date.now()
        });
      }
    });

    // 检查习惯冲突
    this.checkHabitConflicts(characterId, behaviorType, habitLevel, eventBus);
  };

  // 添加习惯冲突检查方法
  behaviorSystem.checkHabitConflicts = function(characterId, behaviorType, habitLevel, eventBus) {
    const conflictingBehaviors = {
      '求神拜佛': ['赌博对弈', '通奸偷情'],
      '经义研读': ['赌博对弈', '偷窃劫掠'],
      '祝祷祭祀': ['亲族复仇', '邻里斗殴'],
      '修身出家': ['追求伴侣', '男欢女爱']
    };

    if (conflictingBehaviors[behaviorType] && habitLevel > 50) {
      const allHabits = this.getAllBehaviorHabits?.(characterId) || {};
      
      conflictingBehaviors[behaviorType].forEach(conflictBehavior => {
        const conflictHabit = allHabits[conflictBehavior] || 0;
        if (conflictHabit > 50) {
          eventBus.emit('behaviorConflict', {
            characterId,
            primaryBehavior: behaviorType,
            conflictingBehavior: conflictBehavior,
            primaryHabit: habitLevel,
            conflictingHabit: conflictHabit,
            severity: Math.min(habitLevel, conflictHabit) / 100,
            timestamp: Date.now()
          });
        }
      });
    }
  };

  // 添加时间模式检查方法
  behaviorSystem.checkTemporalPatterns = function(characterId, recentBehaviors, eventBus) {
    const timePatterns = {};
    
    recentBehaviors.forEach(behavior => {
      const hour = new Date(behavior.timestamp).getHours();
      const timeSlot = this.getTimeSlot(hour);
      
      if (!timePatterns[timeSlot]) {
        timePatterns[timeSlot] = {};
      }
      if (!timePatterns[timeSlot][behavior.type]) {
        timePatterns[timeSlot][behavior.type] = 0;
      }
      timePatterns[timeSlot][behavior.type]++;
    });

    // 检查异常时间行为
    Object.entries(timePatterns).forEach(([timeSlot, behaviors]) => {
      Object.entries(behaviors).forEach(([behaviorType, count]) => {
        if (this.isAbnormalTimeForBehavior(timeSlot, behaviorType) && count > 2) {
          eventBus.emit('abnormalTimeBehavior', {
            characterId,
            behaviorType,
            timeSlot,
            frequency: count,
            timestamp: Date.now()
          });
        }
      });
    });
  };

  // 添加时间段获取方法
  behaviorSystem.getTimeSlot = function(hour) {
    if (hour >= 5 && hour < 8) return '黎明';
    if (hour >= 8 && hour < 12) return '上午';
    if (hour >= 12 && hour < 14) return '正午';
    if (hour >= 14 && hour < 18) return '下午';
    if (hour >= 18 && hour < 21) return '黄昏';
    return '夜晚';
  };

  // 添加异常时间行为检查方法
  behaviorSystem.isAbnormalTimeForBehavior = function(timeSlot, behaviorType) {
    const normalTimes = {
      '垦荒耕种': ['黎明', '上午', '下午'],
      '进食饮水': ['上午', '正午', '黄昏'],
      '休息睡眠': ['夜晚'],
      '社集看戏': ['下午', '黄昏'],
      '偷窃劫掠': ['夜晚'], // 这是正常的，不算异常
      '祝祷祭祀': ['黎明', '黄昏']
    };

    const abnormalBehaviors = ['偷窃劫掠', '通奸偷情', '亲族复仇'];
    
    // 违法行为在白天是异常的
    if (abnormalBehaviors.includes(behaviorType)) {
      return !['夜晚'].includes(timeSlot);
    }

    // 正常行为在不合适时间是异常的
    if (normalTimes[behaviorType]) {
      return !normalTimes[behaviorType].includes(timeSlot);
    }

    return false;
  };

  // 添加行为监控方法
  behaviorSystem.startBehaviorMonitoring = function() {
    setInterval(() => {
      const allCharacters = this.getAllCharactersWithBehaviors?.() || {};
      
      Object.entries(allCharacters).forEach(([characterId, behaviorData]) => {
        // 检查行为平衡
        this.checkBehaviorBalance(characterId, behaviorData, eventBus);
        
        // 检查社会适应性
        this.checkSocialAdaptation(characterId, behaviorData, eventBus);
        
        // 检查行为发展趋势
        this.checkBehaviorTrends(characterId, behaviorData, eventBus);
      });
    }, 1800000); // 每30分钟检查一次
  };

  // 添加行为平衡检查方法
  behaviorSystem.checkBehaviorBalance = function(characterId, behaviorData, eventBus) {
    const categories = {
      work: ['垦荒耕种', '畜牧养殖', '手工雕琢'],
      social: ['觅求好友', '社集看戏', '饮酒聚宴'],
      rest: ['休息睡眠', '盥洗沐浴', '进食饮水'],
      learning: ['经义研读', '拜师收徒', '工艺革新'],
      entertainment: ['赌博对弈', '踏青出游', '起舞弄乐']
    };

    const categoryScores = {};
    Object.entries(categories).forEach(([category, behaviors]) => {
      categoryScores[category] = behaviors.reduce((sum, behavior) => {
        return sum + (behaviorData.habits?.[behavior] || 0);
      }, 0) / behaviors.length;
    });

    const maxScore = Math.max(...Object.values(categoryScores));
    const minScore = Math.min(...Object.values(categoryScores));
    
    if (maxScore - minScore > 40) {
      eventBus.emit('behaviorImbalance', {
        characterId,
        categoryScores,
        imbalanceLevel: maxScore - minScore,
        recommendation: this.getBehaviorBalanceRecommendation(categoryScores),
        timestamp: Date.now()
      });
    }
  };

  // 添加社会适应性检查方法
  behaviorSystem.checkSocialAdaptation = function(characterId, behaviorData, eventBus) {
    const sociallyPositiveBehaviors = [
      '觅求好友', '祝祷祭祀', '拜师收徒', '婚丧嫁娶', '经义研读'
    ];
    
    const sociallyNegativeBehaviors = [
      '偷窃劫掠', '通奸偷情', '邻里斗殴', '亲族复仇'
    ];

    const positiveScore = sociallyPositiveBehaviors.reduce((sum, behavior) => {
      return sum + (behaviorData.habits?.[behavior] || 0);
    }, 0);

    const negativeScore = sociallyNegativeBehaviors.reduce((sum, behavior) => {
      return sum + (behaviorData.habits?.[behavior] || 0);
    }, 0);

    const adaptationScore = positiveScore - negativeScore;

    if (adaptationScore < -50) {
      eventBus.emit('socialMaladaptation', {
        characterId,
        adaptationScore,
        positiveScore,
        negativeScore,
        riskLevel: 'high',
        timestamp: Date.now()
      });
    } else if (adaptationScore > 100) {
      eventBus.emit('exceptionalSocialAdaptation', {
        characterId,
        adaptationScore,
        positiveScore,
        timestamp: Date.now()
      });
    }
  };

  // 添加行为趋势检查方法
  behaviorSystem.checkBehaviorTrends = function(characterId, behaviorData, eventBus) {
    // 获取历史数据进行趋势分析
    const historicalData = this.getBehaviorHistory?.(characterId, 30) || []; // 最近30天
    
    if (historicalData.length > 7) {
      const trends = this.analyzeTrends(historicalData);
      
      if (trends.degrading.length > 0) {
        eventBus.emit('behaviorTrendAlert', {
          characterId,
          trendType: 'degrading',
          behaviors: trends.degrading,
          timestamp: Date.now()
        });
      }
      
      if (trends.improving.length > 0) {
        eventBus.emit('behaviorTrendAlert', {
          characterId,
          trendType: 'improving', 
          behaviors: trends.improving,
          timestamp: Date.now()
        });
      }
    }
  };

  // 添加行为平衡建议方法
  behaviorSystem.getBehaviorBalanceRecommendation = function(categoryScores) {
    const lowest = Object.entries(categoryScores)
      .sort(([,a], [,b]) => a - b)[0];
    
    const recommendations = {
      work: '建议增加生产性活动，如垦荒耕种或手工制作',
      social: '建议多参与社交活动，如社集看戏或觅求好友',
      rest: '建议注意休息，保证充足睡眠和饮食',
      learning: '建议增加学习活动，如经义研读或拜师学艺',
      entertainment: '建议适当娱乐放松，如踏青出游'
    };
    
    return recommendations[lowest[0]] || '建议保持行为平衡';
  };

  // 添加趋势分析方法
  behaviorSystem.analyzeTrends = function(historicalData) {
    const trends = { improving: [], degrading: [] };
    
    // 简单的趋势分析逻辑
    const behaviorTypes = [...new Set(historicalData.map(h => h.type))];
    
    behaviorTypes.forEach(behavior => {
      const behaviorData = historicalData
        .filter(h => h.type === behavior)
        .sort((a, b) => a.timestamp - b.timestamp);
      
      if (behaviorData.length >= 3) {
        const recent = behaviorData.slice(-3);
        const earlier = behaviorData.slice(0, 3);
        
        const recentAvg = recent.reduce((sum, d) => sum + (d.success ? 1 : 0), 0) / recent.length;
        const earlierAvg = earlier.reduce((sum, d) => sum + (d.success ? 1 : 0), 0) / earlier.length;
        
        if (recentAvg > earlierAvg + 0.2) {
          trends.improving.push(behavior);
        } else if (recentAvg < earlierAvg - 0.2) {
          trends.degrading.push(behavior);
        }
      }
    });
    
    return trends;
  };

  // 启动行为监控
  if (typeof behaviorSystem.startBehaviorMonitoring === 'function') {
    behaviorSystem.startBehaviorMonitoring();
  }

  console.log('✅ 行为系统事件支持添加完成');
}

// 导出函数
export default addEventSupportToBehaviorSystem;