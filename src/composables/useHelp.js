import { readonly, ref } from 'vue'
import { getHelpArticle } from '../content/help/articles.js'

// Only a reviewed topic identifier is shared. No client IDs, draft text, query
// history or clinical state enter the Help service.
const isHelpOpen = ref(false)
const helpTopic = ref(null)
export function useHelp() {
  function openHelp(topic = null) {
    helpTopic.value = getHelpArticle(topic)?.id || null
    isHelpOpen.value = true
  }
  function closeHelp() {
    isHelpOpen.value = false
    helpTopic.value = null
  }
  return { isHelpOpen: readonly(isHelpOpen), helpTopic: readonly(helpTopic), openHelp, closeHelp }
}
