/**
 * 数据库表结构定义
 */

export const TABLES = {
  // 房间表
  rooms: `
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      setting TEXT NOT NULL,
      plot_summary TEXT,
      worldview TEXT,
      tone TEXT,
      current_performance_summary TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,

  // 场景表
  scenes: `
    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      goal TEXT,
      setup TEXT,
      summary TEXT,
      max_rounds INTEGER DEFAULT 10,
      round_plan TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )
  `,

  // 角色表
  characters: `
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      name TEXT NOT NULL,
      background TEXT,
      dialogue_style TEXT,
      memory TEXT,
      is_user INTEGER DEFAULT 0,
      type TEXT DEFAULT 'ai',
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )
  `,

  // 场景角色关联表
  scene_characters: `
    CREATE TABLE IF NOT EXISTS scene_characters (
      id TEXT PRIMARY KEY,
      scene_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    )
  `,

  // 演出记录表
  performances: `
    CREATE TABLE IF NOT EXISTS performances (
      id TEXT PRIMARY KEY,
      scene_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      content TEXT NOT NULL,
      primary_type TEXT NOT NULL DEFAULT 'dialogue',
      type TEXT DEFAULT 'dialogue',
      round INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    )
  `,

  // 系统设置表
  system_settings: `
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `,

  // AI Provider 配置表
  provider_configs: `
    CREATE TABLE IF NOT EXISTS provider_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      api_key TEXT NOT NULL,
      base_url TEXT,
      model TEXT,
      custom_models TEXT,
      is_active INTEGER DEFAULT 0,
      supports_thinking INTEGER DEFAULT 0,
      thinking_param_key TEXT,
      thinking_param_type TEXT,
      thinking_param_default TEXT
    )
  `,

  // 场景演出设置表（存储每个场景的模型选择）
  scene_performance_settings: `
    CREATE TABLE IF NOT EXISTS scene_performance_settings (
      scene_id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      model TEXT NOT NULL,
      FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
    )
  `,
};

// 索引定义
export const INDEXES = {
  scenes_room_id:
    "CREATE INDEX IF NOT EXISTS idx_scenes_room_id ON scenes(room_id)",
  characters_room_id:
    "CREATE INDEX IF NOT EXISTS idx_characters_room_id ON characters(room_id)",
  scene_characters_scene_id:
    "CREATE INDEX IF NOT EXISTS idx_scene_characters_scene_id ON scene_characters(scene_id)",
  scene_characters_character_id:
    "CREATE INDEX IF NOT EXISTS idx_scene_characters_character_id ON scene_characters(character_id)",
  performances_scene_id:
    "CREATE INDEX IF NOT EXISTS idx_performances_scene_id ON performances(scene_id)",
  performances_character_id:
    "CREATE INDEX IF NOT EXISTS idx_performances_character_id ON performances(character_id)",
};
