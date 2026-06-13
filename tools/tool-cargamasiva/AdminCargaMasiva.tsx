"use client";

import { useState, useRef } from "react";
import {
  importCatalogFromUrl,
  importCatalogFromCsv,
  importCatalogFromPdf,
  CargaMasivaResult,
} from "@/api/cargaMasivaClient";

type ImportMode = "url" | "csv" | "pdf";

const MODES: { id: ImportMode; label: string; accept?: string }[] = [
  { id: "url", label: "URL" },
  { id: "csv", label: "CSV", accept: ".csv,text/csv" },
  { id: "pdf", label: "PDF", accept: ".pdf,application/pdf" },
];

export default function AdminCargaMasiva() {
  const [activeMode, setActiveMode] = useState<ImportMode>("url");
  const [urlValue, setUrlValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CargaMasivaResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMode = MODES.find((m) => m.id === activeMode)!;

  function handleModeChange(mode: ImportMode) {
    setActiveMode(mode);
    setResult(null);
    setFile(null);
    setUrlValue("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImport() {
    setLoading(true);
    setResult(null);
    try {
      let res: CargaMasivaResult;

      if (activeMode === "url") {
        if (!urlValue.trim()) {
          setResult({ success: false, error: "Ingresá una URL válida." });
          return;
        }
        res = await importCatalogFromUrl(urlValue.trim());
      } else if (activeMode === "csv") {
        if (!file) {
          setResult({ success: false, error: "Seleccioná un archivo CSV." });
          return;
        }
        res = await importCatalogFromCsv(file);
      } else {
        if (!file) {
          setResult({ success: false, error: "Seleccioná un archivo PDF." });
          return;
        }
        res = await importCatalogFromPdf(file);
      }

      setResult(res);
    } catch {
      setResult({ success: false, error: "Error inesperado al importar." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cm-root">
      {/* ── Header ── */}
      <header className="cm-header">
        <span className="cm-header-eyebrow">Admin</span>
        <h1 className="cm-header-title">Carga Masiva</h1>
        <p className="cm-header-sub">
          Importá catálogos desde URL, CSV o PDF de forma instantánea.
        </p>
      </header>

      {/* ── Card ── */}
      <div className="cm-card">
        {/* Mode tabs */}
        <div className="cm-tabs" role="tablist">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={activeMode === m.id}
              className={`cm-tab ${activeMode === m.id ? "cm-tab--active" : ""}`}
              onClick={() => handleModeChange(m.id)}
            >
              {m.id === "url" && <IconLink />}
              {m.id === "csv" && <IconTable />}
              {m.id === "pdf" && <IconFile />}
              {m.label}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="cm-body">
          {activeMode === "url" ? (
            <div className="cm-field">
              <label className="cm-label" htmlFor="cm-url">
                URL del catálogo
              </label>
              <input
                id="cm-url"
                type="url"
                className="cm-input"
                placeholder="https://proveedor.com/catalogo"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleImport()}
              />
            </div>
          ) : (
            <div className="cm-field">
              <label className="cm-label" htmlFor="cm-file">
                Archivo {currentMode.label}
              </label>
              <div
                className="cm-dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.files[0];
                  if (dropped) setFile(dropped);
                }}
              >
                {file ? (
                  <>
                    <IconCheck />
                    <span className="cm-dropzone-name">{file.name}</span>
                    <span className="cm-dropzone-hint">
                      {(file.size / 1024).toFixed(1)} KB — clic para cambiar
                    </span>
                  </>
                ) : (
                  <>
                    <IconUpload />
                    <span className="cm-dropzone-hint">
                      Arrastrá o hacé clic para subir un {currentMode.label}
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  id="cm-file"
                  type="file"
                  accept={currentMode.accept}
                  style={{ display: "none" }}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          )}

          <button
            className="cm-btn"
            onClick={handleImport}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="cm-spinner" aria-hidden="true" />
                Importando…
              </>
            ) : (
              <>
                <IconImport />
                Importar {currentMode.label}
              </>
            )}
          </button>
        </div>

        {/* Result */}
        {result !== null && (
          <div
            className={`cm-result ${result.success ? "cm-result--ok" : "cm-result--err"}`}
            role="status"
          >
            <div className="cm-result-badge">
              {result.success ? <IconCheck /> : <IconAlert />}
              <span>{result.success ? "Importación exitosa" : "Error"}</span>
            </div>
            <pre className="cm-pre">
              {JSON.stringify(result.success ? result.data : result.error, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* ── Scoped styles ── */}
      <style>{`
        .cm-root {
          min-height: 100vh;
          background: #0d0f14;
          color: #e8eaf0;
          font-family: 'DM Sans', 'Segoe UI', system-ui, sans-serif;
          padding: 3rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* ── Header ── */
        .cm-header {
          width: 100%;
          max-width: 640px;
          margin-bottom: 2.5rem;
        }
        .cm-header-eyebrow {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #6c8ef5;
          margin-bottom: 0.5rem;
        }
        .cm-header-title {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 0 0 0.4rem;
          background: linear-gradient(120deg, #e8eaf0 30%, #6c8ef5);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .cm-header-sub {
          font-size: 0.9rem;
          color: #7880a0;
          margin: 0;
        }

        /* ── Card ── */
        .cm-card {
          width: 100%;
          max-width: 640px;
          background: #13161f;
          border: 1px solid #1f2333;
          border-radius: 16px;
          overflow: hidden;
        }

        /* ── Tabs ── */
        .cm-tabs {
          display: flex;
          border-bottom: 1px solid #1f2333;
        }
        .cm-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.9rem 0.5rem;
          background: none;
          border: none;
          color: #7880a0;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.15s, background 0.15s;
        }
        .cm-tab svg { width: 15px; height: 15px; }
        .cm-tab:hover { color: #c0c6e0; background: #181c28; }
        .cm-tab--active {
          color: #6c8ef5;
          background: #181c28;
          box-shadow: inset 0 -2px 0 #6c8ef5;
        }

        /* ── Body ── */
        .cm-body {
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* ── Field ── */
        .cm-field { display: flex; flex-direction: column; gap: 0.5rem; }
        .cm-label {
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #7880a0;
        }
        .cm-input {
          background: #0d0f14;
          border: 1px solid #1f2333;
          border-radius: 8px;
          padding: 0.7rem 1rem;
          color: #e8eaf0;
          font-size: 0.92rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .cm-input::placeholder { color: #3d4460; }
        .cm-input:focus {
          border-color: #6c8ef5;
          box-shadow: 0 0 0 3px rgba(108,142,245,0.15);
        }

        /* ── Dropzone ── */
        .cm-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          border: 1.5px dashed #1f2333;
          border-radius: 10px;
          padding: 2rem 1rem;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          text-align: center;
        }
        .cm-dropzone:hover {
          border-color: #6c8ef5;
          background: rgba(108,142,245,0.04);
        }
        .cm-dropzone svg { width: 28px; height: 28px; color: #3d4460; }
        .cm-dropzone:hover svg { color: #6c8ef5; }
        .cm-dropzone-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: #c0c6e0;
          word-break: break-all;
        }
        .cm-dropzone-hint { font-size: 0.78rem; color: #7880a0; }

        /* ── Button ── */
        .cm-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          background: #6c8ef5;
          color: #fff;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s, opacity 0.15s;
          letter-spacing: 0.02em;
        }
        .cm-btn svg { width: 16px; height: 16px; }
        .cm-btn:hover:not(:disabled) { background: #8ba6ff; transform: translateY(-1px); }
        .cm-btn:active:not(:disabled) { transform: translateY(0); }
        .cm-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        /* ── Spinner ── */
        .cm-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: cm-spin 0.7s linear infinite;
        }
        @keyframes cm-spin { to { transform: rotate(360deg); } }

        /* ── Result ── */
        .cm-result {
          border-top: 1px solid #1f2333;
          padding: 1.25rem 1.75rem 1.75rem;
        }
        .cm-result--ok { --accent: #4ade80; --bg: rgba(74,222,128,0.06); }
        .cm-result--err { --accent: #f87171; --bg: rgba(248,113,113,0.06); }
        .cm-result-badge {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 0.75rem;
        }
        .cm-result-badge svg { width: 15px; height: 15px; }
        .cm-pre {
          background: var(--bg);
          border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
          border-radius: 8px;
          padding: 1rem;
          font-size: 0.8rem;
          color: #c0c6e0;
          overflow: auto;
          max-height: 280px;
          white-space: pre-wrap;
          word-break: break-all;
          margin: 0;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }
      `}</style>
    </div>
  );
}

/* ── Inline SVG icons ── */
function IconLink() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}
function IconTable() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M3 15h18M9 3v18"/>
    </svg>
  );
}
function IconFile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}
function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  );
}
function IconImport() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
