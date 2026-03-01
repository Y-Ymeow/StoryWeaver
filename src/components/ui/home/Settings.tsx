/**
 * 设置页面主组件
 */

import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Modal } from "@components/ui/common";
import {
  AIModelSettingsSection,
  DatabaseSettingsSection,
  ErrorLogsSection,
  AboutSection,
} from "./settings";
import type { ProviderConfig } from "@stores/types";

interface SettingsProps {
  onClose: () => void;
}

export const Settings: FunctionalComponent<SettingsProps> = ({ onClose }) => {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);

  const loadProvidersFromStorage = () => {
    try {
      const data = localStorage.getItem("ai-providers");
      const loaded = data ? JSON.parse(data) : [];
      setProviders(loaded);
      const active = loaded.find((p: ProviderConfig) => p.is_active);
      if (active) {
        setActiveProviderId(active.id);
      }
    } catch (error) {
      console.error("加载 Provider 配置失败:", error);
    }
  };

  useEffect(() => {
    loadProvidersFromStorage();
  }, []);

  const handleMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="设置"
      size="lg"
    >
      <div class="space-y-4 max-h-[70vh] overflow-y-auto">
        {message && (
          <div class={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-900/30 border border-green-500 text-green-300"
              : "bg-red-900/30 border border-red-500 text-red-300"
          }`}>
            {message.text}
          </div>
        )}

        <AIModelSettingsSection
          providers={providers}
          activeProviderId={activeProviderId}
          onProvidersChange={setProviders}
          onActiveProviderChange={setActiveProviderId}
          onMessage={handleMessage}
        />

        <DatabaseSettingsSection
          onMessage={handleMessage}
        />

        <ErrorLogsSection
          onMessage={handleMessage}
        />

        <AboutSection />
      </div>
    </Modal>
  );
};
