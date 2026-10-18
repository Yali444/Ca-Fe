import type { BusinessDetails } from "@/types/business";

const BUSINESS_LABELS = { cafe: "בית קפה", roastery: "בית קלייה", workshops: "סדנאות קפה" };
const VISIT_LABELS = { public: "קבלת קהל", appointment: "בתיאום מראש", online: "אונליין בלבד" };

export function BusinessInfo({ business }: { business: BusinessDetails & { isOnlineOnly?: boolean } }) {
  const visitLabel = business.visitMode
    ? VISIT_LABELS[business.visitMode]
    : business.isOnlineOnly ? VISIT_LABELS.online : null;
  if (!business.businessType && !visitLabel) return null;
  return (
    <dl className="space-y-2 text-sm">
      {business.businessType && (
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted-foreground">סוג העסק:</dt>
          <dd className="font-semibold text-foreground">{BUSINESS_LABELS[business.businessType]}</dd>
        </div>
      )}
      {visitLabel && (
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted-foreground">ביקור במקום:</dt>
          <dd className="font-semibold text-foreground">{business.visitNote || visitLabel}</dd>
        </div>
      )}
    </dl>
  );
}
