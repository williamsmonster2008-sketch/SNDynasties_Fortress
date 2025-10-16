/**
 * TimeSystem.js - 时间管理系统
 * 管理游戏中的时间流逝，包括时辰、节气、季节等概念
 * 依赖: Utils.js, gameConfig.js
 * 输出: 时间管理接口和事件
 */

import { Utils } from './utils_module.js';
import { DEFAULT_CONFIG } from './gameConfig.js';

/**
 * 游戏时间类
 * 表示游戏中的一个时间点
 */
class GameTime {
  constructor(totalSeconds = 0) {
    this.totalSeconds = totalSeconds;
    this.lastUpdateTime = Date.now();
    this.timeScale = 1.0; // 时间缩放因子
    this.isPaused = false;
  }

  /**
   * 获取当前游戏时间的各个组成部分
   * @returns {Object} 时间组成部分
   */
  getTimeComponents() {
    const config = DEFAULT_CONFIG.TIME_CONFIG;
    const totalGameDays = this.totalSeconds / config.SECONDS_PER_DAY;
    
    // 计算年、季、月、节气、天、时辰
    const totalDays = Math.floor(totalGameDays);
    const daysInYear = config.SEASONS_PER_YEAR * config.MONTHS_PER_SEASON * 
                      config.SOLAR_TERMS_PER_MONTH * config.DAYS_PER_SOLAR_TERM;
    
    const years = Math.floor(totalDays / daysInYear);
    const remainingDays = totalDays % daysInYear;
    
    const daysInSeason = config.MONTHS_PER_SEASON * config.SOLAR_TERMS_PER_MONTH * config.DAYS_PER_SOLAR_TERM;
    const seasons = Math.floor(remainingDays / daysInSeason);
    const daysInCurrentSeason = remainingDays % daysInSeason;
    
    const daysInMonth = config.SOLAR_TERMS_PER_MONTH * config.DAYS_PER_SOLAR_TERM;
    const months = Math.floor(daysInCurrentSeason / daysInMonth);
    const daysInCurrentMonth = daysInCurrentSeason % daysInMonth;
    
    const solarTerms = Math.floor(daysInCurrentMonth / config.DAYS_PER_SOLAR_TERM);
    const dayInSolarTerm = daysInCurrentMonth % config.DAYS_PER_SOLAR_TERM;
    
    // 计算一天内的时间
    const dayProgress = totalGameDays - totalDays;
    const timeOfDayIndex = Math.floor(dayProgress * config.TIME_STEPS_PER_DAY);
    const timeInPeriod = (dayProgress * config.TIME_STEPS_PER_DAY) % 1;
    
    return {
      totalSeconds: this.totalSeconds,
      totalDays: totalGameDays,
      year: years + 1,
      season: seasons,
      month: months,
      solarTerm: solarTerms,
      day: dayInSolarTerm + 1,
      timeOfDayIndex: Utils.Math.clamp(timeOfDayIndex, 0, config.TIME_STEPS_PER_DAY - 1),
      timeInPeriod: timeInPeriod,
      dayProgress: dayProgress
    };
  }

  /**
   * 获取当前季节名称
   * @returns {string} 季节名称
   */
  getCurrentSeason() {
    const components = this.getTimeComponents();
    const seasonNames = Object.keys(DEFAULT_CONFIG.SOLAR_TERMS);
    return seasonNames[components.season] || '春季';
  }

  /**
   * 获取当前节气名称
   * @returns {string} 节气名称
   */
  getCurrentSolarTerm() {
    const components = this.getTimeComponents();
    const currentSeason = this.getCurrentSeason();
    const solarTerms = DEFAULT_CONFIG.SOLAR_TERMS[currentSeason]?.terms || [];
    
    const termIndex = components.month * DEFAULT_CONFIG.TIME_CONFIG.SOLAR_TERMS_PER_MONTH + components.solarTerm;
    return solarTerms[termIndex] || '立春';
  }

