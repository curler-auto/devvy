import { GoogleGenAI } from "@google/genai";

// Initialize the client.
// We use REACT_APP_GEMINI_API_KEY from environment variables.
// If not present, AI features will fail gracefully.
const apiKey = process.env.REACT_APP_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = 'gemini-1.5-flash';

export const analyzeDocument = async (prompt, base64Data, mimeType) => {
  try {
    if (!apiKey) throw new Error("API Key not found. Please configure REACT_APP_GEMINI_API_KEY.");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        systemInstruction: "You are an expert AI PDF assistant. You help users summarize, extract data, and rewrite content from their documents. Be concise, professional, and accurate.",
      },
    });

    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze document.");
  }
};

export const chatWithDocument = async (history, newMessage, base64Data, mimeType) => {
  try {
    if (!apiKey) throw new Error("API Key not found.");

    // Construct the prompt with history context
    const chatContext = history.map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.parts[0].text}`).join('\n');

    const finalPrompt = `
    Previous conversation:
    ${chatContext}

    Current User Query: ${newMessage}

    Please answer the user's query based on the attached document context and the previous conversation.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: finalPrompt,
          },
        ],
      },
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Sorry, I encountered an error communicating with the AI service. " + (error.message || "");
  }
};

export const summarizeText = async (text) => {
   try {
    if (!apiKey) throw new Error("API Key not found.");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Summarize the following text concisely:\n\n${text}`,
    });
    return response.text || "Could not summarize.";
  } catch (error) {
    return "Error generating summary.";
  }
};

export const rewriteText = async (text, tone) => {
    try {
     if (!apiKey) throw new Error("API Key not found.");

     const response = await ai.models.generateContent({
       model: MODEL_NAME,
       contents: `Rewrite the following text to have a ${tone} tone:\n\n${text}`,
     });
     return response.text || "Could not rewrite.";
   } catch (error) {
     return "Error rewriting text.";
   }
 };

export const validatePDFCompliance = async (base64Data, mimeType) => {
  try {
    if (!apiKey) throw new Error("API Key not found.");

    const prompt = `Analyze this PDF document for compliance with PDF/A ISO standards.
    Check for:
    1. Embedded fonts
    2. Color space usage (should be device-independent)
    3. Metadata validity
    4. Absence of prohibited elements (like Javascript, audio/video, encryption)

    Provide a detailed compliance report listing pass/fail for key criteria and an overall compliance status.
    Note: As an AI, perform a structural analysis based on the provided content.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    return response.text || "No report generated.";
  } catch (error) {
    console.error("Validation Error:", error);
    return "Failed to validate document. " + error.message;
  }
};
