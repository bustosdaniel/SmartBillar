"""Pruebas sin base de datos: la lógica de cobro, las validaciones y la seguridad. No se conectan a MySQL
(crear el motor de SQLAlchemy no abre conexión), así que corren igual en cualquier máquina o en CI."""

import os

# Sin backend/.env (por ejemplo en CI) la configuración exige una clave para firmar tokens.
os.environ.setdefault("JWT_SECRETO", "clave-solo-para-pruebas-de-smartbillar-no-usar")
