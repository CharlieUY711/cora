/* =====================================================
   OrganizacionesView — Empresas y Organizaciones
   ===================================================== */
import React, { useState, useEffect, useCallback } from 'react';
import { OrangeHeader } from '../OrangeHeader';
import type { MainSection } from '../../../AdminDashboard';
import { toast } from 'sonner';
import { getOrganizaciones, createOrganizacion, updateOrganizacion, deleteOrganizacion, type Organizacion } from '../../../services/organizacionesApi';
import {
  Search, Plus, Edit2, Trash2, Building2, Mail, Phone,
  Globe, RefreshCw, X, Save, CheckCircle, XCircle, MapPin,
} from 'lucide-react';

interface Props { onNavigate: (section: MainSection) => void; }

const ORANGE = '#FF6835';

const TIPOS_ORG = ['', 'empresa', 'cooperativa', 'fundacion', 'gobierno', 'otro'];
const INDUSTRIAS = ['', 'Tecnología', 'Retail', 'Agro', 'Construcción', 'Salud', 'Educación', 'Finanzas', 'Logística', 'Manufactura', 'Servicios', 'Otro'];

const EMPTY: Omit<Organizacion, 'id' | 'created_at'> = {
  nombre: '',
  tipo: '',
  industria: '',
  email: '',
  telefono: '',
  sitio_web: '',
  direccion: { calle: '', ciudad: '', pais: '' },
  activo: true,
};

