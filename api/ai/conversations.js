import { requireAuthenticatedUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { user, supabase } = await requireAuthenticatedUser(req);

  if (req.method === 'GET') {
    // List conversations or fetch one
    const id = req.query.id;
    if (id) {
      const { data: conv, error: convErr } = await supabase
        .from('ask_helios_conversations')
        .select('*')
        .eq('id', id)
        .single();
      if (convErr) return res.status(404).json({ success: false, error: 'Not found' });

      const { data: messages, error: msgErr } = await supabase
        .from('ask_helios_messages')
        .select('id, role, content, citation_metadata, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });
      if (msgErr) throw msgErr;

      return res.status(200).json({ success: true, conversation: conv, messages });
    } else {
      const { data, error } = await supabase
        .from('ask_helios_conversations')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ success: true, conversations: data });
    }
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ success: false, error: 'ID required' });
    const { error } = await supabase
      .from('ask_helios_conversations')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
