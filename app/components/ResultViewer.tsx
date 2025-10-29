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
      console.log('[Export] Start export, type:', type);
      const filename = CsvExporter.getDefaultFilename();
      
      if (type === 'all' || type === 'success') {
        console.log('[Export] Exporting success results...');
        const { successCsv } = CsvExporter.exportResults(results, [], filename);
        console.log('[Export] CSV generated, length:', successCsv.length);
        CsvExporter.downloadCsv(successCsv, `${filename}-success`);
      }
      
      if ((type === 'all' || type === 'errors') && errors.length > 0) {
        console.log('[Export] Exporting error results...');
        const { errorCsv } = CsvExporter.exportResults([], errors, filename);
        if (errorCsv) {
          console.log('[Export] Error CSV generated, length:', errorCsv.length);
          CsvExporter.downloadCsv(errorCsv, `${filename}-errors`);
        }
      }
      
      toast.success('Export completed');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('An error occurred during export');
    }
  };

  if (results.length === 0 && errors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Run processing to see results here
          </p>
        </CardContent>
      </Card>
    );
  }

  // Expand arrays to multiple rows (CSV-like)
  const expandResults = (data: any[]) => {
    const expandedRows: any[] = [];
    
    data.forEach(row => {
      const arrayFields: { key: string; value: any[] }[] = [];
      
      // Detect array fields
      Object.keys(row).forEach(key => {
        const value = row[key];
        if (Array.isArray(value) && value.length > 0) {
          arrayFields.push({ key, value });
        }
      });
      
      if (arrayFields.length === 0) {
        // No arrays
        expandedRows.push(row);
      } else {
        // Get max array length
        const maxLength = Math.max(...arrayFields.map(f => f.value.length));
        
        // Generate rows per index
        for (let i = 0; i < maxLength; i++) {
          const newRow: any = {};
          
          // Copy non-array fields
          Object.keys(row).forEach(key => {
            if (!arrayFields.some(f => f.key === key)) {
              newRow[key] = row[key];
            }
          });
          
          // Expand array fields
          arrayFields.forEach(({ key, value }) => {
            if (i < value.length) {
              const item = value[i];
              // Expand object elements
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

  // Get expanded results and limit to first 5 rows
  const expandedResults = expandResults(results).slice(0, 5);

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
          <span>Results</span>
          <div className="flex items-center space-x-2">
            {results.length > 0 && errors.length > 0 && (
               <Button 
                 variant="outline" 
                 size="sm"
                 onClick={() => handleExport('all')}
               >
                 <Download className="h-4 w-4 mr-2" />
                Export
               </Button>
             )}
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                Success: {results.length}
              </Badge>
              {errors.length > 0 && (
                <Badge variant="destructive">
                  Errors: {errors.length}
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
              <span>Success ({results.length})</span>
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center space-x-2">
              <XCircle className="h-4 w-4" />
              <span>Errors ({errors.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="success" className="space-y-4">
            {results.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No successful results yet
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Showing first 5 rows of {expandedResults.length} total rows (from {results.length} source rows)
                  </p>
                  {errors.length === 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExport('success')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
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
                No errors
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Showing first 5 of {errors.length} errors
                  </p>
                  {results.length === 0 && (
                    <div className="space-x-2">
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExport('errors')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
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
                          <TableHead className="sticky top-0 bg-background">Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errors.slice(0, 5).map((error, index) => (
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
