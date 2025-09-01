/**
 * event_bus.js - 南北朝坞堡模拟器事件总线系统
 * 
 * 功能：提供模块间松耦合的事件通信机制
 * 特色：支持事件优先级、异步处理、错误恢复、性能监控
 * 
 * 设计理念：
 * - 发布-订阅模式：模块间通过事件解耦
 * - 异步处理：避免阻塞主线程
 * - 错误隔离：单个事件处理器错误不影响其他处理器
 * - 性能优化：事件节流、批处理、优先级队列
 */

import { Utils } from './utils_module.js';
import { DEFAULT_CONFIG } from './gameConfig.js';

/**
 * 事件优先级枚举
 */
export const EventPriority = {
  CRITICAL: 0,    // 紧急事件（角色死亡、灾害等）
  HIGH: 1,        // 高优先级（状态变更、重要决策等）
  NORMAL: 2,      // 普通事件（日常行为、资源变化等）
  LOW: 3,         // 低优先级（统计更新、日志记录等）
  BACKGROUND: 4   // 后台事件（清理任务、性能监控等）
};

/**
 * 事件状态枚举
 */
export const EventStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing', 
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * 事件对象类
 */
export class GameEvent {
  constructor(type, data = {}, options = {}) {
    this.id = Utils.String.generateId();
    this.type = type;
    this.data = data;
    this.timestamp = Date.now();
    this.gameTime = options.gameTime || 0;
    
    // 事件属性
    this.priority = options.priority || EventPriority.NORMAL;
    this.source = options.source || 'unknown';
    this.target = options.target || null;
    this.category = options.category || 'general';
    
    // 处理状态
    this.status = EventStatus.PENDING;
    this.processingStarted = null;
    this.processingCompleted = null;
    this.retryCount = 0;
    this.maxRetries = options.maxRetries || 3;
    
    // 链式事件
    this.triggeredEvents = [];
    this.parentEvent = options.parentEvent || null;
    
    // 性能监控
    this.processingDuration = 0;
    this.handlerCount = 0;
    this.errorCount = 0;
  }

  /**
   * 标记事件开始处理
   */
  startProcessing() {
    this.status = EventStatus.PROCESSING;
    this.processingStarted = Date.now();
  }

  /**
   * 标记事件处理完成
   */
  completeProcessing() {
    this.status = EventStatus.COMPLETED;
    this.processingCompleted = Date.now();
    if (this.processingStarted) {
      this.processingDuration = this.processingCompleted - this.processingStarted;
    }
  }

  /**
   * 标记事件处理失败
   */
  failProcessing(error) {
    this.status = EventStatus.FAILED;
    this.lastError = error;
    this.errorCount++;
    this.processingCompleted = Date.now();
    if (this.processingStarted) {
      this.processingDuration = this.processingCompleted - this.processingStarted;
    }
  }

  /**
   * 检查是否可以重试
   */
  canRetry() {
    return this.retryCount < this.maxRetries && this.status === EventStatus.FAILED;
  }

  /**
   * 准备重试
   */
  prepareRetry() {
    if (this.canRetry()) {
      this.retryCount++;
      this.status = EventStatus.PENDING;
      this.processingStarted = null;
      this.processingCompleted = null;
      return true;
    }
    return false;
  }
}

/**
 * 事件处理器包装类
 */
export class EventHandler {
  constructor(callback, options = {}) {
    this.id = Utils.String.generateId();
    this.callback = callback;
    this.priority = options.priority || EventPriority.NORMAL;
    this.once = options.once || false;
    this.async = options.async !== false; // 默认异步
    this.throttle = options.throttle || 0; // 节流时间（毫秒）
    this.filter = options.filter || null; // 过滤函数
    this.context = options.context || null; // 执行上下文
    
    // 统计信息
    this.callCount = 0;
    this.totalProcessingTime = 0;
    this.errorCount = 0;
    this.lastCalled = null;
    this.lastError = null;
    
    // 节流控制
    this.lastThrottleTime = 0;
  }

