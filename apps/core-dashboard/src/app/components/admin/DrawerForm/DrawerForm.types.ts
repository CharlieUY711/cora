/* =====================================================
   DrawerForm.types.ts — Tipos e interfaces TypeScript
   ===================================================== */
import type { LucideIcon } from 'lucide-react';

export type FieldType =
  | 'text' | 'email' | 'tel' | 'url' | 'number' | 'date' | 'time'
  | 'textarea' | 'select' | 'multicheck' | 'toggle' | 'image' | 'address';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];       // para select y multicheck
  helpText?: string;
  hint?: string;
  row?: string;                  // agrupar campos en misma fila (mismo valor = misma fila)
}

export interface SheetDef {
  id: string;
  title: string;
  subtitle?: string;             // se muestra en el header del drawer
  fields: FieldDef[];
}

export interface DrawerFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  title: string;
  icon?: LucideIcon;
  sheets: SheetDef[];
  initialData?: Record<string, unknown>;
  loading?: boolean;
}
