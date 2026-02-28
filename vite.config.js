import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
// GitHub Pages 仓库名，本地开发时设为 '/'
var base = process.env.GITHUB_PAGES ? "/StoryWeaver/" : "/";
export default defineConfig({
    base: base,
    plugins: [
        preact(),
        tailwindcss(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
            manifest: {
                name: "AI 剧本房",
                short_name: "AI 剧本房",
                description: "AI 驱动的互动剧本创作平台",
                theme_color: "#1a1a2e",
                background_color: "#1a1a2e",
                display: "standalone",
                orientation: "portrait",
                scope: base,
                start_url: base,
                icons: [
                    {
                        src: "pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any maskable",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "google-fonts-cache",
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365,
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@components": path.resolve(__dirname, "./src/components"),
            "@stores": path.resolve(__dirname, "./src/stores"),
            "@types": path.resolve(__dirname, "./src/types"),
            "@db": path.resolve(__dirname, "./src/db"),
            "@lib": path.resolve(__dirname, "./src/lib"),
            "@providers": path.resolve(__dirname, "./src/providers"),
            "@assets": path.resolve(__dirname, "./src/assets"),
        },
    },
    build: {
        target: "esnext",
        minify: "esbuild",
        sourcemap: false,
    },
    optimizeDeps: {
        include: ["sql.js"],
    },
    define: {
        global: "globalThis",
    },
});
