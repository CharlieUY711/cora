# CORE Globe — Especificaciones de Diseño e Implementación

> Documento técnico y creativo para el elemento central de la landing de CORE.  
> Versión 1.0 | Confidencial

---

## PARTE 1 — DISEÑO VISUAL

### 1.1 Concepto Central

El CORE Globe no es un mapa decorativo. Es una declaración de posicionamiento:  
**Uruguay como centro gravitacional de una red de comercio global.**

La metáfora visual: una red neuronal planetaria, donde cada ruta es un pulso de energía comercial y Uruguay es el nodo desde donde todo irradia y converge.

---

### 1.2 Guía de Estilo

#### Paleta de colores

| Rol                        | Color                  | Hex        | Uso                                              |
|----------------------------|------------------------|------------|--------------------------------------------------|
| Fondo profundo             | Midnight Navy          | `#03060F`  | Background general del globo                     |
| Superficie del globo       | Deep Space Blue        | `#050D1A`  | Fill del planeta                                 |
| Continentes               | Slate Atlas            | `#0D1F3C`  | Masa terrestre, sutil y geométrica               |
| Grilla / meridianos        | Grid Blue              | `#0A2040`  | Latitudes y longitudes, 10–15% opacity           |
| Ruta principal (origen)    | Cyan Electric          | `#00D4FF`  | Rutas desde proveedores globales → Uruguay       |
| Ruta distribución Cono Sur | Golden Trade           | `#FFB800`  | Rutas Uruguay → AR, BR, PY, CL                   |
| Ruta expansión             | Violet Pulse           | `#7C3AFF`  | Mercados emergentes / expansión futura           |
| Hub principal (Uruguay)    | White Core             | `#FFFFFF`  | Punto dominante, más grande que los demás        |
| Hubs secundarios           | Cyan dim               | `#00A8CC`  | Proveedores y distribuidores regionales          |
| Hubs terciarios            | Gold dim               | `#CC9200`  | Mercados de expansión                            |
| Texto / etiquetas          | Ice White              | `#E8F4FF`  | Labels de países, 80% opacity                   |

#### Tipografía (para motion / etiquetas)
- **Display/Labels**: `Neue Montreal` o `DM Mono` — técnico, preciso, sin serif
- **Nombre "Uruguay"**: All-caps, tracking extendido, weight 600
- **Coordenadas / datos**: Monospace, 10–11px, opacity 60%

#### Grosores y opacidades

| Elemento           | Grosor   | Opacity base | Opacity hover/activo |
|--------------------|----------|--------------|----------------------|
| Ruta principal     | 1.5px    | 70%          | 100%                 |
| Ruta distribución  | 1px      | 60%          | 90%                  |
| Ruta expansión     | 0.75px   | 40%          | 80%                  |
| Grilla del globo   | 0.5px    | 12%          | —                    |
| Contorno continentes| 0.75px  | 30%          | —                    |
| Hub principal      | r=8px    | 100%         | —                    |
| Hub secundario     | r=4–5px  | 85%          | 100%                 |

---

### 1.3 Elementos Visuales

#### A. El Globo

- **Forma**: Esfera 3D renderizada con perspectiva ligera (~15–20° de inclinación, polo norte visible)
- **Estilo de superficie**: No fotorrealista. Político/minimalista: continentes como siluetas planas, sin relieve ni topografía
- **Grilla**: Meridianos y paralelos tenues, estilo "blueprint" técnico
- **Atmósfera**: Halo sutil en el borde del globo — glow azul-eléctrico, 20–30% opacity, difuminado 8–12px
- **Iluminación**: Falsa iluminación desde la esquina superior izquierda (gradiente radial sutil) — da volumetría sin Three.js

#### B. Uruguay — Hub Principal

- **Posición**: Centro del lado visible del globo (el globo siempre rota para mostrar el Cono Sur prominente)
- **Representación**: 
  - Punto blanco brillante, radio 8–10px
  - Anillo exterior pulsante (ver comportamiento)
  - Etiqueta "URUGUAY" en tipografía técnica, siempre visible, no ocultable
  - Pequeño indicador "HUB CONO SUR" debajo, en gold, 10px
- **Destaque**: Es el único hub con glow blanco. Los demás usan glow cyan o gold

#### C. Red de Rutas

Las rutas se trazan como arcos geodésicos curvos (no líneas rectas), siguiendo la curvatura de la Tierra.

**Tipo 1 — Orígenes Globales** (color: Cyan Electric `#00D4FF`)
Destino siempre: Uruguay

