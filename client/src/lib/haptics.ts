import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

let isNative = false;

try {
  const checkNative = () => {
    return typeof (window as any).Capacitor !== 'undefined' &&
      (window as any).Capacitor.isNativePlatform?.();
  };
  if (typeof window !== 'undefined') {
    isNative = checkNative();
  }
} catch {}

export class HapticsManager {
  private static enabled = true;

  static setEnabled(on: boolean) {
    this.enabled = on;
  }

  static isAvailable(): boolean {
    return isNative;
  }

  private static async fire(fn: () => Promise<void>) {
    if (!this.enabled || !isNative) return;
    try {
      await fn();
    } catch {}
  }

  static impactLight() {
    this.fire(() => Haptics.impact({ style: ImpactStyle.Light }));
  }

  static impactMedium() {
    this.fire(() => Haptics.impact({ style: ImpactStyle.Medium }));
  }

  static impactHeavy() {
    this.fire(() => Haptics.impact({ style: ImpactStyle.Heavy }));
  }

  static notifySuccess() {
    this.fire(() => Haptics.notification({ type: NotificationType.Success }));
  }

  static notifyError() {
    this.fire(() => Haptics.notification({ type: NotificationType.Error }));
  }

  static notifyWarning() {
    this.fire(() => Haptics.notification({ type: NotificationType.Warning }));
  }

  static keyTap() {
    this.impactLight();
  }

  static submitTap() {
    this.impactMedium();
  }

  static correctAnswer() {
    this.notifySuccess();
  }

  static wrongAnswer() {
    this.notifyError();
  }

  static streakMilestone(streak: number) {
    if (streak >= 10) {
      this.impactHeavy();
    } else {
      this.impactMedium();
    }
  }

  static countdownTick() {
    this.impactMedium();
  }

  static goSignal() {
    this.impactHeavy();
  }

  static sessionComplete() {
    this.notifySuccess();
  }

  static xpBurst() {
    this.impactHeavy();
  }

  static statReveal() {
    this.impactMedium();
  }

  static speedReveal() {
    this.impactLight();
  }

  static personalRecord() {
    this.notifySuccess();
  }

  static placementReveal() {
    this.notifySuccess();
  }

  static dailyStreakMilestone() {
    this.notifySuccess();
  }

  static highScore() {
    this.notifySuccess();
  }

  static async levelUp() {
    if (!this.enabled || !isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
      await new Promise(r => setTimeout(r, 120));
      await Haptics.impact({ style: ImpactStyle.Heavy });
      await new Promise(r => setTimeout(r, 120));
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {}
  }

  static async milestoneFanfare(tier: number) {
    if (!this.enabled || !isNative) return;
    try {
      const pulseCount = Math.min(2 + tier, 6);
      await Haptics.impact({ style: ImpactStyle.Medium });
      for (let i = 0; i < pulseCount; i++) {
        await new Promise(r => setTimeout(r, 100));
        await Haptics.impact({ style: ImpactStyle.Heavy });
      }
    } catch {}
  }
}
