# CANCHEA

**Estado:** piloto web en desarrollo y validación  
**Decisión vigente:** probar primero el negocio mediante la web responsive y decidir la inversión en aplicaciones móviles con evidencia real.

## Estrategia de producto

- La web actual es el producto piloto de CANCHEA.
- Su objetivo es validar las interacciones, el mercado, el nicho, el flujo operativo y la demanda real de reservas.
- La aplicación móvil nativa no se construirá sólo por calendario: se iniciará cuando los datos del piloto justifiquen la inversión.
- Los flujos que funcionen en la web deben convertirse en la base funcional de la futura aplicación, evitando reconstruir funcionalidades que todavía no hayan sido validadas.
- Fresha es una referencia de arquitectura y experiencia móvil, no una referencia para copiar su identidad visual, textos ni recursos gráficos.

## Señales que debe validar el piloto

- volumen de búsquedas y consultas de disponibilidad;
- conversión desde búsqueda hasta reserva confirmada;
- cantidad y recurrencia de reservas por jugador;
- complejos y canchas activos, disponibilidad y ocupación;
- cancelaciones, inasistencias, reembolsos y carga de soporte;
- comisión, costos operativos y viabilidad económica por reserva;
- zonas, deportes y perfiles de usuario que conforman el nicho con mejor respuesta;
- recorridos más utilizados desde teléfonos y principales puntos de abandono.

Los umbrales numéricos para aprobar la inversión móvil se definirán después de obtener una línea base confiable del piloto.

## Dirección funcional de la futura aplicación móvil

### Navegación principal

1. **Inicio**
2. **Buscar**
3. **Reservas**
4. **Perfil**

### Inicio

- ubicación o zona actual;
- buscador de complejos y canchas;
- accesos por deporte: fútbol, pádel y wally;
- complejos recomendados;
- acceso rápido para volver a reservar.

### Buscar

- alternancia entre mapa y lista;
- filtros por deporte, zona, fecha, hora y precio;
- disponibilidad visible y selección ágil de horarios;
- resultados en tarjetas y panel inferior adaptado a pantallas táctiles.

### Reservas

- próximas, completadas y canceladas;
- detalle de cada reserva;
- acciones de cancelar cuando corresponda y volver a reservar;
- estados de pago y asistencia claramente identificables.

### Perfil

- datos personales;
- favoritos;
- notificaciones;
- reclamos y soporte;
- ajustes;
- billetera, créditos o bonos sólo cuando el modelo de negocio lo requiera.

## Traducción de la referencia Fresha a CANCHEA

| Referencia funcional | Adaptación CANCHEA |
| --- | --- |
| Tratamientos | Deportes y tipos de cancha |
| Establecimientos | Complejos deportivos |
| Profesionales | Canchas |
| Citas | Reservas |
| Volver a reservar | Reservar nuevamente la misma cancha o complejo |
| Historial | Próximas, completadas y canceladas |

## Referencia funcional móvil para propietarios

El video de la aplicación empresarial de Fresha compartido el 2 de octubre de 2026 se toma como referencia funcional para la experiencia de propietarios. No se copiarán su diseño, sus textos ni funciones ajenas al negocio deportivo.

### Patrones observados y adaptación a CANCHEA

| Patrón observado | Adaptación para el propietario CANCHEA |
| --- | --- |
| Calendario operativo con reservas por día y hora | Agenda diaria y semanal por cancha, con bloques de reserva, disponibilidad y estados visibles |
| Acción central para crear una cita | Acción rápida para crear una reserva manual, bloquear una cancha o registrar una reserva presencial |
| Selección de cliente existente, cliente nuevo o atención sin cita | Seleccionar jugador existente, crear jugador básico o registrar cliente invitado/sin cuenta |
| Fecha, hora, repetición y servicio | Fecha, hora, duración, cancha, deporte y recurrencia cuando corresponda |
| Resumen de ventas, registro, citas, ventas y pagos | KPIs, reservas, cobros, comisiones, reembolsos y liquidaciones |
| Lista de clientes con búsqueda y filtros | Jugadores vinculados al complejo, historial permitido y búsqueda por nombre, teléfono o correo |
| Miembros, turnos, fichajes y procesos de pago | Usuarios del complejo, roles, turnos operativos y permisos; nómina queda fuera del alcance inicial |
| Presencia online, catálogo, marketing, informes y ajustes | Perfil público del complejo, canchas/precios, promociones futuras, reportes y configuración |
| Reseñas, pagos y múltiples espacios de trabajo | Valoraciones, liquidaciones y cambio entre complejos autorizados |

### Prioridad para el piloto web

**Prioridad inmediata:**

- calendario móvil por cancha;
- creación rápida de reservas manuales;
- cliente existente, nuevo o invitado sin cuenta;
- selección de cancha, fecha, hora y duración;
- estados de reserva y pago;
- clientes provenientes de reservas;
- KPIs básicos, comisiones y saldo por liquidar.

**Después de validar operación y demanda:**

- reservas recurrentes;
- equipo con roles y permisos;
- perfil público y gestión de valoraciones;
- reportes ampliados y liquidaciones;
- promociones y comunicación con clientes.

**Fuera del alcance inicial:**

- control de asistencia laboral;
- nómina;
- tarjetas regalo, bonos y membresías;
- módulos de marketing avanzados y complementos.

La principal conclusión es que el propietario necesita una herramienta operativa móvil y rápida, no una versión reducida del panel administrativo. El calendario y la creación manual de reservas deben ser los ejes de esa experiencia.

## Identidad visual obligatoria

- Verde principal `#22C55E`.
- Verde oscuro `#0F3D2E`.
- Verde lima de acento `#A3E635`.
- Fondo gris claro `#F4F6F5`.
- Tipografía Inter.
- Fotografía deportiva y lenguaje propio de CANCHEA.
- Controles táctiles de al menos 44 px y contraste accesible.

## Condición para pasar a la aplicación móvil

La inversión en una aplicación móvil se evaluará cuando el piloto muestre demanda sostenida de reservas, repetición de jugadores, un nicho identificable, operación estable y una economía por reserva que permita financiar el producto. La decisión debe basarse en datos del piloto, no únicamente en impresiones visuales o interés inicial.