| Origen            | Descripción              |
|-------------------|--------------------------|
| América del Norte | Miami / Nueva York hub   |
| Europa            | Rotterdam / Milán        |
| Turquía           | Estambul                 |
| China             | Shanghai / Shenzhen      |
| India             | Mumbai                   |
| Asia Sudoriental  | Singapur / Bangkok       |

**Tipo 2 — Distribución Cono Sur** (color: Golden Trade `#FFB800`)
Origen siempre: Uruguay

| Destino     | Descripción              |
|-------------|--------------------------|
| Argentina   | Buenos Aires             |
| Brasil      | São Paulo / Rio          |
| Paraguay    | Asunción                 |
| Chile       | Santiago                 |

**Tipo 3 — Expansión / Direct Shipments** (color: Violet Pulse `#7C3AFF`)
Rutas directas que no pasan por Uruguay (líneas más tenues)

- China → Brasil (direct)
- Europa → Argentina (direct)

#### D. Hubs Secundarios (puntos en cada destino/origen)

Cada ciudad tiene un marcador:
- **Orígenes globales**: Punto cyan, radio 4px, glow suave
- **Distribución Cono Sur**: Punto gold, radio 3.5px
- **Expansión**: Punto violeta, radio 3px, opacity 70%

Al hover: el hub se expande (radio × 1.8), aparece una etiqueta flotante con nombre + tipo de ruta.

---

### 1.4 Comportamiento y Animación

#### Rotación
- **Velocidad base**: 0.03°/frame (~1 rotación completa cada ~100 segundos)
- **Eje**: Y (horizontal), inclinación fija de 15–20°
- **Interacción**: Al hover sobre el globo, la rotación se detiene suavemente (ease-out, 800ms). Al salir, retoma con ease-in
- **Constraint**: El globo nunca gira tanto como para ocultar Uruguay por más de 2–3 segundos. Rota en un arco acotado si se implementa con límites, o se reinicia suavemente

#### Rutas animadas (Light Flow)
- **Técnica**: Partícula de luz que viaja de origen a destino por el arco geodésico
- **Velocidad**: 3–5 segundos por viaje, loop infinito, con delay escalonado entre rutas
- **Trail**: La partícula deja una estela que se desvanece (opacity 0 al 100% en el primer 30% del arco, luego fade out)
- **Frecuencia**: Orígenes globales → 1 partícula cada 4s. Distribución → 1 partícula cada 3s. Expansión → 1 partícula cada 6s
- **Dirección**: Orígenes fluyen *hacia* Uruguay. Distribución fluye *desde* Uruguay

#### Pulse de Hubs
- **Uruguay**: Anillo exterior que crece de r=10 a r=24px y desaparece (opacity 1→0), duración 2s, loop infinito. Se superponen 2 anillos con delay de 1s entre sí (efecto sonar)
- **Hubs secundarios**: Pulse similar pero más sutil, r crece de 4 a 10px, 3s, opacity 0.5→0
- **On hover**: Todos los hubs no activos bajan su opacity a 40%. El hub activo hace un pulse rápido (0.5s)

#### Entrada (Page Load)
1. `0ms–600ms`: El globo aparece desde opacity 0, scale 0.85 → 1, con ease-out-expo
2. `400ms–1200ms`: Los continentes se "dibujan" con un stroke-dashoffset animation
3. `800ms–1800ms`: Las rutas aparecen una a una con fade in escalonado (delay 150ms entre cada ruta)
4. `1600ms–2400ms`: Los hubs hacen su primer pulse
5. `2000ms+`: Animación idle se activa (rotación + partículas)

---

### 1.5 Prompt para Generador de Imágenes (AI Art / Midjourney / Firefly)

**Prompt principal (versión keyframe estático):**

```
A premium dark-background 3D globe visualization centered on South America, 
ultra-minimal continent silhouettes in deep navy #0D1F3C on a near-black 
background #03060F, glowing cyan arc routes connecting global trade hubs 
(North America, Europe, Turkey, China, India, Southeast Asia) flowing toward 
Uruguay highlighted as a glowing white focal point, golden arc routes radiating 
outward from Uruguay to Argentina, Brazil, Paraguay, Chile, purple dimmer arcs 
for direct expansion routes, subtle blue atmospheric halo around the globe edge, 
fine latitude/longitude grid at 10% opacity, small glowing dot markers at each 
city hub with cyan and gold colors matching their route type, Stripe-quality 
fintech aesthetic, deep space atmosphere, cinematic dark blue lighting from 
upper-left, technically precise, no labels, 8k render quality, no texture maps, 
flat continent fills only --ar 16:9 --style raw --q 2
```

