import { BrowserProvider, Contract } from 'ethers';
import { DIRECCIONES, RED_SEPOLIA, BLOQUE_DESPLIEGUE, ABI_TOKEN, ABI_NFT, ABI_LOTERIA } from './contracts.js';
import { MEJORA } from './mejora.js';
import { estado, notificar } from './store.js';
import { cantidadEntera, formatoUnidad, textoError } from './format.js';
import { mostrarEstado } from './toast.js';

const CERO = '0x0000000000000000000000000000000000000000';

function desconectar() {
  estado.wallet = null;
  estado.datos = null;
  estado.cuenta = null;
  estado.red = 'sin-conectar';
  notificar();
}

/** Conecta MetaMask, valida la red y que las tres direcciones sean contratos reales. */
export async function conectarWallet(solicitarAcceso = true) {
  if (!window.ethereum) {
    mostrarEstado('No se detectó MetaMask. Instala o habilita la extensión en este navegador.', 'error');
    return;
  }
  try {
    const metodo = solicitarAcceso ? 'eth_requestAccounts' : 'eth_accounts';
    const cuentas = await window.ethereum.request({ method: metodo });
    if (!cuentas?.length) {
      desconectar();
      mostrarEstado('No hay una cuenta autorizada para esta página.', 'error');
      return;
    }
    if (Object.values(DIRECCIONES).some((direccion) => direccion === CERO)) {
      throw new Error('Faltan direcciones: abre src/contracts.js y reemplaza token, nft y loteria por los contratos desplegados en Sepolia.');
    }
    const provider = new BrowserProvider(window.ethereum);
    const red = await provider.getNetwork();
    if (red.chainId !== RED_SEPOLIA.chainId) {
      desconectar();
      estado.red = 'incorrecta';
      notificar();
      mostrarEstado('MetaMask debe estar en la red Ethereum Sepolia. Usa el botón para cambiarla.', 'error');
      return;
    }
    const signer = await provider.getSigner();
    const cuenta = await signer.getAddress();
    const codigos = await Promise.all(
      Object.values(DIRECCIONES).map((direccion) => provider.getCode(direccion)),
    );
    if (codigos.some((codigo) => codigo === '0x')) {
      throw new Error('Una dirección configurada no contiene un contrato en Sepolia. Revisa src/contracts.js.');
    }
    estado.wallet = {
      provider, signer, cuenta,
      token: new Contract(DIRECCIONES.token, ABI_TOKEN, signer),
      nft: new Contract(DIRECCIONES.nft, ABI_NFT, signer),
      loteria: new Contract(DIRECCIONES.loteria, ABI_LOTERIA, signer),
    };
    estado.cuenta = cuenta;
    estado.red = 'conectada';
    notificar();
    await actualizarDatos();
    mostrarEstado('Conexión correcta. Ya puedes usar los contratos desplegados en Sepolia.', 'success');
  } catch (error) {
    desconectar();
    mostrarEstado(textoError(error), 'error');
  }
}

export function cerrarSesion() {
  desconectar();
  mostrarEstado('MetaMask desconectado. Vuelve a conectar para continuar.', 'info');
}

export async function cambiarRed() {
  if (!window.ethereum) {
    mostrarEstado('MetaMask no está disponible.', 'error');
    return;
  }
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: RED_SEPOLIA.chainIdHex }],
    });
    await conectarWallet();
  } catch (error) {
    mostrarEstado(`Selecciona manualmente Sepolia en MetaMask. ${textoError(error)}`, 'error');
  }
}

