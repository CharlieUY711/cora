const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/utils/moduleManifest.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Eliminar todos los imports estáticos de componentes (mantener solo React y MainSection)
content = content.replace(/^import \{ \w+ \} from '\.\.\/components\/admin\/views\/\w+';[\r\n]*/gm, '');

// Reemplazar referencias estáticas de componentes por React.lazy()
content = content.replace(
  /component: (\w+View|\w+Workspace),/g,
  (match, name) => {
    const file = name;
    return `component: React.lazy(() => import('../components/admin/views/${file}').then(m => ({ default: m.${file} }))),`;
  }
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
