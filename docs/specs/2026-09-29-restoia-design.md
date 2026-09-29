# Especificación Técnica de Arquitectura: RESTOia

**Fecha:** 2026-09-29  
**Proyecto:** RESTOia - Suite Integral de Gestión Gastronómica con Inteligencia Artificial

---

## 1. Visión General y Objetivos
**RESTOia** es una plataforma integral de gestión para restaurantes que unifica:
1. **Punto de Venta (POS) & Mozos**: Gestión de mesas en tiempo real, apertura/cierre de cuentas, toma de comandas rápida.
2. **KDS (Kitchen Display System / Pantalla de Cocina)**: Visualización en vivo de comandas, estados de preparación (Pendiente, En Preparación, Listo, Servido) y tiempos de despacho.
3. **Carta Digital & Menú Interactivo**: Menú con categorías, alérgenos, precios y fotos.
4. **Módulo de Reservas**: Calendario y asignación de mesas.
5. **Asistente de IA (RESTOia Copilot / Sommelier & Recomendador)**:
   - Recomendaciones personalizadas de maridaje y platos según gustos del comensal.
   - Detección de alérgenos y restricciones dietarias.
   - Análisis inteligente de ventas y sugerencias de optimización para el gerente.
6. **Panel de Administración & Analíticas**: Reportes de ventas, platos más vendidos, facturación y métricas del restaurante.

---

## 2. Arquitectura del Sistema

```
                 +-----------------------------------------------+
                 |              CLIENTES FRONTEND                |
                 |  - POS / Mozos                                |
                 |  - KDS (Cocina en vivo)                       |
                 |  - Carta Digital Cliente                      |
                 |  - Dashboard Gerencial & Reportes             |
                 |  - Asistente IA (Chatbot / Sommelier / Tips)  |
                 +-----------------------+-----------------------+
                                         | HTTP / REST / SSE / WebSockets
                                         v
                 +-----------------------------------------------+
                 |               BACKEND API SERVER              |
                 |            (Node.js / Express / Fastify)      |
                 |                                               |
                 |  - Mesas & Reservas Controller                |
                 |  - Comandas & Pedidos Controller (KDS)        |
                 |  - Menú & Categorías Controller               |
                 |  - IA Engine (Recomendador / Sugerencias)     |
                 |  - Analíticas y Facturación                   |
                 +-----------------------+-----------------------+
                                         |
                        +----------------+----------------+
                        |                                 |
                        v                                 v
         +-----------------------------+   +-----------------------------+
         |      BASE DE DATOS          |   |       IA ENGINE             |
         |  (SQLite / Local DB embebida|   |  (Gemini / OpenAI API SDK   |
         |   con persistencia JSON/SQL)|   |   con fallback heurístico)  |
         +-----------------------------+   +-----------------------------+
```

---

## 3. Módulos y Entidades de Datos

### 3.1. Mesas (`Table`)
- `id`, `number`, `capacity`, `location` (Salón, Terraza, Barra), `status` (`libre`, `ocupada`, `reservada`, `cuenta_pedida`).

### 3.2. Menú (`MenuItem`)
- `id`, `name`, `description`, `price`, `category` (Entradas, Principales, Postres, Bebidas, Vinos), `image`, `allergens`, `available`.

### 3.3. Comandas / Pedidos (`Order`)
- `id`, `tableId`, `items`: `[{ menuItemId, quantity, notes, status }]`, `total`, `status` (`pendiente`, `en_cocina`, `listo`, `entregado`, `cobrado`), `createdAt`, `updatedAt`.

### 3.4. Reservas (`Reservation`)
- `id`, `customerName`, `customerPhone`, `date`, `time`, `guestsCount`, `tableId`, `status`.

### 3.5. Módulo de IA (`AIAssistant`)
- Consultas de clientes: preguntas sobre menú, maridajes, celíacos/veganos.
- Soporte para dueños: sugerencias de menú del día, análisis de rentabilidad y alertas de platos lentos.

---

## 4. Plan de Implementación
1. **Backend Core**: Configurar servidor Express con rutas completas (`/api/tables`, `/api/menu`, `/api/orders`, `/api/reservations`, `/api/ai`, `/api/analytics`).
2. **Base de Datos & Semillas**: Mock inicial rico en datos (menú gourmet completo, mesas distribuidas, comandas activas).
3. **Frontend Premium**: Interfaz moderna, reactiva, elegante (estilo dark glassmorphism / bistró moderno) con tabs para:
   - Salón de Mesas (POS visual interactivo).
   - Cocina en Vivo (KDS interactivo con drag-and-drop / cambio de estados).
   - Carta Digital & Toma de Pedidos.
   - Reservas.
   - Chatbot IA Gastronómico (Sommelier & Soporte).
   - Analíticas & Reportes del Restaurante.
4. **Pruebas y Verificación**: Comprobar endpoints, flujo completo de pedido -> cocina -> cobro, y respuestas del asistente IA.
