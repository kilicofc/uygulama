const STORAGE_KEY = 'irenglish:v1';
const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export const initialState = {
  profile: null,
  settings: { theme: 'light', fontScale: 1, dailyGoal: 20, freeMode: false, requireLevelExam: true, speechRate: 0.9, language: 'tr' },
  currentLevel: 'A1',
  completedLessons: [],
  lessonScores: {},
  words: [],
  wordProgress: {},
  xp: 0,
  streak: { current: 0, best: 0, lastDate: null },
  activity: {},
  examHistory: [],
  lastLesson: null,
  customLessons: [],
  customWords: [],
  adminPin: '2468'
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(initialState);
    const saved = JSON.parse(raw);
    return {
      ...clone(initialState), ...saved,
      settings: { ...initialState.settings, ...(saved.settings || {}) },
      streak: { ...initialState.streak, ...(saved.streak || {}) },
      activity: saved.activity || {}, wordProgress: saved.wordProgress || {}
    };
  } catch (error) {
    console.warn('IRENGlish local data could not be read:', error);
    return clone(initialState);
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('IRENGlish local data could not be saved:', error);
    return false;
  }
}

export function exportState(state) {
  const blob = new Blob([JSON.stringify({ app: 'IRENGlish', version: 1, exportedAt: new Date().toISOString(), state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `irenglish-yedek-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importState(file) {
  const parsed = JSON.parse(await file.text());
  const candidate = parsed?.state || parsed;
  if (!candidate || typeof candidate !== 'object' || !candidate.settings || !Array.isArray(candidate.completedLessons)) {
    throw new Error('Bu dosya geçerli bir IRENGlish yedeği değil.');
  }
  return { ...clone(initialState), ...candidate, settings: { ...initialState.settings, ...(candidate.settings || {}) } };
}

export function todayKey() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
