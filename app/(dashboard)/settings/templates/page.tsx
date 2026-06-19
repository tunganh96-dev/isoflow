import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth'
import TemplateList from './TemplateList'

export default async function DocumentTemplatesSettingsPage() {
  await requireManager()
  const supabase = createClient()

  const { data: templates } = await supabase
    .from('document_templates')
    .select('id, name, doc_type, content, is_active, updated_at')
    .order('doc_type')
    .order('updated_at', { ascending: false }) as { data: any[] | null }

  return <TemplateList templates={templates ?? []} />
}
