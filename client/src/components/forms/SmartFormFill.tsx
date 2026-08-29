import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  FileText,
  GraduationCap,
  IdCard,
  Loader2,
  Mic,
  Printer,
  Scroll,
  Upload,
  X,
} from "lucide-react";
import { scanDocumentsWithAI, type SmartFormField } from "../../services/smartFormApi";
import { exportFormAsPdf, isCheckboxValue } from "../../utils/formExport";
import VoiceInput from "./VoiceInput";


type FieldMeta = { source: "ai" | "voice" | "manual"; confidence?: number; note?: string };

type Props = {
  formTitle: string;
  fields: SmartFormField[];
  formImagesBase64?: string[];
  onSubmit: (values: Record<string, string>) => void;
};

type UploadedFile = { file: File; id: string };

const DOC_HINTS = [
  { label: "Passport", icon: <IdCard className="h-3.5 w-3.5" /> },
  { label: "Birth Certificate", icon: <Scroll className="h-3.5 w-3.5" /> },
  { label: "Grade Sheet", icon: <GraduationCap className="h-3.5 w-3.5" /> },
  { label: "Degree", icon: <GraduationCap className="h-3.5 w-3.5" /> },
  { label: "National ID", icon: <IdCard className="h-3.5 w-3.5" /> },
];

type ScanStatus = "idle" | "scanning";

