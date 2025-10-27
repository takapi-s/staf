import { useAppStore } from '../stores/appStore';
import { CsvExporter } from '../utils/csvExporter';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CheckCircle, XCircle, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';

export function ResultViewer() {
  const { results, errors, csvHeaders } = useAppStore();

  const handleExport = (type: 'success' | 'errors' | 'all') => {
    try {
      console.log('[Export] エクスポート開始, type:', type);
      const filename = CsvExporter.getDefaultFilename();
      
      if (type === 'all' || type === 'success') {
        console.log('[Export] 成功結果をエクスポート中...');
        const { successCsv } = CsvExporter.exportResults(results, [], filename);
        console.log('[Export] CSV生成完了, length:', successCsv.length);
        CsvExporter.downloadCsv(successCsv, `${filename}-success`);
      }
      
      if ((type === 'all' || type === 'errors') && errors.length > 0) {
        console.log('[Export] エラー結果をエクスポート中...');
        const { errorCsv } = CsvExporter.exportResults([], errors, filename);
        if (errorCsv) {
          console.log('[Export] エラーCSV生成完了, length:', errorCsv.length);
          CsvExporter.downloadCsv(errorCsv, `${filename}-errors`);
        }
      }
      
      toast.success('エクスポートが完了しました');
    } catch (error) {
      console.error('エクスポートエラー:', error);
      toast.error('エクスポート中にエラーが発生しました');
    }
  };

  if (results.length === 0 && errors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>処理結果</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            処理を実行すると結果がここに表示されます
          </p>
        </CardContent>
      </Card>
    );
  }

  // 配列を展開して複数行に変換（CSVと同様）
  const expandResults = (data: any[]) => {
    const expandedRows: any[] = [];
    
    data.forEach(row => {
      const arrayFields: { key: string; value: any[] }[] = [];
      
      // 配列フィールドを検出
      Object.keys(row).forEach(key => {
        const value = row[key];
        if (Array.isArray(value) && value.length > 0) {
          arrayFields.push({ key, value });
        }
      });
      
      if (arrayFields.length === 0) {
        // 配列がない場合はそのまま
        expandedRows.push(row);
      } else {
        // 最大の配列の長さを取得
        const maxLength = Math.max(...arrayFields.map(f => f.value.length));
        
        // 各インデックスで行を生成
        for (let i = 0; i < maxLength; i++) {
          const newRow: any = {};
          
          // 配列以外のフィールドをコピー
          Object.keys(row).forEach(key => {
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
      }
    });
    
    return expandedRows;
  };

  // 展開された結果を取得
  const expandedResults = expandResults(results);

  const getResultColumns = () => {
    if (expandedResults.length === 0) return [];
    
    const firstResult = expandedResults[0];
    return Object.keys(firstResult).filter(key => !key.startsWith('_'));
  };

  const getErrorColumns = () => {
    if (errors.length === 0) return [];
    
    const firstError = errors[0];
    return Object.keys(firstError).filter(key => !key.startsWith('_'));
  };

  const resultColumns = getResultColumns();
  const errorColumns = getErrorColumns();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>処理結果</span>
          <div className="flex items-center space-x-2">
                         {results.length > 0 && errors.length > 0 && (
               <Button 
                 variant="outline" 
                 size="sm"
                 onClick={() => handleExport('all')}
               >
                 <Download className="h-4 w-4 mr-2" />
                 エクスポート
               </Button>
             )}
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                成功: {results.length}
              </Badge>
              {errors.length > 0 && (
                <Badge variant="destructive">
                  エラー: {errors.length}
                </Badge>
              )}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="success" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="success" className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>成功 ({results.length})</span>
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center space-x-2">
              <XCircle className="h-4 w-4" />
              <span>エラー ({errors.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="success" className="space-y-4">
            {results.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                成功した結果がありません
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {expandedResults.length}件の結果を表示中 (元データ: {results.length}件)
                  </p>
                  {errors.length === 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExport('success')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      エクスポート
                    </Button>
                  )}
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {resultColumns.map((column, index) => (
                            <TableHead key={index} className="sticky top-0 bg-background">
                              {column}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expandedResults.map((result, index) => (
                          <TableRow key={index}>
                            {resultColumns.map((column, colIndex) => {
                              const value = result[column];
                              const displayValue = String(value || '');
                              
                              return (
                                <TableCell key={colIndex} className="max-w-48 truncate" title={displayValue}>
                                  {displayValue}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            {errors.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                エラーはありません
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {errors.length}件のエラーを表示中
                  </p>
                  {results.length === 0 && (
                    <div className="space-x-2">
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        再実行
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExport('errors')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        エクスポート
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {errorColumns.map((column, index) => (
                            <TableHead key={index} className="sticky top-0 bg-background">
                              {column}
                            </TableHead>
                          ))}
                          <TableHead className="sticky top-0 bg-background">エラー</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errors.map((error, index) => (
                          <TableRow key={index}>
                            {errorColumns.map((column, colIndex) => {
                              const value = error[column];
                              let displayValue = '';
                              
                              if (Array.isArray(value)) {
                                displayValue = JSON.stringify(value);
                              } else if (typeof value === 'object' && value !== null) {
                                displayValue = JSON.stringify(value);
                              } else {
                                displayValue = String(value || '');
                              }
                              
                              return (
                                <TableCell key={colIndex} className="max-w-48 truncate" title={displayValue}>
                                  {displayValue}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-red-600 max-w-48">
                              <div className="truncate" title={error._error}>
                                {error._error}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
