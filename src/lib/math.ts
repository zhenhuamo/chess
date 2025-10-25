export const ceilsNumber = (number: number, min: number, max: number) => {
  if (number > max) return max;
  if (number < min) return min;
  return number;
};

export const getHarmonicMean = (array: number[]) => {
  const n = array.length;
  if (!n) return 0;
  // Avoid division by zero for tiny values
  const sum = array.reduce((acc, curr) => acc + 1 / Math.max(curr, 1e-9), 0);
  return n / sum;
};

export const getStandardDeviation = (array: number[]) => {
  const n = array.length;
  if (!n) return 0;
  const mean = array.reduce((a, b) => a + b, 0) / n;
  if (n === 1) return 0;
  const variance = array.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(variance);
};

export const getWeightedMean = (array: number[], weights: number[]) => {
  if (array.length > weights.length) throw new Error("Weights array is too short");
  const weightedSum = array.reduce((acc, curr, index) => acc + curr * weights[index], 0);
  const weightSum = weights.slice(0, array.length).reduce((acc, curr) => acc + curr, 0);
  if (weightSum === 0) return 0;
  return weightedSum / weightSum;
};
