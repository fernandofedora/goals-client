# UI del Proyecto (goals-client)

Aplicación web construida con React + Vite y TailwindCSS. Consume el API en `goals-server` y ofrece Dashboard con filtros, gráficas y exportación.

## Requisitos
- Node.js 18 o 20
- npm o yarn

## Instalación
1. Entra a `goals-client/`.
2. Instala dependencias: `npm install` o `yarn install`.

## Configuración de entorno
La UI usa `VITE_API_URL` para apuntar al backend.

- Desarrollo: crea `goals-client/.env` (opcional) y/o usa el valor por defecto (`http://localhost:4000/api`).
- Producción: define `goals-client/.env.production`:

```
# Si UI y API comparten dominio, usa ruta relativa
VITE_API_URL=/api

# O usa una URL absoluta válida
# VITE_API_URL=https://tu-dominio.app/api
```

Notas importantes:
- El cliente normaliza `VITE_API_URL` (ver `src/api.js`) para evitar que el navegador construya rutas relativas incorrectas (p. ej. `https://ui-host/tu-api-host/api/...`).
- Si la UI se sirve bajo un subpath, considera configurar `base: './'` en `vite.config.js` para assets.

## Comandos
- `npm run dev` → Desarrollo con HMR en `http://localhost:5173/` (o puerto alternativo si 5173 está ocupado).
- `npm run build` → Genera artefactos de producción en `dist/`.
- `npm run preview` → Sirve `dist/` localmente.

## Autenticación
- Registro y login mediante JWT.
- El token se guarda en `localStorage` y se adjunta en cada request.

## Dashboard y funcionalidades
- Filtros: selector de período (`All Time` o mes específico) y selector de año.
- Gráfica “Income vs Expenses”:
  - Siempre muestra 12 meses (enero–diciembre) del `selectedYear`.
  - Si `period = all`: agrega los datos diarios del resumen filtrando por año.
  - Si `period` es un mes específico: carga los 12 resúmenes del año desde el backend para completar la gráfica.
- Exportación XLSX: botón “Export XLSX” que llama a `/api/stats/export` con el período actual.
- Budget vs Actual: muestra barra de progreso para el mes seleccionado si hay presupuesto.
- Categorías: desglose de gastos por categoría con colores.
- Métodos de pago: desglose cash vs tarjetas, y uso por tarjeta.

## Buenas prácticas y despliegue
- Usa Node 18+ (ideal 20) para build y runtime.
- Define `VITE_API_URL` de forma consistente con tu entorno:
  - Mismo dominio: `VITE_API_URL=/api` y configura el proxy/rewrite.
  - Dominio distinto: `VITE_API_URL=https://backend.ejemplo.com/api`.
- Si ves URLs “combinadas” en producción, revisa:
  - Valor de `VITE_API_URL` (que sea absoluta o `'/api'`).
  - Servidor que aloja la UI (si sirve bajo subpath, ajusta `base`).

## Solución de problemas
- Error de build en staging (Rollup/ModuleLoader):
  - Verifica Node (>=18), que devDependencies estén instaladas en la imagen (sin `--production`).
  - Prueba a quitar temporalmente plugins en Vite para aislar el problema.
- API no responde: revisa CORS y que `VITE_API_URL` apunte correctamente.
