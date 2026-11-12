# Gestión Dalmata — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web app compartida entre el taller y Dalmata para pedidos de cajas, stock de herrajes y placas, entregas, comprobantes internos con control de cobro y exportación a Excel.

**Architecture:** Next.js (App Router) monolito. Toda la lógica de negocio vive en `src/domain/**` como funciones que reciben el usuario actor y validan permisos adentro (así los tests cubren permisos sin pasar por la UI). Las pantallas usan server actions finas que llaman al dominio. PostgreSQL vía Prisma; el stock es siempre la suma de `StockMovement` inmutables.

**Tech Stack:** Node 22, Next.js 15, React 19, TypeScript estricto, Prisma 6 + PostgreSQL 17, Vitest 3 (contra Postgres real), zod, bcryptjs, exceljs 4, Tailwind 4 + shadcn/ui, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-11-12-dalmata-gestion-design.md`

## Global Constraints

- Tres roles: `ADMIN` (Alejo), `TALLER` (papá), `DALMATA` (uno o más usuarios). Matriz de permisos exacta en spec §3.
- Permisos validados en el servidor, dentro de cada función de dominio. Nunca solo ocultando botones.
- Todo registro guarda `createdById` y `createdAt`.
- Stock de herrajes = suma de movimientos; los movimientos nunca se editan ni se borran, se corrigen con movimientos inversos.
- No hay merma automática: la merma es un **descarte** manual por lote (spec §5).
- Comprobante interno, no fiscal. Precio unitario = vigente a la fecha de la entrega, congelado en la línea; editable solo mientras el comprobante está `EMITIDO`.
- Moneda ARS, `Decimal(12,2)`. Cantidades enteras. Zona horaria `America/Argentina/Buenos_Aires`.
- Mockups: PNG, JPEG, WEBP o PDF, máximo 20 MB por archivo, servidos solo a usuarios logueados.
- UI funcional y usable en celular con shadcn/ui; sin trabajo de diseño visual (queda para el final). Textos de la UI en español rioplatense.
- Código (identificadores) en inglés; valores de enums como en el schema de la Task 1.

## Review Focus

1. **Doble envío de una entrega** (doble click / reintento de red): debe descontar stock una sola vez → `requestId` único en `Delivery` (test en Task 7).
2. **Entregar más cajas de las pendientes** en una línea: se rechaza con `OVER_DELIVERY` (test en Task 7).
3. **Usuario Dalmata llamando directo a una acción del taller** (crear comprobante, mover stock, entregar): `ForbiddenError` (tests en Tasks 2, 5, 7, 8).
4. **Segundo comprobante para la misma entrega**: se rechaza mientras exista uno no anulado (test en Task 8).
5. **Dalmata edita un pedido que el taller acaba de pasar a producción**: el chequeo de estado se hace dentro de la transacción y se rechaza con `ORDER_LOCKED` (test en Task 6). Archivos de mockup inválidos (tipo o tamaño) se rechazan con `INVALID_FILE` (test en Task 6).

---

## Estructura de archivos

```
prisma/schema.prisma                 modelo completo (Task 1)
prisma/seed.ts                       materiales + usuario admin inicial
src/lib/db.ts                        cliente Prisma singleton
src/lib/errors.ts                    DomainError, ForbiddenError
src/lib/money.ts                     helpers Decimal
src/lib/auth/password.ts             hash/verify
src/lib/auth/session.ts              cookie + tabla Session, requireUser()
src/lib/auth/permissions.ts          Action, can(), assertCan()
src/domain/users.ts
src/domain/catalog.ts                tipos de caja, recetas, precios
src/domain/stock.ts                  movimientos, descartes, placas, saldos
src/domain/commitments.ts            stock comprometido / disponible
src/domain/orders.ts                 pedidos, líneas, estados
src/domain/mockups.ts                guardar/leer archivos
src/domain/deliveries.ts             entregas + consumo + anulación
src/domain/invoices.ts               comprobantes, recargos, estados, saldo
src/domain/export.ts                 workbook Excel
src/app/login/…                      login
src/app/(app)/layout.tsx             shell con navegación por rol
src/app/(app)/page.tsx               inicio por rol
src/app/(app)/{pedidos,stock,comprobantes,catalogo,usuarios}/…  pantallas + actions.ts
src/app/api/mockups/[id]/route.ts    descarga autenticada
src/app/api/export/route.ts          descarga .xlsx
tests/helpers/{db.ts,factories.ts}
tests/domain/*.test.ts
docker-compose.dev.yml, Dockerfile, docker-compose.prod.yml, scripts/backup.sh
```

---

### Task 1: Proyecto, base de datos y harness de tests

**Files:**
- Create: proyecto Next.js en la raíz (`create-next-app` con TypeScript, App Router, Tailwind, `src/`), `docker-compose.dev.yml`, `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/db.ts`, `src/lib/errors.ts`, `src/lib/money.ts`, `vitest.config.ts`, `tests/setup/global-setup.ts`, `tests/helpers/db.ts`, `tests/helpers/factories.ts`, `.env.example`, `.gitignore`
- Test: `tests/domain/smoke.test.ts`

**Interfaces:**
- Produces:
  - `prisma` (de `src/lib/db.ts`), tipo `Tx = Prisma.TransactionClient`.
  - `class DomainError extends Error { code: string }`, `class ForbiddenError extends Error {}`.
  - `money.ts`: `toDecimal(v: number | string): Prisma.Decimal`, `mul(a, b)`, `sum(xs)`.
  - Tests: `resetDb(): Promise<void>` (TRUNCATE de todas las tablas + re-seed de materiales), `makeUser(role: Role, overrides?) : Promise<SessionUser>`, `makeBoxType(opts?: { name?: string; price?: number; recipe?: Partial<Record<MaterialCode, number>> }): Promise<BoxType>` (receta por defecto `{ TORNILLO: 12, BISAGRA: 2, CIERRE_A: 1 }`, precio por defecto 1000), `material(code: MaterialCode): Promise<Material>`.
  - Seed de materiales (códigos fijos): `TORNILLO` (unidad "u"), `BISAGRA` ("u"), `CIERRE_A` ("par", nombre "Cierre tipo A"), `CIERRE_B` ("par", "Cierre tipo B"), `PLACA_GRUESA`, `PLACA_TAPAS_FONDOS`, `PLACA_MDF_NEGRO` (unidad "placa", kind `PLACA`).

Schema (decisión de interfaces; el implementador agrega `@@index` donde haga falta):

```prisma
enum Role { ADMIN TALLER DALMATA }
enum MaterialKind { HERRAJE PLACA }
enum Location { TALLER DALMATA }
enum MovementType { INGRESO CONSUMO DESCARTE AJUSTE LLEGADA_PLACA RETIRO_PLACA USO_PLACA REVERSION }
enum Priority { ALTA MEDIA BAJA }
enum OrderStatus { RECIBIDO EN_PRODUCCION LISTO PARCIAL ENTREGADO CANCELADO }
enum PickupType { FLETERO LOGISTICA PERSONAL_DALMATA ENTREGA_PROPIA }
enum InvoiceStatus { EMITIDO ENVIADO PAGADO ANULADO }
enum SurchargeMode { PER_UNIT TOTAL }

model User      { id String @id @default(cuid()) username String @unique name String passwordHash String role Role active Boolean @default(true) createdAt DateTime @default(now()) }
model Session   { id String @id /* sha256 del token */ userId String expiresAt DateTime }
model Material  { id String @id @default(cuid()) code String @unique name String unit String kind MaterialKind }
model BoxType   { id String @id @default(cuid()) name String @unique active Boolean @default(true) createdAt DateTime @default(now()) }
model RecipeItem{ boxTypeId String materialId String qtyPerBox Int  @@id([boxTypeId, materialId]) }
model PriceEntry{ id String @id @default(cuid()) boxTypeId String unitPrice Decimal @db.Decimal(12,2) validFrom DateTime createdById String createdAt DateTime @default(now()) }
model StockMovement {
  id String @id @default(cuid()) materialId String location Location type MovementType
  quantity Int            // con signo: + entra, − sale
  note String? orderId String? deliveryId String? discardId String?
  transferGroupId String? // retiro de placas: par DALMATA(−)/TALLER(+)
  reversesId String?      // REVERSION apunta al movimiento revertido
  createdById String createdAt DateTime @default(now())
}
model Discard   { id String @id @default(cuid()) note String? orderId String? createdById String createdAt DateTime @default(now()) }
model Order     { id String @id @default(cuid()) number Int @unique @default(autoincrement()) priority Priority desiredDate DateTime? notes String? status OrderStatus @default(RECIBIDO) createdById String createdAt DateTime @default(now()) updatedAt DateTime @updatedAt }
model OrderLine { id String @id @default(cuid()) orderId String boxTypeId String quantity Int withLogo Boolean engravingNotes String? }
model Mockup    { id String @id @default(cuid()) orderId String orderLineId String? filename String storedName String mimeType String size Int uploadedById String createdAt DateTime @default(now()) }
model Delivery  { id String @id @default(cuid()) orderId String deliveredAt DateTime pickupType PickupType pickupName String requestId String @unique createdById String createdAt DateTime @default(now()) annulledAt DateTime? annulReason String? annulledById String? }
model DeliveryLine { deliveryId String orderLineId String quantity Int  @@id([deliveryId, orderLineId]) }
model Invoice   { id String @id @default(cuid()) number Int @unique @default(autoincrement()) deliveryId String status InvoiceStatus @default(EMITIDO) issuedAt DateTime @default(now()) sentAt DateTime? paidAt DateTime? paymentNote String? annulledAt DateTime? annulReason String? total Decimal @db.Decimal(12,2) createdById String }
model InvoiceLine { id String @id @default(cuid()) invoiceId String orderLineId String boxTypeName String quantity Int unitPrice Decimal @db.Decimal(12,2) surchargeMode SurchargeMode? surchargeValue Decimal @db.Decimal(12,2) @default(0) surchargeReason String? subtotal Decimal @db.Decimal(12,2) }
```
(Con las relaciones Prisma correspondientes.) Migración SQL extra a mano: `CREATE UNIQUE INDEX invoice_one_active_per_delivery ON "Invoice"("deliveryId") WHERE status <> 'ANULADO';`

- [ ] **Step 1:** `git init`, scaffold Next.js, instalar dependencias del Tech Stack, inicializar shadcn/ui. `docker-compose.dev.yml` con `postgres:17` en el puerto 5433 y dos bases: `gestiond` y `gestiond_test`. `.env.example` con `DATABASE_URL`, `DATABASE_URL_TEST`, `UPLOAD_DIR`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
- [ ] **Step 2:** Escribir el schema y crear la migración inicial (`npx prisma migrate dev --name init`) más la migración del índice parcial.
- [ ] **Step 3:** Vitest: `globalSetup` corre `prisma migrate deploy` contra `DATABASE_URL_TEST`; `fileParallelism: false`. Helpers y factories según Interfaces.
- [ ] **Step 4: Test de humo** — `tests/domain/smoke.test.ts`:
```ts
test('seed de materiales', async () => {
  await resetDb();
  expect(await prisma.material.count()).toBe(7);
  expect((await material('CIERRE_A')).unit).toBe('par');
});
```
- [ ] **Step 5:** Run `docker compose -f docker-compose.dev.yml up -d; npx vitest run` → PASS. `npm run build` → sin errores.
- [ ] **Step 6:** Commit `chore: scaffold proyecto, schema y harness de tests`.

---

### Task 2: Autenticación, sesiones y permisos

**Files:**
- Create: `src/lib/auth/password.ts`, `src/lib/auth/session.ts`, `src/lib/auth/permissions.ts`, `src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/app/(app)/layout.tsx`, `src/middleware.ts`
- Modify: `prisma/seed.ts` (crea el usuario ADMIN desde `ADMIN_USERNAME`/`ADMIN_PASSWORD` si no existe)
- Test: `tests/domain/permissions.test.ts`, `tests/domain/auth.test.ts`

**Interfaces:**
- Produces:
  - `type SessionUser = { id: string; name: string; role: Role }`
  - `type Action = 'users.manage' | 'catalog.edit' | 'prices.edit' | 'orders.create' | 'orders.edit' | 'orders.changeStatus' | 'orders.view' | 'stock.move' | 'stock.registerArrival' | 'stock.view' | 'deliveries.create' | 'invoices.create' | 'invoices.changeStatus' | 'invoices.view' | 'export.excel' | 'records.annul'`
  - `can(user: SessionUser, action: Action): boolean`, `assertCan(user, action): void` (lanza `ForbiddenError`).
  - `hashPassword(pw: string): Promise<string>`, `verifyPassword(pw, hash): Promise<boolean>` (bcryptjs, cost 12).
  - `login(username: string, password: string): Promise<{ token: string; user: SessionUser } | null>` (rechaza usuarios inactivos), `getSessionUser(token: string): Promise<SessionUser | null>`, `logout(token)`, `requireUser(): Promise<SessionUser>` (lee la cookie `session`, redirige a `/login` si no hay). Cookie httpOnly, secure en producción, sameSite lax, 30 días.

Matriz (de spec §3): ADMIN = todas las acciones. TALLER = todas menos `users.manage` y `records.annul`. DALMATA = `orders.create`, `orders.edit` (restringida por estado en Task 6), `orders.view`, `stock.registerArrival`, `stock.view`, `invoices.view`.

- [ ] **Step 1: Tests que fallan**
```ts
test.each([
  ['DALMATA','invoices.create',false], ['DALMATA','stock.move',false], ['DALMATA','deliveries.create',false],
  ['DALMATA','export.excel',false], ['DALMATA','orders.create',true], ['DALMATA','stock.registerArrival',true],
  ['TALLER','prices.edit',true], ['TALLER','users.manage',false], ['TALLER','records.annul',false],
  ['ADMIN','records.annul',true],
])('%s %s -> %s', (role, action, expected) => expect(can({id:'x',name:'x',role}, action)).toBe(expected));

