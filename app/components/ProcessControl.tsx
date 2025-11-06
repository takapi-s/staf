import { useGeminiProcessor } from '../hooks/useGeminiProcessor';
import { useAppStore } from '../stores/appStore';
import { useConfigStore } from '../stores/configStore';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
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
    outputColumns,
    progress, 
    activeRequests,
    results, 
    errors 
  } = useAppStore();
  
  const { config, updateConfig } = useConfigStore();
  const [lastError, setLastError] = useState<string | null>(null);

  const canStart = 
    csvData.length > 0 && 
    promptTemplate.trim() && 
    config.apiKey.trim() && 
    outputColumns.length > 0 &&
    !isProcessing;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Enter to start processing
      if (event.ctrlKey && event.key === 'Enter' && canStart) {
        event.preventDefault();
        handleStart();
      }
      // Esc to abort
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

  // 完了数のみで進捗率を計算
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
      return 'Processing...';
    }
    if (results.length > 0 && errors.length === 0) {
      return 'Completed';
    }
    if (errors.length > 0) {
      return 'With errors';
    }
    return 'Idle';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Process Control</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <Badge variant={isProcessing ? "default" : "secondary"}>
              {getStatusText()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <Progress 
              value={progress.current} 
              activeValue={activeRequests}
              maxValue={progress.total}
              className="w-full" 
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progressPercentage}% completed</span>
              {activeRequests > 0 && (
                <span className="text-blue-600">
                  {activeRequests} active request{activeRequests !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        {(results.length > 0 || errors.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {results.length}
              </div>
              <div className="text-sm text-muted-foreground">Success</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {errors.length}
              </div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
          </div>
        )}

        {/* Error */}
        {lastError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{lastError}</p>
          </div>
        )}

        {/* Web Search Toggle */}
        {!isProcessing && (
          <div className="flex items-center justify-between space-x-2 p-3 bg-muted/50 rounded-md">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="process-web-search" className="text-sm font-medium cursor-pointer">
                Web Search (Google Search Grounding)
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable web search tool for Gemini API
              </p>
            </div>
            <Switch
              id="process-web-search"
              checked={config.enableWebSearch}
              onCheckedChange={(checked) => updateConfig({ enableWebSearch: checked })}
              disabled={isProcessing}
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex space-x-2">
          {!isProcessing ? (
            <Button 
              onClick={handleStart} 
              disabled={!canStart}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Start
              <kbd className="ml-2">Ctrl+Enter</kbd>
            </Button>
          ) : (
            <Button 
              onClick={handleAbort} 
              variant="destructive"
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              Abort
              <kbd className="ml-2">Esc</kbd>
            </Button>
          )}
        </div>

        {/* Settings info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Concurrency: {config.concurrency} | Rate limit: {config.rateLimit} RPM</p>
          <p>Timeout: {config.timeout}s | Log level: {config.logLevel}</p>
          <p>Web Search: {config.enableWebSearch ? 'Enabled' : 'Disabled'}</p>
        </div>

        {/* Pre-run checklist */}
        {!isProcessing && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Pre-run checklist</h4>
            <div className="space-y-1 text-xs">
              <div className={`flex items-center space-x-2 ${
                csvData.length > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  csvData.length > 0 ? 'bg-green-600' : 'bg-red-600'
                }`} />
                <span>CSV data ({csvData.length} rows)</span>
              </div>
              <div className={`flex items-center space-x-2 ${
                promptTemplate.trim() ? 'text-green-600' : 'text-red-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  promptTemplate.trim() ? 'bg-green-600' : 'bg-red-600'
                }`} />
                <span>Prompt configured</span>
              </div>
              <div className={`flex items-center space-x-2 ${
                config.apiKey.trim() ? 'text-green-600' : 'text-red-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  config.apiKey.trim() ? 'bg-green-600' : 'bg-red-600'
                }`} />
                <span>API key set</span>
              </div>
              <div className={`flex items-center space-x-2 ${
                outputColumns.length > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  outputColumns.length > 0 ? 'bg-green-600' : 'bg-red-600'
                }`} />
                <span>Output columns ({outputColumns.length} configured)</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
