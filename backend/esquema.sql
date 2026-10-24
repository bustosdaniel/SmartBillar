CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 7ead478e0b8a

CREATE TABLE cajas (
    id INTEGER NOT NULL AUTO_INCREMENT, 
    apertura DATETIME NOT NULL DEFAULT (now()), 
    base INTEGER NOT NULL, 
    cierre DATETIME, 
    contado INTEGER, 
    nota TEXT, 
    abierta INTEGER GENERATED ALWAYS AS ((CASE WHEN cierre IS NULL THEN 1 END)) STORED, 
    CONSTRAINT pk_cajas PRIMARY KEY (id), 
    CONSTRAINT ck_cajas_base_positiva CHECK (base >= 0), 
    CONSTRAINT uq_cajas_abierta UNIQUE (abierta)
);

CREATE TABLE mesas (
    id INTEGER NOT NULL AUTO_INCREMENT, 
    nombre VARCHAR(40) NOT NULL, 
    modo ENUM('pool','tres-bandas','libre') NOT NULL, 
    CONSTRAINT pk_mesas PRIMARY KEY (id), 
    CONSTRAINT uq_mesas_nombre UNIQUE (nombre)
);

CREATE TABLE movimientos (
    id INTEGER NOT NULL AUTO_INCREMENT, 
    tipo ENUM('inicio','pausa','reanudar','detener','fin','pago','caja','torneo','consumo') NOT NULL, 
    titulo VARCHAR(120) NOT NULL, 
    detalle VARCHAR(200) NOT NULL, 
    fecha DATETIME NOT NULL DEFAULT (now()), 
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
    extras JSON NOT NULL, 
    CONSTRAINT pk_planes PRIMARY KEY (id), 
    CONSTRAINT ck_planes_descuento_bar_porcentaje CHECK (descuento_bar BETWEEN 0 AND 100), 
    CONSTRAINT ck_planes_descuento_mesa_porcentaje CHECK (descuento_mesa BETWEEN 0 AND 100), 
    CONSTRAINT ck_planes_descuento_torneo_porcentaje CHECK (descuento_torneo BETWEEN 0 AND 100)
);

CREATE TABLE productos (
    id VARCHAR(40) NOT NULL, 
    nombre VARCHAR(60) NOT NULL, 
    categoria ENUM('bebida','paquete') NOT NULL, 
    precio INTEGER NOT NULL, 
    CONSTRAINT pk_productos PRIMARY KEY (id), 
    CONSTRAINT ck_productos_precio_positivo CHECK (precio >= 0)
);

CREATE TABLE reglas_horario (
    id INTEGER NOT NULL AUTO_INCREMENT, 
    nombre VARCHAR(60) NOT NULL, 
    dias JSON NOT NULL, 
    desde TIME NOT NULL, 
    hasta TIME NOT NULL, 
    ajuste INTEGER NOT NULL, 
    CONSTRAINT pk_reglas_horario PRIMARY KEY (id), 
    CONSTRAINT ck_reglas_horario_dias_validos CHECK (JSON_CONTAINS('[0,1,2,3,4,5,6]', dias)), 
    CONSTRAINT ck_reglas_horario_ajuste_porcentaje CHECK (ajuste BETWEEN -100 AND 100)
);

CREATE TABLE tarifas (
    modo ENUM('pool','tres-bandas','libre') NOT NULL, 
    hora INTEGER NOT NULL, 
    CONSTRAINT pk_tarifas PRIMARY KEY (modo), 
    CONSTRAINT ck_tarifas_hora_positiva CHECK (hora >= 0)
);

