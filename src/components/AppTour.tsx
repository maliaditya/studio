
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface TourStep {
  selector: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    selector: '[data-tour="exercise-library"]',
    title: '1/6 - Exercise Library',
    content: 'This is your exercise library. You can add, edit, and delete exercises. Use the filter to find specific muscle groups.',
    position: 'right',
  },
  {
    selector: '[data-tour="workout-plans"]',
    title: '2/6 - Workout Plans',
    content: 'Switch between workout modes and click "Edit Plans" to customize the pre-populated workouts for each week.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="daily-workout"]',
    title: '3/6 - Daily Workout',
    content: 'This is your main workout area for the selected date. Exercises are auto-populated based on your plan. Add sets, track your progress, and view exercise demos on YouTube.',
    position: 'left',
  },
  {
    selector: '[data-tour="weight-goal"]',
    title: '4/6 - Goal Tracking',
    content: 'Log your body weight, set goals, and manage your diet plan here. The card provides a summary of your progress and projections.',
    position: 'top',
  },
  {
    selector: '[data-tour="heatmap"]',
    title: '5/6 - Activity Heatmap',
    content: 'Visualize your workout consistency over the past year. Click any square to jump to that day\'s workout log.',
    position: 'top',
  },
  {
    selector: '[data-tour="user-profile"]',
    title: '6/6 - Sync & Manage Data',
    content: 'Click here to log out, or sync your data to the cloud. You can also import/export your data as a JSON file for backup.',
    position: 'bottom',
  },
];

interface AppTourProps {
  onComplete: () => void;
}

export function AppTour({ onComplete }: AppTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const step = tourSteps[currentStep];

  useEffect(() => {
    if (!step || !isClient) return;

    const updatePosition = () => {
      try {
        const element = document.querySelector(step.selector);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          setTimeout(() => {
            setTargetRect(element.getBoundingClientRect());
          }, 300); // Wait for scroll to finish
        } else {
          // If element not found, try to go to the next step
          // This can happen if the component isn't mounted yet
          console.warn("Tour element not found, skipping:", step.selector);
          handleNext();
        }
      } catch (e) {
        console.error("Tour element not found:", step.selector, e);
        handleNext();
      }
    };

    updatePosition();

    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [currentStep, step, isClient]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setTargetRect(null);
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setTargetRect(null);
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isClient) return null;

  const tooltipPosition = (): React.CSSProperties => {
    if (!targetRect) return { opacity: 0 };
    
    const position = step.position || 'bottom';
    const offset = 16;
    
    switch (position) {
      case 'top':
        return { top: targetRect.top - offset, left: targetRect.left + targetRect.width / 2, transform: 'translate(-50%, -100%)' };
      case 'bottom':
        return { top: targetRect.bottom + offset, left: targetRect.left + targetRect.width / 2, transform: 'translate(-50%, 0)' };
      case 'left':
        return { top: targetRect.top + targetRect.height / 2, left: targetRect.left - offset, transform: 'translate(-100%, -50%)' };
      case 'right':
        return { top: targetRect.top + targetRect.height / 2, left: targetRect.right + offset, transform: 'translate(0, -50%)' };
      default:
        return { top: targetRect.bottom + offset, left: targetRect.left };
    }
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        style={{
             boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
        }}
        onClick={onComplete}
      />

      {/* Highlight Box */}
      <AnimatePresence>
        {targetRect && (
          <motion.div
            key={currentStep}
            initial={{
              x: targetRect.left - 8,
              y: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              opacity: 0,
            }}
            animate={{
              x: targetRect.left - 8,
              y: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              opacity: 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute rounded-lg pointer-events-none"
            style={{
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
                border: '2px dashed white'
            }}
          />
        )}
      </AnimatePresence>

      {/* Tooltip */}
       <AnimatePresence>
        {targetRect && (
            <motion.div
                key={`tooltip-${currentStep}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute z-[101] p-4 bg-background rounded-lg shadow-2xl w-80"
                style={tooltipPosition()}
            >
                <button onClick={onComplete} className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground">
                    <X size={18} />
                </button>
                <h3 className="font-bold text-lg mb-2 text-primary">{step.title}</h3>
                <p className="text-sm text-foreground">{step.content}</p>
                <div className="flex justify-between items-center mt-4">
                    <Button variant="ghost" size="sm" onClick={onComplete}>Skip Tour</Button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentStep === 0}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Button onClick={handleNext} size="sm">
                            {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
                            {currentStep < tourSteps.length -1 && <ArrowRight className="h-4 w-4 ml-2" />}
                        </Button>
                    </div>
                </div>
            </motion.div>
        )}
       </AnimatePresence>
    </div>
  );
}