/** Lee en paralelo todo lo que muestra la interfaz. */
export async function actualizarDatos() {
  if (!estado.wallet || estado.cargando || estado.txEnCurso) return;
  estado.cargando = true;
  notificar();
  try {
    const { cuenta, provider, token, loteria, nft } = estado.wallet;
    const [saldoETH, saldoToken, permiso, decimales, precioToken, precioBoleto, precioBoletoTokens, maxPorCompra,
      maxPorUsuario, totalBoletos, siguienteBoleto, premioAcumulado, premioPagado, sorteoRealizado,
      boletoGanador, ganador, ownerLoteria, ownerNFT, misBoletos, simbolo, pausada, restantes,
      participantes] = await Promise.all([
      provider.getBalance(cuenta),
      token.balanceOf(cuenta),
      token.allowance(cuenta, DIRECCIONES.loteria),
      token.decimals(),
      token.PRECIO_TOKEN(),
      loteria.precioBoletoEnUnidades(),
      loteria.PRECIO_BOLETO_TOKENS(),
      loteria.MAX_BOLETOS_POR_COMPRA(),
      loteria.MAX_BOLETOS_POR_USUARIO(),
      loteria.totalBoletos(),
      loteria.siguienteBoleto(),
      loteria.premioAcumulado(),
      loteria.premioPagado(),
      loteria.sorteoRealizado(),
      loteria.boletoGanador(),
      loteria.ganador(),
      loteria.owner(),
      nft.owner(),
      loteria.obtenerBoletos(cuenta),
      token.symbol(),
      loteria.paused(),
      loteria.boletosRestantes(cuenta),
      loteria.totalParticipantes(),
    ]);
    const ids = [...misBoletos].map((id) => BigInt(id));
    const titulares = await Promise.all(ids.map((id) => nft.ownerOf(id)));
    estado.simbolo = simbolo;
    estado.datos = {
      saldoETH, saldoToken, permiso, decimales: Number(decimales), precioToken, precioBoleto,
      precioBoletoTokens, maxPorCompra: Number(maxPorCompra), maxPorUsuario: Number(maxPorUsuario),
      totalBoletos, siguienteBoleto, premioAcumulado, premioPagado, sorteoRealizado,
      boletoGanador, ganador, pausada, restantes, participantes,
      esAdmin: cuenta.toLowerCase() === ownerLoteria.toLowerCase(),
      nftListo: ownerNFT.toLowerCase() === DIRECCIONES.loteria.toLowerCase(),
      misBoletos: ids.map((id, i) => ({
        id,
        titularActual: titulares[i],
        esMio: titulares[i].toLowerCase() === cuenta.toLowerCase(),
      })),
    };
    leerActividad(); // sin await: no bloquea el resto de la interfaz
  } catch (error) {
    estado.datos = null;
    mostrarEstado(`No se pudieron leer los contratos: ${textoError(error)}`, 'error');
  } finally {
    estado.cargando = false;
    notificar();
  }
}

async function ejecutarTransaccion(etiqueta, construir) {
  if (!estado.wallet || estado.txEnCurso) return false;
  estado.txEnCurso = true;
  notificar();
  let exito = false;
  try {
    mostrarEstado(`${etiqueta}: confirma la solicitud en MetaMask.`);
    const tx = await construir();
    mostrarEstado(`${etiqueta}: transacción enviada. Esperando confirmación…`, 'info', tx.hash);
    const recibo = await tx.wait();
    if (!recibo || recibo.status !== 1) throw new Error('La transacción no fue exitosa.');
    mostrarEstado(`${etiqueta}: transacción confirmada en Sepolia.`, 'success', tx.hash);
    exito = true;
  } catch (error) {
    mostrarEstado(`${etiqueta}: ${textoError(error)}`, 'error');
  } finally {
    estado.txEnCurso = false;
    await actualizarDatos();
  }
  return exito;
}

export async function comprarTokens(cantidadTexto) {
  const d = estado.datos;
  if (!d) return false;
  let cantidad;
  try { cantidad = cantidadEntera(cantidadTexto); } catch (error) { mostrarEstado(error.message, 'error'); return false; }
  const costo = d.precioToken * BigInt(cantidad);
  return ejecutarTransaccion(`Comprar ${cantidad} ${estado.simbolo}`, () =>
    estado.wallet.token.comprarTokens(BigInt(cantidad), { value: costo }));
}

export async function aprobarTokens(cantidadTexto) {
  const d = estado.datos;
  if (!d || d.sorteoRealizado) return false;
  let cantidad;
  try { cantidad = cantidadEntera(cantidadTexto, d.maxPorCompra); } catch (error) { mostrarEstado(error.message, 'error'); return false; }
  const costo = d.precioBoleto * BigInt(cantidad);
  return ejecutarTransaccion(`Autorizar ${formatoUnidad(costo, d.decimales)} ${estado.simbolo}`, () =>
    estado.wallet.token.approve(DIRECCIONES.loteria, costo));
}

export async function comprarBoletos(cantidadTexto) {
  const d = estado.datos;
  if (!d || d.sorteoRealizado) return false;
  let cantidad;
  try { cantidad = cantidadEntera(cantidadTexto, d.maxPorCompra); } catch (error) { mostrarEstado(error.message, 'error'); return false; }
  if (d.pausada) {
    mostrarEstado('Las ventas están pausadas por el administrador.', 'error');
    return false;
  }
  if (BigInt(cantidad) > d.restantes) {
    mostrarEstado(`Solo puedes comprar ${d.restantes} boleto(s) más con esta cuenta.`, 'error');
    return false;
  }
  const costo = d.precioBoleto * BigInt(cantidad);
  if (d.saldoToken < costo) {
    mostrarEstado(`No tienes suficientes ${estado.simbolo}. Primero compra tokens.`, 'error');
    return false;
  }
  if (d.permiso < costo) {
    mostrarEstado(`Falta autorización. Primero autoriza ${estado.simbolo} en el paso 2.`, 'error');
    return false;
  }
  return ejecutarTransaccion(`Comprar ${cantidad} boleto(s) NFT`, () =>
    estado.wallet.loteria.comprarBoletos(BigInt(cantidad)));
}

