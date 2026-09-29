# Plan de Implementación: RESTOia Suite Gastronómica

> **Objetivo:** Construir la plataforma completa RESTOia lista para funcionar, incluyendo Servidor Backend API REST, Motor de IA gastronómico, Base de Datos local persistente, y Frontend Web SPA ultra-premium con POS Mesas, KDS Cocina, Menú Interactivo, Reservas, Analíticas y Copiloto IA.

---

## Tareas

- [ ] **Fase 1: Estructura del Proyecto y Backend**
  - [ ] Inicializar `package.json` con dependencias clave: `express`, `cors`, `dotenv`.
  - [ ] Implementar capa de datos/almacenamiento (`server/db.js`) con semillas iniciales (mesas en salón/terraza/barra, menú gourmet variado con precios y alérgenos, reservas de prueba).
  - [ ] Implementar rutas de la API:
    - Mesas (`/api/tables`): listar, actualizar estado, asignar mozo.
    - Menú (`/api/menu`): listar por categoría, filtrar alérgenos, actualizar disponibilidad.
    - Comandas/Pedidos (`/api/orders`): crear comanda, cambiar estado (pendiente -> cocina -> listo -> servido -> pagado).
    - Reservas (`/api/reservations`): crear, listar, cancelar.
    - Analíticas (`/api/analytics`): ingresos diarios, platos estrella, tiempos medios.
    - Asistente IA (`/api/ai/chat`): motor con respuestas inteligentes para sugerencias, maridaje de vinos, restricciones alimentarias y asistente de negocio.

- [ ] **Fase 2: Frontend Web Ultra-Premium (Vanilla JS / CSS Moderno con Glassmorphism)**
  - [ ] Crear estructura `public/index.html` con navegación por pestañas:
    - 🗺️ **Salón / Mesas (POS)**
    - 👨‍🍳 **Cocina KDS en Tiempo Real**
    - 📋 **Carta & Tomar Pedido**
    - 📅 **Reservas**
    - 🤖 **Copilot IA (Sommelier & Gerente)**
    - 📊 **Métricas & Ventas**
  - [ ] Crear `public/styles.css` con diseño moderno oscuro/dorado bistró, microanimaciones, badges de estado y diseño 100% responsivo.
  - [ ] Implementar `public/app.js` con lógica reactiva conectada al backend REST:
    - Visualizador de mesas interactivo con cambio de estado y apertura de comanda.
    - Tablero Kanban KDS de cocina en tiempo real con botones de acción rápida.
    - Catálogo de platos con filtro por categoría y carrito de comanda en vivo.
    - Formulario interactivo de reservas.
    - Chat de IA interactivo con prompts rápidos ("Sugerir maridaje", "¿Opciones sin TACC?", "Analizar rentabilidad").
    - Gráficos y tarjetas de analíticas en tiempo real.

- [ ] **Fase 3: Verificación y Pruebas**
  - [ ] Iniciar el servidor y verificar todos los endpoints REST.
  - [ ] Probar el flujo integral: abrir mesa -> agregar platos -> mandar a cocina -> KDS cocina -> despachar -> cobrar -> reflejo en analíticas.
  - [ ] Validar funcionamiento del Copilot IA y persistencia de datos.
