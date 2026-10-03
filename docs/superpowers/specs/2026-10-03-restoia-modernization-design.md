# Especificación Técnica de Diseño: Modernización RESTOia / KOBE

**Fecha**: 2026-10-03  
**Arquitectura**: Deep Modules (Matt Pocock Design System) + Observabilidad para IA (MCP, Structured Logs, VS Code Debugger)  
**Alcance**: Monorepo TypeScript, Vercel Serverless, Panel de Control Resto IA, Observabilidad y Módulo de Integración MCP

---

## 1. Resumen Ejecutivo y Filosofía de Diseño

El proyecto **RESTOia / KOBE** cuenta con un núcleo de dominio robusto en `@kobe/domain` y `@kobe/db` (75 tests pasando en Vitest con precisión monetaria `BigInt`, FEFO e inmutabilidad criptográfica).

Siguiendo la directriz de **no sobrecargar la aplicación con dependencias innecesarias**, se adopta un esquema limpio y de alto apalancamiento (*high leverage*):
- **VS Code**: Debugger nativo con `.vscode/launch.json` para ejecución paso a paso e inspección por agentes de IA.
- **Proyecto**: Logging estructurado por etiquetas (`[API]`, `[DATABASE]`, `[FISCAL]`, `[PAYMENT]`, `[AI]`, `[ERROR]`) y manejo consistente de errores con contexto.
- **Producción / Vercel**: Despliegue serverless limpio, tolerante a fallos y sin dependencias pesadas en el bundle del cliente.
- **Agentes e IA**: Servidor MCP (`restoia-mcp`) que expone herramientas canónicas para consultar código, métricas, base de datos, datasets para Pandas y facturación electrónica.

---

## 2. Descomposición en Fases / Sub-proyectos

### Sub-proyecto 1: Calidad de Código, Compilación Monorepo y Despliegue en Vercel
1. **Linter & HTML**:
   - `docs/architecture-review.html`: Corregir `<!doctype html>` a `<!DOCTYPE html>`.
   - Reemplazar `<meta ... />` por `<meta ...>` estándar HTML5.
   - Escapar entidades `&` como `&amp;`.
   - Reducir `<title>` a menos de 70 caracteres.
   - Limpiar espacios en blanco al final de línea (*trailing whitespace*).
2. **TypeScript Deep Modules (Project References)**:
   - Crear `tsconfig.json` raíz con configuración de referencias compuestas:
     ```json
     {
       "files": [],
       "references": [
         { "path": "./packages/domain" },
         { "path": "./packages/db" }
       ]
     }
     ```
   - Añadir `"composite": true` en `packages/domain/tsconfig.json` y `packages/db/tsconfig.json`.
   - Agregar `"build": "npm run build -w @kobe/domain && npm run build -w @kobe/db"` en `package.json` raíz.
3. **Configuración de Debugger `.vscode/launch.json`**:
   - Configuración para iniciar y depurar el servidor Express (`node server/index.js`).
   - Configuración para depurar pruebas con Vitest.
4. **Vercel Serverless Architecture**:
   - Crear `api/index.js` como puente Serverless Function hacia `server/index.js`.
   - Crear `vercel.json` con rewrites para estáticos desde `public/` y `/api/(.*)` hacia `api/index.js`.
   - Modificar `server/index.js` para que solo haga `app.listen()` si `process.env.VERCEL !== '1'`.
   - Asegurar que `server/db.js` tenga persistencia en memoria resiliente cuando el filesystem sea de solo lectura en Vercel.

### Sub-proyecto 2: Front-end, Panel de Control Resto IA y Logging Estructurado
1. **Módulo de Logging Estructurado (`server/logger.js`)**:
   - Implementar un logger liviano y consistente: `logger.info('[API]', 'Solicitud recibida', { path, method })`.
   - Etiquetas canónicas: `[AUTH]`, `[DATABASE]`, `[API]`, `[PAYMENT]`, `[FISCAL]`, `[PRINT]`, `[AI]`, `[ERROR]`.
2. **Panel de Control Resto IA & Experiencia de Salón**:
   - Pulir la interfaz web en `public/index.html` y `public/styles.css` con estética moderna (modo oscuro premium, tonos ámbar/esmeralda y tipografías Outfit / Syne).
   - Visualización clara y reactiva del **Copilot IA Gastronómico** y el **KOBE Engine & Audit**:
     - KPIs en vivo: Total facturado del día en pesos legibles, ocupación de mesas, tickets en KDS y arqueo de caja ciega.
     - Monitor criptográfico de la cadena SHA-256 (`previousHash` -> `hash`).
     - Alertas preventivas FEFO de stock y sugerencias inteligentes de cocina.

### Sub-proyecto 3: Módulo Profundo de Integración & Servidor MCP
1. **Servidor MCP RESTOia (`tools/mcp-server/index.js`)**:
   - Servidor MCP estándar (JSON-RPC) para agentes e IDEs:
     - `get_restaurant_kpis`: Métricas operativas, ventas y ocupación actual.
     - `export_dataset_for_pandas`: Genera datasets en formato JSON/CSV listos para análisis con Pandas / Jupyter.
     - `sync_external_mysql`: Prueba y sincronización transaccional con MySQL/MariaDB externa.
     - `emit_fiscal_invoice`: Emisión de Factura A o B legal con CAE conectada a `fiscalEngine`.
     - `get_system_logs`: Consulta de logs estructurados recientes con filtrado por etiqueta (`[ERROR]`, `[FISCAL]`, etc.).
2. **API REST de Integración (`server/routes/integrations.js`)**:
   - `GET /api/integrations/pandas/sales`: Dataset tabular de ventas.
   - `GET /api/integrations/pandas/inventory`: Matriz de rotación de stock.
   - `POST /api/integrations/fiscal/invoice`: Emisión y validación de comprobante fiscal.
   - `POST /api/integrations/mysql/sync`: Sincronización de asientos contables de partida doble.

---

## 3. Plan de Verificación y Criterios de Éxito

1. `npm run typecheck` retorna código 0.
2. `npm run build` compila los paquetes a `./dist/` sin advertencias.
3. `npx vitest run` pasa el 100% de los tests (75/75).
4. `docs/architecture-review.html` queda sin errores en los diagnósticos del IDE.
5. `.vscode/launch.json` configurado y funcional.
6. El servidor inicia con logs estructurados legibles tanto para humanos como para IA.
7. Vercel configurado con `vercel.json` y `api/index.js`.
