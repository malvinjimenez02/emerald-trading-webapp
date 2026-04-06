# EMERALD_TRADING_MASTER_SPEC

## 1) Visión General del Producto

### Nombre
**Emerald Trading**

### Propósito
Aplicación de diario de trading orientada a ejecución profesional, con foco en:
- Registro estructurado de operaciones.
- Cálculo en unidades de riesgo (`R` / `R-Multiple`).
- Seguimiento de performance por journal, período y contexto operativo.
- Análisis estadístico accionable para mejorar disciplina y consistencia.

### Público Objetivo
Traders que requieren:
- Precisión técnica en métricas de riesgo/resultado.
- Trazabilidad por trade (precios, fechas, screenshot, notas).
- Visualización de desempeño por dirección, activo y período.

---

## 2) Arquitectura Técnica (The Stack)

### Frontend: React 19 + Vite
Implementación SPA con React y TypeScript.

Evidencia:
```json
{
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "vite": "^8.0.1",
    "@vitejs/plugin-react": "^6.0.1"
  }
}
```

Nota: el pedido menciona Vite 6, pero el repositorio actual usa **Vite 8.0.1**.

Bootstrapping:
```tsx
// src/main.tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### Estilos: Tailwind CSS 4 + Design System Esmeralda (Dark)
Se usa Tailwind 4 vía plugin oficial de Vite, con tokens de color custom.

Evidencia:
```ts
// vite.config.ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

```css
/* src/index.css */
@theme {
  --color-bg: #0D1117;
  --color-bg-surface: #161B22;
  --color-accent: #00C853;
  --color-positive: #00C853;
  --color-negative: #F85149;
}
```

Observación técnica:
- Coexisten dos fuentes de tokens: `src/index.css` y `src/theme/colors.ts`/`tailwind.config.ts`.
- Hay mezcla de clases Tailwind y estilos inline hex en componentes de análisis.

### Navegación: React Router 7
Arquitectura por rutas protegidas con `ProtectedRoute` + `Navigate`.

Evidencia:
```tsx
// src/App.tsx
<Route path="/dashboard" element={<DashboardPage />} />
<Route path="/history" element={<HistoryPage />} />
<Route path="/analysis" element={<AnalysisPage />} />
<Route path="/settings" element={<SettingsPage />} />
<Route path="/trade/:id" element={<TradeDetailPage />} />
```

Patrón:
- No autenticado: sólo `/login`, `/register`.
- Autenticado: layout persistente (`Sidebar` + `TopNavbar`) y módulos funcionales.

### Estado Global: Zustand
Stores principales:
- `useAuthStore`: sesión/usuario y ciclo auth.
- `useJournalStore`: journals, activo, switching, CRUD.
- `useTradeStore`: trades, métricas, sincronización Supabase.
- `useDateFilterStore`: filtros temporales globales.

Snippet representativo:
```ts
// src/stores/useTradeStore.ts
export const useTradeStore = create<TradeState>((set, get) => ({
  trades: [],
  metrics: emptyMetrics,
  activeJournalId: null,
  isLoading: true,

  loadTrades: async (journalId) => {
    const { data } = await supabase
      .from('trades')
      .select('*')
      .eq('journal_id', journalId)
      .order('created_at', { ascending: false });

    const trades = (data as TradeRow[] ?? []).map(mapFromSupabase);
    const config = await getJournalConfig(journalId);
    set({ trades, metrics: calculateMetrics(trades, config), isLoading: false });
  },
}));
```

### Persistencia & Auth: Supabase
#### Auth
- Email/password implementado (`signUp`, `signInWithPassword`, `signOut`, `getSession`, listener de `onAuthStateChange`).
- Social auth UI presente pero no conectada (`onClick={() => {}}`, pendiente).

#### Tablas y esquema inferido
- `journals` (documentado en comentario SQL dentro de `useJournalStore.ts`).
- `trades` (inferido por `TradeRow` y queries).
- Storage bucket: `screenshots`.

