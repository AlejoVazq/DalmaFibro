import { INVOICE_STATUS_LABEL, STATUS_COLOR, STATUS_LABEL } from "@/lib/labels";

const LABELS: Record<string, string> = { ...STATUS_LABEL, ...INVOICE_STATUS_LABEL };

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-medium ${STATUS_COLOR[status] ?? ""}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {LABELS[status] ?? status}
    </span>
  );
}
