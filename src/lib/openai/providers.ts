/**
 * Provider 工具函数
 */

import { getAllProviderConfigs } from '@/db/models/providers';

/**
 * 加载所有 Provider 配置
 */
export async function loadProviders() {
  try {
    return await getAllProviderConfigs();
  } catch (error) {
    console.error('加载 Provider 配置失败:', error);
    return [];
  }
}

/**
 * 获取激活的 Provider
 */
export async function loadActiveProvider() {
  const { getActiveProviderConfig } = await import('@/db/models/providers');
  try {
    return await getActiveProviderConfig();
  } catch (error) {
    console.error('获取激活 Provider 失败:', error);
    return null;
  }
}