  /**
   * 检查是否应该执行处理器
   */
  shouldExecute(event) {
    // 检查节流
    if (this.throttle > 0) {
      const now = Date.now();
      if (now - this.lastThrottleTime < this.throttle) {
        return false;
      }
      this.lastThrottleTime = now;
    }

    // 检查过滤器
    if (this.filter && !this.filter(event)) {
      return false;
    }

    return true;
  }

  /**
   * 执行事件处理器
   */
  async execute(event) {
    if (!this.shouldExecute(event)) {
      return { success: false, reason: 'filtered_or_throttled' };
    }

    const startTime = Date.now();
    this.lastCalled = startTime;
    this.callCount++;

    try {
      let result;
      if (this.async) {
        result = await this.callback.call(this.context, event);
      } else {
        result = this.callback.call(this.context, event);
      }

      const endTime = Date.now();
      this.totalProcessingTime += (endTime - startTime);

      return { success: true, result };
    } catch (error) {
      this.errorCount++;
      this.lastError = error;
      const endTime = Date.now();
      this.totalProcessingTime += (endTime - startTime);

      return { success: false, error };
    }
  }

  /**
   * 获取处理器统计信息
   */
  getStatistics() {
    return {
      id: this.id,
      callCount: this.callCount,
      errorCount: this.errorCount,
      averageProcessingTime: this.callCount > 0 ? this.totalProcessingTime / this.callCount : 0,
      totalProcessingTime: this.totalProcessingTime,
      lastCalled: this.lastCalled,
      lastError: this.lastError
    };
  }
}

/**
 * 事件总线主类
 */
export class EventBus {
  constructor(options = {}) {
    this.options = {
      maxEventHistory: options.maxEventHistory || 1000,
      defaultBatchSize: options.defaultBatchSize || 10,
      processingInterval: options.processingInterval || 16, // ~60fps
      enableMetrics: options.enableMetrics !== false,
      enableLogging: options.enableLogging !== false,
      maxConcurrentEvents: options.maxConcurrentEvents || 50,
      ...options
    };

    // 事件处理器映射 eventType -> EventHandler[]
    this.handlers = new Map();
    
    // 事件队列（按优先级排序）
    this.eventQueue = [];
    this.processingQueue = new Set();
    
    // 事件历史
    this.eventHistory = [];
    this.completedEvents = [];
    this.failedEvents = [];
    
    // 批处理配置
    this.batchProcessors = new Map();
    this.pendingBatches = new Map();
    
    // 性能监控
    this.metrics = {
      totalEventsProcessed: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      eventsPerSecond: 0,
      errorRate: 0,
      lastPerformanceCheck: Date.now()
    };
    
    // 中间件链
    this.middleware = [];
    
    // 状态管理
    this.isProcessing = false;
    this.isPaused = false;
    this.isShuttingDown = false;
    
    // 定时器
    this.processingTimer = null;
    this.metricsTimer = null;
    
    // 启动处理循环
    this.startProcessing();
    
    console.log('🚌 事件总线系统已初始化');
  }

  /**
   * 订阅事件
   * @param {string} eventType - 事件类型
   * @param {Function} callback - 回调函数
   * @param {Object} options - 选项配置
   * @returns {string} 处理器ID
   */
  on(eventType, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new Error('Event callback must be a function');
    }

    const handler = new EventHandler(callback, options);
    
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    const handlers = this.handlers.get(eventType);
    handlers.push(handler);
    
    // 按优先级排序
    handlers.sort((a, b) => a.priority - b.priority);
    
    if (this.options.enableLogging) {
      console.log(`📝 事件监听器已注册: ${eventType} (优先级: ${handler.priority})`);
    }
    
