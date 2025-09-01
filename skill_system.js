/**
 * SkillSystem.js - 技能系统
 * 管理角色的技能学习、经验积累和熟练度发展
 * 依赖: Utils.js, gameConfig.js
 * 输出: 技能管理接口和学习进度追踪
 */

import { Utils } from './utils_module.js';
import { DEFAULT_CONFIG } from './gameConfig.js';

/**
 * 技能类
 * 表示角色的单个技能及其发展状态
 */
class Skill {
  constructor(name, category, config = {}) {
    this.name = name;
    this.category = category;
    this.level = config.level || 0;               // 技能等级 (0-100)
    this.experience = config.experience || 0;     // 当前经验值
    this.totalExperience = config.totalExperience || 0; // 总经验值
    
    // 学习参数
    this.learningRate = config.learningRate || 1.0;     // 学习速率
    this.difficulty = config.difficulty || 1.0;         // 技能难度
    this.aptitude = config.aptitude || 1.0;             // 天赋适性
    
    // 技能状态
    this.isActive = config.isActive !== false;          // 是否激活
    this.lastUsed = config.lastUsed || 0;               // 最后使用时间
    this.degradationRate = config.degradationRate || 0.1; // 技能衰退速率
    
    // 学习历史
    this.learningHistory = [];
    this.maxHistoryLength = 20;
    
    // 技能效果
    this.effects = {
      efficiency: 0,      // 工作效率加成
      quality: 0,         // 质量加成
      speed: 0,           // 速度加成
      innovation: 0       // 创新能力加成
    };
    
    // 前置技能要求
    this.prerequisites = config.prerequisites || [];
    
    // 相关能力属性
    this.relatedAbilities = config.relatedAbilities || [];
    
    this.updateEffects();
  }

  /**
   * 获得经验值
   * @param {number} amount - 经验值数量
   * @param {Object} context - 学习上下文
   * @returns {Object} 学习结果
   */
  gainExperience(amount, context = {}) {
    const result = {
      experienceGained: 0,
      levelIncreased: false,
      previousLevel: this.level,
      newLevel: this.level
    };
    
    // 计算实际获得的经验值
    let actualGain = amount * this.learningRate * this.aptitude;
    
    // 应用学习修正
    actualGain *= this.calculateLearningModifier(context);
    
    // 技能等级越高，学习越困难
    const difficultyPenalty = Math.pow(this.level / 100, 1.5);
    actualGain *= (1 - difficultyPenalty * 0.5);
    
    // 应用经验值
    this.experience += actualGain;
    this.totalExperience += actualGain;
    result.experienceGained = actualGain;
    
    // 检查升级
    const requiredExp = this.getRequiredExperience();
    if (this.experience >= requiredExp && this.level < 100) {
      this.levelUp();
      result.levelIncreased = true;
      result.newLevel = this.level;
    }
    
    // 更新使用时间
    this.lastUsed = Date.now();
    
    // 记录学习历史
    this.recordLearningSession({
      experienceGained: actualGain,
      context: context,
      timestamp: Date.now(),
      level: this.level
    });
    
    return result;
  }

  /**
   * 计算学习修正系数
   * @param {Object} context - 学习上下文
   * @returns {number} 修正系数
   */
  calculateLearningModifier(context) {
    let modifier = 1.0;
    
    // 教师修正
    if (context.hasTeacher) {
      const teacherSkill = context.teacherSkill || 50;
      modifier *= 1 + (teacherSkill / 100) * 0.5; // 最多50%加成
    }
    
    // 工具修正
    if (context.hasTools) {
      const toolQuality = context.toolQuality || 50;
      modifier *= 1 + (toolQuality / 100) * 0.3; // 最多30%加成
    }
    
    // 环境修正
    if (context.environment) {
      const envBonus = context.environment.learningBonus || 0;
      modifier *= 1 + envBonus;
    }
    
    // 专注度修正
    if (context.focus) {
      modifier *= context.focus; // 0.5-1.5倍
    }
    
    // 疲劳度惩罚
    if (context.fatigue) {
      modifier *= Math.max(0.3, 1 - context.fatigue); // 最多70%惩罚
    }
    
    // 年龄修正
    if (context.age) {
      if (context.age < 25) {
        modifier *= 1.2; // 年轻人学习快
      } else if (context.age > 50) {
        modifier *= 0.8; // 年长者学习慢
      }
    }
    
    return modifier;
  }