SQL explícito en código (journals + RLS):
```sql
CREATE TABLE IF NOT EXISTS journals (..., user_id UUID NOT NULL REFERENCES auth.users(id) ...);
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journals"
  ON journals FOR ALL USING (auth.uid() = user_id);
```

Importante:
- No se encontraron migraciones/versionado SQL en el repo (ej. carpeta `supabase/migrations`).
- Políticas RLS para `trades` y `screenshots` no están documentadas en este código.

### Visualización: Recharts
Motor principal en dashboard y análisis:
- `EquityChart` (`AreaChart`) sobre `equityCurve`.
- `RollingExpectancyChart` para tendencia de expectancy.

Snippet:
```tsx
<AreaChart data={data}>
  <XAxis dataKey="week" />
  <YAxis tickFormatter={(v) => `${v}R`} />
  <Area dataKey="cumulativeR" stroke="#10E261" />
</AreaChart>
```

### Multiplataforma: Web y Desktop (Tauri 2)
- La app actual se comporta como SPA web (Vite + React).
- El branding/mensajes mencionan “Desktop” (`package name: emerald-desktop`, About: Platform Desktop).
- **No existe en este repositorio** evidencia de wrapper Tauri 2 (`src-tauri`, `tauri.conf.json`, Cargo manifest).

Conclusión técnica: soporte Desktop está planteado a nivel de producto/branding, pero la integración Tauri no está en este código.

---

## 3) User Experience (UX) & Flujos de Usuario

### Onboarding (Landing WordPress -> App Vercel)
Contexto esperado por negocio:
1. Landing marketing (WordPress).
2. Derivación a aplicación (`app.emeraldtrading.online`).
3. Login/registro.

Estado en este repo:
- El flujo interno de app inicia en `/login` o `/register`.
- No hay código de landing ni enlaces explícitos a WordPress.
- No hay configuración de Vercel/CI-CD dentro del repositorio (no `vercel.json`, no workflows en `.github`).

### Core Loop
Implementación observada:
1. **Registro de Trade** (`TradeForm` modal desde Sidebar).
2. **Cálculo de Riesgo** (`useRCalculator` + persistencia de `rValue`).
3. **Visualización Dashboard** (`MetricCard`, `EquityChart`, recientes).
4. **Análisis de Equity/Expectancy** (`AnalysisPage`, cards de disciplina y ejecución).

Detalles clave:
- Entrada/salida con fecha y hora separadas, serialización ISO.
- Captura opcional de screenshot y subida a Supabase Storage.
- Recalculo de métricas al cargar/crear/actualizar/eliminar.
- Filtro global de fechas compartido entre Dashboard, History y Analysis.

### Interfaz y usabilidad
Fortalezas:
- Jerarquía clara por módulos (`Dashboard`, `History`, `Analysis`, `Settings`).
- Visual feedback consistente en positivo/negativo (verde/rojo).
- Estados vacíos y skeletons presentes en componentes críticos.
- Tabla de historial potente (`@tanstack/react-table`) con sorting/paginación/filtros.

Riesgos UX detectados:
- Inconsistencia idiomática (EN/ES mezclado) en auth y análisis.
- Algunas cadenas con problemas de encoding (caracteres mojibake visibles en archivos).
- Search de `TopNavbar` es visual, sin comportamiento funcional.
- Social login visible pero no operativo, puede generar fricción de confianza.

---

## 4) Lógica de Negocio (Core Logic)

### Cálculo de R-Multiple
Fórmula implementada:
```ts
export function calculateR(direction, entryPrice, exitPrice, stopLoss) {
  const denominator = direction === 'long'
    ? entryPrice - stopLoss
    : stopLoss - entryPrice;
  if (denominator === 0) return null;
  return direction === 'long'
    ? (exitPrice - entryPrice) / denominator
    : (entryPrice - exitPrice) / denominator;
}
```

Reglas operativas:
- `rValue` prioriza geometría de precios (`entry/stop/exit`).
- Si no hay `exitPrice`, fallback secundario por `pnlAmount/riskPerTrade`.
- `riskPerTrade` está fijo en `100` en `journalToConfig`.

