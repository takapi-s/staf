import Papa from 'papaparse';
import type { ProcessedRow, ErrorRow } from '../types';

export class CsvExporter {
  static exportResults(
    results: ProcessedRow[],
    errors: ErrorRow[],
    filename: string = 'gemini-results'
  ): { successCsv: string; errorCsv: string | null } {
    // 配列を展開して複数行に変換
    const expandArrays = (row: Record<string, any>): Record<string, any>[] => {
      // 配列を含むフィールドを探す
      const arrayFields: { key: string; value: any[] }[] = [];
      Object.keys(row).forEach(key => {
        const value = row[key];
        console.log(`[expandArrays] Checking field "${key}":`, typeof value, Array.isArray(value), value);
        if (Array.isArray(value) && value.length > 0) {
          console.log(`[expandArrays] Found array field "${key}" with ${value.length} items`);
          arrayFields.push({ key, value: value });
        }
      });
      console.log(`[expandArrays] Found ${arrayFields.length} array fields:`, arrayFields.map(f => f.key));

      // 配列がない場合は元の行をそのまま返す
      if (arrayFields.length === 0) {
        return [row];
      }

      // 最大の配列の長さを取得
      const maxLength = Math.max(...arrayFields.map(f => f.value.length));

      // 各インデックスで行を生成
      const expandedRows: Record<string, any>[] = [];
      for (let i = 0; i < maxLength; i++) {
        // まず配列フィールド以外のフィールドをコピー
        const newRow: Record<string, any> = {};
        Object.keys(row).forEach(key => {
          // 配列フィールドは除外
          if (!arrayFields.some(f => f.key === key)) {
            newRow[key] = row[key];
          }
        });
        
        // 配列フィールドを展開
        arrayFields.forEach(({ key, value }) => {
          if (i < value.length) {
            const item = value[i];
            // 配列要素がオブジェクトの場合は展開
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
              Object.keys(item).forEach(subKey => {
                newRow[`${key}_${subKey}`] = item[subKey];
              });
            } else {
              newRow[key] = item;
            }
          }
        });
        
        expandedRows.push(newRow);
      }

      return expandedRows;
    };

    // 成功結果のCSV生成
    console.log('[CSV Export] Step 3: CSV変換開始');
    console.log('[CSV Export] Results count:', results.length);
    
    const expandedData: Record<string, any>[] = [];
    results.forEach((result, idx) => {
      const { _status, _error, _rawResponse, ...data } = result;
      console.log(`[CSV Export] Row ${idx}: Original data:`, JSON.stringify(data, null, 2));
      
      const rows = expandArrays(data);
      console.log(`[CSV Export] Row ${idx}: Expanded to ${rows.length} rows:`, JSON.stringify(rows, null, 2));
      
      expandedData.push(...rows);
    });

    console.log('[CSV Export] Final expanded data count:', expandedData.length);
    const successCsv = Papa.unparse(expandedData, {
      header: true,
      delimiter: ',',
    });
    console.log('[CSV Export] Step 3: CSV変換完了');

    // エラー結果のCSV生成（エラーがある場合のみ）
    let errorCsv: string | null = null;
    if (errors.length > 0) {
      const expandedErrorData: Record<string, any>[] = [];
      errors.forEach(error => {
        const { _error, _rowIndex, ...data } = error;
        const errorRow = {
          ...data,
          error_message: _error,
          row_index: _rowIndex,
        };
        const rows = expandArrays(errorRow);
        expandedErrorData.push(...rows);
      });

      errorCsv = Papa.unparse(expandedErrorData, {
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
