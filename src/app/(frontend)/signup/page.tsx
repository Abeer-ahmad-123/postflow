import { PostflowLogo } from '@/components/app/postflow-logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SignupForm } from './signup-form'

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="gap-3">
          <PostflowLogo />
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            Join Postflow with your team invite code. New users are normal dashboard users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
      </Card>
    </main>
  )
}
