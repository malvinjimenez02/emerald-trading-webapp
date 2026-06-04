# Emerald Trading — Contexto y Flujo de Registro de Trades

## Briefing de la App

**Emerald Trading** es un trading journal profesional que permite a traders registrar, analizar y mejorar su rendimiento operativo. El objetivo principal es cuantificar resultados usando **R-multiples** (unidades de riesgo) en lugar de solo P&L en dinero, lo que da una perspectiva más objetiva de la consistencia del trader.

**Stack:**
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS 4
- Estado global: Zustand
- Backend: Supabase (PostgreSQL + Auth + Storage)
- Charts: Recharts

---

## Funciones Principales

| Ruta | Función |
|------|---------|
| `/dashboard` | Métricas clave, equity curve, trades recientes |
| `/history` | Tabla completa de trades con filtros y ordenación |
| `/analysis` | Curva de equidad, expectancy rolling, métricas de disciplina |
| `/trade/:id` | Vista detallada y edición de un trade individual |
| `/settings` | Configuración de usuario y journal |

**Journals múltiples:** El usuario puede tener varios journals (ej: uno por estrategia o mercado). Hay un selector en el sidebar para cambiar de journal activo.

---

## Modelo de Datos — Trade

Definido en `src/types/trade.ts`:

```typescript
interface Trade {
  id: string                 // UUID generado por Supabase
  assetName: string          // Ej: "BTC/USDT", "EUR/USD"
  direction: 'long' | 'short'
  entryPrice: number
  stopLoss: number
  takeProfit?: number        // Opcional
  exitPrice?: number
  result: 'win' | 'loss' | 'open'
  rValue?: number            // R-múltiple ejecutado (calculado)
  pnlAmount?: number         // P&L en USD
  status: 'open' | 'closed'
  notes?: string
  screenshotUri?: string     // URL en Supabase Storage
  entryDate: string | null   // ISO 8601
  closeDate: string | null   // ISO 8601
  createdAt: string
  closedAt?: string
  synced: boolean
}
```

**Tabla en Supabase:** `trades`, con RLS — cada usuario solo accede a sus propios trades.  
Columnas clave: `journal_id`, `user_id`, `asset_name`, `direction`, `entry_price`, `stop_loss`, `take_profit`, `exit_price`, `result`, `r_value`, `pnl_amount`, `status`, `notes`, `screenshot_uri`, `entry_date`, `close_date`.

---

## Flujo Completo — Añadir un Trade

### 1. Punto de entrada

El usuario abre el modal desde el botón **"Add Trade"** en el Sidebar (`src/components/layout/Sidebar.tsx`). El modal renderiza el componente `TradeForm`.

**Archivo principal:** `src/components/trade/TradeForm.tsx` (~611 líneas)

---

### 2. Campos del formulario (`TradeFormData`)

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `assetName` | string | Sí | Nombre del activo |
| `direction` | `'long' \| 'short'` | Sí | Dirección de la operación |
| `entryDate` | string | Sí | Fecha de entrada |
| `entryTime` | string | Sí | Hora de entrada |
| `entryPrice` | number | Sí | Precio de entrada |
| `stopLoss` | number | Sí | Stop loss |
| `takeProfit` | number | No | Take profit |
| `closeDate` | string | No | Fecha de cierre |
| `closeTime` | string | No | Hora de cierre |
| `exitPrice` | number | No | Precio de salida |
| `result` | `'Win' \| 'Loss' \| 'BE'` | No | Se auto-detecta si hay exitPrice |
| `pnlAmount` | number | No | P&L en USD |
| `notes` | string | No | Notas del trade |
| `screenshotUri` | string | No | URL de screenshot |

---

### 3. Cálculo automático — `useRCalculator`

**Archivo:** `src/hooks/useRCalculator.ts`

Este hook se ejecuta en tiempo real mientras el usuario llena el formulario y calcula:

```
oneR          = |entryPrice - stopLoss|          // Riesgo en puntos
rrPlanned     = |takeProfit - entryPrice| / oneR  // R:R planificado
rExecuted     = (exitPrice - entryPrice) / (entryPrice - stopLoss)  // R ejecutado
duration      = closeDate - entryDate             // Duración del trade
```

