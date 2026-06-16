"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Share, SquarePlus, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "cafe-install-dismissed";
const VISITS_KEY = "cafe-install-visits";
const SNOOZE_KEY = "cafe-install-snooze";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000; // re-prompt at most once every 2 weeks

/**
 * Gentle, dismissible "add to home screen" prompt for a mobile-first PWA.
 * Two variants:
 *  - Android/Chromium: uses the captured `beforeinstallprompt` event to offer
 *    a real one-tap install button.
 *  - iOS Safari (which has no install event): shows the manual Share → "Add to
 *    Home Screen" instructions.
 * Hidden when already installed (standalone) or previously dismissed.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Frequency cap so the banner never nags: never after an explicit dismiss,
    // never on the first-ever visit, and at most once every couple of weeks.
    let dismissedForever = false;
    let snoozed = false;
    let firstVisit = false;
    try {
      dismissedForever = window.localStorage.getItem(DISMISS_KEY) === "1";
      const snoozeUntil = Number(window.localStorage.getItem(SNOOZE_KEY) || 0);
      snoozed = Date.now() < snoozeUntil;
      const visits = Number(window.localStorage.getItem(VISITS_KEY) || 0) + 1;
      window.localStorage.setItem(VISITS_KEY, String(visits));
      firstVisit = visits < 2;
    } catch {
      // Storage blocked — just don't show.
      return;
    }
    if (dismissedForever || snoozed || firstVisit) return;

    const nav = window.navigator as Navigator & { standalone?: boolean };
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (isStandalone) return;

    const ua = window.navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|android/i.test(ua);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Delay so we don't compete with first paint / initial interaction. iOS has
    // no install event, so surface the manual instructions here instead.
    const t = window.setTimeout(() => {
      if (isIos && isSafari) setShowIos(true);
      setVisible(true);
      // Showing counts as a prompt — snooze the next one.
      try {
        window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
      } catch {
        // ignore
      }
    }, 4000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  if (!visible || (!deferred && !showIos)) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-24 z-[9990] mx-auto w-full max-w-md px-4 md:hidden"
      role="dialog"
      aria-label="התקנת האפליקציה"
    >
      <div
        className="flex items-center gap-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 shadow-2xl"
        dir="rtl"
      >
        <Image
          src="/images/ca_fe_logo.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-xl object-contain"
        />
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-bold text-[#0C4A6E] dark:text-blue-200"
            style={{ fontFamily: "var(--font-aran), sans-serif" }}
          >
            התקינו את Ca-Fe
          </p>
          {deferred ? (
            <p className="text-xs text-slate-500 dark:text-slate-400" style={{ fontFamily: "var(--font-aran), sans-serif" }}>
              גישה מהירה ממסך הבית, גם ללא אינטרנט
            </p>
          ) : (
            <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400" style={{ fontFamily: "var(--font-aran), sans-serif" }}>
              הקישו על
              <Share className="inline h-3.5 w-3.5 text-[#0071E3]" />
              ואז
              <SquarePlus className="inline h-3.5 w-3.5 text-[#0071E3]" />
              «הוסף למסך הבית»
            </p>
          )}
        </div>
        {deferred && (
          <button
            type="button"
            onClick={install}
            className="shrink-0 rounded-full bg-[#0071E3] px-4 py-2 text-sm font-medium text-white hover:bg-[#0062c4] transition-colors"
            style={{ fontFamily: "var(--font-aran), sans-serif" }}
          >
            התקן
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="סגור"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0C4A6E] dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
