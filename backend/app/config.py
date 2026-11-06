from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracion(BaseSettings):
    """Valores leídos de backend/.env (ver .env.example)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "mysql+pymysql://root@localhost:3306/smartbillar?charset=utf8mb4"
    cors_origenes: list[str] = ["http://localhost:5173"]
    # Sin valor por defecto: la API no arranca si falta, para no firmar tokens con una clave conocida.
    jwt_secreto: str
    jwt_horas: int = 12
    # La base guarda UTC; esta zona define qué es "hoy" para turnos, reportes y avisos.
    zona_horaria: str = "America/Bogota"


configuracion = Configuracion()
