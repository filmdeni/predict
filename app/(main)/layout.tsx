import { Suspense } from 'react'
import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import Sidebar from '@/components/layout/Sidebar'
import SidebarPriceTicker from '@/components/layout/SidebarPriceTicker'
import DailyBonusProvider from '@/components/layout/DailyBonusProvider'
import ResolvedRewardPopup from '@/components/layout/ResolvedRewardPopup'
import RewardClaimFX, { RewardClaimDevButtons } from '@/components/layout/RewardClaimFX'
import ToastContainer from '@/components/ui/Toast'
import HowToPlayModal from '@/components/layout/HowToPlayModal'
import TermsModal from '@/components/layout/TermsModal'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <TermsModal />
      <DailyBonusProvider />
      <ResolvedRewardPopup />
      <RewardClaimFX />
      <RewardClaimDevButtons />
      <HowToPlayModal />

      {/* Sidebar — desktop only */}
      <Sidebar
        priceTicker={
          <Suspense fallback={null}>
            <SidebarPriceTicker />
          </Suspense>
        }
      />

      {/* Main content — offset by sidebar on desktop */}
      <div className="flex flex-col min-h-screen md:pl-56">
        <Header />
        <main className="flex-1 pb-20 md:pb-6">{children}</main>
      </div>

      {/* Bottom nav — mobile only */}
      <div className="md:hidden">
        <BottomNav />
      </div>

      <ToastContainer />
    </div>
  )
}
