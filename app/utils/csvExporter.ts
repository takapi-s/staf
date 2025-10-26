import Papa from 'papaparse';
import { ProcessedRow, ErrorRow } from '../types';

export class CsvExporter {
  static exportResults(
    results: ProcessedRow[],
    errors: ErrorRow[],
    filename: string = 'gemini-results'
  ): { successCsv: string; errorCsv: string | null } {
    // 成功結果のCSV生成
    const successData = results.map(result => {
      const { _status, _error, _rawResponse, ...data } = result;
      return data;
    });

    const successCsv = Papa.unparse(successData, {
      header: true,
      delimiter: ',',
    });

    // エラー結果のCSV生成（エラーがある場合のみ）
    let errorCsv: string | null = null;
    if (errors.length > 0) {
      const errorData = errors.map(error => {
        const { _error, _rowIndex, ...data } = error;
        return {
          ...data,
          error_message: _error,
          row_index: _rowIndex,
        };
      });

      errorCsv = Papa.unparse(errorData, {
        header: true,
        delimiter: ',',
      });
    }

    return { successCsv, errorCsv };
  }

  static downloadCsv(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  static getDefaultFilename(): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `gemini-results-${timestamp}`;
  }
}
