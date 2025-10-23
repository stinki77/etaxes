# eTaxes

Приложение за декларации и изчисления на данъци. Expo + React Native + TypeScript. Тестове с Jest.

## Изисквания
- Node 20+
- npm 10+
- Git

## Инсталация
```bash
npm install
npm run start        # Expo Dev
npm run android
npm run ios
npm run web
npm run test         # еднократни тестове
npm run test:watch   # watch режим
npm run test:ci      # за CI
npm run test:cov     # coverage отчет
npm run test:file -- __tests__/archive.test.tsx
npm run test:match -- -t "deletes an item after confirm"
npm run tsc
app/                 # екрани и навигация (expo-router)
src/lib/             # логика и помощни модули
src/config/          # конфигурации
src/localization/    # i18n
__tests__/           # Jest тестове
Watch клавиши: a всички, p по файл, t по име, u snapshots, r рестарт, q изход.

Мокове и полифили: jest.setup.ts.

Конфиг: jest.config.js.

CI

Файл: .github/workflows/ci.yml. Пуска тестващи стъпки и coverage артефакт.
