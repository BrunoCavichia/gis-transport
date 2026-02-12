"use client";
import { useCallback } from "react";

interface UseJobCoordinationProps {
  dispatch: any;
  addJobAt: (coords: [number, number], label?: string) => void;
  removeJob: (id: string | number) => void;
  interactionMode: string | null;
}

export function useJobCoordination({
  dispatch,
  addJobAt,
  removeJob,
  interactionMode,
}: UseJobCoordinationProps) {
  // Open job dialog (without picking on map)
  const handleAddJob = useCallback(() => {
    dispatch({ type: "SET_PICKED_JOB_COORDS", payload: null });
    dispatch({ type: "SET_IS_ADD_JOB_OPEN", payload: true });
  }, [dispatch]);

  // Add job directly at coordinates with label
  const handleAddJobDirectly = useCallback(
    (coords: [number, number], label: string) => {
      dispatch({ type: "SET_PICKED_JOB_COORDS", payload: null });
      addJobAt(coords, label); // No vehicle assignment
    },
    [addJobAt, dispatch],
  );

  // Submit job from dialog
  const handleAddJobSubmit = useCallback(
    (coords: [number, number], label: string) => {
      addJobAt(coords, label); // No vehicle assignment
      dispatch({ type: "SET_IS_ADD_JOB_OPEN", payload: false });
      dispatch({ type: "SET_PICKED_JOB_COORDS", payload: null });
    },
    [addJobAt, dispatch],
  );

  // Remove job
  const handleRemoveJob = useCallback(
    (id: string | number) => {
      removeJob(id);
    },
    [removeJob],
  );

  // Enter pick-job mode (click on map to place job)
  const handleStartPickingJob = useCallback(() => {
    dispatch({ type: "SET_INTERACTION_MODE", payload: "pick-job" });
    dispatch({ type: "SET_IS_ADD_JOB_OPEN", payload: false });
  }, [dispatch]);

  // Handle job dialog open/close
  const handleOpenAddJobChange = useCallback(
    (open: boolean) => {
      dispatch({ type: "SET_IS_ADD_JOB_OPEN", payload: open });
      if (!open) {
        dispatch({ type: "SET_PICKED_JOB_COORDS", payload: null });
        if (interactionMode === "pick-job") {
          dispatch({ type: "SET_INTERACTION_MODE", payload: null });
        }
      }
    },
    [interactionMode, dispatch],
  );

  return {
    handleAddJob,
    handleAddJobDirectly,
    handleAddJobSubmit,
    handleRemoveJob,
    handleStartPickingJob,
    handleOpenAddJobChange,
  };
}
