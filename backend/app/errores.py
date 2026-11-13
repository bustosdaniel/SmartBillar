"""Errores de validación en español, con el mismo formato {"detail": "mensaje"} que el resto de la API."""

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

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
    "base": ("La base", "a"),
    "contado": ("El efectivo contado", "o"),
    "monto": ("El monto", "o"),
    "concepto": ("El concepto", "o"),
    "recibido": ("El efectivo recibido", "o"),
    "metodo": ("El método de pago", "o"),
    "cliente": ("El cliente", "o"),
    "inscripcion": ("El valor de la inscripción", "o"),
    "hora": ("La tarifa por hora", "a"),
    "ajuste": ("El ajuste de la tarifa", "o"),
    "dias": ("Los días de la tarifa", "os"),
    "cantidad": ("La cantidad", "a"),
}


def _numero(valor) -> str:
    """Los topes de dinero se leen mejor con puntos de miles: $10.000.000."""
    if isinstance(valor, int) and valor >= 1000:
        return "$" + f"{valor:,}".replace(",", ".")
    return str(valor)


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
    # Plural ("Las horas gratis") concuerda con "pueden".
    puede = "pueden" if o.endswith("s") else "puede"
    if tipo == "less_than_equal":
        return f"{nombre} no {puede} ser mayor que {_numero(contexto.get('le'))}."
    if tipo == "greater_than_equal":
        return f"{nombre} no {puede} ser menor que {contexto.get('ge')}."
    if tipo == "value_error" and campo == "email":
        return "El correo no es válido."
    if tipo == "value_error":
        # Nuestros validadores ya escriben el mensaje en español ("Value error, …").
        return str(error.get("msg", "")).removeprefix("Value error, ")
    return f"{nombre} no es válid{o}."


async def errores_de_integridad(_peticion: Request, error: IntegrityError) -> JSONResponse:
    """Un choque con la base que la validación previa no vio (dos registros con el mismo correo al mismo
    tiempo, o un dato que otra persona acaba de borrar): 409 con un mensaje claro en vez de un 500."""
    texto = str(error.orig).lower()
    if "email" in texto and ("duplicate" in texto or "unique" in texto):
        mensaje = "Ya existe una cuenta con ese correo."
    elif "duplicate" in texto:
        mensaje = "Ese dato ya está registrado. Recarga la página e intenta de nuevo."
    else:
        mensaje = "Uno de los datos ya no existe o cambió mientras tanto. Recarga la página e intenta de nuevo."
    return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": mensaje})


async def errores_de_validacion(_peticion: Request, error: RequestValidationError) -> JSONResponse:
    mensajes = list(dict.fromkeys(_mensaje(e) for e in error.errors()))
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, content={"detail": " ".join(mensajes)})
