import { $ } from '../dom.js';
import { formatEther } from 'ethers';
import { estado, suscribir } from '../store.js';
import { DIRECCIONES, RED_SEPOLIA } from '../contracts.js';
import { MEJORA } from '../mejora.js';
import { abreviar, formatoUnidad, textoError } from '../format.js';
import { consultarMejora } from '../chain.js';
import { mostrarEstado } from '../toast.js';

function textoEvento(item, d) {
  if (item.tipo === 'compra') {
    return `${abreviar(item.comprador)} compró ${item.cantidad} boleto${item.cantidad === 1n ? '' : 's'}`;
  }
  if (item.tipo === 'ganador') {
    return `Boleto #${item.boleto} ganó ${formatoUnidad(item.premio, d?.decimales ?? 18)} ${estado.simbolo} · ${abreviar(item.receptor)}`;
  }
  if (item.tipo === 'precio') {
    return `Precio del boleto actualizado: ${item.anterior} → ${item.nuevo} ${estado.simbolo}`;
  }
  return item.tipo === 'pausa' ? 'Ventas pausadas por el administrador' : 'Ventas reanudadas';
}

function pintarActividad() {
  const lista = $('activityList');
  lista.replaceChildren();
  if (!estado.actividad.length) {
    const vacio = document.createElement('li');
    vacio.className = 'empty-state';
    vacio.textContent = estado.wallet ? 'Todavía no hay actividad reciente.' : 'Conecta MetaMask para ver la actividad.';
    lista.append(vacio);
    return;
  }
  for (const item of estado.actividad) {
    const fila = document.createElement('li');
    fila.className = `tl-item tl-${item.tipo}`;
    const texto = document.createElement('span');
    texto.textContent = textoEvento(item, estado.datos);
    const enlace = document.createElement('a');
    enlace.href = `${RED_SEPOLIA.explorador}/tx/${item.hash}`;
    enlace.target = '_blank';
    enlace.rel = 'noopener noreferrer';
    enlace.textContent = `bloque ${item.bloque} ↗`;
    fila.append(texto, enlace);
    lista.append(fila);
  }
}

function pintarReglas() {
  const d = estado.datos;
  const sim = estado.simbolo;
  $('roundStatus').textContent = !d ? '—' : d.sorteoRealizado ? 'Sorteada y cerrada' : 'Abierta';
  $('salesStatus').textContent = !d ? '—' : d.sorteoRealizado ? 'Cerradas' : d.pausada ? 'Pausadas' : 'Activas';
  $('salesStatus').dataset.estado = !d ? '' : d.sorteoRealizado ? 'cerradas' : d.pausada ? 'pausadas' : 'activas';
  $('ruleTokenPrice').textContent = d ? `${formatEther(d.precioToken)} ETH por ${sim}` : '—';
  $('ruleTicketPrice').textContent = d ? `${formatoUnidad(d.precioBoleto, d.decimales)} ${sim}` : '—';
  $('ruleMaxBuy').textContent = d ? `${d.maxPorCompra} boletos` : '—';
  $('ruleMaxUser').textContent = d ? `${d.maxPorUsuario} boletos` : '—';
  $('btnMejora').disabled = !estado.wallet || !MEJORA.activa;
}

function pintar() {
  pintarReglas();
  pintarActividad();
}

export function iniciarRonda() {
  $('linkToken').href = `${RED_SEPOLIA.explorador}/address/${DIRECCIONES.token}`;
  $('linkNFT').href = `${RED_SEPOLIA.explorador}/address/${DIRECCIONES.nft}`;
  $('linkLoteria').href = `${RED_SEPOLIA.explorador}/address/${DIRECCIONES.loteria}`;
  $('mejoraTitulo').textContent = MEJORA.titulo;
  $('mejoraDescripcion').textContent = MEJORA.descripcion;
  $('mejoraResultado').textContent = MEJORA.activa ? 'Pulsa «Consultar» para leer el contrato.' : 'Configura src/mejora.js.';
  $('btnMejora').addEventListener('click', async () => {
    try {
      const resultado = await consultarMejora();
      if (resultado !== null) $('mejoraResultado').textContent = resultado;
    } catch (error) {
      $('mejoraResultado').textContent = 'No se pudo consultar.';
      mostrarEstado(`No se pudo leer la mejora: ${textoError(error)}`, 'error');
    }
  });
  suscribir(pintar);
  pintar();
}
