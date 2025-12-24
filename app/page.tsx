'use client'

import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { JobTracker } from './components/JobTracker/JobTracker'
import { Footer } from './components/Footer'

export default function Home() {
  const scrollToTracker = () => {
    const element = document.getElementById('job-tracker')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-brand selection:text-white">
      <Navbar />
      <main className="flex flex-col w-full">
        <Hero scrollToTracker={scrollToTracker} />
        <JobTracker />
      </main>
      <Footer />
    </div>
  )
}
