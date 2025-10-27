import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '../stores/appStore';
import { useConfigStore } from '../stores/configStore';
import { GeminiClient } from '../utils/geminiClient';
import { ParallelProcessor } from '../utils/parallel';
import { logger } from '../utils/logger';

export function useGeminiProcessor() {
  const { 
    csvData, 
    promptTemplate, 
    outputColumns,
    isProcessing, 
    startProcessing: setProcessingState, 
    updateProgress, 
    addResult, 
    addError, 
    finishProcessing 
  } = useAppStore();
  
  const { config } = useConfigStore();
  const processorRef = useRef<ParallelProcessor | null>(null);

  const startProcessing = useCallback(async () => {
    if (csvData.length === 0) {
      const error = new Error('CSVデータがありません');
      logger.error('処理開始エラー', error);
      toast.error('CSVデータをアップロードしてください');
      throw error;
    }

    if (!promptTemplate.trim()) {
      const error = new Error('プロンプトが入力されていません');
      logger.error('処理開始エラー', error);
      toast.error('プロンプトを入力してください');
      throw error;
    }

    if (!config.apiKey.trim()) {
      const error = new Error('APIキーが設定されていません');
      logger.error('処理開始エラー', error);
      toast.error('設定画面でAPIキーを設定してください');
      throw error;
    }

    // ログレベル設定
    logger.setLogLevel(config.logLevel);

    // 処理開始
    logger.info('処理開始', { 
      totalRows: csvData.length, 
      concurrency: config.concurrency,
      rateLimit: config.rateLimit 
    });
    setProcessingState(csvData.length);
    toast.info('処理を開始しました', {
      description: `${csvData.length}行のデータを処理します`
    });

    try {
      // Gemini クライアント初期化
      const geminiClient = new GeminiClient(config.apiKey);
      
      // 並列プロセッサー初期化
      processorRef.current = new ParallelProcessor(
        geminiClient,
        config.concurrency,
        config.rateLimit,
        config.timeout * 1000
      );

      // 処理実行
      const { success, errors } = await processorRef.current.processRows(
        csvData,
        promptTemplate,
        outputColumns,
        (current, total) => {
          updateProgress(current);
        },
        () => {
          logger.info('処理が中断されました');
          toast.warning('処理が中断されました');
        }
      );

      // 結果をストアに追加
      success.forEach(result => addResult(result));
      errors.forEach(error => addError(error));

      // 完了通知
      logger.info('処理完了', { 
        success: success.length, 
        errors: errors.length 
      });
      
      if (errors.length === 0) {
        toast.success('処理が完了しました', {
          description: `${success.length}件のデータを処理しました`
        });
      } else {
        toast.warning('処理が完了しました（エラーあり）', {
          description: `成功: ${success.length}件, エラー: ${errors.length}件`
        });
      }

    } catch (error) {
      logger.error('処理エラー', error);
      toast.error('処理中にエラーが発生しました', {
        description: logger.getUserMessage(error)
      });
      throw error;
    } finally {
      finishProcessing();
      processorRef.current = null;
    }
  }, [
    csvData, 
    promptTemplate, 
    outputColumns,
    config, 
    setProcessingState, 
    updateProgress, 
    addResult, 
    addError, 
    finishProcessing
  ]);

  const abortProcessing = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.abort();
    }
  }, []);

  const isAborted = useCallback(() => {
    return processorRef.current?.isAborted() ?? false;
  }, []);

  return {
    startProcessing,
    abortProcessing,
    isAborted,
    isProcessing,
  };
}
