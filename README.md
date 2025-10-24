
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

📚 История на промените

2025-09-18

Добавени файлове и тестове: src/lib/tax.ts, __tests__/tax.test.ts, src/lib/csv.ts, __tests__/csv.test.ts.

Актуализирано UI: app/(tabs)/create-tax.tsx — бутон "Импорт CSV", CSV парсинг, запис в AsyncStorage и preview (FlatList).

Добавени помощни функции: parseCsvContent, parseAndStoreCsvText, loadImportedIncomesForYear.

Направени unit тестове за tax и csv парсинг (мок на AsyncStorage).

Опити за ъпгрейд на Expo до SDK 53: изпълнени npx expo install --fix и няколко npm install стъпки; възникнаха peer-dependency конфликти (expo-router, react-test-renderer и др.). Препоръчах стъпки за синхронизиране и pin-ване на версии.

Инсталирани Android platform-tools и конфигурирано adb (проверено с adb --version и adb devices).

Тестове: в хода на работата са пускани Jest тестове; от логовете виждаме 4 тестови пакета, 7 теста, 1 snapshot; общо покритие около 40%.

Бекъп: препоръчан и/или създаден git бранч upgrade/sdk-53 преди ъпгрейд операции.

Бележка: утре може да добавям ежедневен запис с по-подробен diff и статус на npm install/npx expo doctor при продължаване на ъпгрейда.
## 2025-09-26  Прогрес

- **Archive**
  - Добавен нов екран `app/(tabs)/archive.tsx` с:
    - локализация през `src/localization`
    - търсене по година/име
    - сортиране по дата низходящо
    - изтриване с потвърждение
    - преглед на записи
  - Добавен unit тест `__tests__/archive.test.tsx`

- **Localization**
  - Разширени ключове за `archive` в `src/localization/index.ts` (BG/EN)

- **CreateTax**
  - Приложено **батчване на setState** чрез `unstable_batchedUpdates`
  - Отстранено `act(...)` предупреждение в тестовете

### Следващи стъпки
- UX шлифовка и стилови подобрения
- Валидатори (ЕГН, IBAN, числа, задължителни полета)
- Реален XML формат за НАП

Какво вече имаш

Роутинг: declaration, incomes, deductions, archive, language.

Локализация, PDF, CSV (с BOM), файлове в UTF-8.

Импорт на доходи: loadImportedIncomesForYear(year).

Какво липсва, в какъв ред да добавиш

Съхранение на данни (AsyncStorage)

Ключове:

etaxes.incomes.<year> → масив { id, description, amount, date }

etaxes.deductions.<year> → масив { id, name, amount }

etaxes.declarations.<year> → обект { year, incomesTotal, deductionsTotal, taxBase, taxDue, createdAt, status }

Една проста утилита: src/lib/store.ts с getJSON(key), setJSON(key, val).

Incomes екран → CRUD + запис

Зареждай от etaxes.incomes.<year>.

Валидирай и записвай при “Запази”.

Обновявай тотала и показвай сумата в дъното.

Deductions екран → използвай запис

При “Запази” записвай в etaxes.deductions.<year>.

Показвай тотал и предупреждение при невалидни суми.

Declaration екран → чети totals от 2) и 3)

totalIncome = importedTotal + manualIncome + sum(incomes) по твоя логика.

totalReliefs = sum(deductions).

Изчисление през taxAdapter.

Бутони:

„Преглед за подаване (PDF)“ → готово.

„Експорт (CSV/Excel)“ → готово.

„Запази чернова“ → запис в etaxes.declarations.<year> със status:"draft".

Submit/Плащане (минимум)

Бутон „Маркирай като подадена“ → update status:"submitted" + submittedAt.

Плащане: на този етап само показвай инструкция/линк. Интеграция с платежен провайдър е отделна фаза.

Archive екран

Чети всички etaxes.declarations.*.

Лист с филтър по година/име.

Действия: „Отвори“ (показвай кратко резюме), „Изтрий“.

Тестове

Юнит: валидатори (готово), адаптер (готово), store (нови).

Рендер тестове: declaration, incomes, deductions за основни сценарии.

Мини интерфейси за имплементация

getJSON<T>(key): Promise<T|undefined>

setJSON(key, value): Promise<void>

loadIncomes(year): Promise<Income[]>

saveIncomes(year, items): Promise<void>

loadDeductions(year): Promise<Deduction[]>

saveDeductions(year, items): Promise<void>

saveDeclaration(d: DeclarationDraftOrSubmitted): Promise<void>

listDeclarations(): Promise<Declaration[]>

Смок сценарий

В incomes добави 2–3 реда → Запази.

В deductions добави 1 ред → Запази.

В declaration виж сумите, PDF/CSV работят. Натисни „Запази чернова“.

В archive виж черновата. Маркирай „Подадена“.

Ако искаш, мога да дам точни файлове за store.ts + минимални „Запази“ хендлъри за incomes.tsx и deductions.tsx.

История на промените (Changelog)
2025-09-29

Обновен екран Declaration с бутони за отваряне на Submit директно.

Прехвърлен бутон „Отвори Submit“ от Архив към Декларация.

Оптимизирани преводи и синхронизация на езикови настройки (i18n).

2025-09-28

Обновен екран Archive: показване на статус (чернова/подадена), дати, данък за плащане, PDF/XML бутони за споделяне.

i18n интегриран в таб заглавията и екрана.

2025-09-27

Обновен екран Submit със стъпки 1-2-3, deep-link към НАП портал, бутони „Копирай IBAN/сума“, възможност за прикачване подписан файл и маркиране на декларация като подадена.

Запис в Архив след маркиране.

2025-09-25

Стартирана интеграция на валидатори във форми:

IBAN, ЕГН, числа, задължителни полета.

i18n за грешки и съобщения.

2025-09-20

Обновен екран Incomes:

Поддръжка на ръчно въвеждане на доходи с много полета (тип доход, платец, документ, удържан данък, НПР %).

Валидации за дати (ISO YYYY-MM-DD), суми и проценти.

Екранът стартира с първи ред по подразбиране, нови редове се добавят с бутон „Добави ред“.

🆕 Идеи за следващи стъпки (2025-09-29)

CSV/Excel импорт от банки:

всеки потребител може да изтегли извлечение от онлайн банкирането си;

вече има готов механизъм за импортиране и парсване;

ще се добавят шаблони за най-често срещаните банки (ОББ, ДСК, Райфайзен).

Ръчно въвеждане с автоматични подсказки:

при текст като „2348,67 лв. заплата“ → парсърът разпознава сумата и ключови думи („заплата“, „хонорар“, „наем“);

автоматично предлага категория „трудов доход“ и попълва сумата;

потребителят може да потвърди или да коригира.

👉 Тази комбинация не изисква лиценз за Open Banking, но дава усещане за „умна“ автоматизация и улеснява потребителя.
