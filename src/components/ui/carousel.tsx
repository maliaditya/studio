"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "./button"

interface CarouselProps<T> {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  className?: string
}

export function Carousel<T>({
  items,
  renderItem,
  className,
}: CarouselProps<T>) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [containerHeight, setContainerHeight] = React.useState<number | "auto">("auto")

  // Refs for each item to measure height
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([])
  React.useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length)
  }, [items])

  // Measure and set container height when index changes
  React.useLayoutEffect(() => {
    const currentItem = itemRefs.current[currentIndex]
    if (currentItem) {
      setContainerHeight(currentItem.offsetHeight)
    }
  }, [currentIndex, items])

  const handleNext = React.useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length)
  }, [items.length])

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length)
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative w-full", className)}>
      <motion.div
        className="relative overflow-hidden"
        animate={{ height: containerHeight || "auto" }}
        transition={{ type: "spring", stiffness: 400, damping: 50 }}
      >
        <motion.div
          className="flex"
          animate={{ x: `-${currentIndex * 100}%` }}
          transition={{ type: "spring", stiffness: 400, damping: 50 }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              ref={(el) => (itemRefs.current[index] = el)}
              className="w-full flex-shrink-0"
              aria-hidden={currentIndex !== index}
            >
              {renderItem(item)}
            </div>
          ))}
        </motion.div>
      </motion.div>

      {items.length > 1 && (
        <>
          <div className="absolute -bottom-1 right-0 flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous slide</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next slide</span>
            </Button>
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center space-x-2">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-all",
                  currentIndex === index ? "w-4 bg-primary" : "bg-muted-foreground/50 hover:bg-muted-foreground"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