  /**
   * 升级技能
   */
  levelUp() {
    const previousLevel = this.level;
    this.level = Math.min(100, this.level + 1);
    this.experience = 0; // 重置当前等级经验
    
    // 更新技能效果
    this.updateEffects();
    
    console.log(`技能升级: ${this.name} ${previousLevel} -> ${this.level}`);
    
    // 记录重要的升级事件
    if (this.level % 10 === 0 || this.level >= 80) {
      this.recordMilestone(`达到${this.level}级`);
    }
  }

  /**
   * 获取升级所需经验
   * @returns {number} 所需经验值
   */
  getRequiredExperience() {
    // 使用指数增长的经验需求曲线
    const baseExp = 100;
    const growthRate = 1.15;
    return Math.floor(baseExp * Math.pow(growthRate, this.level));
  }

  /**
   * 更新技能效果
   */
  updateEffects() {
    const levelRatio = this.level / 100;
    const categoryConfig = this.getCategoryConfig();
    
    // 基础效果随等级线性增长
    this.effects.efficiency = levelRatio * 0.5; // 最大50%效率提升
    this.effects.quality = levelRatio * 0.4;    // 最大40%质量提升
    this.effects.speed = levelRatio * 0.3;      // 最大30%速度提升
    
    // 创新能力在高等级时才显著
    if (this.level > 60) {
      this.effects.innovation = (levelRatio - 0.6) * 1.25; // 40级后开始显著提升
    }
    
    // 应用分类特殊效果
    if (categoryConfig && categoryConfig.specialEffects) {
      for (const [effect, multiplier] of Object.entries(categoryConfig.specialEffects)) {
        if (this.effects[effect] !== undefined) {
          this.effects[effect] *= multiplier;
        }
      }
    }
  }

  /**
   * 获取技能分类配置
   * @returns {Object} 分类配置
   */
  getCategoryConfig() {
    const skillCategories = DEFAULT_CONFIG.SKILL_CATEGORIES;
    
    for (const [categoryName, config] of Object.entries(skillCategories)) {
      if (config.skills && config.skills.includes(this.name)) {
        return { ...config, name: categoryName };
      }
    }
    
    return null;
  }

  /**
   * 技能衰退（长期不使用）
   * @param {number} deltaTime - 时间间隔（天）
   */
  decay(deltaTime) {
    if (!this.isActive) return;
    
    const daysSinceUsed = (Date.now() - this.lastUsed) / (1000 * 60 * 60 * 24);
    
    // 超过7天未使用开始衰退
    if (daysSinceUsed > 7) {
      const decayAmount = this.degradationRate * (daysSinceUsed - 7) * deltaTime;
      this.level = Math.max(0, this.level - decayAmount);
      this.updateEffects();
    }
  }

  /**
   * 检查前置技能要求
   * @param {Map} allSkills - 所有技能Map
   * @returns {boolean} 是否满足前置要求
   */
  checkPrerequisites(allSkills) {
    for (const prereq of this.prerequisites) {
      const requiredSkill = allSkills.get(prereq.skill);
      if (!requiredSkill || requiredSkill.level < prereq.level) {
        return false;
      }
    }
    return true;
  }

  /**
   * 获取技能熟练度等级描述
   * @returns {string} 熟练度描述
   */
  getProficiencyDescription() {
    if (this.level === 0) return '未入门';
    if (this.level < 20) return '初学者';
    if (this.level < 40) return '新手';
    if (this.level < 60) return '熟练';
    if (this.level < 80) return '专家';
    if (this.level < 95) return '大师';
    return '宗师';
  }

  /**
   * 记录学习过程
   * @param {Object} session - 学习会话
   */
  recordLearningSession(session) {
    this.learningHistory.push(session);
    
    if (this.learningHistory.length > this.maxHistoryLength) {
      this.learningHistory.shift();
    }
  }