  /**
   * 获取当前时辰名称
   * @returns {string} 时辰名称
   */
  getCurrentTimeOfDay() {
    const components = this.getTimeComponents();
    const periods = DEFAULT_CONFIG.TIME_OF_DAY.PERIODS;
    return periods[components.timeOfDayIndex] || '黎明';
  }

  /**
   * 获取格式化的时间字符串
   * @returns {string} 格式化时间
   */
  getFormattedTime() {
    const components = this.getTimeComponents();
    const season = this.getCurrentSeason();
    const solarTerm = this.getCurrentSolarTerm();
    const timeOfDay = this.getCurrentTimeOfDay();
    
    return `第${components.year}年 ${season} ${solarTerm} 第${components.day}天 ${timeOfDay}`;
  }

  /**
   * 检查是否到了新的一天
   * @param {number} previousSeconds - 之前的总秒数
   * @returns {boolean} 是否为新的一天
   */
  isNewDay(previousSeconds) {
    const config = DEFAULT_CONFIG.TIME_CONFIG;
    const previousDays = Math.floor(previousSeconds / config.SECONDS_PER_DAY);
    const currentDays = Math.floor(this.totalSeconds / config.SECONDS_PER_DAY);
    return currentDays > previousDays;
  }

  /**
   * 检查是否到了新的时辰
   * @param {number} previousSeconds - 之前的总秒数
   * @returns {boolean} 是否为新的时辰
   */
  isNewTimeOfDay(previousSeconds) {
    const config = DEFAULT_CONFIG.TIME_CONFIG;
    const timeStepDuration = config.SECONDS_PER_DAY / config.TIME_STEPS_PER_DAY;
    
    const previousStep = Math.floor(previousSeconds / timeStepDuration);
    const currentStep = Math.floor(this.totalSeconds / timeStepDuration);
    return currentStep > previousStep;
  }

  /**
   * 检查是否到了新的节气
   * @param {number} previousSeconds - 之前的总秒数
   * @returns {boolean} 是否为新的节气
   */
  isNewSolarTerm(previousSeconds) {
    const config = DEFAULT_CONFIG.TIME_CONFIG;
    const solarTermDuration = config.SECONDS_PER_DAY * config.DAYS_PER_SOLAR_TERM;
    
    const previousTerm = Math.floor(previousSeconds / solarTermDuration);
    const currentTerm = Math.floor(this.totalSeconds / solarTermDuration);
    return currentTerm > previousTerm;
  }

  /**
   * 克隆当前时间对象
   * @returns {GameTime} 克隆的时间对象
   */
  clone() {
    const cloned = new GameTime(this.totalSeconds);
    cloned.timeScale = this.timeScale;
    cloned.isPaused = this.isPaused;
    return cloned;
  }
}

/**
 * 时间管理系统类
 * 负责管理游戏中的时间流逝和相关事件
 */
class TimeSystem {
  constructor(eventEmitter = null) {
    this.gameTime = new GameTime();
    this.eventEmitter = eventEmitter;
    this.updateInterval = null;
    this.isRunning = false;
    
    // 时间事件监听器
    this.listeners = {
      timeUpdate: [],
      newDay: [],
      newTimeOfDay: [],
      newSolarTerm: [],
      newSeason: [],
      newYear: []
    };
    
    // 性能监控
    this.performanceStats = {
      updateCount: 0,
      totalUpdateTime: 0,
      averageUpdateTime: 0
    };
    
    this.initialize();
  }

  /**
   * 初始化时间系统
   */
  initialize() {
    console.log('时间系统初始化完成');
    
    // 设置默认更新间隔
    this.setUpdateInterval(DEFAULT_CONFIG.TIME_CONFIG.UPDATE_INTERVAL.NORMAL);
  }

