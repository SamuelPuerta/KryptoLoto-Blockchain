import { $ } from '../dom.js';
import { estado, suscribir } from '../store.js';
import { pausarVentas, reanudarVentas, ejecutarSorteo } from '../chain.js';
import { confirmarAccion } from '../modal.js';

function marcar(id, cumple) {
  $(id).dataset.ok = String(Boolean(cumple));
}

function pintar() {
  const d = estado.datos;
  const habilitado = Boolean(estado.wallet && d) && !estado.txEnCurso;
  const abierta = habilitado && !d.sorteoRealizado;
  const esAdmin = Boolean(d?.esAdmin);

  $('adminSalesStatus').textContent = !d ? '—' : d.sorteoRealizado ? 'Cerradas (ronda sorteada)' : d.pausada ? 'Pausadas' : 'Activas';
  $('btnPause').disabled = !abierta || !esAdmin || d.pausada;
  $('btnResume').disabled = !abierta || !esAdmin || !d.pausada;

  marcar('chkNft', d?.nftListo);
  marcar('chkTickets', d && d.totalBoletos > 0n);
  marcar('chkOpen', d && !d.sorteoRealizado);
  $('chkTicketsText').textContent = d ? `Al menos un boleto vendido (hay ${d.totalBoletos})` : 'Al menos un boleto vendido';

  $('btnDraw').disabled = !abierta || !esAdmin || d.totalBoletos === 0n;
  $('adminNote').textContent = !d ? 'Conecta la cuenta administradora para habilitar el sorteo.'
    : !esAdmin ? 'Esta cuenta no es la administradora de Loteria.'
      : d.sorteoRealizado ? 'El sorteo ya se ejecutó: no puede repetirse.'
        : d.totalBoletos === 0n ? 'Todavía no hay boletos vendidos.'
          : 'No sortees antes de terminar todas las pruebas: la ronda es única.';
}

async function alSortear() {
  const confirmado = await confirmarAccion(
    'Ejecutar el sorteo',
    'El sorteo es irreversible: se elige un ganador, se paga el premio acumulado y la ronda queda cerrada para siempre.',
    'Ejecutar sorteo',
  );
  if (confirmado) await ejecutarSorteo();
}

export function iniciarAdmin() {
  suscribir(pintar);
  $('btnPause').addEventListener('click', () => pausarVentas());
  $('btnResume').addEventListener('click', () => reanudarVentas());
  $('btnDraw').addEventListener('click', alSortear);
  pintar();
}
