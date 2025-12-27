import { ref } from 'vue'
import axios from 'axios'

/**
 * A simple helper for calling your GPT + Supabase tool API
 * Usage example:
 * const { runTool, loading, result, error } = useGptTool()
 * await runTool('thoughtRecord', inputs)
 */
export function useGptTool() {
    const loading = ref(false)
    const result = ref(null)
    const error = ref(null)

    async function runTool(tool, inputs) {
        loading.value = true
        result.value = null
        error.value = null

        try {
            const { data } = await axios.post('/api/gpt/tool', {
                tool,
                inputs,
            })
            result.value = data.record || data
        } catch (err) {
            console.error('useGptTool error:', err)
            error.value = err.response?.data?.error || err.message
        } finally {
            loading.value = false
        }
    }

    return { runTool, loading, result, error }
}
