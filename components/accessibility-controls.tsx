"use client";

import { useEffect, useMemo, useState } from "react";

type FontScale = "default" | "large" | "xlarge";
type Contrast = "default" | "high";
type Motion = "default" | "reduced";
type LineSpacing = "default" | "relaxed";
type LinkVisibility = "default" | "enhanced";
type SpeechRate = "slow" | "normal" | "fast";

const STORAGE_KEYS = {
  fontScale: "autovaro-font-scale",
  contrast: "autovaro-contrast",
  motion: "autovaro-motion",
  lineSpacing: "autovaro-line-spacing",
  linkVisibility: "autovaro-link-visibility",
  speechRate: "autovaro-speech-rate",
  speechVoice: "autovaro-speech-voice"
} as const;

function setRootPreference(name: string, value: string) {
  document.documentElement.setAttribute(name, value);
}

function AccessibilityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <circle cx="12" cy="4.5" r="2.25" fill="currentColor" />
      <path
        d="M6.25 8.25c0-.55.45-1 1-1h9.5a1 1 0 1 1 0 2H13v3.15l4.03 6.54a1 1 0 0 1-1.7 1.05L12 14.66l-3.33 5.33a1 1 0 1 1-1.7-1.05L11 12.4V9.25H7.25c-.55 0-1-.45-1-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function speechRateValue(value: SpeechRate): number {
  if (value === "slow") {
    return 0.85;
  }

  if (value === "fast") {
    return 1.15;
  }

  return 1;
}

