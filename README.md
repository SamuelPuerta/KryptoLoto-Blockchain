# KryptoLoto-Blockchain

KryptoLoto es una DApp de lotería académica: el usuario compra tokens ERC-20 con ETH de prueba, autoriza al contrato (`approve`), compra boletos que se emiten como NFTs ERC-721, y el administrador ejecuta un sorteo que paga el premio acumulado (en tokens) al titular actual del NFT ganador.

Proyecto final del Curso de Blockchain · Universidad de Antioquia. Funciona únicamente en la red de pruebas **Ethereum Sepolia**.

## Cómo funciona

1. El usuario conecta MetaMask (red Sepolia).
2. Compra tokens **KLT** pagando ETH de prueba a una tasa fija. Los tokens no se devuelven por ETH.
3. Autoriza al contrato `Loteria` a usar sus tokens (`approve`).
4. Compra uno o varios boletos con KLT (`transferFrom`). Cada boleto recibe un número, queda asociado al comprador y genera un NFT ERC-721.
5. Los KLT usados para comprar boletos forman el premio acumulado.
6. El administrador ejecuta el sorteo: un boleto resulta ganador y su titular actual recibe el premio en KLT. El contrato impide ejecutar el sorteo dos veces.

## Contratos

Los tres contratos están en [`contracts/KryptoLoto.sol`](contracts/KryptoLoto.sol) y usan OpenZeppelin 5.x con sus implementaciones estándar.

| Contrato | Rol |
|---|---|
| `LoteriaToken` | ERC-20 «KryptoLoto Token» (KLT). Se compra con ETH a tasa fija; el ETH queda en el contrato como tesorería académica. |
| `BoletoNFT` | ERC-721 «KryptoLoto Ticket» (KLTK). Un NFT por boleto; solo `Loteria` puede emitirlos. |
| `Loteria` | Compra de boletos, registro de participantes, sorteo y pago del premio. Protegido con `Ownable`, `ReentrancyGuard` y `Pausable`. |

### Mejoras propias

- **Pausar y reanudar ventas:** solo el administrador; mientras está pausada no se compran boletos.
- **Límite acumulado por participante:** una dirección no puede superar un máximo total de boletos.
- **Compradores únicos:** estadística consultable de cuántas direcciones distintas han comprado.
- **Precio de boleto configurable:** solo el administrador puede ajustar el precio en KLT mientras la ronda siga abierta (valor inicial: 25 KLT).

El detalle de cada mejora y cómo verificarla está en [`docs/mejoras.md`](docs/mejoras.md).

## Frontend

Aplicación Vite + JavaScript en [`frontend/`](frontend/), con ethers.js v6 y MetaMask. Está organizada como una app con navegación lateral y cuatro vistas:

| Vista | Qué hace |
|---|---|
| **Jugar** | Muestra el premio acumulado y el estado de la ronda, y guía la jugada en tres pasos: fondear con KLT, autorizar el gasto y comprar los boletos. |
| **Boletos** | Billetera de NFTs del usuario, con el cupo restante de su cuenta y el boleto ganador marcado. |
| **Ronda** | Reglas leídas del contrato, verificación en vivo de la función propia y actividad reciente tomada de los eventos. |
| **Admin** | Solo para el administrador: pausar y reanudar ventas, configurar el precio del boleto, y sorteo con lista de condiciones previas y confirmación. |

Además:

- Detecta la cuenta y la red, y ofrece cambiar a Sepolia.
- Muestra el estado de cada transacción (pendiente, confirmada o fallida) con enlace a Etherscan.
- Lee el símbolo del token y los límites desde el contrato, así que no quedan textos desactualizados si cambian.
- Al ejecutarse el sorteo muestra el resultado en un diálogo.

## Estructura

```
KryptoLoto-Blockchain/
├── contracts/
│   └── KryptoLoto.sol        # LoteriaToken, BoletoNFT y Loteria
├── frontend/                 # Vite + ethers.js
│   ├── index.html            # estructura de la app y sus vistas
│   └── src/
│       ├── main.js           # arranque
│       ├── contracts.js      # direcciones, ABI y eventos
│       ├── mejora.js         # función propia consultada desde la vista Ronda
│       ├── store.js          # estado compartido
│       ├── chain.js          # conexión, lecturas, transacciones y eventos
│       ├── format.js         # formatos y mensajes de error legibles
│       ├── toast.js          # avisos de transacción
│       ├── modal.js          # diálogo de confirmación
│       ├── ui.js             # contadores animados
│       ├── views/            # una vista por archivo (jugar, cartera, ronda, admin, ganador, shell)
│       └── styles/           # estilos por vista y tokens de diseño
└── docs/
    └── mejoras.md            # descripción de las mejoras funcionales
```

## Ejecución

### 1. Desplegar los contratos en Sepolia (Remix)

1. Abrir [Remix](https://remix.ethereum.org), crear `KryptoLoto.sol` con el contenido de `contracts/KryptoLoto.sol` y compilar.
2. En **Deploy & Run**, elegir **Browser Extension → MetaMask** con la red Sepolia (chainId `11155111`) y fondos de prueba.
3. Desplegar en este orden: `LoteriaToken`, `BoletoNFT` y `Loteria` (pasando en el constructor la dirección del token y la del NFT, en ese orden).
4. Desde la cuenta que desplegó `BoletoNFT`, llamar `transferOwnership(direccionLoteria)` y comprobar que `owner()` devuelve la dirección de `Loteria`.
5. Copiar las tres **direcciones de contrato** (no los hashes de transacción).

### 2. Ejecutar el frontend

Requisitos: Node.js 20.19+ o 22.12+, npm, Chrome y MetaMask en Sepolia.

```bash
cd frontend
npm install
```

Editar `frontend/src/contracts.js` y reemplazar `token`, `nft` y `loteria` en `DIRECCIONES` por las direcciones del despliegue. Luego:

```bash
npm run dev
```

Abrir exactamente <http://localhost:5173/> (no `127.0.0.1`, porque MetaMask autoriza cada origen por separado).

Si se cambia el nombre, los parámetros o el retorno de alguna función que usa la interfaz, hay que actualizar también su firma en las listas ABI de `contracts.js`.

### 3. Probar el flujo

Conectar MetaMask → comprar KLT → autorizar → comprar boletos → consultar las mejoras en la vista Ronda → (administrador) sortear desde la vista Admin. **El sorteo es irreversible y la lotería tiene una sola ronda**, por lo que conviene dejarlo para el final de las pruebas.

## Seguridad y alcance

- Proyecto exclusivamente académico: no representa una lotería real ni un sistema listo para producción.
- El ETH de Sepolia no tiene valor económico real. **No desplegar en Mainnet.**
- **La aleatoriedad es insegura:** el ganador se elige con datos del bloque (`block.prevrandao`, `block.timestamp`), que pueden ser influidos por quien ejecuta el sorteo. No es apta para una lotería con valor real.
- No compartir ni subir al repositorio claves privadas, frases semilla ni archivos `.env`. MetaMask firma cada transacción; la aplicación nunca maneja claves.
