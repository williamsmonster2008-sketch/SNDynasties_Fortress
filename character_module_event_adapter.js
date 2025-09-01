/**
 * character_module_event_adapter.js - 角色模块事件适配器
 * 
 * 功能：为现有的 character_module.js 添加事件支持
 * 原则：不破坏现有API，只添加事件发射功能
 * 
 * 使用方法：
 * 1. 导入此适配器
 * 2. 调用 addEventSupportToCharacter() 为角色添加事件支持
 * 3. 现有代码无需修改，自动获得事件通知能力
 */

/**
 * 为角色对象添加事件支持
 * @param {Character} character - 角色对象
 * @param {EventBus} eventBus - 事件总线
 */
export function addEventSupportToCharacter(character, eventBus) {
  if (!character || !eventBus) {
    console.warn('角色或事件总线不存在，跳过事件支持添加');
    return;
  }
  
  // 避免重复添加
  if (character._eventSupported) {
    return;
  }
  
  character._eventBus = eventBus;
  character._eventSupported = true;
  character._originalMethods = {};
  
  // 包装现有方法，添加事件发射
  wrapCharacterMethods(character);
  
  console.log(`📡 角色 ${character.name} 已添加事件支持`);
}

/**
 * 包装角色方法，添加事件发射
 */
function wrapCharacterMethods(character) {
  const eventBus = character._eventBus;
  
  // 1. 包装 updateState 方法
  if (character.updateState && typeof character.updateState === 'function') {
    character._originalMethods.updateState = character.updateState;
    
    character.updateState = function(newState) {
      const oldState = this.getState ? this.getState() : {};
      
      // 调用原方法
      const result = character._originalMethods.updateState.call(this, newState);
      
      // 发射状态变更事件
      eventBus.emit('characterStateChanged', {
        characterId: this.id,
        characterName: this.name,
        oldState: oldState,
        newState: this.getState ? this.getState() : {},
        timestamp: Date.now()
      }, {
        priority: 1, // HIGH priority
        source: 'character_module',
        category: 'character'
      });
      
      return result;
    };
  }
  
  // 2. 包装生理状态更新
  if (character.physicalState && character.physicalState.update) {
    character.physicalState._originalUpdate = character.physicalState.update;
    
    character.physicalState.update = function(deltaTime, context) {
      // 保存对父角色的引用
      this.parentCharacter = character;
      const oldHealth = this.health;
      const oldEnergy = this.energy;
      
      // 调用原方法
      const result = character.physicalState._originalUpdate.call(this, deltaTime, context);
      
      // 检查重要状态变化
      const healthChange = Math.abs(this.health - oldHealth);
      const energyChange = Math.abs(this.energy - oldEnergy);
      
      if (healthChange > 5 || energyChange > 10) {
        // 通过闭包获取正确的角色引用，避免使用可能过期的character变量
        const parentCharacter = this.parentCharacter || character;
        
        eventBus.emit('characterPhysicalStateChanged', {
          characterId: parentCharacter?.id || 'unknown',
          characterName: parentCharacter?.name || 'unnamed',
          healthChange: this.health - oldHealth,
          energyChange: this.energy - oldEnergy,
          currentHealth: this.health,
          currentEnergy: this.energy,
          timestamp: Date.now()
        }, {
          priority: healthChange > 20 ? 0 : 1,
          source: 'character_physical_state'
        });
      }
      
      return result;
    };
  }
  
  // 3. 包装情绪状态更新
  if (character.emotionalState && character.emotionalState.update) {
    character.emotionalState._originalUpdate = character.emotionalState.update;
    
    character.emotionalState.update = function(deltaTime, context) {
      const oldMood = this.getDominantEmotion ? this.getDominantEmotion() : 'unknown';
      
      // 调用原方法
      const result = character.emotionalState._originalUpdate.call(this, deltaTime, context);
      
      const newMood = this.getDominantEmotion ? this.getDominantEmotion() : 'unknown';
      
      // 情绪变化事件
      if (oldMood !== newMood) {
        eventBus.emit('characterMoodChanged', {
          characterId: character.id,
          characterName: character.name,
          oldMood: oldMood,
          newMood: newMood,
          happiness: this.happiness,
          sadness: this.sadness,
          anger: this.anger,
          timestamp: Date.now()
        }, {
          priority: 2, // NORMAL priority
          source: 'character_emotional_state'
        });
      }
      
      return result;
    };
  }
  
  // 4. 包装行为相关方法
  wrapCharacterBehaviorMethods(character, eventBus);
  
  // 5. 包装生命事件方法
  wrapCharacterLifeEventMethods(character, eventBus);
}

