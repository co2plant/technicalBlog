import { describe, expect, it } from "vitest";
import {
  adminEditorSaveStateReducer,
  createAdminEditorSaveState,
  hasUnsavedChanges,
  isSaveInFlight,
  shouldStartQueuedSave,
  type AdminEditorSaveState,
} from "../src/lib/admin-editor-save-state";

function edit(state: AdminEditorSaveState): AdminEditorSaveState {
  return adminEditorSaveStateReducer(state, { type: "edited" });
}

function startSave(state: AdminEditorSaveState): AdminEditorSaveState {
  return adminEditorSaveStateReducer(state, {
    type: "saveStarted",
    revision: state.editRevision,
  });
}

describe("admin editor save state", () => {
  it("keeps newer edits dirty when an older in-flight save succeeds", () => {
    let state = edit(createAdminEditorSaveState());
    state = startSave(state);
    state = edit(state);

    expect(state).toMatchObject({
      editRevision: 2,
      savedRevision: 0,
      savingRevision: 1,
      status: "saving",
      queuedSave: true,
    });

    state = adminEditorSaveStateReducer(state, { type: "saveSucceeded", revision: 1 });

    expect(state).toEqual({
      editRevision: 2,
      savedRevision: 1,
      savingRevision: null,
      status: "dirty",
      queuedSave: true,
    });
    expect(hasUnsavedChanges(state)).toBe(true);
    expect(shouldStartQueuedSave(state)).toBe(true);
  });

  it("becomes clean after the queued revision is saved", () => {
    let state = edit(createAdminEditorSaveState());
    state = startSave(state);
    state = edit(state);
    state = adminEditorSaveStateReducer(state, { type: "saveSucceeded", revision: 1 });
    state = startSave(state);

    expect(state).toMatchObject({
      savingRevision: 2,
      status: "saving",
      queuedSave: false,
    });

    state = adminEditorSaveStateReducer(state, { type: "saveSucceeded", revision: 2 });

    expect(state).toEqual({
      editRevision: 2,
      savedRevision: 2,
      savingRevision: null,
      status: "saved",
      queuedSave: false,
    });
    expect(hasUnsavedChanges(state)).toBe(false);
    expect(isSaveInFlight(state)).toBe(false);
  });

  it("keeps changes unsaved after a save failure", () => {
    let state = edit(createAdminEditorSaveState());
    state = startSave(state);
    state = adminEditorSaveStateReducer(state, { type: "saveFailed", revision: 1 });

    expect(state).toEqual({
      editRevision: 1,
      savedRevision: 0,
      savingRevision: null,
      status: "error",
      queuedSave: false,
    });
    expect(hasUnsavedChanges(state)).toBe(true);
  });

  it("marks the editor saved when the successful revision is still current", () => {
    let state = edit(createAdminEditorSaveState(4));
    state = startSave(state);

    expect(state.savingRevision).toBe(5);

    state = adminEditorSaveStateReducer(state, { type: "saveSucceeded", revision: 5 });

    expect(state.status).toBe("saved");
    expect(state.savedRevision).toBe(5);
    expect(state.editRevision).toBe(5);
    expect(hasUnsavedChanges(state)).toBe(false);
  });
});
