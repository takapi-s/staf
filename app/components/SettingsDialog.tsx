import { useState } from 'react';
import { useConfigStore } from '../stores/configStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Settings, Eye, EyeOff } from 'lucide-react';

export function SettingsDialog() {
  const { config, updateConfig, validateConfig } = useConfigStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleSave = () => {
    const validation = validateConfig();
    if (validation.isValid) {
      setValidationErrors([]);
      setIsOpen(false);
    } else {
      setValidationErrors(validation.errors);
    }
  };

  const handleReset = () => {
    updateConfig({
      apiKey: '',
      concurrency: 3,
      rateLimit: 60,
      timeout: 30,
      outputFolder: '',
      logLevel: 'info',
    });
    setValidationErrors([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* API Settings */}
          <Card>
            <CardHeader>
              <CardTitle>API</CardTitle>
              <CardDescription>Configure the Gemini API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="flex space-x-2">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={config.apiKey}
                    onChange={(e) => updateConfig({ apiKey: e.target.value })}
                    placeholder="AIza..."
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Processing</CardTitle>
              <CardDescription>Concurrency and rate limiting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Concurrency: {config.concurrency}</Label>
                <Slider
                  value={[config.concurrency]}
                  onValueChange={([value]) => updateConfig({ concurrency: value })}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Requests in flight (1-10)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Rate limit: {config.rateLimit} RPM</Label>
                <Slider
                  value={[config.rateLimit]}
                  onValueChange={([value]) => updateConfig({ rateLimit: value })}
                  min={1}
                  max={1000}
                  step={1}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Max requests per minute
                </p>
              </div>

              <div className="space-y-2">
                <Label>Timeout: {config.timeout}s</Label>
                <Slider
                  value={[config.timeout]}
                  onValueChange={([value]) => updateConfig({ timeout: value })}
                  min={5}
                  max={300}
                  step={5}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Max wait time per request
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Output Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Output</CardTitle>
              <CardDescription>File export settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="outputFolder">Output folder</Label>
                <Input
                  id="outputFolder"
                  value={config.outputFolder}
                  onChange={(e) => updateConfig({ outputFolder: e.target.value })}
                  placeholder="Default: Downloads folder"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logLevel">Log level</Label>
                <Select
                  value={config.logLevel}
                  onValueChange={(value: 'info' | 'debug' | 'error') => 
                    updateConfig({ logLevel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-destructive">Settings error</h4>
                  <ul className="text-sm text-destructive space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
