# CANCHEA — Design system

Este sistema visual corresponde al brand kit recibido en la Fase 1. La referencia original se conserva en `docs/brand-kit-reference.png`.

## Principios

- Deportivo sin estética agresiva.
- Premium, claro y cercano.
- Mobile-first entre 375 y 430 px.
- Fotografías protagonistas y datos fáciles de comparar.
- Acciones reales o estados futuros explícitamente identificados.

## Tokens

| Token | Valor | Uso |
|---|---|---|
| `brand-primary` | `#22C55E` | Verde principal y marca |
| `brand-primary-text` | `#08783E` | Verde accesible para texto e iconos sobre fondos claros |
| `brand-primary-dark` | `#0F3D2E` | Contraste y fondos oscuros |
| `brand-secondary` | `#0F3D2E` | Textos y acentos secundarios |
| `brand-accent` | `#A3E635` | Disponibilidad y foco |
| `brand-background` | `#F4F6F5` | Fondo general |
| `brand-surface` | `#FFFFFF` | Cards y formularios |
| `brand-text` | `#0B0F0E` | Negro de marca y texto principal |
| `brand-gray-secondary` | `#94A3B8` | Gris secundario oficial |
| `brand-muted` | `#5F6F82` | Derivado accesible del gris secundario `#94A3B8` para texto pequeño |
| `brand-border` | `#DCE4E0` | Bordes derivados de la paleta |
| `brand-success` | `#10B981` | Éxito |
| `brand-warning` | `#B45309` | Extensión semántica para advertencias |
| `brand-error` | `#EF4444` | Errores |

Tipografía: Inter variable, autoalojada por Next.js. Titulares en Bold, etiquetas y acciones en Semibold/Bold, cuerpo en Regular. Radios: 12, 18 y 28 px. Transiciones habituales: 180 ms. Los controles táctiles tienen al menos 44 px.

## Componentes de la fase

### Button

Variantes `primary`, `dark`, `accent` y estado futuro explícito. El botón verde principal usa texto negro porque la combinación `#22C55E` con blanco no alcanza contraste AA para texto normal. Mantiene foco de alto contraste y altura mínima de 50 px.

El verde principal se conserva para marca, fondos y controles. Sobre superficies claras, los textos y los iconos usan `brand-primary-text` para mantener contraste AA.

### Search panel

Agrupa deporte, zona, fecha y hora. En esta fase funciona como demostración local y desplaza a los resultados demo; la disponibilidad real se conectará en la Fase 6.

### Venue card

Muestra fotografía, deporte, zona, valoración, servicios, precio y un horario demostrativo. El horario se presenta como dato, no como botón de reserva.

### Brand lockup

El nombre, lema y metadatos viven en `src/config/brand.ts`. Mientras se recibe el logo oficial como SVG o PNG transparente, la interfaz usa una aproximación geométrica construida con tokens; no se recorta el logo desde la lámina para evitar pérdida de calidad.

## Accesibilidad

- Enlace para saltar al contenido.
- HTML semántico con encabezados jerárquicos.
- Labels visibles en el buscador.
- Foco visible con el color accent.
- Texto alternativo descriptivo en fotografías informativas.
- Reducción de movimiento con `prefers-reduced-motion`.
- Contraste alto en textos y acciones.
