
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
  const editorRef = useRef<HTMLDivElement>(null);

  const handleSaveClick = () => {
    if (!editorRef.current) return;

    const values: Record<string, string> = {};
    const editableElements = editorRef.current.querySelectorAll<HTMLSpanElement>('.editable-placeholder');
    
    editableElements.forEach(el => {
      const fieldId = el.dataset.fieldId;
      if (fieldId) {
        values[fieldId] = el.textContent || '';
      }
    });

    onSave(values);
  };

  return (
    <div className="space-y-4">
      {/* 2. The single contenteditable container */}
      <div
        ref={editorRef}
        contentEditable={true}
        suppressContentEditableWarning={true} // Necessary for React to handle contenteditable children
        className="editable-sentence"
      >
        {initialParts.map(part => (
          <span
            key={part.fieldId}
            contentEditable={part.type === 'editable'}
            suppressContentEditableWarning={true}
            className={part.type === 'editable' ? 'editable-placeholder' : 'uneditable-text'}
            data-field-id={part.fieldId} // Use data attribute to identify fields
          >
            {part.text}
          </span>
        ))}
      </div>
      <Button onClick={handleSaveClick}>Save & Extract Values</Button>
    </div>
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
