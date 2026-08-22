import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FilePenLine, Loader2, RotateCcw, Upload } from "lucide-react";
import SmartFormFill from "../components/forms/SmartFormFill";
import { detectFormFields, type SmartFormField } from "../services/smartFormApi";

export default function SmartForms() {
  const navigate = useNavigate();
  const [formTitle, setFormTitle] = useState("");
  const [fields, setFields] = useState<SmartFormField[] | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");

  const handleUploadBlankForm = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setError("");
    setDetecting(true);
    try {
      const result = await detectFormFields(file);
      if (!result.fields.length) {
        setError("Could not find any fillable fields in this document. Try a clearer scan or a different file.");
        return;
      }
      setFormTitle(result.form_title || "Detected form");
      setFields(result.fields);
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not read this form. Please try again.");
    } finally {
      setDetecting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-5 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15">
            <FilePenLine className="h-5 w-5 text-indigo-400" />
          </span>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Smart Forms</h1>
            <p className="text-sm text-muted-foreground">
              Upload any form — admission, job application, visa, or a government circular — and fill it by voice or by sharing your documents.
            </p>
          </div>
        </div>

        {!fields ? (
          <section className="rounded-2xl border border-border bg-card p-8 text-center shadow-lg shadow-black/10">
            <label className="mx-auto flex max-w-md cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/25 px-6 py-10 transition-colors hover:border-indigo-500">
              {detecting ? (
                <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
              ) : (
                <Upload className="h-7 w-7 text-indigo-400" />
              )}
              <span className="text-sm font-medium text-foreground">
                {detecting ? "Reading the form and finding its fields…" : "Upload the blank form you need to fill"}
              </span>
              <span className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP · maximum 10 MB</span>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={detecting}
                onChange={(event) => void handleUploadBlankForm(event.target.files)}
              />
            </label>
            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          </section>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setFields(null);
                setFormTitle("");
                setError("");
              }}
              className="mb-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Upload a different form
            </button>
            <SmartFormFill
              formTitle={formTitle}
              fields={fields}
              onSubmit={() => alert("Details confirmed. Form submission storage can be connected to your final workflow.")}
            />
          </>
        )}
      </div>
    </main>
  );
}
