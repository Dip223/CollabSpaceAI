import { useNavigate } from "react-router-dom";
import { ArrowLeft, FilePenLine } from "lucide-react";
import SmartFormFill from "../components/forms/SmartFormFill";
import type { SmartFormField } from "../services/smartFormApi";

const ADMISSION_FIELDS: SmartFormField[] = [
  { id: "fullName", label: "Full name", required: true },
  { id: "email", label: "Email address", type: "email", required: true },
  { id: "dateOfBirth", label: "Date of birth", type: "date", required: true },
  { id: "nidOrBirthCertificate", label: "NID or birth certificate number", required: true },
  { id: "fatherName", label: "Father's name" },
  { id: "motherName", label: "Mother's name" },
  { id: "phone", label: "Phone number" },
  { id: "sscGpa", label: "SSC GPA", type: "number" },
  { id: "hscGpa", label: "HSC GPA", type: "number" },
];

export default function SmartForms() {
  const navigate = useNavigate();
  return <main className="min-h-screen bg-background p-5 sm:p-8">
    <div className="mx-auto max-w-6xl">
      <button type="button" onClick={() => navigate("/dashboard")} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to dashboard</button>
      <div className="mb-7 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15"><FilePenLine className="h-5 w-5 text-indigo-400" /></span><div><h1 className="text-3xl font-bold text-foreground">Smart Forms</h1><p className="text-sm text-muted-foreground">AI-assisted document extraction and voice form filling.</p></div></div>
      <SmartFormFill formTitle="Admission information form" fields={ADMISSION_FIELDS} onSubmit={() => alert("Details confirmed. Form submission storage can be connected to your final admission workflow.")} />
    </div>
  </main>;
}
