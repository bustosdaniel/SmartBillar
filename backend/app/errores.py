"""Errores de validación en español, con el mismo formato {"detail": "mensaje"} que el resto de la API."""

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Nombre del campo y terminación para concordar ("obligatorio" / "obligatoria").
NOMBRES_CAMPO = {
    "nombre": ("El nombre", "o"),
    "email": ("El correo", "o"),
    "telefono": ("El celular", "o"),
    "password": ("La contraseña", "a"),
    "actual": ("La contraseña actual", "a"),
    "nueva": ("La contraseña nueva", "a"),
    "cargo": ("El cargo", "o"),
    "precioMensual": ("El precio mensual", "o"),
    "descuentoMesa": ("El descuento en mesa", "o"),
    "horasGratisMes": ("Las horas gratis", "as"),
    "descuentoBar": ("El descuento en bar", "o"),
    "descuentoTorneo": ("El descuento en torneos", "o"),
    "planId": ("El plan", "o"),
}


def _mensaje(error: dict) -> str:
    campo = str(error["loc"][-1]) if error.get("loc") else ""
    nombre, o = NOMBRES_CAMPO.get(campo, (f"El campo «{campo}»", "o"))
    tipo = error.get("type", "")
    contexto = error.get("ctx") or {}
    if tipo == "missing":
        return f"{nombre} es obligatori{o}."
    if tipo == "string_too_short":
        minimo = contexto.get("min_length", 1)
        return f"{nombre} es obligatori{o}." if minimo == 1 else f"{nombre} debe tener al menos {minimo} caracteres."
    if tipo == "string_too_long":
        return f"{nombre} no puede tener más de {contexto.get('max_length')} caracteres."
    if tipo == "less_than_equal":
        return f"{nombre} no puede ser mayor que {contexto.get('le')}."
    if tipo == "greater_than_equal":
        return f"{nombre} no puede ser menor que {contexto.get('ge')}."
    if tipo == "value_error" and campo == "email":
        return "El correo no es válido."
    if tipo == "value_error":
        # Nuestros validadores ya escriben el mensaje en español ("Value error, …").
        return str(error.get("msg", "")).removeprefix("Value error, ")
    return f"{nombre} no es válid{o}."


async def errores_de_validacion(_peticion: Request, error: RequestValidationError) -> JSONResponse:
    mensajes = list(dict.fromkeys(_mensaje(e) for e in error.errors()))
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, content={"detail": " ".join(mensajes)})
