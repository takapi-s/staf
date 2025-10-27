import { useState, useEffect } from 'react';
import { check, installUpdate, onUpdaterEvent } from '@tauri-apps/plugin-updater';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Progress } from './ui/progress';
import { Download, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function UpdateChecker() {
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [updateVersion, setUpdateVersion] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const unlisten = onUpdaterEvent(({ error, status }) => {
      console.log('Updater event:', { error, status });
      
      if (error) {
        console.error('Updater error:', error);
        toast.error(`更新エラー: ${error}`);
        setIsInstalling(false);
        return;
      }

      if (status) {
        console.log('Update status:', status);
        
        if (status.status === 'DOWNLOADING') {
          const downloaded = status.chunkLength || 0;
          const total = status.contentLength || 0;
          if (total > 0) {
            const percent = Math.round((downloaded / total) * 100);
            setProgress(percent);
          }
        } else if (status.status === 'DONE') {
          setProgress(100);
          setIsInstalling(false);
          toast.success('更新のダウンロードが完了しました');
        }
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const checkForUpdates = async () => {
    try {
      setIsChecking(true);
      const update = await check();
      
      if (update) {
        setUpdateAvailable(true);
        setUpdateVersion(update.version);
        setShowDialog(true);
        toast.info(`新しいバージョン ${update.version} が利用可能です`);
      } else {
        toast.success('アプリは最新の状態です');
      }
    } catch (error) {
      console.error('Update check error:', error);
      toast.error('更新の確認に失敗しました');
    } finally {
      setIsChecking(false);
    }
  };

  const installUpdateNow = async () => {
    try {
      setIsInstalling(true);
      setProgress(0);
      await installUpdate();
      // インストール完了後、アプリが再起動される
    } catch (error) {
      console.error('Install error:', error);
      toast.error('更新のインストールに失敗しました');
      setIsInstalling(false);
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
            確認中...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            更新を確認
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新が利用可能です</DialogTitle>
            <DialogDescription>
              新しいバージョン {updateVersion} がリリースされました。
            </DialogDescription>
          </DialogHeader>

          {isInstalling && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {progress}% ダウンロード中...
              </p>
            </div>
          )}

          <DialogFooter>
            {!isInstalling && (
              <>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  後で
                </Button>
                <Button onClick={installUpdateNow}>
                  <Download className="mr-2 h-4 w-4" />
                  今すぐ更新
                </Button>
              </>
            )}
            {isInstalling && progress === 100 && (
              <Button disabled>
                <CheckCircle className="mr-2 h-4 w-4" />
                完了（再起動します）
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
