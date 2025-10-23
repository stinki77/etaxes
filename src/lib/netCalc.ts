export function netCalc(gross: number, opts?: { employeeSoc?: number; taxRate?: number }) {
  const soc = (opts?.employeeSoc ?? 0.1378) * Math.max(0, gross);
  const base = Math.max(0, gross - soc);
  const tax = (opts?.taxRate ?? 0.10) * base;
  return Math.max(0, gross - soc - tax);
}
export default netCalc;
