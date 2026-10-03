# ADR 0003: Costura Profunda (Deep Module) OrderRepository con Drizzle ORM y Audit Ledger Atómico

- **Estado**: Aceptado
- **Fecha**: 2026-10-03
- **Contexto**: KOBE / RESTOia Suite Gastronómica
- **Decisores**: Arquitectura KOBE & Real Engineering Skills

## Contexto y Declaración del Problema

Históricamente, los endpoints de la API de Express en `server/routes/` leían y escribían síncronamente sobre `server/data.json` utilizando `fs.writeFileSync`.
A pesar de contar con un esquema relacional avanzado de Drizzle ORM en `packages/db` con tipado estricto `BigInt` para `Money` y aislamiento multi-inquilino (RLS), la API en tiempo de ejecución continuaba acoplada al archivo JSON estático. Esto provocaba:
1. **Fricción de concurrencia**: Si dos mozos envían comandas en simultáneo, una sobreescribe a la otra.
2. **Fuga de costura (Seam Leak)**: Los modelos de dominio y las tablas SQL no estaban conectadas al servidor principal.
3. **Falta de atomicidad en auditoría**: La cadena de bloques criptográfica (`audit_ledger`) no aseguraba commit transaccional atómico conjunto a la comanda.

## Decisión de Arquitectura

1. **Costura Profunda (`OrderRepository`)**: Se define una clase/módulo profundo en `packages/db` que encapsula:
   - Inserción y consulta atómica de `orders` y `order_items`.
   - Transacción ACID compartida con `audit_ledger` (cálculo e inserción de bloque SHA-256).
   - Conversión determinista de `Money` (`BigInt` cents) y serialización segura.
   - Manejo de multi-tenancy transparente (`organizationId`, `locationId`).
2. **Motor Dual Resiliente**:
   - Si `process.env.DATABASE_URL` está definido, se conecta al PostgreSQL físico (Supabase, Neon, etc.).
   - Si no está definido, inicializa un motor en memoria relacional `pg-mem` con soporte de UUIDv4, garantizando ejecución local con cero dependencias externas.
3. **Migración Transparente**: Al arrancar Express, `server/db.js` utiliza el repositorio de base de datos como fuente de verdad única, dejando `server/data.json` como snapshot legacy.

## Consecuencias

- **Positivas**:
  - Concurrencia transaccional segura y atómica.
  - TDD estricto en la costura pública `OrderRepository`.
  - Imposibilidad de crear o actualizar comandas sin generar el bloque correspondiente en la cadena de auditoría inmutable.
- **Desafíos**:
  - Mapear las respuestas del repositorio al formato consumido por el frontend sin romper contratos existentes.
