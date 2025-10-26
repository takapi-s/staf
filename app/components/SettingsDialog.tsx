import { useState } from 'react';
import { useConfigStore } from '../stores/configStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Settings, Eye, EyeOff } from 'lucide-react';

export function SettingsDialog() {
  const { config, updateConfig, validateConfig } = useConfigStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleSave = () => {
    const validation = validateConfig();
    if (validation.isValid) {
      setValidationErrors([]);
      setIsOpen(false);
    } else {
      setValidationErrors(validation.errors);
    }
  };

  const handleReset = () => {
    updateConfig({
      apiKey: '',
      concurrency: 3,
      rateLimit: 60,
      timeout: 30,
      outputFolder: '',
      logLevel: 'info',
    });
    setValidationErrors([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          設定
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>設定</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* API設定 */}
          <Card>
            <CardHeader>
              <CardTitle>API設定</CardTitle>
              <CardDescription>Gemini APIの設定を行います</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">APIキー</Label>
                <div className="flex space-x-2">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={config.apiKey}
                    onChange={(e) => updateConfig({ apiKey: e.target.value })}
                    placeholder="AIza..."
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 処理設定 */}
          <Card>
            <CardHeader>
              <CardTitle>処理設定</CardTitle>
              <CardDescription>並列処理とレート制限の設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>並列処理数: {config.concurrency}</Label>
                <Slider
                  value={[config.concurrency]}
                  onValueChange={([value]) => updateConfig({ concurrency: value })}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  同時に実行するリクエスト数（1-10）
                </p>
              </div>

              <div className="space-y-2">
                <Label>レート制限: {config.rateLimit} RPM</Label>
                <Slider
                  value={[config.rateLimit]}
                  onValueChange={([value]) => updateConfig({ rateLimit: value })}
                  min={1}
                  max={1000}
                  step={1}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  1分あたりの最大リクエスト数
                </p>
              </div>

              <div className="space-y-2">
                <Label>タイムアウト: {config.timeout}秒</Label>
                <Slider
                  value={[config.timeout]}
                  onValueChange={([value]) => updateConfig({ timeout: value })}
                  min={5}
                  max={300}
                  step={5}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  リクエストの最大待機時間
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 出力設定 */}
          <Card>
            <CardHeader>
              <CardTitle>出力設定</CardTitle>
              <CardDescription>ファイル出力の設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="outputFolder">出力フォルダ</Label>
                <Input
                  id="outputFolder"
                  value={config.outputFolder}
                  onChange={(e) => updateConfig({ outputFolder: e.target.value })}
                  placeholder="デフォルト: ダウンロードフォルダ"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logLevel">ログレベル</Label>
                <Select
                  value={config.logLevel}
                  onValueChange={(value: 'info' | 'debug' | 'error') => 
                    updateConfig({ logLevel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* バリデーションエラー */}
          {validationErrors.length > 0 && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-destructive">設定エラー</h4>
                  <ul className="text-sm text-destructive space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* アクションボタン */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              リセット
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSave}>
                保存
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
