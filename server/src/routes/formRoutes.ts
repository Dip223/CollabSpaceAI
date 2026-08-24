import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware";
import { aiServiceHeaders, aiServiceUrl, readAiError } from "../services/aiService";

const router = Router();
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, callback) => {
    const ext = (file.originalname || "").toLowerCase();
    const isDoc = ext.endsWith(".doc") || ext.endsWith(".docx");
    callback(null, ACCEPTED_TYPES.has(file.mimetype) || isDoc);
  },
});

// ── Detect fields from a blank form image ──────────────────────────────────
router.post("/detect", authMiddleware, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Upload a PDF, DOC, DOCX, JPG, PNG, or WEBP file up to 10 MB." });
  }

  try {
    const form = new FormData();
    const bytes = new Uint8Array(req.file.buffer);
    form.append("file", new Blob([bytes], { type: req.file.mimetype }), req.file.originalname);

    const response = await fetch(aiServiceUrl("/forms/detect-fields"), {
      method: "POST",
      headers: aiServiceHeaders(),
      body: form,
    });

    if (!response.ok) {
      return res.status(502).json({ message: "Form field detection failed.", detail: await readAiError(response) });
    }

    return res.json(await response.json());
  } catch (error) {
    console.error("Form field detection failed:", error);
    return res.status(503).json({ message: "Could not reach the AI service. Please try again." });
  }
});

// ── Extract raw text from a single document (OCR fallback) ─────────────────
router.post("/extract", authMiddleware, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Upload a PDF, JPG, PNG, or WEBP file up to 10 MB." });
  }

  try {
    const form = new FormData();
    const bytes = new Uint8Array(req.file.buffer);
    form.append("file", new Blob([bytes], { type: req.file.mimetype }), req.file.originalname);

    const response = await fetch(aiServiceUrl("/forms/extract-text"), {
      method: "POST",
      headers: aiServiceHeaders(),
      body: form,
    });

    if (!response.ok) {
      return res.status(502).json({ message: "Document extraction failed.", detail: await readAiError(response) });
    }

    return res.json(await response.json());
  } catch (error) {
    console.error("Form extraction failed:", error);
    return res.status(503).json({ message: "Could not reach the AI service. Please try again." });
  }
});

// ── Map OCR text onto fields (text-based, legacy) ──────────────────────────
router.post("/map", authMiddleware, async (req, res) => {
  const extractedText = typeof req.body.extractedText === "string" ? req.body.extractedText.trim() : "";
  const fields = Array.isArray(req.body.formFields) ? req.body.formFields : [];

  if (!extractedText || extractedText.length > 100_000 || !fields.length) {
    return res.status(400).json({ message: "Extracted text and at least one form field are required." });
  }

  type FormField = { id: string; label: string; type?: string; required?: boolean };
  const formFields = (fields as unknown[])
    .filter((field: unknown): field is FormField => Boolean(field && typeof field === "object" && typeof (field as { id?: unknown }).id === "string" && typeof (field as { label?: unknown }).label === "string"))
    .slice(0, 100)
    .map((field) => ({
      id: field.id.slice(0, 100),
      label: field.label.slice(0, 160),
      type: field.type || "text",
      required: Boolean(field.required),
    }));

  try {
    const response = await fetch(aiServiceUrl("/forms/map-fields"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...aiServiceHeaders() },
      body: JSON.stringify({ extracted_text: extractedText, form_fields: formFields }),
    });

    if (!response.ok) {
      return res.status(502).json({ message: "AI field mapping failed.", detail: await readAiError(response) });
    }

    return res.json(await response.json());
  } catch (error) {
    console.error("Form mapping failed:", error);
    return res.status(503).json({ message: "Could not reach the AI service. Please try again." });
  }
});

// ── Vision-based document scan: passport, degree, birth cert, etc. ─────────
router.post("/scan-documents", authMiddleware, upload.array("files", 5), async (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: "Upload at least one document (passport, degree, etc.)." });
  }

  const rawFields = req.body.formFields;
  if (!rawFields) {
    return res.status(400).json({ message: "formFields JSON is required." });
  }

  let formFields: unknown[];
  try {
    formFields = JSON.parse(typeof rawFields === "string" ? rawFields : JSON.stringify(rawFields));
    if (!Array.isArray(formFields) || formFields.length === 0) throw new Error("empty");
  } catch {
    return res.status(400).json({ message: "formFields must be a valid non-empty JSON array." });
  }

  try {
    const aiForm = new FormData();

    for (const file of files) {
      const bytes = new Uint8Array(file.buffer);
      aiForm.append("files", new Blob([bytes], { type: file.mimetype }), file.originalname);
    }

    // Sanitise fields before forwarding
    type RawField = { id?: unknown; label?: unknown; type?: unknown; required?: unknown };
    const sanitisedFields = (formFields as RawField[])
      .filter((f): f is Required<Pick<RawField, "id" | "label">> & RawField =>
        Boolean(f && typeof f === "object" && typeof f.id === "string" && typeof f.label === "string")
      )
      .slice(0, 100)
      .map((f) => ({
        id: (f.id as string).slice(0, 100),
        label: (f.label as string).slice(0, 160),
        type: typeof f.type === "string" && ["text", "date", "email", "number"].includes(f.type) ? f.type : "text",
        required: Boolean(f.required),
      }));

    aiForm.append("form_fields", JSON.stringify(sanitisedFields));

    const response = await fetch(aiServiceUrl("/forms/extract-documents"), {
      method: "POST",
      headers: aiServiceHeaders(),
      body: aiForm,
    });

    if (!response.ok) {
      return res.status(502).json({ message: "AI document scan failed.", detail: await readAiError(response) });
    }

    return res.json(await response.json());
  } catch (error) {
    console.error("Document scan failed:", error);
    return res.status(503).json({ message: "Could not reach the AI service. Please try again." });
  }
});

export default router;