test('login correcto, incorrecto e inactivo', async () => {
  await resetDb();
  await makeUser('TALLER', { username: 'papa', password: 'secreta123' });
  expect(await login('papa', 'mala')).toBeNull();
  const s = await login('papa', 'secreta123');
  expect((await getSessionUser(s!.token))?.role).toBe('TALLER');
  await prisma.user.update({ where: { username: 'papa' }, data: { active: false } });
  expect(await login('papa', 'secreta123')).toBeNull();
  expect(await getSessionUser(s!.token)).toBeNull(); // usuario desactivado pierde la sesión
});
```
- [ ] **Step 2:** `npx vitest run tests/domain/permissions.test.ts tests/domain/auth.test.ts` → FAIL.
- [ ] **Step 3:** Implementar según Interfaces. La tabla `Session` guarda el sha256 del token, nunca el token en claro.
- [ ] **Step 4:** Página de login (usuario + contraseña, error genérico "Usuario o contraseña incorrectos"). El layout `(app)` llama a `requireUser()` y muestra la navegación filtrada con `can()`: Inicio, Pedidos, Stock, Comprobantes, Catálogo (`catalog.edit`), Usuarios (`users.manage`), Salir.
- [ ] **Step 5:** Tests → PASS; `npm run build` → OK.
- [ ] **Step 6:** Commit `feat: login, sesiones y matriz de permisos`.

---

### Task 3: Gestión de usuarios (Admin)

**Files:**
- Create: `src/domain/users.ts`, `src/app/(app)/usuarios/page.tsx`, `src/app/(app)/usuarios/actions.ts`
- Test: `tests/domain/users.test.ts`

**Interfaces:**
- Consumes: `assertCan`, `hashPassword`.
- Produces: `createUser(actor, { username, name, role, password }): Promise<User>` (password ≥ 8 caracteres, username único → `DomainError('USERNAME_TAKEN')`), `setUserActive(actor, userId, active: boolean)` (al desactivar borra sus sesiones; un admin no puede desactivarse a sí mismo → `DomainError('SELF_DEACTIVATE')`), `resetPassword(actor, userId, newPassword)`, `listUsers(actor)`. Todas requieren `users.manage`.

- [ ] **Step 1: Tests que fallan** — `TALLER` llamando `createUser` → `ForbiddenError`; username duplicado → `USERNAME_TAKEN`; admin desactivándose → `SELF_DEACTIVATE`; `resetPassword` permite login con la nueva contraseña y no con la vieja.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar dominio + pantalla (tabla de usuarios con rol y estado, formulario de alta, botones activar/desactivar y resetear contraseña).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: gestión de usuarios`.

