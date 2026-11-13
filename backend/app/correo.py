"""Envío de correos por SMTP (Gmail con contraseña de aplicación, Brevo u otro proveedor). La
configuración está en backend/.env (SMTP_HOST, SMTP_PUERTO, SMTP_USUARIO, SMTP_CLAVE, CORREO_REMITENTE)."""

import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.config import configuracion

registro = logging.getLogger("smartbillar.correo")


def correo_configurado() -> bool:
    return bool(configuracion.smtp_host)


def enviar(destino: str, asunto: str, texto: str, html: str) -> None:
    """Envía un correo. Sin SMTP configurado solo lo escribe en la consola (modo de desarrollo)."""
    if not correo_configurado():
        registro.warning("Correo NO enviado (falta SMTP_HOST en .env). Para %s · %s\n%s", destino, asunto, texto)
        return
    mensaje = EmailMessage()
    mensaje["Subject"] = asunto
    mensaje["From"] = configuracion.correo_remitente or configuracion.smtp_usuario
    mensaje["To"] = destino
    mensaje.set_content(texto)
    mensaje.add_alternative(html, subtype="html")
    contexto = ssl.create_default_context()
    try:
        if configuracion.smtp_puerto == 465:
            servidor = smtplib.SMTP_SSL(configuracion.smtp_host, 465, context=contexto, timeout=15)
        else:
            servidor = smtplib.SMTP(configuracion.smtp_host, configuracion.smtp_puerto, timeout=15)
            servidor.starttls(context=contexto)
        with servidor:
            if configuracion.smtp_usuario:
                servidor.login(configuracion.smtp_usuario, configuracion.smtp_clave)
            servidor.send_message(mensaje)
    except (smtplib.SMTPException, OSError):
        # No se le dice nada a quien pidió el enlace (la respuesta es siempre la misma): queda en el log.
        registro.exception("No se pudo enviar el correo a %s", destino)
