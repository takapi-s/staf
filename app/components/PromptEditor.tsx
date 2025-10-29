import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useConfigStore } from '../stores/configStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FileText, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { GeminiClient } from '../utils/geminiClient';
import type { OutputColumn } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface PromptEditorProps {
  onTemplateChange?: (template: string) => void;
}

// Generate schema recursively (same as OutputColumnEditor)
function generateSchema(columns: OutputColumn[], indent = 2): string {
  return columns.map(col => {
    const indentStr = ' '.repeat(indent);
    const desc = col.description ? ` // ${col.description}` : '';
    const type = col.type || 'string';
    const typeStr = type === 'string' ? 'string' : type === 'number' ? 'number' : type === 'boolean' ? 'boolean' : type;
    
    if (type === 'object' && col.nestedColumns && col.nestedColumns.length > 0) {
      const nestedSchema = generateSchema(col.nestedColumns, indent + 2);
      return `${indentStr}"${col.name}": {\n${nestedSchema}\n${indentStr}}${desc}`;
    } else if (type === 'array' && col.nestedColumns && col.nestedColumns.length > 0) {
      const nestedSchema = generateSchema(col.nestedColumns, indent + 2);
      return `${indentStr}"${col.name}": [\n${indentStr}  {\n${nestedSchema}\n${indentStr}  }\n${indentStr}]${desc}`;
    } else {
      return `${indentStr}"${col.name}": ${typeStr}${desc}`;
    }
  }).join(',\n');
}

