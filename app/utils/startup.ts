import { getVersion } from "@tauri-apps/api/app";
import { appCacheDir, appLocalDataDir, join } from "@tauri-apps/api/path";
import { exists, readTextFile, writeTextFile, remove, mkdir } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";

let maintenanceStarted = false;

export async function runPostUpdateMaintenance(): Promise<void> {
  if (maintenanceStarted) return;
  maintenanceStarted = true;

  // ブラウザ実行時はスキップ（Tauri環境のみ実行）
  if (typeof window === "undefined" || !(window as any).__TAURI__) return;

  try {
    const [currentVersion, dataDir] = await Promise.all([
      getVersion(),
      appLocalDataDir(),
    ]);

    const versionFile = await join(dataDir, ".last-version");
    const hasVersionFile = await exists(versionFile);
    const previousVersion = hasVersionFile ? await readTextFile(versionFile) : undefined;

    if (previousVersion !== currentVersion) {
      // アプリキャッシュディレクトリを入れ替え
      const cacheDir = await appCacheDir();
      await remove(cacheDir, { recursive: true }).catch(() => {});
      await mkdir(cacheDir, { recursive: true }).catch(() => {});

      // Windows の場合はデスクトップショートカットを再作成
      try {
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        if (ua.includes("Windows")) {
          await invoke("recreate_windows_shortcut", { name: null, description: null });
        }
      } catch {}

      // バージョンを保存
      await writeTextFile(versionFile, currentVersion);
    }
  } catch {
    // 失敗しても致命的にしない
  }
}


