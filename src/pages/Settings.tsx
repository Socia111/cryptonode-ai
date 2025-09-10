import MainLayout from '@/layouts/MainLayout'

export default function Settings() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Automation Settings</h1>
        <p className="text-muted-foreground text-sm">Configure risk, position caps, and notifications (coming soon).</p>
      </div>
    </MainLayout>
  )
}