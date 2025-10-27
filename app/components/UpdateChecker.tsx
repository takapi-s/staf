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
    if (!updateInstance) return;

    try {
      setIsInstalling(true);
      setProgress(20);

      // ダウンロードとインストール
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
      toast.success('更新が完了しました。アプリを再起動します...');
      
      // アプリは自動的に再起動されます
    } catch (error) {
      console.error('Install error:', error);
      toast.error('更新のインストールに失敗しました');
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
              <br />
              今すぐインストールしますか？
            </DialogDescription>
          </DialogHeader>

          {isInstalling && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {progress}% インストール中...
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