---

### Task 4: Catálogo — tipos de caja, recetas y precios

**Files:**
- Create: `src/domain/catalog.ts`, `src/app/(app)/catalogo/page.tsx`, `src/app/(app)/catalogo/[id]/page.tsx`, `src/app/(app)/catalogo/actions.ts`
- Test: `tests/domain/catalog.test.ts`

**Interfaces:**
- Produces:
  - `createBoxType(actor, { name, unitPrice: number, recipe: Partial<Record<MaterialCode, number>> }): Promise<BoxType>` — si `recipe` viene vacío usa `{ TORNILLO: 12, BISAGRA: 2, CIERRE_A: 1 }`. Requiere `catalog.edit`.
  - `updateBoxType(actor, id, { name?, active?, recipe? })` — `catalog.edit`. La receta solo admite materiales `HERRAJE`.
  - `setPrice(actor, boxTypeId, unitPrice: number, validFrom = new Date())` — crea `PriceEntry`; requiere `prices.edit`.
  - `getPriceAt(boxTypeId: string, at: Date, tx?: Tx): Promise<Prisma.Decimal>` — última entrada con `validFrom <= at`; si no hay → `DomainError('NO_PRICE')`.
  - `getRecipe(boxTypeId, tx?): Promise<{ materialId: string; qtyPerBox: number }[]>`
  - `listBoxTypes({ includeInactive?: boolean })` (con precio vigente).
  - `renameMaterial(actor, code: 'CIERRE_A' | 'CIERRE_B', name)` — `catalog.edit`.

