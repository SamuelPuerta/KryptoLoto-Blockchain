// Utilidades visuales compartidas. Respetan prefers-reduced-motion.
const reducirMovimiento = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Muestra un entero en el elemento, animando desde el valor anterior. */
export function animarNumero(elemento, destino) {
  const final = Number(destino);
  const inicio = Number(elemento.dataset.valor);
  elemento.dataset.valor = String(final);
  if (!Number.isFinite(inicio) || inicio === final || reducirMovimiento()) {
    elemento.textContent = String(final);
    return;
  }
  const duracion = 700;
  let t0 = null; // Se toma del primer frame para usar siempre el mismo reloj.
  const paso = (ahora) => {
    if (t0 === null) t0 = ahora;
    const avance = Math.min(1, (ahora - t0) / duracion);
    const suavizado = 1 - Math.pow(1 - avance, 3);
    elemento.textContent = String(Math.round(inicio + (final - inicio) * suavizado));
    if (avance < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
