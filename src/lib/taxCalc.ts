export function calculateTax(sum: number, rate = 0.10, advance = 0) {
  const tax = Math.max(0, (sum || 0) * rate - (advance || 0));
  return tax;
}
export default calculateTax;
