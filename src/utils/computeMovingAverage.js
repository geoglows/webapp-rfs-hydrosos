export function computeMovingAverage(data, window = 30) {
  return data.map((_, index) => {
    // Use all available years until the full window is reached
    const start = Math.max(0, index - window + 1);

    const values = data
      .slice(start, index + 1)
      .map(d => d.volume);

    return values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length;
  });
}
