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
