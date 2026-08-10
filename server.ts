import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Initialize Gemini AI Client
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Clause Generation with gemini-3.1-pro-preview & High Thinking
  app.post("/api/ai/generate-clause", async (req, res) => {
    try {
      const { prompt, category, language } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const ai = getGeminiClient();
      const systemInstruction = `Ты — высококвалифицированный юрист по составлению хозяйственных и международных договоров. 
Составь четкий юридический пункт (клаузулу) для договора на русском и/или украинском языках.
Используй квадратные скобки для переменных параметров, например: [Наименование], [Размер штрафа %], [Срок в днях], [Поставщик], [Покупатель].
Сформулируй заголовок пункту, текст пункта с нормальной юридической техникой.
Верни результат strictly в JSON формате с полями:
- name: краткое название пункта (до 5-7 слов)
- titleRu: заголовок пункта на русском/украинском
- titleEn: заголовок на английском (перевод)
- contentRu: текст пункта на украинском/русском языке с квадратными скобками для переменных [Переменная]
- contentEn: текст пункта на английском языке с квадратными скобками [Variable]
- tags: массив из 3-5 ключевых слов
- category: категория (${category || "Общие условия"})`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      const text = response.text || "{}";
      const parsedData = JSON.parse(text);
      res.json({ success: true, clause: parsedData });
    } catch (err: any) {
      console.error("Gemini clause generation error:", err);
      res.status(500).json({
        error: err.message || "Failed to generate clause via AI",
      });
    }
  });

  // AI Contract Risk Analysis & Review with gemini-3.1-pro-preview
  app.post("/api/ai/analyze-contract", async (req, res) => {
    try {
      const { contractText, clausesCount, partyA, partyB } = req.body;
      if (!contractText) {
        return res.status(400).json({ error: "Contract text is required" });
      }

      const ai = getGeminiClient();
      const systemInstruction = `Ты — международный юридический аудитор. Проанализируй текст проектного договора.
Оцени договор на:
1. Юридические риски (дисбаланс ответственности, отсутствие защиты от форс-мажора, налоговые риски ПДВ/НДС, санкционные риски).
2. Незаполненные переменные в скобках [переменная].
3. Недостающие критические разделы (например, юрисдикция, ЭДО, порядок приемки).
4. Рекомендации по улучшению текста.

Верни JSON со следующей структурой:
{
  "score": число от 0 до 100 (оценка качества договора),
  "unfilledVariables": ["список не замененных квадратных скобок"],
  "risks": [
    { "level": "HIGH" | "MEDIUM" | "LOW", "title": "Заголовок риска", "description": "Подробное описание риска и совет как исправить" }
  ],
  "missingSections": ["рекомендуемые дополнительные разделы"],
  "summary": "краткое резюме аудита (2-3 предложения)"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Сторона А: ${partyA?.name || 'Сторона 1'}\nСторона Б: ${partyB?.name || 'Сторона 2'}\nКоличество пунктов: ${clausesCount}\n\nТекст договора:\n${contractText}`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);
      res.json({ success: true, analysis: result });
    } catch (err: any) {
      console.error("Gemini contract analysis error:", err);
      res.status(500).json({
        error: err.message || "Failed to analyze contract via AI",
      });
    }
  });

  // AI Translation helper
  app.post("/api/ai/translate", async (req, res) => {
    try {
      const { text, targetLang } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Translate the following legal clause text accurately into ${targetLang || "English"}. Preserve all square bracket placeholders like [Variable] exactly as they are in the text.\n\nText:\n${text}`,
      });

      res.json({ success: true, translatedText: response.text });
    } catch (err: any) {
      console.error("Gemini translation error:", err);
      res.status(500).json({ error: err.message || "Translation failed" });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Contract Builder Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
