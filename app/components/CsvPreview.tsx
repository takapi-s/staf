import { useAppStore } from '../stores/appStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';

export function CsvPreview() {
  const { csvData, csvHeaders } = useAppStore();

  if (csvData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CSV Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Please upload a CSV file
          </p>
        </CardContent>
      </Card>
    );
  }

  const previewData = csvData.slice(0, 10); // 最初の10行のみ表示
  const hasMore = csvData.length > 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>CSV Preview</span>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {csvData.length} rows
            </Badge>
            <Badge variant="outline">
              {csvHeaders.length} columns
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Column info */}
          <div>
            <h4 className="text-sm font-medium mb-2">Columns</h4>
            <div className="flex flex-wrap gap-2">
              {csvHeaders.map((header, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {header}
                </Badge>
              ))}
            </div>
          </div>

          {/* Data table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {csvHeaders.map((header, index) => (
                      <TableHead key={index} className="sticky top-0 bg-background">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {csvHeaders.map((header, colIndex) => (
                        <TableCell key={colIndex} className="max-w-48 truncate">
                          {String(row[header] || '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {hasMore && (
            <p className="text-sm text-muted-foreground text-center">
              ... plus {csvData.length - 10} rows
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
