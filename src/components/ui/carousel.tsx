
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface CarouselProps<T> {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  className?: string
  autoSlideInterval?: number
}

export function Carousel<T>({
  items,
  renderItem,
  className,
  autoSlideInterval = 7000,
}: CarouselProps<T>) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [direction, setDirection] = React.useState(1) // 1 for next, -1 for prev

  const handleNext = React.useCallback(() => {
    setDirection(1)
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length)
  }, [items.length])

  const handlePrev = () => {
    setDirection(-1)
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length)
  }

  React.useEffect(() => {
    if (items.length <= 1 || !autoSlideInterval) return

    const slideInterval = setInterval(handleNext, autoSlideInterval)
    return () => clearInterval(slideInterval)
  }, [items.length, handleNext, autoSlideInterval])

  if (items.length === 0) {
    return null
  }

  if (items.length === 1) {
    return <>{renderItem(items[0])}</>
  }
  
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  }

  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      <div className="relative h-full">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="w-full h-full"
          >
            {renderItem(items[currentIndex])}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute -bottom-1 right-0 flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={handlePrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
       <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center space-x-2">
            {items.map((_, index) => (
                <div
                    key={index}
                    className={cn(
                        "h-1.5 w-1.5 rounded-full transition-all",
                        currentIndex === index ? "w-4 bg-primary" : "bg-muted-foreground/50"
                    )}
                />
            ))}
        </div>
    </div>
  )
}
