
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Loader2, ZoomIn, ZoomOut, Volume2, VolumeX } from "lucide-react";
import { getPdfForResource, storePdf } from "@/lib/audioDB";
import type { Resource } from "@/types/workout";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { downloadPdfFromSupabase } from "@/lib/supabasePdfStorage";
import { useAuth } from "@/contexts/AuthContext";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { cleanSpeechText, getKokoroLocalVoices, getOpenAiCloudVoices, loadSpeechPrefs, parseCloudVoiceURI, pickBestVoice, saveSpeechPrefs } from "@/lib/tts";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;


interface PdfViewerProps {
  resource: Resource | null;
}

export default function PdfViewer({ resource }: PdfViewerProps) {
  const { currentUser, settings } = useAuth();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [file, setFile] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(2);
  const [selectedText, setSelectedText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsVoiceURI, setTtsVoiceURI] = useState<string | undefined>(undefined);
  const [ttsRate, setTtsRate] = useState(0.96);
  const rootRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechAudioUrlRef = useRef<string | null>(null);
  const isDesktopRuntime =
    typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop);
  const kokoroEnabled =
    isDesktopRuntime && Boolean(settings.kokoroTtsBaseUrl?.trim());
  const aiConfig = getAiConfigFromSettings(settings, isDesktopRuntime);
  const cloudVoices = [...getOpenAiCloudVoices(aiConfig), ...getKokoroLocalVoices(kokoroEnabled)];

  useEffect(() => {
    async function loadPdf() {
      if (!resource?.id) {
        setFile(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const local = await getPdfForResource(resource.id, resource.pdfFileName);
        if (local.blob) {
          setFile(local.blob);
        } else if (currentUser?.username) {
          const remote = await downloadPdfFromSupabase(currentUser.username, resource.id, {
            url: settings.supabaseUrl,
            anonKey: settings.supabaseAnonKey,
            bucket: settings.supabasePdfBucket,
            serviceRoleKey:
              typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop)
                ? settings.supabaseServiceRoleKey
                : undefined,
          });
          if (remote) {
            await storePdf(resource.id, remote);
          }
          setFile(remote);
        } else {
          setFile(null);
        }
      } catch (error) {
        console.error("Failed to load PDF", error);
        setFile(null);
      } finally {
        setIsLoading(false);
      }
    }
    void loadPdf();
    // Reset state when resource changes
    setNumPages(null);
    setPageNumber(1);
    setScale(2);
  }, [resource, currentUser?.username, settings.supabaseUrl, settings.supabaseAnonKey, settings.supabasePdfBucket, settings.supabaseServiceRoleKey]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function goToPrevPage() {
    setPageNumber((prev) => (prev > 1 ? prev - 1 : prev));
  }

  function goToNextPage() {
    setPageNumber((prev) => (prev < (numPages ?? 1) ? prev + 1 : prev));
  }

  function zoomIn() {
    setScale(prev => Math.min(prev + 0.2, 5)); // Max zoom 5x
  }

  function zoomOut() {
    setScale(prev => Math.max(prev - 0.2, 0.5)); // Min zoom 0.5x
  }

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speechRef.current = null;
    if (speechAudioRef.current) {
      speechAudioRef.current.pause();
      speechAudioRef.current.src = "";
      speechAudioRef.current = null;
    }
    if (speechAudioUrlRef.current) {
      URL.revokeObjectURL(speechAudioUrlRef.current);
      speechAudioUrlRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const readSelectedText = useCallback(async () => {
    if (typeof window === "undefined") return;
    const text = cleanSpeechText(selectedText);
    if (!text) return;
    const selectedCloudVoice = parseCloudVoiceURI(ttsVoiceURI);
    const hasExplicitSystemVoice = Boolean(ttsVoiceURI) && !selectedCloudVoice;
    const shouldUseCloud =
      Boolean(selectedCloudVoice) ||
      (!hasExplicitSystemVoice && ttsVoices.length === 0 && cloudVoices.length > 0);
    if (shouldUseCloud) {
      const cloudVoice = selectedCloudVoice || cloudVoices[0];
      if (!cloudVoice) return;
      stopSpeaking();
      setIsSpeaking(true);
      try {
        const response = await fetch("/api/ai/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(isDesktopRuntime ? { "x-studio-desktop": "1" } : {}),
          },
          body: JSON.stringify({
            text,
            provider: cloudVoice.provider,
            voice: cloudVoice.id,
            speed: ttsRate,
            kokoroBaseUrl: settings.kokoroTtsBaseUrl,
            aiConfig,
          }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.details || result?.error || "Cloud TTS failed.");
        }
        const blob = await response.blob();
        if (speechAudioUrlRef.current) {
          URL.revokeObjectURL(speechAudioUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        speechAudioUrlRef.current = url;
        const audio = new Audio(url);
        speechAudioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          speechAudioRef.current = null;
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          speechAudioRef.current = null;
        };
        await audio.play();
      } catch (error) {
        console.error("Cloud TTS failed:", error);
        setIsSpeaking(false);
      }
      return;
    }
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = pickBestVoice(ttsVoices, ttsVoiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = "en-US";
    }
    utterance.rate = ttsRate;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      speechRef.current = null;
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      speechRef.current = null;
    };
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [aiConfig, cloudVoices, isDesktopRuntime, selectedText, settings.kokoroTtsBaseUrl, stopSpeaking, ttsRate, ttsVoiceURI, ttsVoices]);

  useEffect(() => {
    const prefs = loadSpeechPrefs();
    setTtsVoiceURI(prefs.voiceURI);
    setTtsRate(typeof prefs.rate === "number" ? Math.min(1.2, Math.max(0.8, prefs.rate)) : 0.96);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setTtsVoices(Array.isArray(voices) ? voices : []);
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  useEffect(() => {
    if (ttsVoiceURI || ttsVoices.length === 0) return;
    const best = pickBestVoice(ttsVoices);
    if (best?.voiceURI) {
      setTtsVoiceURI(best.voiceURI);
    }
  }, [ttsVoiceURI, ttsVoices]);

  useEffect(() => {
    saveSpeechPrefs({ voiceURI: ttsVoiceURI, rate: ttsRate });
  }, [ttsVoiceURI, ttsRate]);

  useEffect(() => {
    const captureSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !rootRef.current) {
        setSelectedText("");
        return;
      }
      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      const isInsideViewer =
        (!!anchorNode && rootRef.current.contains(anchorNode)) ||
        (!!focusNode && rootRef.current.contains(focusNode));
      if (!isInsideViewer) {
        setSelectedText("");
        return;
      }
      setSelectedText(selection.toString().replace(/\s+/g, " ").trim());
    };
    window.addEventListener("mouseup", captureSelection);
    window.addEventListener("keyup", captureSelection);
    return () => {
      window.removeEventListener("mouseup", captureSelection);
      window.removeEventListener("keyup", captureSelection);
      stopSpeaking();
    };
  }, [stopSpeaking]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading PDF...</p>
      </div>
    );
  }
  
  if (!file) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>Could not load PDF file.</p>
        </div>
    );
  }


  return (
    <div ref={rootRef} className="text-center h-full flex flex-col">
      <div className="flex-grow overflow-auto">
        <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </div>

      {numPages && (
        <div className="mt-4 flex-shrink-0 flex items-center justify-center gap-4 border-t pt-4">
          <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="px-3 py-1 rounded-md border bg-background hover:bg-muted disabled:opacity-50">
            Previous
          </button>
          
          <div className="flex items-center gap-2">
            <button onClick={zoomOut} disabled={scale <= 0.5} className="p-2 rounded-md border bg-background hover:bg-muted disabled:opacity-50">
                <ZoomOut className="h-4 w-4" />
                <VisuallyHidden>Zoom Out</VisuallyHidden>
            </button>
            <span className="text-sm font-medium w-20">
                Page {pageNumber} of {numPages}
            </span>
            <button onClick={zoomIn} disabled={scale >= 5} className="p-2 rounded-md border bg-background hover:bg-muted disabled:opacity-50">
                <ZoomIn className="h-4 w-4" />
                <VisuallyHidden>Zoom In</VisuallyHidden>
            </button>
            <button onClick={readSelectedText} disabled={!selectedText} className="px-3 py-1 rounded-md border bg-background hover:bg-muted disabled:opacity-50">
                <Volume2 className="h-4 w-4" />
                <VisuallyHidden>Read Selected Text</VisuallyHidden>
            </button>
            <button onClick={stopSpeaking} disabled={!isSpeaking} className="px-3 py-1 rounded-md border bg-background hover:bg-muted disabled:opacity-50">
                <VolumeX className="h-4 w-4" />
                <VisuallyHidden>Stop Reading</VisuallyHidden>
            </button>
          </div>

          <button onClick={goToNextPage} disabled={pageNumber >= numPages} className="px-3 py-1 rounded-md border bg-background hover:bg-muted disabled:opacity-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
