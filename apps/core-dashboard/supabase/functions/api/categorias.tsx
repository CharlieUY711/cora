import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const categorias = new Hono();

const getSupabase = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

const errMsg = (e: unknown): string =>
  e instanceof Error
    ? e.message
    : typeof e === "object" && e !== null && "message" in e
    ? String((e as { message: unknown }).message)
    : JSON.stringify(e);

// GET /categorias
categorias.get("/", async (c) => {
  try {
    const supabase = getSupabase();
    const { departamento_id, activo } = c.req.query();
    
    // Intentar primero con la relación embebida
    let query = supabase
      .from("categorias")
      .select("*, subcategorias(*)")
      .order("orden", { ascending: true });
    if (departamento_id) query = query.eq("departamento_id", departamento_id);
    if (activo !== undefined) query = query.eq("activo", activo === "true");
    
    let { data, error } = await query;
    
    // Si falla por relación no encontrada o columna no existe, hacer consultas separadas
    if (error && (error.message?.includes("relationship") || error.message?.includes("does not exist") || error.message?.includes("column"))) {
      console.log("Error con relación o columna, usando consultas separadas:", error.message);
      
      // Intentar consulta simple sin filtros primero para ver si la tabla existe
      let result = await supabase
        .from("categorias")
        .select("*")
        .order("orden", { ascending: true });
      
      if (result.error) {
        console.log("Error en consulta separada:", JSON.stringify(result.error));
        // Si la tabla no existe, retornar error descriptivo
        if (result.error.message?.includes("does not exist")) {
          return c.json({ 
            error: "La tabla categorias no existe. Por favor ejecuta la migración 20260228_fix_categorias_complete.sql" 
          }, 500);
        }
        throw result.error;
      }
      
      // Aplicar filtros manualmente si es necesario
      if (departamento_id && result.data) {
        result.data = result.data.filter((cat: any) => cat.departamento_id === departamento_id);
      }
      if (activo !== undefined && result.data) {
        result.data = result.data.filter((cat: any) => cat.activo === (activo === "true"));
      }
      
      // Obtener subcategorias por separado
      if (result.data && result.data.length > 0) {
        const categoriaIds = result.data.map((c: any) => c.id);
        const { data: subcategoriasData } = await supabase
          .from("subcategorias")
          .select("*")
          .in("categoria_id", categoriaIds);
        
        // Combinar los datos
        data = result.data.map((cat: any) => ({
          ...cat,
          subcategorias: subcategoriasData?.filter((sub: any) => sub.categoria_id === cat.id) || []
        }));
      } else {
        data = result.data || [];
      }
    } else if (error) {
      throw error;
    }
    
    return c.json({ data });
  } catch (error) {
    console.log("Error listando categorías:", JSON.stringify(error));
    return c.json({ error: `Error listando categorías: ${errMsg(error)}` }, 500);
  }
});

// GET /categorias/:id
categorias.get("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const categoriaId = c.req.param("id");
    
    // Intentar primero con la relación embebida
    let { data, error } = await supabase
      .from("categorias")
      .select("*, subcategorias(*)")
      .eq("id", categoriaId)
      .single();

    // Si falla por relación no encontrada, hacer consultas separadas
    if (error && error.message?.includes("relationship")) {
      console.log("Relación no encontrada, usando consultas separadas");
      const result = await supabase
        .from("categorias")
        .select("*")
        .eq("id", categoriaId)
        .single();
      
      if (result.error) throw result.error;
      if (!result.data) return c.json({ error: "Categoría no encontrada" }, 404);
      
      // Obtener subcategorias por separado
      const { data: subcategoriasData } = await supabase
        .from("subcategorias")
        .select("*")
        .eq("categoria_id", categoriaId);
      
      data = {
        ...result.data,
        subcategorias: subcategoriasData || []
      };
    } else if (error) {
      throw error;
    }
    
    if (!data) return c.json({ error: "Categoría no encontrada" }, 404);
    return c.json({ data });
  } catch (error) {
    console.log("Error obteniendo categoría:", JSON.stringify(error));
    return c.json({ error: `Error obteniendo categoría: ${errMsg(error)}` }, 500);
  }
});

// POST /categorias
categorias.post("/", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    if (!body.nombre) {
      return c.json({ error: "nombre es requerido" }, 400);
    }
    if (!body.departamento_id) {
      return c.json({ error: "departamento_id es requerido" }, 400);
    }

    // Preparar el objeto de inserción, excluyendo campos que no existen si es necesario
    const insertData: any = {
      nombre: body.nombre,
      departamento_id: body.departamento_id,
      activo: body.activo ?? true,
    };
    
    // Agregar campos opcionales solo si existen en el body
    if (body.icono !== undefined) insertData.icono = body.icono;
    if (body.color !== undefined) insertData.color = body.color;
    if (body.orden !== undefined) insertData.orden = body.orden;

    const { data, error } = await supabase
      .from("categorias")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return c.json({ data }, 201);
  } catch (error) {
    console.log("Error creando categoría:", JSON.stringify(error));
    return c.json({ error: `Error creando categoría: ${errMsg(error)}` }, 500);
  }
});

// PUT /categorias/:id
categorias.put("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const body = await c.req.json();

    const { data, error } = await supabase
      .from("categorias")
      .update(body)
      .eq("id", c.req.param("id"))
      .select()
      .single();

    if (error) throw error;
    return c.json({ data });
  } catch (error) {
    console.log("Error actualizando categoría:", JSON.stringify(error));
    return c.json({ error: `Error actualizando categoría: ${errMsg(error)}` }, 500);
  }
});

// DELETE /categorias/:id
categorias.delete("/:id", async (c) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("categorias")
      .delete()
      .eq("id", c.req.param("id"));

    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log("Error eliminando categoría:", JSON.stringify(error));
    return c.json({ error: `Error eliminando categoría: ${errMsg(error)}` }, 500);
  }
});

export { categorias };
