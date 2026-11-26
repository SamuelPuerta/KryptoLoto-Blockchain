// Estado compartido de la aplicación. Las vistas se suscriben y se repintan
// cada vez que cambia (conexión, lecturas de la cadena o transacciones).
export const estado = {
  wallet: null, // { provider, signer, cuenta, token, nft, loteria }
  cuenta: null,
  red: 'sin-conectar', // 'sin-conectar' | 'incorrecta' | 'conectada'
  datos: null, // lectura más reciente de los contratos
  simbolo: 'KLT', // se reemplaza por token.symbol()
  actividad: [], // eventos recientes de Loteria
  cargando: false,
  txEnCurso: false,
};

const oyentes = new Set();
export const suscribir = (funcion) => oyentes.add(funcion);
export const notificar = () => oyentes.forEach((funcion) => funcion(estado));
