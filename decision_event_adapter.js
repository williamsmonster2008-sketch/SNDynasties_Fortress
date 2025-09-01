/**
 * decision_engine_event_adapter.js - 决策引擎事件适配器
 * 
 * 功能：为现有的决策引擎添加事件支持
 * 设计：非侵入性适配器，包装现有方法，添加事件发射
 * 特色：支持南北朝时期的决策逻辑和智能行为选择
 */

/**
 * 为决策引擎添加事件支持
 * @param {Object} decisionEngine - 决策引擎实例
 * @param {Object} eventBus - 事件总线实例
 */
export function addEventSupportToDecisionEngine(decisionEngine, eventBus) {
  if (!decisionEngine || !eventBus) {
    console.warn('⚠️ 决策引擎或事件总线未提供，跳过事件适配');
    return;
  }

  console.log('🧠 为决策引擎添加事件支持...');

  // 包装决策制定方法
  if (decisionEngine.makeDecision) {
    const originalMakeDecision = decisionEngine.makeDecision.bind(decisionEngine);
    decisionEngine.makeDecision = function(characterId, context = {}) {
      const startTime = Date.now();
      const character = this.getCharacter?.(characterId);
      
      eventBus.emit('decisionProcessStarted', {
        characterId,
        context,
        characterState: character ? this.getCharacterSummary(character) : null,
        timestamp: startTime
      });

      const result = originalMakeDecision(characterId, context);
      const endTime = Date.now();
      
      eventBus.emit('decisionMade', {
        characterId,
        context,
        decision: result.decision,
        alternatives: result.alternatives || [],
        reasoning: result.reasoning || [],
        confidence: result.confidence || 0,
        processingTime: endTime - startTime,
        factors: result.factors || {},
        timestamp: endTime
      });

      // 分析决策质量
      this.analyzeDecisionQuality(characterId, result, context, eventBus);
      
      return result;
    };
  }

  // 包装决策评估方法
  if (decisionEngine.evaluateOptions) {
    const originalEvaluateOptions = decisionEngine.evaluateOptions.bind(decisionEngine);
    decisionEngine.evaluateOptions = function(characterId, options, criteria = {}) {
      const result = originalEvaluateOptions(characterId, options, criteria);
      
      eventBus.emit('optionsEvaluated', {
        characterId,
        options,
        criteria,
        evaluations: result.evaluations || [],
        topChoice: result.topChoice,
        scores: result.scores || {},
        timestamp: Date.now()
      });

      // 检查评估偏好
      this.checkEvaluationBias(characterId, result, eventBus);
      
      return result;
    };
  }

  // 包装目标设定方法
  if (decisionEngine.setGoal) {
    const originalSetGoal = decisionEngine.setGoal.bind(decisionEngine);
    decisionEngine.setGoal = function(characterId, goalType, goalParams, priority = 'normal') {
      const result = originalSetGoal(characterId, goalType, goalParams, priority);
      
      eventBus.emit('goalSet', {
        characterId,
        goalType,
        goalParams,
        priority,
        goalId: result.goalId,
        estimatedDuration: result.estimatedDuration,
        requiredResources: result.requiredResources || [],
        timestamp: Date.now()
      });

      // 检查目标冲突
      this.checkGoalConflicts(characterId, goalType, result, eventBus);
      
      return result;
    };
  }

  // 包装计划制定方法
  if (decisionEngine.createPlan) {
    const originalCreatePlan = decisionEngine.createPlan.bind(decisionEngine);
    decisionEngine.createPlan = function(characterId, goal, constraints = {}) {
      const result = originalCreatePlan(characterId, goal, constraints);
      
      eventBus.emit('planCreated', {
        characterId,
        goal,
        constraints,
        plan: result.plan || [],
        estimatedSuccess: result.estimatedSuccess || 0,
        risks: result.risks || [],
        alternatives: result.alternatives || [],
        timestamp: Date.now()
      });

      // 分析计划复杂度
      this.analyzePlanComplexity(characterId, result, eventBus);
      
      return result;
    };
  }

  // 包装优先级调整方法
  if (decisionEngine.adjustPriorities) {
    const originalAdjustPriorities = decisionEngine.adjustPriorities.bind(decisionEngine);
    decisionEngine.adjustPriorities = function(characterId, newPriorities, reason = 'manual_adjustment') {
      const oldPriorities = this.getCurrentPriorities?.(characterId) || {};
      const result = originalAdjustPriorities(characterId, newPriorities, reason);
      
      eventBus.emit('prioritiesAdjusted', {
        characterId,
        oldPriorities,
        newPriorities,
        reason,
        changes: this.calculatePriorityChanges(oldPriorities, newPriorities),
        timestamp: Date.now()
      });

      // 检查优先级合理性
      this.validatePriorityAdjustment(characterId, newPriorities, eventBus);
      
      return result;
    };
  }

  // 添加决策质量分析方法
  decisionEngine.analyzeDecisionQuality = function(characterId, decision, context, eventBus) {
    const qualityMetrics = this.calculateDecisionQuality(decision, context);
    
    eventBus.emit('decisionQualityAnalyzed', {
      characterId,
      decision: decision.decision,
      qualityMetrics,
      timestamp: Date.now()
    });

    // 检查决策模式
    this.checkDecisionPatterns(characterId, decision, eventBus);
    
    // 质量警告
    if (qualityMetrics.overallQuality < 0.3) {
      eventBus.emit('poorDecisionWarning', {
        characterId,
        decision: decision.decision,
        qualityScore: qualityMetrics.overallQuality,
        issues: qualityMetrics.issues || [],
        timestamp: Date.now()
      });
    }
  };

  // 添加决策质量计算方法
  decisionEngine.calculateDecisionQuality = function(decision, context) {
    const metrics = {
      rationalityScore: 0,
      timelinessScore: 0,
      resourceEfficiency: 0,
      riskAssessment: 0,
      overallQuality: 0,
      issues: []
    };

    // 理性分析评分
    if (decision.reasoning && decision.reasoning.length > 0) {
      metrics.rationalityScore = Math.min(decision.reasoning.length / 3, 1.0);
    } else {
      metrics.issues.push('缺乏理性分析');
    }

    // 及时性评分
    const urgency = context.urgency || 'normal';
    const processingTime = decision.processingTime || 0;
    const expectedTime = { low: 5000, normal: 2000, high: 1000 }[urgency] || 2000;
    metrics.timelinessScore = Math.max(0, 1 - (processingTime - expectedTime) / expectedTime);

    // 资源效率评分
    if (decision.factors && decision.factors.resourceCost) {
      const resourceCost = decision.factors.resourceCost;
      const benefit = decision.factors.expectedBenefit || 1;
      metrics.resourceEfficiency = Math.min(benefit / resourceCost, 1.0);
    } else {
      metrics.resourceEfficiency = 0.5; // 默认中等
    }

    // 风险评估评分
    if (decision.factors && decision.factors.riskLevel !== undefined) {
      const riskLevel = decision.factors.riskLevel;
      const riskTolerance = context.riskTolerance || 0.5;
      metrics.riskAssessment = 1 - Math.abs(riskLevel - riskTolerance);
    } else {
      metrics.issues.push('未进行风险评估');
    }

    // 计算总体质量
    metrics.overallQuality = (
      metrics.rationalityScore * 0.3 +
      metrics.timelinessScore * 0.2 +
      metrics.resourceEfficiency * 0.3 +
      metrics.riskAssessment * 0.2
    );

    return metrics;
  };

  // 添加决策模式检查方法
  decisionEngine.checkDecisionPatterns = function(characterId, decision, eventBus) {
    const recentDecisions = this.getRecentDecisions?.(characterId, 10) || [];
    
    // 检查决策一致性
    const consistencyScore = this.calculateDecisionConsistency(recentDecisions);
    if (consistencyScore < 0.3) {
      eventBus.emit('decisionInconsistency', {
        characterId,
        consistencyScore,
        conflictingDecisions: this.findConflictingDecisions(recentDecisions),
        timestamp: Date.now()
      });
    }

    // 检查决策多样性
    const diversityScore = this.calculateDecisionDiversity(recentDecisions);
    if (diversityScore < 0.2) {
      eventBus.emit('decisionRigidity', {
        characterId,
        diversityScore,
        dominantPattern: this.getDominantDecisionPattern(recentDecisions),
        timestamp: Date.now()
      });
    }

    // 检查风险偏好变化
    this.checkRiskPreferenceShift(characterId, recentDecisions, eventBus);
  };

  // 添加评估偏好检查方法
  decisionEngine.checkEvaluationBias = function(characterId, evaluation, eventBus) {
    const biases = [];

    // 检查过度自信偏差
    if (evaluation.confidence > 0.9 && evaluation.scores) {
      const scoreVariance = this.calculateScoreVariance(evaluation.scores);
      if (scoreVariance < 0.1) {
        biases.push({
          type: 'overconfidence',
          severity: 'medium',
          description: '评估过于自信，可能忽略了不确定因素'
        });
      }
    }

    // 检查锚定偏差
    if (evaluation.evaluations && evaluation.evaluations.length > 1) {
      const firstOption = evaluation.evaluations[0];
      const avgOthers = evaluation.evaluations.slice(1).reduce((sum, e) => sum + e.score, 0) / (evaluation.evaluations.length - 1);
      if (Math.abs(firstOption.score - avgOthers) > 0.5) {
        biases.push({
          type: 'anchoring',
          severity: 'low',
          description: '可能受到第一个选项的锚定影响'
        });
      }
    }

    if (biases.length > 0) {
      eventBus.emit('evaluationBiasDetected', {
        characterId,
        biases,
        evaluation: evaluation.topChoice,
        timestamp: Date.now()
      });
    }
  };

  // 添加目标冲突检查方法
  decisionEngine.checkGoalConflicts = function(characterId, newGoalType, goalResult, eventBus) {
    const existingGoals = this.getActiveGoals?.(characterId) || [];
    const conflicts = [];

    existingGoals.forEach(existingGoal => {
      const conflictLevel = this.calculateGoalConflict(newGoalType, existingGoal.type);
      if (conflictLevel > 0.5) {
        conflicts.push({
          existingGoal: existingGoal.type,
          newGoal: newGoalType,
          conflictLevel,
          conflictType: this.getConflictType(newGoalType, existingGoal.type)
        });
      }
    });

    if (conflicts.length > 0) {
      eventBus.emit('goalConflictsDetected', {
        characterId,
        newGoal: newGoalType,
        conflicts,
        resolution: this.suggestConflictResolution(conflicts),
        timestamp: Date.now()
      });
    }
  };

  // 添加计划复杂度分析方法
  decisionEngine.analyzePlanComplexity = function(characterId, planResult, eventBus) {
    const plan = planResult.plan || [];
    const complexity = {
      stepCount: plan.length,
      resourceDiversity: this.calculateResourceDiversity(plan),
      timeSpan: this.calculateTimeSpan(plan),
      dependencyComplexity: this.calculateDependencyComplexity(plan),
      overallComplexity: 0
    };

    // 计算总体复杂度
    complexity.overallComplexity = (
      Math.min(complexity.stepCount / 10, 1) * 0.3 +
      complexity.resourceDiversity * 0.2 +
      Math.min(complexity.timeSpan / 30, 1) * 0.2 +
      complexity.dependencyComplexity * 0.3
    );

    eventBus.emit('planComplexityAnalyzed', {
      characterId,
      complexity,
      timestamp: Date.now()
    });

    // 复杂度警告
    if (complexity.overallComplexity > 0.8) {
      eventBus.emit('highComplexityPlanWarning', {
        characterId,
        complexity,
        recommendations: this.getComplexityReductionTips(complexity),
        timestamp: Date.now()
      });
    }
  };

  // 添加优先级调整验证方法
  decisionEngine.validatePriorityAdjustment = function(characterId, newPriorities, eventBus) {
    const issues = [];

    // 检查优先级总和
    const totalPriority = Object.values(newPriorities).reduce((sum, p) => sum + p, 0);
    if (Math.abs(totalPriority - 1.0) > 0.1) {
      issues.push({
        type: 'invalid_total',
        message: '优先级总和应该接近1.0',
        currentTotal: totalPriority
      });
    }

    // 检查极端优先级
    Object.entries(newPriorities).forEach(([category, priority]) => {
      if (priority > 0.8) {
        issues.push({
          type: 'extreme_priority',
          category,
          message: `${category}的优先级过高，可能导致其他方面被忽视`,
          priority
        });
      }
    });

    if (issues.length > 0) {
      eventBus.emit('priorityAdjustmentIssues', {
        characterId,
        issues,
        newPriorities,
        timestamp: Date.now()
      });
    }
  };

  // 添加辅助计算方法
  decisionEngine.calculatePriorityChanges = function(oldPriorities, newPriorities) {
    const changes = {};
    const allKeys = new Set([...Object.keys(oldPriorities), ...Object.keys(newPriorities)]);
    
    allKeys.forEach(key => {
      const oldValue = oldPriorities[key] || 0;
      const newValue = newPriorities[key] || 0;
      const change = newValue - oldValue;
      if (Math.abs(change) > 0.05) {
        changes[key] = {
          old: oldValue,
          new: newValue,
          change: change,
          percentChange: oldValue > 0 ? (change / oldValue) * 100 : 0
        };
      }
    });
    
    return changes;
  };

  decisionEngine.calculateDecisionConsistency = function(decisions) {
    if (decisions.length < 2) return 1.0;
    
    let consistentPairs = 0;
    let totalPairs = 0;
    
    for (let i = 0; i < decisions.length - 1; i++) {
      for (let j = i + 1; j < decisions.length; j++) {
        const similarity = this.calculateDecisionSimilarity(decisions[i], decisions[j]);
        if (similarity > 0.7) consistentPairs++;
        totalPairs++;
      }
    }
    
    return totalPairs > 0 ? consistentPairs / totalPairs : 1.0;
  };

  decisionEngine.calculateDecisionDiversity = function(decisions) {
    const decisionTypes = new Set(decisions.map(d => d.type || d.decision));
    return Math.min(decisionTypes.size / decisions.length, 1.0);
  };

  decisionEngine.calculateGoalConflict = function(goal1, goal2) {
    const conflicts = {
      'wealth_accumulation': ['spiritual_growth', 'family_time'],
      'skill_development': ['rest_recovery'],
      'social_standing': ['honesty'],
      'family_harmony': ['personal_ambition']
    };
    
    if (conflicts[goal1] && conflicts[goal1].includes(goal2)) return 0.8;
    if (conflicts[goal2] && conflicts[goal2].includes(goal1)) return 0.8;
    
    return 0.0;
  };

  // 添加决策监控方法
  decisionEngine.startDecisionMonitoring = function() {
    setInterval(() => {
      const allCharacters = this.getAllCharactersWithDecisions?.() || {};
      
      Object.entries(allCharacters).forEach(([characterId, decisionData]) => {
        // 检查决策效率
        this.checkDecisionEfficiency(characterId, decisionData, eventBus);
        
        // 检查目标进度
        this.checkGoalProgress(characterId, decisionData, eventBus);
        
        // 检查长期规划
        this.checkLongTermPlanning(characterId, decisionData, eventBus);
      });
    }, 300000); // 每5分钟检查一次
  };

  // 添加决策效率检查方法
  decisionEngine.checkDecisionEfficiency = function(characterId, decisionData, eventBus) {
    const recentDecisions = decisionData.recentDecisions || [];
    
    if (recentDecisions.length > 0) {
      const avgProcessingTime = recentDecisions.reduce((sum, d) => sum + (d.processingTime || 0), 0) / recentDecisions.length;
      const avgConfidence = recentDecisions.reduce((sum, d) => sum + (d.confidence || 0), 0) / recentDecisions.length;
      
      const efficiency = avgConfidence / (avgProcessingTime / 1000); // 信心/秒
      
      if (efficiency < 0.1) {
        eventBus.emit('lowDecisionEfficiency', {
          characterId,
          efficiency,
          avgProcessingTime,
          avgConfidence,
          recommendations: [
            '考虑简化决策流程',
            '提高对常见情况的预设方案',
            '增强相关技能以提高决策信心'
          ],
          timestamp: Date.now()
        });
      }
    }
  };

  // 启动决策监控
  if (decisionEngine.startDecisionMonitoring) {
    decisionEngine.startDecisionMonitoring();
  }

  console.log('✅ 决策引擎事件支持已添加');
}

export default addEventSupportToDecisionEngine;