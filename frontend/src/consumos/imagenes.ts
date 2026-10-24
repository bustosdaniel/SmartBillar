import imagenAgua from '../assets/images/productos/agua-image.jpeg'
import imagenCerveza from '../assets/images/productos/pola-image.avif'
import imagenDeTodito from '../assets/images/productos/detodito-image.jpeg'
import imagenGaseosa from '../assets/images/productos/gaseosa-image.jpeg'
import imagenJugo from '../assets/images/productos/jugo-image.jpeg'
import imagenPapasMargarita from '../assets/images/productos/marg-image.png'
import imagenSuperRicas from '../assets/images/productos/superr-image.png'
import imagenTodoRico from '../assets/images/productos/todorico-image.jpeg'

// Foto de cada producto por su id. Un producto sin foto aquí muestra el espacio en blanco.
export const IMAGEN_PRODUCTO: Partial<Record<string, string>> = {
  gaseosa: imagenGaseosa,
  cerveza: imagenCerveza,
  agua: imagenAgua,
  jugo: imagenJugo,
  'papas-margarita': imagenPapasMargarita,
  'super-ricas': imagenSuperRicas,
  'de-todito': imagenDeTodito,
  'todo-rico': imagenTodoRico,
}
