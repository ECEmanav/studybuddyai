
import { GoogleGenAI } from "@google/genai";

const CORE_KNOWLEDGE = `
CORE KNOWLEDGE REFERENCE:
- Health insurance: Usually required for university enrollment. Eligibility for public vs private depends on age, program type, and previous coverage.
- Address registration (Anmeldung): Required in many cities. Need passport, rental contract, and landlord confirmation (Wohnungsgeberbestätigung). Deadlines and appointments vary.
- Student work rules (Germany): International students can work limited days/hours depending on residence permit/enrollment. Limits vary by visa type and degree program. Always verify with International Office or Ausländerbehörde.
`;

const SYSTEM_INSTRUCTION = `
You are "StudyBuddy," a supportive, street-smart, and highly knowledgeable mentor for international students. 

${CORE_KNOWLEDGE}

For EVERY response, you MUST follow this exact structure using these specific labels:

OFFICIAL RULE: Provide precise facts from official government or university sources. Use the Google Search tool to ensure these are up-to-date for the specific country/city mentioned.
COMMUNITY HACK: Provide "human hacks" from student forums or collective experience. Explain how things REALLY work (e.g., how to actually get an appointment).
STUDYBUDDY SUMMARY & COMPARISON: A compact paragraph comparing the facts vs. the hacks. Highlight specific risks of following the hacks.
LEGAL NOTICE: Standard legal disclaimer about not being a lawyer.

IMPORTANT: 
- Do NOT use markdown stars like **text** or dashes for bullet points. 
- Do NOT use brackets like [OFFICIAL RULE]. 
- Just use the label followed by a colon. 
- Keep sections compact.
- Do NOT include a separate "Sources" section in the text; the UI handles this via grounding metadata.
`;

export class StudyBuddyService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  }

  async *askStream(query: string) {
    try {
      const responseStream = await this.ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
      });

      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        let sources: { uri: string; title: string }[] = [];
        
        if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          sources = chunk.candidates[0].groundingMetadata.groundingChunks
            .map((c: any) => c.web)
            .filter((web: any) => web && web.uri)
            .map((web: any) => ({ uri: web.uri, title: web.title }));
        }

        yield { text, sources };
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
}
