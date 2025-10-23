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

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
>>>>>>> 89b8e00 (freeze before fix)
