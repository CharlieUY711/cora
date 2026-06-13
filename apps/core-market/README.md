# 🛒 ODDY Frontstore Standalone

Frontstore independiente del marketplace ODDY. Incluye todas las funcionalidades públicas: tienda, carrito, checkout y órdenes.

## 📦 Estructura del Proyecto

```
ODDY_Front2/
├── src/
│   ├── app/
│   │   ├── public/          # Páginas públicas
│   │   ├── services/         # APIs de servicios
│   │   ├── hooks/            # Hooks personalizados
│   │   ├── routes.tsx        # Configuración de rutas
│   │   └── App.tsx           # Componente raíz
│   ├── utils/
│   │   └── supabase/         # Cliente Supabase
│   ├── styles/               # Estilos CSS
│   └── main.tsx              # Punto de entrada
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🚀 Inicio Rápido

### 1. Instalar dependencias

**Importante:** Este proyecto está en un directorio que contiene un workspace de pnpm. Usa uno de estos métodos:

**Opción 1 (Recomendada):** Usar el script incluido
```bash
pnpm run install:standalone
```

**Opción 2:** Usar el flag directamente
```bash
pnpm install --ignore-workspace
```

**Opción 3:** Usar npm en su lugar
```bash
npm install
```

### 2. Ejecutar en desarrollo

```bash
pnpm dev
# o
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### 3. Build para producción

```bash
pnpm build
# o
npm run build
```

## 📋 Funcionalidades

- ✅ **Storefront Principal**: Visualización de productos Market y Second Hand
- ✅ **Carrito de Compras**: Gestión de items en el carrito
- ✅ **Checkout**: Proceso de compra completo
- ✅ **Confirmación de Orden**: Página de confirmación post-compra
- ✅ **Mensajes**: Sistema de Etiqueta Emotiva

## 🔧 Configuración

### Variables de Supabase

Las credenciales de Supabase están en:
```
src/utils/supabase/info.ts
```

Asegúrate de que `projectId` y `publicAnonKey` estén configurados correctamente.

### Backend

Este frontend requiere que las siguientes Edge Functions de Supabase estén desplegadas:

- `/carrito`
- `/productos/market`
- `/productos/secondhand`
- `/ordenes`
- `/departamentos`

## 📚 Documentación

Para más detalles sobre los archivos y dependencias, consulta:
- `FRONTSTORE_STANDALONE.md` - Documentación completa

## 🛠️ Tecnologías

- **React 18** - Framework UI
- **React Router 7** - Enrutamiento
- **Vite** - Build tool
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **Supabase** - Backend y autenticación

## 📝 Notas

Este proyecto es una versión standalone de la frontstore, independiente del Admin Dashboard. Todos los archivos necesarios están incluidos y el proyecto puede funcionar completamente solo.

---

**Última actualización**: 2025-01-27
