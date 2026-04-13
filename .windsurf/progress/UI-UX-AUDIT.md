# 🎨 UI/UX Audit - Studere

**Fecha:** 6 Abr 2026 20:00  
**Objetivo:** Identificar y corregir problemas de UI/UX en toda la aplicación

---

## 🔍 Problemas Identificados

### 🚨 Críticos (P0)

#### 1. Botones No Funcionales
**dashboard-home.tsx (línea 294)**
```typescript
<span className="text-xs font-semibold text-sky-600 dark:text-sky-400">Ver todos</span>
```
- ❌ **Problema:** Es un `<span>` que parece clickeable pero no hace nada
- ✅ **Fix:** Convertir a link funcional o remover el estilo clickeable

**integrations-page.tsx (línea 61-65)**
```typescript
<button className="...">Conectar</button>
```
- ❌ **Problema:** 6 botones "Conectar" sin `onClick`, no hacen nada
- ✅ **Fix:** Agregar funcionalidad o mostrar "Próximamente"

#### 2. Links Duplicados
**dashboard-home.tsx (líneas 303-304)**
```typescript
<a href="/integrations">Conectar Google Calendar</a>
<a href="/integrations">Conectar Outlook</a>
```

**upcoming-page.tsx (líneas 51-52)**
```typescript
<a href="/integrations">Conectar Google Calendar</a>
<a href="/integrations">Conectar Microsoft Outlook</a>
```

- ❌ **Problema:** Múltiples links idénticos en diferentes páginas
- ❌ **Problema:** Todos apuntan a /integrations donde los botones no funcionan
- ✅ **Fix:** Unificar destino o hacer funcionales los botones de integrations

---

### ⚠️ Altos (P1)

#### 3. Inconsistencia en Links
**Mezclando `<a href>` y `<Link>`**
```typescript
// dashboard-home.tsx usa <a>
<a href={latestSession ? `/sessions/${session.id}` : "/dashboard"}>

// sidebar.tsx usa <Link>
<Link href="/integrations">
```
- ❌ **Problema:** Algunos usan Next.js Link, otros HTML anchor
- ✅ **Fix:** Usar `<Link>` de Next.js en todas las navegaciones internas

#### 4. Espaciado Inconsistente en Botones
**Quick Actions (dashboard-home.tsx)**
```typescript
<p className="mt-4 text-sm font-semibold">{action.label}</p>
// "Grabar audio" vs "Subir y transcribir" vs "Clase en vivo"
```
- ❌ **Problema:** Botones con texto diferente altura → espacios laterales
- ✅ **Fix:** Usar `min-h-[...]` o `line-clamp-2` para altura consistente

#### 5. Rounded Corners Inconsistentes
```typescript
// Algunos usan:
rounded-[28px]  // dashboard cards
rounded-[24px]  // session cards
rounded-[22px]  // quick actions
rounded-2xl     // botones pequeños
rounded-full    // pills y botones circulares
```
- ⚠️ **Problema:** 5 tamaños diferentes de border-radius
- ✅ **Fix:** Estandarizar a 3 niveles: card (24px), button (16px), pill (full)

---

### 💡 Mejorables (P2)

#### 6. Eventos Hardcodeados
**dashboard-home.tsx (línea 293)**
```typescript
<h3>Eventos de hoy (0)</h3>
```
- ⚠️ **Problema:** Siempre muestra "(0)"
- ✅ **Fix:** Hacer dinámico o mostrar estado real

#### 7. Texto "Ver todos" sin Destino
**dashboard-home.tsx**
- ⚠️ **Problema:** "Ver todos" no tiene página de destino
- ✅ **Fix:** Crear página de calendario o remover el texto

#### 8. Botones de Integración sin Feedback
**integrations-page.tsx**
- ⚠️ **Problema:** Click en "Conectar" no muestra ni toast ni modal
- ✅ **Fix:** Agregar toast "Próximamente" o modal de configuración

---

## 📊 Métricas de Problemas

