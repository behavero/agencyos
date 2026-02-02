'use client'

import { motion } from 'framer-motion'
import { Check, X, Minus } from 'lucide-react'

const features = [
  { name: 'AI Chat Automation', onyx: true, sheets: false, substy: true },
  { name: 'Advanced CRM', onyx: true, sheets: false, substy: true },
  { name: 'Smart Link Breakout', onyx: true, sheets: false, substy: false },
  { name: 'HR & Shift Management', onyx: true, sheets: false, substy: false },
  { name: 'Content Calendar', onyx: true, sheets: 'partial', substy: 'partial' },
  { name: 'Real-Time Analytics', onyx: true, sheets: false, substy: true },
  { name: 'Alfred AI Assistant', onyx: true, sheets: false, substy: false },
  { name: 'Telegram Integration', onyx: true, sheets: false, substy: false },
  { name: 'Ghost Tracker (Competitors)', onyx: true, sheets: false, substy: false },
  { name: 'Quest/Gamification System', onyx: true, sheets: false, substy: false },
  { name: 'Multi-Platform Support', onyx: true, sheets: true, substy: true },
  { name: 'Self-Hosted Option', onyx: true, sheets: true, substy: false },
]

const FeatureIcon = ({ value }: { value: boolean | string }) => {
  if (value === true) {
    return (
      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
        <Check className="w-4 h-4 text-green-500" />
      </div>
    )
  }
  if (value === false) {
    return (
      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
        <X className="w-4 h-4 text-red-500" />
      </div>
    )
  }
  return (
    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
      <Minus className="w-4 h-4 text-amber-500" />
    </div>
  )
}

export function ComparisonTable() {
  return (
    <section className="relative py-24 bg-zinc-900 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Why Agencies Choose{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-400">
              OnyxOS
            </span>
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            The only platform built specifically for agency operations, not just chat automation.
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          <div className="bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 p-6 border-b border-zinc-800 bg-zinc-900/50">
              <div className="text-zinc-500 font-medium text-sm">Feature</div>
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
                  <span className="text-primary font-bold text-sm">OnyxOS</span>
                </div>
              </div>
              <div className="text-center text-zinc-400 font-medium text-sm">Spreadsheets</div>
              <div className="text-center text-zinc-400 font-medium text-sm">Substy</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-zinc-800/50">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="grid grid-cols-4 gap-4 p-6 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="text-white text-sm">{feature.name}</div>
                  <div className="flex justify-center">
                    <FeatureIcon value={feature.onyx} />
                  </div>
                  <div className="flex justify-center">
                    <FeatureIcon value={feature.sheets} />
                  </div>
                  <div className="flex justify-center">
                    <FeatureIcon value={feature.substy} />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Table Footer */}
            <div className="p-6 bg-zinc-900/50 border-t border-zinc-800">
              <div className="text-center text-zinc-500 text-sm">
                <span className="text-primary font-medium">OnyxOS</span> combines the automation of Substy with the complete operational control you need to scale.
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
        >
          {[
            { value: '10x', label: 'Faster Operations' },
            { value: '30%', label: 'Revenue Recovery' },
            { value: '1', label: 'Platform to Rule All' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-400 mb-2">
                {stat.value}
              </div>
              <div className="text-zinc-400">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
