// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// KryptoLoto: loteria academica con token ERC-20, boletos ERC-721 y sorteo.
// USO ACADEMICO: la seleccion del ganador NO es segura para dinero real.
import "@openzeppelin/contracts@5.7.0/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@5.7.0/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts@5.7.0/access/Ownable.sol";
import "@openzeppelin/contracts@5.7.0/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts@5.7.0/utils/Pausable.sol";

// -------------------------------------------------------------
// 1. LOTERIATOKEN: el ERC-20 (KLT) que los participantes compran con ETH
// -------------------------------------------------------------
contract LoteriaToken is ERC20 {
    uint256 public constant PRECIO_TOKEN = 0.0001 ether;
    uint256 public constant SUMINISTRO_INICIAL = 500_000;

    event TokensComprados(
        address indexed comprador,
        uint256 cantidadTokens,
        uint256 etherPagado
    );

    constructor() ERC20("KryptoLoto Token", "KLT") {
        // Cada KLT tiene 18 decimales, como el ERC-20 de OpenZeppelin.
        _mint(address(this), SUMINISTRO_INICIAL * 10 ** decimals());
    }

    function comprarTokens(uint256 cantidadTokens) external payable {
        require(cantidadTokens > 0, "La cantidad debe ser mayor que cero");

        uint256 costo = cantidadTokens * PRECIO_TOKEN;
        require(msg.value == costo, "Cantidad de ETH incorrecta");

        uint256 unidades = cantidadTokens * 10 ** decimals();
        require(
            balanceOf(address(this)) >= unidades,
            "Tokens insuficientes en el contrato"
        );

        _transfer(address(this), msg.sender, unidades);
        emit TokensComprados(msg.sender, cantidadTokens, msg.value);
    }

    function tokensDisponibles() external view returns (uint256) {
        return balanceOf(address(this)) / 10 ** decimals();
    }
}

// -------------------------------------------------------------
// 2. BOLETONFT: un ERC-721 por cada boleto comprado
// -------------------------------------------------------------
contract BoletoNFT is ERC721, Ownable {
    event BoletoCreado(
        address indexed comprador,
        uint256 indexed numeroBoleto
    );

    constructor()
        ERC721("KryptoLoto Ticket", "KLTK")
        Ownable(msg.sender)
    {}

    // Despues de transferOwnership(direccionLoteria), solo Loteria
    // puede ejecutar esta funcion gracias a onlyOwner.
    function crearBoleto(address comprador, uint256 numeroBoleto)
        external
        onlyOwner
    {
        _safeMint(comprador, numeroBoleto);
        emit BoletoCreado(comprador, numeroBoleto);
    }
}

