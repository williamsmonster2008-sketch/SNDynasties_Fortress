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
    throw new Error('不支持的资源请求: ' + resource);
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

const gameEngine = new GameEngine();
await gameEngine.initialize();

const target = new Set(['郑诗韵', '郑淑贤', '卫文姬', '卫秀芝', '宇文建章', '宇文建业', '宇文建功']);

const formatName = (name) => typeof name === 'string' ? name.replace(/_\d+$/, '') : name;

const output = [];
for (const [id, character] of gameEngine.characters) {
  if (target.has(character.name) || /^宇文建/.test(character.name)) {
    const relations = [];
    if (gameEngine.familySystem?.getAllBloodRelationsForCharacter) {
      const result = gameEngine.familySystem.getAllBloodRelationsForCharacter(character.familyName, character.characterId) || [];
      result.forEach(rel => {
        relations.push({
          title: rel.kinshipTitle,
          type: rel.type,
          targetName: formatName(rel.targetName),
          targetId: rel.targetId
        });
      });
    }

    output.push({
      id,
      characterId: character.characterId,
      name: formatName(character.name),
      rawName: character.name,
      age: character.age,
      gender: character.gender,
      familyName: character.familyName,
      generation: character.generationLevel,
      birthOrder: character.birthOrder,
      relations
    });
  }
}

console.log(JSON.stringify(output, null, 2));

process.exit(0);
