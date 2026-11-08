# SmartBillar

SmartBillar es una aplicación web para la operación diaria de un club de billar. Reúne en un solo lugar las tareas
del personal (mesas, caja, membresías, torneos y reportes) y un espacio para que cada cliente siga sus partidas,
consumos, membresía y torneos.

## Quién la usa

| Rol | Qué hace |
|---|---|
| **Cliente** | Crea su cuenta, consulta su mesa activa, consumos e historial, solicita membresías y sigue los torneos |
| **Cajero / Operador** | Atiende el día a día: mesas, consumos, cobros, caja, registro de clientes y solicitudes de membresía |
| **Administrador** | Todo lo anterior, y además cambia precios y planes, ve reportes, gestiona empleados, anula cobros y maneja los torneos |

## Qué vas a encontrar

**Para el personal**

- Panel con la actividad del club, el estado de las mesas, la caja y las notificaciones.
- Registro y búsqueda de clientes por correo, con sus visitas y gastos.
- Mesas con sesiones de juego, pausas, tarifas por modo y horario, y consumos.
- Caja: apertura, cobros, egresos, arqueo y cierres.
- Planes de membresía, solicitudes y asignaciones.
- Torneos con inscripción, llaves de eliminación directa y partidos.
- Reportes y notificaciones.

**Para el cliente**

- Registro, datos personales y cambio de contraseña.
- Mesa activa, consumos e historial de partidas.
- Solicitud o renovación de membresía y sus beneficios.
- Torneos, sus detalles y avisos.

## Cómo funciona

**Un día en el club**

1. El personal abre la **caja** con la base inicial; sin caja abierta no se puede cobrar.
2. Llega un cliente: se busca por su correo o se registra en ese momento.
3. Se inicia una **mesa**. El tiempo corre, se puede pausar y se van agregando **consumos**.
4. Al finalizar, la mesa queda por cobrar. La cuenta suma tiempo y consumos, y aplica la tarifa y los descuentos de
   la membresía.
5. El **cobro** entra a la caja y la mesa queda libre.
6. Al terminar el turno se hace el **arqueo**: el efectivo esperado es la base más los cobros en efectivo menos los
   egresos. Si no cuadra, hay que escribir una observación para cerrar.

**Membresías**

1. El cliente solicita un plan desde la app.
2. Lo paga en caja, y el personal cobra y activa la membresía en un solo paso (30 días).
3. Sus beneficios se aplican en mesa, bar y torneos.

**Cuentas**

- El cliente crea su cuenta en `/registro` con una contraseña propia.
- Si la crea el personal en caja, queda con la contraseña temporal `123456`, que el cliente cambia desde su perfil.

## Arquitectura

```text
Navegador (React)  ──/api──▶  API REST (FastAPI)  ──▶  MySQL
```

| Parte | Tecnologías | Documentación |
|---|---|---|
| Frontend | React 19, TypeScript, Vite, React Router | [`frontend/README.md`](frontend/README.md) |
| Backend | Python, FastAPI, SQLAlchemy, Alembic | [`backend/README.md`](backend/README.md) |
| Base de datos | MySQL 8.4 o superior (18 tablas, en `backend/esquema.sql`) | [`backend/README.md`](backend/README.md) |

Las contraseñas se guardan con bcrypt y las sesiones usan tokens JWT.

## Ponerlo en marcha

La primera vez hay que preparar la base de datos: sigue la sección "Primera vez" del
[README del backend](backend/README.md). Después, cada vez, en dos terminales:

```bash
# Terminal 1
cd backend
.venv/bin/fastapi dev app/main.py
```

```bash
# Terminal 2
cd frontend
npm install   # solo la primera vez
npm run dev
```

La app queda en http://localhost:5173.

Con los datos de prueba (`python -m app.seeds --demo`), todas las cuentas usan la contraseña `123456`:

| Rol | Correo |
|---|---|
| Administrador | `admin@billar.com` |
| Cajero | `neifer@billar.com` |
| Cliente | `cliente@billar.com` |

Revisa a qué base apunta `DATABASE_URL` en `backend/.env` antes de probar: lo que hagas en la app se guarda ahí.

## Estado actual

| Módulo | Dónde se guarda |
|---|---|
| Cuentas, usuarios y roles | MySQL, por la API |
| Membresías y planes | MySQL, por la API |
| Caja, cobros y cierres | MySQL, por la API |
| Mesas, tarifas y consumos | Navegador (`localStorage`), falta conectarlos a la API |
| Torneos | Navegador (`localStorage`), falta conectarlos a la API |
| Notificaciones y actividad | Navegador (`localStorage`), falta conectarlas a la API |

La base de datos ya tiene las tablas de todos los módulos; lo que falta son las rutas de la API de los que siguen
en el navegador. Mientras tanto, esos datos no se comparten entre dispositivos.

La recuperación de contraseña y los correos todavía no envían nada real: solo dejan el aviso en la aplicación.
