/**
 * 数据库迁移文件
 */

import type { Database } from "./index";
import { TABLES, INDEXES } from "./schema";

export interface Migration {
  version: number;
  description: string;
  up: (db: Database) => void;
  down?: (db: Database) => void;
}

/**
 * 初始迁移 - 创建所有表
 */
export const migration001: Migration = {
  version: 1,
  description: "初始化数据库表结构",
  up: (db: Database) => {
    // 创建所有表
    Object.values(TABLES).forEach((sql) => {
      db.run(sql);
    });

    // 创建所有索引
    Object.values(INDEXES).forEach((sql) => {
      db.run(sql);
    });

    // 初始化默认设置 - 使用 INSERT OR REPLACE 确保值被正确设置
    db.run(
      `INSERT OR REPLACE INTO system_settings (key, value) VALUES ('db_version', '1')`,
    );
    db.run(
      `INSERT OR REPLACE INTO system_settings (key, value) VALUES ('app_version', '0.0.1')`,
    );
    db.run(
      `INSERT OR REPLACE INTO system_settings (key, value) VALUES ('theme', 'dark')`,
    );
  },
  down: (db: Database) => {
    // 删除所有表（按相反顺序）
    db.run("DROP TABLE IF EXISTS provider_configs");
    db.run("DROP TABLE IF EXISTS system_settings");
    db.run("DROP TABLE IF EXISTS performances");
    db.run("DROP TABLE IF EXISTS scene_characters");
    db.run("DROP TABLE IF EXISTS characters");
    db.run("DROP TABLE IF EXISTS scenes");
    db.run("DROP TABLE IF EXISTS rooms");
  },
};

/**
 * 迁移 2 - 添加 performances.primary_type 和 scenes.round_plan 字段
 */
export const migration002: Migration = {
  version: 2,
  description: "添加 performances.primary_type 和 scenes.round_plan 字段",
  up: (db: Database) => {
    // 检查 performances 表是否有 primary_type 字段
    try {
      const checkStmt = db.prepare("PRAGMA table_info(performances)");
      let hasPrimaryType = false;
      while (checkStmt.step()) {
        const row = checkStmt.get() as any[];
        if (row[1] === "primary_type") {
          hasPrimaryType = true;
          break;
        }
      }
      checkStmt.free();

      if (!hasPrimaryType) {
        db.run(
          "ALTER TABLE performances ADD COLUMN primary_type TEXT NOT NULL DEFAULT 'dialogue'",
        );
        db.run(
          "ALTER TABLE performances ADD COLUMN type TEXT DEFAULT 'dialogue'",
        );
      }
    } catch (e) {
      console.error("检查 performances 表结构失败:", e);
    }

    // 检查 scenes 表是否有 round_plan 字段
    try {
      const checkStmt = db.prepare("PRAGMA table_info(scenes)");
      let hasRoundPlan = false;
      while (checkStmt.step()) {
        const row = checkStmt.get() as any[];
        if (row[1] === "round_plan") {
          hasRoundPlan = true;
          break;
        }
      }
      checkStmt.free();

      if (!hasRoundPlan) {
        db.run("ALTER TABLE scenes ADD COLUMN round_plan TEXT");
      }
    } catch (e) {
      console.error("检查 scenes 表结构失败:", e);
    }

    // 更新版本号
    db.run(
      `INSERT OR REPLACE INTO system_settings (key, value) VALUES ('db_version', '2')`,
    );
  },
  down: (db: Database) => {
    // SQLite 不支持直接删除列，这里不做处理
    console.log("迁移 v2 无法回滚");
  },
};

/**
 * 迁移列表
 */
export const migrations: Migration[] = [migration001, migration002];

/**
 * 运行迁移
 */
export function runMigrations(db: Database): void {
  // 获取当前版本
  let currentVersion = 0;
  try {
    const stmt = db.prepare(
      "SELECT value FROM system_settings WHERE key = 'db_version'",
    );
    if (stmt.step()) {
      const row = stmt.get() as any[];
      const val = row[0] as string;
      if (val !== null && val !== undefined) {
        currentVersion = parseInt(val, 10) || 0;
      }
    }
    stmt.free();
  } catch {
    // 表不存在，从 0 开始
    currentVersion = 0;
  }

  // 运行未执行的迁移
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`运行迁移 v${migration.version}: ${migration.description}`);
      migration.up(db);

      // 更新版本号 - 使用参数化查询
      const stmt = db.prepare(
        "INSERT OR REPLACE INTO system_settings (key, value) VALUES ('db_version', ?)",
      );
      stmt.run([String(migration.version)]);
      stmt.free();
    }
  }

  console.log("数据库迁移完成");
}
