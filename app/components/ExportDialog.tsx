import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { CsvExporter } from '../utils/csvExporter';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Download, FileText, AlertCircle } from 'lucide-react';

interface ExportDialogProps {
  children: React.ReactNode;
}

export function ExportDialog({ children }: ExportDialogProps) {
  const { results, errors } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [filename, setFilename] = useState(CsvExporter.getDefaultFilename());
  const [isExporting, setIsExporting] = useState(false);

  const canExport = results.length > 0 || errors.length > 0;

  const handleExport = async () => {
    if (!canExport) return;

    setIsExporting(true);
    
    try {
      const { successCsv, errorCsv } = CsvExporter.exportResults(results, errors, filename);
      
      // 成功結果をダウンロード
      CsvExporter.downloadCsv(successCsv, `${filename}-success`);
      
      // エラー結果がある場合はダウンロード
      if (errorCsv) {
        CsvExporter.downloadCsv(errorCsv, `${filename}-errors`);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('エクスポート中にエラーが発生しました');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFilenameChange = (value: string) => {
    // ファイル名に使用できない文字を除去
    const sanitized = value.replace(/[<>:"/\\|?*]/g, '');
    setFilename(sanitized);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>結果をエクスポート</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* エクスポート対象 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">エクスポート対象</CardTitle>
              <CardDescription>出力されるファイルの内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-sm">成功結果</span>
                </div>
                <Badge variant="secondary">{results.length}件</Badge>
              </div>
              
              {errors.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">エラー結果</span>
                  </div>
                  <Badge variant="destructive">{errors.length}件</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ファイル名設定 */}
          <div className="space-y-2">
            <Label htmlFor="filename">ファイル名</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => handleFilenameChange(e.target.value)}
              placeholder="gemini-results"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              成功結果: {filename}-success.csv
              {errors.length > 0 && `, エラー結果: ${filename}-errors.csv`}
            </p>
          </div>

          {/* 注意事項 */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">注意事項</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• 成功結果とエラー結果は別々のファイルに出力されます</li>
                  <li>• ファイルはブラウザのダウンロードフォルダに保存されます</li>
                  <li>• 大量のデータの場合は処理に時間がかかる場合があります</li>
                </ul>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              キャンセル
            </Button>
            <Button 
              onClick={handleExport}
              disabled={!canExport || isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'エクスポート中...' : 'エクスポート'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
