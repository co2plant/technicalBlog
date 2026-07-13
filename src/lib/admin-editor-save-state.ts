export type AdminEditorSaveStatus = "saved" | "dirty" | "saving" | "error";

export type AdminEditorSaveState = {
  editRevision: number;
  savedRevision: number;
  savingRevision: number | null;
  status: AdminEditorSaveStatus;
  queuedSave: boolean;
};

export type AdminEditorSaveAction =
  | { type: "edited" }
  | { type: "saveStarted"; revision: number }
  | { type: "saveSucceeded"; revision: number }
  | { type: "saveFailed"; revision: number };

export function createAdminEditorSaveState(savedRevision = 0): AdminEditorSaveState {
  return {
    editRevision: savedRevision,
    savedRevision,
    savingRevision: null,
    status: "saved",
    queuedSave: false,
  };
}

export function adminEditorSaveStateReducer(
  state: AdminEditorSaveState,
  action: AdminEditorSaveAction,
): AdminEditorSaveState {
  switch (action.type) {
    case "edited": {
      return {
        ...state,
        editRevision: state.editRevision + 1,
        status: state.savingRevision === null ? "dirty" : "saving",
        queuedSave: state.queuedSave || state.savingRevision !== null,
      };
    }

    case "saveStarted": {
      if (state.savingRevision !== null) {
        return action.revision === state.savingRevision
          ? state
          : {
              ...state,
              queuedSave: true,
            };
      }

      if (action.revision > state.editRevision || action.revision <= state.savedRevision) {
        return state;
      }

      return {
        ...state,
        savingRevision: action.revision,
        status: "saving",
        queuedSave: action.revision < state.editRevision,
      };
    }

    case "saveSucceeded": {
      if (action.revision !== state.savingRevision) {
        return state;
      }

      const hasNewerEdits = state.editRevision > action.revision;

      return {
        ...state,
        savedRevision: Math.max(state.savedRevision, action.revision),
        savingRevision: null,
        status: hasNewerEdits ? "dirty" : "saved",
        queuedSave: hasNewerEdits,
      };
    }

    case "saveFailed": {
      if (action.revision !== state.savingRevision) {
        return state;
      }

      return {
        ...state,
        savingRevision: null,
        status: "error",
        queuedSave: false,
      };
    }
  }
}

export function hasUnsavedChanges(state: AdminEditorSaveState): boolean {
  return state.editRevision !== state.savedRevision;
}

export function isSaveInFlight(state: AdminEditorSaveState): boolean {
  return state.savingRevision !== null;
}

export function shouldStartQueuedSave(state: AdminEditorSaveState): boolean {
  return state.queuedSave && state.savingRevision === null && state.status === "dirty";
}
