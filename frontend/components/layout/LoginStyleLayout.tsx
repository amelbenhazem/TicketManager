'use client'

import Image from 'next/image'
import { ReactNode } from 'react'

const BG_IMAGES = [
  'https://www.rfc.com.tn/assets/images/automatisez.png',
  'https://www.rfc.com.tn/assets/images/home-bg-3.jpg',
  'https://www.rfc.com.tn/assets/images/home-bg-4.jpg',
]

type LoginStyleLayoutProps = {
  children: ReactNode
  bgIndex?: number
}

export function LoginStyleLayout({ children, bgIndex = 0 }: LoginStyleLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {BG_IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-[2500ms] ease-in-out"
          style={{ opacity: bgIndex === i ? 1 : 0 }}
        >
          <Image
            src={src}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            style={{
              animation:
                bgIndex === i
                  ? 'kenburns 18s ease-in-out infinite alternate'
                  : 'none',
            }}
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628]/85 via-[#0A1628]/75 to-[#0047B3]/60" />

      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {[
          { cx: '12%', cy: '20%', r: 2, dur: '6s' },
          { cx: '85%', cy: '15%', r: 1.5, dur: '8s' },
          { cx: '70%', cy: '75%', r: 2, dur: '7s' },
          { cx: '25%', cy: '80%', r: 1.5, dur: '9s' },
          { cx: '50%', cy: '10%', r: 1, dur: '5s' },
          { cx: '90%', cy: '50%', r: 1.5, dur: '7.5s' },
        ].map((p, i) => (
          <circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill="white"
            opacity="0.15"
          >
            <animate
              attributeName="opacity"
              values="0.08;0.2;0.08"
              dur={p.dur}
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values={`${p.cy};${parseFloat(p.cy) - 2}%;${p.cy}`}
              dur={p.dur}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>

      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </div>
  )
}