    return handler.id;
  }

  /**
   * 订阅一次性事件
   * @param {string} eventType - 事件类型
   * @param {Function} callback - 回调函数
   * @param {Object} options - 选项配置
   * @returns {string} 处理器ID
   */
  once(eventType, callback, options = {}) {
    return this.on(eventType, callback, { ...options, once: true });
  }

  /**
   * 取消订阅
   * @param {string} eventType - 事件类型
   * @param {string} handlerId - 处理器ID
   * @returns {boolean} 是否成功取消
   */
  off(eventType, handlerId) {
    if (!this.handlers.has(eventType)) {
      return false;
    }
    
    const handlers = this.handlers.get(eventType);
    const index = handlers.findIndex(h => h.id === handlerId);
    
    if (index !== -1) {
      handlers.splice(index, 1);
      if (handlers.length === 0) {
        this.handlers.delete(eventType);
      }
      
      if (this.options.enableLogging) {
        console.log(`🗑️ 事件监听器已移除: ${eventType}`);
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * 发出事件
   * @param {string} eventType - 事件类型
   * @param {*} data - 事件数据
   * @param {Object} options - 事件选项
   * @returns {GameEvent} 创建的事件对象
   */
  emit(eventType, data = {}, options = {}) {
    if (this.isShuttingDown) {
      console.warn('⚠️ 事件总线正在关闭，忽略事件:', eventType);
      return null;
    }

    const event = new GameEvent(eventType, data, options);
    
    // 应用中间件
    for (const middleware of this.middleware) {
      try {
        const result = middleware(event);
        if (result === false) {
          // 中间件阻止事件
          if (this.options.enableLogging) {
            console.log(`🚫 事件被中间件阻止: ${eventType}`);
          }
          return event;
        }
      } catch (error) {
        console.error('中间件处理错误:', error);
      }
    }
    
    // 添加到事件队列
    this.addToQueue(event);
    
    // 记录事件历史
    this.recordEvent(event);
    
    // if (this.options.enableLogging) {
    //   console.log(`📡 事件已发出: ${eventType}`, {
    //     priority: event.priority,
    //     source: event.source,
    //     queueSize: this.eventQueue.length
    //   });
    // }
    
    return event;
  }

  /**
   * 批量发出事件
   * @param {Array} events - 事件数组 [{type, data, options}, ...]
   * @returns {Array} 创建的事件对象数组
   */
  emitBatch(events) {
    const gameEvents = events.map(({ type, data, options }) => 
      this.emit(type, data, options)
    ).filter(event => event !== null);
    
    if (this.options.enableLogging) {
      console.log(`📦 批量发出事件: ${gameEvents.length}个`);
    }
    
    return gameEvents;
  }

  /**
   * 添加中间件
   * @param {Function} middleware - 中间件函数
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    
    this.middleware.push(middleware);
    console.log('🔧 中间件已添加');
  }

  /**
   * 注册批处理器
   * @param {string} eventType - 事件类型
   * @param {Function} processor - 批处理函数
   * @param {Object} options - 批处理选项
   */
  registerBatchProcessor(eventType, processor, options = {}) {
    this.batchProcessors.set(eventType, {
      processor,
      batchSize: options.batchSize || this.options.defaultBatchSize,
      timeout: options.timeout || 100,
      accumulator: options.accumulator || ((events) => events)
    });
    
    console.log(`📋 批处理器已注册: ${eventType}`);
  }

  /**
   * 将事件添加到队列
   * @param {GameEvent} event - 事件对象
   */
  addToQueue(event) {
    // 检查是否有批处理器
    if (this.batchProcessors.has(event.type)) {
      this.addToBatch(event);
      return;
    }
    
    // 添加到优先级队列
    this.eventQueue.push(event);
    this.eventQueue.sort((a, b) => a.priority - b.priority);
    
    // 限制队列大小
    if (this.eventQueue.length > this.options.maxConcurrentEvents * 2) {
      const dropped = this.eventQueue.splice(this.options.maxConcurrentEvents);
      console.warn(`⚠️ 事件队列溢出，丢弃 ${dropped.length} 个低优先级事件`);
    }
  }

  /**
   * 添加到批处理
   * @param {GameEvent} event - 事件对象
   */
  addToBatch(event) {
    if (!this.pendingBatches.has(event.type)) {
      this.pendingBatches.set(event.type, {
        events: [],
        timer: null
      });
    }
    
    const batch = this.pendingBatches.get(event.type);
    batch.events.push(event);
    
    const batchConfig = this.batchProcessors.get(event.type);
    
    // 检查是否达到批处理大小
    if (batch.events.length >= batchConfig.batchSize) {
      this.processBatch(event.type);
      return;
    }
    
    // 设置超时处理
    if (!batch.timer) {
      batch.timer = setTimeout(() => {
        this.processBatch(event.type);
      }, batchConfig.timeout);
    }
  }

  /**
   * 处理批事件
   * @param {string} eventType - 事件类型
   */
  async processBatch(eventType) {
    const batch = this.pendingBatches.get(eventType);
    if (!batch || batch.events.length === 0) return;
    
    const batchConfig = this.batchProcessors.get(eventType);
    
    // 清理定时器
    if (batch.timer) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }
    
    // 取出事件
    const events = batch.events.splice(0);
    
    try {
      const startTime = Date.now();
      const processedData = batchConfig.accumulator(events);
      await batchConfig.processor(processedData);
      
      // 标记所有事件为已完成
      events.forEach(event => event.completeProcessing());
      
      const processingTime = Date.now() - startTime;
      if (this.options.enableLogging) {
        console.log(`📦 批处理完成: ${eventType} (${events.length}个事件, ${processingTime}ms)`);
      }
      
    } catch (error) {
      console.error(`批处理失败: ${eventType}`, error);
      events.forEach(event => event.failProcessing(error));
    }
  }

  /**
   * 启动事件处理循环
   */
  startProcessing() {
    if (this.processingTimer) return;
    
    this.processingTimer = setInterval(() => {
      if (!this.isPaused && !this.isShuttingDown) {
        this.processEventQueue();
      }
    }, this.options.processingInterval);
    
    // 启动性能监控
    if (this.options.enableMetrics) {
      this.metricsTimer = setInterval(() => {
        this.updateMetrics();
      }, 5000); // 每5秒更新一次性能指标
    }
    
    console.log('▶️ 事件处理循环已启动');
  }

  /**
   * 停止事件处理
   */
  stopProcessing() {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
    
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    
    console.log('⏸️ 事件处理循环已停止');
  }

  /**
   * 暂停事件处理
   */
  pause() {
    this.isPaused = true;
    console.log('⏸️ 事件处理已暂停');
  }

  /**
   * 恢复事件处理
   */
  resume() {
    this.isPaused = false;
    console.log('▶️ 事件处理已恢复');
  }

  /**
   * 处理事件队列
   */
  async processEventQueue() {
    if (this.isProcessing || this.eventQueue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      const maxConcurrent = Math.min(
        this.options.maxConcurrentEvents,
        this.eventQueue.length
      );
      
      const processingPromises = [];
      
      for (let i = 0; i < maxConcurrent; i++) {
        const event = this.eventQueue.shift();
        if (!event) break;
        
        this.processingQueue.add(event);
        processingPromises.push(this.processEvent(event));
      }
      
      await Promise.allSettled(processingPromises);
      
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 处理单个事件
   * @param {GameEvent} event - 事件对象
   */
  async processEvent(event) {
    event.startProcessing();
    
    try {
      const handlers = this.handlers.get(event.type) || [];
      if (handlers.length === 0) {
        event.completeProcessing();
        return;
      }
      
      const results = [];
      
      for (const handler of handlers) {
        try {
          const result = await handler.execute(event);
          results.push(result);
          event.handlerCount++;
          
          if (!result.success) {
            event.errorCount++;
          }
          
          // 如果是一次性处理器，移除它
          if (handler.once) {
            this.off(event.type, handler.id);
          }
          
        } catch (error) {
          console.error(`事件处理器错误 [${event.type}]:`, error);
          event.errorCount++;
          results.push({ success: false, error });
        }
      }
      
      event.completeProcessing();
      
      // 更新统计
      this.metrics.totalEventsProcessed++;
      this.metrics.totalProcessingTime += event.processingDuration;
      
    } catch (error) {
      event.failProcessing(error);
      console.error(`事件处理失败 [${event.type}]:`, error);
      
      // 尝试重试
      if (event.canRetry()) {
        event.prepareRetry();
        this.addToQueue(event);
        console.log(`🔄 事件重试: ${event.type} (${event.retryCount}/${event.maxRetries})`);
      }
    } finally {
      this.processingQueue.delete(event);
    }
  }

  /**
   * 记录事件历史
   * @param {GameEvent} event - 事件对象
   */
  recordEvent(event) {
    this.eventHistory.push(event);
    
    // 限制历史记录大小
    if (this.eventHistory.length > this.options.maxEventHistory) {
      this.eventHistory.shift();
    }
    
    // 分类记录
    if (event.status === EventStatus.COMPLETED) {
      this.completedEvents.push(event);
    } else if (event.status === EventStatus.FAILED) {
      this.failedEvents.push(event);
    }
    
    // 清理旧记录
    const maxCompleted = Math.floor(this.options.maxEventHistory * 0.8);
    const maxFailed = Math.floor(this.options.maxEventHistory * 0.2);
    
    if (this.completedEvents.length > maxCompleted) {
      this.completedEvents.splice(0, this.completedEvents.length - maxCompleted);
    }
    
    if (this.failedEvents.length > maxFailed) {
      this.failedEvents.splice(0, this.failedEvents.length - maxFailed);
    }
  }

  /**
   * 更新性能指标
   */
  updateMetrics() {
    const now = Date.now();
    const timeDiff = now - this.metrics.lastPerformanceCheck;
    
    if (this.metrics.totalEventsProcessed > 0) {
      this.metrics.averageProcessingTime = 
        this.metrics.totalProcessingTime / this.metrics.totalEventsProcessed;
    }
    
    this.metrics.eventsPerSecond = 
      (this.metrics.totalEventsProcessed / timeDiff) * 1000;
    
    const totalEvents = this.metrics.totalEventsProcessed;
    const failedEvents = this.failedEvents.length;
    this.metrics.errorRate = totalEvents > 0 ? (failedEvents / totalEvents) * 100 : 0;
    
    this.metrics.lastPerformanceCheck = now;
  }

  /**
   * 获取系统状态
   * @returns {Object} 系统状态信息
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
      isShuttingDown: this.isShuttingDown,
      queueSize: this.eventQueue.length,
      processingSize: this.processingQueue.size,
      handlerCount: Array.from(this.handlers.values()).reduce((sum, handlers) => sum + handlers.length, 0),
      metrics: { ...this.metrics },
      eventHistory: {
        total: this.eventHistory.length,
        completed: this.completedEvents.length,
        failed: this.failedEvents.length
      }
    };
  }

  /**
   * 获取详细统计信息
   * @returns {Object} 详细统计
   */
  getDetailedStats() {
    const handlerStats = new Map();
    
    for (const [eventType, handlers] of this.handlers.entries()) {
      handlerStats.set(eventType, handlers.map(h => h.getStatistics()));
    }
    
    return {
      status: this.getStatus(),
      handlerStatistics: Object.fromEntries(handlerStats),
      recentEvents: this.eventHistory.slice(-10),
      failedEvents: this.failedEvents.slice(-5)
    };
  }

  /**
   * 清理资源
   */
  cleanup() {
    console.log('🧹 开始事件总线清理...');
    
    this.isShuttingDown = true;
    
    // 停止处理
    this.stopProcessing();
    
    // 清理批处理定时器
    for (const [eventType, batch] of this.pendingBatches.entries()) {
      if (batch.timer) {
        clearTimeout(batch.timer);
      }
      // 处理剩余批事件
      if (batch.events.length > 0) {
        this.processBatch(eventType);
      }
    }
    
    // 等待处理中的事件完成
    return new Promise((resolve) => {
      const checkProcessing = () => {
        if (this.processingQueue.size === 0) {
          console.log('✅ 事件总线清理完成');
          resolve();
        } else {
          setTimeout(checkProcessing, 100);
        }
      };
      checkProcessing();
    });
  }
}

/**
 * 全局事件总线单例
 */
let globalEventBus = null;

/**
 * 获取全局事件总线实例
 * @param {Object} options - 配置选项
 * @returns {EventBus} 事件总线实例
 */
export function getGlobalEventBus(options = {}) {
  if (!globalEventBus) {
    globalEventBus = new EventBus(options);
  }
  return globalEventBus;
}

/**
 * 销毁全局事件总线
 */
export async function destroyGlobalEventBus() {
  if (globalEventBus) {
    await globalEventBus.cleanup();
    globalEventBus = null;
  }
}

export default EventBus;