**Variante para motion brief (Lottie / After Effects):**

```
Same as above but explicitly: seamless looping animation, particle light trails 
traveling along glowing arc paths at different speeds, Uruguay hub with pulsing 
sonar rings in white, all other hubs with subtle gold/cyan pulse rings, 
slow 360-degree Y-axis globe rotation, dark cinematic atmosphere, premium 
fintech motion design
```

---

## PARTE 2 — IMPLEMENTACIÓN FRONTEND

### 2.1 Estructura de Datos

Antes de discutir enfoques técnicos, definamos el modelo de datos canónico.

#### `routes.json` — Definición de rutas

```json
[
  {
    "id": "route-na-uy",
    "origin": "north-america",
    "destination": "uruguay",
    "type": "global-supply",
    "color": "#00D4FF",
    "weight": 1.5,
    "particleSpeed": 4000,
    "particleDelay": 0,
    "label": "América del Norte → Uruguay"
  },
  {
    "id": "route-eu-uy",
    "origin": "europe",
    "destination": "uruguay",
    "type": "global-supply",
    "color": "#00D4FF",
    "weight": 1.5,
    "particleSpeed": 4500,
    "particleDelay": 700,
    "label": "Europa → Uruguay"
  },
  {
    "id": "route-uy-ar",
    "origin": "uruguay",
    "destination": "argentina",
    "type": "cono-sur-distribution",
    "color": "#FFB800",
    "weight": 1.0,
    "particleSpeed": 2500,
    "particleDelay": 300,
    "label": "Uruguay → Argentina"
  }
  // ... demás rutas
]
```

#### `hubs.json` — Definición de hubs

```json
[
  {
    "id": "uruguay",
    "name": "Uruguay",
    "city": "Montevideo",
    "lat": -34.9011,
    "lng": -56.1915,
    "role": "main-hub",
    "size": 10,
    "color": "#FFFFFF",
    "glowColor": "#FFFFFF",
    "pulseRings": 2,
    "label": "HUB CONO SUR",
    "alwaysVisible": true
  },
  {
    "id": "north-america",
    "name": "América del Norte",
    "city": "Miami",
    "lat": 25.7617,
    "lng": -80.1918,
    "role": "global-supply",
    "size": 5,
    "color": "#00D4FF",
    "glowColor": "#00A8CC",
    "pulseRings": 1,
    "label": null
  },
  {
    "id": "argentina",
    "name": "Argentina",
    "city": "Buenos Aires",
    "lat": -34.6037,
    "lng": -58.3816,
    "role": "cono-sur-distribution",
    "size": 4,
    "color": "#FFB800",
    "glowColor": "#CC9200",
    "pulseRings": 1,
    "label": null
  }
  // ... demás hubs
]
```

---

### 2.2 Tres Enfoques Técnicos

---

#### ENFOQUE A — `react-three-fiber` (Three.js + R3F)

**Descripción**: Globo 3D real renderizado en WebGL. La esfera es una `SphereGeometry`, los continentes son geometrías extruidas o texturas, las rutas son `TubeGeometry` sobre arcos geodésicos, y las partículas son `Points` animados con shaders.

**Ventajas**:
- ✅ El resultado más visual y premium posible
- ✅ Rotación, iluminación y perspectiva totalmente reales
- ✅ Performance GPU, escala bien con muchas rutas
- ✅ Shaders custom para el glow atmosférico y los trails
- ✅ Soporte nativo a efectos post-proceso (bloom con `@react-three/postprocessing`)

**Desventajas**:
- ❌ Complejidad alta: requiere conocimiento de Three.js, shaders GLSL básicos
- ❌ Bundle size: ~300–500KB adicionales (tree-shaking ayuda)
- ❌ Tiempo de desarrollo: 3–5 días para un resultado world-class
- ❌ Requiere fallback cuidadoso para dispositivos sin WebGL

**Dependencias**:
```bash
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing
```

**Librerías complementarias**:
- `d3-geo` — para proyectar coordenadas lat/lng a posiciones 3D en la esfera
- `topojson-client` — para cargar datos de continentes en formato TopoJSON

**Performance esperado**: 60fps en desktop, ~45fps en mobile mid-range. Con `PixelRatio` limitado a 1.5 en mobile, suficientemente fluido.

