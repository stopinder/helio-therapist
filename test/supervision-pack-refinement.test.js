
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
  },
  { 
    id: 2, 
    created_at: '2026-07-21T10:00:00Z', 
    body: 'Reflection 2', 
    theme: 'Theme Y',
    included_in_supervision: true,
    clients: { display_name: 'Jane Smith' }
  },
  { 
    id: 3, 
    created_at: '2026-06-15T10:00:00Z', 
    body: 'Reflection 3', 
    theme: 'Theme X',
    included_in_supervision: true,
    clients: { display_name: 'John Doe' }
  },
  { 
    id: 4, 
    created_at: '2026-07-22T10:00:00Z', 
    body: 'Reflection 4', 
    theme: 'Theme Z',
    included_in_supervision: false,
    clients: { display_name: 'Bob Brown' }
  }
];

test('Supervision Pack: Client Alias Generation', () => {
  const reflections = ref(mockReflections);
  const supervisionPackReflections = computed(() => {
    return reflections.value.filter(r => r.included_in_supervision);
  });

  const clientAliases = computed(() => {
    const aliases = {};
    let count = 0;
    const clientNames = [...new Set(supervisionPackReflections.value.map(r => r.clients?.display_name).filter(Boolean))];
    clientNames.forEach(name => {
      aliases[name] = `Case ${String.fromCharCode(65 + count)}`;
      count++;
    });
    return aliases;
  });

  const aliases = clientAliases.value;
  
  // John Doe should be Case A
  assert.equal(aliases['John Doe'], 'Case A');
  // Jane Smith should be Case B
  assert.equal(aliases['Jane Smith'], 'Case B');
  // Bob Brown is not in the pack, so no alias
  assert.equal(aliases['Bob Brown'], undefined);
  
  // The same client should have the same alias
  const pack = supervisionPackReflections.value;
  assert.equal(aliases[pack[0].clients.display_name], 'Case A');
  assert.equal(aliases[pack[2].clients.display_name], 'Case A');
});

test('Supervision Pack: Month Grouping', () => {
  const reflections = ref(mockReflections);
  const supervisionPackReflections = computed(() => {
    return reflections.value.filter(r => r.included_in_supervision);
  });

  const groupedPackReflections = computed(() => {
    const groups = {};
    supervisionPackReflections.value.forEach(r => {
      const date = new Date(r.created_at);
      const monthYear = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(r);
    });
    
    return Object.entries(groups).map(([monthYear, items]) => ({
      monthYear,
      items
    }));
  });

  const groups = groupedPackReflections.value;
  
  assert.equal(groups.length, 2);
  assert.equal(groups[0].monthYear, 'July 2026');
  assert.equal(groups[0].items.length, 2);
  assert.equal(groups[1].monthYear, 'June 2026');
  assert.equal(groups[1].items.length, 1);
});
