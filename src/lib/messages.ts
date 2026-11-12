const MESSAGES: Record<string, string> = {
  USERNAME_TAKEN: "Ese nombre de usuario ya existe.",
  SELF_DEACTIVATE: "No podés desactivar tu propio usuario.",
  PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
  NO_PRICE: "Ese tipo de caja no tiene precio cargado para esa fecha.",
  NOT_HARDWARE: "Solo se pueden usar herrajes (tornillos, bisagras, cierres).",
  NOT_PLATE: "Solo se pueden usar placas.",
  REASON_REQUIRED: "Tenés que indicar un motivo.",
  INVALID_QUANTITY: "La cantidad tiene que ser un número mayor a cero.",
  EMPTY_DISCARD: "Cargá al menos un material con cantidad.",
  ORDER_LOCKED: "El pedido ya no se puede modificar en su estado actual.",
  INVALID_TRANSITION: "Ese cambio de estado no está permitido.",
  INVALID_FILE: "Archivo inválido: solo PNG, JPG, WEBP o PDF de hasta 20 MB.",
  EMPTY_ORDER: "El pedido tiene que tener al menos una línea.",
  INACTIVE_BOX_TYPE: "Ese tipo de caja está desactivado.",
  ORDER_NOT_DELIVERABLE: "El pedido no está en un estado que permita entregarlo.",
  OVER_DELIVERY: "Estás entregando más cajas de las que quedan pendientes.",
  EMPTY_DELIVERY: "La entrega tiene que tener al menos una caja.",
  PICKUP_NAME_REQUIRED: "Indicá quién retiró.",
  HAS_ACTIVE_INVOICE: "Esta entrega tiene un comprobante vigente; anulalo primero.",
  ALREADY_ANNULLED: "Ya estaba anulado.",
  INVOICE_EXISTS: "Esta entrega ya tiene un comprobante.",
  INVOICE_LOCKED: "El comprobante ya fue enviado y no se puede modificar.",
  SURCHARGE_REASON_REQUIRED: "Indicá el motivo del recargo.",
  NOT_FOUND: "No encontrado.",
  INVALID_INPUT: "Revisá los datos cargados.",
};

export function messageFor(code: string): string {
  return MESSAGES[code] ?? "Ocurrió un error inesperado.";
}
