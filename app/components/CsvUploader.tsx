import { useCallback, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Upload, FileText, X } from 'lucide-react';
import Papa from 'papaparse';

interface CsvUploaderProps {
  onFileLoaded?: () => void;
}

export function CsvUploader({ onFileLoaded }: CsvUploaderProps) {
  const { csvData, csvHeaders, setCsvData } = useAppStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setIsLoading(true);
    
    try {
      const text = await file.text();
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error('CSV parse error:', results.errors);
            alert('An error occurred while parsing the CSV');
            return;
          }

          const data = results.data as Record<string, any>[];
          const headers = Object.keys(data[0] || {});
          
          setCsvData(data, headers);
          onFileLoaded?.();
        },
        error: (error: any) => {
          console.error('CSV load error:', error);
          alert('An error occurred while loading the CSV');
        }
      });
    } catch (error) {
      console.error('File read error:', error);
      alert('An error occurred while reading the file');
    } finally {
      setIsLoading(false);
    }
  }, [setCsvData, onFileLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const clearData = useCallback(() => {
    setCsvData([], []);
  }, [setCsvData]);

  if (csvData.length > 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">CSV file loaded</p>
                <p className="text-sm text-muted-foreground">
                  {csvData.length} rows, {csvHeaders.length} columns
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearData}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">
            Drag & drop a CSV file
          </h3>
          <p className="text-muted-foreground mb-4">
            Or choose a file using the button below
          </p>
          
          <div className="space-y-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              id="csv-file-input"
              disabled={isLoading}
            />
            <label htmlFor="csv-file-input">
              <Button asChild disabled={isLoading}>
                <span>
                  {isLoading ? 'Loading...' : 'Select file'}
                </span>
              </Button>
            </label>
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            Supported format: CSV (.csv)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
