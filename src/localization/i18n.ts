// Тестов минимален shim за превод.
// Ако имаш реален модул ./localization с export t, може да ползваш: export { t } from "./localization";
export function t(key: string, _params?: Record<string, unknown>) {
  return key;
}