**Nivel de complejidad**: ⭐⭐⭐⭐⭐ (5/5)

---

#### ENFOQUE B — Canvas 2D (pseudo-3D)

**Descripción**: Globo proyectado en un `<canvas>` HTML con proyección ortográfica o esteográfica usando `d3-geo`. Los continentes se dibujan con `geoPath`, las rutas como arcos bezier, las partículas como puntos animados con `requestAnimationFrame`.

**Ventajas**:
- ✅ Sin dependencias WebGL — funciona en cualquier browser moderno
- ✅ Control total del pixel: glow, blur, gradientes exactos
- ✅ Bundle mucho más liviano (~80KB con d3-geo)
- ✅ Más fácil de mantener para un dev frontend sin experiencia en 3D
- ✅ `OffscreenCanvas` para mover render a un Web Worker (no bloquea UI)

**Desventajas**:
- ❌ No es 3D real: la perspectiva es una ilusión. Funciona bien pero se nota
- ❌ El efecto de profundidad (rutas "detrás" del globo) requiere lógica manual
- ❌ Menos impresionante que WebGL para usuarios técnicos
- ❌ Performance en móvil puede ser irregular si no se optimiza

**Performance esperado**: 60fps en desktop, 30–45fps en mobile. Recomendable limitar `devicePixelRatio` a 2.

**Nivel de complejidad**: ⭐⭐⭐ (3/5)

**Recomendado si**: El equipo no tiene experiencia con Three.js y el tiempo de desarrollo es limitado.

---

#### ENFOQUE C — SVG Animado

**Descripción**: El globo se proyecta como SVG estático con rutas en `<path>`, animaciones con CSS `@keyframes` o la librería `motion` (Framer Motion). Las partículas se logran con `stroke-dashoffset` animation (el "dash traveling" trick).

**Ventajas**:
- ✅ Accesible y SEO-friendly (SVG es DOM)
- ✅ Muy fácil de animar con CSS o Framer Motion
- ✅ Bundle mínimo, sin dependencias de render
- ✅ Perfecto para versión mobile simplificada
- ✅ Las rutas como `stroke-dashoffset` son el estándar industry para este efecto

**Desventajas**:
- ❌ No es rotación 3D — el globo es estático o con pseudo-rotación CSS 3D (limitada)
- ❌ Con muchos paths SVG y muchas animaciones simultáneas, el navegador puede degradarse
- ❌ El efecto de "globo giratorio" es muy difícil de lograr bien con SVG solo
- ❌ Menos premium visualmente vs Canvas o WebGL

**Performance esperado**: Excelente para versión estática o con animación sutil. Puede degradarse con +20 rutas animadas simultáneamente.

**Nivel de complejidad**: ⭐⭐ (2/5)

**Recomendado para**: Mobile fallback, versión OG image, primer prototipo rápido.

---

### 2.3 Recomendación Final de Stack

```
Desktop/High-end:   Enfoque A (R3F / Three.js) con bloom post-processing
Mobile mid-range:   Enfoque B (Canvas 2D con d3-geo, DPR limitado)
Mobile low-end:     Enfoque C (SVG estático + CSS animations)
```

Detección automática:
```typescript
const useGlobeRenderer = () => {
  const [renderer, setRenderer] = useState<'webgl' | 'canvas' | 'svg'>('svg');
  
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const hasWebGL = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    const isLowEnd = navigator.hardwareConcurrency <= 2;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    
    if (hasWebGL && !isLowEnd) setRenderer('webgl');
    else if (!isMobile) setRenderer('canvas');
    else setRenderer('svg');
  }, []);
  
  return renderer;
};
```

---

### 2.4 Arquitectura del Componente `<CoreGlobe />`

#### Props Interface

