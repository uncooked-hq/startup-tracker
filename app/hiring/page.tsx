'use client'

import Image from 'next/image'
import { HiringNavbar } from '../components/HiringNavbar'
import { Footer } from '../components/Footer'
import { CheckCircle2 } from 'lucide-react'

const VC_PARTNERS = [
  { name: 'Antler', logo: '/logos/Antler.avif' },
  { name: 'Index Ventures', logo: '/logos/IndexVentures.avif' },
  { name: 'Spring Studios', logo: '/logos/SpringStudios.avif' },
]

export default function HiringPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-brand selection:text-white">
      <HiringNavbar />

      <main className="flex flex-col items-center w-full">
        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center px-6 text-center pt-32 pb-20 overflow-hidden bg-dark-bg w-full">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-brand/10 blur-[160px] rounded-full pointer-events-none opacity-60 animate-pulse-slow" />
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black via-black/90 to-transparent" />

          <div className="relative mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0ms' }}>
            <span className="px-4 py-2 text-xs font-semibold tracking-widest text-neutral-400 uppercase border border-white/5 rounded-full bg-[#0a0a0a] backdrop-blur-md">
              early access to platform
            </span>
          </div>

          <h1 className="relative max-w-4xl text-5xl font-medium tracking-tighter text-white md:text-7xl lg:text-8xl animate-fade-in-up opacity-0 leading-[0.95]" style={{ animationDelay: '150ms' }}>
            hire in
            <br />
            <span className="font-serif italic text-white font-normal relative inline-block">
              &lt;72 hours.
              <span className="absolute -bottom-2 left-0 w-full h-[20%] bg-brand/20 -rotate-1 blur-lg -z-10"></span>
            </span>
          </h1>

          <p className="relative max-w-2xl mt-8 text-base text-neutral-400 md:text-lg leading-relaxed animate-fade-in-up opacity-0" style={{ animationDelay: '300ms' }}>
            you can search a billion profiles. none of them will tell you who can actually do the job.
          </p>

          <a
            href="https://calendly.com/sparqapp/uncooked-intro"
            target="_blank"
            rel="noopener noreferrer"
            className="relative mt-10 px-8 py-4 bg-brand text-white font-bold rounded-full hover:bg-brand-hover transition-all hover:scale-105 active:scale-95 animate-fade-in-up opacity-0 text-base"
            style={{ animationDelay: '450ms' }}
          >
            find your next hire
          </a>
        </section>

        {/* What we do */}
        <section className="w-full max-w-4xl px-6 py-20">
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight text-center mb-4">
            we verify which <span className="font-serif italic">5</span> can.
          </h2>
          <p className="text-center text-neutral-500 mb-16 text-lg max-w-2xl mx-auto">
            proprietary data on how candidates actually work — agency, communication, problem-solving. tested. verified. not self-reported.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'no salary negotiations',
              'no availability back-and-forth',
              'no sponsorship surprises',
              'one click to book the interview',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 p-5 rounded-2xl bg-[#0A0A0A] border border-white/5"
              >
                <CheckCircle2 size={20} className="text-brand flex-shrink-0" />
                <span className="text-white font-medium">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* VC Partner marquee */}
        <section className="w-full max-w-5xl px-6 py-16">
          <p className="text-center text-xs text-neutral-600 uppercase tracking-widest font-semibold mb-8">
            trusted by founders backed by
          </p>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
            <div className="overflow-hidden">
              <div
                className="flex w-max animate-marquee will-change-transform"
                style={{ '--marquee-width': `${VC_PARTNERS.length * 192}px` } as React.CSSProperties}
              >
                {[0, 1, 2, 3, 4, 5].map((copy) => (
                  <div key={copy} className="flex items-center shrink-0" aria-hidden={copy > 0}>
                    {VC_PARTNERS.map((p) => (
                      <div key={p.name + '-' + copy} className="flex-shrink-0 w-48 h-16 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                        <Image
                          src={p.logo}
                          alt={p.name}
                          width={160}
                          height={64}
                          className="max-h-12 max-w-[140px] w-auto h-auto object-contain brightness-0 invert"
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
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight text-center mb-16">
            how it <span className="font-serif italic">works</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'tell us what you need',
                body: 'the role, the must-haves, the nice-to-haves. a quick call is all we need.',
              },
              {
                num: '02',
                title: 'we verify candidates',
                body: 'we send you the 5 candidates who actually match. tested on real work.',
              },
              {
                num: '03',
                title: 'book the interview',
                body: 'one click to book. no back-and-forth. ready to start within days.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="p-7 rounded-3xl bg-[#0A0A0A] border border-white/5 hover:border-brand/20 transition-all"
              >
                <div className="text-brand font-serif italic text-3xl mb-3">{step.num}</div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">{step.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final note */}
        <section className="w-full max-w-3xl px-6 py-24 text-center">
          <h2 className="text-4xl md:text-6xl font-medium text-white tracking-tight mb-6 leading-tight">
            stop scrolling <span className="font-serif italic">linkedin.</span>
          </h2>
          <p className="text-neutral-400 text-lg mb-2">
            we&apos;ll send you 5 verified candidates this week.
          </p>
          <p className="text-sm text-neutral-600">
            looking for a role instead? <a href="/" className="text-brand hover:underline">we got you →</a>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  )
}
