'use client'

import { motion } from 'framer-motion'
import { Bot, Crosshair, Link2, Zap, Shield, BarChart3 } from 'lucide-react'
import Image from 'next/image'

const features = [
  {
    icon: Crosshair,
    title: 'Predator Cockpit',
    description: 'High-velocity chat interface with real-time CRM, spend stats, and one-click Vault access. Turn chatters into rainmakers.',
    visual: 'cockpit',
    span: 'lg:col-span-2 lg:row-span-2',
    gradient: 'from-red-500/10 to-orange-500/10',
  },
  {
    icon: Bot,
    title: 'Alfred AI',
    description: 'Your 24/7 COO. Monitors revenue, staff, and traffic. Only pings you when it matters.',
    visual: 'alfred',
    span: 'lg:col-span-1',
    gradient: 'from-primary/10 to-green-500/10',
  },
  {
    icon: Link2,
    title: 'Smart Breakout',
    description: 'Force Instagram to open links in Safari. Recover 30% of lost revenue from in-app browsers.',
    visual: 'breakout',
    span: 'lg:col-span-1',
    gradient: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    icon: Shield,
    title: 'HR Command',
    description: 'Track shifts, clock-ins, and attendance. Get alerts when team members are late.',
    visual: 'hr',
    span: 'lg:col-span-1',
    gradient: 'from-purple-500/10 to-pink-500/10',
  },
  {
    icon: BarChart3,
    title: 'Business Intelligence',
    description: 'Advanced KPIs, funnel analysis, and conversion tracking. Know your numbers.',
    visual: 'analytics',
    span: 'lg:col-span-2',
    gradient: 'from-amber-500/10 to-yellow-500/10',
  },
  {
    icon: Zap,
    title: 'Quest Engine',
    description: 'Gamify your agency. Daily tasks, XP, streaks, and leagues for your team.',
    visual: 'quests',
    span: 'lg:col-span-1',
    gradient: 'from-green-500/10 to-emerald-500/10',
  },
]

export function FeatureBento() {
  return (
    <section id="features" className="relative py-24 bg-zinc-950 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Everything You Need.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-400">
              Nothing You Don't.
            </span>
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Built from the ground up for OnlyFans & Fanvue agencies. No bloat, no friction, just results.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`group relative ${feature.span} overflow-hidden`}
            >
              <div className="relative h-full bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300">
                {/* Gradient Glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>

                  {/* Visual Placeholder */}
                  {feature.span.includes('col-span-2') && (
                    <div className="mt-6 rounded-lg bg-zinc-800/30 border border-zinc-700/50 p-4 flex items-center justify-center h-32">
                      <span className="text-zinc-600 text-sm">
                        {feature.visual === 'cockpit' && '💬 Chat Interface Preview'}
                        {feature.visual === 'analytics' && '📊 Dashboard Charts'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Hover Shine Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="text-center mt-12"
        >
          <p className="text-zinc-500 text-sm">
            All features included in every plan. No hidden tiers.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
