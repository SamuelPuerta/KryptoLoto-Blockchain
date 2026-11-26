import { $ } from '../dom.js';
import { estado, suscribir } from '../store.js';
import { RED_SEPOLIA } from '../contracts.js';
import { abreviar, formatoUnidad } from '../format.js';

let sorteoPrevio = null; // null hasta la primera lectura

function lanzarConfeti() {
  const capa = $('confetti');
  capa.replaceChildren();
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 28; i++) {
    const pieza = document.createElement('i');
    pieza.style.setProperty('--x', `${Math.round(Math.random() * 100)}%`);
    pieza.style.setProperty('--d', `${(Math.random() * 1.6).toFixed(2)}s`);
    pieza.style.setProperty('--t', `${(2.6 + Math.random() * 2).toFixed(2)}s`);
    pieza.style.setProperty('--r', `${Math.round(Math.random() * 360)}deg`);
    capa.append(pieza);
  }
}

function abrir() {
  const d = estado.datos;
  if (!d?.sorteoRealizado) return;
  const soyGanador = d.ganador.toLowerCase() === estado.cuenta?.toLowerCase();
  $('modalTicket').textContent = String(d.boletoGanador);
  $('modalAddress').textContent = abreviar(d.ganador);
  $('modalAddress').title = d.ganador;
  $('modalPrize').textContent = `${formatoUnidad(d.premioPagado, d.decimales)} ${estado.simbolo}`;
  $('modalHeadline').textContent = soyGanador ? '¡Ganaste!' : 'Ya hay ganador';
  $('modalYou').textContent = soyGanador
    ? 'El premio ya está en tu cuenta.'
    : 'El premio se pagó al titular actual del boleto ganador.';
  $('modalLink').href = `${RED_SEPOLIA.explorador}/address/${d.ganador}`;
  $('winnerModal').hidden = false;
  lanzarConfeti();
  $('modalClose').focus();
}

const cerrar = () => { $('winnerModal').hidden = true; };

function revisar() {
  const cerrada = Boolean(estado.datos?.sorteoRealizado);
  // Se abre sola cuando se ve pasar de «abierta» a «cerrada» durante la sesión.
  if (sorteoPrevio === false && cerrada) abrir();
  if (estado.datos) sorteoPrevio = cerrada;
}

export function iniciarGanador() {
  suscribir(revisar);
  $('btnShowWinner').addEventListener('click', abrir);
  $('modalClose').addEventListener('click', cerrar);
  $('winnerModal').addEventListener('click', (evento) => { if (evento.target === $('winnerModal')) cerrar(); });
  document.addEventListener('keydown', (evento) => { if (evento.key === 'Escape') cerrar(); });
}
