import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import DailyBonusProvider from '@/components/layout/DailyBonusProvider'
import ToastContainer from '@/components/ui/Toast'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#f5f5f5]">
      <DailyBonusProvider />
      <Header />
      <main className="flex-1 pb-20 max-w-7xl mx-auto w-full">{children}</main>
      <BottomNav />
      <ToastContainer />
    </div>
  )
}
