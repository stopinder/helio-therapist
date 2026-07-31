
import { test } from 'node:test';
import assert from 'node:assert';
import { ref, computed } from 'vue';

// Mock data
const mockReflections = [
  { 
    id: 1, 
    created_at: '2026-07-20T10:00:00Z', 
    body: 'Reflection 1', 
    theme: 'Theme X',
    included_in_supervision: true,
    clients: { display_name: 'John Doe' }
  }
];

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

test('Report Export: Option Handling and Clipboard Output', async () => {
  const reflections = ref(mockReflections);
  const exportOptions = ref({
    includeText: true,
    includeThemes: true,
    includeDates: true,
    includeClientReferences: false
  });
  const therapistIntroduction = ref('This is an intro.');
  const clientAliases = ref({ 'John Doe': 'Case A' });

  const supervisionPackReflections = computed(() => {
    return reflections.value.filter(r => r.included_in_supervision);
  });

  const generateText = () => {
    let text = "SUPERVISION REPORT\n";
    text += `Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`;
    
    if (therapistIntroduction.value) {
      text += `${therapistIntroduction.value}\n\n`;
    }
    
    supervisionPackReflections.value.forEach(r => {
      if (exportOptions.value.includeDates) {
        text += `DATE: ${formatDate(r.created_at)}\n`;
      }
      
      if (exportOptions.value.includeThemes && r.theme) {
        text += `THEME: ${r.theme}\n`;
      }
      
      const clientRef = exportOptions.value.includeClientReferences && r.clients?.display_name 
        ? r.clients.display_name 
        : (r.clients?.display_name ? clientAliases.value[r.clients.display_name] : 'Anonymous');
      text += `CASE: ${clientRef}\n`;
      
      if (exportOptions.value.includeText) {
        text += `\n"${r.body}"\n\n`;
      } else {
        text += `\n`;
      }
      text += `-------------------\n\n`;
    });
    return text;
  };

  // Default options
  let output = generateText();
  assert.match(output, /SUPERVISION REPORT/);
  assert.match(output, /This is an intro\./);
  assert.match(output, /DATE: 20 Jul 2026/);
  assert.match(output, /THEME: Theme X/);
  assert.match(output, /CASE: Case A/);
  assert.match(output, /"Reflection 1"/);

  // Exclude text and themes
  exportOptions.value.includeText = false;
  exportOptions.value.includeThemes = false;
  output = generateText();
  assert.match(output, /DATE: 20 Jul 2026/);
  assert.doesNotMatch(output, /THEME: Theme X/);
  assert.doesNotMatch(output, /"Reflection 1"/);

  // Include real names
  exportOptions.value.includeClientReferences = true;
  output = generateText();
  assert.match(output, /CASE: John Doe/);
  assert.doesNotMatch(output, /CASE: Case A/);

  // Exclude dates
  exportOptions.value.includeDates = false;
  output = generateText();
  assert.doesNotMatch(output, /DATE: 20 Jul 2026/);
});