  /**
   * 启动时间系统
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.gameTime.isPaused = false;
    this.gameTime.lastUpdateTime = Date.now();
    
    this.updateInterval = setInterval(() => {
      this.update();
    }, this.currentUpdateInterval);
    
    console.log('时间系统已启动');
    this.emitEvent('systemStarted', this.gameTime.clone());
  }

  /**
   * 停止时间系统
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.gameTime.isPaused = true;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    console.log('时间系统已停止');
    this.emitEvent('systemStopped', this.gameTime.clone());
  }

  /**
   * 暂停/恢复时间系统
   */
  togglePause() {
    if (this.gameTime.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * 暂停时间系统
   */
  pause() {
    this.gameTime.isPaused = true;
    console.log('时间系统已暂停');
    this.emitEvent('systemPaused', this.gameTime.clone());
  }

  /**
   * 恢复时间系统
   */
  resume() {
    this.gameTime.isPaused = false;
    this.gameTime.lastUpdateTime = Date.now();
    console.log('时间系统已恢复');
    this.emitEvent('systemResumed', this.gameTime.clone());
  }

  /**
   * 设置时间缩放因子
   * @param {number} scale - 缩放因子 (1.0 = 正常速度)
   */
  setTimeScale(scale) {
    this.gameTime.timeScale = Utils.Math.clamp(scale, 0.1, 10.0);
    console.log(`时间缩放设置为: ${this.gameTime.timeScale}x`);
    this.emitEvent('timeScaleChanged', this.gameTime.timeScale);
  }

  /**
   * 设置更新间隔
   * @param {number} interval - 更新间隔(毫秒)
   */
  setUpdateInterval(interval) {
    this.currentUpdateInterval = Utils.Math.clamp(interval, 100, 5000);
    
    // 如果系统正在运行，重新启动以应用新的间隔
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * 更新时间系统
   */
  update() {
    if (this.gameTime.isPaused) return;
    
    const startTime = performance.now();
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.gameTime.lastUpdateTime) / 1000; // 转换为秒
    
    // 保存之前的时间以便检测变化
    const previousSeconds = this.gameTime.totalSeconds;
    
    // 更新游戏时间
    this.gameTime.totalSeconds += deltaTime * this.gameTime.timeScale;
    this.gameTime.lastUpdateTime = currentTime;
    
    // 检测时间变化并触发相应事件
    this.checkTimeEvents(previousSeconds);
    
    // 触发时间更新事件
    this.emitEvent('timeUpdate', {
      gameTime: this.gameTime.clone(),
      deltaTime: deltaTime
    });
    
    // 更新性能统计
    const updateTime = performance.now() - startTime;
    this.updatePerformanceStats(updateTime);
  }

  /**
   * 检测时间事件
   * @param {number} previousSeconds - 之前的总秒数
   */
  checkTimeEvents(previousSeconds) {
    const gameTime = this.gameTime;
    
    // 检测新时辰
    if (gameTime.isNewTimeOfDay(previousSeconds)) {
      const timeOfDay = gameTime.getCurrentTimeOfDay();
      console.log(`进入新时辰: ${timeOfDay}`);
      this.emitEvent('newTimeOfDay', {
        timeOfDay: timeOfDay,
        gameTime: gameTime.clone()
      });
    }
    
    // 检测新一天
    if (gameTime.isNewDay(previousSeconds)) {
      const formattedTime = gameTime.getFormattedTime();
      console.log(`新的一天开始: ${formattedTime}`);
      this.emitEvent('newDay', {
        formattedTime: formattedTime,
        gameTime: gameTime.clone()
      });
    }
    
    // 检测新节气
    if (gameTime.isNewSolarTerm(previousSeconds)) {
      const solarTerm = gameTime.getCurrentSolarTerm();
      const season = gameTime.getCurrentSeason();
      console.log(`进入新节气: ${season} - ${solarTerm}`);
      this.emitEvent('newSolarTerm', {
        solarTerm: solarTerm,
        season: season,
        gameTime: gameTime.clone()
      });
    }
    
    // 检测新季节
    const previousComponents = new GameTime(previousSeconds).getTimeComponents();
    const currentComponents = gameTime.getTimeComponents();
    
    if (currentComponents.season !== previousComponents.season) {
      const season = gameTime.getCurrentSeason();
      console.log(`进入新季节: ${season}`);
      this.emitEvent('newSeason', {
        season: season,
        gameTime: gameTime.clone()
      });
    }
    
    // 检测新年
    if (currentComponents.year !== previousComponents.year) {
      console.log(`新年到来: 第${currentComponents.year}年`);
      this.emitEvent('newYear', {
        year: currentComponents.year,
        gameTime: gameTime.clone()
      });
    }
  }

  /**
   * 快进到指定时间
   * @param {number} targetSeconds - 目标时间(游戏内总秒数)
   */
  fastForwardTo(targetSeconds) {
    if (targetSeconds <= this.gameTime.totalSeconds) {
      console.warn('目标时间必须大于当前时间');
      return;
    }
    
    const previousSeconds = this.gameTime.totalSeconds;
    this.gameTime.totalSeconds = targetSeconds;
    
    // 检测跳过的时间事件
    this.checkTimeEvents(previousSeconds);
    
    console.log(`时间快进到: ${this.gameTime.getFormattedTime()}`);
    this.emitEvent('fastForward', {
      from: previousSeconds,
      to: targetSeconds,
      gameTime: this.gameTime.clone()
    });
  }

  /**
   * 获取当前天气效果
   * @returns {Object} 天气效果
   */
  getCurrentWeatherEffects() {
    const season = this.gameTime.getCurrentSeason();
    const weatherConfig = DEFAULT_CONFIG.WEATHER_SYSTEM;
    const seasonWeather = weatherConfig.PROBABILITIES[season];
    
    if (!seasonWeather) return null;
    
    // 简单的天气生成逻辑(可以在WeatherSystem中进一步完善)
    const weatherTypes = Object.keys(seasonWeather);
    const weights = Object.values(seasonWeather);
    const selectedWeather = Utils.Math.weightedRandom(weatherTypes, weights);
    
    return {
      type: selectedWeather,
      effects: weatherConfig.EFFECTS[selectedWeather] || {}
    };
  }

  /**
   * 获取当前季节效果
   * @returns {Object} 季节效果
   */
  getCurrentSeasonEffects() {
    const season = this.gameTime.getCurrentSeason();
    const seasonConfig = DEFAULT_CONFIG.SOLAR_TERMS[season];
    
    return seasonConfig?.effects || {};
  }

  /**
   * 添加事件监听器
   * @param {string} eventType - 事件类型
   * @param {Function} callback - 回调函数
   */
  addEventListener(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);
  }

  /**
   * 移除事件监听器
   * @param {string} eventType - 事件类型
   * @param {Function} callback - 回调函数
   */
  removeEventListener(eventType, callback) {
    if (this.listeners[eventType]) {
      const index = this.listeners[eventType].indexOf(callback);
      if (index > -1) {
        this.listeners[eventType].splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   * @param {string} eventType - 事件类型
   * @param {*} data - 事件数据
   */
  emitEvent(eventType, data) {
    // 使用内部事件系统
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`时间事件处理错误 [${eventType}]:`, error);
        }
      });
    }
    
