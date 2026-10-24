BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 0e93ef3b3e81

CREATE TABLE cajas (
    id SERIAL NOT NULL, 
    apertura TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    base INTEGER NOT NULL, 
    cierre TIMESTAMP WITH TIME ZONE, 
    contado INTEGER, 
    nota TEXT, 
    CONSTRAINT pk_cajas PRIMARY KEY (id), 
    CONSTRAINT ck_cajas_base_positiva CHECK (base >= 0)
);

CREATE UNIQUE INDEX uq_cajas_una_abierta ON cajas ((cierre IS NULL)) WHERE cierre IS NULL;

CREATE TYPE modo_juego AS ENUM ('pool', 'tres-bandas', 'libre');

CREATE TABLE mesas (
    id SERIAL NOT NULL, 
    nombre VARCHAR(40) NOT NULL, 
    modo modo_juego NOT NULL, 
    CONSTRAINT pk_mesas PRIMARY KEY (id), 
    CONSTRAINT uq_mesas_nombre UNIQUE (nombre)
);

CREATE TYPE tipo_movimiento AS ENUM ('inicio', 'pausa', 'reanudar', 'detener', 'fin', 'pago', 'caja', 'torneo', 'consumo');

CREATE TABLE movimientos (
    id SERIAL NOT NULL, 
    tipo tipo_movimiento NOT NULL, 
    titulo VARCHAR(120) NOT NULL, 
    detalle VARCHAR(200) NOT NULL, 
    fecha TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_movimientos PRIMARY KEY (id)
);

CREATE INDEX ix_movimientos_fecha ON movimientos (fecha);

CREATE TABLE planes (
    id VARCHAR(20) NOT NULL, 
    nombre VARCHAR(40) NOT NULL, 
    precio_mensual INTEGER NOT NULL, 
    descuento_mesa INTEGER NOT NULL, 
    horas_gratis_mes INTEGER NOT NULL, 
    descuento_bar INTEGER NOT NULL, 
    descuento_torneo INTEGER NOT NULL, 
    extras TEXT[] NOT NULL, 
    CONSTRAINT pk_planes PRIMARY KEY (id), 
    CONSTRAINT ck_planes_descuento_bar_porcentaje CHECK (descuento_bar BETWEEN 0 AND 100), 
    CONSTRAINT ck_planes_descuento_mesa_porcentaje CHECK (descuento_mesa BETWEEN 0 AND 100), 
    CONSTRAINT ck_planes_descuento_torneo_porcentaje CHECK (descuento_torneo BETWEEN 0 AND 100)
);

CREATE TYPE categoria_producto AS ENUM ('bebida', 'paquete');

CREATE TABLE productos (
    id VARCHAR(40) NOT NULL, 
    nombre VARCHAR(60) NOT NULL, 
    categoria categoria_producto NOT NULL, 
    precio INTEGER NOT NULL, 
    CONSTRAINT pk_productos PRIMARY KEY (id), 
    CONSTRAINT ck_productos_precio_positivo CHECK (precio >= 0)
);

CREATE TABLE reglas_horario (
    id SERIAL NOT NULL, 
    nombre VARCHAR(60) NOT NULL, 
    dias SMALLINT[] NOT NULL, 
    desde TIME WITHOUT TIME ZONE NOT NULL, 
    hasta TIME WITHOUT TIME ZONE NOT NULL, 
    ajuste INTEGER NOT NULL, 
    CONSTRAINT pk_reglas_horario PRIMARY KEY (id), 
    CONSTRAINT ck_reglas_horario_ajuste_porcentaje CHECK (ajuste BETWEEN -100 AND 100), 
    CONSTRAINT ck_reglas_horario_dias_validos CHECK (dias <@ ARRAY[0,1,2,3,4,5,6]::smallint[])
);

CREATE TABLE tarifas (
    modo modo_juego NOT NULL, 
    hora INTEGER NOT NULL, 
    CONSTRAINT pk_tarifas PRIMARY KEY (modo), 
    CONSTRAINT ck_tarifas_hora_positiva CHECK (hora >= 0)
);

CREATE TYPE categoria_torneo AS ENUM ('abierta', 'principiante', 'avanzado');

CREATE TYPE estado_torneo AS ENUM ('inscripciones', 'en-curso', 'finalizado');

CREATE TABLE torneos (
    id SERIAL NOT NULL, 
    nombre VARCHAR(80) NOT NULL, 
    modo modo_juego NOT NULL, 
    categoria categoria_torneo NOT NULL, 
    fecha DATE NOT NULL, 
    hora TIME WITHOUT TIME ZONE NOT NULL, 
    cupos INTEGER NOT NULL, 
    inscripcion INTEGER NOT NULL, 
    premio VARCHAR(120) NOT NULL, 
    estado estado_torneo NOT NULL, 
    CONSTRAINT pk_torneos PRIMARY KEY (id), 
    CONSTRAINT ck_torneos_cupos_minimos CHECK (cupos >= 2), 
    CONSTRAINT ck_torneos_inscripcion_positiva CHECK (inscripcion >= 0)
);

CREATE TYPE rol AS ENUM ('cliente', 'admin');

