import { $, $$ } from '../dom.js';
import { estado, suscribir } from '../store.js';
import { abreviar, formatoUnidad, formatoETH } from '../format.js';
import { conectarWallet, cambiarRed, actualizarDatos, cerrarSesion } from '../chain.js';

const VISTAS = { jugar: 'Jugar', cartera: 'Mis boletos', ronda: 'Ronda', admin: 'Administración' };

export function vistaActual() {
  const nombre = location.hash.replace('#', '');
  return VISTAS[nombre] ? nombre : 'jugar';
}

function mostrarVista() {
  let vista = vistaActual();
  if (vista === 'admin' && !estado.datos?.esAdmin) vista = 'jugar'; // solo el administrador
  $$('.view').forEach((seccion) => { seccion.hidden = seccion.dataset.view !== vista; });
  $$('[data-nav]').forEach((enlace) => {
    const activo = enlace.dataset.nav === vista;
    enlace.classList.toggle('is-active', activo);
    if (activo) enlace.setAttribute('aria-current', 'page'); else enlace.removeAttribute('aria-current');
  });
  $('viewTitle').textContent = VISTAS[vista];
  document.title = `KryptoLoto · ${VISTAS[vista]}`;
}

function pintarEncabezado() {
  const d = estado.datos;
  const conectada = estado.red === 'conectada';
  const incorrecta = estado.red === 'incorrecta';

  const pildora = $('networkPill');
  pildora.classList.toggle('connected', conectada);
  pildora.classList.toggle('wrong', incorrecta);
  pildora.querySelector('.pill-text').textContent = conectada
    ? 'Sepolia · conectada' : incorrecta ? 'Red incorrecta' : 'Sepolia · sin conectar';

  $('btnConnect').hidden = conectada;
  $('btnConnect').textContent = incorrecta ? 'Cambiar a Sepolia' : 'Conectar MetaMask';
  $('walletChip').hidden = !conectada;
  $('accountText').textContent = abreviar(estado.cuenta);
  $('accountText').title = estado.cuenta ?? '';
  $('btnRefresh').disabled = !estado.wallet || estado.txEnCurso || estado.cargando;

  $('lotBalance').textContent = d ? `${formatoUnidad(d.saldoToken, d.decimales)} ${estado.simbolo}` : '—';
  $('ethBalance').textContent = d ? formatoETH(d.saldoETH) : '—';

  const insignia = $('navTickets');
  const cantidad = d?.misBoletos.length ?? 0;
  insignia.hidden = cantidad === 0;
  insignia.textContent = String(cantidad);
  $('navAdmin').hidden = !d?.esAdmin;

  // El símbolo del token se lee del contrato: nunca se escribe a mano.
  $$('.sym').forEach((el) => { el.textContent = estado.simbolo; });
}

export function iniciarShell() {
  suscribir(() => { pintarEncabezado(); mostrarVista(); });
  window.addEventListener('hashchange', mostrarVista);
  $('btnConnect').addEventListener('click', () => (estado.red === 'incorrecta' ? cambiarRed() : conectarWallet()));
  $('btnRefresh').addEventListener('click', () => actualizarDatos());

  if (window.ethereum?.on) {
    window.ethereum.on('accountsChanged', (cuentas) => (cuentas.length ? conectarWallet(false) : cerrarSesion()));
    window.ethereum.on('chainChanged', () => window.location.reload());
  }
  setInterval(() => actualizarDatos(), 15000); // refresco silencioso mientras hay sesión
  pintarEncabezado();
  mostrarVista();
}
