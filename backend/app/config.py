from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracion(BaseSettings):
    """Valores leídos de backend/.env (ver .env.example)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "mysql+pymysql://root@localhost:3306/smartbillar?charset=utf8mb4"
    cors_origenes: list[str] = ["http://localhost:5173"]


configuracion = Configuracion()
