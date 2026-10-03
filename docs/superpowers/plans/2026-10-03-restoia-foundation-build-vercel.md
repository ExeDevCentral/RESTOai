# Sub-proyecto 1: Compilación, Linter, Debugger y Vercel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el monorepo RESTOia / KOBE con 0 errores de compilación TypeScript (`tsc -b`), linter HTML impecable en `architecture-review.html`, configuración de depuración nativa en `.vscode/launch.json` y arquitectura serverless preparada para Vercel.

**Architecture:** Monorepo TypeScript coordinado mediante Project References compuestas (`composite: true`), desacoplando la ejecución local con Express de la ejecución serverless en Vercel mediante un adaptador `api/index.js` y `vercel.json`, garantizando persistencia en memoria resiliente cuando el filesystem es efímero.

**Tech Stack:** TypeScript 5.7, Node.js (ESM), Express 5, Vitest 3, Vercel Serverless Functions.

**Spec:** [docs/superpowers/specs/2026-10-03-restoia-modernization-design.md](file:///c:/Users/exeme/Desktop/RESTOia/docs/superpowers/specs/2026-10-03-restoia-modernization-design.md)

## Global Constraints

- Cero coma flotante para dinero: `Money = bigint` en centavos (ARS Cents).
- Todas las pruebas deben pasar en verde (`npx vitest run`).
- `npm run typecheck` (`tsc -b`) debe devolver código de salida `0`.
- El linter HTML de `docs/architecture-review.html` no debe mostrar errores.
- Los estáticos deben servirse sin empaquetadores pesados ni dependencias externas de runtime.

## Review Focus

1. `npm run typecheck` falla si falta algún tipo referenciado o `composite` no está en todos los paquetes.
2. `api/index.js` en Vercel falla si `app.listen()` bloquea el ciclo de vida del handler serverless.
3. `server/db.js` arroja `EROFS` (Read-only file system) en Vercel si intenta hacer `fs.writeFileSync` incondicional en disco.
4. Las rutas `/api/*` deben mapearse transparentemente en local y en Vercel.
5. Los 75 tests unitarios existentes en `packages/domain`, `packages/db` y `server` deben mantenerse 100% pasando sin regresiones.

---

### Task 1: Corrección de Marcado y Linter en `docs/architecture-review.html`

**Files:**
- Modify: `docs/architecture-review.html:1-214`

**Interfaces:**
- Consumes: Reglas de validación HTML5 y UTF-8.
- Produces: Documento HTML estricto sin errores de linter.

- [ ] **Step 1: Aplicar correcciones de marcado HTML5**
  - Cambiar línea 1: `<!doctype html>` -> `<!DOCTYPE html>`.
  - Cambiar líneas 4 y 5: reemplazar `<meta ... />` por `<meta ...>`.
  - Cambiar línea 6: acortar título a `<= 70` caracteres y reemplazar `&` por `&amp;`: `<title>KOBE / RESTOia — Auditoría Técnica y Oportunidades</title>`.
  - Reemplazar cualquier `&` aislado por `&amp;` (líneas 27, 58, 176).
  - Eliminar espacios en blanco al final de línea (*trailing whitespace*).

- [ ] **Step 2: Verificar diagnósticos del archivo**
  - Comprobar que no haya errores de marcado en `docs/architecture-review.html`.

- [ ] **Step 3: Commit**
  ```bash
  git add docs/architecture-review.html
  git commit -m "fix(docs): resolve html5 syntax and lint issues in architecture review"
  ```

---

### Task 2: Configuración de Compilación TypeScript Monorepo (`tsconfig.json`, `composite` y `build`)

**Files:**
- Create: `tsconfig.json`
- Modify: `packages/domain/tsconfig.json`
- Modify: `packages/db/tsconfig.json`
- Modify: `package.json:11-18`

**Interfaces:**
- Consumes: `packages/domain` y `packages/db`.
- Produces: Declaraciones tipadas (`.d.ts`), mapas de fuente y compilación limpia con `tsc -b`.

- [ ] **Step 1: Crear `tsconfig.json` raíz**
  Crear archivo con contenido:
  ```json
  {
    "files": [],
    "references": [
      { "path": "./packages/domain" },
      { "path": "./packages/db" }
    ]
  }
  ```

- [ ] **Step 2: Configurar `composite: true` en paquetes**
  En `packages/domain/tsconfig.json` y `packages/db/tsconfig.json`:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "composite": true,
      "rootDir": "./src",
      "outDir": "./dist"
    },
    "include": ["src/**/*"]
  }
  ```

- [ ] **Step 3: Agregar script `"build"` en `package.json` raíz**
  En `package.json`:
  ```json
  "build": "npm run build -w @kobe/domain && npm run build -w @kobe/db"
  ```

- [ ] **Step 4: Probar compilación y typecheck**
  - Run: `npm run typecheck`
  - Expected: Salida limpia sin errores (Exit Code 0).
  - Run: `npm run build`
  - Expected: Paquetes compilados en `./dist` sin errores.
  - Run: `npx vitest run`
  - Expected: 75 tests pasando (Exit Code 0).

- [ ] **Step 5: Commit**
  ```bash
  git add tsconfig.json packages/domain/tsconfig.json packages/db/tsconfig.json package.json
  git commit -m "chore(build): configure typescript project references and root build script"
  ```

---

### Task 3: Configuración de Depurador VS Code (`.vscode/launch.json`)

**Files:**
- Create: `.vscode/launch.json`

**Interfaces:**
- Consumes: Node.js runtime, Vitest CLI.
- Produces: Perfiles de depuración nativa para desarrolladores y asistentes IA.

- [ ] **Step 1: Crear `.vscode/launch.json`**
  ```json
  {
    "version": "0.2.0",
    "configurations": [
      {
        "name": "Debug RESTOia Server",
        "type": "node",
        "request": "launch",
        "program": "${workspaceFolder}/server/index.js",
        "skipFiles": ["<node_internals>/**"],
        "console": "integratedTerminal",
        "env": {
          "PORT": "3000",
          "NODE_ENV": "development"
        }
      },
      {
        "name": "Debug Vitest (Current File)",
        "type": "node",
        "request": "launch",
        "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
        "args": ["run", "${file}"],
        "skipFiles": ["<node_internals>/**"],
        "console": "integratedTerminal"
      },
      {
        "name": "Debug Vitest (Full Suite)",
        "type": "node",
        "request": "launch",
        "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
        "args": ["run"],
        "skipFiles": ["<node_internals>/**"],
        "console": "integratedTerminal"
      }
    ]
  }
  ```

- [ ] **Step 2: Validar sintaxis JSON de `launch.json`**
  - Verificar que el archivo es parseable sin errores sintácticos.

- [ ] **Step 3: Commit**
  ```bash
  git add .vscode/launch.json
  git commit -m "chore(dx): add vscode native launch configurations for node and vitest"
  ```

---

### Task 4: Arquitectura Serverless y Resiliencia para Vercel

**Files:**
- Create: `api/index.js`
- Create: `vercel.json`
- Modify: `server/index.js`
- Modify: `server/db.js`
- Test: `server/vercelHandler.test.js`

**Interfaces:**
- Consumes: `server/index.js` Express application.
- Produces: Handler HTTP compatible con Vercel Serverless y entrega estática de `public/`.

- [ ] **Step 1: Escribir test de handler serverless**
  Crear `server/vercelHandler.test.js` que verifique que el módulo exporta la aplicación Express y que las rutas base responden sin requerir `listen`.

- [ ] **Step 2: Ejecutar test para verificar estado inicial**
  - Run: `npx vitest run server/vercelHandler.test.js`

- [ ] **Step 3: Adaptar `server/index.js` para Vercel**
  Condicionar `app.listen`:
  ```javascript
  if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 RESTOia Suite Server ejecutándose en puerto ${PORT}`);
    });
  }
  export default app;
  ```

