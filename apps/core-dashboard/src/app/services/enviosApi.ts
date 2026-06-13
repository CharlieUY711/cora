import { supabase } from '../../utils/supabase/client';

const TENANT = 'oddy';

export type EstadoEnvio =
  | 'creado' | 'despachado' | 'en_transito' | 'en_deposito'
  | 'en_reparto' | 'entregado' | 'fallido' | 'devuelto';

export type Tramo = 'local' | 'intercity' | 'internacional' | 'last_mile';

export interface Envio {
  id: string;
  numero: string;
  pedido_madre_id?: string;
  numero_pedido?: string;
  estado: EstadoEnvio;
  tracking?: string;
  origen: string;
  destino: string;
  destinatario: string;
  telefono?: string;
  email?: string;
  lat_origen?: number;
  lng_origen?: number;
  lat_destino?: number;
  lng_destino?: number;
  carrier: string;
  tramo: Tramo;
  es_multi_tramo?: boolean;
  tramos?: any[];
  peso: number;
  bultos: number;
  volumen?: number;
  fecha_creacion: string;
  fecha_despacho?: string;
  fecha_estimada?: string;
  fecha_entrega?: string;
  acuse_recibido?: boolean;
  acuse_fecha?: string;
  acuse_firmado_por?: string;
  acuse_firma_url?: string;
  notas?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface EventoTracking {
  id: string;
  envio_id: string;
  estado: EstadoEnvio;
  descripcion: string;
  ubicacion?: string;
  lat?: number;
  lng?: number;
  fecha: string;
  origen: 'sistema' | 'carrier' | 'manual';
  created_at: string;
}

export interface EnvioInput {
  pedido_madre_id?: string;
  numero_pedido?: string;
  estado?: EstadoEnvio;
  tracking?: string;
  origen: string;
  destino: string;
  destinatario: string;
  telefono?: string;
  email?: string;
  lat_origen?: number;
  lng_origen?: number;
  lat_destino?: number;
  lng_destino?: number;
  carrier: string;
  tramo?: Tramo;
  es_multi_tramo?: boolean;
  tramos?: any[];
  peso?: number;
  bultos?: number;
  volumen?: number;
  fecha_estimada?: string;
  notas?: string;
  metadata?: any;
}

// ─── Funciones principales ──────────────────────────────────────────────────

export async function getEnvios(filters?: {
  pedido_madre_id?: string;
  estado?: EstadoEnvio;
  carrier?: string;
  tramo?: Tramo;
}): Promise<{ envios: Envio[]; eventos: EventoTracking[] }> {
  let query = supabase
    .from('envios')
    .select('*')
    .order('fecha_creacion', { ascending: false });
  
  if (filters?.pedido_madre_id) {
    query = query.eq('pedido_madre_id', filters.pedido_madre_id);
  }
  if (filters?.estado) {
    query = query.eq('estado', filters.estado);
  }
  if (filters?.carrier) {
    query = query.eq('carrier', filters.carrier);
  }
  if (filters?.tramo) {
    query = query.eq('tramo', filters.tramo);
  }
  
  const { data: envios, error } = await query;
  
  if (error) {
    console.error('[enviosApi] Error obteniendo envíos:', error);
    throw new Error(error.message || 'Error cargando envíos');
  }
  
  // Obtener eventos de tracking
  const envioIds = envios?.map(e => e.id) || [];
  let eventos: EventoTracking[] = [];
  
  if (envioIds.length > 0) {
    const { data: eventosData, error: eventosError } = await supabase
      .from('envios_eventos')
      .select('*')
      .in('envio_id', envioIds)
      .order('fecha', { ascending: false });
    
    if (!eventosError && eventosData) {
      eventos = eventosData as EventoTracking[];
    }
  }
  
  return { envios: envios || [], eventos };
}

export async function getEnvio(id: string): Promise<{ envio: Envio; eventos: EventoTracking[] } | null> {
  const { data: envio, error } = await supabase
    .from('envios')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('[enviosApi] Error obteniendo envío:', error);
    return null;
  }
  
  if (!envio) return null;
  
  // Obtener eventos de tracking
  const { data: eventos, error: eventosError } = await supabase
    .from('envios_eventos')
    .select('*')
    .eq('envio_id', id)
    .order('fecha', { ascending: false });
  
