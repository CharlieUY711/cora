import React from 'react';
import { RouterProvider } from 'react-router';
import { OrchestratorProvider } from '../shells/DashboardShell/app/providers/OrchestratorProvider';
import { AuthProvider } from '../shells/DashboardShell/app/providers/AuthProvider';
import { ThemeProvider } from '../shells/DashboardShell/app/providers/ThemeProvider';
import { router } from './routes';
export default function App() {
  return (
    <OrchestratorProvider>
      <AuthProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </AuthProvider>
    </OrchestratorProvider>
  );
}
