import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FilePenLine, Loader2, RotateCcw, ScanLine, Upload } from "lucide-react";
import SmartFormFill from "../components/forms/SmartFormFill";
import { detectFormFields, type SmartFormField } from "../services/smartFormApi";

type Step = "upload" | "fill";

export default function SmartForms() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("upload");
  const [formTitle, setFormTitle] = useState("");
  const [fields, setFields] = useState<SmartFormField[] | null>(null);
  const [formImagesBase64, setFormImagesBase64] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File) => {
    setError("");
    setDetecting(true);
    try {
      const result = await detectFormFields(file);
      if (!result.fields.length) {
        setError(
          "No fillable fields found in this document. Try a clearer scan or a higher-resolution image.",
        );
        return;
      }
      setFormTitle(result.form_title || "Detected form");
      setFields(result.fields);
      const imgs = result.form_images_base64?.length
        ? result.form_images_base64
        : result.form_image_base64
          ? [result.form_image_base64]
          : [];
      setFormImagesBase64(imgs);
      setStep("fill");
    } catch (err: any) {
      const data = err.response?.data;
      const msg = data?.detail
        ? `${data.message ?? "Form detection failed"}: ${data.detail}`
        : (data?.message ?? "Could not read this form. Please try again.");
      setError(msg);
    } finally {
      setDetecting(false);
    }
  };

  const handleFileSelect = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (file) void processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const reset = () => {
    setStep("upload");
    setFields(null);
    setFormImagesBase64([]);
    setFormTitle("");
    setError("");
  };

  return (
    <main className="min-h-screen bg-background p-5 sm:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15">
            <FilePenLine className="h-5 w-5 text-indigo-400" />
          </span>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Smart Forms</h1>
            <p className="text-sm text-muted-foreground">
              Upload any form, share your documents, and let AI fill it for you — then top up with voice.
            </p>
          </div>
        </div>

        {/* Progress steps */}
        <div className="mb-8 flex items-center gap-0">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step === "fill"
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-600 text-white"
              }`}
            >
              {step === "fill" ? <CheckCircle2 className="h-4 w-4" /> : "1"}
            </span>
            <span className={`text-sm font-medium ${step === "upload" ? "text-foreground" : "text-muted-foreground"}`}>
              Upload blank form
            </span>
          </div>

          {/* Connector */}
          <div className={`mx-3 h-px flex-1 max-w-[60px] transition-colors ${step === "fill" ? "bg-indigo-500" : "bg-border"}`} />

          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step === "fill"
                  ? "bg-indigo-600 text-white"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              2
            </span>
            <span className={`text-sm font-medium ${step === "fill" ? "text-foreground" : "text-muted-foreground"}`}>
              Add your documents &amp; fill
            </span>
          </div>
        </div>

        {/* ── STEP 1: Upload blank form ── */}
        {step === "upload" && (
          <section className="rounded-2xl border border-border bg-card p-8 shadow-lg shadow-black/10">
            <div className="mx-auto max-w-lg">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10">
                  <ScanLine className="h-7 w-7 text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Upload the blank form</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Admission form, job application, visa form, government circular — any blank form you need to fill.
                </p>
              </div>

              <label
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200 ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-500/5 scale-[1.01]"
                    : detecting
                      ? "border-indigo-500/50 bg-indigo-500/5"
                      : "border-border bg-muted/20 hover:border-indigo-500 hover:bg-muted/30"
                }`}
              >
                {detecting ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                    <span className="text-sm font-medium text-foreground">
                      AI is reading your form and detecting fields…
                    </span>
                    <span className="text-xs text-muted-foreground">This may take a few seconds</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-indigo-400" />
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        Drag & drop or <span className="text-indigo-400">click to browse</span>
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, PNG, WEBP · maximum 10 MB</p>
                    </div>
                  </>
                )}
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  disabled={detecting}
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </label>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                  <span className="mt-0.5 text-red-400">⚠</span>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <p className="mt-6 text-center text-xs text-muted-foreground/60">
                After AI detects the fields, you'll upload your personal documents (passport, degree, etc.)
                in the next step and AI will fill the form for you automatically.
              </p>
            </div>
          </section>
        )}

        {/* ── STEP 2: Fill the form ── */}
        {step === "fill" && fields && (
          <>
            <button
              type="button"
              onClick={reset}
              className="mb-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Upload a different form
            </button>
            <SmartFormFill
              formTitle={formTitle}
              fields={fields}
              formImagesBase64={formImagesBase64}
              onSubmit={(values) => {
                // In production this would save/download/submit the filled form
                alert(
                  `Form filled successfully!\n\n${Object.entries(values)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("\n")}`,
                );
              }}
            />
          </>
        )}
      </div>
    </main>
  );
}
