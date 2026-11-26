import { formatEther, formatUnits } from 'ethers';
import { estado } from './store.js';
import { SELECTOR_ENFORCED_PAUSE, SELECTOR_NO_AUTORIZADO } from './contracts.js';

const CERO = '0x0000000000000000000000000000000000000000';

export function abreviar(direccion) {
  if (!direccion || direccion === CERO) return '—';
  return `${direccion.slice(0, 6)}…${direccion.slice(-4)}`;
}

export function cantidadEntera(valor, maximo = 100000) {
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero <= 0 || numero > maximo) {
    throw new Error(`Introduce un entero entre 1 y ${maximo}.`);
  }
  return numero;
}

/** Muestra hasta seis decimales sin perder precisión en los cálculos. */
export function formatoUnidad(cantidad, decimales = 18) {
  const [entero, decimal = ''] = formatUnits(cantidad, decimales).split('.');
  const enteroFormateado = BigInt(entero).toLocaleString('es-CO');
  const relevante = decimal.slice(0, 6).replace(/0+$/, '');
  return relevante ? `${enteroFormateado},${relevante}` : enteroFormateado;
}

export const formatoETH = (cantidad) => `${Number(formatEther(cantidad)).toFixed(4)} ETH`;

// Reúne textos y datos de un error para detectar errores personalizados que
// ethers no decodifica al estimar el gas.
function textoCrudo(error) {
  return [error?.data, error?.info?.error?.data?.data, error?.info?.error?.data,
    error?.error?.data, error?.shortMessage, error?.message]
    .map((x) => { try { return typeof x === 'string' ? x : JSON.stringify(x) ?? ''; } catch { return ''; } })
    .join(' ');
}

/** Convierte cualquier error de MetaMask, ethers o del contrato en un mensaje legible. */
export function textoError(error) {
  const simbolo = estado.simbolo;
  if (error?.code === 4001 || error?.code === 'ACTION_REJECTED') {
    return 'Cancelaste la solicitud en MetaMask.';
  }
  const crudo = textoCrudo(error);
  if (error?.revert?.name === 'EnforcedPause' || crudo.includes(SELECTOR_ENFORCED_PAUSE) || /EnforcedPause/.test(crudo)) {
    return 'Las ventas están pausadas por el administrador.';
  }
  if (crudo.includes(SELECTOR_NO_AUTORIZADO) || /OwnableUnauthorizedAccount/.test(crudo)) {
    return 'Solo la cuenta administradora puede hacer esto.';
  }
  const razon = error?.revert?.args?.[0] || error?.reason || error?.shortMessage || error?.message;
  if (!razon) return 'Ocurrió un error desconocido.';
  const mensaje = String(razon);
  if (/user denied|user rejected/i.test(mensaje)) return 'Cancelaste la solicitud en MetaMask.';
  if (/insufficient funds/i.test(mensaje)) return 'No tienes suficiente Sepolia ETH para esta transacción y el gas.';
  if (/Allowance insuficiente/i.test(mensaje)) return `Debes autorizar suficientes ${simbolo} antes de comprar boletos.`;
  if (/Limite acumulado/i.test(mensaje)) return 'Alcanzaste el máximo de boletos permitido para tu cuenta.';
  if (/Supera el maximo/i.test(mensaje)) return 'Superas el máximo de boletos por compra.';
  if (/Falta transferir la administracion/i.test(mensaje)) return 'Falta transferir la administración de BoletoNFT a Loteria desde Remix.';
  if (/Balance \w+ insuficiente/i.test(mensaje)) return `Compra suficientes ${simbolo} antes de adquirir boletos.`;
  return mensaje.slice(0, 280);
}
