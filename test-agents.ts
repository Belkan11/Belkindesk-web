import dotenv from "dotenv";
dotenv.config();

const BASE_URL = "http://localhost:3000";

interface TestAgent {
  name: string;
  category: string;
  searchQuery: string;
  type: string;
  customPrompt: string;
}

const AGENTS: TestAgent[] = [
  {
    name: "MobileTech (Ремонт мобильных)",
    category: "Инженерия",
    searchQuery: "ремонт смартфонов пайка",
    type: "youtube",
    customPrompt: "Ты — ИИ-ассистент инженера по ремонту мобильных телефонов. Твоя задача — проанализировать статью/видео и выдать структурированную карточку ремонта:\n1. Краткий заголовок неисправности.\n2. Описание проблемы и способ решения.\n3. Полезные технические теги в конце."
  },
  {
    name: "CulinaryChef (Кулинария)",
    category: "Кулинария",
    searchQuery: "вкусные рецепты пошагово",
    type: "youtube",
    customPrompt: "Ты — кулинарный ИИ-сомелье и шеф-повар. Проанализируй эту публикацию про еду и выдай:\n1. Понятное название блюда/техники на русском языке.\n2. Основные ингредиенты (списком) и пошаговые ключевые этапы приготовления.\n3. Тэги в формате #Рецепты, #Выпечка, #Шеф."
  },
  {
    name: "CarMechanic (Ремонт автомобилей)",
    category: "Авто",
    searchQuery: "ремонт двигателя авто",
    type: "youtube",
    customPrompt: "Ты — ИИ-консультант автомеханика. Проанализируй публикацию по ремонту авто и выдели:\n1. Ошибку или неисправность.\n2. Способ диагностики и замененные детали (пошагово).\n3. Тематические теги в конце."
  }
];

async function runTests() {
  console.log("\n========================================================");
  console.log("🚀 ЗАПУСК АВТОНОМНОГО ТЕСТИРОВАНИЯ АГЕНТОВ BELKINDESK");
  console.log("========================================================\n");

  for (const agent of AGENTS) {
    console.log(`\n🤖 [ТЕСТ АГЕНТА]: ${agent.name}`);
    console.log(`   Поисковый запрос: "${agent.searchQuery}"`);
    console.log(`   Категория: "${agent.category}"`);

    // 1. Fetch search articles (and trigger smart theme fallbacks if external search is offline)
    console.log("   👉 Шаг 1: Извлечение публикаций и формирование сырых карточек...");
    try {
      const fetchRes = await fetch(`${BASE_URL}/api/rss/fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(agent.searchQuery)}`,
          feedId: `test-feed-${agent.category}`,
          limit: 3,
          type: agent.type,
          searchQuery: agent.searchQuery,
          category: agent.category,
          title: agent.name
        })
      });

      if (!fetchRes.ok) {
        throw new Error(`Ошибка HTTP ${fetchRes.status}`);
      }

      const rawData = await fetchRes.json() as any;
      const articles = rawData.articles || [];
      console.log(`   ✅ Получено карточек: ${articles.length}`);

      if (articles.length === 0) {
        console.log("   ❌ Ошибка: Не удалось сформировать ни одной карточки!");
        continue;
      }

      // Print first raw article details
      console.log(`      • Первоначальный заголовок первой статьи: "${articles[0].title}"`);

      // 2. Process articles via Gemini 3.7 Flash with custom prompts
      console.log("   👉 Шаг 2: Синхронизация с ИИ Gemini 3.7 Flash (адаптация, перевод, сжатие)...");
      const processRes = await fetch(`${BASE_URL}/api/ai/process-articles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articles: articles.slice(0, 2),
          customPrompt: agent.customPrompt
        })
      });

      if (!processRes.ok) {
        throw new Error(`Ошибка HTTP ${processRes.status}`);
      }

      const processedData = await processRes.json() as any;
      const processedArticles = processedData.articles || [];
      console.log(`   ✅ ИИ-процессинг завершен. Обработано карточек: ${processedArticles.length}`);

      if (processedArticles.length === 0) {
        console.log("   ❌ Ошибка: ИИ не вернул обработанные карточки!");
        continue;
      }

      // Verify the keys are correctly formed
      const firstProcessed = processedArticles[0];
      console.log("\n      📊 [РЕЗУЛЬТАТЫ ФОРМИРОВАНИЯ ИИ КАРТОЧКИ]:");
      console.log(`      • Переведенный заголовок (titleRu): "${firstProcessed.titleRu || "НЕТ"}"`);
      console.log(`      • Суть в одну строку (summaryOneLine): "${firstProcessed.summaryOneLine || "НЕТ"}"`);
      console.log(`      • Суть в три строки (summaryThreeLines): "${firstProcessed.summaryThreeLines || "НЕТ"}"`);
      console.log(`      • Детальный разбор (detailedContent): "${(firstProcessed.detailedContent || "").slice(0, 160)}..."`);
      console.log(`      • Ключевые термины (keyTerms): [${(firstProcessed.keyTerms || []).join(", ")}]`);

      if (firstProcessed.titleRu && firstProcessed.summaryOneLine && firstProcessed.summaryThreeLines && firstProcessed.detailedContent) {
        console.log(`\n   🎉 ТЕСТ ДЛЯ АГЕНТА "${agent.name}" УСПЕШНО ПРОЙДЕН!`);
      } else {
        console.log(`\n   ⚠️ ВНИМАНИЕ: Некоторые поля карточки не сформировались должным образом.`);
      }

    } catch (err: any) {
      console.error(`   ❌ Критическая ошибка во время теста агента: ${err.message}`);
    }
    console.log("--------------------------------------------------------");
  }

  console.log("\n========================================================");
  console.log("🏁 АВТОНОМНЫЕ ТЕСТЫ ПОЛНОСТЬЮ ЗАВЕРШЕНЫ!");
  console.log("========================================================\n");
}

runTests();
