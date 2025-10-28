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
      rateLimit: config.rateLimit 
    });
    setProcessingState(csvData.length);
    toast.info('Processing started', {
      description: `Processing ${csvData.length} rows`
    });

    try {
      // Initialize Gemini client
      const geminiClient = new GeminiClient(config.apiKey);
      
      // Initialize parallel processor
      processorRef.current = new ParallelProcessor(
        geminiClient,
        config.concurrency,
        config.rateLimit,
        config.timeout * 1000
      );

      // Execute processing
      const { success, errors } = await processorRef.current.processRows(
        csvData,
        promptTemplate,
        outputColumns,
        (current, total) => {
          updateProgress(current);
        },
        () => {
          logger.info('Processing aborted');
          toast.warning('Processing aborted');
        }
      );

      // Append results to store
      success.forEach(result => addResult(result));
      errors.forEach(error => addError(error));

      // Completion notice
      logger.info('Processing completed', { 
        success: success.length, 
        errors: errors.length 
      });
      
      if (errors.length === 0) {
        toast.success('Completed', {
          description: `Processed ${success.length} rows`
        });
      } else {
        toast.warning('Completed with errors', {
          description: `Success: ${success.length}, Errors: ${errors.length}`
        });
      }

    } catch (error) {
      logger.error('Processing error', error);
      toast.error('An error occurred during processing', {
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
