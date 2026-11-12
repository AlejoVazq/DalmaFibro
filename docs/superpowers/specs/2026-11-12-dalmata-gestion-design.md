# Gestión Dalmata — Documento de diseño

Fecha: 2026-11-12
Estado: borrador para aprobación

## 1. Intención y por qué

El taller (Alejo y su papá) fabrica cajas de madera y complementos para **Dalmata**, un vendedor de regalos empresariales. Dalmata provee los materiales; el taller cobra la mano de obra por unidad.

Hoy todo es manual:
- Dalmata pasa los pedidos (tipos de caja, cantidades, logos con mockup) por mensaje.
- Dalmata pregunta "cada tanto" por el stock, y eso le molesta al papá: debería ser automático.
- Cuando las cajas están listas, el papá avisa y manda **foto de una factura hecha a mano**.
- No hay registro ordenado para contabilidad.

La app reemplaza ese circuito por un único lugar compartido donde Dalmata carga pedidos y ve stock y comprobantes, y el taller lleva producción, stock, despachos, comprobantes y cobros, con exportación a Excel para contabilidad.

**Foco de esta etapa: funcionalidad.** Lo visual se trabaja al final; las pantallas deben ser claras y usables (incluido celular, porque el papá probablemente cargue desde el taller), pero sin trabajo de diseño visual.

## 2. Objetivos, no-objetivos, anti-objetivos

**Objetivos**
- Dalmata crea pedidos sin depender de mensajes.
- El stock de herrajes (bisagras, cierres, tornillos) se descuenta solo al entregar cajas, con merma incluida.
- Ambas partes ven el mismo stock, los mismos pedidos y los mismos comprobantes.
- El papá sabe en todo momento qué comprobantes envió, cuáles le pagaron y cuánto le deben.
- Exportación a Excel lista para contabilidad.

**No-objetivos**
- Facturación fiscal (ARCA/AFIP). El comprobante es **interno**.
- Seguimiento de las cajas después del retiro.
- Cálculo automático de consumo de madera por caja (no está cuantificado).
- Gestión de múltiples clientes: el único cliente es Dalmata.
- Notificaciones por email/WhatsApp (ver §10, queda para después).

**Anti-objetivos (sería un fracaso aunque "funcione")**
- Que el stock mostrado no coincida con la realidad por errores silenciosos (descuentos duplicados, entregas sin descontar).
- Que Dalmata pueda crear o modificar comprobantes, o cambiar stock del taller.
- Que un cambio de precio altere comprobantes ya emitidos.
- Que cargar algo sea más lento que mandar un WhatsApp.

## 3. Perfiles y permisos

| Acción | Admin (Alejo) | Taller (papá) | Dalmata |
|---|---|---|---|
| Gestionar usuarios (alta, baja, reset de contraseña) | ✔ | — | — |
| Editar tipos de caja y recetas de materiales | ✔ | ✔ | — |
| Editar lista de precios | ✔ | ✔ | — |
| Crear pedido (con prioridad y mockups) | ✔ | ✔ | ✔ |
| Editar/cancelar pedido | ✔ | ✔ | ✔ solo en estado *Recibido* |
| Cambiar estado del pedido | ✔ | ✔ | — |
| Ver pedidos | ✔ | ✔ | ✔ |
| Registrar ingreso de herrajes, retiro de placas, descartes por merma, ajustes | ✔ | ✔ | — |
| Registrar llegada de placas a la destilería | ✔ | ✔ | ✔ |
| Ver stock y movimientos | ✔ | ✔ | ✔ |
| Registrar entrega/despacho | ✔ | ✔ | — |
| Crear comprobante, agregar recargo de grabado | ✔ | ✔ | — |
| Cambiar estado de comprobante (enviado/pagado) | ✔ | ✔ | — |
| Ver comprobantes y saldo | ✔ | ✔ | ✔ |
| Exportar a Excel | ✔ | ✔ | — *(decisión mía)* |
| Corregir/anular cualquier registro | ✔ | — | — |

