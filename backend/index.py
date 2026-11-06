"""Punto de entrada para Vercel: busca una variable `app` en index.py. En local se sigue usando
`fastapi dev app/main.py`."""

from app.main import app  # noqa: F401