CREATE TABLE torneos (
    id INTEGER NOT NULL AUTO_INCREMENT, 
    nombre VARCHAR(80) NOT NULL, 
    modo ENUM('pool','tres-bandas','libre') NOT NULL, 
    categoria ENUM('abierta','principiante','avanzado') NOT NULL, 
    fecha DATE NOT NULL, 
    hora TIME NOT NULL, 
    cupos INTEGER NOT NULL, 
    inscripcion INTEGER NOT NULL, 
    premio VARCHAR(120) NOT NULL, 
    estado ENUM('inscripciones','en-curso','finalizado') NOT NULL, 
    CONSTRAINT pk_torneos PRIMARY KEY (id), 
    CONSTRAINT ck_torneos_cupos_minimos CHECK (cupos >= 2), 
    CONSTRAINT ck_torneos_inscripcion_positiva CHECK (inscripcion >= 0)
);

CREATE TABLE usuarios (
    id INTEGER NOT NULL AUTO_INCREMENT, 
    nombre VARCHAR(120) NOT NULL, 
    email VARCHAR(160) NOT NULL, 
    cedula VARCHAR(20), 
    telefono VARCHAR(20), 
    rol ENUM('cliente','admin') NOT NULL, 
    cargo ENUM('administrador','cajero'), 
    password_hash VARCHAR(255) NOT NULL, 
    creado DATETIME NOT NULL DEFAULT (now()), 
    CONSTRAINT pk_usuarios PRIMARY KEY (id), 
    CONSTRAINT ck_usuarios_cargo_solo_empleados CHECK ((rol = 'admin') = (cargo IS NOT NULL)), 
    CONSTRAINT ck_usuarios_cedula_clientes CHECK (rol = 'admin' OR cedula IS NOT NULL), 
    CONSTRAINT uq_usuarios_cedula UNIQUE (cedula), 
    CONSTRAINT uq_usuarios_email UNIQUE (email)
);

CREATE TABLE egresos (
    id INTEGER NOT NULL AUTO_INCREMENT, 
    caja_id INTEGER NOT NULL, 
    fecha DATETIME NOT NULL DEFAULT (now()), 
    concepto VARCHAR(120) NOT NULL, 
    monto INTEGER NOT NULL, 
    CONSTRAINT pk_egresos PRIMARY KEY (id), 
    CONSTRAINT ck_egresos_monto_positivo CHECK (monto > 0), 
    CONSTRAINT fk_egresos_caja_id_cajas FOREIGN KEY(caja_id) REFERENCES cajas (id)
);

CREATE TABLE jugadores (
    id INTEGER NOT NULL AUTO_INCREMENT, 
    torneo_id INTEGER NOT NULL, 
    cliente_id INTEGER NOT NULL, 
    nombre VARCHAR(120) NOT NULL, 
    pagado BOOL NOT NULL, 
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
    inicio DATETIME NOT NULL, 
    vence DATETIME NOT NULL, 
    CONSTRAINT pk_membresias PRIMARY KEY (cliente_id), 
    CONSTRAINT fk_membresias_cliente_id_usuarios FOREIGN KEY(cliente_id) REFERENCES usuarios (id) ON DELETE CASCADE, 
    CONSTRAINT fk_membresias_plan_id_planes FOREIGN KEY(plan_id) REFERENCES planes (id)
);