/**
 * 包装角色行为相关方法
 */
function wrapCharacterBehaviorMethods(character, eventBus) {
  // 包装 setCurrentActivity 方法
  if (character.setCurrentActivity && typeof character.setCurrentActivity === 'function') {
    character._originalMethods.setCurrentActivity = character.setCurrentActivity;
    
    character.setCurrentActivity = function(activity) {
      const oldActivity = this.currentActivity;
      
      // 调用原方法
      const result = character._originalMethods.setCurrentActivity.call(this, activity);
      
      // 发射活动变更事件
      if (oldActivity !== activity) {
        eventBus.emit('characterActivityChanged', {
          characterId: this.id,
          characterName: this.name,
          oldActivity: oldActivity,
          newActivity: activity,
          location: this.currentLocation,
          timestamp: Date.now()
        }, {
          priority: 2, // NORMAL priority
          source: 'character_behavior'
        });
      }
      
      return result;
    };
  }
  
  // 包装位置变更
  if (character.setCurrentLocation && typeof character.setCurrentLocation === 'function') {
    character._originalMethods.setCurrentLocation = character.setCurrentLocation;
    
    character.setCurrentLocation = function(location) {
      const oldLocation = this.currentLocation;
      
      // 调用原方法
      const result = character._originalMethods.setCurrentLocation.call(this, location);
      
      // 发射位置变更事件
      if (oldLocation !== location) {
        eventBus.emit('characterLocationChanged', {
          characterId: this.id,
          characterName: this.name,
          oldLocation: oldLocation,
          newLocation: location,
          timestamp: Date.now()
        }, {
          priority: 2, // NORMAL priority
          source: 'character_movement'
        });
      }
      
      return result;
    };
  }
}

/**
 * 包装角色生命事件方法
 */
function wrapCharacterLifeEventMethods(character, eventBus) {
  // 如果有技能系统，包装技能变化
  if (character.skillSystem) {
    addEventSupportToSkillSystem(character.skillSystem, eventBus, character);
  }
  
  // 如果有德行系统，包装德行变化
  if (character.virtueSystem) {
   addEventSupportToVirtueSystem(character.virtueSystem, eventBus, character);
  }
  
  // 包装生命事件添加
  if (character.addLifeEvent && typeof character.addLifeEvent === 'function') {
    character._originalMethods.addLifeEvent = character.addLifeEvent;
    
    character.addLifeEvent = function(event) {
      // 调用原方法
      const result = character._originalMethods.addLifeEvent.call(this, event);
      
      // 发射生命事件
      eventBus.emit('characterLifeEvent', {
        characterId: this.id,
        characterName: this.name,
        lifeEvent: event,
        timestamp: Date.now()
      }, {
        priority: event.importance > 0.7 ? 1 : 2, // HIGH if important
        source: 'character_life_event'
      });
      
      return result;
    };
  }
}

/**
 * 为技能系统添加事件支持
 */
function addEventSupportToSkillSystem(skillSystem, eventBus, character) {
  if (!skillSystem.gainExperience || skillSystem._eventSupported) return;
  
  skillSystem._eventSupported = true;
  skillSystem._originalGainExperience = skillSystem.gainExperience;
  
  skillSystem.gainExperience = function(skillName, amount) {
    const oldLevel = this.getSkillLevel(skillName);
    
    // 调用原方法
    const result = skillSystem._originalGainExperience.call(this, skillName, amount);
    
    const newLevel = this.getSkillLevel(skillName);
    
    // 技能等级提升事件
    if (newLevel > oldLevel) {
      const levelUp = Math.floor(newLevel / 10) > Math.floor(oldLevel / 10);
      
      eventBus.emit('characterSkillChanged', {
        characterId: character.id,
        characterName: character.name,
        skillName: skillName,
        oldLevel: oldLevel,
        newLevel: newLevel,
        experienceGained: amount,
        levelUp: levelUp,
        timestamp: Date.now()
      }, {
        priority: levelUp ? 1 : 2, // HIGH if level up
        source: 'character_skill_system'
      });
    }
    
    return result;
  };
}

/**
 * 为德行系统添加事件支持
 */
