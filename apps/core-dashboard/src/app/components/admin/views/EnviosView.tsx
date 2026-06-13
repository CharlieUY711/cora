/* =====================================================
   EnviosView — Módulo de Envíos Operativo
   Árbol Pedido Madre → Envíos Hijos · Multi-tramo
   ===================================================== */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { OrangeHeader } from '../OrangeHeader';
import type { MainSection } from '../../../AdminDashboard';
import {
  Truck, Package, MapPin, CheckCircle2, Clock, XCircle,
  ChevronRight, ChevronDown, Search, Eye,
  RotateCcw, Navigation, Layers, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseClient } from '../../../../shells/DashboardShell/app/hooks/useSupabaseClient';
import { DrawerForm } from '../DrawerForm';
import type { SheetDef } from '../DrawerForm';

interface Props { onNavigate: (s: MainSection) => void; }

const ORANGE = '#FF6835';

type EstadoEnvio =
  | 'creado' | 'despachado' | 'en_transito' | 'en_deposito'
  | 'en_reparto' | 'entregado' | 'fallido' | 'devuelto';

interface EventoTracking {
  fecha: string;
  hora: string;
  estado: EstadoEnvio;
  descripcion: string;
  ubicacion: string;
}

interface Envio {
  id: string;
  numero: string;
  pedidoMadre: string;
  estado: EstadoEnvio;
  origen: string;
  destino: string;
  destinatario: string;
  remitente?: string;
  carrier: string;
  tramo: 'local' | 'intercity' | 'internacional' | 'last_mile';
  peso: number;
  bultos: number;
  fechaCreacion: string;
  fechaEstimada: string;
  tracking?: string;
  eventos: EventoTracking[];
}

interface PedidoMadre {
  id: string;
  numero: string;
  cliente: string;
  envios: Envio[];
  total: number;
}

/* ── Sheets para DrawerForm ────────────────────────────────────────────── */
const ENVIO_SHEETS: SheetDef[] = [
  {
    id: 'origen',
    title: 'Origen',
    subtitle: 'Remitente y origen · ¿Desde dónde sale el envío?',
    fields: [
      { id: 'remitente',   label: 'Remitente',        type: 'text',    required: true,  placeholder: 'Ej: Empresa SA' },
      { id: 'origen',      label: 'Dirección de origen', type: 'address', required: true,  placeholder: 'Ej: Av. Italia 2500, Montevideo' },
    ],
  },
  {
    id: 'destino',
    title: 'Destino',
    subtitle: 'Destinatario y destino · ¿A dónde llega el envío?',
    fields: [
      { id: 'destinatario', label: 'Destinatario',       type: 'text',    required: true,  placeholder: 'Ej: Juan Pérez' },
      { id: 'destino',      label: 'Dirección de destino', type: 'address', required: true,  placeholder: 'Ej: Bvar. Artigas 1500, Montevideo' },
    ],
  },
  {
    id: 'detalle',
    title: 'Detalle',
    subtitle: 'Detalles del envío · Carrier, peso y tramo',
    fields: [
      { id: 'carrier', label: 'Carrier',  type: 'text',   placeholder: 'Ej: OCA', row: 'row1' },
      { id: 'tramo',   label: 'Tramo',    type: 'select', required: true,
        options: [
          { value: 'local',         label: 'Local' },
          { value: 'intercity',     label: 'Intercity' },
          { value: 'internacional', label: 'Internacional' },
          { value: 'last_mile',     label: 'Last Mile' },
        ],
        row: 'row1',
      },
      { id: 'peso',   label: 'Peso (kg)', type: 'number', placeholder: '0.00', row: 'row2' },
      { id: 'bultos', label: 'Bultos',    type: 'number', placeholder: '1',    row: 'row2' },
      { id: 'fecha_estimada', label: 'Fecha estimada de entrega', type: 'date' },
      { id: 'tracking',       label: 'Número de tracking',        type: 'text', placeholder: 'Opcional' },
    ],
  },
];

