# UI intuitiva — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cualquiera (el papá desde el celular, personal de Dalmata) use la app sin explicación, sin tocar la lógica.

**Architecture:** Capa de presentación nueva sobre lo existente: tema + componentes compartidos (`AppShell`, `PageHeader`, `Notice`, `EmptyState`, `ConfirmSubmit`, `Stepper`, `OrderCard`) y tres helpers puros testeados (`nav`, `steps`, `stock-actions`). Las páginas se reescriben solo en JSX/estilos; acciones de servidor, dominio y permisos no cambian.

**Tech Stack:** Next.js 15 App Router, Tailwind 4, shadcn base-nova (@base-ui/react), lucide-react, vitest.

**Spec:** `docs/superpowers/specs/2026-11-12-ui-intuitiva-design.md`

## Skills que se usan (y por qué)

| Skill | Cuándo | Para qué |
|---|---|---|
| `superpowers:executing-plans` o `subagent-driven-development` | Todo el plan | Ejecutar tarea por tarea (elige el usuario). |
| `superpowers:test-driven-development` | Tareas 3, 6, 8 | Los helpers puros (`nav`, `steps`, `stock-actions`) se escriben test primero. |
| `motion-design` | Tareas 1–2 | Fijar UNA regla de movimiento chica (150–200 ms ease-out, solo para feedback y abrir/cerrar) y nada más: el movimiento tiene que orientar, no distraer. |
| `run` + `claude-in-chrome` | Tarea 11 (y chequeos puntuales) | Levantar la app y recorrerla con cada rol a 390 px y 1280 px, con capturas. Es la prueba real de "intuitivo". |
| `web-motion-auditor` | Tarea 11 | Revisar `prefers-reduced-motion`, foco visible y que no haya animaciones de más. |
| `superpowers:verification-before-completion` | Tarea 12 | typecheck + lint + tests + build con la salida a la vista antes de decir "listo". |
| `superpowers:requesting-code-review` | Tarea 12 | Revisión de toda la rama con un revisor nuevo. |
| `superpowers:finishing-a-development-branch` | Tarea 12 | Decidir cómo se integra (merge a `feat/mvp` / PR). |

No se usan: `artifact-*` (no publicamos páginas), `dataviz` (no hay gráficos; el saldo son tres números), `gsap-*` (prohibido sumar librerías), los de video/animación.

## Global Constraints

- No agregar dependencias. Solo Tailwind, shadcn/base-ui existentes y `lucide-react`.
- No modificar `src/domain/**`, `src/lib/auth/**`, ningún `actions.ts`, `src/app/api/**` ni nombres de campos de formularios (`name=`). Los tests actuales siguen pasando sin cambios.
- Todo texto visible en español rioplatense ("Registrá", "Cargá").
- Toda acción con ícono lleva texto al lado. Nunca solo ícono.
- Altura mínima de controles táctiles: 44 px en móvil (`h-11`), 40 px en `sm:` y más.
- Nada de `alert/confirm/prompt` del navegador: las confirmaciones son en la página (`ConfirmSubmit`).
- Sin scroll horizontal a 360 px de ancho (excepto la tabla de movimientos en escritorio).
- Animaciones: solo `motion-safe:` con duración ≤ 200 ms.
- Vista `/comprobantes/[id]/imprimir`: sin navegación ni barra inferior al imprimir.

## Review Focus

1. **Barra inferior tapando contenido** en móvil (el botón "Confirmar entrega" queda debajo) → `main` lleva `pb-24` + `env(safe-area-inset-bottom)`; chequeo en Tarea 11.
2. **Doble toque en botones que descuentan stock o crean comprobante** → el botón muestra "Guardando…" y queda deshabilitado mientras `pending`; Tarea 2 (ActionForm expone `pending` vía `SubmitButton`), chequeo en Tarea 11.
3. **Perfil Dalmata con pocas secciones** → la barra inferior igual muestra "Más" (ahí está Salir) y "Más" no lista Catálogo/Usuarios; test en Tarea 3.
4. **Nombres largos / muchos tipos de caja en una tarjeta de pedido a 360 px** → corta con `truncate`/`line-clamp-2`, sin desbordar; chequeo en Tarea 11.
5. **Pedido cancelado o comprobante anulado** → el stepper no se muestra; aparece un aviso claro; test en Tarea 6.

---

### Task 0: Rama