export function OrganizacionesView({ onNavigate }: Props) {
  const [orgs, setOrgs] = useState<Organizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterActivo, setFilterActivo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Organizacion | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrganizaciones({
        search: search || undefined,
        tipo: filterTipo || undefined,
        activo: filterActivo !== '' ? filterActivo === 'true' : undefined,
      });
      setOrgs(data);
    } catch (e: unknown) {
      console.error('Error cargando organizaciones:', e);
      toast.error('Error al cargar organizaciones');
    } finally {
      setLoading(false);
    }
  }, [search, filterTipo, filterActivo]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const openCreate = () => {
    setEditando(null);
    setForm({ ...EMPTY });
    setShowModal(true);
  };

  const openEdit = (o: Organizacion) => {
    setEditando(o);
    setForm({
      nombre: o.nombre,
      tipo: o.tipo ?? '',
      industria: o.industria ?? '',
      email: o.email ?? '',
      telefono: o.telefono ?? '',
      sitio_web: o.sitio_web ?? '',
      direccion: o.direccion ?? { calle: '', ciudad: '', pais: '' },
      activo: o.activo,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      const body = { ...form };
      if (editando) {
        const data = await updateOrganizacion(editando.id, body);
        if (!data) throw new Error('No se pudo actualizar la organización');
      } else {
        const data = await createOrganizacion(body);
        if (!data) throw new Error('No se pudo crear la organización');
      }
      toast.success(editando ? 'Organización actualizada' : 'Organización creada');
      setShowModal(false);
      fetchOrgs();
    } catch (e: unknown) {
      console.error('Error guardando organización:', e);
      toast.error(`Error al guardar: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta organización? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    try {
      const ok = await deleteOrganizacion(id);
      if (!ok) throw new Error('No se pudo eliminar la organización');
      toast.success('Organización eliminada');
      fetchOrgs();
    } catch (e: unknown) {
      console.error('Error eliminando organización:', e);
      toast.error('Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const setDir = (key: string, val: string) =>
    setForm(f => ({ ...f, direccion: { ...(f.direccion ?? {}), [key]: val } }));

  const colorPorTipo: Record<string, string> = {
    empresa: '#3B82F6', cooperativa: '#10B981', fundacion: '#8B5CF6',
    gobierno: '#F59E0B', otro: '#6B7280',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <OrangeHeader
        icon={Building2}
        title="Organizaciones"
        subtitle="Empresas, cooperativas y entidades del sistema"
        actions={[{ label: '+ Nueva Organización', primary: true, onClick: openCreate }]}
      />

      {/* ── Filtros ── */}
      <div style={{ padding: '16px 28px', backgroundColor: '#fff', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 36, border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          style={{ height: 36, border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '0 10px', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}
        >
          <option value="">Todos los tipos</option>
          {TIPOS_ORG.filter(Boolean).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select
          value={filterActivo}
          onChange={e => setFilterActivo(e.target.value)}
          style={{ height: 36, border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '0 10px', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}
        >
          <option value="">Todos</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
        </select>
        <button onClick={fetchOrgs} style={{ height: 36, width: 36, border: '1.5px solid #E5E7EB', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={15} color="#6B7280" />
        </button>
      </div>

      {/* ── Grid de tarjetas ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: '#9CA3AF' }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} /> Cargando organizaciones...
          </div>
        ) : orgs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
            <Building2 size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>No hay organizaciones registradas</p>
            <p style={{ fontSize: '0.875rem', marginTop: 4 }}>Creá la primera usando el botón "+ Nueva Organización"</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {orgs.map(o => {
              const tipoColor = colorPorTipo[o.tipo ?? ''] ?? '#6B7280';
              return (
                <div key={o.id} style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', transition: 'box-shadow 0.2s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = ''}
                >
                  {/* Top colored bar */}
                  <div style={{ height: 4, backgroundColor: tipoColor }} />
                  <div style={{ padding: 16 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: tipoColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Building2 size={20} color={tipoColor} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}>{o.nombre}</p>
                          {o.tipo && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: tipoColor, backgroundColor: tipoColor + '15', padding: '2px 7px', borderRadius: 20 }}>
                              {o.tipo.charAt(0).toUpperCase() + o.tipo.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: o.activo ? '#10B981' : '#EF4444', backgroundColor: o.activo ? '#D1FAE5' : '#FEE2E2', padding: '2px 8px', borderRadius: 20 }}>
                        {o.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    {/* Industria */}
                    {o.industria && (
                      <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: '#6B7280' }}>🏭 {o.industria}</p>
                    )}

                    {/* Contacto */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                      {o.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#6B7280' }}>
                          <Mail size={13} />{o.email}
                        </div>
                      )}
                      {o.telefono && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#6B7280' }}>
                          <Phone size={13} />{o.telefono}
                        </div>
                      )}
                      {o.sitio_web && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#3B82F6' }}>
                          <Globe size={13} />
                          <a href={o.sitio_web} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'none' }}>{o.sitio_web}</a>
                        </div>
                      )}
                      {o.direccion?.ciudad && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#6B7280' }}>
                          <MapPin size={13} />{o.direccion.ciudad}{o.direccion.pais ? `, ${o.direccion.pais}` : ''}
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
                      <button onClick={() => openEdit(o)} style={{ flex: 1, padding: '7px', borderRadius: 7, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <Edit2 size={13} /> Editar
                      </button>
                      <button onClick={() => handleDelete(o.id)} disabled={deletingId === o.id} style={{ padding: '7px 12px', borderRadius: 7, border: '1.5px solid #FEE2E2', background: '#FFF5F5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: '#EF4444' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                {editando ? 'Editar Organización' : 'Nueva Organización'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Nombre / Razón Social *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} style={inputStyle} placeholder="Ej: TechSur SA" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Tipo de Organización</label>
                  <select value={form.tipo ?? ''} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={selectStyle}>
                    <option value="">Sin especificar</option>
                    {TIPOS_ORG.filter(Boolean).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Industria</label>
                  <select value={form.industria ?? ''} onChange={e => setForm(f => ({ ...f, industria: e.target.value }))} style={selectStyle}>
                    <option value="">Sin especificar</option>
                    {INDUSTRIAS.filter(Boolean).map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} placeholder="contacto@empresa.com" />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input value={form.telefono ?? ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} style={inputStyle} placeholder="+598 2 123 4567" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Sitio Web</label>
                <input value={form.sitio_web ?? ''} onChange={e => setForm(f => ({ ...f, sitio_web: e.target.value }))} style={inputStyle} placeholder="https://www.empresa.com" />
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: 8, display: 'block' }}>Dirección</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input value={form.direccion?.calle ?? ''} onChange={e => setDir('calle', e.target.value)} style={inputStyle} placeholder="Calle y número" />
                  <input value={form.direccion?.ciudad ?? ''} onChange={e => setDir('ciudad', e.target.value)} style={inputStyle} placeholder="Ciudad" />
                  <input value={form.direccion?.pais ?? ''} onChange={e => setDir('pais', e.target.value)} style={inputStyle} placeholder="País" />
                  <input value={form.direccion?.cp ?? ''} onChange={e => setDir('cp', e.target.value)} style={inputStyle} placeholder="Código postal" />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="org-activo" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: ORANGE }} />
                <label htmlFor="org-activo" style={{ fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>Organización activa en el sistema</label>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', backgroundColor: ORANGE, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
                <Save size={15} /> {saving ? 'Guardando...' : (editando ? 'Guardar cambios' : 'Crear organización')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 5,
};
const inputStyle: React.CSSProperties = {
  width: '100%', height: 38, border: '1.5px solid #E5E7EB', borderRadius: 8,
  padding: '0 12px', fontSize: '0.875rem', color: '#111827', outline: 'none', boxSizing: 'border-box',
};
const selectStyle: React.CSSProperties = {
  width: '100%', height: 38, border: '1.5px solid #E5E7EB', borderRadius: 8,
  padding: '0 10px', fontSize: '0.875rem', color: '#374151', cursor: 'pointer', outline: 'none',
};
