# UI intuitiva — diseño (cambio chico)

**Intención.** Terminar la parte visual de Gestión Dalmata. La estética queda a criterio del builder; lo que manda es que **cualquiera la pueda usar sin explicación**: el papá cargando desde el celular en el taller y personal de Dalmata no técnico.

**Objetivos.**
- Saber siempre dónde estoy y qué puedo hacer (navegación con estado activo, ícono + texto).
- Una acción principal clara por pantalla; botones grandes para el dedo (≥ 44px).
- Lenguaje llano: cada acción de stock explica en una frase qué hace.
- Feedback inequívoco: éxito / aviso / error visibles; confirmación antes de anular.
- Usable en celular (≥ 360px) sin scroll horizontal; tablas pasan a tarjetas.

**No-objetivos.** Cambiar lógica de dominio, acciones de servidor, permisos o flujos. Modo oscuro. Branding/logo.

**Anti-objetivos.** Que algo que hoy funciona deje de funcionar; que se rompan tests; animaciones que distraigan; íconos sin texto.

**Restricciones.** Next.js 15 + Tailwind 4 + shadcn (base-nova, @base-ui/react) + lucide ya instalados. No agregar librerías de UI nuevas. La vista imprimible del comprobante sigue imprimiéndose limpia.

**Approaches.**
1. *Rediseño de presentación sobre el stack actual* (elegido): mismo shadcn/Tailwind, nuevos componentes compartidos (AppShell, PageHeader, EmptyState, ConfirmButton, StatusStepper), páginas reescritas solo en JSX/estilos.
2. *Cambiar a otra librería de componentes*: descartado, costo alto sin ganancia de usabilidad.
3. *Rehacer flujos (wizards multi-paso)*: descartado, toca lógica y riesgo de romper lo que anda.

**Lo decidido.**
- Navegación: barra inferior en móvil (Inicio · Pedidos · Stock · Comprobantes · Más), sidebar en escritorio, sección activa resaltada.
- Inicio por rol con tarjetas "qué hacer ahora" y botón de acción principal.
- Stock: botones "¿Qué pasó?" que abren un solo formulario con explicación.
- Pedidos: tarjetas con color de estado y prioridad, filtros en pestañas, stepper de estado en el detalle con el siguiente paso.
- Acento cálido; arreglar la fuente Geist (hoy `--font-sans` se referencia a sí misma).

**Queda al builder.** Paleta exacta, espaciados, textos de ayuda, qué tablas pasan a tarjetas en móvil.