- [ ] `git checkout -b feat/ui-intuitiva` (desde `feat/mvp`). Commitear spec + este plan: `docs: diseño y plan de UI intuitiva`.

### Task 1: Tema base

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`, `src/components/native-select.tsx`, `src/lib/labels.ts`

- [ ] **Step 1:** Arreglar fuente: en `@theme inline` poner `--font-sans: var(--font-geist-sans);` (hoy se referencia a sí misma).
- [ ] **Step 2:** Paleta cálida en `:root`: `--primary: oklch(0.55 0.15 45)` (terracota/madera), `--primary-foreground: oklch(0.99 0 0)`, `--background: oklch(0.985 0.005 80)`, `--card: oklch(1 0 0)`, `--muted: oklch(0.96 0.008 80)`, `--accent: oklch(0.95 0.03 60)`, `--ring: oklch(0.55 0.15 45)`. Agregar tokens `--success`, `--warning`, `--info` (+ `-foreground`) y mapearlos en `@theme inline` como `--color-success` etc. Borrar el bloque `.dark` no se hace (no estorba).
- [ ] **Step 3:** Tamaños táctiles: en `buttonVariants` `size.default` → `h-11 sm:h-10 px-4 gap-2`, `sm` → `h-9 px-3`, `lg` → `h-12 px-5 text-base`. Input/Textarea/NativeSelect a `h-11 sm:h-10 text-base sm:text-sm` (16 px en móvil evita el zoom de iOS).
- [ ] **Step 4:** `STATUS_COLOR` usa los tokens nuevos (LISTO/PAGADO → success, PARCIAL → warning, EN_PRODUCCION/ENVIADO → info, CANCELADO/ANULADO → destructive). Agregar `PRIORITY_COLOR: Record<"ALTA"|"MEDIA"|"BAJA", string>` (ALTA destructive, MEDIA warning, BAJA muted).
- [ ] **Step 5:** Usar `motion-design` para fijar la regla: clase utilitaria `.anim-in` = `motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 duration-150` en `globals.css` (`@utility`).
- [ ] **Step 6:** `npm run typecheck && npm run build` → sin errores. Commit `style: tema cálido, fuente y controles táctiles`.

### Task 2: Componentes compartidos

**Files:** Create `src/components/page-header.tsx`, `notice.tsx`, `empty-state.tsx`, `confirm-submit.tsx`, `submit-button.tsx` (`stepper.tsx` se crea en Tarea 6). Modify `src/components/action-form.tsx`, `status-badge.tsx`.

**Interfaces (Produces):**
- `PageHeader({ title: string; back?: { href: string; label: string }; description?: string; actions?: ReactNode })` — título `text-2xl font-semibold`, link "← label" arriba, acciones a la derecha (abajo y a lo ancho en móvil).
- `Notice({ tone: "info"|"success"|"warning"|"error"; title?: string; children: ReactNode })` — caja con ícono lucide (`Info`, `CheckCircle2`, `AlertTriangle`, `XCircle`), `role="status"` (o `alert` para error).
- `EmptyState({ icon: LucideIcon; title: string; hint?: string; action?: ReactNode })`.
- `SubmitButton(props: ButtonProps & { pendingLabel?: string })` — client; usa `useFormStatus()`; deshabilitado y con `pendingLabel ?? "Guardando…"` + spinner `Loader2` mientras envía.
- `ConfirmSubmit({ label: string; question: string; confirmLabel: string; variant?: "destructive"|"default"; children?: ReactNode })` — client; primer toque muestra en el lugar `question`, los `children` (p.ej. input de motivo) y dos botones: `SubmitButton` con `confirmLabel` y "No, volver". Sin diálogos del navegador.
- `Stepper({ steps: Step[] })` — server; `Step` viene de Tarea 6 (`src/lib/steps.ts`). Horizontal con números/check; en móvil vertical compacto. El paso `current` resaltado con `primary`.
- `ActionForm`: el mensaje de resultado pasa a `<Notice>` (`ok`→success, `warning`→warning, `error`→error) con `.anim-in`. Se mantiene su API.
- `StatusBadge`: agrega punto de color antes del texto; tamaño `text-sm` (más legible).

- [ ] **Step 1:** Implementar los componentes, menos `Stepper` (su interfaz está acá para referencia, pero se crea en Tarea 6 junto con su helper).
- [ ] **Step 2:** Reemplazar en todo `src/app/**` los `<Button type="submit">` dentro de `ActionForm` por `<SubmitButton>` (mismo texto, mismas variantes).
- [ ] **Step 3:** `npm run typecheck && npm test` → pasa. Commit `feat(ui): componentes compartidos y feedback de formularios`.

### Task 3: Navegación (AppShell)

**Files:** Create `src/lib/nav.ts`, `src/components/app-shell/sidebar.tsx`, `bottom-bar.tsx`, `src/app/(app)/mas/page.tsx`. Modify `src/app/(app)/layout.tsx`. Test `tests/ui/nav.test.ts`.

**Interfaces (Produces):**
```ts
export type NavIcon = "home" | "orders" | "stock" | "invoices" | "catalog" | "users" | "more";
export type NavItem = { href: string; label: string; icon: NavIcon };
export function mainItems(user: SessionUser): NavItem[];   // Inicio, Pedidos, Stock, Comprobantes (filtrados por permiso)
export function moreItems(user: SessionUser): NavItem[];   // Catálogo (catalog.edit), Usuarios (users.manage)
export function bottomBarItems(user: SessionUser): NavItem[]; // mainItems + { href:"/mas", label:"Más", icon:"more" }
export function isActive(pathname: string, href: string, user?: SessionUser): boolean;
// "/" solo exacto; resto: igual o prefijo `${href}/`; "/mas" también activo si pathname cae en algún moreItems.
```

- [ ] **Step 1: Tests fallando** en `tests/ui/nav.test.ts`:
  - `bottomBarItems(dalmata).map(i=>i.label)` → `["Inicio","Pedidos","Stock","Comprobantes","Más"]`
  - `moreItems(dalmata)` → `[]`; `moreItems(taller).map(l)` → `["Catálogo"]`; `moreItems(admin).map(l)` → `["Catálogo","Usuarios"]`
  - `isActive("/", "/")` true; `isActive("/pedidos", "/")` false; `isActive("/pedidos/abc/entregar", "/pedidos")` true; `isActive("/pedidosx", "/pedidos")` false; `isActive("/catalogo/1", "/mas", admin)` true.
- [ ] **Step 2:** `npx vitest run tests/ui/nav.test.ts` → FAIL (módulo no existe).
- [ ] **Step 3:** Implementar `src/lib/nav.ts`.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** UI: `Sidebar` (client, `usePathname`) visible `md:` y más: marca "Gestión Dalmata", items de `mainItems`+`moreItems` con ícono+texto, activo con `bg-accent text-primary font-semibold`, abajo nombre · perfil y "Salir". `BottomBar` (client) `md:hidden fixed bottom-0`, 5 columnas, ícono arriba + texto abajo (`text-xs`), activo en `primary`, `pb-[env(safe-area-inset-bottom)]`. Página `/mas`: tarjeta con nombre y perfil, links grandes a `moreItems`, link "Movimientos de stock" y "Saldo de cuenta", y botón "Salir" (form `logoutAction`). Layout: `main` con `pb-24 md:pb-8`, todo `print:hidden` salvo `main`. Mapear `NavIcon` → lucide (`Home`, `ClipboardList`, `Package`, `Receipt`, `BookOpen`, `Users`, `Menu`).
- [ ] **Step 6:** `npm run typecheck && npm test` → pasa. Commit `feat(ui): navegación lateral y barra inferior`.

### Task 4: Inicio por rol

**Files:** Modify `src/app/(app)/page.tsx`. Create `src/components/order-card.tsx`.

**Interfaces (Produces):** `OrderCard({ href: string; number: number; createdAt: Date; priority: Priority; status: OrderStatus; boxes: number; boxNames: string; highlight?: boolean })` — tarjeta tocable entera: fila 1 "Pedido #N" + `StatusBadge`; fila 2 chip de prioridad (`PRIORITY_COLOR`) + "N cajas"; fila 3 `boxNames` `line-clamp-2` en muted; fecha a la derecha. Lo usan Tareas 4 y 5.

- [ ] **Step 1:** Inicio: saludo + una frase de qué ve según rol (Dalmata: "Acá ves cómo van tus pedidos."; Taller/Admin: "Esto es lo que hay que hacer hoy."). Botón primario grande con ícono `Plus` "Nuevo pedido" (si `orders.create`), ancho completo en móvil.
- [ ] **Step 2:** Bloques en orden por rol con `OrderCard` y `EmptyState`. Alertas de stock como `Notice tone="warning"` con link "Ver stock". Saldo como tarjeta con monto grande y "Ver saldo →". Dalmata: Listos para retirar (destacados, `highlight`) → En curso → Saldo. Taller/Admin: Alerta stock → Abiertos por prioridad → Listos → Saldo.
- [ ] **Step 3:** typecheck. Commit `feat(ui): inicio con tarjetas por rol`.

### Task 5: Lista de pedidos y formularios de pedido

**Files:** Modify `src/app/(app)/pedidos/page.tsx`, `order-form.tsx`, `nuevo/page.tsx`, `[id]/editar/page.tsx`.

- [ ] **Step 1:** Lista: `PageHeader` con acción "Nuevo pedido". Filtros como pestañas tipo segmento (scroll horizontal propio si no entran, `aria-current="page"` en la activa). Lista de `OrderCard`; vacío con `EmptyState` ("No hay pedidos acá" + botón Nuevo pedido si puede).
- [ ] **Step 2:** `OrderForm` en tres bloques numerados con `Card`: "1. ¿Qué cajas?" (cada línea en su tarjeta; cantidad grande `inputMode=numeric`; "Con logo grabado" con `Checkbox` grande y etiqueta tocable; "Quitar" con ícono `Trash2` + texto), "2. Detalles" (prioridad como 3 botones-radio Alta/Media/Baja con color, usando `<input type="radio" name="priority">` estilizados; fecha deseada), "3. Mockups y observaciones". Botón final `SubmitButton size="lg"` ancho completo en móvil. Mismos `name=` que hoy.
- [ ] **Step 3:** typecheck + `npm test`. Commit `feat(ui): lista y formulario de pedidos`.

### Task 6: Detalle de pedido con pasos

**Files:** Create `src/lib/steps.ts`, `src/components/stepper.tsx`. Modify `src/app/(app)/pedidos/[id]/page.tsx`, `deliveries-section.tsx`, `entregar/page.tsx`, `invoice-button.tsx`. Test `tests/ui/steps.test.ts`.

**Interfaces (Produces):**
```ts
export type Step = { label: string; state: "done" | "current" | "todo" };
export function orderSteps(status: OrderStatus): Step[] | null;
// Recibido · En producción · Listo para retirar · Entregado. CANCELADO → null.
export function invoiceSteps(status: InvoiceStatus): Step[] | null;
// Emitido · Enviado a Dalmata · Pagado. ANULADO → null.
```

- [ ] **Step 1: Tests fallando** (`tests/ui/steps.test.ts`):
  - `orderSteps("RECIBIDO")!.map(s=>s.state)` → `["current","todo","todo","todo"]`
  - `orderSteps("EN_PRODUCCION")` → `["done","current","todo","todo"]`
  - `orderSteps("PARCIAL")` → `["done","done","done","current"]` y `[3].label === "Entregado parcialmente"`
  - `orderSteps("ENTREGADO")` → todos `"done"`
  - `orderSteps("CANCELADO")` → `null`; `invoiceSteps("ANULADO")` → `null`
  - `invoiceSteps("ENVIADO")` → `["done","current","todo"]`; `invoiceSteps("PAGADO")` → todos `"done"`
- [ ] **Step 2:** Run → FAIL. **Step 3:** implementar. **Step 4:** Run → PASS.
- [ ] **Step 5:** `Stepper` (ver Tarea 2). Detalle: `PageHeader` (back "Pedidos"), `Stepper` o `Notice tone="error"` "Este pedido fue cancelado". Debajo, tarjeta **"Siguiente paso"** con el botón primario grande que corresponda (de `NEXT_STATUS` el que no empieza con "Volver", o "Registrar entrega" si es entregable) y una frase ("Cuando terminen las cajas, marcalo listo: Dalmata lo va a ver en su inicio."). Botones "Volver a…" y "Editar" como `outline` pequeños aparte. "Cancelar pedido" con `ConfirmSubmit` (question "¿Cancelar el pedido #N? No se puede deshacer.", confirmLabel "Sí, cancelar").
- [ ] **Step 6:** Cajas: tarjetas por línea en móvil ("12 × Premium · con logo · faltan entregar 4"), tabla en `sm:`. Mockups: grilla con miniaturas, subida con input de archivo grande y `EmptyState` si no hay.
- [ ] **Step 7:** Entregas: cada entrega una `Card`; "Hacer comprobante" primario con ícono `Receipt`; anular con `ConfirmSubmit` cuyo `children` es el input "Motivo". Página entregar: pasos "¿Cuándo?", "¿Quién se lo lleva?", "¿Cuántas cajas?" (cada línea con cantidad grande y "de N pendientes"), `SubmitButton size="lg"` "Confirmar entrega" con `pendingLabel="Registrando…"`.
- [ ] **Step 8:** typecheck + `npm test`. Commit `feat(ui): detalle de pedido con pasos y siguiente acción`.

### Task 7: Comprobantes y saldo

**Files:** Modify `src/app/(app)/comprobantes/page.tsx`, `[id]/page.tsx`, `saldo/page.tsx`, `invoice-body.tsx` (solo clases), `[id]/imprimir/page.tsx` (solo clases).

- [ ] **Step 1:** Lista: `PageHeader` con "Saldo" y "Exportar a Excel" (ícono `Download`). Filtros dentro de `<details>` "Filtrar" en móvil (abierto en `md:`). Ayuda bajo Exportar: "Sin fechas, exporta el mes actual." (texto visible, no `title`). Filas como tarjetas: "#N · Pedido #M", monto grande a la derecha, badge.
- [ ] **Step 2:** Detalle: `Stepper` con `invoiceSteps` o `Notice` "Comprobante anulado". Tarjeta "Siguiente paso": EMITIDO → "Marcar enviado a Dalmata" (frase: "Cuando se lo mandes a Dalmata."); ENVIADO → formulario "Registrar pago". Ajustes de precio/recargo en `<details>` "Ajustar precio o recargo". Anular con `ConfirmSubmit` + motivo. "Imprimir / PDF" con ícono `Printer`.
- [ ] **Step 3:** Saldo: tres números grandes; "Adeudado" destacado (`text-3xl`, color warning si > 0, success si 0). Impagos como tarjetas con "hace N días" destacado si > 30.
- [ ] **Step 4:** Abrir `/comprobantes/<id>/imprimir` y verificar con vista de impresión que no aparece navegación. typecheck. Commit `feat(ui): comprobantes y saldo`.

### Task 8: Stock con "¿Qué pasó?"

**Files:** Create `src/app/(app)/stock/stock-actions.ts`, `stock-action-picker.tsx`. Modify `stock/page.tsx`, `stock/forms.tsx`, `stock/movimientos/page.tsx`. Test `tests/ui/stock-actions.test.ts`.

**Interfaces (Produces):**
```ts
export type StockActionKey = "ingreso" | "retiro" | "uso" | "descarte" | "llegada" | "ajuste";
export type StockActionInfo = { key: StockActionKey; title: string; help: string };
export function stockActionsFor(user: SessionUser): StockActionInfo[];
```
Textos exactos y orden:
| key | title | help | permiso |
|---|---|---|---|
| ingreso | Llegaron herrajes al taller | Sumá bisagras, cierres o tornillos que compraste. | stock.move |
| retiro | Retiré placas de Dalmata | Las placas pasan de Dalmata al taller. | stock.move |
| uso | Usé o descarté placas | Placas que se gastaron o rompieron en el taller. | stock.move |
| descarte | Herrajes fallados | Descontá los que se rompieron o vinieron mal. | stock.move |
| llegada | Llegaron placas a Dalmata | Placas que dejó el proveedor en Dalmata. | stock.registerArrival |
| ajuste | Corregir un conteo | Si contaste y no coincide, cargá la diferencia. | stock.move |

- [ ] **Step 1: Tests fallando:** `stockActionsFor(dalmata).map(a=>a.key)` → `["llegada"]`; `stockActionsFor(taller).map(k)` → `["ingreso","retiro","uso","descarte","llegada","ajuste"]`; admin igual que taller.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `StockActionPicker` (client): recibe `actions: StockActionInfo[]` y `forms: Record<StockActionKey, ReactNode>` (los formularios se renderizan en el server y se pasan como nodos). Muestra "¿Qué pasó?" y una grilla de botones grandes (ícono + title + help). Al tocar uno, se ocultan los demás y aparece solo ese formulario con su título y "← Elegir otra cosa". Si hay un solo action (Dalmata), muestra directamente el formulario.
- [ ] **Step 6:** Formularios (`forms.tsx`): cada campo con `Label` visible (hoy solo placeholder); `QuantityForm` acepta `unitHint?: string`; ajuste: label "Diferencia (ej. 5 si sobran, -5 si faltan)". Mismos `name=`.
- [ ] **Step 7:** Stock: arriba el picker; abajo "Cómo estamos": herrajes como tarjetas en móvil (nombre, "Hay N · Reservado N · Libre N", badge rojo "Falta N" si libre < 0), tabla en `sm:`; placas en dos columnas "En Dalmata / En taller". Link "Ver movimientos" con ícono `History`.
- [ ] **Step 8:** Movimientos: filtros con labels visibles; en móvil lista de tarjetas (fecha, material, +N/−N grande con color, tipo, usuario, nota); tabla en `md:`. Paginación como botones `outline`.
- [ ] **Step 9:** typecheck + `npm test`. Commit `feat(ui): stock guiado por "¿Qué pasó?"`.

### Task 9: Catálogo, usuarios y login

**Files:** Modify `src/app/(app)/catalogo/page.tsx`, `catalogo/[id]/page.tsx`, `catalogo/recipe-fields.tsx`, `usuarios/page.tsx`, `src/app/login/page.tsx`.

- [ ] **Step 1:** Catálogo: `PageHeader`; tipos de caja como tarjetas tocables (nombre, precio grande, badge "Inactivo"); "Nuevo tipo de caja" en `Card` colapsable (`<details>`). Detalle: secciones en `Card`, historial de precios como lista con la fecha clara.
- [ ] **Step 2:** Usuarios: tarjeta por usuario con badge de perfil y estado; "Desactivar" con `ConfirmSubmit`; "Cambiar contraseña" en `<details>`. "Nuevo usuario" en `Card`.
- [ ] **Step 3:** Login: fondo `muted`, tarjeta centrada con ícono `Package` + "Gestión Dalmata", labels grandes, botón `size="lg"` ancho completo, `SubmitButton pendingLabel="Entrando…"`.
- [ ] **Step 4:** typecheck + `npm test`. Commit `feat(ui): catálogo, usuarios y login`.

### Task 10: Pulido de copy y estados vacíos

- [ ] **Step 1:** `grep -rn "text-muted-foreground\">No hay\|Sin mockups\|Todavía no" src/app` → todo vacío pasa a `EmptyState` con un `hint` de qué hacer.
- [ ] **Step 2:** Revisar `src/lib/messages.ts` (solo lectura): si algún mensaje es técnico, anotarlo para el usuario (no se cambia: está fuera de alcance).
- [ ] **Step 3:** Commit `style(ui): estados vacíos y textos de ayuda`.

### Task 11: Verificación visual (skills `run`, `claude-in-chrome`, `web-motion-auditor`)

- [ ] **Step 1:** `docker compose -f docker-compose.dev.yml up -d`, `npm run dev`. Con la skill `run`, cargar datos: un usuario de cada perfil (Admin crea Taller y Dalmata), 2 tipos de caja, 3 pedidos (uno listo, uno parcial, uno cancelado), un comprobante enviado.
- [ ] **Step 2:** Con `claude-in-chrome`, a 390×844 y 1280×800, recorrer por perfil: login → inicio → nuevo pedido → detalle → registrar entrega → hacer comprobante → marcar enviado/pagado → stock "¿Qué pasó?" → Más → Salir. Capturar cada pantalla.
- [ ] **Step 3:** Checklist por pantalla (fallas se corrigen ahí mismo): ¿se entiende qué es y qué hacer en 5 s? ¿hay un solo botón principal? ¿la barra inferior no tapa nada? ¿sin scroll horizontal a 390? ¿nombres largos cortan bien? ¿doble toque en "Confirmar entrega" no duplica (aparece "Registrando…")? ¿vista de impresión limpia?
- [ ] **Step 4:** `web-motion-auditor` sobre los cambios: reduced-motion, foco visible con teclado, nada de animación decorativa.
- [ ] **Step 5:** Commit de las correcciones `fix(ui): ajustes tras la revisión visual`.

### Task 12: Cierre

- [ ] **Step 1:** `superpowers:verification-before-completion`: `npm run typecheck && npm run lint && npm test && npm run build` → todo verde, con salida a la vista.
- [ ] **Step 2:** `superpowers:requesting-code-review` sobre `feat/mvp..feat/ui-intuitiva`; atender hallazgos.
- [ ] **Step 3:** `superpowers:finishing-a-development-branch`: proponer merge a `feat/mvp` o PR.