/* ── Helpers para transformar datos ─────────────────────────────────────── */
function transformEnvioRaw(row: Record<string, unknown>, eventos: Record<string, unknown>[] = []): Envio {
  const fechaCreacion = row.fecha_creacion ? new Date(row.fecha_creacion as string) : new Date();

  const eventosUI: EventoTracking[] = eventos.map(ev => {
    const fechaEv = ev.fecha ? new Date(ev.fecha as string) : new Date();
    return {
      fecha:       fechaEv.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit' }),
      hora:        fechaEv.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }),
      estado:      ev.estado as EstadoEnvio,
      descripcion: (ev.descripcion as string) || '',
      ubicacion:   (ev.ubicacion as string)  || 'Sistema',
    };
  });

  return {
    id:           row.id as string,
    numero:       (row.numero as string) || '',
    pedidoMadre:  (row.numero_pedido as string) || (row.pedido_madre_id as string) || '',
    estado:       (row.estado as EstadoEnvio) || 'creado',
    origen:       (row.origen as string) || '',
    destino:      (row.destino as string) || '',
    destinatario: (row.destinatario as string) || '',
    remitente:    (row.remitente as string) || '',
    carrier:      (row.carrier as string) || '',
    tramo:        (row.tramo as Envio['tramo']) || 'local',
    peso:         Number(row.peso) || 0,
    bultos:       Number(row.bultos) || 1,
    fechaCreacion: fechaCreacion.toISOString().split('T')[0],
    fechaEstimada: (row.fecha_estimada as string) || '',
    tracking:     (row.tracking as string) || undefined,
    eventos:      eventosUI,
  };
}

// Agrupa envíos por pedido madre
function agruparPorPedido(envios: Envio[]): PedidoMadre[] {
  const grupos = new Map<string, { numero: string; cliente: string; envios: Envio[]; total: number }>();

  envios.forEach(envio => {
    const pedidoKey = envio.pedidoMadre || 'sin-pedido';
    if (!grupos.has(pedidoKey)) {
      grupos.set(pedidoKey, {
        numero: envio.pedidoMadre || 'Sin pedido',
        cliente: envio.destinatario,
        envios: [],
        total: 0,
      });
    }
    const grupo = grupos.get(pedidoKey)!;
    grupo.envios.push(envio);
    grupo.total += 0;
  });

  return Array.from(grupos.entries()).map(([id, data]) => ({ id, ...data }));
}

/* ── Estado config ─────────────────────────────────── */
const ESTADO_CFG: Record<EstadoEnvio, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  creado:      { label: 'Creado',        color: '#6B7280', bg: '#F3F4F6', icon: Package      },
  despachado:  { label: 'Despachado',    color: '#2563EB', bg: '#EFF6FF', icon: Truck        },
  en_transito: { label: 'En tránsito',   color: '#7C3AED', bg: '#F5F3FF', icon: Navigation   },
  en_deposito: { label: 'En depósito',   color: '#D97706', bg: '#FFFBEB', icon: Layers       },
  en_reparto:  { label: 'En reparto',    color: '#FF6835', bg: '#FFF4EC', icon: MapPin       },
  entregado:   { label: 'Entregado',     color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  fallido:     { label: 'Fallido',       color: '#DC2626', bg: '#FEF2F2', icon: XCircle      },
  devuelto:    { label: 'Devuelto',      color: '#9CA3AF', bg: '#F9FAFB', icon: RotateCcw    },
};

const TRAMO_CFG: Record<string, { label: string; color: string }> = {
  local:         { label: 'Local',          color: '#059669' },
  intercity:     { label: 'Intercity',      color: '#2563EB' },
  internacional: { label: 'Internacional',  color: '#7C3AED' },
  last_mile:     { label: 'Last Mile',      color: '#D97706' },
};

