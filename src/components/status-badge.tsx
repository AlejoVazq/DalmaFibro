import { INVOICE_STATUS_LABEL, STATUS_COLOR, STATUS_LABEL } from "@/lib/labels";

const LABELS: Record<string, string> = { ...STATUS_LABEL, ...INVOICE_STATUS_LABEL };

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[status] ?? ""}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
