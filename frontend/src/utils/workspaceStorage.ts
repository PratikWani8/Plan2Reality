import { FloorPlanGeometry, Project } from '../types/geometry';
import { ViewerSettings, SelectedEntity, DEFAULT_VIEWER_SETTINGS } from '../features/viewer3d/types';
import { DEMO_PROJECTS } from './mockData';

export interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  actionsExecuted?: any[];
}

export interface PersistedWorkspace {
  project: Project;
  geometry: FloorPlanGeometry;
  viewportMode: '3d' | '2d';
  settings: ViewerSettings;
  selectedEntity: SelectedEntity;
  diagnostics: {
    confidence: number;
    warnings: string[];
    suggestions: string[];
  } | null;
  history?: FloorPlanGeometry[];
  currentIndex?: number;
  hasCustomUpload?: boolean;
  timestamp: number;
}

export interface PersistedChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  prompt: string;
}

const WORKSPACE_STORAGE_KEY = 'plan2reality_workspace_progress';
const CHAT_STORAGE_KEY = 'plan2reality_chat_progress';
const IMAGE_STORAGE_KEY = 'plan2reality_uploaded_blueprint_image';

const IDB_NAME = 'Plan2RealityDB';
const IDB_VERSION = 1;
const IDB_STORE = 'workspace_media';

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a persistent blueprint image (Data URL or base64) to IndexedDB with localStorage fallback.
 */
export async function savePersistentImage(imageData: string | null): Promise<void> {
  if (!imageData) {
    await clearPersistentImage();
    return;
  }

  // 1. Try IndexedDB (handles large images seamlessly)
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(imageData, 'current_blueprint');
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
    return;
  } catch (err) {
    // Continue to localStorage fallback
  }

  // 2. LocalStorage fallback (if < 3MB)
  try {
    if (imageData.length < 3 * 1024 * 1024) {
      localStorage.setItem(IMAGE_STORAGE_KEY, imageData);
    }
  } catch (e) {
    console.warn('Could not cache blueprint image in localStorage:', e);
  }
}

/**
 * Retrieves the persistent blueprint image data URL.
 */
export async function getPersistentImage(): Promise<string | null> {
  // 1. Try IndexedDB
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get('current_blueprint');
    const result = await new Promise<string | null>((res, rej) => {
      req.onsuccess = () => res(req.result || null);
      req.onerror = rej;
    });
    if (result) return result;
  } catch {
    // Fall back to localStorage
  }

  // 2. Try LocalStorage
  try {
    return localStorage.getItem(IMAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Clears the persistent blueprint image from both IndexedDB and localStorage.
 */
export async function clearPersistentImage(): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete('current_blueprint');
  } catch {}
  try {
    localStorage.removeItem(IMAGE_STORAGE_KEY);
  } catch {}
}

/**
 * Saves the whole workspace state (project, geometry, viewport mode, settings, selected entity, diagnostics, history).
 */
export function saveWorkspaceState(state: Partial<PersistedWorkspace>): void {
  try {
    const existing = loadWorkspaceState();
    const merged: PersistedWorkspace = {
      project: state.project || existing?.project || DEMO_PROJECTS[0],
      geometry: state.geometry || existing?.geometry || DEMO_PROJECTS[0].geometry,
      viewportMode: state.viewportMode || existing?.viewportMode || '3d',
      settings: state.settings || existing?.settings || DEFAULT_VIEWER_SETTINGS,
      selectedEntity: state.selectedEntity !== undefined ? state.selectedEntity : (existing?.selectedEntity || { type: null, id: null }),
      diagnostics: state.diagnostics !== undefined ? state.diagnostics : (existing?.diagnostics || null),
      history: state.history || existing?.history,
      currentIndex: state.currentIndex !== undefined ? state.currentIndex : existing?.currentIndex,
      hasCustomUpload: state.hasCustomUpload !== undefined ? state.hasCustomUpload : existing?.hasCustomUpload,
      timestamp: Date.now(),
    };

    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('Failed to save workspace state to localStorage:', err);
  }
}

/**
 * Loads the saved workspace state if present.
 */
export function loadWorkspaceState(): PersistedWorkspace | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedWorkspace;
    if (parsed && parsed.geometry && parsed.geometry.walls) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse saved workspace state:', err);
  }
  return null;
}

/**
 * Clears the persisted workspace state.
 */
export function clearWorkspaceState(): void {
  try {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch {}
  clearPersistentImage();
}

/**
 * Saves the AI chatbot state (messages, open/collapsed state, draft prompt).
 */
export function saveChatState(state: Partial<PersistedChatState>): void {
  try {
    const existing = loadChatState();
    const updated: PersistedChatState = {
      messages: state.messages || existing.messages,
      isOpen: state.isOpen !== undefined ? state.isOpen : existing.isOpen,
      prompt: state.prompt !== undefined ? state.prompt : existing.prompt,
    };
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save chat state to localStorage:', err);
  }
}

/**
 * Loads the AI chatbot state with safe default fallback.
 */
export function loadChatState(): PersistedChatState {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        return {
          messages: parsed.messages,
          isOpen: Boolean(parsed.isOpen),
          prompt: typeof parsed.prompt === 'string' ? parsed.prompt : '',
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse saved chat state:', err);
  }

  return {
    messages: [
      {
        sender: 'assistant',
        text: 'Hello! I am your AI Architectural Co-pilot. Ask me for design feedback, space optimization, to change finishes, adjust elevations, or place 3D furniture.',
        time: 'Just now',
      },
    ],
    isOpen: false,
    prompt: '',
  };
}

/**
 * Clears only the AI chatbot state.
 */
export function clearChatState(): void {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch {}
}
