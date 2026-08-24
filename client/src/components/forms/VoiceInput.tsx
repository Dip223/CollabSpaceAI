import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Volume2 } from "lucide-react";
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
  /** When set, voice will target this specific field (mic clicked next to a field). */
  targetFieldId?: string;
  /** Whether this is rendered as an inline field-level mic (compact mode). */
  compact?: boolean;
  language: "en-US" | "bn-BD";
  onLanguageChange?: (lang: "en-US" | "bn-BD") => void;
};

export default function VoiceInput({ activeFields, onFieldUpdates, targetFieldId, compact = false, language, onLanguageChange }: Props) {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [message, setMessage] = useState("");
  const [updatedFields, setUpdatedFields] = useState<string[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const animFrameRef = useRef<number>(0);
  const barsRef = useRef<number[]>(Array.from({ length: 12 }, () => 0.15));
  const [barHeights, setBarHeights] = useState<number[]>(barsRef.current);

  // Animate bars while listening
  useEffect(() => {
    if (!listening) {
      setBarHeights(Array.from({ length: 12 }, () => 0.15));
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const animate = () => {
      barsRef.current = barsRef.current.map((h) => {
        const target = 0.1 + Math.random() * 0.9;
        return h + (target - h) * 0.25;
      });
      setBarHeights([...barsRef.current]);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [listening]);

  const processTranscript = useCallback(async (value: string) => {
    if (!value) return;
    setProcessing(true);
    setMessage("");
    setUpdatedFields([]);
    try {
      const result = await processVoiceIntent(
        value,
        language.startsWith("bn") ? "bn" : "en",
        activeFields,
        targetFieldId,
      );
      if (result.field_updates?.length) {
        const validUpdates = result.field_updates.filter((u) =>
          activeFields.some((f) => f.id === u.field_id),
        );
        if (validUpdates.length) {
          onFieldUpdates(validUpdates);
          const names = validUpdates.map((u) => {
            const field = activeFields.find((f) => f.id === u.field_id);
            return field?.label ?? u.field_id;
          });
          setUpdatedFields(names);
          setMessage(`✓ Filled: ${names.join(", ")}`);
        } else {
          setMessage("No matching field found. Try speaking the field name and its value.");
        }
      } else {
        setMessage("Could not match any field. Try: 'My name is John' or 'Date of birth 1995-06-15'.");
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Voice processing failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  }, [activeFields, language, onFieldUpdates, targetFieldId]);

  const startListening = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage("Voice input requires Chrome or Edge. Please switch browsers.");
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = false;
    setTranscript("");
    setInterimTranscript("");
    setMessage("");
    setUpdatedFields([]);

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += text;
        else interim += text;
      }
      if (finalText) {
        setTranscript(finalText);
        setInterimTranscript("");
        void processTranscript(finalText.trim());
      } else {
        setInterimTranscript(interim);
      }
    };
    recognition.onerror = (event) => {
      setMessage(`Microphone error: ${event.error}. Check browser permissions.`);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
    };
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // ── Compact mode: just a mic icon button for a single field ───────────────
  if (compact) {
    return (
      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        disabled={processing}
        title={listening ? "Stop recording" : `Speak to fill this field`}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
          listening
            ? "bg-red-500/20 text-red-400 ring-2 ring-red-500/40 animate-pulse"
            : processing
              ? "bg-indigo-500/10 text-indigo-400"
              : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
        } disabled:opacity-40`}
        aria-label={listening ? "Stop listening" : "Voice input for this field"}
      >
        {processing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : listening ? (
          <MicOff className="h-3.5 w-3.5" />
        ) : (
          <Mic className="h-3.5 w-3.5" />
        )}
      </button>
    );
  }

  // ── Full panel mode ────────────────────────────────────────────────────────
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-foreground">Voice Fill</h3>
        </div>
        {onLanguageChange && (
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as "en-US" | "bn-BD")}
            disabled={listening}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-indigo-500"
          >
            <option value="en-US">English</option>
            <option value="bn-BD">বাংলা</option>
          </select>
        )}
      </div>

      {/* Waveform visualiser */}
      <div className="mt-4 flex h-14 items-end justify-center gap-[3px]">
        {barHeights.map((h, i) => (
          <div
            key={i}
            className={`w-[4px] rounded-full transition-none ${
              listening ? "bg-indigo-500" : processing ? "bg-indigo-500/40" : "bg-border"
            }`}
            style={{ height: `${Math.round(h * 100)}%`, minHeight: "4px" }}
          />
        ))}
      </div>

      {/* Mic button */}
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          disabled={processing}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 ${
            listening
              ? "bg-red-500 hover:bg-red-600 shadow-red-500/30"
              : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={listening ? "Stop listening" : "Start voice input"}
        >
          {listening && (
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
          )}
          {processing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : listening ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Live transcript */}
      <div className="mt-4 min-h-[36px] rounded-xl bg-muted/40 px-3 py-2 text-center">
        {interimTranscript ? (
          <p className="text-sm italic text-muted-foreground">{interimTranscript}</p>
        ) : transcript ? (
          <p className="text-sm text-foreground">{transcript}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {listening ? "Listening… speak now" : "Press the mic and say a field value"}
          </p>
        )}
      </div>

      {/* Result message */}
      {message && (
        <p
          className={`mt-3 text-xs text-center ${
            updatedFields.length > 0 ? "text-emerald-400" : "text-muted-foreground"
          }`}
        >
          {message}
        </p>
      )}

      <p className="mt-3 text-[11px] text-center text-muted-foreground/60">
        Tip: Say the field name + value. Example: "My name is Ali Hassan"
      </p>
    </section>
  );
}
