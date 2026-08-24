import { Badge } from '@/components/ui/badge'
import { statusLabels, statusTone, type PostStatus } from '@/lib/workflow/postWorkflow'

export function StatusBadge({ status }: { status: PostStatus }) {
  return <Badge className={statusTone[status]}>{statusLabels[status]}</Badge>
}
