import { Toaster } from './ui/sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      expand={true}
      richColors={true}
      closeButton={true}
    />
  );
}