  /**
   * 记录技能里程碑
   * @param {string} description - 里程碑描述
   */
  recordMilestone(description) {
    console.log(`技能里程碑 [${this.name}]: ${description}`);
  }

  /**
   * 获取学习效率统计
   * @returns {Object} 学习统计
   */
  getLearningStatistics() {
    const recentSessions = this.learningHistory.slice(-10);
    
    if (recentSessions.length === 0) {
      return { averageGain: 0, learningTrend: 'stable', sessionCount: 0 };
    }
    
    const totalGain = recentSessions.reduce((sum, session) => sum + session.experienceGained, 0);
    const averageGain = totalGain / recentSessions.length;
    
    // 计算学习趋势
    let learningTrend = 'stable';
    if (recentSessions.length >= 5) {
      const firstHalf = recentSessions.slice(0, Math.floor(recentSessions.length / 2));
      const secondHalf = recentSessions.slice(Math.floor(recentSessions.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, s) => sum + s.experienceGained, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, s) => sum + s.experienceGained, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg * 1.1) {
        learningTrend = 'improving';
      } else if (secondAvg < firstAvg * 0.9) {
        learningTrend = 'declining';
      }
    }
    
    return {
      averageGain: Math.round(averageGain * 100) / 100,
      learningTrend,
      sessionCount: recentSessions.length,
      totalExperience: this.totalExperience
    };
  }

  /**
   * 获取技能状态
   * @returns {Object} 技能状态
   */
  getState() {
    return {
      name: this.name,
      category: this.category,
      level: Math.round(this.level * 100) / 100,
      experience: Math.round(this.experience),
      totalExperience: Math.round(this.totalExperience),
      requiredExperience: this.getRequiredExperience(),
      proficiency: this.getProficiencyDescription(),
      effects: { ...this.effects },
      isActive: this.isActive,
      learningRate: this.learningRate,
      aptitude: this.aptitude,
      lastUsed: this.lastUsed,
      statistics: this.getLearningStatistics()
    };
  }

  /**
   * 克隆技能
   * @returns {Skill} 克隆的技能
   */
  clone() {
    const cloned = new Skill(this.name, this.category, {
      level: this.level,
      experience: this.experience,
      totalExperience: this.totalExperience,
      learningRate: this.learningRate,
      difficulty: this.difficulty,
      aptitude: this.aptitude,
      isActive: this.isActive,
      lastUsed: this.lastUsed,
      degradationRate: this.degradationRate,
      prerequisites: [...this.prerequisites],
      relatedAbilities: [...this.relatedAbilities]
    });
    
    cloned.learningHistory = [...this.learningHistory];
    return cloned;
  }
}

/**
 * 技能系统类
 * 管理角色的所有技能发展
 */
class SkillSystem {
  constructor(characterId, config = {}) {
    this.characterId = characterId;
    this.skills = new Map();
    
    // 系统配置
    this.globalLearningRate = config.globalLearningRate || 1.0;
    this.maxActiveSkills = config.maxActiveSkills || 10;
    this.ageInfluence = config.ageInfluence || true;
    
    // 天赋系统
    this.aptitudes = new Map(); // 各类技能的天赋值
    
    // 师傅系统
    this.teachers = new Map(); // 技能对应的师傅
    
    // 学习日志
    this.learningLog = [];
    this.maxLogLength = 100;
    
    this.initialize();
  }

  /**
   * 初始化技能系统
   */
  initialize() {
    this.generateInitialSkills();
    this.generateAptitudes();
    
    console.log(`技能系统初始化完成: ${this.characterId}`);
  }

  /**
   * 生成初始技能
   */
  generateInitialSkills() {
    const skillCategories = DEFAULT_CONFIG.SKILL_CATEGORIES;
    
    for (const [categoryName, config] of Object.entries(skillCategories)) {
      if (!config.skills) continue;
      
      for (const skillName of config.skills) {
        // 随机给予一些基础技能
        if (Math.random() < 0.3) { // 30%概率拥有基础技能
          const skill = new Skill(skillName, categoryName, {
            level: Utils.Math.randomInt(1, 15),
            learningRate: Utils.Math.randomFloat(0.8, 1.2),
            aptitude: Utils.Math.randomFloat(0.8, 1.2)
          });
          
          this.skills.set(skillName, skill);
        }
      }
    }
  }