- [ ] **Step 1: Tests que fallan**
```ts
test('precio vigente según fecha', async () => {
  const admin = await makeUser('ADMIN'); const bt = await makeBoxType({ price: 1000 }); // validFrom = 2026-01-01
  await setPrice(admin, bt.id, 1500, new Date('2026-06-01'));
  expect((await getPriceAt(bt.id, new Date('2026-05-31'))).toNumber()).toBe(1000);
  expect((await getPriceAt(bt.id, new Date('2026-06-01'))).toNumber()).toBe(1500);
});
test('receta por defecto', ...)            // 12 tornillos, 2 bisagras, 1 cierre A
test('TALLER puede editar precios y receta; DALMATA no', ...) // ForbiddenError para DALMATA
test('NO_PRICE antes del primer precio', ...)
```
(`makeBoxType` crea el precio con `validFrom: 2026-01-01`.)
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar dominio y pantallas: lista de tipos con precio vigente; detalle con receta editable (cantidad por herraje), formulario "nuevo precio" e historial de precios; renombrar los dos tipos de cierre.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: catálogo de cajas, recetas y precios`.

---

### Task 5: Stock — movimientos, descartes y placas

**Files:**
- Create: `src/domain/stock.ts`, `src/app/(app)/stock/page.tsx`, `src/app/(app)/stock/movimientos/page.tsx`, `src/app/(app)/stock/actions.ts`
- Test: `tests/domain/stock.test.ts`

**Interfaces:**
- Produces:
  - `registerIngreso(actor, { materialCode, quantity: number, note? })` — herrajes, `+qty` en `TALLER`; `stock.move`; `quantity > 0`.
  - `registerDiscard(actor, { items: { materialCode, quantity }[], note?, orderId? }): Promise<Discard>` — un `Discard` + un movimiento `DESCARTE` (−qty) por ítem, en una transacción; `stock.move`; al menos un ítem, cantidades > 0, solo herrajes.
  - `registerAdjustment(actor, { materialCode, location, delta: number, reason: string })` — `AJUSTE`; `reason` obligatorio; `stock.move`.
  - `registerPlateArrival(actor, { materialCode, quantity, note? })` — `LLEGADA_PLACA` +qty en `DALMATA`; `stock.registerArrival`.
  - `registerPlatePickup(actor, { materialCode, quantity, note? })` — dos movimientos `RETIRO_PLACA` con el mismo `transferGroupId`: −qty `DALMATA`, +qty `TALLER`; `stock.move`.
  - `registerPlateUse(actor, { materialCode, quantity, note? })` — `USO_PLACA` −qty en `TALLER`; `stock.move`.
  - `getBalances(tx?): Promise<{ materialId; code; name; unit; kind; taller: number; dalmata: number }[]>` — suma por material y ubicación.
  - `listMovements({ from?, to?, materialCode?, take?, skip? })` — `stock.view`.
  - `createMovements(tx: Tx, rows: Omit<StockMovement,'id'|'createdAt'>[])` — interno, lo usan las Tasks 7 y 8.

- [ ] **Step 1: Tests que fallan**
```ts
test('ingreso y descarte por lote', async () => {
  const papa = await makeUser('TALLER');
  await registerIngreso(papa, { materialCode: 'BISAGRA', quantity: 500 });
  await registerDiscard(papa, { items: [{ materialCode: 'BISAGRA', quantity: 14 }, { materialCode: 'TORNILLO', quantity: 30 }] });
  const b = await balanceOf('BISAGRA'); expect(b.taller).toBe(486);
  expect((await balanceOf('TORNILLO')).taller).toBe(-30);
  expect(await prisma.discard.count()).toBe(1);
});
test('retiro de placas mueve de Dalmata al taller', async () => {
  // llegada 40 PLACA_GRUESA (usuario DALMATA), retiro 20 (TALLER) -> dalmata 20, taller 20
});
test('DALMATA no puede ingresar herrajes ni descartar', ...) // ForbiddenError
test('ajuste sin motivo -> DomainError REASON_REQUIRED', ...)
test('descarte de placa -> DomainError NOT_HARDWARE', ...)
```
(`balanceOf` es un helper de test sobre `getBalances`.)
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar dominio.
- [ ] **Step 4:** Pantalla `/stock`: tabla de herrajes (actual en taller; las columnas comprometido/disponible se agregan en Task 6) y tabla de placas (en Dalmata / en taller). Formularios según `can()`: Ingreso, **Descarte** (varias filas en un formulario, rápido desde el celular), Ajuste, Llegada de placas, Retiro de placas, Uso de placas. `/stock/movimientos`: lista paginada con filtros de fecha y material.
- [ ] **Step 5:** Run → PASS.
- [ ] **Step 6:** Commit `feat: stock de herrajes y placas`.

---

### Task 6: Pedidos, mockups y stock comprometido

**Files:**
- Create: `src/domain/orders.ts`, `src/domain/mockups.ts`, `src/domain/commitments.ts`, `src/app/(app)/pedidos/page.tsx`, `src/app/(app)/pedidos/nuevo/page.tsx`, `src/app/(app)/pedidos/[id]/page.tsx`, `src/app/(app)/pedidos/actions.ts`, `src/app/api/mockups/[id]/route.ts`
- Modify: `src/app/(app)/stock/page.tsx` (columnas comprometido y disponible)
- Test: `tests/domain/orders.test.ts`, `tests/domain/mockups.test.ts`, `tests/domain/commitments.test.ts`

**Interfaces:**
- Consumes: `getRecipe`, `getBalances`.
- Produces:
  - `type OrderLineInput = { boxTypeId: string; quantity: number; withLogo: boolean; engravingNotes?: string }`
  - `createOrder(actor, { priority: Priority; desiredDate?: Date; notes?: string; lines: OrderLineInput[] }): Promise<Order>` — `orders.create`; ≥ 1 línea, cantidad ≥ 1, tipo de caja activo.
  - `updateOrder(actor, orderId, sameInputAsCreate)` — `orders.edit`; reemplaza las líneas. DALMATA solo si el estado es `RECIBIDO`; TALLER/ADMIN mientras no haya entregas (`RECIBIDO`, `EN_PRODUCCION`, `LISTO`). Si no → `DomainError('ORDER_LOCKED')`. El estado se lee **dentro de la transacción** (`SELECT … FOR UPDATE` vía `$queryRaw`).
  - `cancelOrder(actor, orderId)` — DALMATA en `RECIBIDO`; TALLER/ADMIN en `RECIBIDO`/`EN_PRODUCCION`; si no → `ORDER_LOCKED`.
  - `setOrderStatus(actor, orderId, to: 'EN_PRODUCCION' | 'LISTO' | 'RECIBIDO')` — `orders.changeStatus`. Transiciones permitidas: RECIBIDO→EN_PRODUCCION, EN_PRODUCCION→LISTO, EN_PRODUCCION→RECIBIDO, LISTO→EN_PRODUCCION. Otras → `DomainError('INVALID_TRANSITION')`.
  - `getPendingByLine(orderId, tx?): Promise<Map<orderLineId, number>>` — cantidad − entregado en entregas no anuladas (Task 7 lo usa).
  - `recomputeOrderStatus(tx, orderId)` — si todo entregado → `ENTREGADO`; si algo entregado → `PARCIAL`; si nada entregado y el estado era `PARCIAL`/`ENTREGADO` → `LISTO`. (Task 7 lo usa.)
  - `listOrders(actor, { status?: OrderStatus[] })` — orden: estado abierto primero, luego prioridad ALTA→BAJA, luego `createdAt` asc. `getOrder(actor, id)` con líneas, mockups, entregas y comprobantes.
  - `saveMockup(actor, { orderId, orderLineId?, file: File })` — permiso `orders.edit` con la misma regla de estado; tipos `image/png|image/jpeg|image/webp|application/pdf` y ≤ 20 MB, si no → `DomainError('INVALID_FILE')`; guarda en `UPLOAD_DIR/<cuid>` con nombre aleatorio. `readMockup(actor, id): Promise<{ stream; mimeType; filename }>` — `orders.view`.
  - `getCommitments(tx?): Promise<Map<materialId, number>>` — Σ sobre pedidos en `RECIBIDO|EN_PRODUCCION|LISTO|PARCIAL` de pendiente × `qtyPerBox`.
  - `getStockOverview()`: `getBalances` + `committed` + `available = taller − committed` por herraje.

- [ ] **Step 1: Tests que fallan**
```ts
test('Dalmata no puede editar un pedido en producción', async () => {
  const dal = await makeUser('DALMATA'); const papa = await makeUser('TALLER'); const bt = await makeBoxType();
  const o = await createOrder(dal, { priority: 'ALTA', lines: [{ boxTypeId: bt.id, quantity: 10, withLogo: true }] });
  await setOrderStatus(papa, o.id, 'EN_PRODUCCION');
  await expect(updateOrder(dal, o.id, { priority: 'BAJA', lines: [{ boxTypeId: bt.id, quantity: 5, withLogo: false }] }))
    .rejects.toMatchObject({ code: 'ORDER_LOCKED' });
});
test('DALMATA no puede cambiar estados', ...)                 // ForbiddenError
test('transición LISTO -> RECIBIDO es inválida', ...)          // INVALID_TRANSITION
test('orden de la lista: ALTA antes que BAJA, luego antigüedad', ...)
test('comprometido = pendiente × receta', async () => {
  // pedido de 10 cajas con receta por defecto -> TORNILLO 120, BISAGRA 20, CIERRE_A 10
  // con ingreso de 100 tornillos -> available TORNILLO = -20
});
test('pedido cancelado no compromete stock', ...)
test('mockup .exe o de 21 MB -> INVALID_FILE', ...)            // en mockups.test.ts
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar dominio y la ruta de descarga de mockups (devuelve 401 sin sesión).
- [ ] **Step 4:** Pantallas. `/pedidos`: lista con número, fecha, prioridad, cajas totales, estado y filtro por estado. `/pedidos/nuevo`: prioridad, fecha deseada, líneas dinámicas (tipo, cantidad, logo sí/no, notas de grabado), mockups múltiples, observaciones. `/pedidos/[id]`: detalle, mockups (vista previa de imágenes, link a PDF), botones de estado según `can()`, editar/cancelar si corresponde; las entregas y comprobantes se suman en las Tasks 7 y 8. `/stock`: agregar columnas Comprometido y Disponible, en rojo si es < 0.
- [ ] **Step 5:** Run → PASS.
- [ ] **Step 6:** Commit `feat: pedidos, mockups y stock comprometido`.

