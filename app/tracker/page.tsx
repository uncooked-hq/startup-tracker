'use client'

import { Navbar } from '../components/Navbar'
import { Hero } from '../components/Hero'
import { JobTracker } from '../components/JobTracker/JobTracker'
import { Footer } from '../components/Footer'
import { OnboardingTour } from '../components/OnboardingTour'

export default function TrackerPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-brand selection:text-white">
      <Navbar />
      <main className="flex flex-col w-full">
        <Hero />
        <JobTracker />
      </main>
      <Footer />
      <OnboardingTour />
    </div>
  )
}
