/**
 * AI Provider 配置数据表操作
 */

import { getDB, saveDBToFile } from "../core";
import type { ProviderConfig } from "@stores";

/**
 * 创建 Provider 配置
 */
export async function createProviderConfig(
  config: Omit<ProviderConfig, "id">,
): Promise<ProviderConfig> {
  const db = getDB();
  const id = crypto.randomUUID();

  const stmt = db.prepare(
    `INSERT INTO provider_configs (id, name, type, api_key, base_url, model, custom_models, is_active, supports_thinking, thinking_param_key, thinking_param_type, thinking_param_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run([
    id,
    config.name,
    config.type,
    config.api_key,
    config.base_url || null,
    config.model || null,
    config.custom_models ? JSON.stringify(config.custom_models) : null,
    config.is_active ? 1 : 0,
    config.supports_thinking ? 1 : 0,
    config.thinking_param_key || null,
    config.thinking_param_type || null,
    config.thinking_param_default ? JSON.stringify(config.thinking_param_default) : null,
  ]);
  stmt.free();

  await saveDBToFile();
  return getProviderConfigById(id);
}

/**
 * 获取所有 Provider 配置
 */
export async function getAllProviderConfigs(): Promise<ProviderConfig[]> {
  const db = getDB();
  const stmt = db.prepare("SELECT * FROM provider_configs");
  const results: ProviderConfig[] = [];

  while (stmt.step()) {
    const row = stmt.get() as any[];
    results.push({
      id: row[0] as string,
      name: row[1] as string,
      type: row[2] as "openai" | "gemini" | "deepseek" | "zhipu" | "groq" | "cerebras" | "mistral" | "custom",
      api_key: row[3] as string,
      base_url: row[4] as string,
      model: row[5] as string,
      is_active: (row[6] as number) === 1,
    });
  }
  stmt.free();

  return results;
}

/**
 * 获取激活的 Provider 配置
 */
export async function getActiveProviderConfig(): Promise<ProviderConfig | null> {
  const db = getDB();
  const stmt = db.prepare(
    "SELECT * FROM provider_configs WHERE is_active = 1 LIMIT 1"
  );

  if (stmt.step()) {
    const row = stmt.get() as any[];
    stmt.free();
    return {
      id: row[0] as string,
      name: row[1] as string,
      type: row[2] as "openai" | "gemini" | "deepseek" | "zhipu" | "groq" | "cerebras" | "mistral" | "custom",
      api_key: row[3] as string,
      base_url: row[4] as string,
      model: row[5] as string,
      is_active: (row[6] as number) === 1,
    };
  }
  stmt.free();
  return null;
}

/**
 * 根据 ID 获取 Provider 配置
 */
export function getProviderConfigById(id: string): ProviderConfig {
  const db = getDB();
  const stmt = db.prepare("SELECT * FROM provider_configs WHERE id = ?");
  stmt.bind([id]);

  if (!stmt.step()) {
    stmt.free();
    throw new Error(`Provider 配置 ${id} 不存在`);
  }

  const row = stmt.get() as any[];
  stmt.free();

  return {
    id: row[0] as string,
    name: row[1] as string,
    type: row[2] as "openai" | "gemini" | "deepseek" | "zhipu" | "groq" | "cerebras" | "mistral" | "custom",
    api_key: row[3] as string,
    base_url: row[4] as string,
    model: row[5] as string,
    is_active: (row[6] as number) === 1,
  };
}

/**
 * 更新 Provider 配置
 */
export async function updateProviderConfig(
  id: string,
  updates: Partial<ProviderConfig>,
): Promise<ProviderConfig> {
  const db = getDB();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.type !== undefined) {
    fields.push("type = ?");
    values.push(updates.type);
  }
  if (updates.api_key !== undefined) {
    fields.push("api_key = ?");
    values.push(updates.api_key);
  }
  if (updates.base_url !== undefined) {
    fields.push("base_url = ?");
    values.push(updates.base_url);
  }
  if (updates.model !== undefined) {
    fields.push("model = ?");
    values.push(updates.model);
  }
  if (updates.is_active !== undefined) {
    fields.push("is_active = ?");
    values.push(updates.is_active ? 1 : 0);
  }

  if (fields.length > 0) {
    values.push(id);

    const stmt = db.prepare(
      `UPDATE provider_configs SET ${fields.join(", ")} WHERE id = ?`
    );
    stmt.run(values);
    stmt.free();

    await saveDBToFile();
  }

  return getProviderConfigById(id);
}

/**
 * 设置激活的 Provider
 */
export async function setActiveProvider(id: string): Promise<void> {
  const db = getDB();

  // 先取消所有激活状态
  const stmt1 = db.prepare("UPDATE provider_configs SET is_active = 0");
  stmt1.run([]);
  stmt1.free();

  // 激活指定的 Provider
  const stmt2 = db.prepare(
    "UPDATE provider_configs SET is_active = 1 WHERE id = ?"
  );
  stmt2.run([id]);
  stmt2.free();

  await saveDBToFile();
}

/**
 * 删除 Provider 配置
 */
export async function deleteProviderConfig(id: string): Promise<void> {
  const db = getDB();
  const stmt = db.prepare("DELETE FROM provider_configs WHERE id = ?");
  stmt.run([id]);
  stmt.free();
  await saveDBToFile();
}
