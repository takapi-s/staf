import { useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Progress } from './ui/progress';
import { Download, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function UpdateChecker() {
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [updateVersion, setUpdateVersion] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [updateInstance, setUpdateInstance] = useState<any>(null);

  const checkForUpdates = async () => {
    try {
      setIsChecking(true);
      const update = await check();
      
      if (update) {
        setUpdateInstance(update);
        setUpdateVersion(update.version);
        setShowDialog(true);
        toast.info(`New version ${update.version} is available`);
      } else {
        toast.success('App is up to date');
      }
    } catch (error) {
      console.error('Update check error:', error);
      toast.error('Failed to check for updates');
    } finally {
      setIsChecking(false);
    }
  };

  const installUpdateNow = async () => {
    if (!updateInstance) return;

    try {
      setIsInstalling(true);
      setProgress(20);

      // Download and install
      await updateInstance.downloadAndInstall((event: any) => {
        console.log('Update event:', event);
        
        if (event?.status) {
          if (event.status === 'DOWNLOADING') {
            const downloaded = event.chunkLength || 0;
            const total = event.contentLength || 0;
            if (total > 0) {
              const percent = Math.round((downloaded / total) * 100);
              setProgress(20 + Math.round(percent * 0.8)); // 20-100%
            }
          } else if (event.status === 'INSTALLING') {
            setProgress(95);
          }
        }
      });

      setProgress(100);
      toast.success('Update completed. Restarting app...');
      
      // App will restart automatically
    } catch (error) {
      console.error('Install error:', error);
      toast.error('Failed to install update');
      setIsInstalling(false);
      setProgress(0);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={checkForUpdates}
        disabled={isChecking || isInstalling}
      >
        {isChecking ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Check for Updates
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Available</DialogTitle>
            <DialogDescription>
              New version {updateVersion} has been released.
              <br />
              Would you like to install it now?
            </DialogDescription>
          </DialogHeader>

          {isInstalling && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {progress}% Installing...
              </p>
            </div>
          )}

          <DialogFooter>
            {!isInstalling && (
              <>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Later
                </Button>
                <Button onClick={installUpdateNow}>
                  <Download className="mr-2 h-4 w-4" />
                  Update Now
                </Button>
              </>
            )}
            {isInstalling && progress === 100 && (
              <Button disabled>
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete (Restarting)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
