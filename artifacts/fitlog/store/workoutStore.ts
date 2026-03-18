import { create } from "zustand";

interface SessionPR {
  exercise: string;
  weight: number;
  reps: number;
}

interface WorkoutState {
  activeWorkoutTemplateId: string | null;
  activeWorkoutTemplateName: string | null;
  sessionPRs: SessionPR[];
  setActiveWorkout: (templateId: string, templateName: string) => void;
  clearActiveWorkout: () => void;
  addSessionPR: (pr: SessionPR) => void;
  clearSessionPRs: () => void;
}

export const useWorkoutStore = create<WorkoutState>()((set) => ({
  activeWorkoutTemplateId: null,
  activeWorkoutTemplateName: null,
  sessionPRs: [],
  setActiveWorkout: (templateId, templateName) =>
    set({ activeWorkoutTemplateId: templateId, activeWorkoutTemplateName: templateName }),
  clearActiveWorkout: () =>
    set({ activeWorkoutTemplateId: null, activeWorkoutTemplateName: null }),
  addSessionPR: (pr) =>
    set((state) => ({ sessionPRs: [...state.sessionPRs, pr] })),
  clearSessionPRs: () => set({ sessionPRs: [] }),
}));
