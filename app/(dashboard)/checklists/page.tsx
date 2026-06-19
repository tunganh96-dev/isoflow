import { getCurrentUser } from '@/lib/auth'
import ChecklistIsoClient from './ChecklistIsoClient'

export default async function ChecklistIsoPage() {
  const user = await getCurrentUser()
  return <ChecklistIsoClient user={user} />
}
