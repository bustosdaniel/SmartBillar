from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import make_url

# Carpeta backend/: las rutas relativas de la configuración (ej. ssl_ca=ca.pem) se leen desde aquí.
CARPETA_BACKEND = Path(__file__).resolve().parent.parent


class Configuracion(BaseSettings):
    """Valores leídos de backend/.env (ver .env.example) o de las variables de entorno."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "mysql+pymysql://root@localhost:3306/smartbillar?charset=utf8mb4"
    cors_origenes: list[str] = ["http://localhost:5173"]
    # Sin valor por defecto: la API no arranca si falta, para no firmar tokens con una clave conocida.
    jwt_secreto: str
    jwt_horas: int = 12
    # La base guarda UTC; esta zona define qué es "hoy" para turnos, reportes y avisos.
    zona_horaria: str = "America/Bogota"

    @field_validator("database_url")
    @classmethod
    def _certificado_relativo(cls, valor: str) -> str:
        """ssl_ca=ca.pem apunta a backend/ca.pem, sin importar desde qué carpeta arranque la API
        (en Vercel la carpeta de trabajo no es backend/)."""
        url = make_url(valor)
        ca = url.query.get("ssl_ca")
        if isinstance(ca, str) and not Path(ca).is_absolute():
            url = url.update_query_dict({"ssl_ca": str(CARPETA_BACKEND / ca)})
            return url.render_as_string(hide_password=False)
        return valor


configuracion = Configuracion()
