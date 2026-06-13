/**
 * MODULES_DATA — Datos base de todos los módulos del roadmap
 * ═══════════════════════════════════════════════════════════
 * Fuente única de verdad para name, category, description, submodules, etc.
 * Estos datos se combinan con el estado dinámico de roadmap_modules (SQL).
 */

export interface ModuleBaseData {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedHours?: number;
  submodules?: Array<{
    id: string;
    name: string;
    estimatedHours?: number;
  }>;
}

export const MODULES_DATA: ModuleBaseData[] = [
  // ══════════════════════════════════════════════════════
  // ADMIN / SISTEMA
  // ══════════════════════════════════════════════════════
  {
    id: 'admin-settings',
    name: 'Configuración del Sistema',
    category: 'admin',
    description: 'Configuración general del sistema, parámetros y ajustes',
    estimatedHours: 8,
  },
  {
    id: 'admin-users',
    name: 'Gestión de Usuarios',
    category: 'admin',
    description: 'Administración de usuarios, roles y permisos',
    estimatedHours: 12,
  },

  // ══════════════════════════════════════════════════════
  // BASE DE PERSONAS
  // ══════════════════════════════════════════════════════
  {
    id: 'base-personas',
    name: 'Base de Personas',
    category: 'crm',
    description: 'CRUD completo de personas físicas y jurídicas',
    estimatedHours: 16,
  },

  // ══════════════════════════════════════════════════════
  // eCOMMERCE
  // ══════════════════════════════════════════════════════
  {
    id: 'ecommerce-pedidos',
    name: 'Pedidos eCommerce',
    category: 'ecommerce',
    description: 'Gestión y seguimiento de pedidos con estados y pipeline visual',
    estimatedHours: 24,
  },
  {
    id: 'ecommerce-metodos-pago',
    name: 'Métodos de Pago',
    category: 'ecommerce',
    description: 'Configuración de pasarelas de pago y métodos de cobro',
    estimatedHours: 16,
    submodules: [
      { id: 'metodos-pago-plexo', name: 'Plexo', estimatedHours: 4 },
      { id: 'metodos-pago-mercadopago', name: 'Mercado Pago', estimatedHours: 4 },
      { id: 'metodos-pago-paypal', name: 'PayPal', estimatedHours: 4 },
      { id: 'metodos-pago-stripe', name: 'Stripe', estimatedHours: 4 },
    ],
  },
  {
    id: 'ecommerce-metodos-envio',
    name: 'Métodos de Envío',
    category: 'ecommerce',
    description: 'Configuración de métodos de envío y tarifas',
    estimatedHours: 12,
  },

  // ══════════════════════════════════════════════════════
  // LOGÍSTICA
  // ══════════════════════════════════════════════════════
  {
    id: 'logistics-hub',
    name: 'Hub Logístico',
    category: 'logistics',
    description: 'Centro de operaciones logísticas con diagrama de flujo',
    estimatedHours: 8,
  },
  {
    id: 'logistics-shipping',
    name: 'Envíos',
    category: 'logistics',
    description: 'Gestión de envíos con árbol pedido→envíos y timeline de tracking',
    estimatedHours: 20,
  },
  {
    id: 'logistics-carriers',
    name: 'Transportistas',
    category: 'logistics',
    description: 'Catálogo de carriers, tramos, zonas y simulador de tarifas',
    estimatedHours: 16,
  },
  {
    id: 'logistics-routes',
    name: 'Rutas',
    category: 'logistics',
    description: 'Rutas estándar y por proyecto con paradas y progreso de entrega',
    estimatedHours: 16,
  },
  {
    id: 'logistics-fulfillment',
    name: 'Fulfillment',
    category: 'logistics',
    description: 'Wave picking, lotes, cola de órdenes, empaque y materiales',
    estimatedHours: 20,
  },
  {
    id: 'logistics-production',
    name: 'Producción / Armado',
    category: 'logistics',
    description: 'BOM, órdenes de armado, catálogo de kits y combos',
    estimatedHours: 20,
  },
  {
    id: 'logistics-supply',
    name: 'Abastecimiento',
    category: 'logistics',
    description: 'Alertas de stock, OC sugeridas y MRP',
    estimatedHours: 16,
  },
  {
    id: 'logistics-map',
    name: 'Mapa de Envíos',
    category: 'logistics',
    description: 'Mapa SVG de Argentina con puntos de envíos activos',
    estimatedHours: 12,
  },
  {
    id: 'logistics-tracking',
    name: 'Tracking Público',
    category: 'logistics',
    description: 'Búsqueda por número de envío y timeline de estados',
    estimatedHours: 12,
  },
  {
    id: 'logistics-integraciones',
    name: 'Integraciones Logística',
    category: 'logistics',
    description: 'Carriers con y sin API, Google Maps Platform',
    estimatedHours: 16,
  },

  // ══════════════════════════════════════════════════════
  // MARKETING
  // ══════════════════════════════════════════════════════
  {
    id: 'marketing-campaigns',
    name: 'Campañas de Marketing',
    category: 'marketing',
    description: 'Gestión de campañas de marketing y publicidad',
    estimatedHours: 16,
  },
  {
    id: 'marketing-email',
    name: 'Email Marketing',
    category: 'marketing',
    description: 'Envío de emails transaccionales y campañas',
    estimatedHours: 12,
  },
  {
    id: 'marketing-email-bulk',
    name: 'Email Masivo',
    category: 'marketing',
    description: 'Campañas masivas de email con segmentación',
    estimatedHours: 16,
  },
  {
    id: 'marketing-seo',
    name: 'SEO',
    category: 'marketing',
    description: 'Optimización SEO, keywords, rankings y análisis on-page',
    estimatedHours: 20,
  },
  {
    id: 'marketing-loyalty',
    name: 'Fidelización',
    category: 'marketing',
    description: 'Programa de puntos, recompensas y rueda de sorteos',
    estimatedHours: 20,
  },
  {
    id: 'marketing-etiqueta-emotiva',
    name: 'Etiqueta Emotiva',
    category: 'marketing',
    description: 'Generador de etiquetas personalizadas con QR para envíos',
    estimatedHours: 12,
  },

  // ══════════════════════════════════════════════════════
  // RRSS
  // ══════════════════════════════════════════════════════
  {
    id: 'rrss-centro-operativo',
    name: 'Centro Operativo RRSS',
    category: 'rrss',
    description: 'Métricas, programación de posts y análisis de audiencia',
    estimatedHours: 20,
  },
  {
    id: 'rrss-migracion',
    name: 'Migración RRSS',
    category: 'rrss',
    description: 'Herramienta de migración/rebranding Instagram + Facebook',
    estimatedHours: 16,
  },

  // ══════════════════════════════════════════════════════
  // HERRAMIENTAS
  // ══════════════════════════════════════════════════════
  {
    id: 'tools-library',
    name: 'Biblioteca de Assets',
    category: 'tools',
    description: 'Biblioteca de assets con upload, colecciones y tags',
    estimatedHours: 16,
  },
  {
    id: 'tools-image-editor',
    name: 'Editor de Imágenes',
    category: 'tools',
    description: 'Editor de imágenes con filtros, rotación y export',
    estimatedHours: 12,
  },
  {
    id: 'tools-documents',
    name: 'Generador de Documentos',
    category: 'tools',
    description: 'Generador WYSIWYG de documentos con export PDF',
    estimatedHours: 16,
  },
  {
    id: 'tools-quotes',
    name: 'Generador de Presupuestos',
    category: 'tools',
    description: 'Generador de presupuestos con ítems, IVA y multi-moneda',
    estimatedHours: 16,
  },
  {
    id: 'tools-ocr',
    name: 'OCR',
    category: 'tools',
    description: 'OCR con Tesseract.js, 100% browser, sin API key',
    estimatedHours: 12,
  },
  {
    id: 'tools-print',
    name: 'Impresión',
    category: 'tools',
    description: 'Módulo de impresión con cola de trabajos y preview',
    estimatedHours: 12,
  },
  {
    id: 'tools-qr',
    name: 'Generador QR',
    category: 'tools',
    description: 'Generador QR sin APIs externas, genera PNG y SVG',
    estimatedHours: 8,
  },
  {
    id: 'tools-ideas-board',
    name: 'Ideas Board',
    category: 'tools',
    description: 'Canvas visual de módulos e ideas con stickers y conectores',
    estimatedHours: 20,
  },

  // ══════════════════════════════════════════════════════
  // ERP
  // ══════════════════════════════════════════════════════
  {
    id: 'erp-inventory',
    name: 'ERP Inventario',
    category: 'erp',
    description: 'Control de stock, inventario, movimientos y alertas',
    estimatedHours: 24,
  },
  {
    id: 'erp-invoicing',
    name: 'ERP Facturación',
    category: 'erp',
    description: 'Facturación electrónica y comprobantes',
    estimatedHours: 20,
  },
  {
    id: 'erp-purchasing',
    name: 'ERP Compras',
    category: 'erp',
    description: 'Gestión de compras y proveedores',
    estimatedHours: 20,
  },
  {
    id: 'erp-accounting',
    name: 'ERP Contabilidad',
    category: 'erp',
    description: 'Contabilidad, plan de cuentas, asientos y bancos',
    estimatedHours: 24,
  },
  {
    id: 'erp-hr',
    name: 'ERP RRHH',
    category: 'erp',
    description: 'Empleados, asistencia y nómina',
    estimatedHours: 20,
  },

  // ══════════════════════════════════════════════════════
  // CRM
  // ══════════════════════════════════════════════════════
  {
    id: 'crm-contacts',
    name: 'CRM Contactos',
    category: 'crm',
    description: 'Gestión de contactos y relaciones',
    estimatedHours: 16,
  },
  {
    id: 'crm-opportunities',
    name: 'CRM Oportunidades',
    category: 'crm',
    description: 'Pipeline de oportunidades y ventas',
    estimatedHours: 20,
  },
  {
    id: 'crm-activities',
    name: 'CRM Actividades',
    category: 'crm',
    description: 'Actividades y seguimiento de clientes',
    estimatedHours: 16,
  },

  // ══════════════════════════════════════════════════════
  // PROYECTOS
  // ══════════════════════════════════════════════════════
  {
    id: 'projects-management',
    name: 'Gestión de Proyectos',
    category: 'projects',
    description: 'Gestión de proyectos con Gantt y Kanban',
    estimatedHours: 24,
  },
  {
    id: 'projects-tasks',
    name: 'Tareas de Proyectos',
    category: 'projects',
    description: 'Gestión de tareas y subtareas',
    estimatedHours: 16,
  },
  {
    id: 'projects-time',
    name: 'Tiempo de Proyectos',
    category: 'projects',
    description: 'Seguimiento de tiempo y recursos',
    estimatedHours: 12,
  },

  // ══════════════════════════════════════════════════════
  // MARKETPLACE
  // ══════════════════════════════════════════════════════
  {
    id: 'marketplace-productos',
    name: 'Productos Marketplace',
    category: 'marketplace',
    description: 'Catálogo de productos del marketplace',
    estimatedHours: 20,
  },
  {
    id: 'marketplace-departamentos',
    name: 'Departamentos',
    category: 'marketplace',
    description: 'Gestión de departamentos y categorías',
    estimatedHours: 12,
  },
  {
    id: 'marketplace-carrito',
    name: 'Carrito',
    category: 'marketplace',
    description: 'Gestión de carrito de compras',
    estimatedHours: 16,
  },
  {
    id: 'marketplace-storefront',
    name: 'Storefront',
    category: 'marketplace',
    description: 'Vista pública del marketplace',
    estimatedHours: 24,
  },
  {
    id: 'marketplace-secondhand',
    name: 'Segunda Mano',
    category: 'marketplace',
    description: 'Marketplace de productos de segunda mano',
    estimatedHours: 24,
  },
  {
    id: 'marketplace-secondhand-mediacion',
    name: 'Mediación Segunda Mano',
    category: 'marketplace',
    description: 'Sistema de mediación de disputas',
    estimatedHours: 16,
  },

  // ══════════════════════════════════════════════════════
  // INTEGRACIONES
  // ══════════════════════════════════════════════════════
  {
    id: 'integrations-mercadolibre',
    name: 'Integración MercadoLibre',
    category: 'integrations',
    description: 'Integración con MercadoLibre para sincronización de productos',
    estimatedHours: 20,
  },
  {
    id: 'integrations-mercadopago',
    name: 'Integración Mercado Pago',
    category: 'integrations',
    description: 'Integración con Mercado Pago para pagos',
    estimatedHours: 16,
  },
  {
    id: 'integrations-plexo',
    name: 'Integración Plexo',
    category: 'integrations',
    description: 'Integración con Plexo para pagos en Uruguay',
    estimatedHours: 16,
  },
  {
    id: 'integrations-paypal',
    name: 'Integración PayPal',
    category: 'integrations',
    description: 'Integración con PayPal para pagos internacionales',
    estimatedHours: 16,
  },
  {
    id: 'integrations-stripe',
    name: 'Integración Stripe',
    category: 'integrations',
    description: 'Integración con Stripe para pagos con tarjeta',
    estimatedHours: 16,
  },
  {
    id: 'integrations-meta',
    name: 'Integración Meta',
    category: 'integrations',
    description: 'Integración con Meta para Facebook e Instagram',
    estimatedHours: 20,
  },
  {
    id: 'integrations-twilio',
    name: 'Integración Twilio',
    category: 'integrations',
    description: 'Integración con Twilio para SMS y WhatsApp',
    estimatedHours: 16,
  },
  {
    id: 'integrations-logistics',
    name: 'Integraciones Logística',
    category: 'integrations',
    description: 'Integraciones con carriers y servicios logísticos',
    estimatedHours: 16,
  },

  // ══════════════════════════════════════════════════════
  // AUDITORÍA & DIAGNÓSTICO
  // ══════════════════════════════════════════════════════
  {
    id: 'audit-hub',
    name: 'Hub Auditoría',
    category: 'audit',
    description: 'Centro de auditoría con métricas y diagnóstico rápido',
    estimatedHours: 12,
  },
  {
    id: 'audit-health',
    name: 'Health Monitor',
    category: 'audit',
    description: 'Monitoreo de salud de servicios en tiempo real',
    estimatedHours: 16,
  },
  {
    id: 'audit-logs',
    name: 'System Logs',
    category: 'audit',
    description: 'Visualización de logs del sistema con filtros',
    estimatedHours: 12,
  },
  {
    id: 'audit-apis-repo',
    name: 'Repositorio de APIs',
    category: 'audit',
    description: 'Repositorio centralizado de APIs externas',
    estimatedHours: 16,
  },
];

/**
 * Mapa rápido de ID → datos base
 */
export const MODULES_DATA_MAP = new Map<string, ModuleBaseData>(
  MODULES_DATA.map(m => [m.id, m])
);
