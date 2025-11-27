
"use client";

import React, { useRef, useEffect } from 'react';

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

  useEffect(() => {
    if (spanRef.current && spanRef.current.textContent !== initialValue) {
      spanRef.current.textContent = initialValue;
    }
  }, [initialValue]);

  const handleBlur = () => {
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
  };

  return (
    <span
      ref={spanRef}
      contentEditable={true}
      suppressContentEditableWarning={true}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      data-placeholder={!initialValue ? placeholder : ''}
    />
  );
};
