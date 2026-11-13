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
  RECIBIDO: "bg-muted text-foreground",
  EN_PRODUCCION: "bg-info/12 text-info",
  LISTO: "bg-success/12 text-success",
  PARCIAL: "bg-warning/15 text-warning",
  ENTREGADO: "bg-muted text-muted-foreground",
  CANCELADO: "bg-destructive/10 text-destructive",
  EMITIDO: "bg-muted text-foreground",
  ENVIADO: "bg-info/12 text-info",
  PAGADO: "bg-success/12 text-success",
  ANULADO: "bg-destructive/10 text-destructive",
};

export const PRIORITY_COLOR: Record<"ALTA" | "MEDIA" | "BAJA", string> = {
  ALTA: "bg-destructive/10 text-destructive",
  MEDIA: "bg-warning/15 text-warning",
  BAJA: "bg-muted text-muted-foreground",
};
export const MOVEMENT_LABEL: Record<string, string> = {
  INGRESO: "Ingreso",
  CONSUMO: "Consumo por entrega",
  DESCARTE: "Descarte (merma)",
  AJUSTE: "Ajuste",
  LLEGADA_PLACA: "Llegada a Dalmata",
  RETIRO_PLACA: "Retiro de placas",
  USO_PLACA: "Uso de placas",
  REVERSION: "Reversión",
};

export const LOCATION_LABEL = { TALLER: "Taller", DALMATA: "Dalmata (destilería)" } as const;
