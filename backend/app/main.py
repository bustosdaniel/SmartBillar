from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import configuracion
from app.db import obtener_db
from app.errores import errores_de_integridad, errores_de_validacion
from app.routers import auth, caja, membresias, mesas, movimientos, notificaciones, torneos, usuarios

app = FastAPI(
    title="SmartBillar API",
    description="API REST del sistema de gestión del club de billar.",
    version="0.1.0",
    docs_url="/docs" if configuracion.mostrar_docs else None,
    redoc_url="/redoc" if configuracion.mostrar_docs else None,
    openapi_url="/openapi.json" if configuracion.mostrar_docs else None,
)

app.add_exception_handler(RequestValidationError, errores_de_validacion)
app.add_exception_handler(IntegrityError, errores_de_integridad)

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
app.include_router(membresias.router, prefix="/api")
app.include_router(caja.router, prefix="/api")
app.include_router(mesas.router, prefix="/api")
app.include_router(notificaciones.router, prefix="/api")
app.include_router(movimientos.router, prefix="/api")
app.include_router(torneos.router, prefix="/api")
