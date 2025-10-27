import { useGeminiProcessor } from '../hooks/useGeminiProcessor';
import { useAppStore } from '../stores/appStore';
import { useConfigStore } from '../stores/configStore';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Play, Square, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

export function ProcessControl() {
  const { 
    startProcessing, 
    abortProcessing, 
    isAborted, 
    isProcessing 
  } = useGeminiProcessor();
  
  const { 
    csvData, 
    promptTemplate, 
    progress, 
    results, 
    errors 
  } = useAppStore();
  
  const { config } = useConfigStore();
  const [lastError, setLastError] = useState<string | null>(null);

  const canStart = 
    csvData.length > 0 && 
    promptTemplate.trim() && 
    config.apiKey.trim() && 
    !isProcessing;

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Enter で処理開始
      if (event.ctrlKey && event.key === 'Enter' && canStart) {
        event.preventDefault();
        handleStart();
      }
      // Esc で処理中断
      if (event.key === 'Escape' && isProcessing) {
        event.preventDefault();
        handleAbort();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canStart, isProcessing]);

  const handleStart = async () => {
    try {
      setLastError(null);
      await startProcessing();
    } catch (error) {
      setLastError(error instanceof Error ? error.message : '不明なエラーが発生しました');
    }
  };

  const handleAbort = () => {
    abortProcessing();
  };

  const progressPercentage = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  const getStatusIcon = () => {
    if (isProcessing) {
      return <Clock className="h-4 w-4 animate-spin" />;
    }
    if (results.length > 0 && errors.length === 0) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (errors.length > 0) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getStatusText = () => {
    if (isProcessing) {
      return '処理中...';
    }
    if (results.length > 0 && errors.length === 0) {
      return '完了';
    }
    if (errors.length > 0) {
      return 'エラーあり';
    }
    return '待機中';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>処理制御</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <Badge variant={isProcessing ? "default" : "secondary"}>
              {getStatusText()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 進捗表示 */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>進捗</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
            <p className="text-xs text-muted-foreground text-center">
              {progressPercentage}% 完了
            </p>
          </div>
        )}

        {/* 統計情報 */}
        {(results.length > 0 || errors.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {results.length}
              </div>
              <div className="text-sm text-muted-foreground">成功</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {errors.length}
              </div>
              <div className="text-sm text-muted-foreground">エラー</div>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {lastError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{lastError}</p>
          </div>
        )}

        {/* 制御ボタン */}
        <div className="flex space-x-2">
          {!isProcessing ? (
            <Button 
              onClick={handleStart} 
              disabled={!canStart}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              処理開始
              <kbd className="ml-2">Ctrl+Enter</kbd>
            </Button>
          ) : (
            <Button 
              onClick={handleAbort} 
              variant="destructive"
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              中断
              <kbd className="ml-2">Esc</kbd>
            </Button>
          )}
        </div>

        {/* 設定情報 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>並列数: {config.concurrency} | レート制限: {config.rateLimit} RPM</p>
          <p>タイムアウト: {config.timeout}秒 | ログレベル: {config.logLevel}</p>
        </div>

        {/* 開始前のチェックリスト */}
        {!isProcessing && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">開始前チェック</h4>
            <div className="space-y-1 text-xs">
              <div className={`flex items-center space-x-2 ${
                csvData.length > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  csvData.length > 0 ? 'bg-green-600' : 'bg-red-600'
                }`} />
                <span>CSVデータ ({csvData.length}行)</span>
              </div>
              <div className={`flex items-center space-x-2 ${
                promptTemplate.trim() ? 'text-green-600' : 'text-red-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  promptTemplate.trim() ? 'bg-green-600' : 'bg-red-600'
                }`} />
                <span>プロンプト設定</span>
              </div>
              <div className={`flex items-center space-x-2 ${
                config.apiKey.trim() ? 'text-green-600' : 'text-red-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  config.apiKey.trim() ? 'bg-green-600' : 'bg-red-600'
                }`} />
                <span>APIキー設定</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
