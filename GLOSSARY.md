# Glosario Canónico de Dominio Gastronómico — RESTOia / KOBE

Este documento establece el vocabulario ubicuo y formal del motor transaccional. Cualquier código, ruta, componente o test debe ceñirse rigurosamente a estos términos.

---

### 1. Núcleo Financiero y Monetario
- **`Money` (Dinero)**: Representación de valor monetario en número entero de centavos (`bigint`). Se prohíbe taxativamente el uso de punto flotante (`number` decimal) en cálculos acumulativos, asientos y totales de comandas.
  - *Moneda de referencia*: Centavos de Peso Argentino (ARS Cents).
- **`Asiento de Partida Doble` (Double-entry Journal)**: Transacción contable inmutable donde la suma exacta de Débitos equivale a la suma exacta de Créditos (`Σ Débitos = Σ Créditos`).
- **`Arqueo de Turno` (Cash Reconciliation)**:
  - **`Arqueo Ciego` (Blind Count)**: Declaración de billetes y monedas físicas por parte del cajero sin conocer de antemano el saldo teórico esperado del sistema.
  - **`Cierre Z`**: Reporte fiscal y contable irreversible de fin de jornada que bloquea el período transaccional.
  - **`Cierre X`**: Arqueo informativo de auditoría intermedia durante el turno sin resetear contadores.

### 2. Ciclo de Vida de Comandas (Order Lifecycle)
- **`Comanda / Order`**: Solicitud transaccional de platos y bebidas vinculada a una mesa o mostrador.
- **`Transición de Estados` (State Transitions)**:
  1. `DRAFT`: Comanda en edición en la bandeja del mozo.
  2. `PLACED`: Comanda ingresada con ID idempotente (`clientOrderId`), enviada al KDS.
  3. `IN_PREPARATION`: Comanda recibida y en fuego por la partida de cocina o barra.
  4. `READY`: Platos listos en el pase para ser retirados por el mozo.
  5. `SERVED`: Comanda en mesa disfrutada por comensales.
  6. `BILLED`: Cuenta pedida / precuenta emitida con boleta térmica o QR.
  7. `PAID`: Cobro procesado (efectivo, digital o mixto) con factura fiscal ARCA (A/B/C) y CAE.
  8. `VOIDED`: Anulación autorizada por supervisor mediante PIN con asiento de reversión.

### 3. Cocina & Producción
- **`KDS` (Kitchen Display System)**: Pantalla interactiva por estación de cocina (Calientes, Fríos, Fuegos/Josper, Barra/Tragos).
- **`FEFO` (First Expired, First Out)**: Algoritmo de asignación automática de lotes de inventario que descarga primero el lote cuya fecha de caducidad sea más próxima, reduciendo desperdicios y mermas.
- **`Escandallo / Receta`**: Lista de insumos en unidades exactas (gramos, mililitros, unidades) consumidos al despachar un plato.

### 4. Fiscalidad & Normativa Argentina
- **`ARCA / AFIP`**: Ente tributario oficial.
- **`CAE` (Código de Autorización Electrónico)**: Identificador único criptográfico provisto por ARCA que legaliza la factura electrónica.
- **`Factura A`**: Emitida a Responsable Inscripto con discriminación explícita de IVA (21% / 10.5%).
- **`Factura B / C`**: Emitida a Consumidor Final o Sujeto Exento.

### 5. Criptografía & Seguridad
- **`Audit Hash Chain` (Cadena de Bloques de Auditoría)**: Registro inmutable secuencial donde cada evento (`order.placed`, `cash.closed`, `stock.adjusted`) calcula su hash SHA-256 combinando el hash del bloque previo (`previousHash`), datos canónicos y timestamp.
- **`RBAC` (Role-Based Access Control)**: Niveles de autorización jerárquicos: `WAITER` (Nivel 1), `CASHIER` (Nivel 2), `MANAGER` (Nivel 3), `OWNER` (Nivel 4).
