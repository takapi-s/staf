import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // reactRouter を先頭に配置してフレームワークのコンテキストを確実に注入
  plugins: [reactRouter(), tailwindcss(), tsconfigPaths()],
});
