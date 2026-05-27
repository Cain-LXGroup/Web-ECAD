let audioContext: AudioContext | undefined;

const getAudioContext = (): AudioContext | null => {
  console.info("[feedback] Resolving audio context");

  if (typeof window === "undefined") {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContext();
  }

  return audioContext;
};

export const vibrateSnap = (): void => {
  console.info("[feedback] Triggering snap vibration");

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(8);
  }
};

export const playPlacementClick = (enabled: boolean): void => {
  console.info("[feedback] Playing placement click", { enabled });

  if (!enabled) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.04;

  oscillator.connect(gain);
  gain.connect(context.destination);

  const now = context.currentTime;
  oscillator.start(now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  oscillator.stop(now + 0.07);
};