function addEventSupportToVirtueSystem(virtueSystem, eventBus, character) {
  if (!virtueSystem.adjustTrait || virtueSystem._eventSupported) return;
  
  virtueSystem._eventSupported = true;
  virtueSystem._originalAdjustTrait = virtueSystem.adjustTrait;
  
  virtueSystem.adjustTrait = function(traitName, change, reason) {
    const oldValue = this.getTraitValue ? this.getTraitValue(traitName) : 0;
    
    // 调用原方法
    const result = virtueSystem._originalAdjustTrait.call(this, traitName, change, reason);
    
    const newValue = this.getTraitValue ? this.getTraitValue(traitName) : 0;
    
    // 德行显著变化事件
    if (Math.abs(change) > 5) {
      eventBus.emit('characterVirtueChanged', {
        characterId: character.id,
        characterName: character.name,
        traitName: traitName,
        oldValue: oldValue,
        newValue: newValue,
        change: change,
        reason: reason,
        timestamp: Date.now()
      }, {
        priority: Math.abs(change) > 15 ? 1 : 2,
        source: 'character_virtue_system'
      });
    }
    
    return result;
  };
}

/**
 * 批量为角色数组添加事件支持
 * @param {Array|Map} characters - 角色数组或Map
 * @param {EventBus} eventBus - 事件总线
 */
export function addEventSupportToCharacters(characters, eventBus) {
  console.log('📡 开始为角色批量添加事件支持...');
  
  let count = 0;
  
  if (characters instanceof Map) {
    characters.forEach(character => {
      addEventSupportToCharacter(character, eventBus);
      count++;
    });
  } else if (Array.isArray(characters)) {
    characters.forEach(character => {
      addEventSupportToCharacter(character, eventBus);
      count++;
    });
  }
  
  console.log(`✅ 已为 ${count} 个角色添加事件支持`);
}

/**
 * 移除角色的事件支持
 * @param {Character} character - 角色对象
 */
export function removeEventSupportFromCharacter(character) {
  if (!character._eventSupported) return;
  
  // 恢复原始方法
  Object.entries(character._originalMethods || {}).forEach(([methodName, originalMethod]) => {
    character[methodName] = originalMethod;
  });
  
  // 恢复子系统方法
  if (character.physicalState && character.physicalState._originalUpdate) {
    character.physicalState.update = character.physicalState._originalUpdate;
  }
  
  if (character.emotionalState && character.emotionalState._originalUpdate) {
    character.emotionalState.update = character.emotionalState._originalUpdate;
  }
  
  if (character.skillSystem && character.skillSystem._originalGainExperience) {
    character.skillSystem.gainExperience = character.skillSystem._originalGainExperience;
  }
  
  if (character.virtueSystem && character.virtueSystem._originalAdjustTrait) {
    character.virtueSystem.adjustTrait = character.virtueSystem._originalAdjustTrait;
  }
  
  // 清理事件支持标记
  delete character._eventSupported;
  delete character._eventBus;
  delete character._originalMethods;
  
  console.log(`🔌 角色 ${character.name} 的事件支持已移除`);
}

/**
 * 创建角色死亡事件
 * @param {Character} character - 角色对象
 * @param {EventBus} eventBus - 事件总线
 * @param {string} cause - 死亡原因
 */
export function emitCharacterDeathEvent(character, eventBus, cause = '自然死亡') {
  eventBus.emit('characterDied', {
    characterId: character.id,
    characterName: character.name,
    cause: cause,
    age: character.age,
    familyName: character.familyName,
    role: character.role,
    finalState: character.getState ? character.getState() : {},
    timestamp: Date.now()
  }, {
    priority: 0, // CRITICAL priority
    source: 'character_death',
    category: 'life_event'
  });
  
  console.log(`💀 角色死亡事件已发出: ${character.name} (${cause})`);
}

/**
 * 创建角色出生事件
 * @param {Character} character - 角色对象
 * @param {EventBus} eventBus - 事件总线
 * @param {Object} parents - 父母信息
 */
export function emitCharacterBirthEvent(character, eventBus, parents = {}) {
  eventBus.emit('characterBorn', {
    characterId: character.id,
    characterName: character.name,
    familyName: character.familyName,
    parents: parents,
    initialState: character.getState ? character.getState() : {},
    timestamp: Date.now()
  }, {
    priority: 1, // HIGH priority
    source: 'character_birth',
    category: 'life_event'
  });
  
  console.log(`👶 角色出生事件已发出: ${character.name}`);
}

export default {
  addEventSupportToCharacter,
  addEventSupportToCharacters,
  removeEventSupportFromCharacter,
  emitCharacterDeathEvent,
  emitCharacterBirthEvent
};