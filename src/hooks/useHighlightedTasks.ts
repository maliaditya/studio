"use client";

import { useSyncExternalStore } from 'react';
import type { SetStateAction } from 'react';

type Listener = () => void;

let highlightedTaskIds = new Set<string>();
const listeners = new Set<Listener>();

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => highlightedTaskIds;

const areSetsEqual = (left: Set<string>, right: Set<string>) => {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
};

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

export const setHighlightedTaskIds = (value: SetStateAction<Set<string>>) => {
  const nextValue = typeof value === 'function'
    ? (value as (previous: Set<string>) => Set<string>)(highlightedTaskIds)
    : value;

  if (areSetsEqual(highlightedTaskIds, nextValue)) return;

  highlightedTaskIds = new Set(nextValue);
  emitChange();
};

export const useHighlightedTasks = () => {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { highlightedTaskIds: ids, setHighlightedTaskIds };
};