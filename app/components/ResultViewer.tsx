import { useAppStore } from '../stores/appStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CheckCircle, XCircle, RefreshCw, Download } from 'lucide-react';

export function ResultViewer() {
  const { results, errors, csvHeaders } = useAppStore();

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

  const getResultColumns = () => {
    if (results.length === 0) return [];
    
    const firstResult = results[0];
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
            <Badge variant="secondary">
              成功: {results.length}
            </Badge>
            {errors.length > 0 && (
              <Badge variant="destructive">
                エラー: {errors.length}
              </Badge>
            )}
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
                    {results.length}件の結果を表示中
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    エクスポート
                  </Button>
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
                        {results.map((result, index) => (
                          <TableRow key={index}>
                            {resultColumns.map((column, colIndex) => (
                              <TableCell key={colIndex} className="max-w-48 truncate">
                                {String(result[column] || '')}
                              </TableCell>
                            ))}
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
                  <div className="space-x-2">
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      再実行
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      エクスポート
                    </Button>
                  </div>
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
                            {errorColumns.map((column, colIndex) => (
                              <TableCell key={colIndex} className="max-w-48 truncate">
                                {String(error[column] || '')}
                              </TableCell>
                            ))}
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
