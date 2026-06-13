/* =====================================================
   Etiqueta Emotiva — Backend Routes
   Gestión de etiquetas con QR y mensajes personalizados
   ===================================================== */
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

export const etiquetas = new Hono();

/* ── Token generator ── */
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = 'EE-';
  for (let i = 0; i < 6; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

/* ── GET / — list all (authenticated) ── */
etiquetas.get('/', async (c) => {
  try {
    const items = await kv.getByPrefix('etiqueta:');
    const sorted = items
      .filter((item: any) => item && item.token)
      .sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    return c.json(sorted);
  } catch (e) {
    console.log(`Error listing etiquetas: ${e}`);
    return c.json({ error: `Error listing etiquetas: ${e}` }, 500);
  }
});

/* ── POST / — create new (authenticated) ── */
etiquetas.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const token = generateToken();

    const etiqueta = {
      token,
      envio_numero:        body.envio_numero        || '',
      remitente_nombre:    body.remitente_nombre,
      destinatario_nombre: body.destinatario_nombre,
      destinatario_email:  body.destinatario_email  || '',
      destinatario_tel:    body.destinatario_tel    || '',
      mensaje:             body.mensaje,
      icono:               body.icono               || 'gift',
      ocasion:             body.ocasion             || 'general',
      formato:             body.formato             || 'etiqueta',
      estado:              'pendiente',
      scanned_at:          null,
      respuesta:           null,
      respuesta_nombre:    null,
      respondida_at:       null,
      optin_contacto:      null,
      created_at:          new Date().toISOString(),
    };

    await kv.set(`etiqueta:${token}`, etiqueta);
    console.log(`Created etiqueta: ${token}`);
    return c.json(etiqueta, 201);
  } catch (e) {
    console.log(`Error creating etiqueta: ${e}`);
    return c.json({ error: `Error creating etiqueta: ${e}` }, 500);
  }
});

/* ── GET /token/:token — public, no auth ── */
etiquetas.get('/token/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const etiqueta = await kv.get(`etiqueta:${token}`);
    if (!etiqueta) return c.json({ error: 'Etiqueta no encontrada' }, 404);
    return c.json(etiqueta);
  } catch (e) {
    console.log(`Error getting etiqueta by token: ${e}`);
    return c.json({ error: `Error getting etiqueta: ${e}` }, 500);
  }
});

/* ── POST /token/:token/scan — mark scanned, public ── */
etiquetas.post('/token/:token/scan', async (c) => {
  try {
    const token = c.req.param('token');
    const etiqueta = await kv.get(`etiqueta:${token}`);
    if (!etiqueta) return c.json({ error: 'Etiqueta no encontrada' }, 404);

    if (etiqueta.estado === 'pendiente') {
      etiqueta.estado     = 'escaneada';
      etiqueta.scanned_at = new Date().toISOString();
      await kv.set(`etiqueta:${token}`, etiqueta);
      console.log(`Etiqueta scanned: ${token}`);
    }
    return c.json(etiqueta);
  } catch (e) {
    console.log(`Error scanning etiqueta: ${e}`);
    return c.json({ error: `Error scanning etiqueta: ${e}` }, 500);
  }
});

/* ── POST /token/:token/responder — submit response, public ── */
etiquetas.post('/token/:token/responder', async (c) => {
  try {
    const token = c.req.param('token');
    const body  = await c.req.json();
    const etiqueta = await kv.get(`etiqueta:${token}`);
    if (!etiqueta) return c.json({ error: 'Etiqueta no encontrada' }, 404);

    etiqueta.estado           = 'respondida';
    etiqueta.respuesta        = body.mensaje;
    etiqueta.respuesta_nombre = body.nombre   || etiqueta.destinatario_nombre;
    etiqueta.optin_contacto   = body.contacto || null;
    etiqueta.respondida_at    = new Date().toISOString();

    if (!etiqueta.scanned_at) etiqueta.scanned_at = new Date().toISOString();

    await kv.set(`etiqueta:${token}`, etiqueta);
    console.log(`Etiqueta responded: ${token}`);
    return c.json(etiqueta);
  } catch (e) {
    console.log(`Error responding to etiqueta: ${e}`);
    return c.json({ error: `Error responding to etiqueta: ${e}` }, 500);
  }
});

/* ── DELETE /:token ── */
etiquetas.delete('/:token', async (c) => {
  try {
    const token = c.req.param('token');
    await kv.del(`etiqueta:${token}`);
    return c.json({ ok: true });
  } catch (e) {
    console.log(`Error deleting etiqueta: ${e}`);
    return c.json({ error: `Error deleting etiqueta: ${e}` }, 500);
  }
});

