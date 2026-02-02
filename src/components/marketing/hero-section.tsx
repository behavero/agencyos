'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-[128px]" />

      <div className="relative container mx-auto px-4 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">The Agency Operating System</span>
            </motion.div>

            {/* H1 */}
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              The Operating System for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-400">
                Elite OF Agencies
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-zinc-400 mb-8 max-w-2xl">
              Replace 10 tools with 1. Manage Chatters, Automate Content, and Dominate Traffic from a single Command Center.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary/90 text-black font-semibold group"
              >
                <Link href="/login">
                  Deploy Your Agency
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-zinc-700 hover:border-primary/50"
              >
                <Link href="#features">
                  See How It Works
                </Link>
              </Button>
            </div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-sm text-zinc-500"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center">
                      <span className="text-xs">👤</span>
                    </div>
                  ))}
                </div>
                <span>Trusted by 50+ agencies</span>
              </div>
              <div className="h-4 w-px bg-zinc-800" />
              <div>⚡ Deploy in 5 minutes</div>
            </motion.div>
          </motion.div>

          {/* Right: Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20, rotateY: -15 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            {/* 3D Tilted Dashboard */}
            <div
              className="relative transform rotate-y-[-5deg] rotate-x-[5deg]"
              style={{
                perspective: '1000px',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-green-500/20 blur-3xl" />
              
              {/* Dashboard Card */}
              <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                {/* Top Bar */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs text-zinc-500">OnyxOS Command Center</span>
                </div>

                {/* Dashboard Content */}
                <div className="p-6 space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Revenue', value: '$12,450', trend: '+12%' },
                      { label: 'Active Fans', value: '1,234', trend: '+8%' },
                      { label: 'CTR', value: '37%', trend: '+5%' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-zinc-800/50 p-3 rounded-lg">
                        <p className="text-xs text-zinc-500">{stat.label}</p>
                        <p className="text-lg font-bold text-white">{stat.value}</p>
                        <p className="text-xs text-green-400">{stat.trend}</p>
                      </div>
                    ))}
                  </div>

                  {/* Chart Placeholder */}
                  <div className="bg-zinc-800/30 h-32 rounded-lg flex items-end justify-around p-2">
                    {[40, 70, 45, 85, 60, 95, 75].map((height, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                        className="w-8 bg-gradient-to-t from-primary to-green-400 rounded-t"
                      />
                    ))}
                  </div>

                  {/* Activity Feed */}
                  <div className="space-y-2">
                    {['New subscriber: @username', 'PPV unlocked: $25.99', 'Alfred Alert: Revenue target hit'].map((activity, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1 + i * 0.15 }}
                        className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-800/30 p-2 rounded"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {activity}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, repeat: Infinity, duration: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-zinc-700 rounded-full flex justify-center p-2">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 bg-primary rounded-full"
          />
        </div>
      </motion.div>
    </section>
  )
}
