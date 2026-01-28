// hooks/useLoadingLayers.ts
import { useState, useCallback } from "react";

export function useLoadingLayers() {
  const [loading, setLoading] = useState(false);

  const wrapAsync = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, setLoading, wrapAsync };
}
