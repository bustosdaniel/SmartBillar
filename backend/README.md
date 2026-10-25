# SmartBillar · Backend

API REST en **Python (FastAPI)** con **MySQL**. Las tablas se definen como clases en
`app/models/` y **Alembic** las crea en la base: no hay que crearlas a mano.

## Requisitos

- Python 3.12 o superior
- MySQL 8.4 o superior (MySQL Community Server, instalador .dmg oficial de
  https://dev.mysql.com/downloads/mysql/; MySQL Workbench es otra descarga y no incluye el servidor).
  En el Mac de desarrollo está MySQL 26.10 en `/usr/local/mysql` (puerto 3306).

### Encender MySQL en macOS

Las versiones nuevas no traen panel en Ajustes del Sistema. Si el servidor no está corriendo:

```bash
sudo launchctl bootstrap system /Library/LaunchDaemons/com.oracle.oss.mysql.mysqld.plist
```

Queda encendido también al reiniciar el Mac. Si dice que ya estaba cargado:
`sudo launchctl kickstart -k system/com.oracle.oss.mysql.mysqld`.

### Si no sabes la contraseña de root

Con la base vacía, se reinician los datos con root sin contraseña (la carpeta vieja queda como respaldo):

```bash
sudo launchctl bootout system /Library/LaunchDaemons/com.oracle.oss.mysql.mysqld.plist
sudo mv /usr/local/mysql/data /usr/local/mysql/data.viejo
sudo /usr/local/mysql/bin/mysqld --initialize-insecure --user=_mysql --basedir=/usr/local/mysql --datadir=/usr/local/mysql/data
sudo launchctl bootstrap system /Library/LaunchDaemons/com.oracle.oss.mysql.mysqld.plist
/usr/local/mysql/bin/mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'tu_contraseña';"
```

## Primera vez

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env            # pon la contraseña de root en DATABASE_URL
.venv/bin/python -m app.crear_base   # crea la base vacía "smartbillar"
.venv/bin/alembic upgrade head       # crea todas las tablas
.venv/bin/python -m app.seeds --demo # datos iniciales (sin --demo: solo los datos base)
```

### Datos iniciales (seeds)

- `python -m app.seeds`: mesas, tarifas, reglas de horario, planes, productos y empleados.
- `python -m app.seeds --demo`: además clientes de prueba (con cédula), membresías, 3 torneos y 75 días
  de historial de caja para Reportes.

Solo crean lo que falta: se pueden correr varias veces sin duplicar nada ni pisar precios editados.
Todas las cuentas de prueba usan la contraseña `123456` (guardada con bcrypt), por ejemplo
`admin@billar.com` (administrador), `neifer@billar.com` (cajero) o `juan@billar.com` (cliente).

## Arrancar la API

```bash
.venv/bin/fastapi dev app/main.py
```

- API: http://localhost:8000
- Documentación interactiva (manual técnico): http://localhost:8000/docs
- Comprobar conexión: http://localhost:8000/salud

Para usarla desde el frontend, deja también corriendo `npm run dev` en `frontend/`: Vite redirige
`/api` al puerto 8000. Si el backend está apagado, el login muestra "No se pudo conectar con el servidor".

## Autenticación

- `POST /api/auth/login` y `POST /api/auth/registro` devuelven `{ token, usuario }`.
- Las demás rutas piden el token en `Authorization: Bearer <token>` (vence a las 12 horas).
- `GET /api/auth/yo` devuelve el usuario del token.
- `JWT_SECRETO` en `.env` firma los tokens: cada instalación debe tener el suyo.

## Usuarios y roles

| Ruta | Quién | Para qué |
|---|---|---|
| `GET /api/usuarios` | personal | Clientes y empleados |
| `GET /api/usuarios/empleados` | cualquiera con sesión | El personal (sin cédula ni celular) |
| `GET /api/usuarios/cedula/{cedula}` | personal | Buscar un cliente (acepta puntos) |
| `POST /api/usuarios/clientes` | personal | Registrar un cliente en caja (contraseña temporal `123456`) |
| `PATCH /api/usuarios/yo` | cualquiera con sesión | Editar su perfil |
| `PUT /api/usuarios/yo/password` | cualquiera con sesión | Cambiar su contraseña (pide la actual) |
| `PATCH /api/usuarios/{id}/cargo` | administrador | Administrador o cajero (siempre queda al menos un administrador) |

"Personal" es el administrador y el cajero. El cajero no puede: cambiar precios ni planes, ver
reportes, gestionar empleados, anular cobros ni manejar torneos (crear, iniciar, llaves). En el
backend se usan las dependencias `Empleado` y `Administrador` de `app/deps.py`.

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
