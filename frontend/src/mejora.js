/**
 * Función de lectura (view/pure) del contrato que se consulta desde la
 * vista «Ronda» para demostrar una mejora funcional propia.
 * La función debe existir en el contrato desplegado.
 *
 * argumento: 'ninguno' si la función no recibe parámetros,
 *            'cuenta' si recibe la dirección del usuario conectado.
 */
export const MEJORA = {
  activa: true,
  titulo: 'Boletos restantes por participante',
  descripcion: 'Cuántos boletos más puede comprar tu cuenta antes de llegar al límite acumulado del contrato. Baja cada vez que compras.',
  contrato: 'loteria', // 'loteria' | 'token' | 'nft'
  firma: 'function boletosRestantes(address usuario) view returns (uint256)',
  funcion: 'boletosRestantes',
  argumento: 'cuenta', // 'ninguno' | 'cuenta'
  sufijo: 'boletos',
};
