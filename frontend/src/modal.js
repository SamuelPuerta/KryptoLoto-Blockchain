import { $ } from './dom.js';

let resolver = null;

function cerrar(resultado) {
  $('confirmModal').hidden = true;
  document.removeEventListener('keydown', alTeclear);
  if (resolver) resolver(resultado);
  resolver = null;
}

function alTeclear(evento) {
  if (evento.key === 'Escape') cerrar(false);
}

/** Diálogo de confirmación propio. Devuelve una promesa con true o false. */
export function confirmarAccion(titulo, texto, etiquetaOk = 'Continuar') {
  $('confirmTitle').textContent = titulo;
  $('confirmText').textContent = texto;
  $('confirmOk').textContent = etiquetaOk;
  $('confirmModal').hidden = false;
  document.addEventListener('keydown', alTeclear);
  $('confirmCancel').focus();
  return new Promise((resolve) => { resolver = resolve; });
}

export function iniciarModalConfirmacion() {
  $('confirmOk').addEventListener('click', () => cerrar(true));
  $('confirmCancel').addEventListener('click', () => cerrar(false));
  $('confirmModal').addEventListener('click', (evento) => {
    if (evento.target === $('confirmModal')) cerrar(false);
  });
}
