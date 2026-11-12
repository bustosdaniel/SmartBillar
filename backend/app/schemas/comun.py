from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainSerializer
from pydantic.alias_generators import to_camel

from app.tiempo import a_milisegundos

# Tope de cualquier valor en pesos (precios, pagos, egresos, base y conteo de caja): evita cifras absurdas
# y que un número enorme desborde las columnas INT de MySQL. El frontend usa el mismo valor (utils/montos.ts).
MONTO_MAXIMO = 10_000_000
# Topes más estrictos donde un valor así ya sería un error de digitación (mismos que LIMITES del frontend).
PRECIO_PLAN_MAXIMO = 500_000
INSCRIPCION_MAXIMA = 500_000
HORAS_GRATIS_MAXIMAS = 100

# Las fechas salen como milisegundos desde 1970, igual que Date.now() en el frontend.
Milisegundos = Annotated[datetime, PlainSerializer(a_milisegundos, return_type=int)]


class EsquemaCamel(BaseModel):
    """Entra y sale con los nombres del frontend (precioMensual), aunque en Python sean precio_mensual."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
