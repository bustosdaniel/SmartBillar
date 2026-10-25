from datetime import datetime
from typing import Annotated

from pydantic import PlainSerializer

from app.tiempo import a_milisegundos

# Las fechas salen como milisegundos desde 1970, igual que Date.now() en el frontend.
Milisegundos = Annotated[datetime, PlainSerializer(a_milisegundos, return_type=int)]
