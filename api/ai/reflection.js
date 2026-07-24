import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ content: null });
    }

    try {
        const body = req.body;

        if (
            !body ||
            !body.worksheet_type ||
            !body.worksheet_fields ||
            Object.keys(body.worksheet_fields).length === 0
        ) {
            return res.status(200).json({ content: null });
        }

        const prompt = buildPrompt(body);

        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            temperature: 0.3,
            messages: [
                {
                    role: "system",
                    content:
                        "You are a clinical reflection assistant. Provide optional reflective prompts only. Do not give advice, diagnoses, or instructions. Use a neutral, professional tone.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const text =
            completion.choices &&
            completion.choices[0] &&
            completion.choices[0].message &&
            completion.choices[0].message.content
                ? completion.choices[0].message.content.trim()
                : null;

        return res.status(200).json({ content: text });
    } catch (error) {
        // Silent failure by design
        return res.status(200).json({ content: null });
    }
}

function buildPrompt(body) {
    const { worksheet_type, worksheet_fields, context } = body;

    if (worksheet_type === "private_reflection") {
        return `
The therapist has written this private professional reflection. It is not a clinical record.

Reflection:
${worksheet_fields.reflection || ""}

Task:
Offer up to three brief, tentative questions that could help the therapist continue their own thinking. Do not diagnose the therapist or client; do not infer countertransference as fact; do not recommend interventions; do not create a clinical note. Use language such as “You might want to consider…” or “Would it be useful to notice…?”`;
    }

    return `
Worksheet type: ${worksheet_type}
${context ? `Focus: ${context}` : ""}

Structured worksheet content:
${JSON.stringify(worksheet_fields, null, 2)}

Task:
Provide a small set of reflective prompts or alternative perspectives.
Use questions or gentle considerations.
Avoid conclusions, advice, or authoritative statements.
`;
}
