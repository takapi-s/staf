import type { MetaFunction } from "react-router";
import { SettingsDialog } from "../components/SettingsDialog";
import { CsvUploader } from "../components/CsvUploader";
import { CsvPreview } from "../components/CsvPreview";
import { PromptEditor } from "../components/PromptEditor";
import { OutputColumnEditor } from "../components/OutputColumnEditor";
import { TemplateManager } from "../components/TemplateManager";
import { ProcessControl } from "../components/ProcessControl";
import { ResultViewer } from "../components/ResultViewer";
import { UpdateChecker } from "../components/UpdateChecker";

export const meta: MetaFunction = () => {
  return [
    { title: "GeminiScope - CSV×Gemini Web Search Tool" },
    { name: "description", content: "A tool for batch processing CSV files with Gemini Web Search" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">GeminiScope</h1>
              <p className="text-sm text-muted-foreground">
                CSV×Gemini Web Search Batch Processing Tool
              </p>
            </div>
            <div className="flex items-center gap-2">
              <UpdateChecker />
              <SettingsDialog />
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左パネル (40%) */}
          <div className="lg:col-span-2 space-y-6">
            <CsvUploader />
            <CsvPreview />
            <OutputColumnEditor />
            <TemplateManager />
          </div>

          {/* 右パネル (60%) */}
          <div className="lg:col-span-3 space-y-6">
            <PromptEditor />
            <ProcessControl />
            <ResultViewer />
          </div>
        </div>

        {/* フッター */}
        <footer className="mt-8 pt-6 border-t">
          <div className="text-sm text-muted-foreground">
            <p>GeminiScope v0.1.0 - Powered by Tauri & React</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
