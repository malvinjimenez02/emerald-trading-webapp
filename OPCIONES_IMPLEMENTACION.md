# Plan de implementación — Opciones sobre acciones en Emerald Trading

## Índice

1. [Migración Supabase](#1-migración-supabase)
2. [Tipos TypeScript](#2-tipos-typescript)
3. [Hook useRCalculator](#3-hook-usercalculator)
4. [Store useTradeStore](#4-store-usetradestore)
5. [Formulario TradeForm](#5-formulario-tradeform)
6. [Cálculos y métricas](#6-cálculos-y-métricas)
7. [Historial HistoryPage](#7-historial-historypage)
8. [Orden de ejecución](#8-orden-de-ejecución)

---

## 1. Migración Supabase

Ejecutar en el **SQL Editor** de Supabase en este orden exacto.

### 1.1 — Añadir columnas a la tabla `trades`

```sql
-- Tipo de instrumento
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS instrument_type TEXT NOT NULL DEFAULT 'spot_futures'
    CHECK (instrument_type IN ('spot_futures', 'options'));

-- Campos específicos de opciones
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS option_type        TEXT    CHECK (option_type IN ('call', 'put')),
  ADD COLUMN IF NOT EXISTS strike             NUMERIC,
  ADD COLUMN IF NOT EXISTS expiration_date    DATE,
  ADD COLUMN IF NOT EXISTS contracts          INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS premium_entry      NUMERIC,
  ADD COLUMN IF NOT EXISTS premium_exit       NUMERIC,
  ADD COLUMN IF NOT EXISTS stop_loss_pct      NUMERIC,   -- % del premium como stop (ej: 50)
  ADD COLUMN IF NOT EXISTS strategy           TEXT,      -- 'long_call', 'covered_call', etc.
  ADD COLUMN IF NOT EXISTS close_type         TEXT
    CHECK (close_type IN ('sold', 'exercised', 'expired_otm', 'assigned', 'stop_hit')),

-- Greeks al entrar (opcionales, para análisis)
  ADD COLUMN IF NOT EXISTS delta_entry        NUMERIC,
  ADD COLUMN IF NOT EXISTS theta_entry        NUMERIC,
  ADD COLUMN IF NOT EXISTS iv_entry           NUMERIC,   -- implied volatility en %
  ADD COLUMN IF NOT EXISTS dte_entry          INTEGER;   -- días hasta expiración al entrar
```

### 1.2 — Crear tipo ENUM para estrategias (opcional pero recomendado)

```sql
-- Si prefieres tipado estricto en lugar de TEXT libre:
ALTER TABLE trades
  DROP CONSTRAINT IF EXISTS trades_strategy_check;

ALTER TABLE trades
  ADD CONSTRAINT trades_strategy_check
    CHECK (strategy IN (
      'long_call',
      'long_put',
      'covered_call',
      'cash_secured_put',
      'bull_call_spread',
      'bear_put_spread',
      'iron_condor',
      'straddle',
      'strangle',
      'other'
    ));
```

### 1.3 — Índices para queries de análisis

```sql
-- Para filtrar trades de opciones rápidamente
CREATE INDEX IF NOT EXISTS idx_trades_instrument_type
  ON trades (instrument_type);

-- Para análisis por subyacente + tipo de opción
CREATE INDEX IF NOT EXISTS idx_trades_option_type
  ON trades (option_type)
  WHERE instrument_type = 'options';

-- Para análisis de DTE y expiración
CREATE INDEX IF NOT EXISTS idx_trades_expiration_date
  ON trades (expiration_date)
  WHERE instrument_type = 'options';
```

### 1.4 — Actualizar RLS (Row Level Security)

No se necesitan políticas nuevas. Las políticas existentes sobre `user_id` ya cubren las columnas nuevas automáticamente. Verificar que existan:

```sql
-- Verificar políticas activas (solo lectura, no ejecutar)
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'trades';

-- Si no existe política de SELECT, crearla:
CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  USING (auth.uid() = user_id);

-- Si no existe política de INSERT:
CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Si no existe política de UPDATE:
CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 2. Tipos TypeScript

### 2.1 — `src/types/trade.ts`

Reemplazar o ampliar la interfaz `Trade` existente:

```typescript
// Tipos específicos de opciones
export type InstrumentType = 'spot_futures' | 'options'
export type OptionType = 'call' | 'put'
export type OptionStrategy =
  | 'long_call'
  | 'long_put'
  | 'covered_call'
  | 'cash_secured_put'
  | 'bull_call_spread'
  | 'bear_put_spread'
  | 'iron_condor'
  | 'straddle'
  | 'strangle'
  | 'other'

export type OptionCloseType =
  | 'sold'
  | 'exercised'
  | 'expired_otm'
  | 'assigned'
  | 'stop_hit'

export interface OptionGreeks {
  delta?: number
  theta?: number
  iv?: number     // implied volatility en %
  dte?: number    // días hasta expiración al entrar
}

// Extender la interfaz Trade existente — añadir al final:
export interface Trade {
  // ... todos los campos existentes sin cambios ...
  id: string
  assetName: string
  direction: 'long' | 'short'
  entryPrice: number
  stopLoss: number
  takeProfit?: number
  exitPrice?: number
  result: 'win' | 'loss' | 'open'
  rValue?: number
  pnlAmount?: number
  status: 'open' | 'closed'
  notes?: string
  screenshotUri?: string
  entryDate: string | null
  closeDate: string | null
  createdAt: string
  closedAt?: string
  synced: boolean

  // --- Campos nuevos ---
  instrumentType: InstrumentType          // default: 'spot_futures'
  optionType?: OptionType                 // solo si instrumentType === 'options'
  strike?: number
  expirationDate?: string                 // ISO date (YYYY-MM-DD)
  contracts?: number                      // número de contratos (default: 1)
  premiumEntry?: number                   // precio del contrato al entrar
  premiumExit?: number                    // precio del contrato al salir
  stopLossPct?: number                    // % del premium como stop (ej: 50)
  strategy?: OptionStrategy
  closeType?: OptionCloseType
  greeks?: OptionGreeks
}
```

### 2.2 — `src/types/trade.ts` — TradeFormData

Ampliar el tipo del formulario:

```typescript
export interface TradeFormData {
  // --- Campos existentes sin cambios ---
  assetName: string
  direction: 'long' | 'short'
  entryDate: string
  entryTime: string
  entryPrice: string        // string porque viene de input
  stopLoss: string
  takeProfit: string
  closeDate: string
  closeTime: string
  exitPrice: string
  result: 'Win' | 'Loss' | 'BE' | ''
  pnlAmount: string
  notes: string
  screenshotUri: string

  // --- Campos nuevos ---
  instrumentType: InstrumentType
  optionType: OptionType | ''
  strike: string
  expirationDate: string
  contracts: string
  premiumEntry: string
  premiumExit: string
  stopLossPct: string
  strategy: OptionStrategy | ''
  closeType: OptionCloseType | ''
  deltaEntry: string
  thetaEntry: string
  ivEntry: string
  dteEntry: string
}

// Valores iniciales del formulario — exportar para usarlos en TradeForm.tsx
export const TRADE_FORM_DEFAULTS: TradeFormData = {
  assetName: '',
  direction: 'long',
  entryDate: '',
  entryTime: '',
  entryPrice: '',
  stopLoss: '',
  takeProfit: '',
  closeDate: '',
  closeTime: '',
  exitPrice: '',
  result: '',
  pnlAmount: '',
  notes: '',
  screenshotUri: '',
  // nuevos
  instrumentType: 'spot_futures',
  optionType: '',
  strike: '',
  expirationDate: '',
  contracts: '1',
  premiumEntry: '',
  premiumExit: '',
  stopLossPct: '50',
  strategy: '',
  closeType: '',
  deltaEntry: '',
  thetaEntry: '',
  ivEntry: '',
  dteEntry: '',
}
```

### 2.3 — `src/types/database.ts`

Añadir las columnas nuevas al tipo que mapea con Supabase:

```typescript
// Dentro de la interfaz que representa la fila de Supabase (adaptar al nombre existente)
export interface TradeRow {
  // ... columnas existentes ...
  instrument_type: 'spot_futures' | 'options'
  option_type: 'call' | 'put' | null
  strike: number | null
  expiration_date: string | null
  contracts: number | null
  premium_entry: number | null
  premium_exit: number | null
  stop_loss_pct: number | null
  strategy: string | null
  close_type: string | null
  delta_entry: number | null
  theta_entry: number | null
  iv_entry: number | null
  dte_entry: number | null
}
```

---

## 3. Hook useRCalculator

### `src/hooks/useRCalculator.ts`

El hook ya calcula R para spot/futuros. Añadir lógica condicional para opciones.

```typescript
// Añadir al tipo de parámetros del hook:
interface RCalculatorParams {
  // --- Existentes ---
  entryPrice: number
  stopLoss: number
  takeProfit?: number
  exitPrice?: number
  entryDate?: string
  closeDate?: string

  // --- Nuevos ---
  instrumentType: 'spot_futures' | 'options'
  premiumEntry?: number
  premiumExit?: number
  stopLossPct?: number    // % del premium (ej: 50 → stop en 50% del premium)
  contracts?: number
}

// Lógica nueva dentro del hook — añadir ANTES del cálculo existente:

// Para opciones, el "precio" que usamos para R es el premium, no el price del subyacente
if (instrumentType === 'options') {
  if (!premiumEntry || premiumEntry <= 0) {
    return { oneR: 0, rrPlanned: 0, rExecuted: undefined, riskAmount: 0 }
  }

  // Stop loss en opciones: precio del stop = premium * (1 - stopLossPct/100)
  // Ej: premium 2.00, stop 50% → stop en 1.00 (perdería $1 por acción = $100 por contrato)
  const stopLossPrice = stopLossPct
    ? premiumEntry * (1 - stopLossPct / 100)
    : stopLoss  // si el usuario ingresó un stop manual en premium

  const numContracts = contracts ?? 1
  const oneR = (premiumEntry - stopLossPrice) * 100 * numContracts  // cada contrato = 100 acciones
  const riskAmount = oneR

  const rrPlanned = takeProfit
    ? (takeProfit - premiumEntry) / (premiumEntry - stopLossPrice)
    : 0

  const rExecuted = premiumExit !== undefined
    ? (premiumExit - premiumEntry) / (premiumEntry - stopLossPrice)
    : undefined

  // Auto-detección de resultado (igual que spot)
  let autoResult: 'win' | 'loss' | 'be' | undefined
  if (rExecuted !== undefined) {
    if (rExecuted > 0.1) autoResult = 'win'
    else if (rExecuted < -0.1) autoResult = 'loss'
    else autoResult = 'be'
  }

  return { oneR, rrPlanned, rExecuted, riskAmount, autoResult }
}

// ... lógica existente para spot_futures sin cambios ...
```

---

## 4. Store useTradeStore

### `src/stores/useTradeStore.ts`

#### 4.1 — Función `buildTradeFromForm()`

Añadir mapeo de los campos nuevos:

```typescript
function buildTradeFromForm(formData: TradeFormData, userId: string, journalId: string): Partial<TradeRow> {
  const isOptions = formData.instrumentType === 'options'

  return {
    // ... mapeo existente sin cambios ...

    // Campos nuevos — siempre presentes
    instrument_type: formData.instrumentType,

    // Campos de opciones — solo si aplica
    option_type: isOptions && formData.optionType ? formData.optionType : null,
    strike: isOptions && formData.strike ? parseFloat(formData.strike) : null,
    expiration_date: isOptions && formData.expirationDate ? formData.expirationDate : null,
    contracts: isOptions && formData.contracts ? parseInt(formData.contracts) : null,
    premium_entry: isOptions && formData.premiumEntry ? parseFloat(formData.premiumEntry) : null,
    premium_exit: isOptions && formData.premiumExit ? parseFloat(formData.premiumExit) : null,
    stop_loss_pct: isOptions && formData.stopLossPct ? parseFloat(formData.stopLossPct) : null,
    strategy: isOptions && formData.strategy ? formData.strategy : null,
    close_type: isOptions && formData.closeType ? formData.closeType : null,

    // Greeks — solo si el usuario los ingresó
    delta_entry: isOptions && formData.deltaEntry ? parseFloat(formData.deltaEntry) : null,
    theta_entry: isOptions && formData.thetaEntry ? parseFloat(formData.thetaEntry) : null,
    iv_entry: isOptions && formData.ivEntry ? parseFloat(formData.ivEntry) : null,
    dte_entry: isOptions && formData.dteEntry ? parseInt(formData.dteEntry) : null,

    // Para opciones, entry_price y exit_price guardan el premium
    // (mantiene compatibilidad con el modelo existente)
    entry_price: isOptions
      ? (formData.premiumEntry ? parseFloat(formData.premiumEntry) : 0)
      : parseFloat(formData.entryPrice),
    exit_price: isOptions
      ? (formData.premiumExit ? parseFloat(formData.premiumExit) : undefined)
      : (formData.exitPrice ? parseFloat(formData.exitPrice) : undefined),
  }
}
```

#### 4.2 — Función `mapRowToTrade()` (de Supabase a Trade)

Añadir el mapeo inverso:

```typescript
function mapRowToTrade(row: TradeRow): Trade {
  return {
    // ... mapeo existente ...

    instrumentType: row.instrument_type ?? 'spot_futures',
    optionType: row.option_type ?? undefined,
    strike: row.strike ?? undefined,
    expirationDate: row.expiration_date ?? undefined,
    contracts: row.contracts ?? undefined,
    premiumEntry: row.premium_entry ?? undefined,
    premiumExit: row.premium_exit ?? undefined,
    stopLossPct: row.stop_loss_pct ?? undefined,
    strategy: row.strategy as OptionStrategy ?? undefined,
    closeType: row.close_type as OptionCloseType ?? undefined,
    greeks: (row.delta_entry || row.theta_entry || row.iv_entry || row.dte_entry)
      ? {
          delta: row.delta_entry ?? undefined,
          theta: row.theta_entry ?? undefined,
          iv: row.iv_entry ?? undefined,
          dte: row.dte_entry ?? undefined,
        }
      : undefined,
  }
}
```

---

## 5. Formulario TradeForm

### `src/components/trade/TradeForm.tsx`

Esta es la parte más grande. Se estructura en 3 bloques de cambios.

#### 5.1 — Estado inicial y selector de instrumento

```typescript
// Al inicio del componente, añadir estado para el tipo de instrumento:
const [instrumentType, setInstrumentType] = useState<InstrumentType>('spot_futures')

// El cambio de instrumento resetea campos no compartidos:
const handleInstrumentChange = (type: InstrumentType) => {
  setInstrumentType(type)
  // Resetear campos del otro instrumento para evitar datos cruzados
  if (type === 'options') {
    setFormData(prev => ({
      ...prev,
      instrumentType: 'options',
      entryPrice: '',   // en opciones se usa premiumEntry
      exitPrice: '',
    }))
  } else {
    setFormData(prev => ({
      ...prev,
      instrumentType: 'spot_futures',
      premiumEntry: '',
      premiumExit: '',
      optionType: '',
      strike: '',
      expirationDate: '',
      contracts: '1',
    }))
  }
}
```

```tsx
{/* Añadir este bloque JUSTO DESPUÉS del campo assetName y ANTES de la sección "ENTRADA" */}

<div className="form-section">
  <label className="section-label">Tipo de instrumento</label>
  <div className="button-group">
    <button
      type="button"
      className={instrumentType === 'spot_futures' ? 'btn-toggle active' : 'btn-toggle'}
      onClick={() => handleInstrumentChange('spot_futures')}
    >
      Spot / Futuros
    </button>
    <button
      type="button"
      className={instrumentType === 'options' ? 'btn-toggle active' : 'btn-toggle'}
      onClick={() => handleInstrumentChange('options')}
    >
      Opciones
    </button>
  </div>
</div>
```

#### 5.2 — Sección de opciones (renderizado condicional)

```tsx
{/* Insertar DESPUÉS del selector de dirección Long/Short, solo si es opciones */}

{instrumentType === 'options' && (
  <>
    {/* Tipo de opción */}
    <div className="form-section">
      <label className="section-label">Tipo de opción *</label>
      <div className="button-group">
        <button
          type="button"
          className={formData.optionType === 'call' ? 'btn-call active' : 'btn-toggle'}
          onClick={() => setFormData(prev => ({ ...prev, optionType: 'call' }))}
        >
          Call
        </button>
        <button
          type="button"
          className={formData.optionType === 'put' ? 'btn-put active' : 'btn-toggle'}
          onClick={() => setFormData(prev => ({ ...prev, optionType: 'put' }))}
        >
          Put
        </button>
      </div>
    </div>

    {/* Contrato */}
    <div className="form-section-label">CONTRATO</div>

    <div className="form-row">
      <div className="form-field">
        <label>Strike *</label>
        <input
          type="number"
          step="0.01"
          placeholder="150.00"
          value={formData.strike}
          onChange={e => setFormData(prev => ({ ...prev, strike: e.target.value }))}
        />
      </div>
      <div className="form-field">
        <label>Expiración *</label>
        <input
          type="date"
          value={formData.expirationDate}
          onChange={e => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
        />
      </div>
    </div>

    <div className="form-row">
      <div className="form-field">
        <label>Contratos *</label>
        <input
          type="number"
          min="1"
          step="1"
          placeholder="1"
          value={formData.contracts}
          onChange={e => setFormData(prev => ({ ...prev, contracts: e.target.value }))}
        />
      </div>
      <div className="form-field">
        <label>Estrategia <span className="optional">(opcional)</span></label>
        <select
          value={formData.strategy}
          onChange={e => setFormData(prev => ({ ...prev, strategy: e.target.value as OptionStrategy }))}
        >
          <option value="">— sin estrategia —</option>
          <option value="long_call">Long call simple</option>
          <option value="long_put">Long put simple</option>
          <option value="covered_call">Covered call</option>
          <option value="cash_secured_put">Cash-secured put</option>
          <option value="bull_call_spread">Bull call spread</option>
          <option value="bear_put_spread">Bear put spread</option>
          <option value="iron_condor">Iron condor</option>
          <option value="straddle">Straddle</option>
          <option value="strangle">Strangle</option>
          <option value="other">Otro</option>
        </select>
      </div>
    </div>
  </>
)}
```

#### 5.3 — Sección de entrada — reemplazar precio de entrada por premium

```tsx
{/* En la sección ENTRADA, renderizar condicionalmente */}

<div className="form-row">
  <div className="form-field">
    <label>
      {instrumentType === 'options' ? 'Premium pagado *' : 'Precio de entrada *'}
    </label>
    <input
      type="number"
      step="0.01"
      placeholder={instrumentType === 'options' ? '2.45' : '0.00'}
      value={instrumentType === 'options' ? formData.premiumEntry : formData.entryPrice}
      onChange={e => {
        const field = instrumentType === 'options' ? 'premiumEntry' : 'entryPrice'
        setFormData(prev => ({ ...prev, [field]: e.target.value }))
      }}
    />
  </div>
  <div className="form-field">
    <label>
      {instrumentType === 'options' ? 'Stop loss (en premium)' : 'Stop loss *'}
    </label>
    <input
      type="number"
      step="0.01"
      placeholder="0.00"
      value={formData.stopLoss}
      onChange={e => setFormData(prev => ({ ...prev, stopLoss: e.target.value }))}
    />
  </div>
</div>

{/* Campo de % de stop — solo en opciones */}
{instrumentType === 'options' && (
  <div className="form-row">
    <div className="form-field">
      <label>% del premium como stop <span className="optional">(alternativa al stop manual)</span></label>
      <input
        type="number"
        min="1"
        max="100"
        step="1"
        placeholder="50"
        value={formData.stopLossPct}
        onChange={e => setFormData(prev => ({ ...prev, stopLossPct: e.target.value }))}
      />
    </div>
    <div className="form-field">
      <label>Take profit <span className="optional">(opcional)</span></label>
      <input
        type="number"
        step="0.01"
        placeholder="4.90"
        value={formData.takeProfit}
        onChange={e => setFormData(prev => ({ ...prev, takeProfit: e.target.value }))}
      />
    </div>
  </div>
)}

{/* Greeks — solo en opciones, colapsable */}
{instrumentType === 'options' && (
  <details className="greeks-collapsible">
    <summary>Greeks al entrar <span className="optional">(opcional)</span></summary>
    <div className="form-row" style={{ marginTop: '8px' }}>
      <div className="form-field">
        <label>Delta (Δ)</label>
        <input type="number" step="0.01" placeholder="0.45"
          value={formData.deltaEntry}
          onChange={e => setFormData(prev => ({ ...prev, deltaEntry: e.target.value }))} />
      </div>
      <div className="form-field">
        <label>Theta (Θ)</label>
        <input type="number" step="0.01" placeholder="-0.05"
          value={formData.thetaEntry}
          onChange={e => setFormData(prev => ({ ...prev, thetaEntry: e.target.value }))} />
      </div>
    </div>
    <div className="form-row">
      <div className="form-field">
        <label>IV al entrar (%)</label>
        <input type="number" step="0.1" placeholder="28.5"
          value={formData.ivEntry}
          onChange={e => setFormData(prev => ({ ...prev, ivEntry: e.target.value }))} />
      </div>
      <div className="form-field">
        <label>DTE (días a exp.)</label>
        <input type="number" step="1" placeholder="21"
          value={formData.dteEntry}
          onChange={e => setFormData(prev => ({ ...prev, dteEntry: e.target.value }))} />
      </div>
    </div>
  </details>
)}
```

#### 5.4 — Sección de cierre

```tsx
{/* En la sección CIERRE, reemplazar precio de salida */}

<div className="form-field">
  <label>
    {instrumentType === 'options' ? 'Premium de salida' : 'Precio de salida *'}
  </label>
  <input
    type="number"
    step="0.01"
    placeholder="0.00"
    value={instrumentType === 'options' ? formData.premiumExit : formData.exitPrice}
    onChange={e => {
      const field = instrumentType === 'options' ? 'premiumExit' : 'exitPrice'
      setFormData(prev => ({ ...prev, [field]: e.target.value }))
    }}
  />
</div>

{/* Tipo de cierre — solo en opciones */}
{instrumentType === 'options' && (
  <div className="form-field">
    <label>Tipo de cierre <span className="optional">(opcional)</span></label>
    <select
      value={formData.closeType}
      onChange={e => setFormData(prev => ({ ...prev, closeType: e.target.value as OptionCloseType }))}
    >
      <option value="">— seleccionar —</option>
      <option value="sold">Vendí la opción (cerré posición)</option>
      <option value="exercised">Ejercida (expiró ITM)</option>
      <option value="expired_otm">Expiró sin valor (OTM)</option>
      <option value="assigned">Asignada</option>
      <option value="stop_hit">Stop loss tocado</option>
    </select>
  </div>
)}
```

#### 5.5 — Validación del formulario

```typescript
// Dentro de validateTradeForm(), añadir bloque para opciones:

if (formData.instrumentType === 'options') {
  if (!formData.optionType) {
    errors.optionType = 'Selecciona Call o Put'
  }
  if (!formData.strike || parseFloat(formData.strike) <= 0) {
    errors.strike = 'El strike es requerido'
  }
  if (!formData.expirationDate) {
    errors.expirationDate = 'La fecha de expiración es requerida'
  }
  if (!formData.premiumEntry || parseFloat(formData.premiumEntry) <= 0) {
    errors.premiumEntry = 'El premium de entrada es requerido'
  }
  if (!formData.contracts || parseInt(formData.contracts) < 1) {
    errors.contracts = 'Mínimo 1 contrato'
  }
  // Validar que la expiración sea >= entryDate
  if (formData.expirationDate && formData.entryDate) {
    if (formData.expirationDate < formData.entryDate) {
      errors.expirationDate = 'La expiración debe ser posterior a la entrada'
    }
  }
} else {
  // Validación existente para spot/futuros — sin cambios
  if (!formData.entryPrice || parseFloat(formData.entryPrice) <= 0) {
    errors.entryPrice = 'El precio de entrada es requerido'
  }
  // ... resto de validaciones existentes
}
```

---

## 6. Cálculos y métricas

### `src/utils/calculations.ts`

La función `calculateMetrics()` existente trabaja sobre todos los trades. Solo requiere ajuste menor para que no falle con los nuevos campos (que pueden ser `undefined`).

```typescript
// En calculateMetrics(), el R-value ya es calculado antes de guardar.
// Solo asegurarse de que los filtros de tipo funcionen:

// Para filtrar solo opciones en futuras métricas específicas:
const optionTrades = trades.filter(t => t.instrumentType === 'options')
const spotTrades = trades.filter(t => t.instrumentType === 'spot_futures')

// El profit factor y la equity curve no necesitan cambios —
// operan sobre rValue que ya está calculado uniformemente.
```

---

## 7. Historial HistoryPage

### `src/pages/HistoryPage.tsx`

Añadir columnas y filtros para opciones.

```typescript
// Añadir filtro de instrumento al estado de filtros existente:
const [filters, setFilters] = useState({
  // ... filtros existentes ...
  instrumentType: 'all' as 'all' | 'spot_futures' | 'options',
  optionType: 'all' as 'all' | 'call' | 'put',
})

// Aplicar filtros en la función de filtrado:
.filter(trade => {
  if (filters.instrumentType !== 'all' && trade.instrumentType !== filters.instrumentType) return false
  if (filters.optionType !== 'all' && trade.optionType !== filters.optionType) return false
  return true
})
```

```tsx
{/* En la tabla de historial, añadir columna de tipo: */}

<th>Instrumento</th>
// ...en la fila:
<td>
  {trade.instrumentType === 'options'
    ? `${trade.optionType?.toUpperCase()} ${trade.strike} exp. ${trade.expirationDate}`
    : trade.assetName
  }
</td>
```

---

## 8. Orden de ejecución

Seguir este orden para evitar errores de tipo y de runtime:

```
Paso 1 → Ejecutar migración SQL en Supabase (sección 1)
           Verificar en Table Editor que las columnas aparecen

Paso 2 → Actualizar src/types/trade.ts (sección 2.1 y 2.2)
           Actualizar src/types/database.ts (sección 2.3)
           → El compilador marcará todos los lugares que hay que actualizar

Paso 3 → Actualizar src/hooks/useRCalculator.ts (sección 3)

Paso 4 → Actualizar src/stores/useTradeStore.ts (sección 4)

Paso 5 → Actualizar src/components/trade/TradeForm.tsx (sección 5)
           5.1 primero (estado y selector)
           5.2 (campos de contrato)
           5.3 (entrada)
           5.4 (cierre)
           5.5 (validación)

Paso 6 → Verificar src/utils/calculations.ts (sección 6)
           Generalmente no necesita cambios

Paso 7 → Actualizar src/pages/HistoryPage.tsx (sección 7)

Paso 8 → Prueba de humo:
           - Registrar un trade spot normal → verificar que no rompe nada
           - Registrar un trade de opciones → verificar que guarda en Supabase
           - Ver en Table Editor que las columnas de opciones tienen datos
           - Verificar que el R se calcula correctamente en ambos casos
```

---

*Generado para Emerald Trading — Junio 2026*
