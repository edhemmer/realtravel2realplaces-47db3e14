import { useState, useEffect } from "react";
import { Download, Smartphone, CheckCircle2, Share, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">App Installed!</h1>
            <p className="text-muted-foreground">
              Real Travel 2 Real Places is installed on your device. Open it from your home screen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="text-center space-y-3">
            <Smartphone className="h-14 w-14 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Install the App</h1>
            <p className="text-muted-foreground text-sm">
              Add Real Travel 2 Real Places to your home screen for the best experience — fast loading, offline access, and no browser chrome.
            </p>
          </div>

          {deferredPrompt && (
            <Button onClick={handleInstall} className="w-full gap-2" size="lg">
              <Download className="h-5 w-5" />
              Install Now
            </Button>
          )}

          {isIOS && (
            <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
              <p className="text-sm font-medium text-foreground">Install on iPhone / iPad:</p>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">1.</span>
                  Tap the <Share className="inline h-4 w-4 text-primary" /> Share button in Safari
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">2.</span>
                  Scroll down and tap <span className="font-medium text-foreground">"Add to Home Screen"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">3.</span>
                  Tap <span className="font-medium text-foreground">"Add"</span> to confirm
                </li>
              </ol>
            </div>
          )}

          {!deferredPrompt && !isIOS && (
            <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
              <p className="text-sm font-medium text-foreground">Install from your browser:</p>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">1.</span>
                  Tap the <MoreVertical className="inline h-4 w-4 text-primary" /> menu in your browser
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">2.</span>
                  Select <span className="font-medium text-foreground">"Install app"</span> or <span className="font-medium text-foreground">"Add to Home Screen"</span>
                </li>
              </ol>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Works on all phones and tablets. No app store needed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
