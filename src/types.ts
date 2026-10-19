export type Rol = 'cliente' | 'admin'

// Cargo de un empleado. Hasta definir el rol Cajero/Operador (G1), todos los empleados entran como admin.
export type Cargo = 'administrador' | 'cajero'

export type Usuario = {
  id: number
  nombre: string
  email: string
  rol: Rol
  telefono?: string
  cedula?: string
  cargo?: Cargo
  creado?: number
}

export type ModoJuego = 'pool' | 'tres-bandas' | 'libre'

export type Mesa = {
  id: number
  nombre: string
  modo: ModoJuego
}

export type ModoCobro = 'tiempo' | 'partida'

// Ajuste de precio para ciertos días y horas (negativo = descuento). Si `desde` es mayor
// que `hasta`, la franja cruza la medianoche (ej. 20:00 a 02:00).
export type ReglaHorario = {
  id: string
  nombre: string
  dias: number[]
  desde: string
  hasta: string
  ajuste: number
}

export type ConfigTarifas = {
  porModo: Record<ModoJuego, { hora: number; partida: number }>
  reglas: ReglaHorario[]
}

export type EstadoMesa = 'libre' | 'en-uso' | 'pausada' | 'por-cobrar'

// Sesión de juego activa en una mesa. El tiempo se calcula a partir de `inicio`,
// así el admin y el cliente ven el mismo cronómetro sin enviarlo cada segundo.
export type Sesion = {
  mesaId: number
  clienteId: number | null
  clienteNombre: string
  inicio: number
  pausadoMs: number
  pausadaDesde: number | null
  // Momento en que el admin pulsó Finalizar: el tiempo queda congelado hasta cobrar.
  detenidaEn?: number | null
  // Precios congelados al iniciar: si cambian las tarifas, no afectan a quien ya está jugando.
  // Las sesiones guardadas antes de M2 no los traen y se cobran por tiempo con la tarifa base.
  modoCobro?: ModoCobro
  tarifaHora?: number
  precioPartida?: number
  partidas?: number
  regla?: string | null
}

export type SesionFinalizada = Sesion & {
  fin: number
  tiempoMs: number
  total: number
  metodoPago: MetodoPago
  // Detalle de la cuenta (las sesiones guardadas antes de M1 no lo tienen).
  subtotal?: number
  gratisMs?: number
  descuento?: number
  planId?: PlanId | null
}

export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta'

export type Pago = {
  id: string
  fecha: number
  concepto: string
  cliente: string
  monto: number
  metodo: MetodoPago
  recibido: number | null
  cambio: number | null
}

export type Egreso = {
  id: string
  fecha: number
  concepto: string
  monto: number
}

export type Caja = {
  apertura: number
  base: number
  pagos: Pago[]
  // Las cajas guardadas antes de existir los egresos no traen este campo.
  egresos?: Egreso[]
}

export type CajaCerrada = Caja & {
  cierre: number
  // Arqueo: efectivo que se contó al cerrar (las cajas de demostración no lo traen).
  contado?: number
  nota?: string
}

export type TipoMovimiento = 'inicio' | 'pausa' | 'reanudar' | 'detener' | 'fin' | 'pago' | 'caja' | 'torneo'

export type Movimiento = {
  id: string
  tipo: TipoMovimiento
  titulo: string
  detalle: string
  fecha: number
}

export type EstadoTorneo = 'inscripciones' | 'en-curso' | 'finalizado'

export type CategoriaTorneo = 'abierta' | 'principiante' | 'avanzado'

// Un inscrito puede ser un cliente con cuenta o un invitado (clienteId null).
export type Jugador = {
  id: string
  clienteId: number | null
  nombre: string
  pagado: boolean
  monto: number
}

// Partido de eliminación directa. En la primera ronda, un lado vacío es un pase directo;
// en las siguientes, significa que ese ganador aún no se conoce.
export type Partido = {
  id: string
  ronda: number
  posicion: number
  a: string | null
  b: string | null
  mesaId: number | null
  ganador: string | null
}

export type Torneo = {
  id: number
  nombre: string
  modo: ModoJuego
  categoria: CategoriaTorneo
  fecha: string
  hora: string
  cupos: number
  inscripcion: number
  premio: string
  estado: EstadoTorneo
  jugadores: Jugador[]
  partidos: Partido[]
}

export type PlanId = 'basica' | 'premium' | 'gold'

export type Plan = {
  id: PlanId
  nombre: string
  precioMensual: number
  descuentoMesa: number
  horasGratisMes: number
  descuentoBar: number
  descuentoTorneo: number
  extras: string[]
}

export type Membresia = {
  clienteId: number
  clienteNombre: string
  planId: PlanId
  inicio: number
  vence: number
}

export type EstadoMembresia = 'activa' | 'por-vencer' | 'vencida'

// El cliente elige plan en la app y lo paga en caja (no hay pagos en línea).
export type SolicitudMembresia = {
  clienteId: number
  clienteNombre: string
  planId: PlanId
  fecha: number
}

export type TipoNotificacion = 'factura' | 'membresia' | 'torneo' | 'cuenta'

// En esta fase el correo es simulado: queda registrado lo que el backend enviaría.
export type Notificacion = {
  id: string
  usuarioId: number
  nombre: string
  email: string
  tipo: TipoNotificacion
  asunto: string
  mensaje: string
  fecha: number
  leida: boolean
}
