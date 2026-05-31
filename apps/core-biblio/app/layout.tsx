import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const metadata = {
  title: 'CORE Biblio',
  description: 'Developer Hub del ecosistema CORE',
};

function NavLink({ href, children }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={
        "px-2 py-1 rounded transition-colors " +
        (active
          ? "text-white bg-neutral-800"
          : "text-neutral-400 hover:text-white hover:bg-neutral-900")
      }
    >
      {children}
    </Link>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="flex min-h-screen bg-neutral-950 text-neutral-200">

        {/* Sidebar */}
        <aside className="w-64 border-r border-neutral-800 p-6 flex flex-col gap-6">
          <h1 className="text-xl font-bold tracking-tight">CORE Biblio</h1>

          <nav className="flex flex-col gap-2">
            <NavLink href="/">Inicio</NavLink>
            <NavLink href="/docs">Documentación</NavLink>
            <NavLink href="/architecture">Arquitectura</NavLink>
            <NavLink href="/prompts">Prompts</NavLink>
            <NavLink href="/roadmap">Roadmap</NavLink>
            <NavLink href="/maintenance">Mantenimiento</NavLink>
          </nav>
        </aside>

        {/* Contenido */}
        <main className="flex-1 p-10">
          {children}
        </main>

      </body>
    </html>
  );
}
