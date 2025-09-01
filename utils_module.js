/**
 * Utils.js - 基础工具函数模块
 * 提供游戏中常用的工具函数和辅助方法
 * 依赖: 无
 * 输出: 各种工具函数和常量
 */

// ==================== 数学工具函数 ====================
export const MathUtils = {
  /**
   * 限制数值在指定范围内
   * @param {number} value - 输入值
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {number} 限制后的值
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * 线性插值
   * @param {number} a - 起始值
   * @param {number} b - 目标值
   * @param {number} t - 插值系数 (0-1)
   * @returns {number} 插值结果
   */
  lerp(a, b, t) {
    return a + (b - a) * this.clamp(t, 0, 1);
  },

  /**
   * 将值从一个范围映射到另一个范围
   * @param {number} value - 输入值
   * @param {number} fromMin - 输入范围最小值
   * @param {number} fromMax - 输入范围最大值
   * @param {number} toMin - 输出范围最小值
   * @param {number} toMax - 输出范围最大值
   * @returns {number} 映射后的值
   */
  mapRange(value, fromMin, fromMax, toMin, toMax) {
    const normalized = (value - fromMin) / (fromMax - fromMin);
    return toMin + normalized * (toMax - toMin);
  },

  /**
   * 生成指定范围内的随机整数
   * @param {number} min - 最小值(包含)
   * @param {number} max - 最大值(包含)
   * @returns {number} 随机整数
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * 生成指定范围内的随机浮点数
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {number} 随机浮点数
   */
  randomFloat(min, max) {
    return Math.random() * (max - min) + min;
  },

  /**
   * 正态分布随机数生成器(Box-Muller变换)
   * @param {number} mean - 均值
   * @param {number} stdDev - 标准差
   * @returns {number} 正态分布随机数
   */
  randomNormal(mean = 0, stdDev = 1) {
    if (this._hasSpare) {
      this._hasSpare = false;
      return this._spare * stdDev + mean;
    }

    this._hasSpare = true;
    const u = Math.random();
    const v = Math.random();
    const mag = stdDev * Math.sqrt(-2.0 * Math.log(u));
    this._spare = mag * Math.cos(2.0 * Math.PI * v);
    return mag * Math.sin(2.0 * Math.PI * v) + mean;
  },

  /**
   * 计算两点间的距离
   * @param {number} x1 - 点1的x坐标
   * @param {number} y1 - 点1的y坐标
   * @param {number} x2 - 点2的x坐标
   * @param {number} y2 - 点2的y坐标
   * @returns {number} 距离
   */
  distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * 权重随机选择
   * @param {Array} items - 选择项数组
   * @param {Array} weights - 对应的权重数组
   * @returns {*} 选中的项
   */
  weightedRandom(items, weights) {
    if (items.length !== weights.length) {
      throw new Error('Items and weights arrays must have the same length');
    }

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;
    
    let weightSum = 0;
    for (let i = 0; i < items.length; i++) {
      weightSum += weights[i];
      if (random <= weightSum) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }
};

// ==================== 数组工具函数 ====================
export const ArrayUtils = {
  /**
   * 随机打乱数组
   * @param {Array} array - 输入数组
   * @returns {Array} 打乱后的新数组
   */
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * 从数组中随机选择一个元素
   * @param {Array} array - 输入数组
   * @returns {*} 随机选中的元素
   */
  randomChoice(array) {
    if (array.length === 0) return undefined;
    return array[Math.floor(Math.random() * array.length)];
  },

  /**
   * 从数组中随机选择多个不重复的元素
   * @param {Array} array - 输入数组
   * @param {number} count - 选择个数
   * @returns {Array} 选中的元素数组
   */
  randomChoices(array, count) {
    if (count >= array.length) return [...array];
    
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, count);
  },

  /**
   * 根据条件过滤数组
   * @param {Array} array - 输入数组
   * @param {Function} predicate - 过滤条件函数
   * @returns {Array} 过滤后的数组
   */
  filterBy(array, predicate) {
    return array.filter(predicate);
  },

  /**
   * 根据属性对数组进行分组
   * @param {Array} array - 输入数组
   * @param {string|Function} key - 分组键或函数
   * @returns {Object} 分组后的对象
   */
  groupBy(array, key) {
    const getKey = typeof key === 'function' ? key : item => item[key];
    
    return array.reduce((groups, item) => {
      const groupKey = getKey(item);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {});
  },

  /**
   * 计算数组的平均值
   * @param {Array} array - 数值数组
   * @returns {number} 平均值
   */
  average(array) {
    if (array.length === 0) return 0;
    return array.reduce((sum, num) => sum + num, 0) / array.length;
  },

  /**
   * 查找数组中的最大值及其索引
   * @param {Array} array - 数值数组
   * @returns {Object} {value, index}
   */
  maxWithIndex(array) {
    if (array.length === 0) return { value: undefined, index: -1 };
    
    let maxValue = array[0];
    let maxIndex = 0;
    
    for (let i = 1; i < array.length; i++) {
      if (array[i] > maxValue) {
        maxValue = array[i];
        maxIndex = i;
      }
    }
    
    return { value: maxValue, index: maxIndex };
  }
};

// ==================== 对象工具函数 ====================
export const ObjectUtils = {
  /**
   * 深度克隆对象
   * @param {*} obj - 要克隆的对象
   * @returns {*} 克隆后的对象
   */
  deepClone(obj, visited = new WeakMap()) {
    // 处理基本类型和null
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    // 检查循环引用
    if (visited.has(obj)) {
      return visited.get(obj);
    }
    
    // 处理特殊对象类型
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (obj instanceof RegExp) {
      return new RegExp(obj);
    }
    
    // 处理函数 - 直接返回引用
    if (typeof obj === 'function') {
      return obj;
    }
    
    // 处理DOM元素 - 直接返回引用
    if (obj.nodeType) {
      return obj;
    }
    
    let cloned;
    
    if (Array.isArray(obj)) {
      cloned = [];
      visited.set(obj, cloned);
      
      try {
        for (let i = 0; i < obj.length; i++) {
          cloned[i] = this.deepClone(obj[i], visited);
        }
      } catch (error) {
        console.warn('数组克隆出错，返回浅拷贝:', error);
        return [...obj];
      }
    } else {
      cloned = {};
      visited.set(obj, cloned);
      
      try {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            // 跳过可能导致问题的属性
            if (key === 'constructor' || key === '__proto__') {
              continue;
            }
            cloned[key] = this.deepClone(obj[key], visited);
          }
        }
      } catch (error) {
        console.warn('对象克隆出错，返回浅拷贝:', error);
        return { ...obj };
      }
    }
    
    return cloned;
  },

  /**
   * 合并多个对象
   * @param {...Object} objects - 要合并的对象
   * @returns {Object} 合并后的对象
   */

  merge(...objects) {
    const result = {};
    
    for (const obj of objects) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            result[key] = this.merge(result[key] || {}, obj[key]);
          } else {
            result[key] = obj[key];
          }
        }
      }
    }
    
    return result;
  },

  /**
   * 获取对象的深度嵌套属性
   * @param {Object} obj - 目标对象
   * @param {string} path - 属性路径，如 'a.b.c'
   * @param {*} defaultValue - 默认值
   * @returns {*} 属性值
   */
  getNestedProperty(obj, path, defaultValue = undefined) {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined || !current.hasOwnProperty(key)) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current;
  },

  /**
   * 设置对象的深度嵌套属性
   * @param {Object} obj - 目标对象
   * @param {string} path - 属性路径，如 'a.b.c'
   * @param {*} value - 要设置的值
   */
  setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current.hasOwnProperty(key) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  },

  /**
   * 检查对象是否为空
   * @param {Object} obj - 要检查的对象
   * @returns {boolean} 是否为空
   */
  isEmpty(obj) {
    if (obj === null || obj === undefined) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  },

  /**
   * 深度比较两个对象是否相等
   * @param {*} obj1 - 第一个对象
   * @param {*} obj2 - 第二个对象
   * @returns {boolean} 是否相等
   */
  deepEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return obj1 === obj2;
    
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 !== 'object') return obj1 === obj2;
    
    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  }

};

