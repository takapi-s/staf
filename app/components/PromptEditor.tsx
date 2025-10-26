import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FileText, Plus } from 'lucide-react';

interface PromptEditorProps {
  onTemplateChange?: (template: string) => void;
}

export function PromptEditor({ onTemplateChange }: PromptEditorProps) {
  const { promptTemplate, csvHeaders, setPromptTemplate } = useAppStore();
  const [isPreviewMode, setIsPreviewMode] = useState(false);

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
            <div className="min-h-[200px] p-3 border rounded-md bg-muted/50 whitespace-pre-wrap">
              {renderPreview()}
            </div>
          ) : (
            <Textarea
              value={promptTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              placeholder={`プロンプトを入力してください...

例:
次のアーティストの2024年のライブ情報を調べ、
以下のJSON形式で出力してください。

{
  "artist": string,
  "events": [
    {
      "title": string,
      "date": string,
      "venue": string
    }
  ]
}

アーティスト名: {{artist_name}}`}
              className="min-h-[200px] font-mono text-sm"
            />
          )}
        </div>

        {/* ヒント */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 変数は <code className="bg-muted px-1 rounded">{'{{変数名}}'}</code> の形式で使用できます</p>
          <p>• 出力はJSON形式で構造化することを推奨します</p>
          <p>• プレビューモードで変数の展開を確認できます</p>
        </div>
      </CardContent>
    </Card>
  );
}
