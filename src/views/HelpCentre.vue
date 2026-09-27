<template>
  <HelpBrowser :article-id="articleId" @select="selectArticle" />
</template>
<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HelpBrowser from '../components/help/HelpBrowser.vue'
const route = useRoute()
const router = useRouter()
const articleId = computed(() => typeof route.params.articleId === 'string' ? route.params.articleId : null)
function selectArticle(id) {
  router.push(id ? `/help/${id}` : '/help')
}
</script>
