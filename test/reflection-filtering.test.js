import { strict as assert } from 'node:assert';

// Mock reflections data
const mockReflections = [
  { 
    id: 1, 
    body: 'First reflection about anxiety', 
    theme: 'Clinical', 
    clients: { display_name: 'John Doe' },
    session_ref: 'SESS-001',
    created_at: '2026-07-01T10:00:00Z'
  },
  { 
    id: 2, 
    body: 'Second reflection', 
    theme: 'Clinical', 
    clients: { display_name: 'Jane Smith' },
    session_ref: 'SESS-002',
    created_at: '2026-07-02T10:00:00Z'
  },
  { 
    id: 3, 
    body: 'Third reflection on growth', 
    theme: 'Professional Growth', 
    clients: { display_name: 'John Doe' },
    session_ref: 'SESS-003',
    created_at: '2026-07-03T10:00:00Z'
  },
  { 
    id: 4, 
    body: 'Fourth one no theme', 
    theme: null, 
    clients: { display_name: 'Bob' },
    session_ref: 'SESS-004',
    created_at: '2026-07-04T10:00:00Z'
  }
];

// Logic extracted from Supervision.vue
function getThemes(reflections) {
  const counts = { All: reflections.length };
  const themeList = ['All'];
  
  reflections.forEach(r => {
    const t = r.theme || 'No theme';
    counts[t] = (counts[t] || 0) + 1;
    if (!themeList.includes(t)) themeList.push(t);
  });

  const sortedThemes = themeList.filter(t => t !== 'All' && t !== 'No theme').sort();
  if (themeList.includes('No theme')) sortedThemes.push('No theme');
  
  return ['All', ...sortedThemes].map(t => ({
    name: t,
    count: counts[t]
  }));
}

function getFilteredReflections(reflections, selectedTheme, searchQuery) {
  return reflections.filter(r => {
    const matchesTheme = selectedTheme === 'All' || 
                         (selectedTheme === 'No theme' ? !r.theme : r.theme === selectedTheme);
    
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
                          (r.body && r.body.toLowerCase().includes(query)) ||
                          (r.theme && r.theme.toLowerCase().includes(query)) ||
                          (r.clients?.display_name && r.clients.display_name.toLowerCase().includes(query)) ||
                          (r.session_ref && r.session_ref.toLowerCase().includes(query));
                          
    return matchesTheme && matchesSearch;
  });
}

async function testThemeAndSearchFiltering() {
  console.log('Testing Theme and Search Filtering logic...');

  // 1. Verify theme counts
  const themes = getThemes(mockReflections);
  assert.equal(themes.find(t => t.name === 'All').count, 4);
  assert.equal(themes.find(t => t.name === 'Clinical').count, 2);
  assert.equal(themes.find(t => t.name === 'Professional Growth').count, 1);
  assert.equal(themes.find(t => t.name === 'No theme').count, 1);
  console.log('✓ Success: Theme counts are correct');

  // 2. Test theme filtering
  let selectedTheme = 'Clinical';
  let searchQuery = '';
  let filtered = getFilteredReflections(mockReflections, selectedTheme, searchQuery);
  assert.equal(filtered.length, 2);
  assert.ok(filtered.every(r => r.theme === 'Clinical'));
  
  selectedTheme = 'No theme';
  filtered = getFilteredReflections(mockReflections, selectedTheme, searchQuery);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 4);
  console.log('✓ Success: Theme filtering works');

  // 3. Test search filtering
  selectedTheme = 'All';
  searchQuery = 'anxiety';
  filtered = getFilteredReflections(mockReflections, selectedTheme, searchQuery);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 1);
  
  searchQuery = 'John Doe';
  filtered = getFilteredReflections(mockReflections, selectedTheme, searchQuery);
  assert.equal(filtered.length, 2);
  
  searchQuery = 'SESS-004';
  filtered = getFilteredReflections(mockReflections, selectedTheme, searchQuery);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 4);
  console.log('✓ Success: Search filtering works (body, client, session)');

  // 4. Combined search + theme filter
  selectedTheme = 'Clinical';
  searchQuery = 'John Doe';
  filtered = getFilteredReflections(mockReflections, selectedTheme, searchQuery);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 1);
  console.log('✓ Success: Combined search + theme filter works');

  // 5. Empty filtered state
  searchQuery = 'nonexistent';
  filtered = getFilteredReflections(mockReflections, selectedTheme, searchQuery);
  assert.equal(filtered.length, 0);
  console.log('✓ Success: Empty filtered state confirmed');
}

testThemeAndSearchFiltering().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