function StatCard({ label, value, sub, color, icon: Icon }: { label: string; value: string | number; sub?: string; color: string; icon: React.ElementType }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '22px', fontWeight: 800, color: '#111', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '3px' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: color, marginTop: '2px', fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: EstadoEnvio }) {
  const cfg = ESTADO_CFG[estado];
  const Icon = cfg.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', backgroundColor: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

export function EnviosView({ onNavigate }: Props) {
  const supabase = useSupabaseClient();

  const [pedidos,          setPedidos]          = useState<PedidoMadre[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [expandedPedidos,  setExpandedPedidos]  = useState<Set<string>>(new Set());
  const [selectedEnvio,    setSelectedEnvio]    = useState<Envio | null>(null);
  const [search,           setSearch]           = useState('');
  const [filterEstado,     setFilterEstado]     = useState<EstadoEnvio | 'todos'>('todos');
  const [filterTramo,      setFilterTramo]      = useState<string>('todos');
  const [refreshing,       setRefreshing]       = useState(false);
  const [drawerOpen,       setDrawerOpen]       = useState(false);
  const [saving,           setSaving]           = useState(false);

  // ── Cargar envíos desde Supabase ──────────────────────────────────────────
  const loadEnvios = useCallback(async () => {
    if (!supabase) return;
    try {
      setLoading(true);

      let query = supabase.from('envios').select('*').order('fecha_creacion', { ascending: false });
      if (filterEstado !== 'todos') query = query.eq('estado', filterEstado);
      if (filterTramo  !== 'todos') query = query.eq('tramo',  filterTramo);

      const { data: enviosData, error: enviosError } = await query;
      if (enviosError) throw enviosError;

      const rows = (enviosData ?? []) as Record<string, unknown>[];

      // Cargar eventos de tracking para estos envíos
      const ids = rows.map(r => r.id as string).filter(Boolean);
      let eventosMap = new Map<string, Record<string, unknown>[]>();

      if (ids.length > 0) {
        const { data: eventosData } = await supabase
          .from('envios_eventos')
          .select('*')
          .in('envio_id', ids)
          .order('fecha', { ascending: false });

        (eventosData ?? []).forEach((ev: Record<string, unknown>) => {
          const envioId = ev.envio_id as string;
          if (!eventosMap.has(envioId)) eventosMap.set(envioId, []);
          eventosMap.get(envioId)!.push(ev);
        });
      }

      const enviosTransformados = rows.map(row =>
        transformEnvioRaw(row, eventosMap.get(row.id as string) ?? [])
      );

      const pedidosAgrupados = agruparPorPedido(enviosTransformados);
      setPedidos(pedidosAgrupados);

      setExpandedPedidos(prev => {
        if (prev.size === 0 && pedidosAgrupados.length > 0) {
          return new Set([pedidosAgrupados[0].id]);
        }
        return prev;
      });
    } catch (err) {
      console.error('[EnviosView] Error cargando envíos:', err);
      toast.error('Error al cargar envíos');
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, filterEstado, filterTramo]);

  useEffect(() => {
    loadEnvios();
  }, [loadEnvios]);

  // ── Guardar nuevo envío ───────────────────────────────────────────────────
  const handleSaveEnvio = async (formData: Record<string, unknown>) => {
    if (!supabase) return;
    setSaving(true);
    try {
      const { error: insertError } = await supabase.from('envios').insert({
        remitente:       formData.remitente      as string,
        origen:          formData.origen         as string,
        destino:         formData.destino        as string,
        destinatario:    formData.destinatario   as string,
        carrier:         formData.carrier        as string  ?? '',
        tramo:           formData.tramo          as string  ?? 'local',
        peso:            formData.peso           ? Number(formData.peso) : 0,
        bultos:          formData.bultos         ? Number(formData.bultos) : 1,
        fecha_estimada:  formData.fecha_estimada as string  ?? null,
        tracking:        formData.tracking       as string  ?? null,
        estado:          'creado',
      });

      if (insertError) throw insertError;

      toast.success('Envío creado exitosamente');
      setDrawerOpen(false);
      await loadEnvios();
    } catch (err) {
      console.error('[EnviosView] Error guardando envío:', err);
      toast.error('Error al guardar el envío');
    } finally {
      setSaving(false);
    }
  };

  const togglePedido = (id: string) => {
    setExpandedPedidos(prev => {
      const ne = new Set(prev);
      ne.has(id) ? ne.delete(id) : ne.add(id);
      return ne;
    });
  };

  // ── Actualizar estado de envío ────────────────────────────────────────────
  const handleUpdateEstado = async (envioId: string, nuevoEstado: EstadoEnvio, descripcion?: string) => {
    if (!supabase) return;
    try {
      setRefreshing(true);

      const { error: updateError } = await supabase
        .from('envios')
        .update({ estado: nuevoEstado })
        .eq('id', envioId);
      if (updateError) throw updateError;

      await supabase.from('envios_eventos').insert({
        envio_id:    envioId,
        estado:      nuevoEstado,
        descripcion: descripcion || `Estado cambiado a ${nuevoEstado}`,
        ubicacion:   'Sistema',
        fecha:       new Date().toISOString(),
      });

      toast.success('Estado actualizado');
      await loadEnvios();
    } catch (err) {
      toast.error('Error actualizando estado');
    } finally {
      setRefreshing(false);
    }
  };

  // ── Estadísticas ──────────────────────────────────────────────────────────
  const allEnvios = pedidos.flatMap(p => p.envios);
  const stats = {
    total:       allEnvios.length,
    entregados:  allEnvios.filter(e => e.estado === 'entregado').length,
    en_transito: allEnvios.filter(e => ['en_transito', 'despachado', 'en_reparto', 'en_deposito'].includes(e.estado)).length,
    fallidos:    allEnvios.filter(e => e.estado === 'fallido').length,
    pendientes:  allEnvios.filter(e => e.estado === 'creado').length,
  };

  // ── Filtro de pedidos ─────────────────────────────────────────────────────
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      const matchSearch = !search ||
        p.numero.toLowerCase().includes(search.toLowerCase()) ||
        p.cliente.toLowerCase().includes(search.toLowerCase()) ||
        p.envios.some(e => e.numero.toLowerCase().includes(search.toLowerCase()) || e.destinatario.toLowerCase().includes(search.toLowerCase()));
      if (!matchSearch) return false;
      if (filterEstado !== 'todos' && !p.envios.some(e => e.estado === filterEstado)) return false;
      if (filterTramo  !== 'todos' && !p.envios.some(e => e.tramo  === filterTramo))  return false;
      return true;
    });
  }, [pedidos, search, filterEstado, filterTramo]);

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} color={ORANGE} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#6B7280', marginTop: 12, fontSize: '0.875rem' }}>Cargando envíos...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <OrangeHeader
        icon={Truck}
        title="Envíos"
        subtitle={`${stats.total} envíos totales · ${stats.en_transito} en tránsito · ${stats.entregados} entregados`}
        actions={[
          { label: '← Logística', onClick: () => onNavigate('logistica') },
          { label: refreshing ? 'Actualizando...' : '🔄 Actualizar', onClick: () => loadEnvios() },
          { label: '+ Nuevo Envío', primary: true, onClick: () => setDrawerOpen(true) },
        ]}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', backgroundColor: '#F8F9FA' }}>
        {/* ── Panel principal ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', padding: '20px 20px 0' }}>
            <StatCard label="Total Envíos"  value={stats.total}       color="#6B7280" icon={Package}      />
            <StatCard label="En Tránsito"   value={stats.en_transito} color="#7C3AED" icon={Navigation}   />
            <StatCard label="En Reparto"    value={allEnvios.filter(e=>e.estado==='en_reparto').length} color={ORANGE} icon={Truck} />
            <StatCard label="Entregados"    value={stats.entregados}  color="#059669" icon={CheckCircle2} />
            <StatCard label="Fallidos"      value={stats.fallidos}    color="#DC2626" icon={XCircle}      sub={stats.fallidos > 0 ? 'Requieren atención' : undefined} />
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: '10px', padding: '16px 20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar pedido, cliente, envío..."
                style={{ width: '100%', paddingLeft: '34px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value as EstadoEnvio | 'todos')}
              style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', cursor: 'pointer' }}>
              <option value="todos">Todos los estados</option>
              {Object.entries(ESTADO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterTramo} onChange={e => setFilterTramo(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', cursor: 'pointer' }}>
              <option value="todos">Todos los tramos</option>
              {Object.entries(TRAMO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{pedidosFiltrados.length} pedidos · {pedidosFiltrados.flatMap(p=>p.envios).length} envíos</span>
          </div>

          {/* Árbol Pedidos → Envíos */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pedidosFiltrados.map(pedido => {
                const isOpen = expandedPedidos.has(pedido.id);
                const estadosEnvios = pedido.envios.map(e => e.estado);
                const hayFallido = estadosEnvios.includes('fallido');
                const todosEntregados = estadosEnvios.every(s => s === 'entregado');
                return (
                  <div key={pedido.id} style={{ backgroundColor: '#fff', borderRadius: '12px', border: `1px solid ${hayFallido ? '#FCA5A5' : todosEntregados ? '#A7F3D0' : '#E5E7EB'}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    {/* Cabecera del pedido madre */}
                    <button
                      onClick={() => togglePedido(pedido.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', border: 'none', backgroundColor: todosEntregados ? '#F0FDF4' : hayFallido ? '#FFF5F5' : '#FAFAFA', cursor: 'pointer', textAlign: 'left' }}
                    >
                      {isOpen ? <ChevronDown size={16} color="#6B7280" /> : <ChevronRight size={16} color="#6B7280" />}
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: todosEntregados ? '#D1FAE5' : hayFallido ? '#FEE2E2' : '#FFF4EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Package size={16} color={todosEntregados ? '#059669' : hayFallido ? '#DC2626' : ORANGE} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#111' }}>{pedido.numero}</span>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>·</span>
                          <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{pedido.cliente}</span>
                          {hayFallido     && <span style={{ fontSize: '10px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '2px 7px', borderRadius: '10px' }}>⚠ Tiene fallidos</span>}
                          {todosEntregados && <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669', backgroundColor: '#D1FAE5', padding: '2px 7px', borderRadius: '10px' }}>✓ Todo entregado</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                          {pedido.envios.length} envío{pedido.envios.length > 1 ? 's' : ''} · Total: ${pedido.total.toLocaleString('es-UY')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                        {pedido.envios.map(e => (
                          <EstadoBadge key={e.id} estado={e.estado} />
                        ))}
                      </div>
                    </button>

                    {/* Envíos hijos */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid #E5E7EB' }}>
                        {pedido.envios.map((envio, idx) => {
                          const cfg      = ESTADO_CFG[envio.estado];
                          const tramoCfg = TRAMO_CFG[envio.tramo];
                          const Icon     = cfg.icon;
                          const isSelected = selectedEnvio?.id === envio.id;
                          return (
                            <div
                              key={envio.id}
                              onClick={() => setSelectedEnvio(isSelected ? null : envio)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px 18px 12px 50px',
                                borderTop: idx > 0 ? '1px solid #F3F4F6' : 'none',
                                cursor: 'pointer',
                                backgroundColor: isSelected ? '#FFF4EC' : 'transparent',
                                transition: 'background 0.12s',
                              }}
                            >
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0 }} />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', fontFamily: 'monospace' }}>{envio.numero}</span>
                                  <EstadoBadge estado={envio.estado} />
                                  <span style={{ fontSize: '10px', fontWeight: 600, color: tramoCfg.color, backgroundColor: `${tramoCfg.color}18`, padding: '2px 7px', borderRadius: '10px' }}>{tramoCfg.label}</span>
                                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{envio.carrier}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                  <span>📍 {envio.destino}</span>
                                  <span>👤 {envio.destinatario}</span>
                                  <span>📦 {envio.peso}kg · {envio.bultos} bulto{envio.bultos > 1 ? 's' : ''}</span>
                                  <span>📅 Est. {envio.fechaEstimada}</span>
                                  {envio.tracking && <span style={{ color: '#2563EB', fontWeight: 600 }}>🔍 {envio.tracking}</span>}
                                </div>
                              </div>
                              <Eye size={14} color={isSelected ? ORANGE : '#D1D5DB'} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Estado vacío */}
              {pedidosFiltrados.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF' }}>
                  <Package size={40} color="#E5E7EB" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>No hay envíos</p>
                  <p style={{ fontSize: '12px', margin: 0 }}>Creá el primer envío con el botón "+ Nuevo Envío"</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Panel de detalle ── */}
        {selectedEnvio && (
          <div style={{ width: '360px', backgroundColor: '#fff', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
            {/* Header del panel */}
            <div style={{ padding: '20px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#374151', fontFamily: 'monospace' }}>{selectedEnvio.numero}</span>
                <button onClick={() => setSelectedEnvio(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '18px', lineHeight: 1, padding: '2px' }}>×</button>
              </div>
              <EstadoBadge estado={selectedEnvio.estado} />
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  ['Carrier',      selectedEnvio.carrier],
                  ['Tramo',        TRAMO_CFG[selectedEnvio.tramo]?.label ?? selectedEnvio.tramo],
                  ['Remitente',    selectedEnvio.remitente || '—'],
                  ['Origen',       selectedEnvio.origen],
                  ['Destino',      selectedEnvio.destino],
                  ['Destinatario', selectedEnvio.destinatario],
                  ['Peso',         `${selectedEnvio.peso} kg · ${selectedEnvio.bultos} bulto${selectedEnvio.bultos > 1 ? 's' : ''}`],
                  ['F. estimada',  selectedEnvio.fechaEstimada],
                  ...(selectedEnvio.tracking ? [['Tracking #', selectedEnvio.tracking]] : []),
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                    <span style={{ color: '#9CA3AF', width: '90px', flexShrink: 0 }}>{label}</span>
                    <span style={{ color: '#111', fontWeight: 500, flex: 1 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline de eventos */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Historial de seguimiento</p>
              <div style={{ position: 'relative' }}>
                {selectedEnvio.eventos.map((ev, idx) => {
                  const cfg    = ESTADO_CFG[ev.estado];
                  const Icon   = cfg.icon;
                  const isFirst = idx === 0;
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '12px', paddingBottom: '16px', position: 'relative' }}>
                      {idx < selectedEnvio.eventos.length - 1 && (
                        <div style={{ position: 'absolute', left: '14px', top: '28px', bottom: 0, width: '2px', backgroundColor: '#E5E7EB' }} />
                      )}
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: isFirst ? cfg.bg : '#F3F4F6', border: `2px solid ${isFirst ? cfg.color : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                        <Icon size={12} color={isFirst ? cfg.color : '#9CA3AF'} />
                      </div>
                      <div style={{ flex: 1, paddingTop: '4px' }}>
                        <div style={{ fontSize: '12px', fontWeight: isFirst ? 700 : 500, color: isFirst ? cfg.color : '#374151' }}>{ev.descripcion}</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{ev.ubicacion} · {ev.fecha} {ev.hora}</div>
                      </div>
                    </div>
                  );
                })}
                {selectedEnvio.eventos.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>Sin eventos registrados aún.</p>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button style={{ flex: 1, padding: '9px', border: `1.5px solid ${ORANGE}`, borderRadius: '8px', backgroundColor: 'transparent', color: ORANGE, fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                Ver tracking externo
              </button>
              {selectedEnvio.estado === 'fallido' && (
                <button
                  onClick={() => handleUpdateEstado(selectedEnvio.id, 'creado', 'Re-despachado después de fallo')}
                  style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '8px', backgroundColor: ORANGE, color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Re-despachar
                </button>
              )}
              {selectedEnvio.estado === 'creado' && (
                <button
                  onClick={() => handleUpdateEstado(selectedEnvio.id, 'despachado', 'Envío despachado')}
                  style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '8px', backgroundColor: '#2563EB', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Despachar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DrawerForm — Nuevo Envío */}
      <DrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveEnvio}
        title="Nuevo Envío"
        icon={Truck}
        sheets={ENVIO_SHEETS}
        loading={saving}
      />
    </div>
  );
}
