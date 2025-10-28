import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { CsvExporter } from '../utils/csvExporter';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Download, FileText, AlertCircle } from 'lucide-react';

interface ExportDialogProps {
  children: React.ReactNode;
}

export function ExportDialog({ children }: ExportDialogProps) {
  const { results, errors } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [filename, setFilename] = useState(CsvExporter.getDefaultFilename());
  const [isExporting, setIsExporting] = useState(false);

  const canExport = results.length > 0 || errors.length > 0;

  const handleExport = async () => {
    if (!canExport) return;

    setIsExporting(true);
    
    try {
      const { successCsv, errorCsv } = CsvExporter.exportResults(results, errors, filename);
      
      // Download success results
      CsvExporter.downloadCsv(successCsv, `${filename}-success`);
      
      // Download error results if present
      if (errorCsv) {
        CsvExporter.downloadCsv(errorCsv, `${filename}-errors`);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('An error occurred during export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFilenameChange = (value: string) => {
    // ファイル名に使用できない文字を除去
    const sanitized = value.replace(/[<>:"/\\|?*]/g, '');
    setFilename(sanitized);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Results</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Export targets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Targets</CardTitle>
              <CardDescription>Files to be generated</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Success results</span>
                </div>
                <Badge variant="secondary">{results.length}</Badge>
              </div>
              
              {errors.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">Error results</span>
                  </div>
                  <Badge variant="destructive">{errors.length}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filename */}
          <div className="space-y-2">
            <Label htmlFor="filename">Filename</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => handleFilenameChange(e.target.value)}
              placeholder="gemini-results"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Success: {filename}-success.csv
              {errors.length > 0 && `, Errors: ${filename}-errors.csv`}
            </p>
          </div>

          {/* Notes */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Notes</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Success and error results are exported separately</li>
                  <li>• Files are saved to your browser Downloads folder</li>
                  <li>• Large data may take longer to export</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleExport}
              disabled={!canExport || isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