---

### Task 7: Entregas con descuento automático de stock

**Files:**
- Create: `src/domain/deliveries.ts`, `src/app/(app)/pedidos/[id]/entregar/page.tsx`
- Modify: `src/app/(app)/pedidos/actions.ts`, `src/app/(app)/pedidos/[id]/page.tsx` (sección Entregas)
- Test: `tests/domain/deliveries.test.ts`

**Interfaces:**
- Consumes: `getPendingByLine`, `recomputeOrderStatus`, `getRecipe`, `createMovements`, `getBalances`.
- Produces:
  - `registerDelivery(actor, { orderId, requestId: string, deliveredAt: Date, pickupType: PickupType, pickupName: string, lines?: { orderLineId: string; quantity: number }[] }): Promise<{ delivery: Delivery; negativeStock: string[] }>` — `deliveries.create`. Sin `lines` = todo lo pendiente. Estado del pedido en `EN_PRODUCCION|LISTO|PARCIAL`, si no → `DomainError('ORDER_NOT_DELIVERABLE')`. Cantidad > pendiente → `DomainError('OVER_DELIVERY')`. `pickupName` obligatorio. En **una transacción** (con lock del pedido): crea `Delivery` + `DeliveryLine`, un movimiento `CONSUMO` por herraje = −(Σ cantidad × `qtyPerBox`) en `TALLER` con `deliveryId`/`orderId`, y llama a `recomputeOrderStatus`. Si `requestId` ya existe, devuelve la entrega existente sin crear nada (idempotente). `negativeStock` = nombres de herrajes que quedaron < 0 (el stock negativo se permite, se avisa).
  - `annulDelivery(actor, deliveryId, reason: string)` — `records.annul`; rechaza si tiene comprobante no anulado → `DomainError('HAS_ACTIVE_INVOICE')`; crea un movimiento `REVERSION` por cada `CONSUMO` (con `reversesId`), marca `annulledAt`, recalcula el estado.