  if (eventosError) {
    console.error('[enviosApi] Error obteniendo eventos:', eventosError);
  }
  
  return {
    envio: envio as Envio,
    eventos: (eventos || []) as EventoTracking[]
  };
}

export async function getEnviosByPedido(pedidoId: string): Promise<Envio[]> {
  const { data, error } = await supabase
    .from('envios')
    .select('*')
    .eq('pedido_madre_id', pedidoId)
    .order('fecha_creacion', { ascending: false });
  
  if (error) {
    console.error('[enviosApi] Error obteniendo envíos por pedido:', error);
    return [];
  }
  
  return (data || []) as Envio[];
}

export async function createEnvio(data: EnvioInput): Promise<Envio> {
  if (!data.origen || !data.destino || !data.destinatario || !data.carrier) {
    throw new Error('origen, destino, destinatario y carrier son requeridos');
  }
  
  // Generar número de envío único
  const numero = `ENV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const { data: result, error } = await supabase
    .from('envios')
    .insert({
      ...data,
      numero,
      estado: data.estado || 'creado',
      tramo: data.tramo || 'local',
      peso: data.peso || 0,
      bultos: data.bultos || 1,
      fecha_creacion: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('[enviosApi] Error creando envío:', error);
    throw new Error(error.message || 'Error creando envío');
  }
  
  return result as Envio;
}

export async function updateEnvio(id: string, data: Partial<EnvioInput> & {
  descripcion_evento?: string;
  ubicacion?: string;
  origen_evento?: 'sistema' | 'carrier' | 'manual';
}): Promise<Envio> {
  const { descripcion_evento, ubicacion, origen_evento, ...updateData } = data;
  
  // Actualizar envío
  const { data: result, error } = await supabase
    .from('envios')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('[enviosApi] Error actualizando envío:', error);
    throw new Error(error.message || 'Error actualizando envío');
  }
  
  // Si se proporcionó un evento, crearlo
  if (descripcion_evento && result) {
    await addEvento(id, {
      estado: (updateData.estado || result.estado) as EstadoEnvio,
      descripcion: descripcion_evento,
      ubicacion,
      origen: origen_evento || 'manual',
    });
  }
  
  return result as Envio;
}

export async function addEvento(id: string, evento: {
  estado: EstadoEnvio;
  descripcion: string;
  ubicacion?: string;
  lat?: number;
  lng?: number;
  origen?: 'sistema' | 'carrier' | 'manual';
}): Promise<EventoTracking> {
  // Obtener el envío para actualizar su estado
  const { data: envio } = await supabase
    .from('envios')
    .select('estado')
    .eq('id', id)
    .single();
  
  // Crear el evento
  const { data: result, error } = await supabase
    .from('envios_eventos')
    .insert({
      envio_id: id,
      estado: evento.estado,
      descripcion: evento.descripcion,
      ubicacion: evento.ubicacion,
      lat: evento.lat,
      lng: evento.lng,
      origen: evento.origen || 'manual',
      fecha: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('[enviosApi] Error agregando evento:', error);
    throw new Error(error.message || 'Error agregando evento');
  }
  
  // Actualizar el estado del envío si cambió
  if (envio && envio.estado !== evento.estado) {
    await supabase
      .from('envios')
      .update({ estado: evento.estado, updated_at: new Date().toISOString() })
      .eq('id', id);
  }
  
  return result as EventoTracking;
}

export async function registrarAcuse(id: string, acuse: {
  firmado_por: string;
  firma_url?: string;
  ubicacion?: string;
}): Promise<Envio> {
  const { data: result, error } = await supabase
    .from('envios')
    .update({
      acuse_recibido: true,
      acuse_fecha: new Date().toISOString(),
      acuse_firmado_por: acuse.firmado_por,
      acuse_firma_url: acuse.firma_url,
      estado: 'entregado',
      fecha_entrega: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('[enviosApi] Error registrando acuse:', error);
    throw new Error(error.message || 'Error registrando acuse');
  }
  
  // Crear evento de entrega
  await addEvento(id, {
    estado: 'entregado',
    descripcion: `Acuse de recibo firmado por ${acuse.firmado_por}`,
    ubicacion: acuse.ubicacion,
    origen: 'manual',
  });
  
  return result as Envio;
}
