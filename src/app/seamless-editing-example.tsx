
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

// 1. CSS to style the fixed vs. editable parts of the sentence.
const styles = `
  .editable-sentence {
    border: 1px solid hsl(var(--border));
    padding: 1rem;
    border-radius: 0.5rem;
    font-size: 1.1rem;
    line-height: 1.7;
  }
  .editable-sentence:focus {
    outline: none;
    border-color: hsl(var(--ring));
  }
  .editable-placeholder {
    background-color: hsl(var(--primary) / 0.1);
    padding: 0.1em 0.3em;
    border-radius: 0.25em;
    outline: none;
  }
  .editable-placeholder:focus {
    background-color: hsl(var(--primary) / 0.2);
    box-shadow: 0 0 0 2px hsl(var(--ring));
  }
  .uneditable-text {
    color: hsl(var(--muted-foreground));
  }
`;

// Helper type for our sentence parts
type SentencePart = {
  type: 'fixed' | 'editable';
  text: string;
  fieldId: string; // Unique ID for each part, crucial for React keys and data extraction
};

interface SeamlessEditorProps {
  initialParts: SentencePart[];
  onSave: (values: Record<string, string>) => void;
}

const SeamlessEditor: React.FC<SeamlessEditorProps> = ({ initialParts, onSave }) => {
  const [parts, setParts] = useState(initialParts);

  const handleBlur = (fieldId: string, newText: string) => {
    const newParts = parts.map(p => 
      p.fieldId === fieldId ? { ...p, text: newText } : p
    );
    setParts(newParts);
  };
  
  const handleSaveClick = () => {
    const values: Record<string, string> = {};
    parts.forEach(part => {
      if (part.type === 'editable') {
        values[part.fieldId] = part.text;
      }
    });
    onSave(values);
  };

  return (
    <div className="space-y-4">
      <div className="editable-sentence">
        {parts.map(part => (
          <EditableSpan
            key={part.fieldId}
            part={part}
            onBlur={handleBlur}
          />
        ))}
      </div>
      <Button onClick={handleSaveClick}>Save & Extract Values</Button>
    </div>
  );
};

const EditableSpan = ({ part, onBlur }: { part: SentencePart, onBlur: (fieldId: string, newText: string) => void }) => {
  const [currentText, setCurrentText] = useState(part.text);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (document.activeElement !== spanRef.current) {
        setCurrentText(part.text);
    }
  }, [part.text]);

  const handleLocalBlur = () => {
    const newText = spanRef.current?.textContent || '';
    if (newText !== part.text) {
        onBlur(part.fieldId, newText);
    }
  };
  
  if (part.type === 'fixed') {
    return <span className="uneditable-text">{part.text}</span>;
  }

  return (
    <span
      ref={spanRef}
      contentEditable={true}
      suppressContentEditableWarning={true}
      className="editable-placeholder"
      onBlur={handleLocalBlur}
      dangerouslySetInnerHTML={{ __html: currentText }}
    />
  );
};


export default function SeamlessEditingExamplePage() {
  const { toast } = useToast();

  const initialSentence: SentencePart[] = [
    { type: 'fixed', text: 'When I feel ', fieldId: 'fixed1' },
    { type: 'editable', text: 'anxious about a deadline', fieldId: 'trigger' },
    { type: 'fixed', text: ', my automatic reaction is to ', fieldId: 'fixed2' },
    { type: 'editable', text: 'procrastinate by browsing news sites', fieldId: 'reaction' },
    { type: 'fixed', text: '.', fieldId: 'fixed3' },
  ];

  const handleSave = (values: Record<string, string>) => {
    console.log("Extracted Values:", values);
    toast({
      title: "Values Extracted!",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      ),
    });
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <style>{styles}</style>
      <Card>
        <CardHeader>
          <CardTitle>Seamless Sentence Editor</CardTitle>
          <CardDescription>
            This example demonstrates how to create an inline, "fill-in-the-blank" editing experience.
            Click on the highlighted text to edit it. The cursor moves naturally across both fixed and editable parts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeamlessEditor initialParts={initialSentence} onSave={handleSave} />
        </CardContent>
      </Card>
    </div>
  );
}
