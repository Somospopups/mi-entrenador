# Mi Entrenador · Popups Fitness

La app para personal trainers: el profe arma los planes desde su panel
y cada alumno entra con su DNI y ve su plan del día como un mazo de
tarjetas con ilustraciones propias, marcando ✓/✗.

- **App publicada**: https://somospopups.github.io/mi-entrenador/
- **Tres niveles**: Dueño → Entrenadores → Alumnos, con aislamiento
  garantizado por RLS en el servidor (Supabase, proyecto
  entrenador-produccion de la organización Popups Fitness).
- **Modo demo local**: agregar `#local` a la dirección.
- Servidor: `SUPABASE_FITNESS_3NIVELES.sql` (tablas y políticas) y
  `edge-function-alta.ts` (alta de cuentas, desplegada como
  `super-responder`).
- Las 44 ilustraciones de ejercicios son propias, generadas a medida.
