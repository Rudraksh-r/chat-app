import Groq from "groq-sdk";

class AIService {
  constructor() {
    this.groq = null;
    this.model = "llama-3.1-8b-instant";
  }

  init() {
    if (!process.env.GROQ_API_KEY) {
      console.warn("GROQ_API_KEY is missing. AI Chat will not work.");
      return;
    }
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  /**
   * Get AI response for a message
   * @param {string} prompt - The user's message
   * @param {Array} history - Previous messages for context [{role: "user", content: "..."}, {role: "assistant", content: "..."}]
   */
  async getResponse(prompt, history = []) {
    if (!this.groq) {
      this.init();
      if (!this.groq) {
         return "System: AI is currently unavailable because the GROQ_API_KEY is not configured.";
      }
    }

    try {
      const messages = [
        {
          role: "system",
          content: "You are a helpful, friendly AI assistant named Aura integrated into a chat application. Keep your answers concise, helpful, and natural."
        },
        ...history,
        {
          role: "user",
          content: prompt,
        }
      ];

      const chatCompletion = await this.groq.chat.completions.create({
        messages,
        model: this.model,
      });

      return chatCompletion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Error communicating with Groq API:", error);
      return "Sorry, there was an error processing your request.";
    }
  }
}

export const aiService = new AIService();
