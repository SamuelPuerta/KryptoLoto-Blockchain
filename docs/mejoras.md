# Mejoras funcionales de KryptoLoto

Este documento describe las mejoras funcionales implementadas sobre la base entregada en clase (`LoteriaToken`, `BoletoNFT` y `Loteria`). Todas viven en `contracts/KryptoLoto.sol` y cambian el comportamiento o el estado del contrato.

## Mejora 1: pausar y reanudar las ventas

**Qué hace:** el administrador (owner de `Loteria`) puede detener y reanudar la venta de boletos. Mientras las ventas están pausadas, `comprarBoletos` revierte.

**Implementación**

- `Loteria` hereda de `Pausable` de OpenZeppelin (implementación estándar, sin modificar su código).
- `pausar()` y `reanudar()` están restringidas con `onlyOwner` y llaman a `_pause()` y `_unpause()`.
- `comprarBoletos` lleva el modificador `whenNotPaused`. Cuando está pausada revierte con el error personalizado `EnforcedPause()`.
- `paused()` es el getter público del estado.

**Decisiones de diseño**

- Solo se pausa la compra de boletos. La compra de tokens (`comprarTokens`) no se afecta.
- El sorteo sigue permitido en pausa, para que el administrador pueda cerrar la ronda.

**Cómo verificarla**

1. Con una cuenta distinta al owner, llamar `pausar()`: debe revertir.
2. Con el owner, llamar `pausar()` y comprobar que `paused()` devuelve `true`.
3. Intentar `comprarBoletos` con cualquier cuenta: debe revertir.
4. Con el owner, llamar `reanudar()` y comprar de nuevo: la compra debe funcionar.

## Mejora 2: límite acumulado de boletos por participante

**Qué hace:** una misma dirección no puede superar `MAX_BOLETOS_POR_USUARIO` (20) boletos en total, sumando todas sus compras. Esto es adicional al límite por compra (`MAX_BOLETOS_POR_COMPRA`, 4).

**Implementación**

- `boletosComprados` es un `mapping(address => uint256)` que acumula los boletos comprados por cada dirección.
- `comprarBoletos` valida `boletosComprados[msg.sender] + cantidad <= MAX_BOLETOS_POR_USUARIO` antes de cobrar y revierte con "Limite acumulado por participante superado".
- `boletosRestantes(address)` es una función de lectura que devuelve cuántos boletos más puede comprar una dirección (0 si ya llegó al límite).

**Decisión de diseño:** el límite cuenta los boletos **comprados** por la dirección, no los NFT que tenga en su wallet, porque los NFT se pueden transferir.

**Cómo verificarla**

1. Con una cuenta, comprar boletos en varias compras hasta acumular 19.
2. `boletosRestantes(cuenta)` debe devolver 1.
3. Intentar comprar 2 boletos: debe revertir.
4. Comprar 1 boleto: debe funcionar y `boletosRestantes(cuenta)` pasa a 0.
5. Cualquier compra adicional de esa cuenta debe revertir.

## Mejora 3: compradores únicos

**Qué hace:** registra cuántas direcciones distintas han comprado al menos un boleto.

**Implementación**

- `yaParticipo` es un `mapping(address => bool)` que marca a las direcciones que ya compraron.
- `totalParticipantes` es un contador que aumenta solo la primera vez que una dirección compra.

**Cómo verificarla**

1. Antes de cualquier compra, `totalParticipantes()` devuelve 0.
2. Tras la primera compra de una cuenta, devuelve 1; si la misma cuenta vuelve a comprar, sigue en 1.
3. Cuando una segunda cuenta compra, pasa a 2.

## Mejora 4: precio de boleto configurable

**Qué hace:** permite al administrador modificar el precio de cada boleto (en tokens KLT) mientras la ronda siga abierta. El precio inicial sigue siendo `25` KLT.

**Implementación**

- `precioBoletoTokens` pasa de constante a variable de estado inicializada en `25`, manteniendo `PRECIO_BOLETO_TOKENS()` como alias de lectura compatible.
- `cambiarPrecioBoleto(uint256 nuevoPrecioTokens)` está restringida con `onlyOwner`, valida que el sorteo no se haya realizado, que el valor sea mayor que cero y que sea distinto al precio actual, y emite `PrecioBoletoActualizado(precioAnterior, nuevoPrecioTokens)`.
- `precioBoletoEnUnidades()` y `comprarBoletos` usan `precioBoletoTokens` dinámicamente, y `premioAcumulado` suma el `costoTotal` real pagado en cada compra.

**Cómo verificarla**

1. Con una cuenta distinta al owner, llamar `cambiarPrecioBoleto(50)`: debe revertir.
2. Con el owner, llamar `cambiarPrecioBoleto(0)` o con el mismo valor actual: debe revertir.
3. Con el owner, llamar `cambiarPrecioBoleto(50)`: debe emitir `PrecioBoletoActualizado(25, 50)` y `precioBoletoEnUnidades()` debe reflejar 50 KLT.
4. Comprar boletos después del cambio: debe cobrar 50 KLT por boleto y sumarlos a `premioAcumulado`.

## Interfaz

El frontend muestra estas mejoras en sus vistas:

- **Jugar:** el estado de la ronda («Ronda abierta» o «Ventas pausadas»), el número de compradores únicos, el precio por boleto leído del contrato y el aviso que bloquea la compra de boletos cuando las ventas están pausadas o la cuenta llegó a su límite.
- **Boletos:** un anillo con el cupo de la cuenta conectada (boletos restantes de los 20 permitidos), que baja al comprar.
- **Ronda:** las reglas leídas del contrato, el estado de las ventas, la actividad reciente (incluidas las pausas, reanudaciones y cambios de precio) y el panel «Verificación en vivo», que consulta `boletosRestantes` directamente desde el contrato desplegado.
- **Admin** (solo para el administrador): los botones de pausar y reanudar las ventas, y el panel «Precio del boleto» para actualizar el valor en KLT.
