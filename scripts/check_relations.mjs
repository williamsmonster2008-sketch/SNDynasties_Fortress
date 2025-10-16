import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { GameEngine } from '../game_engine.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');

function bufferToArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteLength);
}

globalThis.fetch = async (resource) => {
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

console.log = () => {};
console.warn = () => {};
console.error = () => {};

const engine = new GameEngine();
await engine.initialize();

console.log = originalConsole.log;
console.warn = originalConsole.warn;
console.error = originalConsole.error;

const familyEntries = Array.from(engine.familySystem.families.entries());

function summarizeGenerations(entries) {
  return entries.map(([name, family]) => {
    const counts = new Map();
    const members = family.members || [];

    members.forEach(member => {
      const generation = member.generation ?? 'unknown';
      counts.set(generation, (counts.get(generation) || 0) + 1);
    });

    return {
      name,
      memberCount: members.length,
      generationCounts: Object.fromEntries([...counts.entries()].sort((a, b) => a[0] - b[0]))
    };
  });
}

function pickFirst(arr) {
  return arr && arr.length > 0 ? arr[0] : null;
}

function checkRelations([familyName, family]) {
  const members = family.members || [];
  const grouped = new Map();

  members.forEach(member => {
    const generation = member.generation ?? 'unknown';
    if (!grouped.has(generation)) {
      grouped.set(generation, []);
    }
    grouped.get(generation).push(member);
  });

  const g1 = grouped.get(1) || [];
  const g2 = grouped.get(2) || [];
  const g3 = grouped.get(3) || [];
  const g4 = grouped.get(4) || [];
  const g5 = grouped.get(5) || [];

  const samples = [];

  const ancestor = pickFirst(g1);
  const parent = pickFirst(g2);
  const grandchild = pickFirst(g3);
  const greatGrandchild = pickFirst(g4);
  const youngest = pickFirst(g5);

  if (ancestor && parent) {
    samples.push({
      from: ancestor.name,
      to: parent.name,
      relation: engine.familySystem.getKinship(familyName, ancestor.characterId, parent.characterId)
    });
  }

  if (parent && grandchild) {
    samples.push({
      from: parent.name,
      to: grandchild.name,
      relation: engine.familySystem.getKinship(familyName, parent.characterId, grandchild.characterId)
    });
  }

  if (grandchild && greatGrandchild) {
    samples.push({
      from: grandchild.name,
      to: greatGrandchild.name,
      relation: engine.familySystem.getKinship(familyName, grandchild.characterId, greatGrandchild.characterId)
    });
  }

  if (greatGrandchild && youngest) {
    samples.push({
      from: greatGrandchild.name,
      to: youngest.name,
      relation: engine.familySystem.getKinship(familyName, greatGrandchild.characterId, youngest.characterId)
    });
  }

  return {
    familyName,
    livingMembers: members.filter(m => m.vitalStatus === 'living').length,
    generationSample: {
      g1: g1.length,
      g2: g2.length,
      g3: g3.length,
      g4: g4.length,
      g5: g5.length
    },
    relations: samples
  };
}

const generationSummaries = summarizeGenerations(familyEntries);
const relationChecks = familyEntries.slice(0, 3).map(checkRelations);

console.log('世代统计概览:');
generationSummaries.forEach(summary => {
  console.log(`- ${summary.name}: 总成员 ${summary.memberCount}，世代分布 ${JSON.stringify(summary.generationCounts)}`);
});

console.log('\n血缘关系抽查:');
relationChecks.forEach(check => {
  console.log(`家族 ${check.familyName}: 存活成员 ${check.livingMembers}，世代样本 ${JSON.stringify(check.generationSample)}`);
  if (check.relations.length === 0) {
    console.log('  (缺少可用样本)');
    return;
  }
  check.relations.forEach(({ from, to, relation }) => {
    console.log(`  ${from} → ${to}: ${relation ? relation.title : '未找到关系'}`);
  });
});

process.exit(0);