```typescript
// types/globe.ts

export type RouteType = 
  | 'global-supply'       // Orígenes → Uruguay (cyan)
  | 'cono-sur-distribution' // Uruguay → Cono Sur (gold)
  | 'direct-shipment'     // Rutas directas sin pasar por Uruguay (violet)
  | 'expansion';          // Mercados futuros (violet dim)

export type HubRole = 
  | 'main-hub'            // Uruguay
  | 'global-supply'       // Proveedores globales
  | 'cono-sur-distribution' // Mercado Cono Sur
  | 'expansion';          // Mercados emergentes

export interface Route {
  id: string;
  origin: string;           // Hub ID
  destination: string;      // Hub ID
  type: RouteType;
  weight?: number;          // Grosor de línea (default: 1)
  particleSpeed?: number;   // ms por viaje de partícula
  particleDelay?: number;   // ms de delay inicial
  bidirectional?: boolean;  // Si el flujo va en ambas direcciones
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface Hub {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  role: HubRole;
  size?: number;
  color?: string;
  glowColor?: string;
  pulseRings?: number;
  label?: string;
  alwaysVisible?: boolean;
  metadata?: Record<string, unknown>;
}

export interface GlobeTheme {
  background: string;
  globeFill: string;
  continentFill: string;
  gridColor: string;
  atmosphereColor: string;
  routeColors: Record<RouteType, string>;
  hubColors: Record<HubRole, string>;
}

export interface CoreGlobeProps {
  // Datos
  routes: Route[];
  hubs: Hub[];
  
  // Estado interactivo
  highlightHub?: string;           // ID del hub a resaltar
  highlightRouteType?: RouteType;  // Filtrar por tipo de ruta
  onHubClick?: (hub: Hub) => void;
  onHubHover?: (hub: Hub | null) => void;
  onRouteClick?: (route: Route) => void;
  
  // Configuración visual
  theme?: Partial<GlobeTheme>;
  initialRotation?: [number, number]; // [lon, lat] del centro inicial
  autoRotate?: boolean;
  autoRotateSpeed?: number;          // grados por segundo, default: 0.5
  showGrid?: boolean;
  showAtmosphere?: boolean;
  showLabels?: boolean;
  
  // Renderer
  renderer?: 'webgl' | 'canvas' | 'svg' | 'auto';
  
  // Layout
  width?: number | string;
  height?: number | string;
  className?: string;
}
```

#### Estructura de Componentes

```
src/
  components/
    CoreGlobe/
      index.tsx                  ← Componente público, selecciona renderer
      CoreGlobe.tsx              ← Lógica compartida, context, estado
      
      renderers/
        WebGLGlobe.tsx           ← Implementación Three.js/R3F
        CanvasGlobe.tsx          ← Implementación Canvas 2D
        SVGGlobe.tsx             ← Implementación SVG (mobile fallback)
      
      hooks/
        useGlobeProjection.ts    ← Proyección lat/lng ↔ coordenadas pantalla
        useGlobeRotation.ts      ← Control de rotación y damping
        useParticleSystem.ts     ← Sistema de partículas para rutas
        useGlobeRenderer.ts      ← Auto-detección de renderer
      
      utils/
        geodesic.ts              ← Cálculo de arcos geodésicos
        projection.ts            ← Proyección ortográfica
        colors.ts                ← Resolución de colores por tipo
      
      data/
        defaultTheme.ts
        defaultHubs.ts           ← Hubs de CORE pre-configurados
        defaultRoutes.ts         ← Rutas de CORE pre-configuradas
      
      types.ts                   ← Re-export de types
```

#### Ejemplo de uso en la landing

```tsx
import { CoreGlobe } from '@/components/CoreGlobe';
import { CORE_HUBS, CORE_ROUTES } from '@/components/CoreGlobe/data';

export function HeroSection() {
  const [activeHub, setActiveHub] = useState<string | null>(null);

  return (
    <section className="relative min-h-screen bg-[#03060F] flex items-center">
      
      {/* Globe — ocupa todo el lado derecho en desktop, full-width en mobile */}
      <div className="absolute inset-0 lg:left-1/3">
        <CoreGlobe
          routes={CORE_ROUTES}
          hubs={CORE_HUBS}
          highlightHub={activeHub ?? 'uruguay'}
          onHubClick={(hub) => setActiveHub(hub.id)}
          onHubHover={(hub) => setActiveHub(hub?.id ?? null)}
          renderer="auto"
          autoRotate
          autoRotateSpeed={0.5}
          showLabels
          showAtmosphere
          height="100%"
          width="100%"
        />
      </div>

      {/* Copy — lado izquierdo */}
      <div className="relative z-10 max-w-lg px-8">
        <h1>Global Supply.<br />Regional Intelligence.</h1>
        <p>CORE conecta el mundo con el Cono Sur.</p>
      </div>

    </section>
  );
}
```

---

### 2.5 Lógica de Estados

#### Estados del globo

```typescript
type GlobeState = 
  | { mode: 'idle' }                           // Rotación automática
  | { mode: 'hub-focused'; hubId: string }     // Usuario hizo hover en un hub
  | { mode: 'route-highlighted'; routeType: RouteType } // Filtro activo
  | { mode: 'paused' }                         // Usuario hizo click, rotación detenida
```

