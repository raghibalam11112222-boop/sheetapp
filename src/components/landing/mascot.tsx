"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Volume2, VolumeX, X } from "lucide-react";

const QUICK_QUESTIONS = ["Is it really free?", "Which files can I upload?", "How does it work?"];

const GREETING = "Hey! I'm Orby — I have a brain now. Ask me anything about SheetApp.";

type ChatMessage = { role: "orby" | "you"; text: string };

function OrbMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="30" cy="37" r="24" fill="#111318" />
      <rect x="32" y="19" width="7" height="16" rx="3.5" transform="rotate(18 35 27)" fill="#FFFFFF" />
      <rect x="42" y="17" width="6" height="14" rx="3" transform="rotate(18 45 24)" fill="#FFFFFF" />
    </svg>
  );
}

function pickSweetVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  if (!voices.length) return null;
  const sweetName = /(female|samantha|zira|tessa|fiona|aria|jenny|michelle|naomi|carol|kathy|sara|emma|olivia|ava)\b/i;
  return (
    voices.find((v) => v.lang.startsWith("en") && sweetName.test(v.name)) ??
    voices.find((v) => v.lang.startsWith("en") && /female/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    voices[0] ??
    null
  );
}

/**
 * Orby — SheetApp's mascot with a real brain.
 * A compact corner chat wired to /api/assistant (AI when configured,
 * keyword brain otherwise). Reads replies aloud unless muted.
 */
export function Mascot() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "orby", text: GREETING }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // speech synthesis unavailable — visuals still work
      }
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending, open ]);

  function speak(text: string) {
    if (muted) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickSweetVoice(synth);
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.pitch = 1.25;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      synth.speak(utterance);
      window.requestAnimationFrame(() => setSpeaking(true));
    } catch {
      // speech blocked or unavailable — message stays visible
    }
  }

  async function send(text: string) {
    const clean = text.trim().slice(0, 500);
    if (!clean || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "you", text: clean }]);
    setSending(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: clean }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      const reply = data.reply ?? data.error ?? "Hmm, that didn't work. Try asking again.";
      setMessages((prev) => [...prev, { role: "orby", text: reply }]);
      speak(reply);
    } catch {
      const reply = "I'm having trouble thinking right now — try again in a moment.";
      setMessages((prev) => [...prev, { role: "orby", text: reply }]);
    } finally {
      setSending(false);
    }
  }

  function toggleMute() {
    if (!muted) {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // ignore
      }
      setSpeaking(false);
      setMuted(true);
    } else {
      setMuted(false);
    }
  }

  const showPanel = ready && open;

  return (
    <div className="animate-mascot-drift fixed left-5 top-32 z-40 flex w-[min(320px,calc(100vw-2.5rem))] flex-col-reverse items-start gap-2">
      {showPanel ? (
        <div
          role="dialog"
          aria-label="Chat with Orby"
          className="animate-panel-swap w-full overflow-hidden rounded-2xl rounded-tl-md border border-[rgba(0,0,0,0.08)] bg-white/95 shadow-[0_16px_40px_-8px_rgb(16_24_40/0.25)] backdrop-blur-md"
        >
          <div className="flex items-center gap-2 border-b border-[rgba(0,0,0,0.08)] px-3.5 py-2.5">
            <OrbMark className="h-6 w-6 shrink-0" />
            <p className="flex-1 text-[13px] font-semibold text-[#111318]">Orby</p>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute orb voice" : "Mute orb voice"}
              aria-pressed={!muted}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#667085] transition-colors duration-150 hover:bg-[rgba(0,0,0,0.04)] hover:text-[#111318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Volume2 className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#667085] transition-colors duration-150 hover:bg-[rgba(0,0,0,0.04)] hover:text-[#111318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          <div
            ref={listRef}
            aria-live="polite"
            className="scrollbar-thin max-h-64 space-y-2 overflow-y-auto px-3.5 py-3"
          >
            {messages.map((msg, i) => (
              <p
                key={`${i}-${msg.role}`}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                  msg.role === "you"
                    ? "ml-auto bg-[#111318] text-white"
                    : "bg-[#F8F9FB] text-[#111318]"
                }`}
              >
                {msg.text}
              </p>
            ))}
            {sending ? (
              <p className="w-fit rounded-xl bg-[#F8F9FB] px-3 py-2 text-[13px] text-[#667085]">
                Orby is thinking…
              </p>
            ) : null}
            {messages.length === 1 && !sending ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void send(q)}
                    className="rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-[12px] font-medium text-[#111318] transition-colors duration-150 hover:bg-[#F8F9FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <form
            className="flex items-center gap-1.5 border-t border-[rgba(0,0,0,0.08)] p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <label htmlFor="orby-input" className="sr-only">
              Ask Orby a question
            </label>
            <input
              id="orby-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Orby anything…"
              autoComplete="off"
              maxLength={500}
              className="h-9 min-w-0 flex-1 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-2.5 text-[13px] text-[#111318] placeholder:text-[#667085] focus:border-[#111318] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label="Send question"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#111318] text-white transition-opacity duration-150 hover:bg-[#23272F] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
            >
              <Send className="h-3.5 w-3.5" aria-hidden />
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={showPanel}
        aria-label={showPanel ? "Hide Orby chat" : "Open Orby chat"}
        className="animate-navbar-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111318]"
      >
        <span
          className={`animate-float flex h-24 w-24 items-center justify-center rounded-full border border-[rgba(0,0,0,0.08)] bg-white/90 shadow-[0_8px_24px_-8px_rgb(16_24_40/0.2)] backdrop-blur-md transition-transform duration-150 hover:-translate-y-0.5 ${
            speaking ? "animate-mascot-talk" : ""
          }`}
        >
          <OrbMark className="h-18 w-18" />
        </span>
      </button>
    </div>
  );
}
