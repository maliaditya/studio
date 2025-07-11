
"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface BreathingAnimationProps {
  onComplete: () => void
}

const segmentDurations = {
  basic: 8 * 6 * 1000, // 6 cycles of 8s
  box: 16 * 4 * 1000,    // 4 cycles of 16s
  humming: 10 * 5 * 1000, // 5 cycles of 10s
}

export function BreathingAnimation({ onComplete }: BreathingAnimationProps) {
  const [segment, setSegment] = useState<"basic" | "box" | "humming">("basic")

  useEffect(() => {
    const basicTimer = setTimeout(() => {
      setSegment("box")
    }, segmentDurations.basic)

    const boxTimer = setTimeout(() => {
      setSegment("humming")
    }, segmentDurations.basic + segmentDurations.box)

    const hummingTimer = setTimeout(() => {
      onComplete()
    }, segmentDurations.basic + segmentDurations.box + segmentDurations.humming)

    return () => {
      clearTimeout(basicTimer)
      clearTimeout(boxTimer)
      clearTimeout(hummingTimer)
    }
  }, [onComplete])

  const renderSegment = () => {
    switch (segment) {
      case "basic":
        return <BasicBreath />
      case "box":
        return <BoxBreath />
      case "humming":
        return <HummingBreath />
      default:
        return null
    }
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={segment}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          {renderSegment()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const BasicBreath = () => (
  <div className="w-full h-full bg-gradient-to-b from-blue-200 to-purple-200 dark:from-sky-900 dark:to-indigo-900 flex items-center justify-center">
    <div className="relative w-48 h-48">
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg"
        animate={{ y: ["4rem", "10rem", "4rem"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <AnimatePresence>
        <motion.div
          key="inhale"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 4 }}
          className="absolute top-0 left-0 right-0 text-center text-white/80 font-medium"
        >
          Inhale
        </motion.div>
        <motion.div
          key="exhale"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute bottom-0 left-0 right-0 text-center text-white/80 font-medium"
        >
          Exhale
        </motion.div>
      </AnimatePresence>
    </div>
  </div>
)

const BoxBreath = () => (
  <div className="w-full h-full bg-gradient-to-b from-blue-200 to-purple-200 dark:from-sky-900 dark:to-indigo-900 flex items-center justify-center">
    <div className="relative w-48 h-48">
      <div className="absolute inset-0 border-2 border-white/20 rounded-lg" />
      <motion.div
        className="absolute top-0 left-0 w-4 h-4 bg-white rounded-full shadow-lg"
        style={{ x: '50%', y: '50%', translateX: '-50%', translateY: '-50%' }}
        animate={{
          x: ['0rem', '11rem', '11rem', '0rem', '0rem'],
          y: ['0rem', '0rem', '11rem', '11rem', '0rem'],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute -top-6 left-0 right-0 text-center text-white/80 font-medium">Inhale</div>
      <div className="absolute top-1/2 -right-6 -translate-y-1/2 text-center text-white/80 font-medium rotate-90">Hold</div>
      <div className="absolute -bottom-6 left-0 right-0 text-center text-white/80 font-medium">Exhale</div>
      <div className="absolute top-1/2 -left-6 -translate-y-1/2 text-center text-white/80 font-medium -rotate-90">Hold</div>
    </div>
  </div>
)

const HummingBreath = () => (
    <div className="w-full h-full bg-gradient-to-b from-orange-200 to-amber-200 dark:from-orange-900 dark:to-yellow-900 flex items-center justify-center">
      <div className="relative w-48 h-48">
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg"
          animate={{ y: ["4rem", "10rem", "4rem"] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Ripples */}
         <motion.div
          className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full border-2 border-white/50"
          style={{ x: '-50%', y: '3.5rem' }}
          animate={{ scale: [1, 20], opacity: [1, 0, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeOut", delay: 5, repeatDelay: 5 }}
        />
         <motion.div
          className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full border border-white/30"
          style={{ x: '-50%', y: '3.5rem' }}
          animate={{ scale: [1, 20], opacity: [1, 0, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeOut", delay: 5.5, repeatDelay: 5 }}
        />

        <AnimatePresence>
          <motion.div
            key="inhale-hum"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 5, repeat: Infinity, repeatDelay: 5 }}
            className="absolute top-0 left-0 right-0 text-center text-white/80 font-medium"
          >
            Inhale
          </motion.div>
          <motion.div
            key="exhale-hum"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute bottom-0 left-0 right-0 text-center text-white/80 font-medium"
          >
            Exhale (Hum...)
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
