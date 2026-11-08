# SmartBillar · Frontend

Interfaz web de SmartBillar: **React 19** y **TypeScript** con **Vite**, **React Router**, **Lucide React** para
los íconos y **Oxlint** como linter. Para saber de qué trata el proyecto, ve al [README principal](../README.md).

## Requisitos

- Node.js 20.19 o superior (o 22.12 en adelante) y npm.
- El [backend](../backend/README.md) encendido en el puerto 8000. Sin él, la app abre pero el login muestra
  "No se pudo conectar con el servidor".

## Arrancar

```bash
npm install   # solo la primera vez
npm run dev
```

La app queda en http://localhost:5173.

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Verifica TypeScript y genera la versión de producción en `dist/` |
| `npm run lint` | Ejecuta Oxlint |
| `npm run preview` | Sirve localmente lo generado por `build` |

## Conexión con el backend

El frontend siempre llama a rutas relativas `/api/...`, a través de `pedir()` en `src/api/cliente.ts`, que agrega
el token y convierte los errores `{ detail }` en un `ErrorApi` con el mensaje listo para mostrar.

- **En local**, Vite redirige `/api` a `http://localhost:8000` (`vite.config.ts`).
- **En Vercel**, lo hace la regla de `vercel.json`, que también envía las demás rutas a `index.html`.

## Estructura de `src/`

| Carpeta | Contenido |
|---|---|
| `pages/auth`, `pages/admin`, `pages/cliente` | Pantallas de cada zona; los diálogos de una pantalla van en una subcarpeta con su nombre |
| `layouts/` | Estructura y navegación de cada zona |
| `components/` | Componentes reutilizables |
| `auth/` | Sesión, protección de rutas, usuarios y validaciones de los formularios de cuenta |
| `api/` | Cliente HTTP |
| `mesas/`, `consumos/`, `caja/`, `membresias/`, `torneos/`, `notificaciones/`, `reportes/`, `actividad/` | Datos y reglas de cada módulo |
| `hooks/` | Hooks compartidos (`useAhora`, `useValidacion`) |
| `utils/` | Stores, almacenamiento y formato de pesos y fechas |
| `types.ts` | Tipos principales del dominio |
| `router.tsx` | Todas las rutas |

## Rutas

| Zona | Quién entra | Pantallas |
|---|---|---|
| `/login`, `/registro`, `/recuperar` | Sin sesión | Autenticación |
| `/cliente` | Rol `cliente` | Inicio, `mesa`, `torneos`, `historial`, `consumos`, `membresia`, `notificaciones`, `perfil` |
| `/admin` | Rol `admin` (administrador o cajero) | Panel, `mesas`, `caja`, `consumos`, `usuarios`, `membresias`, `torneos`, `reportes`, `notificaciones` |

`RutaProtegida` envía a cada usuario a su zona. `SoloAdministrador` cierra pantallas al cajero, como Reportes.

## De dónde salen los datos

Cada módulo guarda sus datos en uno de dos tipos de store, y las pantallas los leen con su hook (`useSesiones`,
`useTorneos`…):

| Store | Dónde viven los datos | Módulos |
|---|---|---|
| `crearStoreMemoria` | En MySQL; el store solo guarda en memoria lo que responde la API | Usuarios, membresías y planes, caja y cierres |
| `crearStoreLocal` | En el `localStorage` del navegador | Mesas y sesiones, tarifas, productos y consumos, torneos, notificaciones, movimientos |

Lo que está en `localStorage` no se comparte entre dispositivos ni navegadores. Al conectar un módulo con el
backend, su store pasa de `crearStoreLocal` a `crearStoreMemoria` y sus datos se cargan al iniciar sesión, en
`abrir()` de `auth/AuthContext.tsx`.

La sesión guarda el token y el usuario en `localStorage` si se marcó "Recordarme", y si no en `sessionStorage`.
Al abrir la app se confirma el token con `GET /api/auth/yo`.

## Formularios de cuenta

Las reglas están en `auth/validaciones.ts` y **repetidas en `backend/app/schemas/usuarios.py`**: si cambias una,
cambia la otra.

| Campo | Regla |
|---|---|
| Nombre | De 3 a 120 caracteres; solo letras y separadores (espacio, `'`, `.`, `-`) |
| Correo | Formato válido, máximo 160 caracteres |
| Celular | 10 dígitos que empiezan por 3; admite `+57`, espacios y guiones |
| Contraseña nueva | Mínimo 8 caracteres, con mayúscula, minúscula, número y carácter especial; máximo 72 bytes |

El login y el campo "contraseña actual" no exigen esas reglas, porque las cuentas creadas en caja y las de prueba
usan la contraseña temporal `123456`.

Para validar un formulario:

1. Escribe una función `(datos: FormData) => Errores` en `auth/validaciones.ts`.
2. Pásala a `useValidacion` y agrega `{...eventos}` y `noValidate` al `<form>`.
3. Llama a `validarTodo(formulario)` al enviar y pasa `errores.campo` a cada campo.

Los campos son `CampoTexto` (pantallas de autenticación) y `CampoClaro` (perfil y diálogos). Ambos muestran el
error, traen el botón para ver la contraseña y, con `conReglas`, la lista de requisitos.