  /**
   * 生成技能天赋
   */
  generateAptitudes() {
    const skillCategories = DEFAULT_CONFIG.SKILL_CATEGORIES;
    
    for (const categoryName of Object.keys(skillCategories)) {
      // 为每个技能分类生成天赋值
      const aptitude = Utils.Math.randomNormal(1.0, 0.2);
      this.aptitudes.set(categoryName, Utils.Math.clamp(aptitude, 0.5, 1.8));
    }
  }

  /**
   * 学习技能
   * @param {string} skillName - 技能名称
   * @param {number} timeSpent - 学习时间（小时）
   * @param {Object} context - 学习上下文
   * @returns {Object} 学习结果
   */
  learnSkill(skillName, timeSpent, context = {}) {
    let skill = this.skills.get(skillName);
    
    // 如果技能不存在，创建新技能
    if (!skill) {
      const category = this.findSkillCategory(skillName);
      if (!category) {
        return { success: false, error: '未知技能' };
      }
      
      skill = new Skill(skillName, category, {
        aptitude: this.aptitudes.get(category) || 1.0
      });
      this.skills.set(skillName, skill);
    }
    
    // 检查前置要求
    if (!skill.checkPrerequisites(this.skills)) {
      return { success: false, error: '不满足前置技能要求' };
    }
    
    // 计算经验获得
    const baseExp = timeSpent * 10; // 基础经验公式
    const learningContext = {
      ...context,
      globalLearningRate: this.globalLearningRate
    };
    
    // 执行学习
    const result = skill.gainExperience(baseExp, learningContext);
    
    // 记录学习日志
    this.logLearningActivity({
      skillName: skillName,
      timeSpent: timeSpent,
      experienceGained: result.experienceGained,
      levelBefore: result.previousLevel,
      levelAfter: result.newLevel,
      context: context,
      timestamp: Date.now()
    });
    
    return {
      success: true,
      skillName: skillName,
      timeSpent: timeSpent,
      ...result
    };
  }

  /**
   * 查找技能所属分类
   * @param {string} skillName - 技能名称
   * @returns {string|null} 技能分类
   */
  findSkillCategory(skillName) {
    const skillCategories = DEFAULT_CONFIG.SKILL_CATEGORIES;
    
    for (const [categoryName, config] of Object.entries(skillCategories)) {
      if (config.skills && config.skills.includes(skillName)) {
        return categoryName;
      }
    }
    
    return null;
  }

  /**
   * 设置师傅
   * @param {string} skillName - 技能名称
   * @param {string} teacherId - 师傅ID
   * @param {number} teacherSkillLevel - 师傅技能水平
   */
  setTeacher(skillName, teacherId, teacherSkillLevel) {
    this.teachers.set(skillName, {
      teacherId: teacherId,
      skillLevel: teacherSkillLevel,
      startDate: Date.now()
    });
    
    console.log(`设置师傅: ${skillName} -> ${teacherId} (水平: ${teacherSkillLevel})`);
  }

  /**
   * 移除师傅
   * @param {string} skillName - 技能名称
   */
  removeTeacher(skillName) {
    this.teachers.delete(skillName);
    console.log(`移除师傅: ${skillName}`);
  }

  /**
   * 使用技能（获得经验）
   * @param {string} skillName - 技能名称
   * @param {Object} context - 使用上下文
   * @returns {Object} 使用结果
   */
  useSkill(skillName, context = {}) {
    const skill = this.skills.get(skillName);
    if (!skill) {
      return { success: false, error: '技能不存在' };
    }
    
    // 通过使用获得少量经验
    const experienceGain = context.complexity || 1; // 基于任务复杂度
    const result = skill.gainExperience(experienceGain, context);
    
    return {
      success: true,
      skillLevel: skill.level,
      efficiency: skill.effects.efficiency,
      quality: skill.effects.quality,
      ...result
    };
  }