- [ ] **Step 4: Adaptar `server/db.js` para resiliencia en sistemas de solo lectura**
  Proteger `saveData` con fallback si el disco es read-only:
  ```javascript
  function saveData(data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      // En Vercel Serverless el FS es de solo lectura; mantenemos en memoria sin abortar
      console.warn('[DATABASE] Almacenamiento en disco no disponible (modo Serverless/Read-only):', err.message);
    }
  }
  ```

- [ ] **Step 5: Crear adaptador `api/index.js`**
  ```javascript
  import app from '../server/index.js';

  export default function handler(req, res) {
    return app(req, res);
  }
  ```

- [ ] **Step 6: Crear `vercel.json`**
  ```json
  {
    "version": 2,
    "buildCommand": "npm run build",
    "rewrites": [
      {
        "source": "/api/(.*)",
        "destination": "/api/index.js"
      },
      {
        "source": "/(.*)",
        "destination": "/public/$1"
      }
    ]
  }
  ```

- [ ] **Step 7: Ejecutar tests y verificar suite completa**
  - Run: `npx vitest run`
  - Expected: Todos los tests pasando (100%).
  - Run: `npm run typecheck`
  - Expected: 0 errores.

- [ ] **Step 8: Commit**
  ```bash
  git add api/index.js vercel.json server/index.js server/db.js server/vercelHandler.test.js
  git commit -m "feat(deploy): configure vercel serverless handler and resilient storage"
  ```