- [ ] **Step 1: Tests que fallan**
```ts
test('entrega completa descuenta receta × cantidad y cierra el pedido', async () => {
  // ingreso 1000 tornillos, 100 bisagras, 50 cierre A; pedido 10 cajas, LISTO
  const r = await registerDelivery(papa, { orderId, requestId: 'r1', deliveredAt: new Date(), pickupType: 'FLETERO', pickupName: 'Juan' });
  expect((await balanceOf('TORNILLO')).taller).toBe(880);
  expect((await balanceOf('BISAGRA')).taller).toBe(80);
  expect((await balanceOf('CIERRE_A')).taller).toBe(40);
  expect((await prisma.order.findUnique({ where: { id: orderId } }))!.status).toBe('ENTREGADO');
  expect(r.negativeStock).toEqual([]);
});
test('entrega parcial: 60 de 100 -> PARCIAL; luego 40 -> ENTREGADO', ...)
test('mismo requestId dos veces descuenta una sola vez', ...)     // Review Focus 1
test('entregar 101 de 100 -> OVER_DELIVERY', ...)                // Review Focus 2
test('DALMATA no puede registrar entregas', ...)                 // Review Focus 3
test('pedido RECIBIDO -> ORDER_NOT_DELIVERABLE', ...)
test('stock insuficiente: se registra y avisa en negativeStock', ...)
test('anular entrega revierte el stock y vuelve el pedido a LISTO', ...)
test('TALLER no puede anular entregas', ...)
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Pantalla `/pedidos/[id]/entregar`: fecha y hora (por defecto ahora), tipo de retiro (Fletero / Empresa de logística / Personal de Dalmata / Entrega propia), nombre, cantidades por línea precargadas con lo pendiente. El formulario genera el `requestId` (`crypto.randomUUID()`) al renderizar y lo manda oculto. Después de guardar muestra el aviso de stock negativo si corresponde. En el detalle del pedido, lista de entregas con quién retiró, cuándo y quién registró; botón "Anular" solo con `records.annul`.
- [ ] **Step 5:** Run → PASS.
- [ ] **Step 6:** Commit `feat: entregas con descuento automático de herrajes`.

---

### Task 8: Comprobantes, recargos, cobro y saldo

**Files:**
- Create: `src/domain/invoices.ts`, `src/app/(app)/comprobantes/page.tsx`, `src/app/(app)/comprobantes/[id]/page.tsx`, `src/app/(app)/comprobantes/[id]/imprimir/page.tsx`, `src/app/(app)/comprobantes/saldo/page.tsx`, `src/app/(app)/comprobantes/actions.ts`
- Modify: `src/app/(app)/pedidos/[id]/page.tsx` (botón "Hacer comprobante" por entrega y links a comprobantes)
- Test: `tests/domain/invoices.test.ts`

**Interfaces:**
- Consumes: `getPriceAt`, `money.ts`.
- Produces:
  - `createInvoiceFromDelivery(actor, deliveryId): Promise<Invoice>` — `invoices.create`; entrega no anulada; si ya hay comprobante no anulado → `DomainError('INVOICE_EXISTS')` (además lo garantiza el índice parcial). Una línea por `DeliveryLine` con `boxTypeName` (copia), `quantity`, `unitPrice = getPriceAt(boxTypeId, delivery.deliveredAt)`, recargo 0.
  - Cálculo: `surchargeTotal = mode === 'PER_UNIT' ? value × quantity : mode === 'TOTAL' ? value : 0`; `subtotal = unitPrice × quantity + surchargeTotal`; `total = Σ subtotal`. Siempre recalculado en el servidor.
  - `updateInvoiceLine(actor, lineId, { unitPrice?: number; surchargeMode?: SurchargeMode | null; surchargeValue?: number; surchargeReason?: string })` — `invoices.create`; solo con el comprobante en `EMITIDO`, si no → `DomainError('INVOICE_LOCKED')`; recargo > 0 exige `surchargeReason`.
  - `markInvoiceSent(actor, id)`: EMITIDO→ENVIADO (`sentAt` = ahora). `markInvoicePaid(actor, id, { paidAt: Date; paymentNote?: string })`: ENVIADO→PAGADO. Ambos con `invoices.changeStatus`; otra transición → `INVALID_TRANSITION`.
  - `annulInvoice(actor, id, reason)` — `records.annul`; cualquier estado salvo `ANULADO`.
  - `listInvoices(actor, { status?, from?, to? })`, `getInvoice(actor, id)` — `invoices.view`.
  - `getAccountBalance(actor): Promise<{ issued: Decimal; paid: Decimal; owed: Decimal; unpaid: { id; number; issuedAt; total; status; daysOld: number }[] }>` — excluye anulados; `unpaid` = EMITIDO|ENVIADO ordenados por `issuedAt` asc.

- [ ] **Step 1: Tests que fallan**
```ts
test('comprobante con precio del día de la entrega y recargo por unidad', async () => {
  // tipo con precio 1000 desde 2026-01-01 y 1500 desde 2026-06-01; entrega de 10 cajas el 2026-05-20
  const inv = await createInvoiceFromDelivery(papa, deliveryId);
  expect(inv.total.toNumber()).toBe(10000);
  await updateInvoiceLine(papa, lineId, { surchargeMode: 'PER_UNIT', surchargeValue: 200, surchargeReason: 'logo detallado' });
  expect((await getInvoice(papa, inv.id)).total.toNumber()).toBe(12000);
});
test('cambiar la lista de precios no altera un comprobante emitido', ...)
test('segundo comprobante para la misma entrega -> INVOICE_EXISTS; tras anular el primero se permite', ...) // Review Focus 4
test('recargo sin motivo -> SURCHARGE_REASON_REQUIRED', ...)
test('no se puede editar una línea de un comprobante ENVIADO -> INVOICE_LOCKED', ...)
test('EMITIDO -> PAGADO directo -> INVALID_TRANSITION', ...)
test('DALMATA puede ver pero no crear ni marcar pagado', ...)                // Review Focus 3
test('saldo: emitido 22000, pagado 10000, adeudado 12000; anulados no suman', ...)
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Pantallas. `/comprobantes`: lista con número, fecha, pedido, total y estado, filtros de estado y fechas, y acceso a Saldo y Exportar (Task 9). `/comprobantes/[id]`: detalle, edición de precio/recargo si está `EMITIDO` (solo taller), botones "Marcar enviado" / "Marcar pagado" (fecha + nota) / "Anular" (admin). `/imprimir`: versión limpia para imprimir con estilos `@media print`; botón "Imprimir / Guardar PDF" con `window.print()`. `/comprobantes/saldo`: totales e impagos con antigüedad en días.
- [ ] **Step 5:** Run → PASS.
- [ ] **Step 6:** Commit `feat: comprobantes, recargos de grabado, cobro y saldo`.