    // 如果有外部事件发射器，也使用它
    if (this.eventEmitter && typeof this.eventEmitter.emit === 'function') {
      this.eventEmitter.emit(`time.${eventType}`, data);
    }
  }

  /**
   * 更新性能统计
   * @param {number} updateTime - 更新耗时
   */
  updatePerformanceStats(updateTime) {
    this.performanceStats.updateCount++;
    this.performanceStats.totalUpdateTime += updateTime;
    this.performanceStats.averageUpdateTime = 
      this.performanceStats.totalUpdateTime / this.performanceStats.updateCount;
  }

  /**
   * 获取性能统计信息
   * @returns {Object} 性能统计
   */
  getPerformanceStats() {
    return { ...this.performanceStats };
  }

  /**
   * 获取当前时间状态
   * @returns {Object} 时间状态
   */
  getState() {
    return {
      gameTime: this.gameTime.clone(),
      isRunning: this.isRunning,
      isPaused: this.gameTime.isPaused,
      timeScale: this.gameTime.timeScale,
      updateInterval: this.currentUpdateInterval,
      formattedTime: this.gameTime.getFormattedTime(),
      components: this.gameTime.getTimeComponents(),
      currentSeason: this.gameTime.getCurrentSeason(),
      currentSolarTerm: this.gameTime.getCurrentSolarTerm(),
      currentTimeOfDay: this.gameTime.getCurrentTimeOfDay(),
      performanceStats: this.getPerformanceStats()
    };
  }

  /**
   * 设置时间状态
   * @param {Object} state - 时间状态
   */
  setState(state) {
    if (state.gameTime) {
      this.gameTime = new GameTime(state.gameTime.totalSeconds);
      this.gameTime.timeScale = state.gameTime.timeScale || 1.0;
      this.gameTime.isPaused = state.gameTime.isPaused || false;
    }
    
    if (typeof state.timeScale === 'number') {
      this.setTimeScale(state.timeScale);
    }
    
    if (typeof state.updateInterval === 'number') {
      this.setUpdateInterval(state.updateInterval);
    }
    
    console.log('时间系统状态已恢复');
  }

  /**
   * 销毁时间系统
   */
  destroy() {
    this.stop();
    this.listeners = {};
    this.eventEmitter = null;
    console.log('时间系统已销毁');
  }
}

