/**
 * DIRECCIONES PÚBLICAS — REEMPLAZAR LAS TRES DESPUÉS DE DESPLEGAR EN SEPOLIA.
 * Son direcciones de contrato (no hashes de transacción).
 * No pongas claves privadas ni frases semilla en este archivo.
 */
export const RED_SEPOLIA = {
  chainId: 11155111n,
  chainIdHex: '0xaa36a7',
  nombre: 'Ethereum Sepolia',
  explorador: 'https://sepolia.etherscan.io',
};

export const DIRECCIONES = {
  token: '0x41d66ADf49094b06212Be01dc1F2C569E8bd3406', // LoteriaToken
  nft: '0xd71A7349C569523B3E8C36BFDfe82599a746bdA7', // BoletoNFT
  loteria: '0x723BC6cD44504b23a82465210928D0425d3137B2', // Loteria
};

/**
 * Número del bloque en que se desplegó Loteria (opcional).
 * Con null, la actividad reciente lee los últimos ~9000 bloques;
 * con el número real, lee todo el historial desde el despliegue.
 */
export const BLOQUE_DESPLIEGUE = 12217394;

/**
 * ABI mínima: solo las funciones y eventos que usa la interfaz,
 * en forma legible para ethers.js v6. Si cambia el nombre, los parámetros
 * o el retorno de una función del contrato, hay que actualizar su firma aquí.
 */
export const ABI_TOKEN = [
  'function PRECIO_TOKEN() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function comprarTokens(uint256 cantidadTokens) payable',
  'function approve(address spender, uint256 amount) returns (bool)',
];

export const ABI_NFT = [
  'function owner() view returns (address)',
  'function ownerOf(uint256 tokenId) view returns (address)',
];

export const ABI_LOTERIA = [
  'function owner() view returns (address)',
  'function PRECIO_BOLETO_TOKENS() view returns (uint256)',
  'function MAX_BOLETOS_POR_COMPRA() view returns (uint256)',
  'function MAX_BOLETOS_POR_USUARIO() view returns (uint256)',
  'function premioAcumulado() view returns (uint256)',
  'function premioPagado() view returns (uint256)',
  'function boletoGanador() view returns (uint256)',
  'function ganador() view returns (address)',
  'function sorteoRealizado() view returns (bool)',
  'function totalBoletos() view returns (uint256)',
  'function siguienteBoleto() view returns (uint256)',
  'function precioBoletoEnUnidades() view returns (uint256)',
  'function obtenerBoletos(address usuario) view returns (uint256[])',
  'function paused() view returns (bool)',
  'function boletosRestantes(address usuario) view returns (uint256)',
  'function totalParticipantes() view returns (uint256)',
  'function comprarBoletos(uint256 cantidad)',
  'function sortearGanador()',
  'function pausar()',
  'function reanudar()',
  'event BoletosComprados(address indexed comprador, uint256 cantidad, uint256 costoTotal)',
  'event GanadorSeleccionado(uint256 indexed numeroBoleto, address indexed receptorPremio, uint256 cantidadKLT)',
  'event Paused(address account)',
  'event Unpaused(address account)',
  'error EnforcedPause()',
];

/** Selectores (4 primeros bytes) de errores personalizados que ethers no siempre decodifica. */
export const SELECTOR_ENFORCED_PAUSE = '0xd93c0665';
export const SELECTOR_NO_AUTORIZADO = '0x118cdaa7'; // OwnableUnauthorizedAccount(address)