  /**
   * 更新技能系统（处理衰退等）
   * @param {number} deltaTime - 时间间隔（天）
   */
  update(deltaTime) {
    // 处理技能衰退
    for (const skill of this.skills.values()) {
      skill.decay(deltaTime);
    }
    
    // 清理过期日志
    if (this.learningLog.length > this.maxLogLength) {
      this.learningLog = this.learningLog.slice(-this.maxLogLength * 0.8);
    }
  }

  /**
   * 获取技能效率加成
   * @param {string} skillName - 技能名称
   * @returns {number} 效率加成 (0-1)
   */
  getSkillEfficiency(skillName) {
    const skill = this.skills.get(skillName);
    return skill ? skill.effects.efficiency : 0;
  }

  /**
   * 获取技能质量加成
   * @param {string} skillName - 技能名称
   * @returns {number} 质量加成 (0-1)
   */
  getSkillQuality(skillName) {
    const skill = this.skills.get(skillName);
    return skill ? skill.effects.quality : 0;
  }

  /**
   * 获取最高水平的技能
   * @param {number} count - 返回数量
   * @returns {Array} 技能列表
   */
  getTopSkills(count = 5) {
    const skillArray = Array.from(this.skills.values());
    skillArray.sort((a, b) => b.level - a.level);
    return skillArray.slice(0, count).map(skill => ({
      name: skill.name,
      level: skill.level,
      category: skill.category,
      proficiency: skill.getProficiencyDescription()
    }));
  }

  /**
   * 获取分类技能统计
   * @returns {Object} 分类统计
   */
  getCategoryStatistics() {
    const stats = {};
    const skillCategories = DEFAULT_CONFIG.SKILL_CATEGORIES;
    
    for (const categoryName of Object.keys(skillCategories)) {
      stats[categoryName] = {
        totalSkills: 0,
        averageLevel: 0,
        maxLevel: 0,
        aptitude: this.aptitudes.get(categoryName) || 1.0
      };
    }
    
    for (const skill of this.skills.values()) {
      const category = stats[skill.category];
      if (category) {
        category.totalSkills++;
        category.maxLevel = Math.max(category.maxLevel, skill.level);
      }
    }
    
    // 计算平均等级
    for (const categoryName of Object.keys(stats)) {
      const categorySkills = Array.from(this.skills.values())
        .filter(skill => skill.category === categoryName);
      
      if (categorySkills.length > 0) {
        const totalLevel = categorySkills.reduce((sum, skill) => sum + skill.level, 0);
        stats[categoryName].averageLevel = totalLevel / categorySkills.length;
      }
    }
    
    return stats;
  }

  /**
   * 获取学习建议
   * @returns {Array} 学习建议列表
   */
  getLearningRecommendations() {
    const recommendations = [];
    const categoryStats = this.getCategoryStatistics();
    
    // 找出薄弱的技能分类
    const sortedCategories = Object.entries(categoryStats)
      .sort((a, b) => a[1].averageLevel - b[1].averageLevel);
    
    const weakestCategory = sortedCategories[0];
    if (weakestCategory && weakestCategory[1].averageLevel < 30) {
      recommendations.push({
        type: 'category_improvement',
        category: weakestCategory[0],
        reason: '该技能分类发展不足，建议加强学习',
        priority: 'high'
      });
    }
    
    // 找出有天赋但未开发的技能
    for (const [categoryName, aptitude] of this.aptitudes) {
      if (aptitude > 1.3) { // 高天赋
        const categorySkills = Array.from(this.skills.values())
          .filter(skill => skill.category === categoryName);
        
        if (categorySkills.length === 0 || categorySkills.every(skill => skill.level < 20)) {
          recommendations.push({
            type: 'aptitude_development',
            category: categoryName,
            aptitude: aptitude,
            reason: `在${categoryName}方面有较高天赋，建议重点发展`,
            priority: 'medium'
          });
        }
      }
    }
    
    // 技能组合建议
    const combos = this.getSkillCombos();
    for (const combo of combos) {
      recommendations.push({
        type: 'skill_combo',
        skills: combo.skills,
        benefit: combo.benefit,
        reason: '这些技能组合能产生协同效应',
        priority: 'low'
      });
    }
    
    return recommendations;
  }

