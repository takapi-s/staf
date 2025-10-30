import Papa from 'papaparse';
import type { ProcessedRow, ErrorRow } from '../types';

export class CsvExporter {
  static exportResults(
    results: ProcessedRow[],
    errors: ErrorRow[],
    filename: string = 'gemini-results'
  ): { successCsv: string; errorCsv: string | null } {
    // ネストされたオブジェクトをフラット化する関数
    const flattenObject = (obj: Record<string, any>, prefix = ''): Record<string, any> => {
      const flattened: Record<string, any> = {};
      
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const newKey = prefix ? `${prefix}_${key}` : key;
        
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          // ネストされたオブジェクトの場合は再帰的にフラット化
          const nested = flattenObject(value, newKey);
          Object.assign(flattened, nested);
        } else {
          flattened[newKey] = value;
        }
      });
      
      return flattened;
    };

    // 配列を展開して複数行に変換
    const expandArrays = (row: Record<string, any>): Record<string, any>[] => {
      // まずネストされたオブジェクトをフラット化
      const flattenedRow = flattenObject(row);
      
      // 配列を含むフィールドを探す
      const arrayFields: { key: string; value: any[] }[] = [];
      Object.keys(flattenedRow).forEach(key => {
        const value = flattenedRow[key];
        console.log(`[expandArrays] Checking field "${key}":`, typeof value, Array.isArray(value));
        if (Array.isArray(value) && value.length > 0) {
          console.log(`[expandArrays] Found array field "${key}" with ${value.length} items`);
          arrayFields.push({ key, value: value });
        }
      });
      console.log(`[expandArrays] Found ${arrayFields.length} array fields:`, arrayFields.map(f => f.key));

      // 配列がない場合は元の行をそのまま返す
      if (arrayFields.length === 0) {
        return [flattenedRow];
      }

      // 最大の配列の長さを取得
      const maxLength = Math.max(...arrayFields.map(f => f.value.length));

      // 各インデックスで行を生成
      const expandedRows: Record<string, any>[] = [];
      for (let i = 0; i < maxLength; i++) {
        // まず配列フィールド以外のフィールドをコピー
        const newRow: Record<string, any> = {};
        Object.keys(flattenedRow).forEach(key => {
          // 配列フィールドは除外
          if (!arrayFields.some(f => f.key === key)) {
            newRow[key] = flattenedRow[key];
          }
        });
        
        // 配列フィールドを展開
        arrayFields.forEach(({ key, value }) => {
          if (i < value.length) {
            const item = value[i];
            // 配列要素がオブジェクトの場合は展開
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
              const nested = flattenObject(item, key);
              Object.assign(newRow, nested);
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
      
      // resultフィールドが生テキストの場合、それを除去
      const cleanedData = { ...data };
      if (cleanedData.result && typeof cleanedData.result === 'string') {
        // resultフィールドだけがあり、他のデータがない場合は除外
        const otherKeys = Object.keys(cleanedData).filter(k => k !== 'result' && !k.startsWith('_'));
        if (otherKeys.length === 0) {
          delete cleanedData.result;
        }
      }
      
      const rows = expandArrays(cleanedData);
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
