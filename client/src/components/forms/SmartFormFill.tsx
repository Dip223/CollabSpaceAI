import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { extractDocumentText, mapDocumentToFields, type SmartFormField } from "../../services/smartFormApi";
import VoiceInput from "./VoiceInput";

type FieldMeta = { source: "ai" | "voice" | "manual"; confidence?: number; note?: string };

type Props = {
  formTitle: string;
  fields: SmartFormField[];
  onSubmit: (values: Record<string, string>) => void;
};

export default function SmartFormFill({ formTitle, fields, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldMeta, setFieldMeta] = useState<Record<string, FieldMeta>>({});
  const [missingRequired, setMissingRequired] = useState<string[]>([]);
  const [uploadedNames, setUploadedNames] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "extracting" | "mapping">("idle");
  const [notice, setNotice] = useState("");

  const setField = (id: string, value: string, meta: FieldMeta) => {
    setValues((current) => ({ ...current, [id]: value }));
    setFieldMeta((current) => ({ ...current, [id]: meta }));
    setMissingRequired((current) => current.filter((fieldId) => fieldId !== id));
  };

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setNotice("");
    setUploadedNames(files.map((file) => file.name));
    try {
      setStatus("extracting");
      const texts = await Promise.all(files.map(extractDocumentText));
      setStatus("mapping");
      const mapped = await mapDocumentToFields(texts.join("\n\n---\n\n"), fields);

      mapped.filled_fields.forEach((field) => {
        if (fields.some((candidate) => candidate.id === field.field_id)) {
          setField(field.field_id, field.value, { source: "ai", confidence: field.confidence, note: field.source });
        }
      });
      setMissingRequired(mapped.missing_required_fields || []);
      setNotice(mapped.notes || "Document fields were filled. Review each value before submitting.");
    } catch (error: any) {
      setNotice(error.response?.data?.message || "Could not read these documents. You can still fill the form manually.");
    } finally {
      setStatus("idle");
    }
  };

  const handleVoiceUpdates = useCallback((updates: Array<{ field_id: string; value: string }>) => {
    updates.forEach((update) => {
      if (fields.some((field) => field.id === update.field_id)) {
        setField(update.field_id, update.value, { source: "voice" });
      }
    });
  }, [fields]);

  const requiredStillMissing = useMemo(
    () => fields.filter((field) => field.required && !values[field.id]?.trim()),
    [fields, values]
  );
  const filledCount = Object.values(values).filter(Boolean).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">{formTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Upload a document or use voice input; always review values before submitting.</p>
          </div>
          <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">{filledCount}/{fields.length} fields</span>
        </div>

        <label className="mt-5 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/25 px-5 py-7 text-center transition-colors hover:border-indigo-500">
          <Upload className="h-6 w-6 text-indigo-400" />
          <span className="text-sm font-medium text-foreground">Upload PDF or image documents</span>
          <span className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP · maximum 10 MB each</span>
          <input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void handleFiles(event.target.files)} />
        </label>

        {uploadedNames.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2">{uploadedNames.map((name) => <span key={name} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"><FileText className="h-3.5 w-3.5" />{name}</span>)}{status !== "idle" && <span className="flex items-center gap-1 text-xs text-indigo-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />{status === "extracting" ? "Reading documents…" : "Mapping fields…"}</span>}</div>}
        {notice && <p className="mt-3 text-sm text-muted-foreground">{notice}</p>}

        <div className="mt-6 space-y-4">
          {fields.map((field) => {
            const meta = fieldMeta[field.id];
            const isMissing = missingRequired.includes(field.id) || (field.required && !values[field.id] && status === "idle" && uploadedNames.length > 0);
            return <div key={field.id}>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <label className="text-sm font-medium text-foreground">{field.label}{field.required ? " *" : ""}</label>
                {meta?.source === "ai" && <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">AI {meta.confidence ? `${Math.round(meta.confidence * 100)}%` : ""}</span>}
                {meta?.source === "voice" && <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">Voice</span>}
                {isMissing && <span className="flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-400"><AlertTriangle className="h-3 w-3" />Missing</span>}
              </div>
              <input type={field.type || "text"} value={values[field.id] || ""} onChange={(event) => setField(field.id, event.target.value, { source: "manual" })} className={`w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-indigo-500 ${isMissing ? "border-red-500/60" : "border-border"}`} />
            </div>;
          })}
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fill summary</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{Math.round((filledCount / fields.length) * 100)}%</p>
          <p className="text-sm text-muted-foreground">{filledCount} of {fields.length} fields filled</p>
          <p className={`mt-3 text-sm ${requiredStillMissing.length ? "text-red-400" : "text-emerald-400"}`}>Required fields missing: {requiredStillMissing.length}</p>
          <button type="button" disabled={requiredStillMissing.length > 0} onClick={() => onSubmit(values)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 className="h-4 w-4" />Confirm details</button>
        </section>
        <VoiceInput activeFields={fields} onFieldUpdates={handleVoiceUpdates} />
      </aside>
    </div>
  );
}
