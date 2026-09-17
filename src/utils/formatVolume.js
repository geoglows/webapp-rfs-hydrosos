export function getVolumeUnit(volume) {

  const abs = Math.abs(volume);

  if (abs < 1e4) {
      return {
          label: "m³",
          divisor: 1,
          decimals: 0
      };
  }

  if (abs < 1e6) {
      return {
          label: "thousand m³",
          divisor: 1e3,
          decimals: 0
      };
  }

  if (abs < 1e9) {
      return {
          label: "million m³",
          divisor: 1e6,
          decimals: 1
      };
  }

  return {
      label: "billion m³",
      divisor: 1e9,
      decimals: 1
  };
}


export function formatVolume(volume) {

  if (volume == null || Number.isNaN(volume)) {
      return "—";
  }

  const unit = getVolumeUnit(volume);

  return `${(volume / unit.divisor).toFixed(unit.decimals)} ${unit.label}`;
}