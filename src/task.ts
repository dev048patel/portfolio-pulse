import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { alertNew, refresh } from './lib';

const TASK = 'news-check';

// Must run at import time (index.ts imports this file first).
TaskManager.defineTask(TASK, async () => {
  try {
    await alertNew(await refresh());
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// ponytail: the phone decides when this runs (about every 15+ min on Android, less often on iOS).
// Need instant alerts? Add a small server that pushes via Expo push tokens.
export async function registerBackground() {
  try {
    await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 });
  } catch {
    // Not available (for example Expo Go): the app still checks news when opened.
  }
}
