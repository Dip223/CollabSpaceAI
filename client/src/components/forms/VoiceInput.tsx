import { useCallback, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { processVoiceIntent, type SmartFormField } from "../../services/smartFormApi";

type SpeechRecognitionResultEvent = Event & { resultIndex: number; results: SpeechRecognitionResultList };
type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type Props = {
  activeFields: SmartFormField[];
  onFieldUpdates: (updates: Array<{ field_id: string; value: string }>) => void;
};

export default function VoiceInput({ activeFields, onFieldUpdates }: Props) {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState<"en-US" | "bn-BD">("en-US");
  const [message, setMessage] = useState("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const processTranscript = useCallback(async (value: string) => {
    if (!value) return;
    setProcessing(true);
    setMessage("");
    try {
      const result = await processVoiceIntent(value, language.startsWith("bn") ? "bn" : "en", activeFields);
      if (result.field_updates?.length) {
        onFieldUpdates(result.field_updates);
        setMessage(`${result.field_updates.length} field updated from your voice.`);
      } else {
        setMessage("No matching form field was found. Please try again or type it manually.");
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Voice processing failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  }, [activeFields, language, onFieldUpdates]);

  const startListening = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage("Voice input is supported in Chrome or Edge. Please use one of those browsers.");
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = false;
    setTranscript("");
    setMessage("");

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += text;
        else interim += text;
      }
      setTranscript(finalText || interim);
      if (finalText.trim()) void processTranscript(finalText.trim());
    };
    recognition.onerror = (event) => {
      setMessage(`Microphone error: ${event.error}`);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  };

  return (
    <section className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Voice input</h3>
        <select value={language} onChange={(event) => setLanguage(event.target.value as "en-US" | "bn-BD")} disabled={listening} className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground">
          <option value="en-US">English</option>
          <option value="bn-BD">বাংলা</option>
        </select>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={listening ? () => recognitionRef.current?.stop() : startListening} disabled={processing} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors ${listening ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-500"} disabled:opacity-50`} aria-label={listening ? "Stop listening" : "Start voice input"}>
          {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <p className="min-h-6 text-sm text-muted-foreground">{transcript || (listening ? "Listening…" : "Press the mic, then speak a field value.")}</p>
      </div>
      {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
    </section>
  );
}
