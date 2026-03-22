"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { X, FileText, Code2, MessageSquare, Save, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { ContentViewPopupState, ResourcePoint } from "@/types/workout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useToast } from "@/hooks/use-toast";

interface ContentViewPopupProps {
  popupState: ContentViewPopupState;
}

const getTypeLabel = (type?: ResourcePoint["type"]) => {
  if (type === "code") return "Code";
  if (type === "markdown") return "Markdown";
  if (type === "ai-note") return "AI Note";
  return "Content";
};

const getTypeIcon = (type?: ResourcePoint["type"]) => {
  if (type === "code") return <Code2 className="h-4 w-4 text-muted-foreground" />;
  if (type === "markdown") return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

export function ContentViewPopup({ popupState }: ContentViewPopupProps) {
  const { resources, handleUpdateResource, closeContentViewPopup } = useAuth();
  const { toast } = useToast();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: popupState.id,
  });

  const liveResource = useMemo(
    () => resources.find((res) => res.id === popupState.resource.id) || popupState.resource,
    [resources, popupState.resource]
  );
  const livePoint = useMemo(
    () => (liveResource?.points || []).find((p) => p.id === popupState.point.id) || popupState.point,
    [liveResource, popupState.point]
  );

  const [draftText, setDraftText] = useState<string>(String(livePoint?.text || ""));
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">(livePoint?.type === "code" ? "edit" : "preview");
  const lastSavedRef = useRef<string>(String(livePoint?.text || ""));

  useEffect(() => {
    const next = String(livePoint?.text || "");
    setDraftText(next);
    lastSavedRef.current = next;
  }, [livePoint?.id, livePoint?.text]);

  const isDirty = draftText !== lastSavedRef.current;

  const save = useCallback(() => {
    if (!liveResource || !livePoint) return;
    if (!isDirty) return;
    setIsSaving(true);
    const updated = {
      ...liveResource,
      points: (liveResource.points || []).map((point) =>
        point.id === livePoint.id ? { ...point, text: draftText } : point
      ),
    };
    handleUpdateResource(updated);
    lastSavedRef.current = draftText;
    setIsSaving(false);
  }, [draftText, handleUpdateResource, isDirty, livePoint, liveResource]);

  const close = useCallback(() => {
    if (isDirty) save();
    closeContentViewPopup(popupState.id);
  }, [closeContentViewPopup, isDirty, popupState.id, save]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(draftText).then(() => {
      toast({
        title: "Copied",
        description: "Content copied to clipboard",
        duration: 2000,
      });
    });
  }, [draftText, toast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        save();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, save]);

  const style: React.CSSProperties = {
    position: "fixed",
    top: popupState.y,
    left: popupState.x,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    willChange: "transform",
    zIndex: 140,
  };

  if (!liveResource || !livePoint) {
    return null;
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="w-[900px] max-w-[92vw] shadow-2xl border border-white/10 bg-background/95 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between gap-3 cursor-grab" {...listeners}>
          <div className="flex items-center gap-2 min-w-0">
            {getTypeIcon(livePoint.type)}
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">
                {liveResource.name || "Untitled Resource"}
              </CardTitle>
              <div className="text-xs text-muted-foreground">{getTypeLabel(livePoint.type)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {livePoint.type !== "code" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "edit" ? "preview" : "edit")}
              >
                {viewMode === "edit" ? "Preview" : "Edit"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              title="Copy to clipboard"
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={save}
              disabled={!isDirty || isSaving}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-3">
          {livePoint.type === "code" ? (
            <>
              <Textarea
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                placeholder="Paste or type code..."
                className={cn(
                  "min-h-[320px] w-full resize-y bg-background/70 font-mono text-sm"
                )}
              />
              <div className="bg-muted/30 rounded-md border border-muted-foreground/20 overflow-hidden max-h-[200px] overflow-y-auto">
                <SyntaxHighlighter 
                  language="javascript" 
                  style={vscDarkPlus} 
                  customStyle={{ 
                    margin: 0, 
                    padding: '1rem', 
                    borderRadius: '0', 
                    width: '100%', 
                  }} 
                  codeTagProps={{style: {fontSize: '0.875rem', fontFamily: 'monospace'}}}
                >
                  {draftText || ""}
                </SyntaxHighlighter>
              </div>
            </>
          ) : viewMode === "edit" ? (
            <Textarea
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              placeholder={livePoint.type === "markdown" ? "Write your markdown..." : "Write your note..."}
              className={cn(
                "min-h-[400px] w-full resize-y bg-background/70"
              )}
            />
          ) : (
            <div className="prose dark:prose-invert prose-sm max-w-none p-4 rounded-md bg-muted/20 min-h-[400px] overflow-y-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {draftText || ""}
              </ReactMarkdown>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Press `Ctrl+Enter` (or `Cmd+Enter`) to save. Press `Esc` to close.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
