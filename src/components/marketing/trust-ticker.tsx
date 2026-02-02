'use client'

import { motion } from 'framer-motion'

const agencies = [
  'Luna Management',
  'Nova Agency',
  'Apex Models',
  'Elite Creators',
  'Diamond Agency',
  'Platinum Partners',
  'Royal Management',
  'Crown Creators',
]

export function TrustTicker() {
  return (
    <section className="relative py-16 bg-zinc-950 overflow-hidden border-y border-zinc-900">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <p className="text-sm text-zinc-500 uppercase tracking-wider">
            Trusted by Elite Agencies Worldwide
          </p>
        </motion.div>

        {/* Infinite Scroll */}
        <div className="relative">
          {/* Gradient Masks */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-zinc-950 to-transparent z-10" />

          {/* Scrolling Content */}
          <div className="flex overflow-hidden">
            <motion.div
              animate={{
                x: [0, -1920],
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: 'loop',
                  duration: 20,
                  ease: 'linear',
                },
              }}
              className="flex gap-12 items-center"
            >
              {/* Duplicate twice for seamless loop */}
              {[...agencies, ...agencies, ...agencies].map((agency, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 px-8 py-4 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg"
                >
                  <span className="text-zinc-400 font-medium whitespace-nowrap">
                    {agency}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          {[
            { value: '50+', label: 'Agencies' },
            { value: '200+', label: 'Models Managed' },
            { value: '$2M+', label: 'Revenue Tracked' },
            { value: '99.9%', label: 'Uptime' },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-zinc-500">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