export function AccessibilityControls() {
  const [isOpen, setIsOpen] = useState(false);
  const [fontScale, setFontScale] = useState<FontScale>("default");
  const [contrast, setContrast] = useState<Contrast>("default");
  const [motion, setMotion] = useState<Motion>("default");
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>("default");
  const [linkVisibility, setLinkVisibility] = useState<LinkVisibility>("default");
  const [speechRate, setSpeechRate] = useState<SpeechRate>("normal");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  useEffect(() => {
    const savedFontScale = (localStorage.getItem(STORAGE_KEYS.fontScale) as FontScale | null) ?? "default";
    const savedContrast = (localStorage.getItem(STORAGE_KEYS.contrast) as Contrast | null) ?? "default";
    const savedMotion = (localStorage.getItem(STORAGE_KEYS.motion) as Motion | null) ?? "default";
    const savedLineSpacing = (localStorage.getItem(STORAGE_KEYS.lineSpacing) as LineSpacing | null) ?? "default";
    const savedLinkVisibility = (localStorage.getItem(STORAGE_KEYS.linkVisibility) as LinkVisibility | null) ?? "default";
    const savedSpeechRate = (localStorage.getItem(STORAGE_KEYS.speechRate) as SpeechRate | null) ?? "normal";
    const savedVoice = localStorage.getItem(STORAGE_KEYS.speechVoice) ?? "";

    setFontScale(savedFontScale);
    setContrast(savedContrast);
    setMotion(savedMotion);
    setLineSpacing(savedLineSpacing);
    setLinkVisibility(savedLinkVisibility);
    setSpeechRate(savedSpeechRate);
    setVoiceURI(savedVoice);

    setRootPreference("data-font-scale", savedFontScale);
    setRootPreference("data-contrast", savedContrast);
    setRootPreference("data-motion", savedMotion);
    setRootPreference("data-line-spacing", savedLineSpacing);
    setRootPreference("data-link-visibility", savedLinkVisibility);

    if ("speechSynthesis" in window) {
      const updateVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);

        if (!savedVoice && availableVoices.length > 0) {
          setVoiceURI(availableVoices[0].voiceURI);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setIsOpen((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const selectedVoice = useMemo(() => voices.find((voice) => voice.voiceURI === voiceURI), [voiceURI, voices]);

  function updatePreference<T extends string>(name: string, storageKey: string, setter: (value: T) => void, value: T) {
    setter(value);
    localStorage.setItem(storageKey, value);
    setRootPreference(name, value);
  }

  function updateSpeechRate(value: SpeechRate) {
    setSpeechRate(value);
    localStorage.setItem(STORAGE_KEYS.speechRate, value);
  }

  function updateVoice(value: string) {
    setVoiceURI(value);
    localStorage.setItem(STORAGE_KEYS.speechVoice, value);
  }

  function resetPreferences() {
    updatePreference("data-font-scale", STORAGE_KEYS.fontScale, setFontScale, "default");
    updatePreference("data-contrast", STORAGE_KEYS.contrast, setContrast, "default");
    updatePreference("data-motion", STORAGE_KEYS.motion, setMotion, "default");
    updatePreference("data-line-spacing", STORAGE_KEYS.lineSpacing, setLineSpacing, "default");
    updatePreference("data-link-visibility", STORAGE_KEYS.linkVisibility, setLinkVisibility, "default");
    updateSpeechRate("normal");
    updateVoice(voices[0]?.voiceURI ?? "");
    stopSpeech();
  }

  function readPageAloud() {
    if (!("speechSynthesis" in window)) {
      setSpeechError("Read aloud is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    setSpeechError(null);

    const mainContent = document.querySelector("main");
    const text = mainContent?.textContent?.replace(/\s+/g, " ").trim();

    if (!text) {
      setSpeechError("There is no readable page content available right now.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRateValue(speechRate);
    utterance.pitch = 1;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setSpeechError("Read aloud could not start.");
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  }

  function pauseSpeech() {
    if (!("speechSynthesis" in window)) {
      return;
    }

    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }

  function stopSpeech() {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }

  return (
    <div className="print-hidden fixed bottom-5 right-5 z-50">
      {isOpen && <button type="button" className="fixed inset-0 bg-slate-950/10" aria-label="Close accessibility panel" onClick={() => setIsOpen(false)} />}

      <button
        type="button"
        className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-900 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.55)] transition hover:border-slate-400 hover:bg-slate-50"
        aria-controls="accessibility-panel"
        aria-haspopup="dialog"
        aria-label="Open accessibility controls"
        onClick={() => setIsOpen((value) => !value)}
      >
        <AccessibilityIcon />
      </button>

      {isOpen && (
        <div
          id="accessibility-panel"
          className="relative z-10 mt-3 max-h-[min(78vh,720px)] w-[360px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[28px] border border-slate-300 bg-white p-5 shadow-[0_22px_48px_-28px_rgba(15,23,42,0.45)]"
          role="dialog"
          aria-label="Accessibility controls"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Accessibility</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Fine-tune readability, visibility, and read-aloud behavior. Shortcut: <span className="font-semibold text-slate-900">Alt + A</span>
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Readability</p>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Text size</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${fontScale === "default" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700"}`} onClick={() => updatePreference("data-font-scale", STORAGE_KEYS.fontScale, setFontScale, "default")}>Default</button>
                  <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${fontScale === "large" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700"}`} onClick={() => updatePreference("data-font-scale", STORAGE_KEYS.fontScale, setFontScale, "large")}>Large</button>
                  <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${fontScale === "xlarge" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700"}`} onClick={() => updatePreference("data-font-scale", STORAGE_KEYS.fontScale, setFontScale, "xlarge")}>XL</button>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Line spacing</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${lineSpacing === "default" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700"}`} onClick={() => updatePreference("data-line-spacing", STORAGE_KEYS.lineSpacing, setLineSpacing, "default")}>Default</button>
                  <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${lineSpacing === "relaxed" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700"}`} onClick={() => updatePreference("data-line-spacing", STORAGE_KEYS.lineSpacing, setLineSpacing, "relaxed")}>Relaxed</button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Visibility</p>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contrast</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${contrast === "default" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700"}`} onClick={() => updatePreference("data-contrast", STORAGE_KEYS.contrast, setContrast, "default")}>Default</button>
                  <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${contrast === "high" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700"}`} onClick={() => updatePreference("data-contrast", STORAGE_KEYS.contrast, setContrast, "high")}>High</button>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Link visibility</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${linkVisibility === "default" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700"}`} onClick={() => updatePreference("data-link-visibility", STORAGE_KEYS.linkVisibility, setLinkVisibility, "default")}>Default</button>
                  <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${linkVisibility === "enhanced" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700"}`} onClick={() => updatePreference("data-link-visibility", STORAGE_KEYS.linkVisibility, setLinkVisibility, "enhanced")}>Enhanced</button>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Motion</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${motion === "default" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700"}`} onClick={() => updatePreference("data-motion", STORAGE_KEYS.motion, setMotion, "default")}>Standard</button>
                  <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${motion === "reduced" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700"}`} onClick={() => updatePreference("data-motion", STORAGE_KEYS.motion, setMotion, "reduced")}>Reduced</button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Read aloud</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Reads visible page content using the browser speech engine.
              </p>

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500" htmlFor="speech-voice">
                  Voice
                </label>
                <select id="speech-voice" className="mt-2" value={voiceURI} onChange={(event) => updateVoice(event.target.value)}>
                  {voices.length === 0 && <option value="">Default browser voice</option>}
                  {voices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Speech rate</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${speechRate === "slow" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700"}`} onClick={() => updateSpeechRate("slow")}>Slow</button>
                  <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${speechRate === "normal" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700"}`} onClick={() => updateSpeechRate("normal")}>Normal</button>
                  <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${speechRate === "fast" ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700"}`} onClick={() => updateSpeechRate("fast")}>Fast</button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button type="button" className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700" onClick={readPageAloud}>
                  {isSpeaking ? "Restart" : "Play"}
                </button>
                <button type="button" className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50" onClick={pauseSpeech} disabled={!isSpeaking}>
                  {isPaused ? "Resume" : "Pause"}
                </button>
                <button type="button" className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50" onClick={stopSpeech} disabled={!isSpeaking}>
                  Stop
                </button>
              </div>

              {speechError && <p className="mt-3 text-sm text-rose-700">{speechError}</p>}
            </div>

            <button
              type="button"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={resetPreferences}
            >
              Reset accessibility settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}




