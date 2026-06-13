import { OrchestratorProvider } from './providers/OrchestratorProvider';
import { AuthProvider } from './providers/AuthProvider';
import { ThemeProvider } from './providers/ThemeProvider';

export default function App() {
  return (
    <OrchestratorProvider>
      <AuthProvider>
        <ThemeProvider>
          <div>Dashboard cargado correctamente</div>
        </ThemeProvider>
      </AuthProvider>
    </OrchestratorProvider>
  );
}
