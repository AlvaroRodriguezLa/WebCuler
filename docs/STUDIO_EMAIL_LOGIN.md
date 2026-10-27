# Acceso al Studio por correo

El acceso del Studio mantiene GitHub OAuth para autorizar la publicación y, después de validar la cuenta permitida, solicita un segundo código enviado únicamente a la dirección configurada en `STUDIO_ALLOWED_EMAIL`.

El código tiene ocho dígitos, caduca en diez minutos y admite cinco intentos. El servidor guarda el desafío cifrado en una cookie `HttpOnly`, `Secure` y `SameSite=Lax`; no lo incluye en la respuesta del navegador, una URL ni los logs de la aplicación. Solo se intenta enviar el correo después de validar el ID de GitHub autorizado.

## Configuración en Vercel

1. Crea una cuenta en Resend con la dirección que recibirá los códigos y genera una API key para el envío.
2. En el proyecto de Vercel, abre **Settings → Environment Variables** y añade estas variables con alcance **Production**:

   - `STUDIO_EMAIL_OTP_ENABLED` = `true`
   - `STUDIO_ALLOWED_EMAIL` = la dirección autorizada para recibir los códigos
   - `RESEND_API_KEY` = la clave de envío de Resend

3. Despliega una nueva versión de producción. Las variables de Vercel solo se aplican a nuevos despliegues.

`STUDIO_EMAIL_FROM` es opcional. Si no se define, se usa `ONE SHOT <onboarding@resend.dev>` para el envío inicial. Para usar un remitente propio, configura y verifica primero su dominio en Resend y define `STUDIO_EMAIL_FROM` con esa dirección.

No guardes la dirección personal ni la API key en Git, archivos públicos o variables `PUBLIC_*`. Restringe el acceso de miembros del proyecto de Vercel a las personas que deban administrar el Studio, porque quienes tengan acceso al proyecto también pueden administrar sus variables.

El plan gratuito de Resend publica un límite de 3.000 correos mensuales y 100 diarios a 0 USD. No actives un plan de pago ni el pago por exceso si quieres mantener el coste en cero; al alcanzar el límite gratuito, el envío puede dejar de funcionar hasta el siguiente periodo o una ampliación manual.

## Despliegues de prueba

Deja estas variables fuera de **Preview** salvo que también quieras probar el segundo factor allí. Para evitar que URLs de prueba queden abiertas, revisa **Security → Deployment Protection** y usa **Standard Protection** para previews, manteniendo el dominio de producción accesible al público.
