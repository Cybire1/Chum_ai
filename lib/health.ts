// Health data layer for the "Today" dashboard.
//
// Expo Go can't load native HealthKit, so this returns realistic SAMPLE data and
// the UI is fully demoable now. In a native dev build, install
// `@kingstinct/react-native-healthkit` (+ its Expo config plugin), set
// HEALTH_AVAILABLE = true, and fill in `readHealthKit()` — the dashboard then
// shows real Move/Exercise/Steps without any UI changes.

export type TodayHealth = {
  steps: number;
  stepsGoal: number;
  activeCalories: number;
  caloriesGoal: number;
  exerciseMinutes: number;
  exerciseGoal: number;
  sleepHours: number;
  restingHR: number;
  workouts: number;
  source: "healthkit" | "sample";
};

// Flip to true once HealthKit is wired in a dev build.
export const HEALTH_AVAILABLE = false;

const SAMPLE: TodayHealth = {
  steps: 7240,
  stepsGoal: 10000,
  activeCalories: 420,
  caloriesGoal: 600,
  exerciseMinutes: 28,
  exerciseGoal: 30,
  sleepHours: 7.1,
  restingHR: 58,
  workouts: 1,
  source: "sample",
};

export async function getTodayHealth(): Promise<TodayHealth> {
  if (HEALTH_AVAILABLE) {
    try {
      return await readHealthKit();
    } catch {
      return SAMPLE;
    }
  }
  return SAMPLE;
}

// DEV BUILD ONLY — implement with @kingstinct/react-native-healthkit:
//   const steps = await queryQuantitySamples('HKQuantityTypeIdentifierStepCount', …)
//   const energy = await queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', …)
//   … then return { …, source: 'healthkit' }
async function readHealthKit(): Promise<TodayHealth> {
  return SAMPLE;
}
