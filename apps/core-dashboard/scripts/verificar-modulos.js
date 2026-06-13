/**
 * Script de Verificación de Módulos
 * Verifica problemas comunes en la configuración de módulos
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SRC = path.resolve(ROOT, 'src');

const problemas = {
  importaciones: [],
  archivosDuplicados: [],
  headersInconsistentes: [],
  manejoErrores: [],
};

// 1. Verificar importaciones de Supabase
function verificarImportaciones() {
  console.log('\n🔍 Verificando importaciones de Supabase...\n');
  
  const archivos = buscarArchivos(SRC, ['.ts', '.tsx']);
  const patrones = {
    absoluta: /from\s+['"]\/utils\/supabase\/info['"]/g,
    relativa: /from\s+['"](\.\.\/)+utils\/supabase\/info['"]/g,
    alias: /from\s+['"]@\/utils\/supabase\/info['"]/g,
  };
  
  archivos.forEach(archivo => {
    const contenido = fs.readFileSync(archivo, 'utf-8');
    const relativo = path.relative(ROOT, archivo);
    
    if (patrones.absoluta.test(contenido)) {
      problemas.importaciones.push({
        archivo: relativo,
        tipo: 'absoluta (/utils/...)',
        problema: 'Puede no funcionar si el alias no está configurado',
      });
    }
    
    if (patrones.relativa.test(contenido)) {
      problemas.importaciones.push({
        archivo: relativo,
        tipo: 'relativa (../../...)',
        problema: 'Rutas relativas profundas pueden ser frágiles',
      });
    }
  });
  
  if (problemas.importaciones.length > 0) {
    console.log('❌ Se encontraron importaciones inconsistentes:');
    problemas.importaciones.forEach(p => {
      console.log(`   - ${p.archivo} (${p.tipo})`);
    });
  } else {
    console.log('✅ Todas las importaciones son consistentes');
  }
}

// 2. Verificar headers de autenticación
function verificarHeaders() {
  console.log('\n🔍 Verificando headers de autenticación...\n');
  
  const servicios = buscarArchivos(path.resolve(SRC, 'app/services'), ['.ts']);
  
  servicios.forEach(archivo => {
    const contenido = fs.readFileSync(archivo, 'utf-8');
    const relativo = path.relative(ROOT, archivo);
    
    const tieneApikey = /['"]apikey['"]\s*:/g.test(contenido);
    const tieneAuth = /Authorization['"]\s*:/g.test(contenido);
    
    if (tieneAuth) {
      problemas.headersInconsistentes.push({
        archivo: relativo,
        tieneApikey,
        tieneAuth: true,
      });
    }
  });
  
  const conApikey = problemas.headersInconsistentes.filter(h => h.tieneApikey).length;
  const sinApikey = problemas.headersInconsistentes.length - conApikey;
  
  if (conApikey > 0 && sinApikey > 0) {
    console.log(`⚠️  Inconsistencia encontrada: ${conApikey} servicios con 'apikey', ${sinApikey} sin 'apikey'`);
    console.log('\n   Con apikey:');
    problemas.headersInconsistentes
      .filter(h => h.tieneApikey)
      .forEach(h => console.log(`     - ${h.archivo}`));
    console.log('\n   Sin apikey:');
    problemas.headersInconsistentes
      .filter(h => !h.tieneApikey)
      .forEach(h => console.log(`     - ${h.archivo}`));
  } else {
    console.log('✅ Headers consistentes');
  }
}

// 3. Verificar manejo de errores
function verificarManejoErrores() {
  console.log('\n🔍 Verificando manejo de errores...\n');
  
  const servicios = buscarArchivos(path.resolve(SRC, 'app/services'), ['.ts']);
  
  servicios.forEach(archivo => {
    const contenido = fs.readFileSync(archivo, 'utf-8');
    const relativo = path.relative(ROOT, archivo);
    
    const tieneContentType = /content-type|contentType/g.test(contenido);
    const tieneTryCatch = /try\s*\{[\s\S]*?\}\s*catch/g.test(contenido);
    const parseaDirecto = /await\s+res\.json\(\)/g.test(contenido) && !tieneContentType;
    
    if (parseaDirecto && tieneTryCatch) {
      problemas.manejoErrores.push({
        archivo: relativo,
        problema: 'Parsea JSON sin verificar content-type',
      });
    }
  });
  
  if (problemas.manejoErrores.length > 0) {
    console.log('⚠️  Servicios con manejo de errores mejorable:');
    problemas.manejoErrores.forEach(p => {
      console.log(`   - ${p.archivo}: ${p.problema}`);
    });
  } else {
    console.log('✅ Manejo de errores adecuado');
  }
}

// 4. Verificar archivos duplicados
function verificarDuplicados() {
  console.log('\n🔍 Verificando archivos duplicados...\n');
  
  const infoFiles = [
    path.resolve(ROOT, 'src/utils/supabase/info.ts'),
    path.resolve(ROOT, 'utils/supabase/info.tsx'),
  ];
  
  infoFiles.forEach(archivo => {
    if (fs.existsSync(archivo)) {
      const relativo = path.relative(ROOT, archivo);
      problemas.archivosDuplicados.push(relativo);
    }
  });
  
  if (problemas.archivosDuplicados.length > 1) {
    console.log('⚠️  Se encontraron múltiples archivos de configuración:');
    problemas.archivosDuplicados.forEach(f => console.log(`   - ${f}`));
  } else {
    console.log('✅ Un solo archivo de configuración');
  }
}

// Helper: buscar archivos recursivamente
function buscarArchivos(dir, extensiones) {
  let resultados = [];
  
  if (!fs.existsSync(dir)) return resultados;
  
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const rutaCompleta = path.join(dir, item);
    const stat = fs.statSync(rutaCompleta);
    
    if (stat.isDirectory()) {
      resultados = resultados.concat(buscarArchivos(rutaCompleta, extensiones));
    } else if (extensiones.some(ext => item.endsWith(ext))) {
      resultados.push(rutaCompleta);
    }
  });
  
  return resultados;
}

// Ejecutar todas las verificaciones
console.log('═══════════════════════════════════════════════════════');
console.log('  VERIFICACIÓN DE MÓDULOS - ODDY Constructor');
console.log('═══════════════════════════════════════════════════════');

verificarImportaciones();
verificarHeaders();
verificarManejoErrores();
verificarDuplicados();

// Resumen final
console.log('\n═══════════════════════════════════════════════════════');
console.log('  RESUMEN');
console.log('═══════════════════════════════════════════════════════');
console.log(`Importaciones inconsistentes: ${problemas.importaciones.length}`);
console.log(`Headers inconsistentes: ${problemas.headersInconsistentes.filter((h, i, arr) => {
  const otros = arr.filter(o => o.archivo !== h.archivo);
  return otros.some(o => o.tieneApikey !== h.tieneApikey);
}).length > 0 ? 'Sí' : 'No'}`);
console.log(`Manejo de errores mejorable: ${problemas.manejoErrores.length}`);
console.log(`Archivos duplicados: ${problemas.archivosDuplicados.length > 1 ? 'Sí' : 'No'}`);

if (
  problemas.importaciones.length === 0 &&
  problemas.archivosDuplicados.length <= 1 &&
  problemas.manejoErrores.length === 0
) {
  console.log('\n✅ No se encontraron problemas críticos');
} else {
  console.log('\n⚠️  Se encontraron problemas que requieren atención');
  console.log('\nRevisa el informe AUDITORIA_MODULOS.md para más detalles');
}
