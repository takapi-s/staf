import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '../stores/appStore';
import { useConfigStore } from '../stores/configStore';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { logger } from '../utils/logger';

export function useGeminiProcessor() {
  const { 
    csvData, 
    promptTemplate, 
    outputColumns,
    isProcessing, 
    startProcessing: setProcessingState, 
    updateProgress, 
    updateActiveRequests,
    addResult, 
    addError, 
    finishProcessing 
  } = useAppStore();
  
  const { config } = useConfigStore();
  const unsubscribesRef = useRef<Array<() => void>>([]);

  const startProcessing = useCallback(async () => {
    if (csvData.length === 0) {
      const error = new Error('No CSV data');
      logger.error('Start error', error);
      toast.error('Please upload a CSV file');
      throw error;
    }

    if (!promptTemplate.trim()) {
      const error = new Error('Prompt is empty');
      logger.error('Start error', error);
      toast.error('Please enter a prompt');
      throw error;
    }

    if (!config.apiKey.trim()) {
      const error = new Error('API key is missing');
      logger.error('Start error', error);
      toast.error('Set your API key in Settings');
      throw error;
    }

    // ログレベル設定
    logger.setLogLevel(config.logLevel);

    // 処理開始
    logger.info('Processing started', { 
      totalRows: csvData.length, 
      concurrency: config.concurrency,
      rateLimit: config.rateLimit,
      timeoutSecs: config.timeout,
      hasPrompt: !!promptTemplate.trim(),
    });
    setProcessingState(csvData.length);
    toast.info('Processing started', {
      description: `Processing ${csvData.length} rows`
    });

    try {
      // Tauriイベント購読
      logger.debug('Subscribing processing events');
      const unsubs: Array<() => void> = [];
      unsubs.push(await listen('processing:progress', (e: any) => {
        const { current, total } = e.payload as { current: number; total: number };
        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        logger.debug('Progress update', { current, total, percent });
        updateProgress(current);
      }));
      // 進行中リクエスト数イベント
      unsubs.push(await listen('processing:active_requests', (e: any) => {
        const { count } = e.payload as { count: number };
        logger.debug('Active requests update', { count });
        updateActiveRequests(count);
      }));
      // デバッグイベント
      unsubs.push(await listen('processing:debug', (e: any) => {
        const msg = e.payload as string;
        logger.debug('Debug', msg);
      }));
      unsubs.push(await listen('processing:row', (e: any) => {
        const payload = e.payload as any;
        if (payload.status === 'success') {
          logger.debug('Row success', { index: payload.index, sample: JSON.stringify(payload.data)?.slice(0, 200) });
          const base = { ...csvData[payload.index] } as Record<string, any>;
          const data = payload.data;
          let merged: Record<string, any> = {};
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            merged = { ...base, ...data };
          } else if (Array.isArray(data)) {
            // トップ5に制限
            const top5 = data.slice(0, 5);
            merged = { ...base, result_items: top5 };
          } else {
            merged = { ...base, result_value: data };
          }
          addResult({ ...merged, _status: 'success', _rawResponse: payload.raw });
        } else {
          logger.warn('Row error', { index: payload.index, error: payload.error });
          addError({ ...csvData[payload.index], _error: payload.error ?? 'Unknown error', _rowIndex: payload.index });
        }
      }));
      unsubs.push(await listen('processing:aborted', () => {
        logger.info('Processing aborted');
        toast.warning('Processing aborted');
      }));

      unsubscribesRef.current = unsubs;

      // バックエンド起動
      logger.debug('Dispatching backend command process_rows', {
        totalRows: csvData.length,
        config: {
          concurrency: config.concurrency,
          rate_limit_rpm: config.rateLimit,
          timeout_secs: config.timeout,
        }
      });

      await invoke('process_rows', {
        rows: csvData,
        config: {
          api_key: config.apiKey,
          concurrency: config.concurrency,
          rate_limit_rpm: config.rateLimit,
          timeout_secs: config.timeout,
          prompt_template: promptTemplate,
        },
      } as any);

      logger.debug('Backend command dispatched');

      // 完了待ちイベント
      await new Promise<void>((resolve) => {
        listen('processing:done', (e: any) => {
          const { success, errors } = e.payload as { success: number; errors: number };
          logger.info('Processing completed', { success, errors });
          if (errors === 0) {
            toast.success('Completed', { description: `Processed ${success} rows` });
          } else {
            toast.warning('Completed with errors', { description: `Success: ${success}, Errors: ${errors}` });
          }
          resolve();
        }).then((unsub) => unsubs.push(unsub));
      });

      // 以降の完了ログ/トーストは done イベント側で実施済み

    } catch (error) {
      logger.error('Processing error', error);
      toast.error('An error occurred during processing', {
        description: logger.getUserMessage(error)
      });
      throw error;
    } finally {
      finishProcessing();
      unsubscribesRef.current.forEach((u) => u());
      unsubscribesRef.current = [];
    }
  }, [
    csvData, 
    promptTemplate, 
    outputColumns,
    config, 
    setProcessingState, 
    updateProgress, 
    updateActiveRequests,
    addResult, 
    addError, 
    finishProcessing
  ]);

  const abortProcessing = useCallback(() => {
    invoke('abort_processing');
  }, []);

  const isAborted = useCallback(() => {
    return false;
  }, []);

  return {
    startProcessing,
    abortProcessing,
    isAborted,
    isProcessing,
  };
}
