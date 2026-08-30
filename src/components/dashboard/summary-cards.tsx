import { CheckCheck, FileText, Send, Sparkles, ThumbsDown, Timer } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { statusLabels, type PostStatus } from '@/lib/workflow/postWorkflow'

const statusIcons = {
  declined: ThumbsDown,
  open: Timer,
  posted: Send,
  ready: CheckCheck,
  review: Sparkles,
} satisfies Record<PostStatus, typeof FileText>

export function SummaryCards({
  all,
  byStatus,
}: {
  all: number
  byStatus: Record<PostStatus, number>
}) {
  const cards = [
    {
      icon: FileText,
      label: 'All',
      value: all,
    },
    ...Object.entries(byStatus).map(([status, value]) => ({
      icon: statusIcons[status as PostStatus],
      label: statusLabels[status as PostStatus],
      value,
    })),
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">{card.label}</CardTitle>
            <card.icon className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-normal text-slate-950">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