  /**
   * 获取技能组合建议
   * @returns {Array} 技能组合
   */
  getSkillCombos() {
    const combos = [
      {
        skills: ['垦荒耕种', '畜牧养殖'],
        benefit: '农业全面发展',
        synergy: 0.2
      },
      {
        skills: ['手工雕琢', '熔炼铸锻'],
        benefit: '手工艺大师',
        synergy: 0.3
      },
      {
        skills: ['商业贸易', '外交谈判'],
        benefit: '商业领袖',
        synergy: 0.25
      },
      {
        skills: ['经义研读', '艺术创作'],
        benefit: '文化学者',
        synergy: 0.15
      }
    ];
    
    return combos.filter(combo => {
      // 只返回角色有相关技能基础的组合
      const hasSkills = combo.skills.filter(skill => this.skills.has(skill));
      return hasSkills.length >= combo.skills.length * 0.5;
    });
  }

  /**
   * 记录学习活动
   * @param {Object} activity - 学习活动
   */
  logLearningActivity(activity) {
    this.learningLog.push(activity);
    
    if (this.learningLog.length > this.maxLogLength) {
      this.learningLog.shift();
    }
  }

  /**
   * 获取学习历史统计
   * @param {number} days - 统计天数
   * @returns {Object} 学习统计
   */
  getLearningHistory(days = 30) {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentActivities = this.learningLog.filter(activity => 
      activity.timestamp > cutoffTime);
    
    const stats = {
      totalSessions: recentActivities.length,
      totalTime: recentActivities.reduce((sum, a) => sum + a.timeSpent, 0),
      totalExperience: recentActivities.reduce((sum, a) => sum + a.experienceGained, 0),
      skillsImproved: new Set(recentActivities.map(a => a.skillName)).size,
      averageSessionTime: 0,
      mostPracticedSkill: null
    };
    
    if (stats.totalSessions > 0) {
      stats.averageSessionTime = stats.totalTime / stats.totalSessions;
    }
    
    // 找出最常练习的技能
    const skillCounts = {};
    for (const activity of recentActivities) {
      skillCounts[activity.skillName] = (skillCounts[activity.skillName] || 0) + 1;
    }
    
    if (Object.keys(skillCounts).length > 0) {
      stats.mostPracticedSkill = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])[0][0];
    }
    
    return stats;
  }

  /**
   * 获取技能系统状态
   * @returns {Object} 系统状态
   */
  getState() {
    const state = {
      characterId: this.characterId,
      skillCount: this.skills.size,
      topSkills: this.getTopSkills(3),
      categoryStats: this.getCategoryStatistics(),
      aptitudes: Object.fromEntries(this.aptitudes),
      globalLearningRate: this.globalLearningRate,
      allSkills: {},
      teachers: Object.fromEntries(this.teachers),
      recentHistory: this.getLearningHistory(7)
    };
    
    // 所有技能详细信息
    for (const [skillName, skill] of this.skills) {
      state.allSkills[skillName] = skill.getState();
    }
    
    return state;
  }

  /**
   * 设置技能系统状态
   * @param {Object} state - 系统状态
   */
  setState(state) {
    if (state.globalLearningRate) {
      this.globalLearningRate = state.globalLearningRate;
    }
    
    if (state.aptitudes) {
      this.aptitudes = new Map(Object.entries(state.aptitudes));
    }
    
    if (state.allSkills) {
      this.skills.clear();
      for (const [skillName, skillState] of Object.entries(state.allSkills)) {
        const skill = new Skill(skillState.name, skillState.category, {
          level: skillState.level,
          experience: skillState.experience,
          totalExperience: skillState.totalExperience,
          learningRate: skillState.learningRate,
          aptitude: skillState.aptitude,
          isActive: skillState.isActive,
          lastUsed: skillState.lastUsed
        });
        this.skills.set(skillName, skill);
      }
    }
    
    if (state.teachers) {
      this.teachers = new Map(Object.entries(state.teachers));
    }
    
    console.log(`技能系统状态已恢复: ${this.characterId}`);
  }

  /**
   * 克隆技能系统
   * @returns {SkillSystem} 克隆的系统
   */
  clone() {
    const cloned = new SkillSystem(this.characterId + '_clone');
    
    // 复制技能
    for (const [skillName, skill] of this.skills) {
      cloned.skills.set(skillName, skill.clone());
    }
    
    // 复制配置
    cloned.aptitudes = new Map(this.aptitudes);
    cloned.teachers = new Map(this.teachers);
    cloned.globalLearningRate = this.globalLearningRate;
    cloned.learningLog = [...this.learningLog];
    
    return cloned;
  }

  /**
   * 销毁技能系统
   */
  destroy() {
    this.skills.clear();
    this.aptitudes.clear();
    this.teachers.clear();
    this.learningLog = [];
    
    console.log(`技能系统已销毁: ${this.characterId}`);
  }
}

