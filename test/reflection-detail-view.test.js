import { strict as assert } from 'node:assert';

// State management simulation from Supervision.vue
class SupervisionStore {
  constructor(reflections) {
    this.reflections = reflections;
    this.selectedReflection = null;
    this.searchQuery = '';
    this.selectedTheme = 'All';
  }

  openDetail(reflection) {
    this.selectedReflection = { ...reflection };
  }

  closeDetail() {
    this.selectedReflection = null;
  }

  // Simulate toggle from detail view
  updateReflection(id, updatedFields) {
    const index = this.reflections.findIndex(r => r.id === id);
    if (index !== -1) {
      this.reflections[index] = { ...this.reflections[index], ...updatedFields };
      if (this.selectedReflection?.id === id) {
        this.selectedReflection = { ...this.selectedReflection, ...updatedFields };
      }
    }
  }
}

async function testDetailViewLogic() {
  console.log('Testing Reflection Detail View logic...');

  const reflections = [
    { id: 1, body: 'Reflection 1', included_in_supervision: false },
    { id: 2, body: 'Reflection 2', included_in_supervision: true }
  ];
  const store = new SupervisionStore(reflections);

  // 1. Open detail view
  store.searchQuery = 'anxiety';
  store.selectedTheme = 'Clinical';
  store.openDetail(reflections[0]);
  assert.notEqual(store.selectedReflection, null);
  assert.equal(store.selectedReflection.id, 1);
  assert.equal(store.selectedReflection.body, 'Reflection 1');
  console.log('✓ Success: Can open detail view');

  // 2. Filter state preserved
  assert.equal(store.searchQuery, 'anxiety');
  assert.equal(store.selectedTheme, 'Clinical');
  console.log('✓ Success: Filter state preserved when opening detail');

  // 3. Supervision toggle in detail view
  store.updateReflection(1, { included_in_supervision: true });
  assert.equal(store.reflections[0].included_in_supervision, true);
  assert.equal(store.selectedReflection.included_in_supervision, true);
  console.log('✓ Success: Supervision toggle updates both list and detail view');

  // 4. Close detail view
  store.closeDetail();
  assert.equal(store.selectedReflection, null);
  assert.equal(store.searchQuery, 'anxiety');
  assert.equal(store.selectedTheme, 'Clinical');
  console.log('✓ Success: Can close detail view and filter state remains');
}

testDetailViewLogic().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