export function PromptEditor({ onTemplateChange }: PromptEditorProps) {
  const { promptTemplate, csvHeaders, outputColumns, csvData, setPromptTemplate } = useAppStore();
  const { config } = useConfigStore();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptLang, setPromptLang] = useState<'en' | 'ja'>('ja');

  const insertVariable = (header: string) => {
    const variable = `{{${header}}}`;
    const newTemplate = promptTemplate + variable;
    setPromptTemplate(newTemplate);
    onTemplateChange?.(newTemplate);
  };

  const handleTemplateChange = (value: string) => {
    setPromptTemplate(value);
    onTemplateChange?.(value);
  };

  const generatePromptWithAI = async () => {
    if (!config.apiKey.trim()) {
      toast.error('API key is not set');
      return;
    }

    if (csvHeaders.length === 0) {
      toast.error('No CSV data');
      return;
    }

    if (outputColumns.length === 0) {
      toast.error('Output columns are not configured');
      return;
    }

    setIsGenerating(true);
    toast.info(promptLang === 'ja' ? 'プロンプトを生成しています…' : 'Generating prompt...');

    try {
      const geminiClient = new GeminiClient(config.apiKey);

      // Get first-row sample
      const firstRow = csvHeaders.reduce((acc, header) => {
        acc[header] = csvData[0]?.[header] || '';
        return acc;
      }, {} as Record<string, any>);

      // Build output schema
      const outputSchema = generateSchema(outputColumns);

      // Instruction for prompt generation (EN/JA)
      const generationPrompt = promptLang === 'ja'
        ? `以下の要件に基づいて、Gemini の Google 検索グラウンディングで用いる日本語プロンプトを生成してください。

要件:
1. ペルソナ: 適切な専門家/調査員のペルソナを設定する
2. 背景と目的: 何のために何を達成するかを明確化する
3. 入力データ構造を理解し、変数( {{column_name}} )を適切に配置する
4. 出力スキーマに沿った指示を含める

入力CSVの列:
${csvHeaders.map(h => `- ${h}`).join('\n')}

サンプルデータ（1行目）:
${JSON.stringify(firstRow, null, 2)}

出力スキーマ:
\`\`\`json
{
${outputSchema}
}
\`\`\`

注意:
- 変数は \`{{column_name}}\` の形式で用いる
- 最終プロンプトにJSONの例は含めない（スキーマは別途付与される）
- 情報が不足している場合の挙動（例: 空配列を返す）を明確に指示する

出力は日本語プロンプトの本文のみを返してください。`
        : `Generate an English prompt for Gemini Google Search grounding with these requirements.

Requirements:
1. Persona: set an appropriate expert/investigator persona
2. Background & objective: clarify purpose and target
3. Place variables ( {{column_name}} ) properly based on input structure
4. Include instructions aligned with the output schema

Input CSV columns:
${csvHeaders.map(h => `- ${h}`).join('\n')}

Sample data (first row):
${JSON.stringify(firstRow, null, 2)}

Output schema:
\`\`\`json
{
${outputSchema}
}
\`\`\`

Notes:
- Use variables in the form \`{{column_name}}\`
- Do not include the JSON example itself in the final prompt
- Specify behavior when information is missing (e.g., return an empty array)

Return only the generated prompt body.`;

      const response = await geminiClient.generateContent(generationPrompt, 60000);

      // タイプ風に段階的に反映（簡易ストリーミング表現）
      const text = response.trim();
      setPromptTemplate('');
      onTemplateChange?.('');
      let i = 0;
      const step = Math.max(1, Math.floor(text.length / 120)); // だいたい2秒程度を想定
      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          i = Math.min(text.length, i + step);
          const chunk = text.slice(0, i);
          setPromptTemplate(chunk);
          onTemplateChange?.(chunk);
          if (i >= text.length) {
            clearInterval(timer);
            resolve();
          }
        }, 16);
      });
      toast.success(promptLang === 'ja' ? 'プロンプトを生成しました' : 'Prompt generated');

    } catch (error) {
      console.error('Prompt generation error:', error);
      toast.error(promptLang === 'ja' ? 'プロンプト生成に失敗しました' : 'Failed to generate prompt');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderPreview = () => {
    if (!promptTemplate || csvHeaders.length === 0) {
      return promptTemplate || 'Enter a prompt';
    }

    // Generate preview using first row
    const firstRow = csvHeaders.reduce((acc, header) => {
      acc[header] = `[value of ${header}]`;
      return acc;
    }, {} as Record<string, string>);

    let preview = promptTemplate;
    csvHeaders.forEach(header => {
      const regex = new RegExp(`\\{\\{${header}\\}\\}`, 'g');
      preview = preview.replace(regex, `[value of ${header}]`);
    });

    return preview;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Prompt Editor</span>
          <div className="flex items-center space-x-2">
            <Button
              variant={isPreviewMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              <FileText className="h-4 w-4 mr-2" />
              {isPreviewMode ? 'Edit' : 'Preview'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI prompt generation */}
        {csvHeaders.length > 0 && outputColumns.length > 0 && (
          <div className="space-y-2">
            {/* 言語選択 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Language</span>
              <Select value={promptLang} onValueChange={(v: 'en' | 'ja') => setPromptLang(v)}>
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={generatePromptWithAI}
              disabled={isGenerating}
              className={`w-full ${isGenerating ? 'loading-wave' : ''}`}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating ? (promptLang === 'ja' ? '生成中…' : 'Generating...') : (promptLang === 'ja' ? 'AIでプロンプト生成' : 'Generate prompt with AI')}
            </Button>
          </div>
        )}

        {/* Variable insertion */}
        {csvHeaders.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Available variables</h4>
            <div className="flex flex-wrap gap-2">
              {csvHeaders.map((header) => (
                <Button
                  key={header}
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable(header)}
                  className="h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {header}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Editor / Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              {isPreviewMode ? 'Preview' : 'Prompt'}
            </label>
            {!isPreviewMode && (
              <Badge variant="secondary" className="text-xs">
                {promptTemplate.length} chars
              </Badge>
            )}
          </div>
          
          {isPreviewMode ? (
            <div className="space-y-3">
              <div className="min-h-[200px] p-3 border rounded-md bg-muted/50 whitespace-pre-wrap">
                {renderPreview()}
              </div>
              
              {/* Output schema preview */}
              {outputColumns.length > 0 && (
                <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                  <div className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
                    📋 Output schema
                  </div>
                  <pre className="text-xs font-mono whitespace-pre-wrap text-blue-800 dark:text-blue-200 bg-white dark:bg-blue-950/40 p-2 rounded">
{generateSchema(outputColumns)}
                  </pre>
                  <div className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    JSON will be produced in this structure
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Textarea
              value={promptTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              placeholder={`Enter a prompt...

Example:
Please find 2024 live information for the following artist.

Artist: {{artist_name}}`}
              className="min-h-[200px] font-mono text-sm"
            />
          )}
        </div>

        {/* Output schema (non-preview) */}
        {outputColumns.length > 0 && !isPreviewMode && (
          <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Output schema is configured
              </div>
              <Badge variant="secondary" className="text-xs">
                {outputColumns.length} columns
              </Badge>
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap text-blue-800 dark:text-blue-200">
              {generateSchema(outputColumns)}
            </pre>
          </div>
        )}

        {/* Hints */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Use variables like <code className="bg-muted px-1 rounded">{'{{variable_name}}'}</code></p>
          {outputColumns.length === 0 ? (
            <p>• Define the output schema in Output Columns</p>
          ) : (
            <p className="text-green-600 dark:text-green-400">✓ Output schema is set. Check it in Preview</p>
          )}
          <p>• Preview mode shows variable expansion and schema</p>
        </div>
      </CardContent>
    </Card>
  );
}