---

### Task 9: Exportación a Excel

**Files:**
- Create: `src/domain/export.ts`, `src/app/api/export/route.ts`
- Modify: `src/app/(app)/comprobantes/page.tsx` (formulario desde/hasta + botón Exportar)
- Test: `tests/domain/export.test.ts`

**Interfaces:**
- Produces: `buildAccountingWorkbook(actor, { from: Date; to: Date }): Promise<Buffer>` — `export.excel`. Rango inclusivo por día en hora argentina. Hojas y columnas exactas (spec §8):
  1. `Comprobantes`: Número, Fecha, Pedido, Estado, Fecha envío, Fecha pago, Medio de pago, Total (filtra por `issuedAt`; incluye anulados con su estado).
  2. `Detalle`: Comprobante, Fecha, Tipo de caja, Cantidad, Precio unitario, Recargo, Subtotal.
  3. `Movimientos de stock`: Fecha, Material, Ubicación, Tipo, Cantidad, Pedido, Entrega, Usuario, Nota (filtra por `createdAt`).
  Números como celdas numéricas (formato `#,##0.00` para montos), fechas como fechas de Excel, fila de encabezado congelada.
- `GET /api/export?from=YYYY-MM-DD&to=YYYY-MM-DD` → `.xlsx` con nombre `dalmata-contabilidad-<from>-a-<to>.xlsx`; 403 si no tiene permiso.

