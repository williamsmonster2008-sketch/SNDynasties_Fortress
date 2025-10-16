import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { GameEngine } from '../game_engine.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');

function bufferToArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

globalThis.fetch = async (resource) => {
  try {
    if (typeof resource !== 'string' || resource.startsWith('http')) {
      throw new Error(`不支持的资源请求: ${resource}`);
    }

    const resolvedPath = path.resolve(projectRoot, resource);
    const fileData = await fs.readFile(resolvedPath);

    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => bufferToArrayBuffer(fileData),
      text: async () => fileData.toString('utf-8')
    };
  } catch (error) {
    return {
      ok: false,
      status: 404,
      statusText: error.message,
      arrayBuffer: async () => new ArrayBuffer(0),
      text: async () => ''
    };
  }
};

if (!globalThis.window) {
  globalThis.window = globalThis;
}

if (!globalThis.performance) {
  globalThis.performance = {
    now: () => Date.now()
  };
}

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

// 静默初始化阶段的详细日志
console.log = () => {};
console.warn = (...args) => {
  if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('❌')) {
    originalConsole.warn(...args);
  }
};

const gameEngine = new GameEngine();

await gameEngine.initialize();

// 恢复标准输出
console.log = originalConsole.log;
console.warn = originalConsole.warn;
console.error = originalConsole.error;

const families = Array.from(gameEngine.familySystem?.families?.entries?.() || []);
const totalFamilies = families.length;
const allMembers = families.flatMap(([, family]) => family.members || []);

function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function summarizeFamily([familyName, family], index) {
  const members = family.members ? [...family.members] : [];
  const living = members.filter(m => m.vitalStatus === 'living');
  const deceased = members.filter(m => m.vitalStatus === 'deceased');
  const ages = living.map(m => safeNumber(m.age, NaN)).filter(Number.isFinite);
  const ageMin = ages.length ? Math.min(...ages) : null;
  const ageMax = ages.length ? Math.max(...ages) : null;

  const generationCounts = new Map();
  const nativeCount = { native: 0, external: 0 };
  const mismatchedFamilyName = [];
  const invalidAges = [];

  members.forEach(member => {
    const generationKey = member.generation ?? 'unknown';
    generationCounts.set(generationKey, (generationCounts.get(generationKey) || 0) + 1);

    if (member.isNative === false) {
      nativeCount.external += 1;
    } else {
      nativeCount.native += 1;
    }

    if (member.familyName && member.familyName !== familyName) {
      mismatchedFamilyName.push({
        id: member.characterId || member.id,
        name: member.name,
        recordedFamily: member.familyName,
        originalFamily: member.originalFamily
      });
    }

    if (!Number.isFinite(member.age)) {
      invalidAges.push({
        id: member.characterId || member.id,
        name: member.name,
        age: member.age,
        generation: member.generation
      });
    }
  });

  const sampleMembers = members
    .slice(0, 5)
    .map(member => ({
      id: member.characterId || member.id,
      name: member.name,
      age: member.age,
      generation: member.generation,
      role: member.familyRole || member.role,
      isNative: member.isNative !== false,
      originalFamily: member.originalFamily
    }));

  return {
    familyName,
    index: index + 1,
    totalMembers: members.length,
    living: living.length,
    deceased: deceased.length,
    ageRange: ageMin !== null ? `${ageMin} - ${ageMax}` : '无存活成员年龄数据',
    generationCounts: Object.fromEntries(generationCounts),
    nativeCount,
    mismatchedFamilyName,
    invalidAges,
    sampleMembers
  };
}

const summaries = families.map(summarizeFamily);

console.log(`家族总数: ${totalFamilies}`);
console.log(`角色总数: ${allMembers.length}`);
console.log('');

summaries.forEach(summary => {
  console.log(`家族 #${summary.index}: ${summary.familyName}`);
  console.log(`  成员总数: ${summary.totalMembers} (存活: ${summary.living}, 已故/分离: ${summary.deceased})`);
  console.log(`  年龄范围: ${summary.ageRange}`);
  console.log(`  世代分布:`, summary.generationCounts);
  console.log(`  原籍统计: 本族 ${summary.nativeCount.native} 人 / 外来 ${summary.nativeCount.external} 人`);

  if (summary.mismatchedFamilyName.length > 0) {
    console.log('  ⚠️ 姓氏/家族名不匹配成员:');
    summary.mismatchedFamilyName.forEach(member => {
      console.log(`    - ${member.name || member.id} (${member.id}) recorded: ${member.recordedFamily}, original: ${member.originalFamily}`);
    });
  }

  if (summary.invalidAges.length > 0) {
    console.log('  ⚠️ 年龄异常成员:');
    summary.invalidAges.forEach(member => {
      console.log(`    - ${member.name || member.id} (${member.id}) age: ${member.age}, generation: ${member.generation}`);
    });
  }

  console.log('  成员示例:');
  summary.sampleMembers.forEach(member => {
    console.log(
      `    - ${member.name || member.id} (${member.id}) | 年龄: ${member.age} | 世代: ${member.generation} | 角色: ${member.role || '未标注'} | 原籍: ${member.originalFamily || '未知'} | ${member.isNative ? '本族' : '外来'}`
    );
  });

  console.log('');
});

process.exit(0);
