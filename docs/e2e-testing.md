# Pruebas E2E de CANCHEA

La suite usa Playwright sobre el build de producción de Next.js y Chromium en escritorio y móvil.

## Cobertura permanente sin credenciales

- carga de la portada;
- búsqueda con fecha dinámica;
- apertura del primer resultado disponible;
- selección de cancha y horario;
- conservación del destino al solicitar inicio de sesión;
- protección anónima de `/admin`;
- errores de JavaScript y consola durante el recorrido.

Ejecutar:

```powershell
npm run test:e2e:public
```

## Recorrido autenticado

La suite también contiene un escenario serial que:

1. ingresa como jugador de prueba;
2. crea un hold;
3. genera y aprueba el pago Mock;
4. comprueba la reserva en el historial del jugador;
5. comprueba el código en el panel del propietario;
6. comprueba el código en operaciones del super admin.

Las contraseñas nunca se versionan. Deben suministrarse como variables de entorno:

```powershell
$env:CANCHEA_TEST_PLAYER_PASSWORD="..."
$env:CANCHEA_TEST_OWNER_PASSWORD="..."
$env:CANCHEA_TEST_ADMIN_EMAIL="..."
$env:CANCHEA_TEST_ADMIN_PASSWORD="..."
npm run test:e2e
```

Los correos de jugador y propietario tienen valores predeterminados para las cuentas de prueba existentes. Se pueden sobrescribir con `CANCHEA_TEST_PLAYER_EMAIL` y `CANCHEA_TEST_OWNER_EMAIL`.

Para probar una URL ya desplegada sin iniciar un servidor local:

```powershell
$env:E2E_BASE_URL="https://canchea-neon.vercel.app"
npm run test:e2e:public
```

El escenario autenticado crea una reserva Mock real en el entorno conectado. Debe ejecutarse únicamente con cuentas y datos de prueba.