CREATE TYPE cargo AS ENUM ('administrador', 'cajero');

CREATE TABLE usuarios (
    id SERIAL NOT NULL, 
    nombre VARCHAR(120) NOT NULL, 
    email VARCHAR(160) NOT NULL, 
    cedula VARCHAR(20), 
    telefono VARCHAR(20), 
    rol rol NOT NULL, 
    cargo cargo, 
    password_hash VARCHAR(255) NOT NULL, 
    creado TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_usuarios PRIMARY KEY (id), 
    CONSTRAINT ck_usuarios_cargo_solo_empleados CHECK ((rol = 'admin') = (cargo IS NOT NULL)), 
    CONSTRAINT ck_usuarios_cedula_clientes CHECK (rol = 'admin' OR cedula IS NOT NULL), 
    CONSTRAINT uq_usuarios_cedula UNIQUE (cedula), 
    CONSTRAINT uq_usuarios_email UNIQUE (email)
);

CREATE TABLE egresos (
    id SERIAL NOT NULL, 
    caja_id INTEGER NOT NULL, 
    fecha TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    concepto VARCHAR(120) NOT NULL, 
    monto INTEGER NOT NULL, 
    CONSTRAINT pk_egresos PRIMARY KEY (id), 
    CONSTRAINT ck_egresos_monto_positivo CHECK (monto > 0), 
    CONSTRAINT fk_egresos_caja_id_cajas FOREIGN KEY(caja_id) REFERENCES cajas (id)
);

CREATE TABLE jugadores (
    id SERIAL NOT NULL, 
    torneo_id INTEGER NOT NULL, 
    cliente_id INTEGER NOT NULL, 
    nombre VARCHAR(120) NOT NULL, 
    pagado BOOLEAN NOT NULL, 
    monto INTEGER NOT NULL, 
    CONSTRAINT pk_jugadores PRIMARY KEY (id), 
    CONSTRAINT ck_jugadores_monto_positivo CHECK (monto >= 0), 
    CONSTRAINT fk_jugadores_cliente_id_usuarios FOREIGN KEY(cliente_id) REFERENCES usuarios (id), 
    CONSTRAINT fk_jugadores_torneo_id_torneos FOREIGN KEY(torneo_id) REFERENCES torneos (id) ON DELETE CASCADE, 
    CONSTRAINT uq_jugadores_torneo_cliente UNIQUE (torneo_id, cliente_id)
);

CREATE TABLE membresias (
    cliente_id INTEGER NOT NULL, 
    plan_id VARCHAR(20) NOT NULL, 
    inicio TIMESTAMP WITH TIME ZONE NOT NULL, 
    vence TIMESTAMP WITH TIME ZONE NOT NULL, 
    CONSTRAINT pk_membresias PRIMARY KEY (cliente_id), 
    CONSTRAINT fk_membresias_cliente_id_usuarios FOREIGN KEY(cliente_id) REFERENCES usuarios (id) ON DELETE CASCADE, 
    CONSTRAINT fk_membresias_plan_id_planes FOREIGN KEY(plan_id) REFERENCES planes (id)
);

CREATE TYPE tipo_notificacion AS ENUM ('factura', 'membresia', 'torneo', 'cuenta', 'mesa');

