<template>
  <div class="document-rich-editor">
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
      <button type="button" aria-label="Undo" :disabled="!editor?.can().undo()" @click="editor?.chain().focus().undo().run()">↶</button>
      <button type="button" aria-label="Redo" :disabled="!editor?.can().redo()" @click="editor?.chain().focus().redo().run()">↷</button>
    </div>
    <EditorContent v-if="editor" :editor="editor" class="document-editor-content" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, watch } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import { Node } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps({
  modelValue: { type: String, default: '' },
  richContent: { type: Object, default: null },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'update:richContent'])

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
  onUpdate: ({ editor: instance }) => {
    emit('update:modelValue', editorPlainText(instance))
    emit('update:richContent', instance.getJSON())
  }
})

function insertPageBreak() {
  editor.chain().focus().insertContent({ type: 'pageBreak' }).run()
}

watch(() => props.modelValue, value => {
  const current = editorPlainText(editor)
  if (String(value || '').trimEnd() === current) return
  editor.commands.setContent(props.richContent || plainTextToHtml(value), { emitUpdate: false })
})

watch(() => props.richContent, value => {
  if (!value) return
  const current = JSON.stringify(editor.getJSON())
  if (JSON.stringify(value) === current) return
  editor.commands.setContent(value, { emitUpdate: false })
}, { deep: true })

onBeforeUnmount(() => editor.destroy())
</script>

<style>
.document-rich-editor{width:100%}
.document-editor-toolbar{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;margin:0 0 1rem;padding:.55rem .65rem;border:1px solid var(--border-muted);border-radius:.7rem;background:var(--surface-subtle)}
.document-editor-toolbar button{min-height:34px;padding:.35rem .6rem;border:1px solid transparent;border-radius:.5rem;color:var(--ink-secondary);font-size:12px;font-weight:600;transition:background-color var(--motion-standard) var(--motion-ease),border-color var(--motion-standard) var(--motion-ease),color var(--motion-standard) var(--motion-ease)}
.document-editor-toolbar button:hover:not(:disabled){background:var(--surface-muted);color:var(--ink)}
.document-editor-toolbar button.active{background:var(--state-selected);border-color:var(--border-muted);color:var(--action-link)}
.document-editor-toolbar button:disabled{opacity:.4;cursor:not-allowed}
.toolbar-divider{width:1px;height:24px;background:var(--border-muted);margin:0 .15rem}
.toolbar-spacer{flex:1}
.document-editor-content{width:100%}
.document-prosemirror{min-height:520px;outline:0;font:400 10.5pt/1.55 'Noto Sans',Arial,sans-serif;color:#26343b}
.document-prosemirror p{margin:0 0 .9em}
.document-prosemirror h2{font-size:15pt;line-height:1.3;font-weight:700;color:#17242b;margin:1.4em 0 .55em}
.document-prosemirror h3{font-size:12.5pt;line-height:1.35;font-weight:700;color:#17242b;margin:1.2em 0 .45em}
.document-prosemirror ul,.document-prosemirror ol{padding-left:1.4rem;margin:.7em 0 1em}
.document-prosemirror li{margin:.25em 0}
.document-prosemirror blockquote{margin:1em 0;padding:.1em 0 .1em 1rem;border-left:3px solid #cfd8dc;color:#52616b}
.document-prosemirror hr{border:0;border-top:1px solid #dbe2e5;margin:1.5em 0}
.document-prosemirror .document-page-break{position:relative;height:28px;margin:2rem -19mm;border-top:1px dashed #b8c4c9;border-bottom:1px dashed #b8c4c9;background:#f5f7f7;break-after:page;page-break-after:always}
.document-prosemirror .document-page-break span{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:0 .65rem;background:#f5f7f7;color:#7b898f;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.document-prosemirror:empty:before{content:attr(data-placeholder);color:#9aa5aa;pointer-events:none}
@media print{.document-editor-toolbar{display:none!important}.document-prosemirror{min-height:0}.document-prosemirror .document-page-break{height:0;margin:0;border:0;background:none}.document-prosemirror .document-page-break span{display:none}}
</style>
