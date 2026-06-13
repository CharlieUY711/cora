/* =====================================================
   DrawerForm — Componente Multipágina Genérico
   Charlie Platform — Componente base de todos los módulos
   ===================================================== */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronRight, Check, Loader2 } from 'lucide-react';
import type { DrawerFormProps, FieldDef, SheetDef } from './DrawerForm.types';
// Obtener color primario del tenant desde CSS variable
function getPrimaryColor(): string {
  if (typeof window === 'undefined') return '#FF6835';
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-primary')
    .trim();
  return color || '#FF6835';
}

// Helper para obtener el estado de un step
type StepState = 'done' | 'active' | 'pending';

function getStepState(sheetIndex: number, currentSheet: number): StepState {
  if (sheetIndex < currentSheet) return 'done';
  if (sheetIndex === currentSheet) return 'active';
  return 'pending';
}

// Renderizar un campo individual
function FieldRenderer({
  field,
  value,
  onChange,
  onMultiChange,
  formData,
  error,
  primaryColor,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  onMultiChange?: (updates: Record<string, unknown>) => void;
  formData?: Record<string, unknown>;
  error?: string;
  primaryColor: string;
}) {
  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${error ? '#ef4444' : '#e2e8f0'}`,
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
    backgroundColor: '#fff',
  };

  const focusStyle: React.CSSProperties = {
    borderColor: primaryColor,
    boxShadow: `0 0 0 3px ${primaryColor}1A`,
  };

  const errorStyle: React.CSSProperties = {
    borderColor: '#ef4444',
    boxShadow: '0 0 0 3px rgba(239,68,68,0.1)',
  };

  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (newValue: unknown) => {
    onChange(newValue);
  };

  const inputStyle = {
    ...baseInputStyle,
    ...(isFocused && !error ? focusStyle : {}),
    ...(error ? errorStyle : {}),
  };

  switch (field.type) {
    case 'textarea':
      return (
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
            {field.label}
            {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
          </label>
          <textarea
            value={String(value || '')}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            style={{
              ...inputStyle,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          {field.hint && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>{field.hint}</p>
          )}
          {error && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#ef4444' }}>{error}</p>
          )}
        </div>
      );

    case 'select':
      return (
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
            {field.label}
            {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={String(value || '')}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              required={field.required}
              style={{
                ...inputStyle,
                appearance: 'none',
                paddingRight: '36px',
                cursor: 'pointer',
              }}
            >
              <option value="">Seleccionar...</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronRight
              size={16}
              color="#94a3b8"
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%) rotate(90deg)',
                pointerEvents: 'none',
              }}
            />
          </div>
          {field.hint && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>{field.hint}</p>
          )}
          {error && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#ef4444' }}>{error}</p>
          )}
        </div>
      );

    case 'toggle':
      const isChecked = Boolean(value);
      return (
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: isChecked ? primaryColor : '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  transform: isChecked ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                {field.label}
                {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
              </div>
              {field.helpText && (
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>{field.helpText}</p>
              )}
            </div>
          </label>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => handleChange(e.target.checked)}
            style={{ display: 'none' }}
          />
          {error && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#ef4444' }}>{error}</p>
          )}
        </div>
      );

    case 'multicheck':
      const selectedValues = Array.isArray(value) ? value : [];
      return (
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
            {field.label}
            {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {field.options?.map((opt) => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const newValues = isSelected
                      ? selectedValues.filter((v) => v !== opt.value)
                      : [...selectedValues, opt.value];
                    handleChange(newValues);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: `1px solid ${isSelected ? primaryColor : '#e2e8f0'}`,
                    backgroundColor: isSelected ? `${primaryColor}15` : '#fff',
                    color: isSelected ? primaryColor : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {field.hint && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>{field.hint}</p>
          )}
          {error && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#ef4444' }}>{error}</p>
          )}
        </div>
      );

    case 'image':
      const [imagePreview, setImagePreview] = useState<string | null>(
        typeof value === 'string' && value ? value : null
      );
      const fileInputRef = useRef<HTMLInputElement>(null);

      const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            setImagePreview(result);
            handleChange(result);
          };
          reader.readAsDataURL(file);
        }
      };

      return (
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
            {field.label}
            {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #e2e8f0',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
              backgroundColor: imagePreview ? '#f8fafc' : '#fff',
            }}
            onMouseEnter={(e) => {
              if (!imagePreview) {
                (e.currentTarget as HTMLElement).style.borderColor = primaryColor;
                (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
              }
            }}
            onMouseLeave={(e) => {
              if (!imagePreview) {
                (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                (e.currentTarget as HTMLElement).style.backgroundColor = '#fff';
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {imagePreview ? (
              <div>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    marginBottom: '8px',
                  }}
                />
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                  Click para cambiar imagen
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 4px', fontWeight: 600 }}>
                  Arrastra una imagen aquí o click para seleccionar
                </p>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                  {field.hint || 'JPG, PNG, PDF hasta 10MB'}
                </p>
              </div>
            )}
          </div>
          {error && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#ef4444' }}>{error}</p>
          )}
        </div>
      );

    case 'address': {
      const addressValue = String(value || '');
      return (
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
            {field.label}
            {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
          </label>
          <input
              type="text"
              value={addressValue}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={field.placeholder || 'Ingresá una dirección...'}
              required={field.required}
              style={inputStyle}
            />
          {/* Sub-campos de ubicación */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {[
              { key: `${field.id}_barrio`, label: 'Barrio' },
              { key: `${field.id}_localidad`, label: 'Localidad' },
              { key: `${field.id}_ciudad`, label: 'Ciudad' },
              { key: `${field.id}_departamento`, label: 'Departamento' },
            ].map(({ key, label }) => (
              <div key={key} style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
                  {label}
                </label>
                <input
                  type="text"
                  value={String(formData?.[key] || '')}
                  onChange={(e) => onMultiChange?.({ [key]: e.target.value })}
                  placeholder={label}
                  style={{ ...baseInputStyle, fontSize: '12px', padding: '7px 10px' }}
                />
              </div>
            ))}
          </div>
          {field.hint && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>{field.hint}</p>
          )}
          {error && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#ef4444' }}>{error}</p>
          )}
        </div>
      );
    }

    default:
      // text, email, tel, url, number, date, time
      return (
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
            {field.label}
            {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
          </label>
          <input
            type={field.type}
            value={String(value || '')}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={field.placeholder}
            required={field.required}
            style={inputStyle}
          />
          {field.hint && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>{field.hint}</p>
          )}
          {error && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#ef4444' }}>{error}</p>
          )}
        </div>
      );
  }
}

export function DrawerForm({
  open,
  onClose,
  onSave,
  title,
  icon: Icon,
  sheets,
  initialData = {},
  loading = false,
}: DrawerFormProps) {
  const [currentSheet, setCurrentSheet] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#FF6835');
  const drawerRef = useRef<HTMLDivElement>(null);

  // Actualizar color primario
  useEffect(() => {
    setPrimaryColor(getPrimaryColor());
  }, []);

  // Resetear estado cuando se abre/cierra
  useEffect(() => {
    if (open) {
      setCurrentSheet(0);
      setFormData(initialData);
      setErrors({});
      setSaveError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Manejar tecla Escape
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Atrapar foco dentro del drawer
  useEffect(() => {
    if (!open || !drawerRef.current) return;
    const drawer = drawerRef.current;
    const focusableElements = drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    firstElement?.focus();
    return () => document.removeEventListener('keydown', handleTab);
  }, [open, currentSheet]);

  const updateField = useCallback((fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    // Limpiar error del campo cuando se modifica
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  }, [errors]);

  const validateSheet = useCallback((sheetIndex: number): boolean => {
    const sheet = sheets[sheetIndex];
    if (!sheet) return true;

    const newErrors: Record<string, string> = {};
    sheet.fields.forEach((field) => {
      if (field.required) {
        const value = formData[field.id];
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.id] = `${field.label} es requerido`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [sheets, formData]);

  const nextSheet = useCallback(() => {
    if (!validateSheet(currentSheet)) {
      return;
    }
    if (currentSheet < sheets.length - 1) {
      setCurrentSheet(currentSheet + 1);
    }
  }, [currentSheet, sheets, validateSheet]);

  const prevSheet = useCallback(() => {
    if (currentSheet > 0) {
      setCurrentSheet(currentSheet - 1);
    }
  }, [currentSheet]);

  const goToSheet = useCallback((index: number) => {
    // Solo permitir navegar a hojas ya visitadas o la siguiente
    if (index <= currentSheet + 1 && index >= 0 && index < sheets.length) {
      // Si es la siguiente, validar la actual primero
      if (index === currentSheet + 1) {
        if (!validateSheet(currentSheet)) {
          return;
        }
      }
      setCurrentSheet(index);
    }
  }, [currentSheet, sheets, validateSheet]);

  const handleSave = useCallback(async () => {
    // Validar última hoja
    if (!validateSheet(sheets.length - 1)) {
      setCurrentSheet(sheets.length - 1);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [formData, onSave, onClose, sheets, validateSheet]);

  if (!open) return null;

  const currentSheetDef = sheets[currentSheet];
  const isFirstSheet = currentSheet === 0;
  const isLastSheet = currentSheet === sheets.length - 1;

  // Agrupar campos por row
  const fieldsByRow: Record<string, FieldDef[]> = {};
  const fieldsWithoutRow: FieldDef[] = [];

  currentSheetDef.fields.forEach((field) => {
    if (field.row) {
      if (!fieldsByRow[field.row]) {
        fieldsByRow[field.row] = [];
      }
      fieldsByRow[field.row].push(field);
    } else {
      fieldsWithoutRow.push(field);
    }
  });

  return (
    <>
      {/* Overlay */}
      <div
  onClick={onClose}
  style={{
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.45)',
    backdropFilter: 'blur(2px)',
    zIndex: 9998,
    animation: 'fadeIn 0.3s ease',
    right: '500px',
  }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed',
          top: 0,
          right: open ? 0 : '-500px',
          width: '500px',
          maxWidth: '100vw',
          height: '100vh',
          backgroundColor: '#fff',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          transition: 'right 0.3s ease',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {Icon && (
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#FFF7ED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={20} color={primaryColor} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                {title}
              </h2>
              {isFirstSheet && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#ef4444',
                    backgroundColor: '#FEE2E2',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  ● Obligatorios en pág. 1
                </span>
              )}
            </div>
            {currentSheetDef.subtitle && (
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>
                {currentSheetDef.subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            <X size={16} color="#475569" />
          </button>
        </div>

        {/* STEPS NAV */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #f1f5f9',
            flexShrink: 0,
            overflowX: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {sheets.map((sheet, index) => {
              const state = getStepState(index, currentSheet);
              const isClickable = index <= currentSheet + 1;

              return (
                <React.Fragment key={sheet.id}>
                  <button
                    type="button"
                    onClick={() => goToSheet(index)}
                    disabled={!isClickable}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: isClickable ? 'pointer' : 'not-allowed',
                      padding: '4px 0',
                      opacity: isClickable ? 1 : 0.5,
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        flexShrink: 0,
                        backgroundColor:
                          state === 'done'
                            ? '#ECFDF5'
                            : state === 'active'
                            ? primaryColor
                            : '#f1f5f9',
                        color:
                          state === 'done'
                            ? '#059669'
                            : state === 'active'
                            ? '#fff'
                            : '#94a3b8',
                      }}
                    >
                      {state === 'done' ? (
                        <Check size={12} />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: state === 'active' ? 700 : 500,
                        color:
                          state === 'active'
                            ? '#111827'
                            : state === 'done'
                            ? '#059669'
                            : '#94a3b8',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sheet.title}
                    </span>
                  </button>
                  {index < sheets.length - 1 && (
                    <div
                      style={{
                        width: '16px',
                        height: '1px',
                        backgroundColor: '#e2e8f0',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* BODY */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Renderizar campos agrupados por row */}
          {Object.entries(fieldsByRow).map(([rowId, rowFields]) => (
            <div
              key={rowId}
              style={{
                display: 'flex',
                gap: '16px',
              }}
            >
              {rowFields.map((field) => (
                <div key={field.id} style={{ flex: 1 }}>
                  <FieldRenderer
                    field={field}
                    value={formData[field.id]}
                    onChange={(value) => updateField(field.id, value)}
                    onMultiChange={(updates) => setFormData((prev) => ({ ...prev, ...updates }))}
                    formData={formData}
                    error={errors[field.id]}
                    primaryColor={primaryColor}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Renderizar campos sin row */}
          {fieldsWithoutRow.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={formData[field.id]}
              onChange={(value) => updateField(field.id, value)}
              onMultiChange={(updates) => setFormData((prev) => ({ ...prev, ...updates }))}
              formData={formData}
              error={errors[field.id]}
              primaryColor={primaryColor}
            />
          ))}
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#fff',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#fff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff';
            }}
          >
            Cancelar
          </button>

          {!isFirstSheet && (
            <button
              type="button"
              onClick={prevSheet}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: '#fff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff';
              }}
            >
              ← Ant.
            </button>
          )}

          <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
            Página {currentSheet + 1} de {sheets.length}
          </div>

          {!isLastSheet && (
            <button
              type="button"
              onClick={nextSheet}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: '#fff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff';
              }}
            >
              Sig. →
            </button>
          )}

          {isLastSheet && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: saving || loading ? '#cbd5e1' : primaryColor,
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: saving || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s',
              }}
            >
              {saving || loading ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Guardando...
                </>
              ) : (
                <>
                  💾 Guardar
                </>
              )}
            </button>
          )}

          {saveError && (
            <div
              style={{
                position: 'absolute',
                bottom: '60px',
                left: '24px',
                right: '24px',
                padding: '10px 14px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid #FECACA',
              }}
            >
              ⚠ {saveError}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
