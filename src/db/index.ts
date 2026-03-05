/**
 * 数据库模块统一导出
 */

// 核心数据库操作
export {
  initDB,
  getDB,
  closeDB,
  saveDBToFile,
  setFileHandle,
  isMemoryMode,
  isIndexedDBMode,
  type Database,
  type InitDBOptions
} from './core'

// Schema 和迁移
export { TABLES, INDEXES } from './schema'
export { runMigrations, migrations, type Migration } from './migrations'

// 模型操作
export {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  getRoomsByRoomId
} from './models/rooms'

export {
  createScene,
  getAllScenes,
  getScenesByRoomId,
  getSceneById,
  updateScene,
  deleteScene
} from './models/scenes'

export {
  createCharacter,
  getAllCharacters,
  getCharactersByRoomId,
  getCharacterById,
  updateCharacter,
  updateCharacterMemory,
  deleteCharacter
} from './models/characters'

export {
  createPerformance,
  createPerformances,
  getAllPerformances,
  getPerformancesBySceneId,
  getPerformancesByRound,
  getPerformanceById,
  getMaxRound,
  deletePerformance,
  deletePerformancesBySceneId
} from './models/performances'

export {
  getSetting,
  setSetting,
  getAllSettings,
  deleteSetting
} from './models/settings'

export {
  createProviderConfig,
  getAllProviderConfigs,
  getActiveProviderConfig,
  getProviderConfigById,
  updateProviderConfig,
  setActiveProvider,
  deleteProviderConfig
} from './models/providers'
