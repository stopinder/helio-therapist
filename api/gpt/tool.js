import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// Initialize clients from environment variables
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // or anon key for testing
)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { tool, inputs, userId } = req.body

        if (!tool || tool !== 'thoughtRecord') {
            return res.status(400).json({ error: 'Invalid tool' })
        }

        // 🧩 Build GPT prompt
        const prompt = `
You are a CBT therapist helping a client complete a Thought Record.

Situation: ${inputs.situation || 'N/A'}
Automatic thought: ${inputs.automaticThought || 'N/A'}
Emotion: ${inputs.emotion || 'N/A'} (${inputs.intensity || 'N/A'}%)
Evidence for: ${inputs.evidenceFor || 'N/A'}
Evidence against: ${inputs.evidenceAgainst || 'N/A'}

Provide:
1. A balanced alternative thought.
2. Brief reasoning or reflection.
Return concise, therapist-style text.
`

        // 🧠 Call GPT
        const completion = await openai.chat.completions.create({
            model: 'gpt-4.1-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        })

        const gptText = completion.choices?.[0]?.message?.content?.trim() || ''

        // 🗃️ Store in Supabase
        const { data, error } = await supabase
            .from('thought_records')
            .insert([
                {
                    user_id: userId || null,
                    situation: inputs.situation,
                    automatic_thought: inputs.automaticThought,
                    emotion: inputs.emotion,
                    intensity: inputs.intensity,
                    evidence_for: inputs.evidenceFor,
                    evidence_against: inputs.evidenceAgainst,
                    balanced_thought: gptText,
                    input_source: inputs.input_source || 'manual',
                },
            ])
            .select()
            .single()

        if (error) {
            console.error('Supabase insert error:', error)
            return res.status(500).json({ error: 'Database insert failed', details: error.message })
        }

        return res.status(200).json({ record: data })
    } catch (err) {
        console.error('Error:', err)
        return res.status(500).json({ error: err.message })
    }
}