export default function SmartFormFill({ formTitle, fields, formImagesBase64, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldMeta, setFieldMeta] = useState<Record<string, FieldMeta>>({});
  const [missingRequired, setMissingRequired] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanStep, setScanStep] = useState("");
  const [notice, setNotice] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<"en-US" | "bn-BD">("en-US");
  const [showExportModal, setShowExportModal] = useState(false);
  const [viewMode, setViewMode] = useState<"overlay" | "list">("overlay");
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportPdf = () => {
    exportFormAsPdf(formTitle, fields, values, formImagesBase64);
  };


  const setField = (id: string, value: string, meta: FieldMeta) => {
    setValues((cur) => ({ ...cur, [id]: value }));
    setFieldMeta((cur) => ({ ...cur, [id]: meta }));
    setMissingRequired((cur) => cur.filter((fid) => fid !== id));
  };

  const addFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    setUploadedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.file.name + f.file.size));
      const newOnes = list
        .filter((f) => !existing.has(f.name + f.size))
        .slice(0, 5 - prev.length)
        .map((file) => ({ file, id: `${file.name}-${file.size}-${Date.now()}` }));
      return [...prev, ...newOnes].slice(0, 5);
    });
  };

  const removeFile = (id: string) => setUploadedFiles((prev) => prev.filter((f) => f.id !== id));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleScan = async () => {
    if (!uploadedFiles.length) return;
    setNotice("");
    setMissingRequired([]);
    setScanStatus("scanning");

    try {
      setScanStep("Reading your documents with AI vision…");
      await new Promise((r) => setTimeout(r, 300)); // let UI update

      setScanStep("Extracting data from passport, certificates, etc…");
      const result = await scanDocumentsWithAI(
        uploadedFiles.map((u) => u.file),
        fields,
      );

      setScanStep("Mapping extracted data to form fields…");
      await new Promise((r) => setTimeout(r, 200));

      result.filled_fields.forEach((f) => {
        if (fields.some((field) => field.id === f.field_id)) {
          setField(f.field_id, f.value, {
            source: "ai",
            confidence: f.confidence,
            note: f.source,
          });
        }
      });

      setMissingRequired(result.missing_required_fields ?? []);
      setNotice(result.notes ?? "Scan complete. Please review all values before submitting.");
    } catch (err: any) {
      setNotice(
        err.response?.data?.message ??
          "Could not scan your documents. You can still fill the form manually or try again.",
      );
    } finally {
      setScanStatus("idle");
      setScanStep("");
    }
  };

  const handleVoiceUpdates = useCallback(
    (updates: Array<{ field_id: string; value: string }>) => {
      updates.forEach((u) => {
        const targetField = fields.find((f) => f.id === u.field_id);
        if (targetField) {
          const isCb = isCheckboxValue(targetField, u.value);
          const finalVal = isCb ? "✓" : u.value;
          setField(u.field_id, finalVal, { source: "voice" });
        }
      });
    },
    [fields],
  );

  const requiredStillMissing = useMemo(
    () => fields.filter((f) => f.required && !values[f.id]?.trim()),
    [fields, values],
  );

  const filledCount = Object.values(values).filter(Boolean).length;
  const scanDone = uploadedFiles.length > 0 && scanStatus === "idle" && (missingRequired.length > 0 || filledCount > 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* ── Left column: document upload + form fields ── */}
      <div className="space-y-5">

        {/* Document upload card */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/10">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Upload Your Documents</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI will scan passport, birth cert, degree, grade sheet — up to 5 files
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DOC_HINTS.map((h) => (
                <span
                  key={h.label}
                  className="flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {h.icon}
                  {h.label}
                </span>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-5 py-8 text-center transition-all duration-200 ${
              isDragging
                ? "border-indigo-500 bg-indigo-500/5 scale-[1.01]"
                : "border-border bg-muted/20 hover:border-indigo-500 hover:bg-muted/30"
            }`}
          >
            <Upload className={`h-6 w-6 transition-colors ${isDragging ? "text-indigo-400" : "text-muted-foreground"}`} />
            <p className="text-sm font-medium text-foreground">
              Drag & drop files here, or <span className="text-indigo-400">click to browse</span>
            </p>
            <p className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP · max 10 MB each · up to 5 files</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => addFiles(e.target.files ?? [])}
            />
          </div>

          {/* Uploaded file chips */}
          {uploadedFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {uploadedFiles.map((u) => (
                <span
                  key={u.id}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="max-w-[160px] truncate">{u.file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(u.id); }}
                    className="ml-0.5 rounded text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${u.file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Scan button */}
          {uploadedFiles.length > 0 && (
            <button
              type="button"
              onClick={() => void handleScan()}
              disabled={scanStatus === "scanning"}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {scanStatus === "scanning" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {scanStep || "Scanning…"}
                </>
              ) : (
                <>
                  <IdCard className="h-4 w-4" />
                  Scan Documents &amp; Auto-fill Form
                </>
              )}
            </button>
          )}

          {/* Notice */}
          {notice && (
            <p className="mt-3 text-xs text-muted-foreground rounded-lg bg-muted/30 px-3 py-2">{notice}</p>
          )}
        </section>

        {/* Missing required fields — warning banner */}
        {scanDone && missingRequired.length > 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <p className="text-sm font-semibold text-amber-300">
                {missingRequired.length} required field{missingRequired.length > 1 ? "s" : ""} could not be found in your documents
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missingRequired.map((fid) => {
                const label = fields.find((f) => f.id === fid)?.label ?? fid;
                return (
                  <span
                    key={fid}
                    className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-300"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-amber-400/70">
              Please fill these manually below or use voice input.
            </p>
          </div>
        )}

        {/* Form fields */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/10">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{formTitle}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Review every field — AI and voice fills can be edited directly on the form image or list.
              </p>
            </div>
            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
              {filledCount}/{fields.length} filled
            </span>
          </div>

          {/* View mode toggle */}
          {formImagesBase64 && formImagesBase64.length > 0 && (
            <div className="flex items-center justify-between gap-2 mb-4 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode("overlay")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    viewMode === "overlay"
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Uploaded Form View (Visual Fill)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    viewMode === "list"
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Standard Fields List
                </button>
              </div>

              {formImagesBase64.length > 1 && viewMode === "overlay" && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Page:</span>
                  {formImagesBase64.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePageIndex(idx)}
                      className={`h-6 w-6 rounded text-xs font-semibold transition-colors ${
                        activePageIndex === idx
                          ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Mode A: Interactive Form Overlay View ── */}
          {formImagesBase64 && formImagesBase64.length > 0 && viewMode === "overlay" ? (
            <div className="relative w-full overflow-hidden rounded-xl border border-border bg-slate-900/5 dark:bg-slate-950/40 p-2 shadow-inner">
              <div className="relative w-full max-w-[840px] mx-auto aspect-[1/1.414]">
                <img
                  src={formImagesBase64[activePageIndex] || formImagesBase64[0]}
                  alt={`Uploaded Form Page ${activePageIndex + 1}`}
                  className="w-full h-full object-contain pointer-events-none rounded-lg"
                />

                {fields
                  .filter((f) => (f.page ?? 0) === activePageIndex)
                  .map((field) => {
                    const meta = fieldMeta[field.id];
                    const isMissing =
                      missingRequired.includes(field.id) ||
                      (field.required && !values[field.id] && scanDone);
                    const [ymin, xmin, ymax, xmax] = field.box_2d || [0, 0, 0, 0];

                    if (!field.box_2d) return null;

                    const isCheckbox = isCheckboxValue(field, values[field.id]);

                    if (isCheckbox) {
                      const isChecked = Boolean(values[field.id]?.trim());
                      return (
                        <button
                          key={field.id}
                          type="button"
                          onClick={() => setField(field.id, isChecked ? "" : "✓", { source: "manual" })}
                          style={{
                            position: "absolute",
                            top: `${ymin / 10}%`,
                            left: `${xmin / 10}%`,
                            width: `${(xmax - xmin) / 10}%`,
                            height: `${(ymax - ymin) / 10}%`,
                          }}
                          className={`group rounded border transition-all flex items-center justify-center cursor-pointer z-10 ${
                            isChecked
                              ? "border-blue-600 bg-blue-500/30 text-blue-950 dark:text-blue-100 font-black text-sm shadow-sm"
                              : "border-indigo-400/50 bg-indigo-500/10 hover:border-indigo-500 hover:bg-indigo-500/25"
                          }`}
                          title={`Toggle ${field.label}`}
                        >
                          {isChecked ? "✔" : ""}
                        </button>
                      );
                    }

                    return (
                      <div
                        key={field.id}
                        style={{
                          position: "absolute",
                          top: `${ymin / 10}%`,
                          left: `${xmin / 10}%`,
                          width: `${(xmax - xmin) / 10}%`,
                          height: `${(ymax - ymin) / 10}%`,
                        }}
                        className={`group rounded border transition-all flex items-center px-1 z-10 ${
                          isMissing
                            ? "border-red-500/80 bg-red-500/20"
                            : meta?.source === "ai"
                              ? "border-indigo-500/60 bg-indigo-500/20 hover:bg-indigo-500/30"
                              : meta?.source === "voice"
                                ? "border-emerald-500/60 bg-emerald-500/20 hover:bg-emerald-500/30"
                                : "border-indigo-400/50 bg-indigo-500/15 hover:border-indigo-500 hover:bg-indigo-500/25"
                        }`}
                        title={`${field.label} (${field.required ? "Required" : "Optional"})`}
                      >
                        <input
                          type={field.type === "number" ? "number" : "text"}
                          value={values[field.id] ?? ""}
                          onChange={(e) => setField(field.id, e.target.value, { source: "manual" })}
                          placeholder={field.label}
                          className="w-full h-full bg-transparent text-xs font-bold text-blue-900 dark:text-blue-200 outline-none placeholder:text-slate-400/70 placeholder:font-normal"
                        />
                      </div>
                    );
                  })}
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Tip: Values entered above appear inside the exact boxes of your uploaded form and will export into the identical visual form layout!
              </p>
            </div>
          ) : (
            /* ── Mode B: Standard Fields List ── */
            <div className="space-y-4">
              {fields.map((field) => {
                const meta = fieldMeta[field.id];
                const isMissing =
                  missingRequired.includes(field.id) ||
                  (field.required && !values[field.id] && scanDone);

                return (
                  <div key={field.id}>
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <label htmlFor={`field-${field.id}`} className="text-sm font-medium text-foreground">
                        {field.label}
                        {field.required && <span className="ml-0.5 text-red-400">*</span>}
                      </label>

                      {meta?.source === "ai" && (
                        <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
                          AI {meta.confidence != null ? `${Math.round(meta.confidence * 100)}%` : ""}
                        </span>
                      )}
                      {meta?.source === "voice" && (
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                          <Mic className="h-2.5 w-2.5" />
                          Voice
                        </span>
                      )}
                      {isMissing && (
                        <span className="flex items-center gap-0.5 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Missing
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id={`field-${field.id}`}
                        type={field.type ?? "text"}
                        value={values[field.id] ?? ""}
                        onChange={(e) => setField(field.id, e.target.value, { source: "manual" })}
                        className={`flex-1 rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-indigo-500 ${
                          isMissing
                            ? "border-red-500/60 focus:border-red-400"
                            : meta?.source === "ai"
                              ? "border-indigo-500/40"
                              : meta?.source === "voice"
                                ? "border-emerald-500/40"
                                : "border-border"
                        }`}
                        placeholder={isMissing ? "Required — not found in documents" : ""}
                      />

                      <VoiceInput
                        activeFields={fields}
                        onFieldUpdates={handleVoiceUpdates}
                        targetFieldId={field.id}
                        compact
                        language={voiceLanguage}
                      />
                    </div>

                    {meta?.note && meta.source === "ai" && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground/60 pl-1">
                        Source: {meta.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Right column: summary + global voice ── */}
      <aside className="space-y-5">
        {/* Fill summary */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/10">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fill Progress</p>

          {/* Progress bar */}
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${fields.length ? Math.round((filledCount / fields.length) * 100) : 0}%` }}
            />
          </div>

          <p className="mt-2 text-3xl font-bold text-foreground">
            {fields.length ? Math.round((filledCount / fields.length) * 100) : 0}%
          </p>
          <p className="text-sm text-muted-foreground">{filledCount} of {fields.length} fields filled</p>

          <div className="mt-3 space-y-1">
            <p className={`text-sm font-medium ${requiredStillMissing.length ? "text-red-400" : "text-emerald-400"}`}>
              {requiredStillMissing.length
                ? `⚠ ${requiredStillMissing.length} required field${requiredStillMissing.length > 1 ? "s" : ""} still missing`
                : "✓ All required fields filled"}
            </p>
          </div>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              disabled={requiredStillMissing.length > 0}
              onClick={() => {
                setShowExportModal(true);
                onSubmit(values);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 shadow-lg shadow-indigo-600/20"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm &amp; Export Form
            </button>

            {/* Direct Export Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleExportPdf}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-400 transition-colors hover:bg-indigo-500/20"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export PDF
              </button>
            </div>
          </div>

          {requiredStillMissing.length > 0 && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
              Fill or speak all required (*) fields to confirm
            </p>
          )}
        </section>

        {/* Global voice input */}
        <VoiceInput
          activeFields={fields}
          onFieldUpdates={handleVoiceUpdates}
          language={voiceLanguage}
          onLanguageChange={setVoiceLanguage}
        />

        {/* Legend */}
        <section className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Field colours</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm border border-indigo-500/40 bg-background" />
              <span className="text-xs text-muted-foreground">AI-filled (blue border)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm border border-emerald-500/40 bg-background" />
              <span className="text-xs text-muted-foreground">Voice-filled (green border)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm border border-red-500/60 bg-background" />
              <span className="text-xs text-muted-foreground">Missing required (red border)</span>
            </div>
          </div>
        </section>
      </aside>

      {/* ── Export & Completion Modal ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setShowExportModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-foreground">Form Ready to Export</h3>
                <p className="text-xs text-muted-foreground">Your form details have been confirmed!</p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">{formTitle}</p>
              <p className="text-xs text-muted-foreground">
                Total fields: <span className="font-semibold text-foreground">{fields.length}</span> · Filled:{" "}
                <span className="font-semibold text-emerald-400">{filledCount}</span>
              </p>
            </div>

            <p className="mb-3 text-xs font-medium text-muted-foreground">Download your completed form as:</p>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={handleExportPdf}
                className="flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-left transition-all hover:border-indigo-500 hover:bg-indigo-500/20 group"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md group-hover:scale-105 transition-transform">
                  <FileDown className="h-5 w-5" />
                </span>
                <div>
                  <span className="block text-sm font-semibold text-foreground">PDF Document</span>
                  <span className="block text-[11px] text-muted-foreground">Styled PDF file (.pdf)</span>
                </div>
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

