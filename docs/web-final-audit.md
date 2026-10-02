# Auditoría final interna de la web

**Fecha:** 2 de octubre de 2026  
**Alcance:** aplicación web responsive, rutas públicas, protección de rutas privadas, build, dependencias, SEO técnico, accesibilidad revisable desde código y rendimiento HTTP.  
**Resultado:** apta con observaciones para un piloto controlado; no apta todavía para cobros reales ni apertura comercial general.

## Resumen

- Hallazgos críticos: **0**.
- Hallazgos mayores: **3**.
- Hallazgos medios: **3**.
- El build de producción compila correctamente con 34 rutas.
- ESLint y TypeScript pasan sin errores.
- Las dependencias de producción no reportan vulnerabilidades conocidas en `npm audit --omit=dev`.

## Verificaciones aprobadas

### Aplicación y rutas

- `/`, `/buscar`, `/complejos`, el complejo de demostración, autenticación, `robots.txt` y `sitemap.xml` responden con HTTP 200.
- `/cuenta`, `/jugador`, `/propietario` y `/admin` redirigen a iniciar sesión cuando no existe una sesión válida.
- Una ruta inexistente responde con HTTP 404.
- La carga local de producción no produjo errores del servidor durante las pruebas.

### SEO y semántica pública

- Las páginas públicas principales tienen título y descripción propios.
- Los canonical publicados apuntan a `https://canchea-neon.vercel.app`.
- La portada, búsqueda, listado y detalle del complejo tienen un único `h1` en el contenido final.
- No se detectaron imágenes públicas sin atributo `alt`.
- `robots.txt` bloquea áreas privadas, autenticación, checkout y API.
- El sitemap contiene portada, búsqueda, listado y complejos aprobados.
- Las páginas privadas y de autenticación usan `noindex`.

### Seguridad básica

- HTTPS y HSTS están activos en Vercel.
- No hay secretos reales versionados; sólo `.env.example` con marcadores de reemplazo.
- No se detectaron vulnerabilidades conocidas en las 27 dependencias de producción auditadas.
- Las áreas privadas no entregan contenido anónimo.

### Accesibilidad ya presente

- Idioma principal `es` declarado.
- Enlace para saltar a resultados en búsqueda.
- Indicador global de foco visible.
- Formularios principales con etiquetas e instrucciones.
- Botones semánticos para las acciones JavaScript revisadas.
- Imágenes informativas con texto alternativo y hero decorativo con `alt` vacío.
- Soporte para `prefers-reduced-motion`.

## Hallazgos

### WEB-01 — Cabeceras defensivas incompletas

**Severidad:** mayor  
**Estado observado:** la respuesta publicada incluye HSTS, pero no declara CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` ni una política explícita contra framing.

**Recomendación:** configurar cabeceras comunes desde `next.config.ts`, deshabilitar `poweredByHeader` y definir una CSP compatible con Supabase, Google OAuth, Vercel y los proveedores que finalmente se aprueben. La CSP no debe improvisarse antes de conocer todos los orígenes externos.

### WEB-02 — Contraste insuficiente en textos de acento

**Severidad:** mayor  
**Criterio:** WCAG 2.1 AA 1.4.3.

- Verde principal `#22C55E` sobre blanco: **2.28:1**; no cumple 4.5:1 para texto normal.
- Gris `#64748B` sobre fondo `#F4F6F5`: **4.38:1**; queda por debajo de 4.5:1.
- Verde oscuro `#08783E` sobre blanco: **5.58:1**; sí cumple.
- Texto oscuro sobre botón verde principal: **8.46:1**; sí cumple.

**Recomendación:** conservar `#22C55E` para fondos, botones, bordes e identidad; usar un verde oscuro como `#08783E` para textos sobre superficies claras y oscurecer ligeramente el token de texto secundario.

### WEB-03 — Algunos objetivos táctiles son menores a 44 px

**Severidad:** mayor para uso móvil  
**Criterio:** objetivo táctil de 44 × 44 px adoptado por el sistema de diseño.

Se detectaron controles interactivos con alturas de 38, 40, 42 o 43 px, principalmente en:

- ordenamiento por ubicación;
- acciones de canchas;
- eliminación de reglas de precio y bloqueos;
- selectores de configuración;
- herramientas del calendario.

**Recomendación:** aplicar un mínimo uniforme de 44 px a botones, enlaces de acción, selects e inputs táctiles.

### WEB-04 — Latencia mejorable en búsqueda y detalle

**Severidad:** media.

Mediciones orientativas desde la auditoría:

- búsqueda publicada: aproximadamente **2.7 s**;
- detalle publicado del complejo de demostración: aproximadamente **1.7 s**;
- búsqueda local con backend remoto, después del primer acceso: aproximadamente **1.4 s**;
- detalle local con backend remoto: aproximadamente **2.0 s**.

**Recomendación:** medir con tráfico real antes de optimizar. Si se confirma el problema, revisar el RPC de disponibilidad, consultas de fotografías firmadas, índices y estrategia de caché sin cachear disponibilidad vencida.

### WEB-05 — Falta una prueba E2E automatizada del recorrido principal

**Severidad:** media.

El proyecto verifica lint, tipos, build y base de datos, pero todavía no dispone de una prueba de navegador versionada para:

1. buscar disponibilidad;
2. abrir un complejo;
3. elegir cancha y horario;
4. iniciar sesión;
5. crear el hold;
6. completar el pago simulado;
7. comprobar la reserva en jugador, propietario y administrador.

**Recomendación:** añadir esta prueba antes de cambios frecuentes o de incorporar más desarrolladores.

### WEB-06 — Dependencias externas de lanzamiento

**Severidad:** media para el piloto; bloqueante para cobros reales.

Siguen pendientes el proveedor de pagos, dominio definitivo, correo transaccional, WhatsApp, secretos definitivos, protección contra contraseñas filtradas y configuración final de URLs OAuth.

## Orden recomendado de cierre

1. Corregir contraste y objetivos táctiles.
2. Añadir cabeceras defensivas compatibles con los servicios actuales.
3. Ejecutar nuevamente lint, tipos, build y comprobaciones HTTP.
4. Añadir la prueba E2E del recorrido principal.
5. Medir el rendimiento durante el piloto y optimizar sólo con evidencia.
6. Integrar proveedores externos antes de aceptar dinero real.

## Limitaciones de esta auditoría

- No se ejecutaron acciones que alteren datos productivos.
- Los recorridos autenticados fueron validados por redirección, código, build y verificaciones documentadas previamente; no se creó una nueva reserva productiva durante esta auditoría.
- La captura headless del navegador no estuvo disponible en esta máquina. La revisión responsive se basó en HTML, CSS, breakpoints, tamaños táctiles y las capturas reales compartidas durante el desarrollo.
- Antes de apertura general sigue siendo necesaria una prueba manual corta con teléfono real, teclado y lector de pantalla.