#### Comportamiento por estado

| Estado              | Rotación | Rutas                          | Hubs                              |
|---------------------|----------|---------------------------------|-----------------------------------|
| `idle`              | Activa   | Todas visibles, opacity normal | Todos con pulse                   |
| `hub-focused`       | Pausada  | Solo las del hub: opacity 100%. Demás: 20% | Hub activo: scale up. Demás: dim |
| `route-highlighted` | Lenta    | Tipo seleccionado: 100%. Demás: 15% | Hubs del tipo: bright. Demás: dim |
| `paused`            | Detenida | Todas visibles                  | Todos visibles, sin pulse         |

---

### 2.6 Degradación en Mobile

#### Estrategia de tres niveles

**Nivel 1 — Mobile High-end** (flagship moderno, GPU potente)
- Canvas 2D con partículas, DPR limitado a 1.5
- Rotación activa pero más lenta
- Menos rutas simultáneas (agrupar regiones)

**Nivel 2 — Mobile Mid-range**
- SVG animado con `stroke-dashoffset` para las rutas
- Globo centrado en el Cono Sur, no rotatorio (o rotación CSS muy sutil)
- Solo rutas de distribución y 2–3 orígenes principales
- Partículas simplificadas: solo Uruguay hub con pulse

**Nivel 3 — Mobile Low-end / `prefers-reduced-motion`**
- Imagen estática WebP generada desde el diseño (se puede generar con el prompt de AI image)
- Overlay de datos encima: puntos estáticos con nombres de regiones
- Sin animaciones

```typescript
// hooks/useGlobeComplexity.ts
export const useGlobeComplexity = () => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [gpuTier, setGpuTier] = useState<1 | 2 | 3>(2);
  
  useEffect(() => {
    // getGPUTier de la librería 'detect-gpu'
    detectGPU().then(gpu => {
      setGpuTier(gpu.tier as 1 | 2 | 3);
    });
  }, []);
  
  if (prefersReducedMotion) return 'static';
  if (!isMobile && gpuTier >= 2) return 'full';
  if (isMobile && gpuTier >= 2) return 'canvas';
  return 'svg';
};
```

#### Viewport del globo en mobile

En mobile, el globo ocupa **el 60% superior de la pantalla** (hero visual), con el copy superpuesto en la mitad inferior con gradiente. No se lo esconde — es el elemento de identidad principal de la marca.

---

### 2.7 Librerías Recomendadas por Enfoque

#### Para Enfoque A (WebGL)
```json
{
  "three": "^0.176.0",
  "@react-three/fiber": "^9.0.0",
  "@react-three/drei": "^10.0.0",
  "@react-three/postprocessing": "^3.0.0",
  "d3-geo": "^3.1.1",
  "topojson-client": "^3.1.0",
  "detect-gpu": "^5.0.0"
}
```

#### Para Enfoque B (Canvas 2D)
```json
{
  "d3-geo": "^3.1.1",
  "topojson-client": "^3.1.0",
  "detect-gpu": "^5.0.0"
}
```

#### Para Enfoque C (SVG)
```json
{
  "framer-motion": "^12.0.0",
  "d3-geo": "^3.1.1"
}
```

---

### 2.8 Roadmap de Implementación Sugerido

| Semana | Entregable                                                    |
|--------|--------------------------------------------------------------|
| 1      | Prototipo SVG estático con rutas y hubs correctamente posicionados |
| 1–2    | Canvas 2D con rotación y partículas básicas                   |
| 2–3    | WebGL con R3F, bloom, y shaders de glow                      |
| 3      | Sistema de detección automática de renderer                   |
| 3–4    | Estados interactivos (hover, click, filtros)                  |
| 4      | Optimización mobile, `prefers-reduced-motion`, QA cross-browser |

---

## Apéndice: Referencias de Inspiración

- **Stripe Globe**: https://stripe.com/blog/globe  
  → Referencia directa para el estilo de arcos y partículas
- **Vercel Map**: https://vercel.com/features/infrastructure  
  → Referencia para hubs con pulse y datos en tiempo real
- **Windyty**: https://windy.com  
  → Canvas 2D con partículas a escala planetaria (técnica de referencia)
- **Brex Dashboard**: https://brex.com  
  → Paleta navy/cyan/gold y tipografía técnica

---

*CORE Globe Specs v1.0 — Documento interno*
