import api from "./api";

export type SmartFormField = {
  id: string;
  label: string;
  type?: "text" | "date" | "email" | "number";
  required?: boolean;
};

export type FilledField = {
  field_id: string;
  value: string;
  confidence?: number;
  source?: string;
};

export const detectFormFields = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post<{ form_title: string; fields: SmartFormField[] }>("/forms/detect", form);
  return response.data;
};

export const extractDocumentText = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post<{ extracted_text: string }>("/forms/extract", form);
  return response.data.extracted_text;
};

export const mapDocumentToFields = async (extractedText: string, formFields: SmartFormField[]) => {
  const response = await api.post<{
    filled_fields: FilledField[];
    missing_required_fields: string[];
    notes?: string;
  }>("/forms/map", { extractedText, formFields });
  return response.data;
};

export const processVoiceIntent = async (
  transcript: string,
  language: "bn" | "en",
  activeFormFields: SmartFormField[]
) => {
  const response = await api.post<{
    intent: string;
    field_updates?: Array<{ field_id: string; value: string }>;
  }>("/voice/intent", { transcript, language, activeFormFields });
  return response.data;
};
