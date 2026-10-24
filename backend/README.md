# SmartBillar · Backend

API REST en **Python (FastAPI)** con **PostgreSQL**. Las tablas se definen como clases en
`app/models/` y **Alembic** las crea en la base: no hay que crearlas a mano.

## Requisitos

- Python 3.12 o superior
- PostgreSQL 17. En el Mac de desarrollo se usa [Postgres.app](https://postgresapp.com) (en este Mac,
  Homebrew y Docker son de otra cuenta). Ábrelo y deja el servidor en *Running* (puerto 5432).
  Sus comandos están en `/Applications/Postgres.app/Contents/Versions/latest/bin`: agrégalos al PATH con
  `echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc`.

## Primera vez

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env          # ajusta DATABASE_URL si hace falta
createdb smartbillar          # crea la base vacía
.venv/bin/alembic upgrade head  # crea todas las tablas
```

## Arrancar la API

```bash
.venv/bin/fastapi dev app/main.py
```

- API: http://localhost:8000
- Documentación interactiva (manual técnico): http://localhost:8000/docs
- Comprobar conexión: http://localhost:8000/salud

## Cambiar una tabla

1. Edita el modelo en `app/models/`.
2. `.venv/bin/alembic revision --autogenerate -m "describe el cambio"`
3. Revisa el archivo nuevo en `alembic/versions/` y aplícalo con `.venv/bin/alembic upgrade head`.

## Script SQL para el documento

```bash
.venv/bin/alembic upgrade head --sql > esquema.sql
```

Genera los `CREATE TABLE` de todas las tablas (sección "Diseño de Base de Datos"). El archivo
`esquema.sql` del repo ya está generado con la migración inicial.
