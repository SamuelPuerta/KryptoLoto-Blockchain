import { $ } from '../dom.js';
import { formatEther } from 'ethers';
import { estado, suscribir } from '../store.js';
import { formatoUnidad } from '../format.js';
import { pausarVentas, reanudarVentas, cambiarPrecioBoleto, ejecutarSorteo } from '../chain.js';
import { confirmarAccion } from '../modal.js';

let ultimoPrecioVisto = null;

function marcar(id, cumple) {
  $(id).dataset.ok = String(Boolean(cumple));
}

function pintarPrecio(d, abierta, esAdmin) {
  const sim = estado.simbolo;
  $('adminTicketPrice').textContent = d ? `${formatoUnidad(d.precioBoleto, d.decimales)} ${sim}` : '—';

  const input = $('nuevoPrecioBoleto');
  if (!d) {
    ultimoPrecioVisto = null;
  } else if (d.precioBoletoTokens !== ultimoPrecioVisto) {
    ultimoPrecioVisto = d.precioBoletoTokens;
    input.value = String(d.precioBoletoTokens);
  }
  input.disabled = !abierta || !esAdmin;

  const valor = Number(input.value);
  const valido = Number.isSafeInteger(valor) && valor > 0 && valor <= 500000;
  const esMismo = Boolean(d && valido && BigInt(valor) === d.precioBoletoTokens);

  $('btnSetPrice').disabled = !abierta || !esAdmin || !valido || esMismo;
  $('adminPriceHint').textContent = !d ? 'Conecta la cuenta administradora para editar el precio.'
    : d.sorteoRealizado ? 'La ronda terminó: ya no se puede modificar el precio.'
      : !esAdmin ? 'Esta cuenta no es la administradora de Loteria.'
        : !valido ? 'Introduce un entero entre 1 y 500000.'
          : esMismo ? 'Este ya es el precio actual del boleto.'
            : `Nuevo costo: ${valor} ${sim} (${formatEther(d.precioToken * BigInt(valor))} ETH por boleto).`;
}

function pintar() {
  const d = estado.datos;
  const habilitado = Boolean(estado.wallet && d) && !estado.txEnCurso;
  const abierta = habilitado && !d.sorteoRealizado;
  const esAdmin = Boolean(d?.esAdmin);

  $('adminSalesStatus').textContent = !d ? '—' : d.sorteoRealizado ? 'Cerradas (ronda sorteada)' : d.pausada ? 'Pausadas' : 'Activas';
  $('btnPause').disabled = !abierta || !esAdmin || d.pausada;
  $('btnResume').disabled = !abierta || !esAdmin || !d.pausada;
  pintarPrecio(d, abierta, esAdmin);

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
  $('nuevoPrecioBoleto').addEventListener('input', pintar);
  $('nuevoPrecioBoleto').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !$('btnSetPrice').disabled) cambiarPrecioBoleto($('nuevoPrecioBoleto').value);
  });
  $('btnSetPrice').addEventListener('click', () => cambiarPrecioBoleto($('nuevoPrecioBoleto').value));
  $('btnDraw').addEventListener('click', alSortear);
  pintar();
}