- Dalmata puede tener **varios usuarios**; todos comparten el mismo perfil. Los da de alta el Admin.
- Los permisos se validan **en el servidor**, no solo ocultando botones.
- Cada registro guarda qué usuario lo hizo y cuándo.

## 4. Catálogo

### Tipos de caja
Ejemplos: Premium, Clásica, Vino, 2 Gin, etc. (lista editable, no fija). Cada tipo tiene:
- Nombre, activo/inactivo.
- **Precio unitario vigente** (mano de obra). El logo está incluido en el precio; sin logo cuesta lo mismo.
- **Receta de herrajes**: cantidad por caja de cada herraje. Valor por defecto: 1 par de cierres (del tipo que corresponda), 2 bisagras, 12 tornillos. Editable por tipo de caja.
- Historial de precios (fecha desde / precio) para saber qué precio regía cada día.

### Materiales
- **Herrajes** (stock con descuento automático): tornillos, bisagras, cierre tipo A, cierre tipo B. Los nombres de los dos tipos de cierre son editables. La unidad del cierre es "par".
- **Placas** (stock sin descuento automático): placa gruesa, placa para tapas y fondos, placa de MDF negro.

## 5. Stock

### Herrajes
El stock de cada herraje es la **suma de sus movimientos**; nunca se edita un número a mano sin dejar movimiento. Tipos de movimiento:
- **Ingreso**: llegan materiales de Dalmata (cantidad, fecha, nota).
- **Consumo por entrega**: automático al registrar una entrega = receta × cajas entregadas.
- **Merma (carga manual, por lote)**: no hay merma automática. El taller va juntando lo que salió fallado y, al terminar un pedido o cuando se acumuló bastante, registra **un solo descarte** con varias líneas a la vez (p. ej. 14 bisagras, 6 pares de cierre tipo A, 30 tornillos), con nota opcional y, opcionalmente, el pedido asociado. Ese descarte se descuenta del stock al confirmarlo. Debe cargarse en pocos segundos desde el celular.
- **Ajuste**: corrección manual con motivo obligatorio (p. ej. tras contar físicamente).

La pantalla de stock muestra, por herraje: stock actual, **stock comprometido** por pedidos no entregados (receta × cajas pendientes) y **disponible** = actual − comprometido. Si el disponible es negativo se marca en rojo ("falta material para los pedidos abiertos"). *(Decisión mía: es lo que evita que Dalmata pregunte.)*

Se permite que el stock quede negativo (la realidad manda), pero se avisa al registrar la entrega.

### Placas
Las placas llegan a la **destilería de Dalmata** y el taller las va retirando a medida que las necesita. Se llevan dos ubicaciones por tipo de placa:
- **En Dalmata**: + llegadas (las carga Dalmata o el taller), − retiros.
- **En taller**: + retiros, − uso/ajustes manuales (opcional, con motivo).

Un **retiro** mueve N placas de "En Dalmata" a "En taller" en un solo movimiento. No hay descuento automático por caja.

## 6. Pedidos

### Contenido
- Número correlativo, fecha de creación, usuario creador.
- **Prioridad** (la define Dalmata): Alta / Media / Baja. *(Decisión mía: tres niveles simples.)* Se puede ordenar la lista por prioridad y fecha.
- Fecha deseada de entrega (opcional).
- **Líneas**: tipo de caja, cantidad, **con logo sí/no**, notas de grabado (tamaño, posición: centrado/esquina, etc.).
- **Mockups adjuntos**: uno o más archivos (imagen o PDF) por pedido, con posibilidad de asociarlos a una línea.
- Observaciones generales.

### Estados
`Recibido → En producción → Listo para retirar → Entregado parcialmente → Entregado`
más `Cancelado` (desde Recibido o En producción).

- El taller mueve los estados. *Entregado parcialmente* y *Entregado* se calculan a partir de las entregas registradas.
- Al pasar a *Listo para retirar*, Dalmata lo ve resaltado en su pantalla de inicio ("pedidos listos para retirar"). Esto reemplaza el aviso por mensaje.

