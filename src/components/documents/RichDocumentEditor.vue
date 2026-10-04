<template>
  <div ref="editorHost" class="document-rich-editor">
    <div class="document-editor-toolbar" role="toolbar" aria-label="Document formatting">
      <button type="button" :class="{ active: editor?.isActive('paragraph') }" @click="editor?.chain().focus().setParagraph().run()">Text</button>
      <button type="button" :class="{ active: editor?.isActive('heading', { level: 2 }) }" @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()">Heading</button>
      <span class="toolbar-divider"></span>
      <button type="button" aria-label="Bold" :class="{ active: editor?.isActive('bold') }" @click="editor?.chain().focus().toggleBold().run()"><strong>B</strong></button>
      <button type="button" aria-label="Italic" :class="{ active: editor?.isActive('italic') }" @click="editor?.chain().focus().toggleItalic().run()"><em>I</em></button>
      <span class="toolbar-divider"></span>
      <button type="button" aria-label="Bulleted list" :class="{ active: editor?.isActive('bulletList') }" @click="editor?.chain().focus().toggleBulletList().run()">• List</button>
      <button type="button" aria-label="Numbered list" :class="{ active: editor?.isActive('orderedList') }" @click="editor?.chain().focus().toggleOrderedList().run()">1. List</button>
      <button type="button" aria-label="Block quote" :class="{ active: editor?.isActive('blockquote') }" @click="editor?.chain().focus().toggleBlockquote().run()">Quote</button>
      <span class="toolbar-divider"></span>
      <button type="button" aria-label="Insert page break" @click="insertPageBreak">Page break</button>
      <span class="toolbar-spacer"></span>
      <span v-if="pageCount > 1" class="document-page-count">{{ pageCount }} pages</span>
      <button type="button" aria-label="Undo" :disabled="!editor?.can().undo()" @click="editor?.chain().focus().undo().run()">↶</button>
      <button type="button" aria-label="Redo" :disabled="!editor?.can().redo()" @click="editor?.chain().focus().redo().run()">↷</button>
    </div>

    <div class="document-pagination-surface">
      <EditorContent v-if="editor" :editor="editor" class="document-editor-content" />
      <div
        v-for="gap in pageGaps"
        :key="gap.page"
        class="document-auto-page-gap"
        :style="{ top: gap.top + 'px', height: pageGapPx + 'px' }"
        aria-hidden="true"
      >
        <span class="document-page-number">{{ gap.page }} / {{ pageCount }}</span>
        <span class="document-next-page-number">{{ gap.page + 1 }} / {{ pageCount }}</span>
      </div>
      <span v-if="pageCount > 1" class="document-final-page-number" :style="{ top: finalPageNumberTop + 'px' }" aria-hidden="true">
        {{ pageCount }} / {{ pageCount }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import { Node } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps({
  modelValue: { type: String, default: '' },
  richContent: { type: Object, default: null },
  placeholder: { type: String, default: '' },
  firstPageContentMm: { type: Number, default: 190 },
  followingPageContentMm: { type: Number, default: 245 }
})

const emit = defineEmits(['update:modelValue', 'update:richContent'])

const editorHost = ref(null)
const pageGaps = ref([])
const pageCount = ref(1)
const finalPageNumberTop = ref(0)
const pageGapPx = 26
let resizeObserver = null
let paginationFrame = 0

const MM_TO_PX = 96 / 25.4

const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: 'div[data-page-break]' }]
  },
  renderHTML() {
    return ['div', { 'data-page-break': '', class: 'document-page-break' }, ['span', {}, 'Page break']]
  }
})

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function plainTextToHtml(value) {
  const source = String(value || '')
  if (!source.trim()) return '<p></p>'
  return source
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph).replaceAll('\n', '<br>')}</p>`)
    .join('')
}

function editorPlainText(instance) {
  return instance.getText({ blockSeparator: '\n\n' }).replace(/\n{3,}/g, '\n\n').trimEnd()
}

function verticalMargins(element) {
  const style = getComputedStyle(element)
  return (Number.parseFloat(style.marginTop) || 0) + (Number.parseFloat(style.marginBottom) || 0)
}

function schedulePagination() {
  cancelAnimationFrame(paginationFrame)
  paginationFrame = requestAnimationFrame(() => {
    nextTick().then(recalculatePagination)
  })
}

function resetAutomaticSpacing(root) {
  for (const child of root.children) {
    child.style.removeProperty('--auto-page-spacer')
    child.classList.remove('auto-page-break-before')
  }
}

function recalculatePagination() {
  const root = editorHost.value?.querySelector('.document-prosemirror')
  if (!root) return

  resetAutomaticSpacing(root)

  const children = [...root.children]
  const gaps = []
  let page = 1
  let pageStart = 0
  let capacity = props.firstPageContentMm * MM_TO_PX
  let used = 0

  for (const child of children) {
    const isManualBreak = child.matches('[data-page-break]')
    const blockHeight = child.getBoundingClientRect().height + verticalMargins(child)

    if (isManualBreak) {
      const remaining = Math.max(0, capacity - used)
      child.style.setProperty('--auto-page-spacer', `${remaining + pageGapPx}px`)
      child.classList.add('auto-page-break-before')
      gaps.push({ page, top: pageStart + capacity })
      page += 1
      pageStart += capacity + pageGapPx
      capacity = props.followingPageContentMm * MM_TO_PX
      used = 0
      continue
    }

    if (used > 0 && used + blockHeight > capacity) {
      const remaining = Math.max(0, capacity - used)
      child.style.setProperty('--auto-page-spacer', `${remaining + pageGapPx}px`)
      child.classList.add('auto-page-break-before')
      gaps.push({ page, top: pageStart + capacity })
      page += 1
      pageStart += capacity + pageGapPx
      capacity = props.followingPageContentMm * MM_TO_PX
      used = blockHeight
    } else {
      used += blockHeight
    }
  }

  pageGaps.value = gaps
  pageCount.value = Math.max(1, page)
  const minHeight = pageStart + capacity
  root.style.minHeight = `${Math.ceil(minHeight)}px`
  finalPageNumberTop.value = Math.max(0, pageStart + capacity - 18)
}

const editor = new Editor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] }
    }),
    PageBreak
  ],
  content: props.richContent || plainTextToHtml(props.modelValue),
  editorProps: {
    attributes: {
      class: 'document-prosemirror',
      'aria-label': 'Document content',
      spellcheck: 'true',
      ...(props.placeholder ? { 'data-placeholder': props.placeholder } : {})
    }
  },
  onCreate: schedulePagination,
  onUpdate: ({ editor: instance }) => {
    emit('update:modelValue', editorPlainText(instance))
    emit('update:richContent', instance.getJSON())
    schedulePagination()
  }
})

function insertPageBreak() {
  editor.chain().focus().insertContent({ type: 'pageBreak' }).run()
  schedulePagination()
}

watch(() => props.modelValue, value => {
  const current = editorPlainText(editor)
  if (String(value || '').trimEnd() === current) return
  editor.commands.setContent(props.richContent || plainTextToHtml(value), { emitUpdate: false })
  schedulePagination()
})

watch(() => props.richContent, value => {
  if (!value) return
  const current = JSON.stringify(editor.getJSON())
  if (JSON.stringify(value) === current) return
  editor.commands.setContent(value, { emitUpdate: false })
  schedulePagination()
}, { deep: true })

onMounted(() => {
  resizeObserver = new ResizeObserver(schedulePagination)
  if (editorHost.value) resizeObserver.observe(editorHost.value)
  document.fonts?.ready?.then(schedulePagination)
  schedulePagination()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(paginationFrame)
  resizeObserver?.disconnect()
  editor.destroy()
})
</script>

<style>
.document-rich-editor{width:100%}
.document-editor-toolbar{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;margin:0 0 1rem;padding:.55rem .65rem;border:1px solid var(--border-muted);border-radius:.7rem;background:var(--surface-subtle);position:sticky;top:0;z-index:6}
.document-editor-toolbar button{min-height:34px;padding:.35rem .6rem;border:1px solid transparent;border-radius:.5rem;color:var(--ink-secondary);font-size:12px;font-weight:600;transition:background-color var(--motion-standard) var(--motion-ease),border-color var(--motion-standard) var(--motion-ease),color var(--motion-standard) var(--motion-ease)}
.document-editor-toolbar button:hover:not(:disabled){background:var(--surface-muted);color:var(--ink)}
.document-editor-toolbar button.active{background:var(--state-selected);border-color:var(--border-muted);color:var(--action-link)}
.document-editor-toolbar button:disabled{opacity:.4;cursor:not-allowed}
.toolbar-divider{width:1px;height:24px;background:var(--border-muted);margin:0 .15rem}
.toolbar-spacer{flex:1}
.document-page-count{font-size:11px;font-weight:600;color:var(--ink-muted);padding:0 .25rem}
.document-pagination-surface{position:relative}
.document-editor-content{width:100%;position:relative;z-index:2}
.document-prosemirror{outline:0;font:400 10.5pt/1.4 'Noto Sans',Arial,sans-serif;color:#26343b;transition:min-height .12s ease}
.document-prosemirror p{margin:0 0 .9em}
.document-prosemirror h2{font-size:15pt;line-height:1.3;font-weight:700;color:#17242b;margin:1.4em 0 .55em}
.document-prosemirror h3{font-size:12.5pt;line-height:1.35;font-weight:700;color:#17242b;margin:1.2em 0 .45em}
.document-prosemirror ul,.document-prosemirror ol{padding-left:1.4rem;margin:.7em 0 1em}
.document-prosemirror li{margin:.25em 0}
.document-prosemirror blockquote{margin:1em 0;padding:.1em 0 .1em 1rem;border-left:3px solid #cfd8dc;color:#52616b}
.document-prosemirror hr{border:0;border-top:1px solid #dbe2e5;margin:1.5em 0}
.document-prosemirror > .auto-page-break-before{margin-top:var(--auto-page-spacer)!important}
.document-prosemirror .document-page-break{position:relative;height:0;margin:0;border:0;background:transparent;break-after:page;page-break-after:always}
.document-prosemirror .document-page-break span{display:none}
.document-prosemirror:empty:before{content:attr(data-placeholder);color:#9aa5aa;pointer-events:none}
.document-auto-page-gap{position:absolute;left:-19mm;right:-19mm;z-index:3;background:var(--surface-subtle);border-top:1px solid var(--border-muted);border-bottom:1px solid var(--border-muted);box-shadow:inset 0 1px 0 rgba(255,255,255,.65),inset 0 -1px 0 rgba(255,255,255,.65);pointer-events:none}
.document-page-number,.document-next-page-number,.document-final-page-number{position:absolute;right:4px;font-size:9px;font-weight:600;letter-spacing:.02em;color:#8a979c}
.document-page-number{top:-18px}
.document-next-page-number{bottom:-18px}
.document-final-page-number{z-index:4}
@media print{
  .document-editor-toolbar,.document-auto-page-gap,.document-final-page-number{display:none!important}
  .document-prosemirror{min-height:0!important}
  .document-prosemirror > .auto-page-break-before{margin-top:0!important}
  .document-prosemirror .document-page-break{height:0;margin:0;border:0;background:none}
}
</style>