// ==================== 技能工具函数 ====================
export const SkillUtils = {
  /**
   * 计算技能协同效应
   * @param {Array} skills - 技能列表
   * @param {Array} combos - 技能组合配置
   * @returns {number} 协同加成
   */
  calculateSynergy(skills, combos) {
    let totalSynergy = 0;
    
    for (const combo of combos) {
      const hasAllSkills = combo.skills.every(skillName => 
        skills.some(skill => skill.name === skillName && skill.level > 20));
      
      if (hasAllSkills) {
        totalSynergy += combo.synergy || 0.1;
      }
    }
    
    return Math.min(totalSynergy, 0.5); // 最大50%协同加成
  },

  /**
   * 生成技能发展路径
   * @param {SkillSystem} skillSystem - 技能系统
   * @param {string} targetSkill - 目标技能
   * @returns {Array} 发展路径
   */
  generateLearningPath(skillSystem, targetSkill) {
    const path = [];
    const visited = new Set();
    
    const findPath = (skillName, depth = 0) => {
      if (visited.has(skillName) || depth > 5) return;
      visited.add(skillName);
      
      const category = skillSystem.findSkillCategory(skillName);
      if (!category) return;
      
      // 添加当前技能到路径
      path.push({
        skill: skillName,
        category: category,
        order: depth,
        reasoning: depth === 0 ? '目标技能' : '前置技能'
      });
      
      // 查找前置技能
      const skill = skillSystem.skills.get(skillName);
      if (skill && skill.prerequisites) {
        for (const prereq of skill.prerequisites) {
          findPath(prereq.skill, depth + 1);
        }
      }
    };
    
    findPath(targetSkill);
    return path.sort((a, b) => b.order - a.order); // 按学习顺序排序
  },

  /**
   * 评估学习效率
   * @param {Object} context - 学习上下文
   * @returns {Object} 效率评估
   */
  evaluateLearningEfficiency(context) {
    const factors = {
      baseEfficiency: 1.0,
      modifiers: []
    };
    
    if (context.hasTeacher) {
      factors.baseEfficiency *= 1.3;
      factors.modifiers.push('有师傅指导 (+30%)');
    }
    
    if (context.hasTools) {
      factors.baseEfficiency *= 1.2;
      factors.modifiers.push('有工具辅助 (+20%)');
    }
    
    if (context.focus && context.focus < 0.8) {
      factors.baseEfficiency *= context.focus;
      factors.modifiers.push(`专注度低 (${Math.round((context.focus - 1) * 100)}%)`);
    }
    
    if (context.fatigue && context.fatigue > 0.3) {
      const penalty = 1 - context.fatigue;
      factors.baseEfficiency *= penalty;
      factors.modifiers.push(`疲劳影响 (${Math.round((penalty - 1) * 100)}%)`);
    }
    
    return {
      efficiency: factors.baseEfficiency,
      rating: factors.baseEfficiency > 1.2 ? '优秀' : 
              factors.baseEfficiency > 1.0 ? '良好' : 
              factors.baseEfficiency > 0.8 ? '一般' : '较差',
      modifiers: factors.modifiers
    };
  }
};

export { Skill, SkillSystem };
export default SkillSystem;