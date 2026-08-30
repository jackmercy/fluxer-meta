/**
 * Process Matcher for Detectable Applications
 */

import { DetectableApplication, Activity } from './types';

export class ProcessMatcher {
  private detectables: Map<string, DetectableApplication> = new Map();

  constructor(detectablesList: DetectableApplication[] = []) {
    for (const app of detectablesList) {
      this.detectables.set(app.id, app);
    }
  }

  matchProcess(processName: string, platform: 'win32' | 'darwin' | 'linux'): DetectableApplication | null {
    const cleanName = processName.toLowerCase().replace(/\.exe$/, '');

    for (const app of this.detectables.values()) {
      for (const exec of app.executables) {
        if (exec.os === platform) {
          const execClean = exec.name.toLowerCase().replace(/\.exe$/, '');
          if (execClean === cleanName) {
            return app;
          }
        }
      }
    }
    return null;
  }

  createActivityFromApp(app: DetectableApplication): Activity {
    return {
      id: `proc_${Date.now()}`,
      name: app.name,
      type: app.type || 'playing',
      applicationId: app.id,
      createdAt: Date.now(),
      timestamps: { start: Date.now() },
    };
  }
}
