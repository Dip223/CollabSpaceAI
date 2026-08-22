import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware";
import { aiServiceHeaders, aiServiceUrl, readAiError } from "../services/aiService";

const router = Router();
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, callback) => {
    callback(null, ACCEPTED_TYPES.has(file.mimetype));
  },
});

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

export default router;
