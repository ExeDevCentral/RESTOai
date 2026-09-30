# ADR 0001: Representación de Dinero en Enteros BigInt (Zero Floats)

- **Estado**: Aceptado
- **Fecha**: 2026-09-30
- **Contexto**: KOBE / RESTOia Suite Gastronómica
- **Decisores**: Arquitectura KOBE

## Contexto y Declaración del Problema

Los sistemas de punto de venta gastronómicos tradicionales cometen el error crítico de almacenar precios, subtotales, IVA y comisiones en tipos de punto flotante de JavaScript (`number` con formato IEEE-754 de 64 bits). Esto genera desajustes de centavos al acumular ítems (`0.1 + 0.2 !== 0.3`), descuadres de arqueo de caja Z y rechazos en la validación fiscal de sumas de importes por parte de ARCA (AFIP).

## Decisión de Arquitectura

1. **Unidad Atómica en Centavos**: Se define el tipo `Money = bigint`. Todo valor monetario que entra o se procesa en el dominio transaccional representa centavos exactos (`$ 1.500,50` = `150050n`).
2. **Cero Floats en Modelos**: Ninguna entidad de dominio (`Order`, `OrderItem`, `CashSession`, `Invoice`) utiliza `number` con decimales para transacciones.
3. **Puntos de Conversión**: El punto flotante sólo se tolera como dato de entrada crudo en formularios de frontend, donde inmediatamente se pasa por `toCents(val)` y se renderiza con `formatCurrency(cents)`.

## Consecuencias

- **Positivas**:
  - Exactitud matemática determinista en balance contable y partida doble.
  - Cero discrepancias en liquidaciones de propinas, arqueos ciegos y cobros divididos (split).
  - Cumplimiento estricto con los tests de estrés financiero.
- **Negativas / Desafíos**:
  - Requiere serialización explícita a string o conversión en límites JSON (`JSON.stringify` nativo no serializa `bigint` directamente).
