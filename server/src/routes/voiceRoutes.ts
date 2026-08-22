import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { aiServiceHeaders, aiServiceUrl, readAiError } from "../services/aiService";

const router = Router();

type FormField = { id: string; label: string; type?: string; required?: boolean };

router.post("/intent", authMiddleware, async (req, res) => {
  const transcript = typeof req.body.transcript === "string" ? req.body.transcript.trim() : "";
  const fields = Array.isArray(req.body.activeFormFields) ? req.body.activeFormFields : [];

  if (!transcript || transcript.length > 2000) {
    return res.status(400).json({ message: "A voice transcript of up to 2,000 characters is required." });
  }

  const activeFormFields: FormField[] = (fields as unknown[])
    .filter((field: unknown): field is FormField => Boolean(field && typeof field === "object" && typeof (field as FormField).id === "string" && typeof (field as FormField).label === "string"))
    .slice(0, 100)
    .map((field) => ({
      id: field.id.slice(0, 100),
      label: field.label.slice(0, 160),
      type: field.type || "text",
      required: Boolean(field.required),
    }));

  try {
    const response = await fetch(aiServiceUrl("/voice/intent"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...aiServiceHeaders() },
      body: JSON.stringify({
        transcript,
        language: req.body.language === "bn" ? "bn" : "en",
        active_form_fields: activeFormFields,
        context: "form_fill",
      }),
    });

    if (!response.ok) {
      return res.status(502).json({ message: "Voice AI is unavailable.", detail: await readAiError(response) });
    }

    return res.json(await response.json());
  } catch (error) {
    console.error("Voice AI request failed:", error);
    return res.status(503).json({ message: "Could not reach the AI service. Please try again." });
  }
});

export default router;
