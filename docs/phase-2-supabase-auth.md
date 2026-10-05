# Fase 2 — Supabase y autenticación

## Alcance implementado

- Cliente Supabase SSR para navegador, Server Components, Server Actions y Proxy.
- Registro e ingreso mediante correo y contraseña.
- Flujo OAuth de Google con PKCE activo y verificado de extremo a extremo.
- Confirmación de correo y callback OAuth.
- Onboarding con nombre, apellido, teléfono E.164, ciudad y consentimientos.
- Roles exclusivos `player`, `venue_owner` y `super_admin`.
- Rutas protegidas de prueba para los tres roles.
- RLS para que cada usuario lea y edite solamente su propio perfil.

## Conectar un proyecto Supabase

1. Crear o seleccionar un proyecto exclusivo para CANCHEA. No reutilizar bases de otros productos.
2. Copiar `.env.example` como `.env.local`.
3. Completar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` desde **Connect** en Supabase.
4. Vincular la CLI con `npx supabase link --project-ref <project-ref>`.
5. Aplicar la migración con `npx supabase db push`.
6. Generar los tipos definitivos con `npx supabase gen types typescript --linked` y compararlos con `src/types/database.ts`.

Nunca agregar una secret key o `service_role` a variables `NEXT_PUBLIC_*`.

## Configuración de Auth

En Supabase Auth configurar:

- Site URL local: `http://localhost:3000`
- Redirect URL local: `http://localhost:3000/auth/callback`
- Redirect de confirmación: `http://localhost:3000/auth/confirm`
- Confirmación de correo habilitada.
- Contraseña mínima de 10 caracteres, con minúscula, mayúscula, número y símbolo.

En la plantilla **Confirm signup**, usar:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

## Google OAuth

1. Crear un cliente OAuth Web en Google Cloud.
2. Añadir el callback que muestra Supabase en la configuración del proveedor Google.
3. Guardar Client ID y Client Secret en Supabase Auth; nunca en el navegador.
4. Añadir `http://localhost:3000/auth/callback` a la allow list de Supabase.
5. Cambiar `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.

## Roles y seguridad

- `raw_user_meta_data` se utiliza solamente para sugerir nombres provenientes de Google; nunca autoriza roles.
- El onboarding llama `complete_onboarding`, que acepta únicamente `player` o `venue_owner`.
- El rol principal no puede cambiarse mediante el formulario de perfil.
- `super_admin` se asigna desde SQL administrativo, después de identificar el UUID correcto:

```sql
select private.assign_super_admin('UUID_DEL_USUARIO'::uuid);
```

La función está fuera del esquema expuesto y no puede ejecutarse con los roles `anon` o `authenticated`.
Las cuentas administrativas aprovisionadas pueden entrar a `/admin` sin completar el onboarding de jugador o propietario; no se inventan datos de contacto ni consentimientos para habilitarlas.

## Infraestructura conectada

- Proyecto remoto: `CANCHEA` (`xdszdaklsmevgnhjrrsp`), región São Paulo.
- La aplicación usa `.env.local`, que está excluido de Git y contiene únicamente la URL y la clave publicable.
- La migración `initial_auth_profiles` está aplicada en el proyecto remoto.
- Los tipos de `src/types/database.ts` fueron regenerados desde el esquema real.
- Email/password está habilitado y la confirmación de correo está activa.
- Google OAuth está habilitado con el cliente web `CANCHEA Web` del proyecto Google Cloud `CANCHEA` (`canchea`).
- Las credenciales OAuth se almacenan únicamente en Supabase Auth; el secreto no está en el repositorio ni en variables públicas.
- Google Auth Platform está en modo de prueba con un usuario de prueba autorizado. Antes de producción se sustituirá el correo provisional por uno corporativo de CANCHEA.
- La vinculación de la CLI local requiere ejecutar `supabase login`; no bloquea la aplicación ni la base remota.

## Verificación realizada

- RLS está activo en `public.profiles`.
- `anon` no puede leer perfiles.
- Un usuario autenticado solamente puede leer su perfil.
- `complete_onboarding` acepta `player` y `venue_owner`, y rechaza `super_admin`.
- Un usuario autenticado no puede modificar su rol directamente ni ejecutar `private.assign_super_admin`.
- La prueba transaccional crea un usuario temporal, valida el onboarding y ejecuta `rollback`, sin dejar datos.
- El botón `Continuar con Google` redirige a Google, obtiene consentimiento, vuelve por el callback de Supabase y crea una sesión válida en `/onboarding`.
- Supabase identifica la cuenta probada con el proveedor `Google`.
- `npm run lint`, `npm run typecheck` y `npm run build` terminan correctamente.

## Configuración de Auth aplicada

- Site URL: `http://localhost:3000`.
- Redirects permitidos: `http://localhost:3000/auth/callback` y `http://localhost:3000/auth/confirm`.
- Contraseña mínima en la aplicación: 10 caracteres, con minúscula, mayúscula, número y símbolo.
- La protección de Supabase contra contraseñas filtradas requiere plan Pro. Durante el piloto gratuito se compensa con la validación reforzada anterior; debe activarse antes de aceptar pagos reales.
- Confirmación de correo obligatoria.
- La plantilla personalizada de confirmación requiere SMTP propio en el plan actual. Mientras tanto se usa el flujo predeterminado hacia `/auth/callback`; `/auth/confirm` queda preparado para cuando se habilite SMTP.

La política remota base se verificó contra el endpoint real de Auth: Supabase rechazó tanto una contraseña de 6 caracteres como una contraseña de 8 caracteres formada únicamente por letras. La interfaz y la acción de servidor de CANCHEA aplican además la política reforzada de 10 caracteres. Ningún usuario de prueba fue creado durante esa verificación.
