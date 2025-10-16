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

const gameEngine = new GameEngine();

console.log('开始调用 GameEngine.initialize()...');

gameEngine.initialize()
  .then(() => {
    console.log('GameEngine 初始化完成');
    console.log(`角色数量: ${gameEngine.characters.size}`);
    console.log(`家族数量: ${gameEngine.familySystem?.families?.size ?? 0}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('GameEngine 初始化失败:', error);
    process.exit(1);
  });
