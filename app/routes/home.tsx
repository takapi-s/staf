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
import packageJson from "../../package.json";

export const meta: MetaFunction = () => {
  return [
    { title: "STAF — Structured AI Flow" },
    { name: "description", content: "Structured AI flow to transform CSV data reliably at scale" },
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
              <h1 className="text-2xl font-bold">STAF</h1>
              <p className="text-sm text-muted-foreground">
                Structure your AI data flows
              </p>
            </div>
            <div className="flex items-center gap-2">
              <UpdateChecker />
              <SettingsDialog />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left panel (40%) */}
          <div className="lg:col-span-2 space-y-6">
            <CsvUploader />
            <CsvPreview />
            <OutputColumnEditor />
          </div>

          {/* Right panel (60%) */}
          <div className="lg:col-span-3 space-y-6">
            <PromptEditor />
            <TemplateManager />
            <ProcessControl />
            <ResultViewer />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t">
          <div className="text-sm text-muted-foreground">
            <p>STAF v{packageJson.version} - Powered by Tauri & React</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
