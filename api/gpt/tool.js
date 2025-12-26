export default async function handler(req, res) {
    try {
        res.status(200).json({
            ok: true,
            message: "Route reached successfully (simple test)."
        })
    } catch (error) {
        console.error("Handler error:", error)
        res.status(500).json({ ok: false, error: error.message })
    }
}
