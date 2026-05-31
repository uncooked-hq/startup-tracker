'use client'

import Image from 'next/image'
import { useRef, useCallback } from 'react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'

// Events theme color (matches uncookedjobs.com live site)
const EVENTS_COLOR = '#4717A6'

const PHOTOS = [
  { src: '/events/panel.jpg',   alt: 'Panel discussion at Uncooked Labs',   span: 'col-span-2 aspect-[16/9]' },
  { src: '/events/crowd-1.jpg', alt: 'Attendees at Uncooked Labs',          span: 'col-span-1 aspect-[3/4]' },
  { src: '/events/crowd-2.jpg', alt: 'Networking at Uncooked Labs',         span: 'col-span-1 aspect-[3/4]' },
  { src: '/events/selfie.jpg',  alt: 'Community at Uncooked Labs',          span: 'col-span-2 aspect-[16/9]' },
]

const STATS = [
  { value: '840+', label: 'attendees' },
  { value: '10',   label: 'speakers' },
  { value: '4',    label: 'events' },
  { value: '100%', label: 'sold out' },
]

type Testimonial = {
  src: string        // path to screenshot in /public (e.g. /events/testimonials/1.png)
  alt: string        // for accessibility
  url: string        // link to original tweet / post
}

// Screenshots live in /public/events/. URLs link to the original LinkedIn posts.
const TESTIMONIALS: Testimonial[] = [
  { src: '/events/1.png', alt: 'Alexis Kusikwenyu — LinkedIn post about Uncooked Labs', url: 'https://www.linkedin.com/posts/alexis-kusikwenyu-47b81925a_ai-robotics-innovation-activity-7404830789684580352-fqBu' },
  { src: '/events/2.png', alt: 'Jaehyung Andrew Choi — LinkedIn post about Uncooked Labs', url: 'https://www.linkedin.com/posts/jaehyung-andrew-choi_claudepartner-claude-ai-ugcPost-7437517650634629120-G7O_' },
  { src: '/events/3.png', alt: 'Rex Heng — LinkedIn post about Uncooked Labs',          url: 'https://www.linkedin.com/posts/rexheng_the-lads-and-i-built-too-good-to-go-but-r2r-ugcPost-7449521426044252161-k2EZ' },
  { src: '/events/4.png', alt: 'Patrick Belinga — LinkedIn post about Uncooked Labs',    url: 'https://www.linkedin.com/posts/patrickbelinga_hackathon-hedera-ai-activity-7449789663839555585-Ma23' },
]

// Native dimensions so each card can size its image area by aspect ratio.
const NATIVE_DIMENSIONS: Record<string, { w: number; h: number }> = {
  '/events/1.png': { w: 573, h: 738 },
  '/events/2.png': { w: 571, h: 620 },
  '/events/3.png': { w: 575, h: 761 },
  '/events/4.png': { w: 571, h: 636 },
}

const IMG_HEIGHT = 540 // px — uniform image area height (header sits above)

function LinkedInIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.601 0 4.266 2.37 4.266 5.455v6.288zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function TestimonialCard({ t }: { t: Testimonial }) {
  const dim = NATIVE_DIMENSIONS[t.src]
  const imgWidth = dim ? Math.round((dim.w / dim.h) * IMG_HEIGHT) : 360
  return (
    <a
      href={t.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ width: `${imgWidth}px` }}
      className="shrink-0 rounded-[10px] border border-white/20 bg-[#0d0d0d] overflow-hidden hover:border-white/30 transition-colors p-2 flex flex-col"
    >
      {/* Header bar: platform icon only */}
      <div className="flex items-center px-1 pb-2 text-white/70">
        <LinkedInIcon size={14} />
      </div>
      {/* Image */}
      <div
        className="relative rounded-[8px] overflow-hidden"
        style={{ height: `${IMG_HEIGHT}px` }}
      >
        <Image
          src={t.src}
          alt={t.alt}
          fill
          className="object-cover"
          sizes={`${imgWidth}px`}
          unoptimized
        />
      </div>
    </a>
  )
}