### Entregas (despachos)
Un pedido tiene **una o más entregas** (lo normal es una; parciales son excepcionales). Cada entrega registra:
- Fecha y hora del despacho.
- Cantidad entregada por línea (por defecto: todo lo pendiente).
- **Quién retiró**: tipo (Fletero / Empresa de logística / Personal de Dalmata / Entrega propia) + nombre de la persona o empresa.
- Usuario del taller que registró la entrega.

Al confirmar una entrega, **en una sola transacción**: se generan los movimientos de consumo de herrajes, y se actualiza el estado del pedido. Si una entrega se anula (solo Admin), se revierten sus movimientos.

## 7. Comprobantes

- Comprobante **interno**, numerado correlativamente, visible para ambas partes.
- Se crea **a partir de una entrega** (uno por entrega; en el caso normal, uno por pedido). Las líneas se precargan con cantidad entregada y **precio unitario vigente a la fecha de la entrega**, que queda congelado en el comprobante. *(Decisión mía: los precios se mantienen meses, así que el caso límite casi no ocurre; el taller puede corregir el precio de una línea mientras el comprobante no fue enviado.)*
- **Recargo de grabado**: el taller puede agregar a cualquier línea un monto extra por unidad o total, con motivo ("logo de detalle fino"). Dalmata lo ve en el comprobante.
- Totales: subtotal por línea, recargos, total general.
- **Estados**: `Emitido → Enviado a Dalmata → Pagado`, con fecha de cada cambio. Al marcar pagado: fecha de pago y medio/nota. También `Anulado` (solo Admin, con motivo; no se borra).
- Vista imprimible / descarga en PDF para mandarlo si hace falta.
- **Saldo**: pantalla con total emitido, total cobrado y **total adeudado**, y lista de impagos ordenada por antigüedad. Dalmata ve la misma información.

Pagos parciales de un comprobante: fuera de alcance por ahora *(decisión mía; se paga el comprobante completo)*.

## 8. Exportación a Excel

Desde la pantalla de comprobantes, elegir rango de fechas y descargar un `.xlsx` con tres hojas:
1. **Comprobantes**: número, fecha, pedido, estado, fecha de envío, fecha de pago, medio de pago, total.
2. **Detalle**: una fila por línea de comprobante: número de comprobante, fecha, tipo de caja, cantidad, precio unitario, recargo, subtotal (formato tabular, apto para tablas dinámicas).
3. **Movimientos de stock**: fecha, material, ubicación (si es placa), tipo de movimiento, cantidad (+/−), pedido/entrega relacionado, usuario, nota.

Los números van como números (no texto) y las fechas como fechas de Excel.

## 9. Cómo se construye (decisiones del builder, tomadas por mí)

- **Stack**: Next.js (App Router) + TypeScript, PostgreSQL, Prisma como ORM.
- **Login**: usuario y contraseña (contraseñas hasheadas), sesiones del lado del servidor; control de permisos por rol en cada acción del servidor.
- **Archivos (mockups)**: guardados en un volumen del VPS, servidos solo a usuarios logueados. Límite de tamaño razonable (p. ej. 20 MB por archivo).
- **Excel**: generado en el servidor (p. ej. con `exceljs`).
- **Despliegue**: Docker Compose (app + Postgres) en el VPS Hostinger KVM 2 de Alejo, detrás del reverse proxy/HTTPS que ya use para sus otros proyectos. Backup diario automático de la base y de la carpeta de mockups.
- **Integridad**: entregas, consumos y comprobantes se escriben en transacciones; los movimientos de stock son inmutables (se corrigen con un movimiento inverso, no editando).
- **Zona horaria**: America/Argentina/Buenos_Aires; moneda ARS.

## 10. Dejado para después

- Diseño visual (se trabaja al final).
- Notificaciones por email/WhatsApp cuando un pedido está listo.
- Cálculo de consumo de madera por tipo de caja (cuando esté cuantificado).
- Pagos parciales de comprobantes.

## 11. Lo que queda a criterio del builder

Estructura de pantallas y navegación, esquema exacto de la base de datos, formato de numeración, librerías menores, estrategia de tests (priorizando la lógica de stock, entregas y comprobantes).
