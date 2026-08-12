import crypto from 'node:crypto';

export const AI_MODEL_POLICY_VERSION = 'text-model-policy-v1';

export function hashArtifactSource(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

export async function findReusableSupervisionArtifact(supabase, { reflectionId, sourceHash, promptVersion }) {
  const { data, error } = await supabase
    .from('reflection_supervision_summaries')
    .select('id, generated_content, model, prompt_version, generated_at')
    .eq('reflection_id', reflectionId)
    .eq('source_hash', sourceHash)
    .eq('prompt_version', promptVersion)
    .eq('model_policy_version', AI_MODEL_POLICY_VERSION)
    .eq('generation_status', 'generated')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function persistGeneratedSupervisionArtifact(supabase, { reflectionId, userId, generatedContent, model, promptVersion, sourceHash }) {
  const generatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('reflection_supervision_summaries')
    .insert({
      reflection_id: reflectionId,
      user_id: userId,
      generated_content: generatedContent,
      edited_content: generatedContent,
      generation_status: 'generated',
      model,
      prompt_version: promptVersion,
      source_hash: sourceHash,
      model_policy_version: AI_MODEL_POLICY_VERSION,
      generated_at: generatedAt
    })
    .select('id')
    .single();
  if (error && error.code !== '23505') throw error;
  return data || null;
}
