import { $, $$ } from '../dom.js';
import { formatEther } from 'ethers';
import { estado, suscribir } from '../store.js';
import { abreviar, formatoUnidad } from '../format.js';
import { comprarTokens, aprobarTokens, comprarBoletos } from '../chain.js';
import { animarNumero } from '../ui.js';

const ORDEN = ['buy', 'approve', 'tickets'];
let pasoManual = null; // paso que el usuario eligió mirar
let pasoAutoPrevio = null;

const cantidadBoletos = () => Math.max(1, Math.floor(Number($('cantidadBoletos').value) || 1));

function maximoBoletos(d) {
  const cupo = Number(d.restantes);
  return Math.max(1, Math.min(d.maxPorCompra, cupo > 0 ? cupo : 1));
}

function costoSeleccion(d) {
  return d.precioBoleto * BigInt(cantidadBoletos());
}

// Estado de cada paso: completado, actual o bloqueado.
function estadosDePasos(d) {
  if (!d || d.sorteoRealizado) return { buy: 'locked', approve: 'locked', tickets: 'locked', auto: 'closed' };
  const costo = costoSeleccion(d);
  const tieneSaldo = d.saldoToken >= costo;
  const autorizado = d.permiso >= costo;
  return {
    buy: tieneSaldo ? 'done' : 'current',
    approve: !tieneSaldo ? 'locked' : autorizado ? 'done' : 'current',
    tickets: tieneSaldo && autorizado ? 'current' : 'locked',
    auto: !tieneSaldo ? 'buy' : !autorizado ? 'approve' : 'tickets',
  };
}

function pintarPremio(d) {
  const abierto = d && !d.sorteoRealizado;
  const pildora = $('roundPill');
  pildora.textContent = !d ? 'Conecta tu wallet' : d.sorteoRealizado ? 'Ronda cerrada' : d.pausada ? 'Ventas pausadas' : 'Ronda abierta';
  pildora.className = `round-pill ${!d ? '' : d.sorteoRealizado ? 'is-closed' : d.pausada ? 'is-paused' : 'is-open'}`;

  $('totalPrize').textContent = d ? `${formatoUnidad(d.premioAcumulado, d.decimales)} ${estado.simbolo}` : '—';
  if (d) {
    animarNumero($('totalTickets'), d.totalBoletos);
    animarNumero($('uniqueBuyers'), d.participantes);
  } else {
    $('totalTickets').textContent = '—';
    $('uniqueBuyers').textContent = '—';
  }
  $('nextTicket').textContent = d ? (d.sorteoRealizado ? '—' : `#${d.siguienteBoleto}`) : '—';
  $('ticketPriceBadge').textContent = d ? `${formatoUnidad(d.precioBoleto, d.decimales)} ${estado.simbolo}` : '—';

  $('winnerBlock').hidden = !d?.sorteoRealizado;
  if (d?.sorteoRealizado) {
    $('winnerTicket').textContent = `#${d.boletoGanador}`;
    $('winnerAddress').textContent = abreviar(d.ganador);
    $('winnerAddress').title = d.ganador;
    $('paidPrize').textContent = `${formatoUnidad(d.premioPagado, d.decimales)} ${estado.simbolo}`;
  }
  return abierto;
}

