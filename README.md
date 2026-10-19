
# SmartBillar

SmartBillar es una aplicación web para apoyar la operación diaria de un club de billar y ofrecer a sus clientes un espacio para consultar sus partidas, membresías y torneos. Reúne en una sola interfaz las tareas administrativas del club y las herramientas que cada cliente necesita para seguir su actividad.

## ¿Qué permite hacer?

### Administración

- Consultar un panel con actividad del club, estado de mesas, caja y notificaciones.
- Registrar clientes con nombre, correo, celular y cédula; consultar sus visitas y gastos.
- Administrar mesas, sesiones de juego, tarifas y consumos.
- Registrar ingresos y egresos, abrir y cerrar caja, y consultar cierres.
- Crear y administrar planes de membresía, solicitudes y asignaciones.
- Organizar torneos, inscripciones, partidos y llaves.
- Consultar reportes y notificaciones relacionadas con la actividad del club.

### Clientes

- Crear una cuenta y actualizar sus datos personales.
- Consultar su mesa activa, consumos e historial de partidas.
- Solicitar o renovar una membresía y revisar sus beneficios.
- Explorar torneos, consultar sus detalles y recibir avisos.
- Actualizar su contraseña desde el perfil.

## Tecnologías

- React 19 y TypeScript
- Vite para desarrollo y compilación
- React Router para navegación y rutas protegidas por rol
- Lucide React para iconos
- Oxlint para análisis estático

## Ejecución local

Se requiere Node.js y npm.

```bash
npm install
npm run dev
```

Vite mostrará en la terminal la dirección local para abrir la aplicación.

Comandos disponibles:

```bash
npm run build    # Verifica TypeScript y genera la versión de producción
npm run lint     # Ejecuta Oxlint
npm run preview  # Sirve localmente la compilación de producción
```

## Estructura del código

- `src/pages/`: pantallas de autenticación, administración y cliente.
- `src/layouts/`: navegación y estructura compartida para cada tipo de usuario.
- `src/auth/`: inicio de sesión, registro, protección de rutas y perfiles.
- `src/mesas/`, `src/caja/` y `src/actividad/`: sesiones, cuentas y movimientos.
- `src/membresias/`, `src/torneos/` y `src/notificaciones/`: lógica de planes, competencias y avisos.
- `src/components/`: componentes reutilizables de interfaz.
- `src/types.ts`: tipos principales del dominio.
- `src/utils/`: almacenamiento local y funciones de formato.

## Estado actual

Esta versión es un prototipo frontend: usa cuentas y datos de demostración, y guarda los cambios en el almacenamiento local del navegador (`localStorage`). Por eso, los datos no se comparten entre distintos dispositivos ni usuarios del navegador. Las notificaciones y correos se registran en la aplicación, pero su envío real requiere conectar un backend.

