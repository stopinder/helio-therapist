<template>
  <div class="p-6 md:p-10 max-w-7xl mx-auto space-y-10 animate-fadeUp">
    <header><h1 class="text-h1 font-semibold text-ink">Supervision Workspace</h1><p class="text-body text-ink-secondary mt-2">Review the reflections you want to bring, add preparation notes, and check privacy before creating your report.</p></header>
    <div class="min-h-[600px] relative">
      <SupervisionPackView :reflections="supervisionPackReflections" :selected-reflections="reportSelectedReflections" :report-selected-ids="reportSelectedIds" :expanded-preparation-id="expandedPreparationId" :pack-item-options="packItemOptions" :client-aliases="clientAliases" :action-loading="actionLoading" @create-report="openExportPreview" @toggle-report-selection="toggleReportSelection" @go-to-session="r => $emit('go-to-session', r)" @open-reflection="r => $emit('open-reflection', r)" @toggle-preparation="togglePreparation" @remove-from-pack="r => $emit('toggle-supervision', r)" />
      <teleport to="body"><SupervisionReportPreview v-if="exportPreviewOpen" :reflections="reportSelectedReflections" :options="exportOptions" :pack-item-options="packItemOptions" :client-aliases="clientAliases" :introduction="therapistIntroduction" :copying="copying" :downloading="downloadingPdf" @close="closeExportPreview" @update-option="(key, val) => exportOptions[key] = val" @update-introduction="val => therapistIntroduction = val" @copy="copyExportText" @download-pdf="downloadPdf" @print="printPack" /></teleport>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, watch } from 'vue';
import SupervisionPackView from '../../components/professional-development/SupervisionPackView.vue';
import SupervisionReportPreview from '../../components/professional-development/SupervisionReportPreview.vue';
const props = defineProps({ reflections: { type: Array, default: () => [] }, loading: Boolean, actionLoading: [String, Number] });
defineEmits(['open-reflection', 'go-to-session', 'toggle-supervision']);
const reportSelectedIds = ref(new Set()); const expandedPreparationId = ref(null); const packItemOptions = ref({}); const exportPreviewOpen = ref(false); const therapistIntroduction = ref(''); const copying = ref(false); const downloadingPdf = ref(false);
const exportOptions = ref({ includeText: true, includeThemes: true, includeDates: true, includeClientReferences: false });
const supervisionPackReflections = computed(() => props.reflections.filter(r => r.included_in_supervision));
const reportSelectedReflections = computed(() => supervisionPackReflections.value.filter(r => reportSelectedIds.value.has(r.id)));
const clientAliases = computed(() => { const aliases = {}; let count = 0; const names = [...new Set(reportSelectedReflections.value.map(r => r.clients?.display_name).filter(Boolean))]; names.forEach(name => { aliases[name] = `Case ${String.fromCharCode(65 + count)}`; count++; }); return aliases; });
watch(() => props.reflections, (newReflections) => { newReflections.forEach(r => { if (r.included_in_supervision && !reportSelectedIds.value.has(r.id)) { reportSelectedIds.value.add(r.id); if (!packItemOptions.value[r.id]) packItemOptions.value[r.id] = { includeText: true, includeDate: true, includeTheme: true }; } }); }, { immediate: true, deep: true });
function openExportPreview() { exportPreviewOpen.value = true; } function closeExportPreview() { exportPreviewOpen.value = false; }
function toggleReportSelection(id) { if (reportSelectedIds.value.has(id)) reportSelectedIds.value.delete(id); else { reportSelectedIds.value.add(id); if (!packItemOptions.value[id]) packItemOptions.value[id] = { includeText: true, includeDate: true, includeTheme: true }; } }
function togglePreparation(id) { expandedPreparationId.value = expandedPreparationId.value === id ? null : id; }
function printPack() { window.print(); }
function escapePdfText(text = '') { return String(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\x7E]/g, '?'); }
function wrapPdfText(text, max = 88) { const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean); const lines = []; let line = ''; words.forEach(word => { const candidate = line ? `${line} ${word}` : word; if (candidate.length > max && line) { lines.push(line); line = word; } else line = candidate; }); if (line) lines.push(line); return lines; }
function buildPdfLines() {
  const lines = ['SUPERVISION REPORT', `Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, ''];
  if (therapistIntroduction.value) lines.push(...wrapPdfText(therapistIntroduction.value), '');
  reportSelectedReflections.value.forEach(r => {
    const opts = packItemOptions.value[r.id] || { includeText: true, includeDate: true, includeTheme: true };
    if (exportOptions.value.includeDates && opts.includeDate) lines.push(`DATE: ${new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`);
    if (exportOptions.value.includeThemes && opts.includeTheme && r.theme) lines.push(`THEME: ${r.theme}`);
    const clientRef = exportOptions.value.includeClientReferences && r.clients?.display_name ? r.clients.display_name : (r.clients?.display_name ? clientAliases.value[r.clients.display_name] : 'Anonymous');
    lines.push(`CASE: ${clientRef}`);
    if (exportOptions.value.includeText && opts.includeText) lines.push('', ...wrapPdfText(r.body));
    if (opts.notes) lines.push('', 'PREPARATION NOTE:', ...wrapPdfText(opts.notes));
    lines.push('', '----------------------------------------', '');
  });
  return lines;
}
function makePdfBlob(lines) { const pages = []; for (let i = 0; i < lines.length; i += 48) pages.push(lines.slice(i, i + 48)); if (!pages.length) pages.push(['SUPERVISION REPORT']); const objects = []; const add = body => { objects.push(body); return objects.length; }; const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'); const pageIds = []; const contentIds = []; pages.forEach(page => { const commands = ['BT', '/F1 10 Tf', '50 790 Td', '14 TL']; page.forEach((line, index) => { if (index) commands.push('T*'); commands.push(`(${escapePdfText(line)}) Tj`); }); commands.push('ET'); const stream = commands.join('\n'); contentIds.push(add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)); pageIds.push(add('PENDING')); }); const pagesId = objects.length + 1; pageIds.forEach((pageId, index) => { objects[pageId - 1] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`; }); add(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`); const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`); let pdf = '%PDF-1.4\n'; const offsets = [0]; objects.forEach((body, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${body}\nendobj\n`; }); const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`; for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`; pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`; return new Blob([pdf], { type: 'application/pdf' }); }
async function downloadPdf() { if (downloadingPdf.value || !reportSelectedReflections.value.length) return; downloadingPdf.value = true; try { const blob = makePdfBlob(buildPdfLines()); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `supervision-report-${new Date().toISOString().slice(0, 10)}.pdf`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); } catch (err) { console.error('Failed to download PDF:', err); } finally { downloadingPdf.value = false; } }
async function copyExportText() { if (copying.value) return; copying.value = true; try { await navigator.clipboard.writeText(buildPdfLines().join('\n')); } catch (err) { console.error('Failed to copy:', err); } finally { setTimeout(() => { copying.value = false; }, 1000); } }
</script>
