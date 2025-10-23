<<<<<<< HEAD
<<<<<<< HEAD
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
=======
# Welcome to your Expo app 👋
=======
>>>>>>> 812ffc7 (pre-upgrade backup)

# еДанъци / eTaxes

## 📌 Описание
Мобилно приложение за подпомагане на физически лица при подаване на данъчни декларации в България. Реализирано с **Expo (React Native)**.

## 🚀 Стартиране
```bash
npm install
npm start

Тестове

Инсталирани са Jest + React Native Testing Library

Базови smoke тестове:

validators.test.ts – валидация на ЕГН и числа

napXml.test.ts – генерация на XML (smoke)

submit.test.tsx – екран „Подпис и подаване“

<<<<<<< HEAD
- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
>>>>>>> 89b8e00 (freeze before fix)
=======
StyledText-test.js – snapshot на UI компонент

📊 Покритие

Към 2025-09-17:

4 тестови пакета

7 теста, 1 snapshot

Общо покритие ~40%

📅 Прогрес за 2025-09-17

Инсталиран и настроен Jest

Създадени базови smoke тестове

Всички тестове минават успешно

Добавен test:smoke скрипт в package.json

▶️ Следващи стъпки

Оптимизация на валидаторите

Тестове за калкулациите в create-tax.tsx

UX подобрения на submit.tsx

---

📌 Сложи този файл в:  




Искаш ли утре да добавя и втора секция („История на промените“) в README, където ще трупаме ден по ден snapshot-и?
>>>>>>> 812ffc7 (pre-upgrade backup)
