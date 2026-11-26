// Service worker registration and the browser's install prompt.
import { useEffect, useState } from "react";

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Returns an install() function while the browser offers installation. */
export function useInstallPrompt(): (() => Promise<boolean>) | null {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  if (!event) return null;
  return async () => {
    await event.prompt();
    const { outcome } = await event.userChoice;
    setEvent(null);
    return outcome === "accepted";
  };
}
