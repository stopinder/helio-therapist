import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ClinicalSummaryTab from '../ClinicalSummaryTab.vue';

// Mock dependencies
vi.mock('../../../lib/api.js', () => ({
  authenticatedFetch: vi.fn()
}));

vi.mock('../../../lib/sessions.js', () => ({
  saveSessionDraft: vi.fn(),
  completeSessionRecord: vi.fn()
}));

vi.mock('../../../lib/sessionCaptures.js', () => ({
  getSessionCapture: vi.fn(() => Promise.resolve(null))
}));

describe('ClinicalSummaryWorkingMaterial', () => {
  const defaultProps = {
    session: {
      id: 'session-123',
      clientId: 'client-123',
      status: 'in_progress',
      notes: null
    },
    therapistName: 'Test Therapist'
  };

  const stubs = {
    NoticeBanner: {
      template: '<div class="notice-banner"><slot></slot><span>{{ message }}</span></div>',
      props: ['message']
    },
    StatusBadge: true,
    ClinicalWorkflowIndicator: true,
    ClinicalRecordMetadata: true,
    ApprovedClinicalRecordView: true,
    RecordHistoryPanel: true,
    ApprovalConfirmationDialog: true
  };

  it('displays working material notice in preparation state (not_started)', async () => {
    const wrapper = mount(ClinicalSummaryTab, {
      props: defaultProps,
      global: { stubs }
    });

    // Preparation state is active when status is 'not_started' (default for no notes)
    expect(wrapper.find('[data-testid="clinical-summary-workspace"]').exists()).toBe(true);
    
    const preparationSection = wrapper.find('.bg-surface-elevated');
    expect(preparationSection.text()).toContain('Prepare Clinical Record');

    // Verify AI-review warning (message prop of NoticeBanner)
    expect(wrapper.text()).toContain('AI-assisted content must be reviewed and approved by the therapist before it becomes part of the clinical record.');

    // Verify private working material notice (slot content of NoticeBanner)
    expect(wrapper.text()).toContain('Therapist reflection is private working material and is not automatically included in the clinical record.');
  });

  it('displays working material notice in draft state', async () => {
    const draftProps = {
      ...defaultProps,
      session: {
        ...defaultProps.session,
        notes: JSON.stringify({
          presentingConcerns: 'Some concerns',
          legacyNotes: ''
        })
      }
    };

    const wrapper = mount(ClinicalSummaryTab, {
      props: draftProps,
      global: { stubs }
    });

    await wrapper.vm.$nextTick();

    // In ClinicalSummaryTab, loadFromSession sets status to 'draft' if notes exist and have content
    // Verify draft notice (message prop of NoticeBanner)
    expect(wrapper.text()).toContain('This is a working draft and is not yet part of the clinical record.');

    // Verify private working material notice (slot content of NoticeBanner)
    expect(wrapper.text()).toContain('Therapist reflection is private working material and is not automatically included.');
  });
});
