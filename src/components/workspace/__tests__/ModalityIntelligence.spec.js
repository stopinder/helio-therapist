import {describe,it,expect,vi,beforeEach} from 'vitest';
import {mount,flushPromises} from '@vue/test-utils';
import Controls from '../ClinicalIntelligenceControls.vue';
import Formulation from '../TherapistFormulationPanel.vue';
import Evidence from '../SummaryEvidencePanel.vue';
import {readModalitySources,assertClientSummaryProjection} from '../../../lib/modalityIntelligence.js';
import {formulationFixture,evidenceFixture} from '../../../../test/fixtures/modality-intelligence.js';
vi.mock('../../../lib/modalityIntelligence.js',async importOriginal=>({...await importOriginal(),readModalitySources:vi.fn()}));
const selection={clientId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',sessionId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',scope:'encounter',window:'current'};
const note={id:'n1',text:'<script>Do not execute source markup.</script>',occurredAt:'2026-01-01',needsReview:false};
async function open(wrapper){const details=wrapper.find('details');details.element.open=true;await details.trigger('toggle');await flushPromises();}
beforeEach(()=>{vi.clearAllMocks();readModalitySources.mockResolvedValue({zoomSummaries:[note]});});
describe('branded source controls',()=>{
 it('does not read remote notes or include Zoom text by default',async()=>{
  const wrapper=mount(Controls,{props:{selection,lens:'gentle_cbt'}});expect(readModalitySources).not.toHaveBeenCalled();expect(wrapper.text()).toContain('Reference only');expect(wrapper.findAll('input[type="radio"]').length).toBe(2);await open(wrapper);expect(readModalitySources).toHaveBeenCalledTimes(1);expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(false);expect(wrapper.find('script').exists()).toBe(false);expect(wrapper.text()).toContain('<script>');
 });
 it('include control emits only explicit therapist choices',async()=>{
  const wrapper=mount(Controls,{props:{selection}});await open(wrapper);await wrapper.find('input[type="checkbox"]').setValue(true);expect(wrapper.emitted('update:includeZoomSummary').at(-1)).toEqual([true]);
 });
 it('a context change invalidates old source responses and inclusion',async()=>{
  let resolve;readModalitySources.mockImplementationOnce(()=>new Promise(r=>{resolve=r})).mockResolvedValueOnce({zoomSummaries:[{...note,text:'New selected encounter'}]});
  const wrapper=mount(Controls,{props:{selection,includeZoomSummary:true}});wrapper.find('details').element.open=true;await wrapper.find('details').trigger('toggle');await wrapper.setProps({selection:{...selection,sessionId:'different'}});await flushPromises();resolve({zoomSummaries:[{...note,text:'STALE SOURCE'}]});await flushPromises();expect(wrapper.text()).not.toContain('STALE SOURCE');expect(wrapper.text()).toContain('New selected encounter');expect(wrapper.emitted('update:includeZoomSummary').at(-1)).toEqual([false]);
 });
 it('shows missing notes without inventing a Zoom summary',async()=>{
  readModalitySources.mockResolvedValue({zoomSummaries:[]});const wrapper=mount(Controls,{props:{selection}});await open(wrapper);expect(wrapper.text()).toContain('No Zoom summary is saved');expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false);
 });
 it('flagged note remains readable but cannot be included without source review',async()=>{
  readModalitySources.mockResolvedValue({zoomSummaries:[{...note,needsReview:true}]});const wrapper=mount(Controls,{props:{selection}});await open(wrapper);expect(wrapper.find('input[type="checkbox"]').attributes('disabled')).toBeDefined();expect(wrapper.text()).toContain('needs therapist review');
 });
 it('each modality visibly describes its distinct pathway',async()=>{
  const wrapper=mount(Controls,{props:{selection,lens:'gentle_cbt'}});expect(wrapper.text()).toContain('situations, meanings, responses');await wrapper.setProps({lens:'internal_family_systems'});expect(wrapper.text()).toContain('inner positions');await wrapper.setProps({lens:'integrative'});expect(wrapper.text()).toContain('relational and practical context');
 });
});
describe('private working formulation',()=>{
 const value=()=>({...formulationFixture('gentle_cbt'),modalityId:'gentle_cbt',visibility:'therapist_only',evidence:evidenceFixture().observations,sourceWarnings:[]});
 it('is explicitly unsaved and requires review before copying, with uncertainty preserved',async()=>{
  const writeText=vi.fn().mockResolvedValue();vi.stubGlobal('navigator',{clipboard:{writeText}});const wrapper=mount(Formulation,{props:{formulation:value()}});
  expect(wrapper.text()).toContain('Provisional and unsaved');expect(wrapper.text()).toContain('not an approved Clinical Record');expect(wrapper.find('button').attributes('disabled')).toBeDefined();await wrapper.find('input[type="checkbox"]').setValue(true);await wrapper.find('button').trigger('click');await flushPromises();expect(writeText.mock.calls[0][0]).toContain('What remains uncertain');expect(writeText.mock.calls[0][0]).toContain('Therapist-only');vi.unstubAllGlobals();
 });
 it('invalidates review when a different formulation arrives',async()=>{
  const wrapper=mount(Formulation,{props:{formulation:value()}});await wrapper.find('input').setValue(true);await wrapper.setProps({formulation:value()});expect(wrapper.find('button').attributes('disabled')).toBeDefined();
 });
 it('cannot be projected into a client draft even when a bogus draft field is present',()=>{
  expect(()=>assertClientSummaryProjection({mode:'therapist_formulation',draft:{body:'Private content'}})).toThrow('cannot replace');
 });
 it('source passage viewer escapes markup and labels secondary interpretations',()=>{
  const wrapper=mount(Evidence,{props:{claims:[{text:'A tentative interpretation.',secondaryOnly:true,evidenceStrength:'tentative_connection',citations:[{sourceType:'zoom_summary',quote:'<img onerror="untrusted">',occurredAt:'2026-01-01'}]}]}});expect(wrapper.find('img').exists()).toBe(false);expect(wrapper.text()).toContain('secondary AI material');expect(wrapper.text()).toContain('Zoom AI summary');
 });
});