function TestimonialsMarquee() {
  const marqueeRef = useRef<HTMLDivElement>(null)
  const handleHover = useCallback((hovering: boolean) => {
    marqueeRef.current?.classList.toggle('paused', hovering)
  }, [])

  return (
    <section className="w-full max-w-6xl px-6 py-16 animate-fade-in-up opacity-0" style={{ animationDelay: '800ms' }}>
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white">
          <span className="font-serif italic">what people</span> said
        </h2>
        <p className="text-sm text-neutral-500 mt-1">tweets and posts from attendees</p>
      </div>

      {/* Marquee — same pattern as Hero.tsx source carousel */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

        <div className="overflow-hidden">
          <div
            ref={marqueeRef}
            className="flex w-max animate-marquee will-change-transform"
            style={{ '--marquee-duration': '60s' } as React.CSSProperties}
            onMouseEnter={() => handleHover(true)}
            onMouseLeave={() => handleHover(false)}
          >
            {/* Rendered twice so the 50% translate keyframe produces a seamless loop */}
            <div className="flex items-center gap-4 pr-4">
              {TESTIMONIALS.map((t, i) => <TestimonialCard key={`a-${i}`} t={t} />)}
            </div>
            <div className="flex items-center gap-4 pr-4">
              {TESTIMONIALS.map((t, i) => <TestimonialCard key={`b-${i}`} t={t} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-brand selection:text-white">
      <Navbar />

      <main className="flex flex-col items-center w-full">
        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center px-6 text-center pt-36 pb-12 overflow-hidden w-full">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] blur-[160px] rounded-full pointer-events-none animate-pulse-slow"
            style={{ backgroundColor: EVENTS_COLOR, opacity: 0.04 }}
          />
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black via-black/90 to-transparent" />

          <h1 className="relative text-5xl md:text-7xl font-medium tracking-tighter text-white leading-tight animate-fade-in-up opacity-0" style={{ animationDelay: '0ms' }}>
            <span className="font-serif italic">Events</span>
          </h1>

          <div className="relative max-w-2xl mt-10 space-y-6 animate-fade-in-up opacity-0" style={{ animationDelay: '200ms' }}>
            <p className="text-neutral-400 text-base md:text-lg leading-relaxed">
              every city has communities for software people. accelerators. demo days. twitter circles.
            </p>
            <p className="text-neutral-300 text-base md:text-lg leading-relaxed">
              we built <span className="font-bold text-white">uncooked labs</span> for everyone else. the people building robots. engineering systems. launching rockets. and everything in between.
            </p>
            <p className="text-neutral-300 text-base md:text-lg leading-relaxed">
              our first event sold out in days at <span className="text-white font-semibold">King&apos;s College London</span>. every event since has done the same. <span className="text-white">Barclays Eagle Labs</span>. <span className="text-white">Cambridge</span>. <span className="text-white">LSE</span>.
            </p>
            <p className="text-neutral-300 text-base md:text-lg leading-relaxed">
              our community has heard from founders, operators, and researchers at <span className="text-white">Shadow Robot</span>. <span className="text-white">ARIA</span>. <span className="text-white">Unitree</span>. <span className="text-white">Dyson</span>. <span className="text-white">Humanoid AI</span>. <span className="text-white">UBYX</span>. <span className="text-white">LSE</span>. <span className="text-white">Artificial Society (YC)</span>.
            </p>
            <p className="text-neutral-300 text-base md:text-lg leading-relaxed">
              exclusive partnerships with the UK&apos;s biggest events. discounted tickets to <span className="text-white font-semibold">Muslim Tech Fest</span>, one of the largest tech conferences in the country. more on the way.
            </p>
            <p className="text-neutral-400 text-base md:text-lg leading-relaxed">
              we partner with some of the best founders, startups, and communities in the UK and beyond to bring our community into the best rooms.
            </p>
          </div>
        </section>

        {/* Stats strip */}
        <section className="w-full max-w-4xl px-6 pb-12 animate-fade-in-up opacity-0" style={{ animationDelay: '350ms' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
            {STATS.map((s) => (
              <div key={s.label} className="bg-[#0A0A0A] py-5 px-4 text-center">
                <div className="text-xl md:text-2xl font-medium text-white tracking-tight">{s.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-neutral-500 mt-1 font-bold">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Photo mosaic */}
        <section className="w-full max-w-5xl px-6 pb-4 animate-fade-in-up opacity-0" style={{ animationDelay: '500ms' }}>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {PHOTOS.map((photo) => (
              <div
                key={photo.src}
                className={`relative overflow-hidden rounded-xl ${photo.span}`}
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 90vw, 600px"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="w-full flex justify-center py-12 animate-fade-in-up opacity-0" style={{ animationDelay: '650ms' }}>
          <a
            href="https://lu.ma/uncookedjobs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 text-white text-sm font-semibold rounded-full transition-colors"
            style={{ backgroundColor: EVENTS_COLOR }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3B1388' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = EVENTS_COLOR }}
          >
            All Events
          </a>
        </section>

        {/* Testimonials marquee */}
        <TestimonialsMarquee />
      </main>

      <Footer />
    </div>
  )
}