// ==================== 时间查询工具 ====================
export const TimeQuery = {
  /**
   * 判断是否为工作时间
   * @param {string} timeOfDay - 时辰名称
   * @returns {boolean} 是否为工作时间
   */
  isWorkTime(timeOfDay) {
    const workPeriods = ['上午', '下午'];
    return workPeriods.includes(timeOfDay);
  },

  /**
   * 判断是否为休息时间
   * @param {string} timeOfDay - 时辰名称
   * @returns {boolean} 是否为休息时间
   */
  isRestTime(timeOfDay) {
    const restPeriods = ['夜晚', '正午'];
    return restPeriods.includes(timeOfDay);
  },

  /**
   * 判断是否为社交时间
   * @param {string} timeOfDay - 时辰名称
   * @returns {boolean} 是否为社交时间
   */
  isSocialTime(timeOfDay) {
    const socialPeriods = ['黄昏', '夜晚'];
    return socialPeriods.includes(timeOfDay);
  },

  /**
   * 获取适合的行为类型
   * @param {string} timeOfDay - 时辰名称
   * @returns {Array} 适合的行为类型列表
   */
  getSuitableActivities(timeOfDay) {
    const schedule = DEFAULT_CONFIG.DAILY_SCHEDULE[timeOfDay];
    if (!schedule) return [];
    
    return [...(schedule.priority || []), ...(schedule.optional || [])];
  },

  /**
   * 判断天气是否适合户外活动
   * @param {string} weather - 天气类型
   * @returns {boolean} 是否适合户外活动
   */
  isOutdoorWeather(weather) {
    const goodWeather = ['晴朗', '多云'];
    return goodWeather.includes(weather);
  },

  /**
   * 获取季节加成
   * @param {string} season - 季节名称
   * @param {string} activity - 活动类型
   * @returns {number} 加成倍数
   */
  getSeasonalBonus(season, activity) {
    const seasonConfig = DEFAULT_CONFIG.SOLAR_TERMS[season];
    if (!seasonConfig) return 1.0;
    
    // 根据活动类型和季节返回适当的加成
    if (activity === '垦荒耕种') {
      return seasonConfig.effects.growthRate || 1.0;
    }
    
    return 1.0;
  }
};

export { TimeSystem };
export default TimeSystem;