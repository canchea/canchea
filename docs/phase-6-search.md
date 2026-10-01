# Fase 6 — Búsqueda

## Implementado

- Nueva ruta pública `/buscar`, accesible sin iniciar sesión.
- Filtros por deporte, zona, fecha, hora exacta, precio mínimo/máximo y duración de 30 o 60 minutos.
- Orden por recomendación, precio menor, precio mayor, complejos nuevos y distancia cuando el visitante comparte su ubicación.
- Resultados basados exclusivamente en horarios realmente reservables.
- Una sola opción por cancha para comparar sin duplicados; cada tarjeta muestra cancha, modalidad, superficie, servicios, hora, duración y precio.
- Paginación de 12 canchas.
- Portadas privadas entregadas mediante URLs firmadas y optimizadas con `next/image`.
- Enlace al detalle del complejo conservando cancha, fecha y hora seleccionadas.
- Resaltado de la cancha elegida y del horario/precio seleccionado en la ficha pública.
- Estados de carga, error y búsqueda sin resultados.
- El buscador de la Home ahora lleva al motor real y obtiene deportes/zonas desde Supabase.
- Vista Lista activa. La opción Mapa queda señalizada como próxima hasta aprobar un proveedor.

## Backend

La migración `20260930211522_phase_6_search.sql` incorpora:

- `search_available_courts(...)`, función pública `SECURITY INVOKER`.
- Índice parcial para complejos aprobados por zona.
- Índice parcial para canchas activas por deporte y complejo.

La función reutiliza `get_court_availability`, por lo que hereda las reglas de Fase 5: horario semanal, pricing, bloqueos, estados públicos y anticipación mínima. Los filtros y el orden se ejecutan en PostgreSQL, no en el navegador.

## Pruebas realizadas

- Consulta como rol anónimo sin sesión.
- Deporte `futbol`, zona `Equipetrol`, fecha futura y hora `20:00`.
- Dos resultados reales: Cancha Express Demo a Bs 90 y Cancha Verde Demo a Bs 220.
- Orden ascendente por precio comprobado.
- Hora exacta y cálculo de distancia comprobados.
- Portadas visibles desde una sesión pública.
- Navegación desde el resultado hacia el complejo con cancha/fecha/hora preservadas.
- Revisión visual de búsqueda y detalle en el navegador, sin errores de consola.
- `npm run lint`.
- `npm run typecheck`.
- `npm run build`.

## Problemas encontrados

La política de Supabase Storage para fotografías de canchas contenía una referencia SQL ambigua: dentro de una subconsulta, `name` se resolvía como `courts.name` en lugar de `storage.objects.name`. Esto impedía que un propietario de complejo aprobado cargara portadas.

La migración `20260930212603_fix_court_media_storage_policy.sql` corrige las cinco políticas relacionadas (lectura anónima, lectura autenticada, carga, actualización y borrado) usando referencias explícitas. Después de la corrección, las dos canchas demo pudieron cargar portada y activarse mediante el flujo del propietario.

También se detectó que una cookie de sesión caducada podía afectar consultas públicas. La búsqueda utiliza ahora un cliente público sin persistencia de sesión, de modo que explorar continúa funcionando aunque el navegador tenga una sesión antigua inválida.

## Decisiones técnicas

- La búsqueda devuelve una opción por cancha, no una tarjeta duplicada por cada duración.
- Si no se especifica hora, muestra el próximo horario reservable del día consultado.
- Si se ordena por precio, el horario mostrado corresponde al mejor precio real según el sentido elegido.
- La distancia se calcula con coordenadas guardadas y sólo se usa cuando el visitante autoriza geolocalización.
- No se integró un mapa: aún no existe un proveedor aprobado y la fase indica incorporarlo sólo si está definido.
- No se inventaron ratings ni popularidad. Sus órdenes permanecen informados como pendientes hasta que existan reservas y reseñas verificadas.

## Recomendaciones

- Elegir el proveedor de mapas antes de activar la vista Mapa; comparar Google Maps, Mapbox y alternativas OpenStreetMap considerando coste, límites y experiencia móvil.
- Activar la protección de contraseñas filtradas de Supabase Auth antes del piloto.
- Mantener los índices nuevos aunque el advisor aún los marque como recientes/sin uso; la base tiene muy pocos registros y la consulta ya utiliza el índice parcial de canchas.

## Pendiente

- Ratings reales: Fase 14.
- Popularidad basada en reservas confirmadas/completadas: desde Fase 7 y consolidación posterior.
- Vista de mapa: después de aprobar proveedor.
- Analítica persistente de `search_performed`: se conectará cuando se defina la capa de analytics.
- Botón Reservar/checkout: implementado en Fase 7.

## Siguiente fase

Fase 7 — motor de reservas: hold de cinco minutos, prevención de doble reserva en PostgreSQL, checkout, código público, estados e historial, con pruebas de concurrencia.
