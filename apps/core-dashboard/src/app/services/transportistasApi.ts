import { supabase } from '../../utils/supabase/client';

const TENANT = 'oddy';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface Transportista {
  id: string;
  nombre: string;
  tipo: 'courier' | 'propio' | 'tercero' | 'nacional' | 'local' | 'internacional';
  estado: 'activo' | 'inactivo';
  contacto?: string;
  email?: string;
  telefono?: string;
  zonas?: string[];
  tarifa_base?: number;
  observaciones?: string;
  logo?: string;
  rating?: number;
  envios_activos?: number;
  envios_totales?: number;
  tiempo_promedio?: string;
  cobertura?: string[];
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Tramo {
  id: string;
  origen: string;
  destino: string;
  distancia_km?: number;
  tiempo_horas?: number;
  transportista_id: string;
  tipo: 'local' | 'intercity' | 'internacional';
  tiempo_estimado?: string;
  tarifa_base?: number;
  tarifa_kg?: number;
  estado: 'activo' | 'inactivo';
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TransportistaInput {
  nombre: string;
  tipo: Transportista['tipo'];
  estado?: Transportista['estado'];
  contacto?: string;
  email?: string;
  telefono?: string;
  zonas?: string[];
  tarifa_base?: number;
  observaciones?: string;
  logo?: string;
  rating?: number;
  envios_activos?: number;
  envios_totales?: number;
  tiempo_promedio?: string;
  cobertura?: string[];
  activo?: boolean;
}

export interface TramoInput {
  origen: string;
  destino: string;
  distancia_km?: number;
  tiempo_horas?: number;
  tipo: Tramo['tipo'];
  tiempo_estimado?: string;
  tarifa_base?: number;
  tarifa_kg?: number;
  estado?: Tramo['estado'];
  activo?: boolean;
}

// ─── CRUD Transportistas ────────────────────────────────────────────────────

export async function getTransportistas(): Promise<Transportista[]> {
  const { data, error } = await supabase
    .from('transportistas')
    .select('*')
    .order('nombre');
  
  if (error) {
    console.error('[transportistasApi] Error obteniendo transportistas:', error);
    throw new Error(error.message || 'Error cargando transportistas');
  }
  
  return (data || []) as Transportista[];
}

export async function getTransportistaById(id: string): Promise<Transportista> {
  const { data, error } = await supabase
    .from('transportistas')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('[transportistasApi] Error obteniendo transportista:', error);
    throw new Error(error.message || 'Error cargando transportista');
  }
  
  if (!data) {
    throw new Error('Transportista no encontrado');
  }
  
  return data as Transportista;
}

export async function createTransportista(data: TransportistaInput): Promise<Transportista> {
  if (!data.nombre || !data.tipo) {
    throw new Error('nombre y tipo son requeridos');
  }
  
  const { data: result, error } = await supabase
    .from('transportistas')
    .insert({
      ...data,
      estado: data.estado || 'activo',
      activo: data.activo ?? true,
    })
    .select()
    .single();
  
  if (error) {
    console.error('[transportistasApi] Error creando transportista:', error);
    throw new Error(error.message || 'Error creando transportista');
  }
  
  return result as Transportista;
}

export async function updateTransportista(id: string, data: Partial<TransportistaInput>): Promise<Transportista> {
  const { data: result, error } = await supabase
    .from('transportistas')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('[transportistasApi] Error actualizando transportista:', error);
    throw new Error(error.message || 'Error actualizando transportista');
  }
  
  return result as Transportista;
}

export async function deleteTransportista(id: string): Promise<void> {
  const { error } = await supabase
    .from('transportistas')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('[transportistasApi] Error eliminando transportista:', error);
    throw new Error(error.message || 'Error eliminando transportista');
  }
}

// ─── CRUD Tramos ────────────────────────────────────────────────────────────

export async function getTramos(transportistaId: string): Promise<Tramo[]> {
  const { data, error } = await supabase
    .from('tramos')
    .select('*')
    .eq('transportista_id', transportistaId)
    .order('origen');
  
  if (error) {
    console.error('[transportistasApi] Error obteniendo tramos:', error);
    throw new Error(error.message || 'Error cargando tramos');
  }
  
  return (data || []) as Tramo[];
}

export async function createTramo(transportistaId: string, data: TramoInput): Promise<Tramo> {
  if (!data.origen || !data.destino || !data.tipo) {
    throw new Error('origen, destino y tipo son requeridos');
  }
  
  const { data: result, error } = await supabase
    .from('tramos')
    .insert({
      ...data,
      transportista_id: transportistaId,
      estado: data.estado || 'activo',
      activo: data.activo ?? true,
    })
    .select()
    .single();
  
  if (error) {
    console.error('[transportistasApi] Error creando tramo:', error);
    throw new Error(error.message || 'Error creando tramo');
  }
  
  return result as Tramo;
}
