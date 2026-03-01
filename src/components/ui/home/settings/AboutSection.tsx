/**
 * 设置页面 - 关于信息子组件
 */

import { FunctionalComponent } from "preact";
import { Card } from "@components/ui/common";

export const AboutSection: FunctionalComponent = () => {
  return (
    <Card hover={false}>
      <h3 class="text-lg font-semibold text-white mb-2">ℹ️ 关于</h3>
      <div class="text-gray-300 text-sm space-y-1">
        <p>AI 剧本房 v0.0.1</p>
        <p>使用 Preact + Vite + TailwindCSS 构建</p>
        <p class="text-gray-500 mt-2">
          数据存储在本地，不会上传到服务器
        </p>
      </div>
    </Card>
  );
};
