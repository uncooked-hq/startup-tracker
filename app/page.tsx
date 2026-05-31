'use client'

import { useEffect, useState } from 'react'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import Image from 'next/image'

// Round live job count down to the nearest thousand for the hero copy
// (4,250 → "4,000+"). Falls through to a literal small number when < 1k.
function formatJobCount(n: number | null): string {
  if (n === null) return ''
  if (n < 1000) return n.toLocaleString()
  return (Math.floor(n / 1000) * 1000).toLocaleString() + '+'
}

const COLLEGES = [
  { name: 'University of Oxford', logo: '/logos/Oxford.avif' },
  { name: 'Imperial College London', logo: '/logos/Imperial.avif' },
  { name: 'UCL', logo: '/logos/UCL.avif' },
  { name: 'University of Manchester', logo: '/logos/Manchester.avif' },
  { name: 'University of Cambridge', logo: '/logos/Cambridge.avif' },
]

export default function Home() {
  const [jobCount, setJobCount] = useState<number | null>(null)
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setJobCount(typeof d.count === 'number' ? d.count : null))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-brand selection:text-white">
      <Navbar />

      <main className="flex flex-col items-center w-full">
        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center px-6 text-center pt-32 pb-20 overflow-hidden bg-dark-bg w-full">
          {/* Background ambience */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#e62b15]/10 blur-[160px] rounded-full pointer-events-none opacity-60 animate-pulse-slow" />
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black via-black/90 to-transparent" />

          {/* Pill */}
          <div className="relative mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0ms' }}>
            <span className="px-4 py-2 text-xs font-semibold tracking-widest text-neutral-400 uppercase border border-white/5 rounded-full bg-[#0a0a0a] backdrop-blur-md">
              join 400+ students already signed up
            </span>
          </div>

          {/* Headline */}
          <h1 className="relative max-w-4xl text-5xl font-medium tracking-tighter text-white md:text-7xl lg:text-8xl animate-fade-in-up opacity-0 leading-[0.95]" style={{ animationDelay: '150ms' }}>
            never get
            <br />
            <span className="font-serif italic text-white font-normal relative inline-block">
              ghosted.
              <span className="absolute -bottom-2 left-0 w-full h-[20%] bg-[#e62b15]/20 -rotate-1 blur-lg -z-10"></span>
            </span>
          </h1>

          {/* Subtext */}
          <p className="relative max-w-2xl mt-8 text-base text-neutral-400 md:text-lg leading-relaxed animate-fade-in-up opacity-0" style={{ animationDelay: '300ms' }}>
            no CVs. no cover letters. no repeating yourself 140 times.
          </p>

          {/* CTA */}
          <a
            href="https://tally.so/r/7RRlp9"
            target="_blank"
            rel="noopener noreferrer"
            className="relative mt-10 px-8 py-4 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 animate-fade-in-up opacity-0 text-base inline-flex items-center gap-2"
            style={{ animationDelay: '450ms', backgroundColor: '#e62b15' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className="w-5 h-5 flex-shrink-0"><path d="M244,28a12,12,0,0,0-12,12A48.71,48.71,0,0,1,228.67,56C224.23,66.64,217.43,68,212,68c-8.81,0-14.91-8.5-23.91-22.49C178.5,30.58,166.55,12,144,12c-18.14,0-32,9.78-39.14,27.54A68.26,68.26,0,0,0,101.27,52H88A20,20,0,0,0,68,72v7.18A92,92,0,0,0,112,252h1.66A92,92,0,0,0,156,79.18V72a20,20,0,0,0-20-20H125.93a40.89,40.89,0,0,1,1.4-4c4.44-10.62,11.24-12,16.67-12,8.81,0,14.91,8.5,23.91,22.49C177.5,73.42,189.45,92,212,92c18.14,0,32-9.78,39.14-27.54A71.91,71.91,0,0,0,256,40,12,12,0,0,0,244,28ZM139.2,97.65a68,68,0,1,1-54.4,0,12,12,0,0,0,7.2-11V76h19.5c.17,0,.33,0,.5,0s.34,0,.51,0H132V86.66A12,12,0,0,0,139.2,97.65ZM111.45,201.76A12,12,0,0,1,100,210.17a12.2,12.2,0,0,1-3.6-.55A51.79,51.79,0,0,1,60,160a12,12,0,0,1,24,0,27.89,27.89,0,0,0,19.6,26.72A12,12,0,0,1,111.45,201.76Z" /></svg>
            uncook me
          </a>

          {/* Secondary: tracker link */}
          <a
            href="/tracker"
            className="group relative mt-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors animate-fade-in-up opacity-0"
            style={{ animationDelay: '600ms' }}
          >
            <span className="relative h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-[#e62b15] animate-ping opacity-75" />
              <span className="relative block h-1.5 w-1.5 rounded-full bg-[#e62b15]" />
            </span>
            <span>
              or just <span className="font-serif italic text-white">browse</span> the tracker:{' '}
              <span className="underline decoration-[#e62b15]/40 underline-offset-4 group-hover:decoration-[#e62b15]">
                {jobCount !== null ? `${formatJobCount(jobCount)} live startup jobs` : 'live startup jobs'}
              </span>
            </span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </a>
        </section>

        {/* College marquee */}
        <section className="w-full max-w-5xl px-6 py-12">
          <p className="text-center text-xs text-neutral-600 uppercase tracking-widest font-semibold mb-8">
            students &amp; grads from
          </p>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
            <div className="overflow-hidden">
              <div
                className="flex w-max animate-marquee will-change-transform"
                style={{ '--marquee-width': `${COLLEGES.length * 192}px` } as React.CSSProperties}
              >
                {[0, 1, 2, 3].map((copy) => (
                  <div key={copy} className="flex items-center shrink-0" aria-hidden={copy > 0}>
                    {COLLEGES.map((c) => (
                      <div key={c.name + '-' + copy} className="flex-shrink-0 w-48 h-16 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                        <Image
                          src={c.logo}
                          alt={c.name}
                          width={160}
                          height={64}
                          className="max-h-12 max-w-[140px] w-auto h-auto object-contain"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="w-full max-w-5xl px-6 py-20">
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight text-center mb-4">
            how it <span className="font-serif italic">works</span>
          </h2>
          <p className="text-center text-neutral-500 mb-16 text-lg">
            build your persona once. get matched. talk to the founder.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'build your persona',
                body: 'tell us who you are and what you\'re looking for. once. that\'s it.',
              },
              {
                num: '02',
                title: 'get matched',
                body: 'when a role matches, we ping you on your phone. answer 3 short audio questions.',
              },
              {
                num: '03',
                title: 'talk to the founder',
                body: 'guaranteed response within 7 days. straight to the actual founder. not a recruiter. not an AI.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="p-7 rounded-3xl bg-[#0A0A0A] border border-white/5 hover:border-[#e62b15]/20 transition-all"
              >
                <div className="text-[#e62b15] font-serif italic text-3xl mb-3">{step.num}</div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">{step.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final note */}
        <section className="w-full max-w-3xl px-6 py-24 text-center">
          <h2 className="text-4xl md:text-6xl font-medium text-white tracking-tight mb-6 leading-tight">
            tired of the <span className="font-serif italic">cooked</span> job market?
          </h2>
          <p className="text-neutral-400 text-lg mb-2">
            we&apos;re building something better.
          </p>
          <p className="text-sm text-neutral-600">
            looking to hire instead? <a href="/hiring" className="text-[#e62b15] hover:underline">we got you →</a>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  )
}