export async function pausarVentas() {
  if (!estado.datos?.esAdmin || estado.datos.pausada) return false;
  return ejecutarTransaccion('Pausar ventas', () => estado.wallet.loteria.pausar());
}

export async function reanudarVentas() {
  if (!estado.datos?.esAdmin || !estado.datos.pausada) return false;
  return ejecutarTransaccion('Reanudar ventas', () => estado.wallet.loteria.reanudar());
}

export async function cambiarPrecioBoleto(nuevoPrecioTexto) {
  const d = estado.datos;
  if (!d?.esAdmin || d.sorteoRealizado) return false;
  let nuevoPrecio;
  try {
    nuevoPrecio = cantidadEntera(nuevoPrecioTexto, 500000);
  } catch (error) {
    mostrarEstado(error.message, 'error');
    return false;
  }
  if (BigInt(nuevoPrecio) === d.precioBoletoTokens) {
    mostrarEstado(`El precio del boleto ya es ${nuevoPrecio} ${estado.simbolo}.`, 'error');
    return false;
  }
  return ejecutarTransaccion(`Cambiar precio a ${nuevoPrecio} ${estado.simbolo}`, () =>
    estado.wallet.loteria.cambiarPrecioBoleto(BigInt(nuevoPrecio)));
}

export async function ejecutarSorteo() {
  const d = estado.datos;
  if (!d?.esAdmin || d.sorteoRealizado || d.totalBoletos === 0n) return false;
  return ejecutarTransaccion('Sortear y pagar premio', () => estado.wallet.loteria.sortearGanador());
}

const BLOQUES_RECIENTES = 9000;

/** Eventos recientes de Loteria (compras, pausas y sorteo), del más nuevo al más antiguo. */
export async function leerActividad() {
  if (!estado.wallet) return;
  try {
    const { provider, loteria } = estado.wallet;
    const cabeza = await provider.getBlockNumber();
    const desde = BLOQUE_DESPLIEGUE ?? Math.max(0, cabeza - BLOQUES_RECIENTES);
    const [compras, sorteos, pausas, reanudaciones, precios] = await Promise.all([
      loteria.queryFilter(loteria.filters.BoletosComprados(), desde),
      loteria.queryFilter(loteria.filters.GanadorSeleccionado(), desde),
      loteria.queryFilter(loteria.filters.Paused(), desde),
      loteria.queryFilter(loteria.filters.Unpaused(), desde),
      loteria.queryFilter(loteria.filters.PrecioBoletoActualizado(), desde),
    ]);
    const lista = [
      ...compras.map((e) => ({ tipo: 'compra', e, comprador: e.args.comprador, cantidad: e.args.cantidad })),
      ...sorteos.map((e) => ({ tipo: 'ganador', e, boleto: e.args.numeroBoleto, receptor: e.args.receptorPremio, premio: e.args.cantidadKLT })),
      ...pausas.map((e) => ({ tipo: 'pausa', e })),
      ...reanudaciones.map((e) => ({ tipo: 'reanuda', e })),
      ...precios.map((e) => ({ tipo: 'precio', e, anterior: e.args.precioAnterior, nuevo: e.args.precioNuevo })),
    ].map(({ e, ...resto }) => ({ ...resto, bloque: e.blockNumber, indice: e.index, hash: e.transactionHash }));
    lista.sort((a, b) => b.bloque - a.bloque || b.indice - a.indice);
    estado.actividad = lista.slice(0, 12);
  } catch {
    // La actividad es informativa: si el proveedor limita getLogs, no afecta el resto.
    estado.actividad = [];
  }
  notificar();
}

/** Lee la función propia configurada en mejora.js directamente del contrato. */
export async function consultarMejora() {
  if (!estado.wallet || !MEJORA.activa) return null;
  if (!['token', 'nft', 'loteria'].includes(MEJORA.contrato)) throw new Error('contrato debe ser token, nft o loteria.');
  if (!['ninguno', 'cuenta'].includes(MEJORA.argumento)) throw new Error('argumento debe ser ninguno o cuenta.');
  const instancia = new Contract(DIRECCIONES[MEJORA.contrato], [MEJORA.firma], estado.wallet.provider);
  const args = MEJORA.argumento === 'cuenta' ? [estado.cuenta] : [];
  const lectura = await instancia[MEJORA.funcion](...args);
  const texto = typeof lectura === 'bigint' ? lectura.toString()
    : typeof lectura === 'boolean' ? (lectura ? 'Sí' : 'No')
      : Array.isArray(lectura) ? lectura.map(String).join(', ')
        : String(lectura);
  return `${texto}${MEJORA.sufijo ? ` ${MEJORA.sufijo}` : ''}`;
}
