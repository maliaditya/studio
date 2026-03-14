import { startTransition, useCallback, useEffect, useRef, useState } from 'react';

import type { Resource } from '@/types/workout';

type ResourceUpdater = Resource | ((current: Resource) => Resource);

export const useBufferedResource = (
  resource: Resource | null,
  onCommit: (resource: Resource) => void,
  delayMs = 180
) => {
  const [draftResource, setDraftResource] = useState<Resource | null>(resource);
  const commitRef = useRef(onCommit);
  const draftRef = useRef<Resource | null>(resource);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    commitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    draftRef.current = resource;
    setDraftResource(resource);
  }, [resource]);

  const flush = useCallback((nextResource?: Resource | null) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const resourceToCommit = nextResource ?? draftRef.current;
    if (!resourceToCommit) return;
    draftRef.current = resourceToCommit;
    startTransition(() => {
      commitRef.current(resourceToCommit);
    });
  }, []);

  const queueUpdate = useCallback((updater: ResourceUpdater) => {
    setDraftResource((current) => {
      if (!current) return current;
      const nextResource = typeof updater === 'function' ? updater(current) : updater;
      draftRef.current = nextResource;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        flush(nextResource);
      }, delayMs);
      return nextResource;
    });
  }, [delayMs, flush]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return {
    draftResource,
    queueUpdate,
    flush,
  };
};