function pintarAsistente(d) {
  const pasos = estadosDePasos(d);
  if (pasos.auto !== pasoAutoPrevio) { pasoManual = null; pasoAutoPrevio = pasos.auto; }
  const visible = pasos.auto === 'closed' ? 'closed'
    : pasoManual && pasos[pasoManual] !== 'locked' ? pasoManual : pasos.auto;

  for (const [nombre, id] of [['buy', 'stepBuy'], ['approve', 'stepApprove'], ['tickets', 'stepTickets']]) {
    const nodo = $(id);
    nodo.dataset.state = pasos[nombre];
    nodo.classList.toggle('is-viewing', visible === nombre);
    nodo.disabled = pasos[nombre] === 'locked';
  }
  $$('.wiz-panel').forEach((panel) => { panel.hidden = panel.dataset.panel !== visible; });

  if (!d) {
    $('ethPriceHint').textContent = 'Conecta MetaMask para ver el precio.';
    $('ticketPriceHint').textContent = 'Conecta MetaMask para ver el precio.';
    $('ticketCost').textContent = '—';
    $('allowance').textContent = '—';
    $('ticketQtyEcho').textContent = '—';
    return;
  }
  const sim = estado.simbolo;
  const maxQty = maximoBoletos(d);
  $('cantidadBoletos').max = String(maxQty);
  if (cantidadBoletos() > maxQty) $('cantidadBoletos').value = String(maxQty);

  const klt = Number($('cantidadLOT').value);
  $('ethPriceHint').textContent = Number.isSafeInteger(klt) && klt > 0
    ? `${klt} ${sim} cuestan ${formatEther(d.precioToken * BigInt(klt))} ETH (1 ${sim} = ${formatEther(d.precioToken)} ETH).`
    : 'Introduce una cantidad entera.';

  $('ticketPriceHint').textContent = `1 boleto = ${formatoUnidad(d.precioBoleto, d.decimales)} ${sim}. Máximo ${d.maxPorCompra} por compra; te quedan ${d.restantes} en total.`;
  $('ticketQtyEcho').textContent = String(cantidadBoletos());
  $('ticketCost').textContent = `${formatoUnidad(costoSeleccion(d), d.decimales)} ${sim}`;
  $('allowance').textContent = `${formatoUnidad(d.permiso, d.decimales)} ${sim}`;
}

function pintarAcciones(d) {
  const habilitado = Boolean(estado.wallet && d) && !estado.txEnCurso;
  const abierta = habilitado && !d.sorteoRealizado;
  const sinCupo = Boolean(d && d.restantes === 0n);
  $('btnBuyLOT').disabled = !abierta;
  $('btnApprove').disabled = !abierta || sinCupo;
  $('btnBuyTickets').disabled = !abierta || d.pausada || sinCupo;
  $('salesNote').textContent = !abierta ? '' : d.pausada
    ? 'Las ventas están pausadas por el administrador.'
    : sinCupo ? 'Alcanzaste el límite de boletos de tu cuenta.' : '';
  $('btnBuyTickets').title = $('salesNote').textContent;
  $('btnShowWinner').disabled = !d?.sorteoRealizado;
}

function pintar() {
  const d = estado.datos;
  pintarPremio(d);
  pintarAsistente(d);
  pintarAcciones(d);
}

export function iniciarJugar() {
  suscribir(pintar);
  for (const nodo of $$('.step-node')) {
    nodo.addEventListener('click', () => { pasoManual = nodo.dataset.step; pintar(); });
  }
  for (const chip of $$('.chip')) {
    chip.addEventListener('click', () => { $('cantidadLOT').value = chip.dataset.klt; pintar(); });
  }
  $('cantidadLOT').addEventListener('input', pintar);
  $('cantidadBoletos').addEventListener('input', pintar);
  const ajustar = (delta) => {
    const max = estado.datos ? maximoBoletos(estado.datos) : 4;
    $('cantidadBoletos').value = String(Math.min(max, Math.max(1, cantidadBoletos() + delta)));
    pintar();
  };
  $('btnQtyMinus').addEventListener('click', () => ajustar(-1));
  $('btnQtyPlus').addEventListener('click', () => ajustar(1));

  $('btnBuyLOT').addEventListener('click', () => comprarTokens($('cantidadLOT').value));
  $('btnApprove').addEventListener('click', () => aprobarTokens($('cantidadBoletos').value));
  $('btnBuyTickets').addEventListener('click', () => comprarBoletos($('cantidadBoletos').value));
  pintar();
}