### Por Severidad
```
Críticos (P0):     4 problemas
Altos (P1):        3 problemas
Mejorables (P2):   3 problemas
Total:            10 problemas identificados
```

### Por Componente
```
dashboard-home.tsx:      4 problemas
integrations-page.tsx:   2 problemas
upcoming-page.tsx:       1 problema
sidebar.tsx:             1 problema
session-detail.tsx:      0 problemas (bien hecho ✅)
library-page.tsx:        0 problemas (bien hecho ✅)
starred-page.tsx:        0 problemas (bien hecho ✅)
```

---

## 🎯 Plan de Fixes

### Fase 1: Botones No Funcionales (P0)
1. ✅ Convertir "Ver todos" en link o removerlo
2. ✅ Agregar onClick a botones "Conectar" o mostrar "Próximamente"
3. ✅ Consolidar links duplicados de calendario

### Fase 2: Consistencia (P1)
4. ✅ Convertir todos `<a href>` internos a `<Link>`
5. ✅ Estandarizar border-radius
6. ✅ Fixear altura de quick action buttons

### Fase 3: Mejoras UX (P2)
7. ✅ Hacer dinámico el contador de eventos
8. ✅ Agregar feedback a botones de integración
9. ✅ Mejorar estados vacíos

---

## 🔧 Implementación

### Fix 1: "Ver todos" en Dashboard
**Antes:**
```typescript
<span className="text-xs font-semibold text-sky-600">Ver todos</span>
```

**Después:**
```typescript
<Link href="/upcoming" className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition">
  Ver todos
</Link>
```

### Fix 2: Botones "Conectar"
**Antes:**
```typescript
<button className="...">Conectar</button>
```

**Después:**
```typescript
<button 
  onClick={() => toast.info("Próximamente: Integración con " + integration.name)}
  className="..."
>
  Conectar
</button>
```

### Fix 3: Links Duplicados
**Estrategia:**
- Mantener botones en dashboard (CTA principal)
- Mantener botones en upcoming (contexto relevante)
- Hacer funcionales los de integrations page

### Fix 4: <a> → <Link>
**Buscar y reemplazar:**
```typescript
// Antes
<a href="/integrations" className="...">

// Después
<Link href="/integrations" className="...">
```

### Fix 5: Border Radius Standard
**Nuevo sistema:**
```typescript
// Cards grandes
rounded-[24px]

// Botones/cards medianas
rounded-2xl  // 16px

// Pills y botones circulares
rounded-full
```

### Fix 6: Quick Actions Altura Consistente
**Antes:**
```typescript
<p className="mt-4 text-sm font-semibold">{action.label}</p>
```

**Después:**
```typescript
<p className="mt-4 text-sm font-semibold min-h-[2.5rem] flex items-center">
  {action.label}
</p>
```

---

## ✅ Testing Checklist

### Funcionalidad
- [ ] "Ver todos" navega a /upcoming
- [ ] Botones "Conectar" muestran feedback
- [ ] Todos los links internos funcionan
- [ ] No hay console errors

### Visual
- [ ] Quick actions tienen altura consistente
- [ ] Border radius consistente en cards
- [ ] Spacing correcto en todos los componentes
- [ ] Dark mode se ve bien

### Accesibilidad
- [ ] Todos los botones tienen aria-label
- [ ] Links tienen texto descriptivo
- [ ] Colores tienen contraste adecuado

---

## 📝 Notas

### Decisiones de Diseño
1. **Eventos Hardcodeados:** Dejamos "(0)" hasta tener integración real de calendario
2. **Botones Conectar:** Mostramos toast "Próximamente" en vez de ocultar
3. **Links Duplicados:** Los mantenemos porque están en contextos diferentes

### Future Improvements
- [ ] Implementar integración real de Google Calendar
- [ ] Agregar página /upcoming completa
- [ ] Crear sistema de toasts/notifications
- [ ] Agregar loading states a todos los botones

---

**Status:** 🔄 En progreso  
**Prioridad:** Alta  
**ETA:** 30 minutos
