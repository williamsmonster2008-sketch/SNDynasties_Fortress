/**
 * validate_data_tables.js - Phase 1 数据表校验CLI工具
 * 
 * 用途: 独立运行的数据表校验脚本，在不启动游戏的情况下验证数据文件
 * 使用: node validate_data_tables.js
 * 
 * 校验内容:
 * - locations.json
 * - behavior_patterns.json  
 * - interaction_patterns.json
 */

// ============ 数据校验器类 ============
class DataValidator {
  constructor() {
    this.validators = new Map();
    this.setupValidators();
  }

  setupValidators() {
    // 地点数据校验器
    this.validators.set('location', {
      required: ['id', 'name', 'category', 'capacity', 'allowedActions'],
      types: {
        id: 'string',
        name: 'string',
        category: 'string',
        capacity: 'object',
        allowedActions: 'array',
        movementCost: 'number',
        isPublic: 'boolean'
      },
      constraints: {
        id: (value) => /^[a-z_0-9]+$/.test(value),
        name: (value) => value.length > 0 && value.length <= 20,
        category: (value) => ['residence', 'production', 'social', 'religious', 'commercial'].includes(value),
        movementCost: (value) => value >= 1 && value <= 10,
        allowedActions: (arr) => Array.isArray(arr) && arr.length > 0
      }
    });

    // 行为模式校验器
    this.validators.set('behavior', {
      required: ['id', 'name', 'category', 'requirements', 'effects', 'duration', 'validLocations'],
      types: {
        id: 'string',
        name: 'string',
        category: 'string',
        requirements: 'object',
        effects: 'object',
        duration: 'object',
        validLocations: 'array',
        priority: 'number',
        canBeInterrupted: 'boolean'
      },
      constraints: {
        id: (value) => /^[a-z_]+$/.test(value),
        name: (value) => value.length > 0 && value.length <= 20,
        category: (value) => ['physiological', 'production', 'social', 'religious', 'entertainment', 'crime'].includes(value),
        priority: (value) => value >= 0 && value <= 100,
        validLocations: (arr) => Array.isArray(arr) && arr.length > 0
      }
    });

    // 互动模式校验器
    this.validators.set('interaction', {
      required: ['id', 'name', 'category', 'participantRequirements', 'phases', 'outcomes', 'duration'],
      types: {
        id: 'string',
        name: 'string',
        category: 'string',
        participantRequirements: 'object',
        phases: 'array',
        outcomes: 'object',
        duration: 'number'
      },
      constraints: {
        id: (value) => /^[a-z_]+$/.test(value),
        name: (value) => value.length > 0,
        category: (value) => ['social_basic', 'cooperation', 'conflict', 'social_entertainment', 'romance'].includes(value),
        duration: (value) => value > 0 && value <= 1440,
        phases: (arr) => Array.isArray(arr) && arr.length > 0
      }
    });
  }