**Auto-detección de resultado:**
- `rExecuted > 0.1` → Win
- `rExecuted < -0.1` → Loss
- Entre -0.1 y 0.1 → Break-even (BE)

---

### 4. Upload de Screenshot

**Líneas 134–189 de `TradeForm.tsx`**

Si el usuario adjunta una imagen:
1. Se hace un `fetch` directo a Supabase Storage REST API
2. Se sube al bucket `screenshots/` con path `{userId}/{timestamp}_{filename}`
3. Se obtiene la URL pública y se guarda en `screenshotUri`

---

### 5. Validación del formulario

La función `validateTradeForm()` (dentro de `TradeForm.tsx`) verifica:
- Campos requeridos no vacíos
- `closeDate >= entryDate`
- Precios válidos (no negativos, stop loss coherente con dirección)

---

### 6. Submit — Handler principal

**Líneas 270–323 de `TradeForm.tsx`**

```
1. validateTradeForm()            → Si hay errores, muestra mensajes y para
2. addTrade() o updateTrade()     → Según sea trade nuevo o edición
3. buildTradeFromForm()           → Construye objeto Trade con R calculado
4. fetch() a Supabase REST API    → POST /rest/v1/trades con bearer token
5. Actualiza estado Zustand       → Optimistic update en UI
6. Background refresh             → Refresca métricas y config del journal
7. Cierra el modal
```

---

### 7. Persistencia — `useTradeStore`

**Archivo:** `src/stores/useTradeStore.ts`

**`addTrade()` (líneas ~247–294):**
1. Construye el objeto Trade completo
2. Calcula R-value final
3. POST directo a Supabase REST (bypassa el GoTrueClient para mayor control)
4. Actualiza el array local de trades en el store
5. Dispara recalculo de métricas

**`updateTrade()` (líneas ~296–330):**
1. PATCH a Supabase con los campos modificados
2. Optimistic update en UI
3. Refetch de sincronización

---

### 8. Cálculo de Métricas post-trade

**Archivo:** `src/utils/calculations.ts` — función `calculateMetrics()`

Tras añadir un trade, se recalculan:
- Total de trades, win rate
- **Profit Factor**: suma R ganadores / suma R perdedores
- **Cumulative R**: suma total de R-values
- Valor de la cuenta (cuenta base + R acumulado × tamaño de riesgo)
- Equity curve semanal para el gráfico del dashboard

---

## Mapa de Archivos Clave

| Propósito | Ruta |
|-----------|------|
| Formulario de trade (UI) | `src/components/trade/TradeForm.tsx` |
| Hook de cálculo R | `src/hooks/useRCalculator.ts` |
| Store de trades (CRUD) | `src/stores/useTradeStore.ts` |
| Tipos de Trade | `src/types/trade.ts` |
| Tipos de base de datos | `src/types/database.ts` |
| Cálculos y métricas | `src/utils/calculations.ts` |
| Dashboard | `src/pages/DashboardPage.tsx` |
| Historial de trades | `src/pages/HistoryPage.tsx` |
| Detalle/edición de trade | `src/pages/TradeDetailPage.tsx` |
| Router principal | `src/App.tsx` |
| Sidebar (modal trigger) | `src/components/layout/Sidebar.tsx` |

---

## Notas para Añadir Nueva Funcionalidad

- **Nuevo campo en el trade:** Añadir en `Trade` interface (`src/types/trade.ts`), en `TradeFormData` y en el form (`TradeForm.tsx`), en el `buildTradeFromForm()` del store, y en la tabla de Supabase (migración SQL).
- **Nueva métrica:** Añadir en `calculateMetrics()` (`src/utils/calculations.ts`) y actualizar los tipos en `src/types/metrics.ts`.
- **Nueva página/ruta:** Añadir en `src/App.tsx` y en la navegación del Sidebar (`src/components/layout/Sidebar.tsx`) y Bottom Nav.
- **La lógica de R es central** — cualquier cambio en entryPrice, stopLoss o exitPrice debe pasar por `useRCalculator`.
