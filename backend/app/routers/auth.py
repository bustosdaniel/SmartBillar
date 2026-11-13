from html import escape

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from app.config import configuracion
from app.deps import BaseDeDatos, UsuarioActual
from app.correo import correo_configurado, enviar
from app.models.enums import TipoNotificacion
from app.schemas.auth import LoginEntrada, RecuperarEntrada, RegistroEntrada, RestablecerEntrada, SesionSalida
from app.schemas.usuarios import UsuarioSalida
from app.seguridad import crear_token
from app.services.notificaciones import notificar
from app.services.usuarios import (
    CuentaBloqueada,
    ErrorDeDatos,
    autenticar,
    crear_enlace_recuperacion,
    registrar_cliente,
    restablecer_con_enlace,
)

router = APIRouter(prefix="/auth", tags=["autenticación"])


@router.post("/login", response_model=SesionSalida)
def login(datos: LoginEntrada, db: BaseDeDatos):
    """Devuelve un token para enviar en `Authorization: Bearer <token>` en las demás peticiones."""
    try:
        usuario = autenticar(db, datos.email, datos.password)
    except CuentaBloqueada as error:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, str(error)) from error
    # Se guarda también el intento fallido (cuenta para el bloqueo).
    db.commit()
    if usuario is None:
        # El mismo mensaje para correo inexistente o contraseña errada: no revela qué cuentas existen.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos.")
    token = crear_token(usuario.id, usuario.version_sesion)
    return SesionSalida(token=token, usuario=UsuarioSalida.model_validate(usuario))


@router.post("/registro", response_model=SesionSalida, status_code=status.HTTP_201_CREATED)
def registro(datos: RegistroEntrada, db: BaseDeDatos):
    """Crea una cuenta de cliente y deja la sesión iniciada. Avisa a los administradores."""
    try:
        cliente = registrar_cliente(db, **datos.model_dump())
    except ErrorDeDatos as error:
        raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error
    db.commit()
    return SesionSalida(token=crear_token(cliente.id, cliente.version_sesion), usuario=UsuarioSalida.model_validate(cliente))


@router.get("/yo", response_model=UsuarioSalida)
def yo(usuario: UsuarioActual):
    """El usuario dueño del token (para restaurar la sesión al recargar la página)."""
    return usuario


RESPUESTA_RECUPERAR = "Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva. Revisa también la carpeta de spam."


def _correo_recuperacion(nombre: str, enlace: str) -> tuple[str, str]:
    texto = (
        f"Hola, {nombre}:\n\nPediste crear una contraseña nueva en SmartBillar. Abre este enlace (vence en 30 "
        f"minutos y sirve una sola vez):\n\n{enlace}\n\nSi no fuiste tú, ignora este correo: tu contraseña no cambia."
    )
    html = f"""<div style="font-family:Arial,sans-serif;max-width:480px;color:#1f2937">
<h2 style="color:#0f3d2e">Crea tu contraseña nueva</h2>
<p>Hola, {escape(nombre)}:</p>
<p>Pediste crear una contraseña nueva en SmartBillar. El enlace vence en 30 minutos y sirve una sola vez.</p>
<p><a href="{escape(enlace)}" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Crear contraseña nueva</a></p>
<p style="color:#6b7280;font-size:13px">Si no fuiste tú, ignora este correo: tu contraseña no cambia.</p>
</div>"""
    return texto, html


@router.post("/recuperar")
def recuperar(datos: RecuperarEntrada, db: BaseDeDatos, tareas: BackgroundTasks) -> dict[str, str]:
    """Envía un enlace para crear una contraseña nueva. Responde lo mismo exista o no la cuenta, para no
    revelar qué correos están registrados; el correo sale después de responder."""
    resultado = crear_enlace_recuperacion(db, datos.email)
    if resultado is not None:
        usuario, token = resultado
        ruta = f"/restablecer?token={token}"
        enlace = f"{configuracion.url_frontend.rstrip('/')}{ruta}"
        if correo_configurado():
            texto, html = _correo_recuperacion(usuario.nombre, enlace)
            tareas.add_task(enviar, usuario.email, "Crea tu contraseña nueva · SmartBillar", texto, html)
        else:
            # Sin servicio de correo, el "correo" queda en el registro de correos simulados del administrador
            # (Notificaciones → Correos a clientes), con su enlace, para poder probar el flujo completo.
            notificar(
                db,
                usuario.id,
                TipoNotificacion.CUENTA,
                "Crea tu contraseña nueva",
                "Pediste crear una contraseña nueva. El enlace vence en 30 minutos y sirve una sola vez.",
                ruta=ruta,
            )
    db.commit()
    return {"mensaje": RESPUESTA_RECUPERAR}


@router.post("/restablecer")
def restablecer(datos: RestablecerEntrada, db: BaseDeDatos) -> dict[str, str]:
    """Cambia la contraseña con el enlace del correo (un solo uso, 30 minutos)."""
    try:
        restablecer_con_enlace(db, datos.token, datos.nueva)
    except ErrorDeDatos as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
    db.commit()
    return {"mensaje": "Tu contraseña se cambió. Ya puedes iniciar sesión."}

