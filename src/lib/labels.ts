export const STATUS_LABEL = {
  RECIBIDO: "Recibido",
  EN_PRODUCCION: "En producción",
  LISTO: "Listo para retirar",
  PARCIAL: "Entregado parcialmente",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
} as const;

export const PRIORITY_LABEL = { ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" } as const;

export const PICKUP_LABEL = {
  FLETERO: "Fletero",
  LOGISTICA: "Empresa de logística",
  PERSONAL_DALMATA: "Personal de Dalmata",
  ENTREGA_PROPIA: "Entrega propia",
} as const;

export const INVOICE_STATUS_LABEL = {
  EMITIDO: "Emitido",
  ENVIADO: "Enviado a Dalmata",
  PAGADO: "Pagado",
  ANULADO: "Anulado",
} as const;

export const STATUS_COLOR: Record<string, string> = {
  RECIBIDO: "bg-slate-100 text-slate-800",
  EN_PRODUCCION: "bg-blue-100 text-blue-800",
  LISTO: "bg-green-100 text-green-800",
  PARCIAL: "bg-amber-100 text-amber-800",
  ENTREGADO: "bg-slate-200 text-slate-600",
  CANCELADO: "bg-red-100 text-red-700",
  EMITIDO: "bg-slate-100 text-slate-800",
  ENVIADO: "bg-blue-100 text-blue-800",
  PAGADO: "bg-green-100 text-green-800",
  ANULADO: "bg-red-100 text-red-700",
};
