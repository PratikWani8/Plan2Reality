import { useState, useCallback, useEffect } from 'react';
import { FloorPlanGeometry } from '../types/geometry';

export function useGeometryHistory(
  initialGeometry: FloorPlanGeometry,
  initialHistory?: FloorPlanGeometry[],
  initialIndex?: number
) {
  const [history, setHistory] = useState<FloorPlanGeometry[]>(() => {
    if (initialHistory && initialHistory.length > 0) {
      return initialHistory;
    }
    return [initialGeometry];
  });

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (typeof initialIndex === 'number' && initialIndex >= 0) {
      return Math.min(initialIndex, (initialHistory?.length || 1) - 1);
    }
    return 0;
  });

  const currentGeometry = history[currentIndex] || initialGeometry;

  const updateGeometry = useCallback(
    (updater: (prev: FloorPlanGeometry) => FloorPlanGeometry) => {
      setHistory((prevHistory) => {
        const current = prevHistory[currentIndex] || prevHistory[prevHistory.length - 1];
        const updated = updater(JSON.parse(JSON.stringify(current)));
        const newHistory = prevHistory.slice(0, currentIndex + 1);
        newHistory.push(updated);
        // Limit history to 30 steps to preserve memory
        if (newHistory.length > 30) newHistory.shift();
        return newHistory;
      });
      setCurrentIndex((prev) => Math.min(prev + 1, 29));
    },
    [currentIndex]
  );

  const setInitial = useCallback((newGeom: FloorPlanGeometry) => {
    setHistory([newGeom]);
    setCurrentIndex(0);
  }, []);

  const restoreHistory = useCallback((newHistory: FloorPlanGeometry[], newIndex: number) => {
    if (newHistory && newHistory.length > 0) {
      setHistory(newHistory);
      setCurrentIndex(Math.max(0, Math.min(newHistory.length - 1, newIndex)));
    }
  }, []);

  const undo = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setCurrentIndex((prev) => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  // Keyboard shortcut listeners (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger undo/redo if user is actively typing in an input or textarea
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          if (canRedo) redo();
        } else {
          e.preventDefault();
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  return {
    geometry: currentGeometry,
    history,
    currentIndex,
    updateGeometry,
    setInitial,
    restoreHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