### Drawdown
- No se encontró cálculo explícito de **drawdown** o **max drawdown** en `utils/calculations.ts` ni en stores/páginas.
- Sí existe equity curve acumulada semanal en `R`.

Conclusión: la app hoy mide performance acumulada y expectancy, pero no expone drawdown formal como métrica de riesgo temporal.

### Transformación de datos DB -> Recharts
Pipeline:
1. Query Supabase (`trades` por `user_id` + `journal_id`).
2. `mapFromSupabase` transforma snake_case -> camelCase.
3. `calculateMetrics` filtra cerrados (`TradeStatus.Closed`).
4. `buildEquityCurve` ordena por fecha, agrupa por semana ISO, acumula `cumulativeR`.
5. `EquityChart` consume `EquityPoint[]`.

Snippet:
```ts
for (const trade of sorted) {
  const week = getISOWeek(getTradeCloseDate(trade));
  weekMap.set(week, (weekMap.get(week) ?? 0) + (trade.rValue ?? 0));
}

let cumulative = 0;
return Array.from(weekMap.entries()).map(([week, r]) => {
  cumulative += r;
  return { week, cumulativeR: cumulative };
});
```

### App Subdomain
Objetivo declarado: `app.emeraldtrading.online` (Vercel + GitHub CI/CD).

Estado verificable en repo:
- No hay artefactos explícitos de despliegue Vercel o pipelines GitHub Actions.
- El código es compatible con despliegue Vite SPA en Vercel.

---

## Oportunidades de Mejora (UX + Performance)

### Prioridad Alta
1. **Implementar Drawdown/Max Drawdown real**
- Añadir cálculo en `utils/calculations.ts` y tarjetas en Dashboard/Analysis.
- Incluir curva de equity en dinero además de `R` para comparar riesgo relativo.

2. **Cerrar gaps de autenticación social**
- Conectar botones Google/Apple a Supabase OAuth o ocultarlos hasta estar listos.

3. **Normalizar encoding y localización**
- Estandarizar UTF-8 en todos los archivos.
- Definir idioma único o i18n real (es/en), evitando mezcla actual.

### Prioridad Media
4. **Diseño de tokens unificado**
- Consolidar colores/tipografía en una sola fuente (variables + theme tokens).
- Reducir inline styles en páginas de análisis para mejorar mantenibilidad.

5. **Search funcional en TopNavbar**
- Hoy es sólo visual. Integrarlo con History/Trades global search o remover hasta implementar.

6. **Persistencia robusta de configuración de riesgo**
- `riskPerTrade` fijo en 100 limita exactitud para traders avanzados.
- Persistir riesgo por journal (y opcionalmente por trade setup).

### Prioridad Media/Baja (Performance)
7. **Optimizar recargas y sincronización de datos**
- `updateTrade` hace refetch completo. Evaluar actualización optimista + invalidación selectiva.
- Considerar memoización/selectores más finos en Zustand para evitar renders cruzados.

8. **Observabilidad operativa**
- Centralizar manejo de errores de Supabase (toast + logging estructurado).
- Telemetría de eventos clave de UX (trade guardado, filtros usados, drop-off en auth).

### Infra/DevEx
9. **Formalizar infraestructura en código**
- Añadir migraciones Supabase versionadas.
- Documentar RLS de `trades` y `screenshots`.
- Incorporar CI (`lint`, `build`, tests) en `.github/workflows`.

10. **Clarificar estrategia Desktop**
- Si Tauri 2 es objetivo inmediato, agregar wrapper y pipeline de release.
- Si no, ajustar wording de “Platform: Desktop” para evitar expectativa incorrecta.

---

## Resumen Ejecutivo
Emerald Trading ya tiene una base sólida de producto para journaling cuantitativo: arquitectura clara (React + Zustand + Supabase), experiencia dark consistente y analítica útil en `R`. El mayor salto de madurez está en tres frentes: **riesgo avanzado (drawdown), consistencia UX operativa (social/login/search), y hardening de plataforma (migraciones/CI/deploy/Tauri)**.
