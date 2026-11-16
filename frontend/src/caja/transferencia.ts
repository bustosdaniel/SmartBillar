// A dónde se transfiere: el mismo número sirve para Nequi y Daviplata, y la llave para Bre-B (desde
// cualquier banco). Si cambia la cuenta del club, se cambia solo aquí.
export const CUENTA_TRANSFERENCIAS = {
  numero: '3213445413',
  llave: '@3213445413',
  plataformas: 'Nequi · Daviplata',
}

// "3213445413" → "321 344 5413", para leerlo y dictarlo más fácil.
export function numeroLegible(numero: string) {
  return numero.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3')
}

// La referencia del comprobante: letras y números, sin espacios (así la muestran Nequi y Daviplata).
export const LARGO_MAXIMO_REFERENCIA = 40
export const LARGO_MINIMO_REFERENCIA = 4

export function limpiarReferencia(texto: string) {
  return texto.replace(/[^A-Za-z0-9-]/g, '').toUpperCase().slice(0, LARGO_MAXIMO_REFERENCIA)
}
