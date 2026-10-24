"""Crea la base de datos vacía de DATABASE_URL si no existe. Uso: python -m app.crear_base"""

from sqlalchemy import URL, create_engine, make_url, text

from app.config import configuracion


def crear_base() -> str:
    url = make_url(configuracion.database_url)
    nombre = url.database
    if not nombre:
        raise SystemExit("DATABASE_URL no indica el nombre de la base (…/smartbillar).")
    # Conexión al servidor sin elegir base, porque todavía no existe. (url.set(database=None)
    # no sirve: en SQLAlchemy, None significa "dejar la base que ya tenía".)
    sin_base = URL.create(url.drivername, url.username, url.password, url.host, url.port, query=url.query)
    servidor = create_engine(sin_base)
    with servidor.begin() as conexion:
        # utf8mb4 guarda tildes, ñ y emojis; _ai_ci compara sin distinguir tildes ni mayúsculas.
        conexion.execute(
            text(f"CREATE DATABASE IF NOT EXISTS `{nombre}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci")
        )
    servidor.dispose()
    return nombre


if __name__ == "__main__":
    print(f"Base de datos lista: {crear_base()}")
