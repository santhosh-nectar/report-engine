export function calcPercentageChange(newVal, oldVal) {
  if (!oldVal || oldVal === 0) return 0;
  return ((newVal - oldVal) / oldVal) * 100;
}
