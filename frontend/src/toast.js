import { RED_SEPOLIA } from './contracts.js';
import { $ } from './dom.js';

/** Aviso de transacción: info = pendiente, success = confirmada, error = fallida. */
export function mostrarEstado(mensaje, tipo = 'info', txHash = null) {
  const aviso = $('statusToast');
  aviso.hidden = false;
  aviso.className = `toast ${tipo}`;
  $('toastMessage').textContent = mensaje;
  const enlace = $('toastLink');
  enlace.hidden = !txHash;
  if (txHash) enlace.href = `${RED_SEPOLIA.explorador}/tx/${txHash}`;
}

export function iniciarToast() {
  $('closeToast').addEventListener('click', () => { $('statusToast').hidden = true; });
}
