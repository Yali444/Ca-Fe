"use client";

import { useId, useRef, useState } from "react";
import type { LocationDiagnostics as Diagnostics } from "@/lib/geolocation-diagnostics";

const permissionLabels = {
  granted: "מותרת", denied: "חסומה", prompt: "נדרש אישור",
  checking: "בבדיקה", unsupported: "הדפדפן לא מספק מידע", unknown: "לא ידוע",
};
const policyLabels = {
  allowed: "מאפשרת מיקום", blocked: "חוסמת מיקום",
  unsupported: "הדפדפן לא מספק מידע", unknown: "לא ידוע",
};

export function LocationDiagnostics({ diagnostics }: { diagnostics: Diagnostics }) {
  const reportId = useId();
  const reportRef = useRef<HTMLTextAreaElement>(null);
  const [copyResult, setCopyResult] = useState<{ report: string; success: boolean } | null>(null);
  const report = JSON.stringify(diagnostics, null, 2);
  // A late permission result can change the report after copying. Do not
  // falsely claim that the updated report is already on the clipboard.
  const copyState = copyResult?.report === report ? copyResult.success : null;

  const copyReport = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(report);
      setCopyResult({ report, success: true });
    } catch {
      // Keep the full report available on iOS even if clipboard access fails.
      reportRef.current?.focus();
      reportRef.current?.select();
      reportRef.current?.setSelectionRange(0, report.length);
      setCopyResult({ report, success: false });
    }
  };

  return (
    <details className="w-full min-w-0 border-t border-current/15" dir="rtl">
      <summary className="min-h-[44px] cursor-pointer content-center rounded-md font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
        פרטי תקלה
      </summary>
      <div className="space-y-2 pb-1">
        <p>אפשר להעתיק ולשלוח לנו את הדוח כדי לעזור באבחון. הדוח אינו כולל את המיקום שלך.</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt>הרשאה לפי הדפדפן</dt><dd>{permissionLabels[diagnostics.permission.state]}</dd>
          <dt>מדיניות האתר</dt><dd>{policyLabels[diagnostics.policy.state]}</dd>
        </dl>
        <p dir="ltr" className="break-words text-left font-mono text-xs [overflow-wrap:anywhere]">
          {diagnostics.error.name}: {diagnostics.error.message}
        </p>
        <label htmlFor={reportId} className="block">דוח טכני להעתקה</label>
        <textarea
          id={reportId}
          ref={reportRef}
          value={report}
          readOnly
          dir="ltr"
          rows={5}
          spellCheck={false}
          className="block w-full resize-none rounded-lg border border-current/20 bg-transparent p-2 text-left font-mono text-base focus-visible:outline-2 focus-visible:outline-brand"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={copyReport} className="min-h-[44px] rounded-lg border border-current px-3 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            {copyState === true ? "הועתק" : "העתקת פרטי התקלה"}
          </button>
          <span role="status" aria-live="polite">
            {copyState === true ? "הדוח הועתק. אפשר להדביק ולשלוח." : copyState === false ? "ההעתקה האוטומטית לא זמינה. הטקסט מסומן להעתקה ידנית." : ""}
          </span>
        </div>
      </div>
    </details>
  );
}
