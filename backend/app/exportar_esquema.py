"""Imprime el CREATE TABLE de todas las tablas (MySQL), tal como quedan hoy. Para el documento:

    python -m app.exportar_esquema > esquema.sql

A diferencia de `alembic upgrade head --sql`, no repite el historial de migraciones (tablas creadas
y luego modificadas): muestra solo el estado final."""

from sqlalchemy import create_mock_engine
from sqlalchemy.dialects import mysql

import app.models  # noqa: F401  (registra todas las tablas)
from app.db import Base


def main() -> None:
    dialecto = mysql.dialect()
    dialecto.server_version_info = (8, 4, 0)

    def imprimir(sentencia, *_args, **_kwargs) -> None:
        print(str(sentencia.compile(dialect=dialecto)).strip() + ";\n")

    print("-- Esquema de la base de datos de SmartBillar (MySQL), generado desde app/models.\n")
    motor = create_mock_engine("mysql+pymysql://", imprimir)
    Base.metadata.create_all(motor, checkfirst=False)


if __name__ == "__main__":
    main()