CREATE TABLE notificaciones (
    id SERIAL NOT NULL, 
    usuario_id INTEGER NOT NULL, 
    tipo tipo_notificacion NOT NULL, 
    asunto VARCHAR(160) NOT NULL, 
    mensaje TEXT NOT NULL, 
    ruta VARCHAR(120), 
    leida BOOLEAN NOT NULL, 
    fecha TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_notificaciones PRIMARY KEY (id), 
    CONSTRAINT fk_notificaciones_usuario_id_usuarios FOREIGN KEY(usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE INDEX ix_notificaciones_bandeja ON notificaciones (usuario_id, leida, fecha);

CREATE TABLE sesiones (
    id SERIAL NOT NULL, 
    mesa_id INTEGER NOT NULL, 
    cliente_id INTEGER NOT NULL, 
    inicio TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    pausado_ms BIGINT NOT NULL, 
    pausada_desde TIMESTAMP WITH TIME ZONE, 
    detenida_en TIMESTAMP WITH TIME ZONE, 
    tarifa_hora INTEGER NOT NULL, 
    regla VARCHAR(60), 
    fin TIMESTAMP WITH TIME ZONE, 
    tiempo_ms BIGINT, 
    subtotal INTEGER, 
    gratis_ms BIGINT, 
    descuento INTEGER, 
    descuento_bar INTEGER, 
    total INTEGER, 
    plan_id VARCHAR(20), 
    CONSTRAINT pk_sesiones PRIMARY KEY (id), 
    CONSTRAINT ck_sesiones_fin_tras_detener CHECK (fin IS NULL OR detenida_en IS NOT NULL), 
    CONSTRAINT ck_sesiones_pausado_positivo CHECK (pausado_ms >= 0), 
    CONSTRAINT fk_sesiones_cliente_id_usuarios FOREIGN KEY(cliente_id) REFERENCES usuarios (id), 
    CONSTRAINT fk_sesiones_mesa_id_mesas FOREIGN KEY(mesa_id) REFERENCES mesas (id), 
    CONSTRAINT fk_sesiones_plan_id_planes FOREIGN KEY(plan_id) REFERENCES planes (id)
);

CREATE UNIQUE INDEX uq_sesiones_mesa_activa ON sesiones (mesa_id) WHERE fin IS NULL;

CREATE TABLE solicitudes_membresia (
    cliente_id INTEGER NOT NULL, 
    plan_id VARCHAR(20) NOT NULL, 
    fecha TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_solicitudes_membresia PRIMARY KEY (cliente_id), 
    CONSTRAINT fk_solicitudes_membresia_cliente_id_usuarios FOREIGN KEY(cliente_id) REFERENCES usuarios (id) ON DELETE CASCADE, 
    CONSTRAINT fk_solicitudes_membresia_plan_id_planes FOREIGN KEY(plan_id) REFERENCES planes (id)
);

CREATE TABLE consumos (
    id SERIAL NOT NULL, 
    sesion_id INTEGER NOT NULL, 
    producto_id VARCHAR(40) NOT NULL, 
    nombre VARCHAR(60) NOT NULL, 
    precio INTEGER NOT NULL, 
    cantidad INTEGER NOT NULL, 
    fecha TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    CONSTRAINT pk_consumos PRIMARY KEY (id), 
    CONSTRAINT ck_consumos_cantidad_positiva CHECK (cantidad > 0), 
    CONSTRAINT fk_consumos_producto_id_productos FOREIGN KEY(producto_id) REFERENCES productos (id), 
    CONSTRAINT fk_consumos_sesion_id_sesiones FOREIGN KEY(sesion_id) REFERENCES sesiones (id) ON DELETE CASCADE
);

CREATE TYPE metodo_pago AS ENUM ('efectivo', 'transferencia', 'tarjeta');

CREATE TABLE pagos (
    id SERIAL NOT NULL, 
    caja_id INTEGER NOT NULL, 
    fecha TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    concepto VARCHAR(120) NOT NULL, 
    cliente_id INTEGER, 
    cliente_nombre VARCHAR(120) NOT NULL, 
    monto INTEGER NOT NULL, 
    metodo metodo_pago NOT NULL, 
    recibido INTEGER, 
    cambio INTEGER, 
    sesion_id INTEGER, 
    jugador_id INTEGER, 
    anulado_en TIMESTAMP WITH TIME ZONE, 
    CONSTRAINT pk_pagos PRIMARY KEY (id), 
    CONSTRAINT ck_pagos_vueltas_solo_efectivo CHECK ((metodo = 'efectivo') = (recibido IS NOT NULL AND cambio IS NOT NULL)), 
    CONSTRAINT ck_pagos_efectivo_no_se_anula CHECK (anulado_en IS NULL OR metodo <> 'efectivo'), 
    CONSTRAINT ck_pagos_monto_positivo CHECK (monto >= 0), 
    CONSTRAINT fk_pagos_caja_id_cajas FOREIGN KEY(caja_id) REFERENCES cajas (id), 
    CONSTRAINT fk_pagos_cliente_id_usuarios FOREIGN KEY(cliente_id) REFERENCES usuarios (id), 
    CONSTRAINT fk_pagos_jugador_id_jugadores FOREIGN KEY(jugador_id) REFERENCES jugadores (id) ON DELETE SET NULL, 
    CONSTRAINT fk_pagos_sesion_id_sesiones FOREIGN KEY(sesion_id) REFERENCES sesiones (id)
);

CREATE TABLE partidos (
    id SERIAL NOT NULL, 
    torneo_id INTEGER NOT NULL, 
    ronda INTEGER NOT NULL, 
    posicion INTEGER NOT NULL, 
    a_id INTEGER, 
    b_id INTEGER, 
    mesa_id INTEGER, 
    ganador_id INTEGER, 
    CONSTRAINT pk_partidos PRIMARY KEY (id), 
    CONSTRAINT ck_partidos_ganador_es_jugador CHECK (ganador_id IS NULL OR ganador_id IN (a_id, b_id)), 
    CONSTRAINT fk_partidos_a_id_jugadores FOREIGN KEY(a_id) REFERENCES jugadores (id), 
    CONSTRAINT fk_partidos_b_id_jugadores FOREIGN KEY(b_id) REFERENCES jugadores (id), 
    CONSTRAINT fk_partidos_ganador_id_jugadores FOREIGN KEY(ganador_id) REFERENCES jugadores (id), 
    CONSTRAINT fk_partidos_mesa_id_mesas FOREIGN KEY(mesa_id) REFERENCES mesas (id), 
    CONSTRAINT fk_partidos_torneo_id_torneos FOREIGN KEY(torneo_id) REFERENCES torneos (id) ON DELETE CASCADE, 
    CONSTRAINT uq_partidos_lugar UNIQUE (torneo_id, ronda, posicion)
);

INSERT INTO alembic_version (version_num) VALUES ('0e93ef3b3e81') RETURNING alembic_version.version_num;

COMMIT;

