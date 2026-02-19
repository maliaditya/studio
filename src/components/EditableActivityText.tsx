
"use client";

import React, { useRef, useEffect, useState } from 'react';

interface EditableActivityTextProps {
  initialValue: string;
  onUpdate: (newValue: string) => void;
  className?: string;
  placeholder?: string;
}

export const EditableActivityText: React.FC<EditableActivityTextProps> = ({
  initialValue,
  onUpdate,
  className,
  placeholder = "Type a description..."
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (spanRef.current && spanRef.current.textContent !== initialValue) {
      spanRef.current.textContent = initialValue;
    }
  }, [initialValue]);

  const handleBlur = () => {
    setIsEditing(false);
    if (spanRef.current) {
      const newValue = spanRef.current.textContent || '';
      if (newValue.trim() !== initialValue) {
        onUpdate(newValue.trim());
      } else {
        // If they clear it and it was empty, or it's unchanged, reset to original to avoid saving empty string over placeholder
        spanRef.current.textContent = initialValue;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      spanRef.current?.blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (spanRef.current) {
        spanRef.current.textContent = initialValue;
      }
      spanRef.current?.blur();
    }
  };

  useEffect(() => {
    if (!isEditing) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!spanRef.current || !target) return;
      if (!spanRef.current.contains(target)) {
        spanRef.current.blur();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isEditing]);

  return (
    <span
      ref={spanRef}
      contentEditable={true}
      suppressContentEditableWarning={true}
      onFocus={() => setIsEditing(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`outline-none border-0 ring-0 focus:outline-none focus:ring-0 ${className || ''}`}
      data-placeholder={!initialValue ? placeholder : ''}
    />
  );
};