  validate(dataType, data) {
    const validator = this.validators.get(dataType);
    if (!validator) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const errors = [];
    const warnings = [];

    // 检查必需字段
    for (const field of validator.required || []) {
      if (data[field] === undefined || data[field] === null) {
        errors.push({
          field,
          type: 'missing_required',
          message: `缺少必需字段: ${field}`
        });
      }
    }

    // 检查数据类型
    for (const [field, expectedType] of Object.entries(validator.types || {})) {
      if (data[field] !== undefined) {
        let actualType = typeof data[field];
        
        // 特殊处理array类型
        if (expectedType === 'array') {
          if (!Array.isArray(data[field])) {
            errors.push({
              field,
              type: 'type_mismatch',
              message: `字段 ${field} 类型错误，期望 array，实际 ${actualType}`
            });
          }
        } else if (actualType !== expectedType && expectedType !== 'object') {
          errors.push({
            field,
            type: 'type_mismatch',
            message: `字段 ${field} 类型错误，期望 ${expectedType}，实际 ${actualType}`
          });
        }
      }
    }

    // 检查约束条件
    for (const [field, constraint] of Object.entries(validator.constraints || {})) {
      if (data[field] !== undefined) {
        try {
          if (!constraint(data[field])) {
            errors.push({
              field,
              type: 'constraint_violation',
              message: `字段 ${field} 不满足约束条件`
            });
          }
        } catch (error) {
          warnings.push({
            field,
            type: 'constraint_check_failed',
            message: `字段 ${field} 约束检查失败: ${error.message}`
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// ============ 文件加载器 ============
async function loadJSONFile(filePath) {
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`加载文件失败: ${filePath}\n原因: ${error.message}`);
  }
}

// ============ 主校验逻辑 ============
async function validateTable(filePath, dataKey, validatorType, validator) {
  console.log(`\n🔍 校验 ${filePath}...`);
  
  try {
    const data = await loadJSONFile(filePath);
    
    if (!data[dataKey] || !Array.isArray(data[dataKey])) {
      throw new Error(`文件格式错误: 找不到 ${dataKey} 数组字段`);
    }
    
    const items = data[dataKey];
    let validCount = 0;
    let errorCount = 0;
    const allErrors = [];
    const allWarnings = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const validation = validator.validate(validatorType, item);
      
      if (!validation.isValid) {
        errorCount++;
        allErrors.push({
          index: i,
          id: item.id || `索引${i}`,
          errors: validation.errors
        });
      } else {
        validCount++;
      }
      
      if (validation.warnings.length > 0) {
        allWarnings.push({
          index: i,
          id: item.id || `索引${i}`,
          warnings: validation.warnings
        });
      }
    }
    
    // 输出结果
    if (errorCount === 0) {
      console.log(`✅ 校验通过! (${validCount}/${items.length}条)`);
    } else {
      console.error(`❌ 校验失败! 有效: ${validCount}条, 错误: ${errorCount}条`);
      
      // 显示前3个错误详情
      console.error(`\n错误详情:`);
      allErrors.slice(0, 3).forEach(({ id, errors }) => {
        console.error(`  ${id}:`);
        errors.forEach(error => {
          console.error(`    - ${error.message}`);
        });
      });
      
      if (allErrors.length > 3) {
        console.error(`  ... 还有 ${allErrors.length - 3} 个错误\n`);
      }
    }
    
    // 输出警告
    if (allWarnings.length > 0) {
      console.warn(`⚠️  ${allWarnings.length} 个警告`);
    }
    
    return {
      success: errorCount === 0,
      validCount,
      errorCount,
      warningCount: allWarnings.length,
      errors: allErrors,
      warnings: allWarnings
    };
    
  } catch (error) {
    console.error(`❌ ${error.message}\n`);
    return {
      success: false,
      validCount: 0,
      errorCount: 1,
      warningCount: 0,
      errors: [{ message: error.message }],
      warnings: []
    };
  }
}

// ============ 主函数 ============
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('   南北朝坞堡模拟器 - Phase 1 数据表校验工具');
  console.log('═══════════════════════════════════════════════');
  
  const validator = new DataValidator();
  const results = [];
  
  // 校验 locations.json
  const locationsResult = await validateTable(
    'data_tables/locations.json',
    'locations',
    'location',
    validator
  );
  results.push({ name: 'locations.json', ...locationsResult });
  
  // 校验 behavior_patterns.json
  const behaviorsResult = await validateTable(
    'data_tables/behavior_patterns.json',
    'behaviors',
    'behavior',
    validator
  );
  results.push({ name: 'behavior_patterns.json', ...behaviorsResult });
  
  // 校验 interaction_patterns.json
  const interactionsResult = await validateTable(
    'data_tables/interaction_patterns.json',
    'interactions',
    'interaction',
    validator
  );
  results.push({ name: 'interaction_patterns.json', ...interactionsResult });
  
  // 汇总结果
  console.log('\n═══════════════════════════════════════════════');
  console.log('                   校验汇总');
  console.log('═══════════════════════════════════════════════');
  
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.validCount}条有效, ${result.errorCount}条错误, ${result.warningCount}条警告`);
  });
  
  console.log('───────────────────────────────────────────────');
  
  if (totalErrors === 0) {
    console.log('🎉 所有数据表校验通过!');
    console.log('═══════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.error(`❌ 发现 ${totalErrors} 个错误, ${totalWarnings} 个警告`);
    console.log('═══════════════════════════════════════════════\n');
    process.exit(1);
  }
}

// 执行
main().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