- [ ] **Step 1: Tests que fallan** — leer el buffer con exceljs: existen las 3 hojas con esos nombres; la fila 2 de `Comprobantes` tiene `Total` de tipo number igual a 12000; `Fecha` es `Date`; un comprobante fuera del rango no aparece; DALMATA → `ForbiddenError`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run → PASS. Abrir un archivo de prueba en Excel/LibreOffice y verificar a ojo.
- [ ] **Step 5:** Commit `feat: exportación contable a Excel`.

---

### Task 10: Pantallas de inicio por rol

**Files:**
- Create: `src/domain/dashboard.ts`
- Modify: `src/app/(app)/page.tsx`
- Test: `tests/domain/dashboard.test.ts`

**Interfaces:**
- Consumes: `listOrders`, `getStockOverview`, `getAccountBalance`.
- Produces: `getDashboard(actor): Promise<{ readyForPickup: OrderSummary[]; openOrders: OrderSummary[]; stockAlerts: { name: string; available: number }[]; owed?: Decimal; unpaidCount?: number }>` — `owed`/`unpaidCount` presentes para todos los roles (Dalmata ve su saldo, spec §7).

- [ ] **Step 1: Test que falla** — con un pedido `LISTO` y uno `EN_PRODUCCION`: `readyForPickup` tiene 1; con disponible de tornillos < 0, `stockAlerts` lo incluye.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar. Inicio de DALMATA: "Listos para retirar" destacado arriba, pedidos abiertos, alertas de stock, saldo. Inicio de TALLER/ADMIN: pedidos abiertos por prioridad, alertas de stock, saldo e impagos.
- [ ] **Step 4:** Run → PASS. **Step 5:** Commit `feat: inicio por rol`.

---

### Task 11: Despliegue en el VPS y backups

**Files:**
- Create: `Dockerfile` (multi-stage, `output: 'standalone'`, corre `prisma migrate deploy` al arrancar), `docker-compose.prod.yml` (app + postgres 17, volúmenes `pgdata` y `uploads`, app escuchando solo en `127.0.0.1:3000`), `scripts/backup.sh`, `README.md`

**Interfaces:**
- `scripts/backup.sh`: `pg_dump` comprimido + tar de `uploads` a `/var/backups/gestiond/YYYY-MM-DD/`, borra los de más de 30 días. Pensado para cron diario a las 03:00.
- README: variables de entorno, primer arranque (`docker compose -f docker-compose.prod.yml up -d`, seed del admin), cómo conectarlo al reverse proxy/HTTPS que ya usa el VPS, instalación del cron, restauración desde un backup.

- [ ] **Step 1:** Escribir los archivos.
- [ ] **Step 2:** Verificar localmente: `docker compose -f docker-compose.prod.yml up -d --build`, login con el admin del seed en `http://127.0.0.1:3000`, crear un pedido, entregarlo, hacer comprobante y exportar.
- [ ] **Step 3:** Correr `scripts/backup.sh` contra el compose local y restaurar el dump en una base vacía; verificar que los pedidos están.
- [ ] **Step 4:** Commit `chore: docker de producción, backups y README`.
- [ ] **Step 5:** Publicar en el KVM 2 **solo con confirmación de Alejo** (es una acción sobre su servidor).

---

## Después del plan

1. **Auditoría:** revisión completa de la rama (correctness + `/security-review`), con foco en permisos de las server actions y rutas `/api/*`, sesiones y subida de archivos.
2. **Visual:** pasada de diseño (colores, tipografía, logo, ajustes en celular) sobre los componentes shadcn ya usados.