// -------------------------------------------------------------
// 3. LOTERIA: compra de boletos, sorteo y pago del premio en KLT
// -------------------------------------------------------------
contract Loteria is Ownable, ReentrancyGuard, Pausable {
    LoteriaToken public token;
    BoletoNFT public boletoNFT;

    uint256 public constant PRECIO_BOLETO_TOKENS = 25;
    uint256 public constant MAX_BOLETOS_POR_COMPRA = 4;

    // MEJORA 2: limite acumulado de boletos por participante. Cuenta los
    // boletos COMPRADOS por la direccion (no los NFT que tenga en su wallet).
    uint256 public constant MAX_BOLETOS_POR_USUARIO = 20;
    mapping(address => uint256) public boletosComprados;

    // MEJORA 3: estadistica de compradores unicos (direcciones distintas
    // que han comprado al menos un boleto).
    uint256 public totalParticipantes;
    mapping(address => bool) public yaParticipo;

    uint256 public siguienteBoleto = 1;
    uint256 public premioAcumulado; // Unidades minimas del ERC-20 KLT.

    // Estado del sorteo: esta version tiene UNA sola ronda.
    bool public sorteoRealizado;
    uint256 public boletoGanador;
    address public ganador;
    uint256 public premioPagado; // Unidades minimas del ERC-20 KLT.

    struct Boleto {
        uint256 numero;
        address comprador; // Comprador original, aunque luego transfiera el NFT.
    }

    mapping(uint256 => Boleto) public boletos;
    mapping(address => uint256[]) private boletosPorUsuario;

    event BoletosComprados(
        address indexed comprador,
        uint256 cantidad,
        uint256 costoTotal
    );

    event GanadorSeleccionado(
        uint256 indexed numeroBoleto,
        address indexed receptorPremio,
        uint256 cantidadKLT
    );

    constructor(address direccionToken, address direccionNFT)
        Ownable(msg.sender)
    {
        require(direccionToken != address(0), "Direccion de token invalida");
        require(direccionNFT != address(0), "Direccion de NFT invalida");

        token = LoteriaToken(direccionToken);
        boletoNFT = BoletoNFT(direccionNFT);
    }

    // MEJORA 1: pausar y reanudar la venta de boletos (solo administrador).
    // Mientras este pausada, comprarBoletos revierte. El sorteo sigue
    // permitido para que el administrador pueda cerrar la ronda.
    function pausar() external onlyOwner {
        _pause();
    }

    function reanudar() external onlyOwner {
        _unpause();
    }

    function precioBoletoEnUnidades() public view returns (uint256) {
        return PRECIO_BOLETO_TOKENS * 10 ** token.decimals();
    }

    function totalBoletos() external view returns (uint256) {
        return siguienteBoleto - 1;
    }

    // Boletos que aun puede comprar una direccion antes de llegar al limite.
    function boletosRestantes(address usuario) external view returns (uint256) {
        uint256 usados = boletosComprados[usuario];
        return usados >= MAX_BOLETOS_POR_USUARIO ? 0 : MAX_BOLETOS_POR_USUARIO - usados;
    }

    function comprarBoletos(uint256 cantidad)
        external
        nonReentrant
        whenNotPaused
    {
        require(!sorteoRealizado, "La loteria ya fue sorteada");
        require(cantidad > 0, "Debe comprar al menos un boleto");
        require(
            cantidad <= MAX_BOLETOS_POR_COMPRA,
            "Supera el maximo de boletos por compra"
        );
        require(
            boletosComprados[msg.sender] + cantidad <= MAX_BOLETOS_POR_USUARIO,
            "Limite acumulado por participante superado"
        );
        require(
            boletoNFT.owner() == address(this),
            "Falta transferir la administracion del NFT a Loteria"
        );

        uint256 costoTotal = cantidad * precioBoletoEnUnidades();
        require(token.balanceOf(msg.sender) >= costoTotal, "Balance KLT insuficiente");
        require(
            token.allowance(msg.sender, address(this)) >= costoTotal,
            "Allowance insuficiente"
        );
        require(
            token.transferFrom(msg.sender, address(this), costoTotal),
            "No se pudieron transferir los KLT"
        );

        for (uint256 i = 0; i < cantidad; i++) {
            uint256 numero = siguienteBoleto;
            boletos[numero] = Boleto({numero: numero, comprador: msg.sender});
            boletosPorUsuario[msg.sender].push(numero);
            boletoNFT.crearBoleto(msg.sender, numero);
            siguienteBoleto++;
        }

        if (!yaParticipo[msg.sender]) {
            yaParticipo[msg.sender] = true;
            totalParticipantes++;
        }
        boletosComprados[msg.sender] += cantidad;
        premioAcumulado += costoTotal;
        emit BoletosComprados(msg.sender, cantidad, costoTotal);
    }

    function obtenerBoletos(address usuario)
        external
        view
        returns (uint256[] memory)
    {
        return boletosPorUsuario[usuario];
    }

    // SOLO ACADEMICO: block.prevrandao y block.timestamp NO son fuentes
    // seguras de aleatoriedad. Quien decide cuando ejecutar el sorteo
    // puede influir en el resultado. No usar para dinero real.
    function sortearGanador() external onlyOwner nonReentrant {
        require(!sorteoRealizado, "Sorteo ya realizado");

        uint256 cantidadBoletos = siguienteBoleto - 1;
        require(cantidadBoletos > 0, "No hay boletos vendidos");
        uint256 premio = premioAcumulado;
        require(premio > 0, "No existe premio acumulado");

        uint256 semilla = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    block.number,
                    address(this),
                    cantidadBoletos
                )
            )
        );

        uint256 numeroElegido = (semilla % cantidadBoletos) + 1;
        // Gana el poseedor ACTUAL del NFT, no necesariamente el comprador.
        address receptor = boletoNFT.ownerOf(numeroElegido);

        // Guardar el resultado ANTES de la transferencia (efectos-interacciones).
        sorteoRealizado = true;
        boletoGanador = numeroElegido;
        ganador = receptor;
        premioPagado = premio;
        premioAcumulado = 0;

        // Loteria paga con los KLT que recibio por los boletos.
        require(token.transfer(receptor, premio), "No se pudo pagar el premio");

        emit GanadorSeleccionado(numeroElegido, receptor, premio);
    }
}
