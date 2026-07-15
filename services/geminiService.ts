import { GoogleGenAI, Type } from "@google/genai";

// Always use mandatory initialization pattern according to guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using gemini-3.5-flash for list/text drafting tasks.
export const generateTenantNotification = async (tenantName: string, amount: number) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: `Draft a polite but firm SMS/WhatsApp reminder for a tenant named ${tenantName} who has an outstanding balance of KES ${amount}. Mention that payments should be made via M-Pesa. Keep it under 160 characters.`,
  });
  return response.text;
};

// Using gemini-3.5-flash for property performance and maintenance reasoning.
export const analyzePropertyHealth = async (houses: any[], expenses: any[]) => {
  const prompt = `Analyze this property data and provide a short 2-sentence summary of property performance and maintenance needs:
  Houses: ${JSON.stringify(houses)}
  Expenses: ${JSON.stringify(expenses)}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
  });
  return response.text;
};

// Using gemini-3.5-flash for financial risk and tenant reliability analysis.
export const analyzeTenantFinancials = async (tenantName: string, bills: any, payments: any[]) => {
  const prompt = `Act as a senior property manager. Analyze the payment behavior of tenant ${tenantName}.
  Current Bills: ${JSON.stringify(bills)}
  Payment History: ${JSON.stringify(payments)}
  Provide a 2-sentence summary of their reliability and any financial risks. Be professional.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
  });
  return response.text;
};