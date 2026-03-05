/**
 * AI Provider 配置数据表操作（Dexie）
 */

import { getDB, saveDBToFile } from "../core";
import type { ProviderConfig } from "@stores";

function mapProviderRow(row: any): ProviderConfig {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    api_key: row.api_key,
    base_url: row.base_url || undefined,
    model: row.model || undefined,
    custom_models: row.custom_models ? JSON.parse(row.custom_models) : undefined,
    is_active: row.is_active === 1 || row.is_active === true,
    supports_thinking: row.supports_thinking === 1 || row.supports_thinking === true,
    thinking_param_key: row.thinking_param_key || undefined,
    thinking_param_type: row.thinking_param_type || undefined,
    thinking_param_default: row.thinking_param_default
      ? JSON.parse(row.thinking_param_default)
      : undefined,
  } as ProviderConfig;
}

export async function createProviderConfig(
  config: Omit<ProviderConfig, "id">,
): Promise<ProviderConfig> {
  const db = getDB();
  const id = crypto.randomUUID();

  await db.provider_configs.add({
    id,
    name: config.name,
    type: config.type,
    api_key: config.api_key,
    base_url: config.base_url || null,
    model: config.model || null,
    custom_models: config.custom_models ? JSON.stringify(config.custom_models) : null,
    is_active: config.is_active ? 1 : 0,
    supports_thinking: config.supports_thinking ? 1 : 0,
    thinking_param_key: config.thinking_param_key || null,
    thinking_param_type: config.thinking_param_type || null,
    thinking_param_default: config.thinking_param_default
      ? JSON.stringify(config.thinking_param_default)
      : null,
  } as any);

  await saveDBToFile();
  return await getProviderConfigById(id);
}

export async function getAllProviderConfigs(): Promise<ProviderConfig[]> {
  const db = getDB();
  const rows = await db.provider_configs.toArray();
  return rows.map(mapProviderRow);
}

export async function getActiveProviderConfig(): Promise<ProviderConfig | null> {
  const db = getDB();
  const row = await db.provider_configs.where("is_active").equals(1 as any).first();
  return row ? mapProviderRow(row) : null;
}

export async function getProviderConfigById(id: string): Promise<ProviderConfig> {
  const db = getDB();
  const row = await db.provider_configs.get(id);
  if (!row) {
    throw new Error(`Provider 配置 ${id} 不存在`);
  }
  return mapProviderRow(row);
}

export async function updateProviderConfig(
  id: string,
  updates: Partial<ProviderConfig>,
): Promise<ProviderConfig> {
  const db = getDB();

  const patch: Record<string, any> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.type !== undefined) patch.type = updates.type;
  if (updates.api_key !== undefined) patch.api_key = updates.api_key;
  if (updates.base_url !== undefined) patch.base_url = updates.base_url || null;
  if (updates.model !== undefined) patch.model = updates.model || null;
  if (updates.custom_models !== undefined) {
    patch.custom_models = updates.custom_models
      ? JSON.stringify(updates.custom_models)
      : null;
  }
  if (updates.is_active !== undefined) patch.is_active = updates.is_active ? 1 : 0;
  if (updates.supports_thinking !== undefined) {
    patch.supports_thinking = updates.supports_thinking ? 1 : 0;
  }
  if (updates.thinking_param_key !== undefined) {
    patch.thinking_param_key = updates.thinking_param_key || null;
  }
  if (updates.thinking_param_type !== undefined) {
    patch.thinking_param_type = updates.thinking_param_type || null;
  }
  if (updates.thinking_param_default !== undefined) {
    patch.thinking_param_default = updates.thinking_param_default
      ? JSON.stringify(updates.thinking_param_default)
      : null;
  }

  if (Object.keys(patch).length > 0) {
    await db.provider_configs.update(id, patch);
    await saveDBToFile();
  }

  return await getProviderConfigById(id);
}

export async function setActiveProvider(id: string): Promise<void> {
  const db = getDB();
  await db.provider_configs.toCollection().modify({ is_active: 0 } as any);
  await db.provider_configs.update(id, { is_active: 1 } as any);
  await saveDBToFile();
}

export async function deleteProviderConfig(id: string): Promise<void> {
  const db = getDB();
  await db.provider_configs.delete(id);
  await saveDBToFile();
}
