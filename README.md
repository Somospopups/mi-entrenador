# Mi Entrenador · demo de producto

Prototipo web responsive e instalable (PWA) para presentar una experiencia de entrenamiento a potenciales clientes. Nombre de trabajo: **Mi Entrenador**. No es la marca final ni está conectada a un servicio remoto.

## Acceso de demostración

- **Entrenadora:** `coach@mi-entrenador.demo` / `entrena2026`
- **Alumno:** `alumno@mi-entrenador.demo` / `entrena2026`

También se puede entrar con un clic desde las tarjetas de la pantalla de acceso. La comprobación es local, codificada en el front-end y **no es autenticación segura**.

## Flujos que se pueden probar

- Recorrido comercial guiado de siete etapas, con resaltado de la pantalla que explica.
- Navegación como entrenadora y como alumno, cerrar sesión y volver al acceso demo.
- Buscar/filtrar alumnos; crear fichas de muestra y abrir sus perfiles.
- Crear rutinas, asignarlas a alumnos y consultar la biblioteca ilustrada de ejercicios.
- Registrar un entrenamiento, ver el cuerpo completo en tarjetas grandes con transiciones entre las poses inicial y final de RepDB, marcar ejercicios, usar el temporizador y consultar el historial local.
- Registrar/actualizar cobros y exportar listados CSV.
- Crear sesiones en la agenda, explorar meses, invitar miembros del equipo.
- Reiniciar los datos demo desde Configuración.
- Animaciones de entrada, microinteracciones y diseño adaptado a móvil/tablet/escritorio.

Los cambios se guardan solo en `localStorage` cuando el navegador/visor lo permite; en un iframe aislado pueden durar solo mientras esté abierto. Usá exclusivamente datos ficticios.

## Imágenes y atribución

Las ilustraciones incluidas son archivos planos de la distribución gratuita del dataset de RepDB, usados dentro de esta demo. **Exercise data by [RepDB](https://repdb.co)**. El tier gratuito permite uso comercial dentro de aplicaciones con atribución; no redistribuir el catálogo como dataset. No se incluyen animaciones premium.

## Qué falta antes de vender/publicar como producto

Backend y base de datos compartida, autenticación real, autorización por roles, sincronización entre dispositivos, privacidad/retención, infraestructura de pagos, notificaciones, canal de solicitudes comerciales y revisión de los términos de marca/contenido. Los accesos del prototipo no protegen información.

## Ejecutar

Serví esta carpeta por HTTP (requerido para la PWA):

```bash
python3 -m http.server 4182 --bind 0.0.0.0
```

Abrí `http://localhost:4182/`. La vista en vivo del proyecto usa el mismo servidor.
