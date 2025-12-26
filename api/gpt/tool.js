import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        const { tool, inputs } = req.body || {};
        if (tool !== "thoughtRecord") {
            return res.status(400).json({ error: "Invalid tool" });
        }

        const prompt = `You are a compassionate CBT therapist helping a client complete a Thought Record.
Situation: ${inputs?.situation ?? "N/A"}
Automatic thought: ${inputs?.automaticThought ?? "N/A"}
Emotion: ${inputs?.emotion ?? "N/A"} (${inputs?.intensity ?? "N/A"}%)
Evidence for: ${inputs?.evidenceFor ?? "N/A"}
Evidence against: ${inputs?.evidenceAgainst ?? "N/A"}
Provide a brief, balanced alternative thought in 1–2 sentences.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        const gptText = completion.choices?.[0]?.message?.content?.trim() || "";

        return res.status(200).json({
            ok: true,
            from: "GPT only test",
            response: gptText,
        });
    } catch (error) {
        console.error("GPT handler error:", error);
        return res.status(500).json({ ok: false, error: error.message });
    }
}
