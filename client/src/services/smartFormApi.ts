import api from "./api";

export type SmartFormField = {
  id: string;
  label: string;
  type?: "text" | "date" | "email" | "number" | "checkbox";
  required?: boolean;
  box_2d?: [number, number, number, number];
  page?: number;
};

export type FilledField = {
  field_id: string;
  value: string;
  confidence?: number;
  source?: string;
};

export type ScanResult = {
  filled_fields: FilledField[];
  missing_required_fields: string[];
  notes?: string;
};

export const detectFormFields = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post<{
    form_title: string;
    fields: SmartFormField[];
    form_images_base64?: string[];
    form_image_base64?: string;
  }>("/forms/detect", form);
  return response.data;
};

export const extractDocumentText = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post<{ extracted_text: string }>("/forms/extract", form);
  return response.data.extracted_text;
};

export const mapDocumentToFields = async (extractedText: string, formFields: SmartFormField[]) => {
  const response = await api.post<ScanResult>("/forms/map", { extractedText, formFields });
  return response.data;
};

/**
 * Vision-based document scan — sends actual document images (passport, degree, birth cert, etc.)
 * to Gemini vision which reads them directly and maps data onto form fields.
 * Much more accurate than OCR for structured identity documents.
 */
export const scanDocumentsWithAI = async (files: File[], formFields: SmartFormField[]) => {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  form.append("formFields", JSON.stringify(formFields));
  const response = await api.post<ScanResult>("/forms/scan-documents", form);
  return response.data;
};

export const processVoiceIntent = async (
  transcript: string,
  language: "bn" | "en",
  activeFormFields: SmartFormField[],
  targetFieldId?: string,
) => {
  const response = await api.post<{
    intent: string;
    field_updates?: Array<{ field_id: string; value: string }>;
  }>("/voice/intent", { transcript, language, activeFormFields, targetFieldId });
  return response.data;
};