// ==================== 字符串工具函数 ====================
export const StringUtils = {
  /**
   * 生成随机字符串
   * @param {number} length - 字符串长度
   * @param {string} charset - 字符集
   * @returns {string} 随机字符串
   */
  randomString(length, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  },

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * 格式化字符串模板
   * @param {string} template - 模板字符串，支持 {key} 占位符
   * @param {Object} values - 替换值对象
   * @returns {string} 格式化后的字符串
   */
  format(template, values) {
    return template.replace(/\{([^}]+)\}/g, (match, key) => {
      return values.hasOwnProperty(key) ? values[key] : match;
    });
  },

  /**
   * 首字母大写
   * @param {string} str - 输入字符串
   * @returns {string} 首字母大写的字符串
   */
  capitalize(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * 驼峰命名转换
   * @param {string} str - 输入字符串
   * @returns {string} 驼峰命名字符串
   */
  toCamelCase(str) {
    return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
  }
};

// ==================== 时间工具函数 ====================
export const TimeUtils = {
  /**
   * 格式化游戏时间
   * @param {number} gameTime - 游戏时间(游戏内天数)
   * @returns {Object} 格式化的时间对象
   */
  formatGameTime(gameTime) {
    const totalDays = Math.floor(gameTime);
    const years = Math.floor(totalDays / (4 * 3 * 2 * 3)); // 每年 = 4季 * 3月/季 * 2节气/月 * 3天/节气
    const remainingDays = totalDays % (4 * 3 * 2 * 3);
    
    const seasons = Math.floor(remainingDays / (3 * 2 * 3));
    const seasonNames = ['春季', '夏季', '秋季', '冬季'];
    
    const monthInSeason = Math.floor((remainingDays % (3 * 2 * 3)) / (2 * 3));
    const solarTermInMonth = Math.floor((remainingDays % (2 * 3)) / 3);
    const dayInSolarTerm = remainingDays % 3;
    
    return {
      year: years + 1,
      season: seasonNames[seasons],
      month: monthInSeason + 1,
      solarTerm: solarTermInMonth + 1,
      day: dayInSolarTerm + 1,
      totalDays: totalDays
    };
  },

  /**
   * 获取当前时辰
   * @param {number} timeOfDay - 一天中的时间(0-1)
   * @returns {string} 时辰名称
   */
  getTimeOfDayPeriod(timeOfDay) {
    const periods = ["黎明", "上午", "正午", "下午", "黄昏", "夜晚"];
    const index = Math.floor(timeOfDay * periods.length);
    return periods[Math.min(index, periods.length - 1)];
  },

  /**
   * 计算两个时间点之间的间隔
   * @param {number} time1 - 时间点1
   * @param {number} time2 - 时间点2
   * @returns {number} 时间间隔
   */
  timeDifference(time1, time2) {
    return Math.abs(time2 - time1);
  },

  /**
   * 获取当前实际时间戳
   * @returns {number} 时间戳
   */
  now() {
    return Date.now();
  },

  /**
   * 延迟执行函数
   * @param {Function} func - 要执行的函数
   * @param {number} delay - 延迟时间(毫秒)
   * @returns {number} 定时器ID
   */
  delay(func, delay) {
    return setTimeout(func, delay);
  }
};

