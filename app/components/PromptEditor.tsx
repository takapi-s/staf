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

interface PromptEditorProps {
  onTemplateChange?: (template: string) => void;
}

// 再帰的にスキーマを生成（OutputColumnEditorと同様の関数）
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
      toast.error('APIキーが設定されていません');
      return;
    }

    if (csvHeaders.length === 0) {
      toast.error('CSVデータがありません');
      return;
    }

    if (outputColumns.length === 0) {
      toast.error('出力カラムが設定されていません');
      return;
    }

    setIsGenerating(true);
    toast.info('プロンプトを生成中...');

    try {
      const geminiClient = new GeminiClient(config.apiKey);

      // 最初の1行のサンプルデータを取得
      const firstRow = csvHeaders.reduce((acc, header) => {
        acc[header] = csvData[0]?.[header] || '';
        return acc;
      }, {} as Record<string, any>);

      // 出力形式を生成
      const outputSchema = generateSchema(outputColumns);

      // プロンプト生成用の指示
      const generationPrompt = `次の要件に基づいて、Gemini Web Search用のプロンプトを生成してください。

【要件】
1. ペルソナ設定：適切な専門家や調査者としてのペルソナを設定してください
2. 調査の背景と目的：なぜこの調査を行うのか、どのような目的があるのかを明確にしてください
3. 入力データの構造を理解し、適切に変数を配置してください
4. 出力形式に合わせた指示を含めてください

【入力CSVカラム】
${csvHeaders.map(h => `- ${h}`).join('\n')}

【サンプルデータ（最初の1行）】
${JSON.stringify(firstRow, null, 2)}

【出力形式】
\`\`\`json
{
${outputSchema}
}
\`\`\`

【注意事項】
- 変数は \`{{カラム名}}\` の形式で使用してください
- プロンプトは自然な日本語で記述してください
- 調査の目的と背景を明確に記述してください
- ペルソナ設定を含めてください
- **重要**: 出力形式のJSON例はプロンプト内に含めないでください（出力形式は自動的にプロンプトに追加されます）
- 情報が見つからない場合の対応方法を明記してください（例：空の配列を返す、または情報なしを示す旨を記載するなど）

生成されたプロンプトのみを返してください。`;

      const response = await geminiClient.generateContent(generationPrompt, 60000);
      
      setPromptTemplate(response.trim());
      onTemplateChange?.(response.trim());
      toast.success('プロンプトを生成しました');

    } catch (error) {
      console.error('Prompt generation error:', error);
      toast.error('プロンプトの生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderPreview = () => {
    if (!promptTemplate || csvHeaders.length === 0) {
      return promptTemplate || 'プロンプトを入力してください';
    }

    // 最初の行のデータでプレビューを生成
    const firstRow = csvHeaders.reduce((acc, header) => {
      acc[header] = `[${header}の値]`;
      return acc;
    }, {} as Record<string, string>);

    let preview = promptTemplate;
    csvHeaders.forEach(header => {
      const regex = new RegExp(`\\{\\{${header}\\}\\}`, 'g');
      preview = preview.replace(regex, `[${header}の値]`);
    });

    return preview;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>プロンプトエディタ</span>
          <div className="flex items-center space-x-2">
            <Button
              variant={isPreviewMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              <FileText className="h-4 w-4 mr-2" />
              {isPreviewMode ? '編集' : 'プレビュー'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AIプロンプト生成ボタン */}
        {csvHeaders.length > 0 && outputColumns.length > 0 && (
          <div>
            <Button
              variant="default"
              size="sm"
              onClick={generatePromptWithAI}
              disabled={isGenerating}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating ? '生成中...' : 'AIでプロンプトを自動生成'}
            </Button>
          </div>
        )}

        {/* 変数挿入ボタン */}
        {csvHeaders.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">利用可能な変数</h4>
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

                 {/* エディタ/プレビュー */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              {isPreviewMode ? 'プレビュー' : 'プロンプト'}
            </label>
            {!isPreviewMode && (
              <Badge variant="secondary" className="text-xs">
                {promptTemplate.length}文字
              </Badge>
            )}
          </div>
          
          {isPreviewMode ? (
            <div className="space-y-3">
              <div className="min-h-[200px] p-3 border rounded-md bg-muted/50 whitespace-pre-wrap">
                {renderPreview()}
              </div>
              
              {/* 出力形式のプレビュー */}
              {outputColumns.length > 0 && (
                <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                  <div className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
                    📋 出力形式
                  </div>
                  <pre className="text-xs font-mono whitespace-pre-wrap text-blue-800 dark:text-blue-200 bg-white dark:bg-blue-950/40 p-2 rounded">
{generateSchema(outputColumns)}
                  </pre>
                  <div className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    この形式でJSONが出力されます
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Textarea
              value={promptTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              placeholder={`プロンプトを入力してください...

例:
次のアーティストの2024年のライブ情報を調べてください。

アーティスト名: {{artist_name}}`}
              className="min-h-[200px] font-mono text-sm"
            />
          )}
        </div>

        {/* 出力形式プレビュー */}
        {outputColumns.length > 0 && !isPreviewMode && (
          <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                出力形式が設定されています
              </div>
              <Badge variant="secondary" className="text-xs">
                {outputColumns.length}カラム
              </Badge>
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap text-blue-800 dark:text-blue-200">
              {generateSchema(outputColumns)}
            </pre>
          </div>
        )}

        {/* ヒント */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 変数は <code className="bg-muted px-1 rounded">{'{{変数名}}'}</code> の形式で使用できます</p>
          {outputColumns.length === 0 ? (
            <p>• 出力形式は「出力カラム設定」で指定できます</p>
          ) : (
            <p className="text-green-600 dark:text-green-400">✓ 出力形式が設定されています。プレビューで確認できます</p>
          )}
          <p>• プレビューモードで変数の展開と出力形式を確認できます</p>
        </div>
      </CardContent>
    </Card>
  );
}