CREATE TABLE notificaciones (
    id INTEGER NOT NULL AUTO_INCREMENT, 
    usuario_id INTEGER NOT NULL, 
    tipo ENUM('factura','membresia','torneo','cuenta','mesa') NOT NULL, 
    asunto VARCHAR(160) NOT NULL, 
    mensaje TEXT NOT NULL, 
    ruta VARCHAR(120), 
    leida BOOL NOT NULL, 
    fecha DATETIME NOT NULL DEFAULT (now()), 
    CONSTRAINT pk_notificaciones PRIMARY KEY (id), 
    CONSTRAINT fk_notificaciones_usuario_id_usuarios FOREIGN KEY(usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE INDEX ix_notificaciones_bandeja ON notificaciones (usuario_id, leida, fecha);

CREATE TABLE sesiones (
    id INTEGER NOT NULL AUTO_INCREMENT, 
    mesa_id INTEGER NOT NULL, 
    cliente_id INTEGER NOT NULL, 
    inicio DATETIME NOT NULL DEFAULT (now()), 
    pausado_ms BIGINT NOT NULL, 
    pausada_desde DATETIME, 
    detenida_en DATETIME, 
    tarifa_hora INTEGER NOT NULL, 
    regla VARCHAR(60), 
    fin DATETIME, 
    tiempo_ms BIGINT, 
    subtotal INTEGER, 
    gratis_ms BIGINT, 
    descuento INTEGER, 
    descuento_bar INTEGER, 
    total INTEGER, 
    plan_id VARCHAR(20), 
    mesa_activa INTEGER GENERATED ALWAYS AS ((CASE WHEN fin IS NULL THEN mesa_id END)) STORED, 
    CONSTRAINT pk_sesiones PRIMARY KEY (id), 
    CONSTRAINT ck_sesiones_fin_tras_detener CHECK (fin IS NULL OR detenida_en IS NOT NULL), 
    CONSTRAINT ck_sesiones_pausado_positivo CHECK (pausado_ms >= 0), 
    CONSTRAINT fk_sesiones_cliente_id_usuarios FOREIGN KEY(cliente_id) REFERENCES usuarios (id), 
    CONSTRAINT fk_sesiones_mesa_id_mesas FOREIGN KEY(mesa_id) REFERENCES mesas (id), 
    CONSTRAINT fk_sesiones_plan_id_planes FOREIGN KEY(plan_id) REFERENCES planes (id), 
    CONSTRAINT uq_sesiones_mesa_activa UNIQUE (mesa_activa)
);

CREATE TABLE solicitudes_membresia (
    cliente_id INTEGER NOT NULL, 
    plan_id VARCHAR(20) NOT NULL, 
    fecha DATETIME NOT NULL DEFAULT (now()), 
    CONSTRAINT pk_solicitudes_membresia PRIMARY KEY (cliente_id), 
    CONSTRAINT fk_solicitudes_membresia_cliente_id_usuarios FOREIGN KEY(cliente_id) REFERENCES usuarios (id) ON DELETE CASCADE, 
    CONSTRAINT fk_solicitudes_membresia_plan_id_planes FOREIGN KEY(plan_id) REFERENCES planes (id)
);

CREATE TABLE consumos (
    id INTEGER NOT NULL AUTO_INCREMENT, 
    sesion_id INTEGER NOT NULL, 
    producto_id VARCHAR(40) NOT NULL, 
    nombre VARCHAR(60) NOT NULL, 
    precio INTEGER NOT NULL, 
    cantidad INTEGER NOT NULL, 
    fecha DATETIME NOT NULL DEFAULT (now()), 
    CONSTRAINT pk_consumos PRIMARY KEY (id), 
    CONSTRAINT ck_consumos_cantidad_positiva CHECK (cantidad > 0), 
    CONSTRAINT fk_consumos_producto_id_productos FOREIGN KEY(producto_id) REFERENCES productos (id), 
    CONSTRAINT fk_consumos_sesion_id_sesiones FOREIGN KEY(sesion_id) REFERENCES sesiones (id) ON DELETE CASCADE
);

CREATE TABLE pagos (
    id INTEGER NOT NULL AUTO_INCREMENT, 
    caja_id INTEGER NOT NULL, 
    fecha DATETIME NOT NULL DEFAULT (now()), 
    concepto VARCHAR(120) NOT NULL, 
    cliente_id INTEGER, 
    cliente_nombre VARCHAR(120) NOT NULL, 
    monto INTEGER NOT NULL, 
    metodo ENUM('efectivo','transferencia','tarjeta') NOT NULL, 
    recibido INTEGER, 
    cambio INTEGER, 
    sesion_id INTEGER, 
    jugador_id INTEGER, 
    anulado_en DATETIME, 
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
    id INTEGER NOT NULL AUTO_INCREMENT, 
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

INSERT INTO alembic_version (version_num) VALUES ('7ead478e0b8a');