// ==================== 验证工具函数 ====================
export const ValidationUtils = {
  /**
   * 验证数值是否在有效范围内
   * @param {number} value - 要验证的值
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {boolean} 是否有效
   */
  isValidRange(value, min, max) {
    return typeof value === 'number' && value >= min && value <= max;
  },

  /**
   * 验证字符串是否非空
   * @param {string} str - 要验证的字符串
   * @returns {boolean} 是否非空
   */
  isNonEmptyString(str) {
    return typeof str === 'string' && str.trim().length > 0;
  },

  /**
   * 验证数组是否非空
   * @param {Array} arr - 要验证的数组
   * @returns {boolean} 是否非空
   */
  isNonEmptyArray(arr) {
    return Array.isArray(arr) && arr.length > 0;
  },

  /**
   * 验证对象是否有指定的属性
   * @param {Object} obj - 要验证的对象
   * @param {Array} requiredProps - 必需的属性列表
   * @returns {boolean} 是否包含所有必需属性
   */
  hasRequiredProperties(obj, requiredProps) {
    if (typeof obj !== 'object' || obj === null) return false;
    return requiredProps.every(prop => obj.hasOwnProperty(prop));
  },

  /**
   * 验证游戏配置的有效性
   * @param {Object} config - 游戏配置对象
   * @returns {Object} 验证结果 {isValid, errors}
   */
  validateGameConfig(config) {
    const errors = [];
    
    // 验证时间配置
    if (!config.TIME_CONFIG) {
      errors.push('缺少 TIME_CONFIG 配置');
    } else {
      if (!this.isValidRange(config.TIME_CONFIG.SECONDS_PER_DAY, 60, 3600)) {
        errors.push('SECONDS_PER_DAY 必须在 60-3600 之间');
      }
    }
    
    // 验证德行系统配置
    if (!config.VIRTUE_SYSTEM) {
      errors.push('缺少 VIRTUE_SYSTEM 配置');
    }
    
    // 验证行为分类配置
    if (!config.BEHAVIOR_CATEGORIES) {
      errors.push('缺少 BEHAVIOR_CATEGORIES 配置');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
};

// ==================== 性能工具函数 ====================
export const PerformanceUtils = {
  /**
   * 测量函数执行时间
   * @param {Function} func - 要测量的函数
   * @param {string} label - 标签
   * @returns {*} 函数返回值
   */
  measureTime(func, label = 'Function') {
    const start = performance.now();
    const result = func();
    const end = performance.now();
    console.log(`${label} 执行时间: ${(end - start).toFixed(2)}ms`);
    return result;
  },

  /**
   * 节流函数
   * @param {Function} func - 要节流的函数
   * @param {number} limit - 限制时间间隔(毫秒)
   * @returns {Function} 节流后的函数
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * 防抖函数
   * @param {Function} func - 要防抖的函数
   * @param {number} delay - 延迟时间(毫秒)
   * @returns {Function} 防抖后的函数
   */
  debounce(func, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },

  /**
   * 对象池管理器
   */
  createObjectPool(createFunc, resetFunc, initialSize = 10) {
    const pool = [];
    
    // 初始化对象池
    for (let i = 0; i < initialSize; i++) {
      pool.push(createFunc());
    }
    
    return {
      get() {
        return pool.length > 0 ? pool.pop() : createFunc();
      },
      
      release(obj) {
        if (resetFunc) resetFunc(obj);
        pool.push(obj);
      },
      
      size() {
        return pool.length;
      }
    };
  }
};

// ==================== 导出所有工具模块 ====================
export const Utils = {
  Math: MathUtils,
  Array: ArrayUtils,
  Object: ObjectUtils,
  String: StringUtils,
  Time: TimeUtils,
  Validation: ValidationUtils,
  Performance: PerformanceUtils
};

export default Utils;