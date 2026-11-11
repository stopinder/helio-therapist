import cbt from './cbt.js';
import ifs from './ifs.js';
import integrative from './integrative.js';
import ta from './ta.js';
import general from './general.js';
import { getSummaryModality, SUMMARY_MODALITIES } from '../../../../src/lib/summaryModalities.js';
const strategies = Object.freeze(Object.fromEntries([general, cbt, ifs, integrative, ta].map(strategy => [strategy.id, strategy])));
export function modalityStrategy(id) {
  const metadata = getSummaryModality(id);
  const strategy = strategies[id];
  if (!strategy) throw new Error('No reasoning strategy registered for this modality.');
  return { ...metadata, ...strategy };
}
export function assertModalityRegistry() {
  for (const id of Object.keys(SUMMARY_MODALITIES)) {
    const strategy = modalityStrategy(id);
    for (const key of ['priorities','reasoning','composition','example']) if (!strategy[key]?.trim()) throw new Error(`${id} lacks ${key}`);
    if (!Object.keys(strategy.formulation).length || !Object.keys(strategy.sections).length) throw new Error(`${id} lacks a schema`);
  }
  return true;
}
