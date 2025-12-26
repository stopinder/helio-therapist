// TEMP TEST VERSION — always responds immediately so we can confirm the route works.
export default async function handler(req, res) {
    return res.status(200).json({
        ok: true,
        route: "/api/gpt/tool",
        note: "Temporary test response (no GPT/Supabase yet)."
    })
}
