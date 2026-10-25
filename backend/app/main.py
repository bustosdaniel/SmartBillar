from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import configuracion
from app.db import obtener_db
from app.errores import errores_de_validacion
from app.routers import auth, usuarios

app = FastAPI(
    title="SmartBillar API",
    description="API REST del sistema de gestión del club de billar.",
    version="0.1.0",
)

app.add_exception_handler(RequestValidationError, errores_de_validacion)

app.add_middleware(
    CORSMiddleware,
    allow_origins=configuracion.cors_origenes,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/salud", tags=["sistema"])
def salud(db: Session = Depends(obtener_db)) -> dict[str, str]:
    """Comprueba que la API responde y que llega a la base de datos."""
    db.execute(text("SELECT 1"))
    return {"api": "ok", "base_de_datos": "ok"}


# Todas las rutas de la API van bajo /api (el frontend las pide por ahí a través de Vite).
app.include_router(auth.router, prefix="/api")
app.include_router(usuarios.router, prefix="/api")
