import { supabase } from '../../utils/supabase/client';

export interface Organizacion {
  id: string;
  nombre: string;
  tipo?: string;
  industria?: string;
  email?: string;
  telefono?: string;
  sitio_web?: string;
  direccion?: Record<string, string>;
  metadata?: Record<string, unknown>;
  activo: boolean;
  created_at: string;
}

export async function getOrganizaciones(params?: { tipo?: string; activo?: boolean; search?: string }): Promise<Organizacion[]> {
  let query = supabase
    .from('organizaciones')
    .select('*');
  
  if (params?.tipo) {
    query = query.eq('tipo', params.tipo);
  }
  if (params?.activo !== undefined) {
    query = query.eq('activo', params.activo);
  }
  if (params?.search) {
    query = query.or(`nombre.ilike.%${params.search}%,email.ilike.%${params.search}%`);
  }
  
  const { data, error } = await query.order('nombre');
  
  if (error) {
    console.error('[organizacionesApi] Error obteniendo organizaciones:', error);
    throw new Error(error.message || 'Error cargando organizaciones');
  }
  
  return data || [];
}

export async function getOrganizacion(id: string): Promise<Organizacion | null> {
  const { data, error } = await supabase
    .from('organizaciones')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('[organizacionesApi] Error obteniendo organizacion:', error);
    return null;
  }
  
  return data;
}

export async function createOrganizacion(data: Partial<Organizacion>): Promise<Organizacion | null> {
  const { data: result, error } = await supabase
    .from('organizaciones')
    .insert({
      ...data,
      activo: data.activo ?? true,
    })
    .select()
    .single();
  
  if (error) {
    console.error('[organizacionesApi] Error creando organizacion:', error);
    throw new Error(error.message || 'Error creando organizacion');
  }
  
  return result;
}

export async function updateOrganizacion(id: string, data: Partial<Organizacion>): Promise<Organizacion | null> {
  const { data: result, error } = await supabase
    .from('organizaciones')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('[organizacionesApi] Error actualizando organizacion:', error);
    throw new Error(error.message || 'Error actualizando organizacion');
  }
  
  return result;
}

export async function deleteOrganizacion(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('organizaciones')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('[organizacionesApi] Error eliminando organizacion:', error);
    return false;
  }
  
  return true;
}
