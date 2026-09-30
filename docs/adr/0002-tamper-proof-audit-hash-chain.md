# ADR 0002: Pista de Auditoría Inmutable con Cadena de Hash SHA-256

- **Estado**: Aceptado
- **Fecha**: 2026-09-30
- **Contexto**: KOBE / RESTOia Suite Gastronómica
- **Decisores**: Arquitectura KOBE

## Contexto y Declaración del Problema

En la industria gastronómica, el fraude interno (eliminación silenciosa de comandas cobradas en efectivo, descuentos retroactivos ficticios y manipulación de inventarios) es uno de los mayores drenajes de rentabilidad. Las bases de datos tradicionales con sentencias `UPDATE` o `DELETE` permiten que un usuario o administrador altere registros históricos sin dejar huella verificable.

## Decisión de Arquitectura

1. **Hash Chain Criptográfica Inmutable**: Se implementa un libro de auditoría (`AuditLedger`) donde cada evento se sella como un bloque secuencial inmutable.
2. **Encadenamiento SHA-256**: Cada bloque contiene `hash = SHA256(previousHash + eventType + payloadCanonicalJSON + timestamp + actorId)`.
3. **Verificación Automática**: Se incluye un método de validación matemática de la cadena punto a punto (`verifyIntegrity()`). Cualquier intento de modificar o eliminar un registro histórico rompe los hashes subsiguientes, activando una alerta visual en el panel KOBE Engine del frontend.

## Consecuencias

- **Positivas**:
  - Evidencia forense irrefutable ante inspecciones contables, fiscales o sospechas de fraude.
  - Trazabilidad total de cada anulación (`void`), descuento y cierre de caja Z.
- **Negativas / Desafíos**:
  - Mayor consumo de almacenamiento secuencial al no poder sobreescribir registros anteriores.
