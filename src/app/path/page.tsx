
"use client";

import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { PlusCircle, Zap, Package, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Release } from '@/types/workout';
import { format, parseISO, differenceInDays, startOfToday } from 'date-fns';

const NODE_DIAMETER = 256; // Increased from 192 to 256
const HORIZONTAL_SPACING = 400;
const VERTICAL_SPACING = 150;
const DESCRIPTION_WIDTH = 200;
const DESCRIPTION_MARGIN = 24;

function PathPageContent() {
  const { productizationPlans, offerizationPlans, projects, coreSkills } = useAuth();

  const upcomingReleases = useMemo(() => {
    const allReleases: { topic: string, release: Release, type: 'product' | 'service' }[] = [];
    const today = startOfToday();

    const processPlan = (plan: any, topicId: string, topicName: string, type: 'product' | 'service') => {
        if (plan.releases) {
            plan.releases.forEach((release: Release) => {
                try {
                    const launchDate = parseISO(release.launchDate);
                    if (launchDate >= today) {
                        allReleases.push({ 
                            topic: topicName, 
                            release: { ...release, daysRemaining: differenceInDays(launchDate, today) },
                            type 
                        });
                    }
                } catch (e) {
                    console.error("Invalid date format for release:", release);
                }
            });
        }
    };

    if (productizationPlans) {
        Object.entries(productizationPlans).forEach(([projectId, plan]) => {
            const project = projects.find(p => p.id === projectId);
            processPlan(plan, projectId, project?.name || projectId, 'product');
        });
    }

    if (offerizationPlans) {
        Object.entries(offerizationPlans).forEach(([specId, plan]) => {
            const specialization = coreSkills.find(s => s.id === specId);
            processPlan(plan, specId, specialization?.name || specId, 'service');
        });
    }
    
    return allReleases.sort((a, b) => new Date(a.release.launchDate).getTime() - new Date(b.release.launchDate).getTime());
  }, [productizationPlans, offerizationPlans, projects, coreSkills]);

  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number; isLeft: boolean }>();
    upcomingReleases.forEach((item, index) => {
      const isLeft = index % 2 === 0;
      const x = isLeft ? HORIZONTAL_SPACING / 2 : HORIZONTAL_SPACING * 1.5;
      const y = (upcomingReleases.length - 1 - index) * VERTICAL_SPACING + NODE_DIAMETER / 2;
      positions.set(item.release.id, { x, y, isLeft });
    });
    return positions;
  }, [upcomingReleases]);
  
  const svgSize = useMemo(() => {
    const height = upcomingReleases.length * VERTICAL_SPACING + NODE_DIAMETER;
    const width = HORIZONTAL_SPACING * 2 + NODE_DIAMETER;
    return { width: Math.max(width, 800), height: Math.max(height, 600) };
  }, [upcomingReleases]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white p-8">
        <div className="flex-grow flex items-center justify-center overflow-auto relative">
        {upcomingReleases.length === 0 ? (
          <div className="text-center">
             <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-700 rounded-lg">
                <Zap className="h-16 w-16 text-yellow-400 mb-4" />
                <h2 className="text-2xl font-bold mb-2">No Upcoming Releases</h2>
                <p className="text-gray-400 mb-6 max-w-sm">Your strategic path will appear here once you add products or services with future launch dates in the Strategic Planning module.</p>
            </div>
          </div>
        ) : (
          <div className="relative" style={{ width: `${svgSize.width}px`, height: `${svgSize.height}px` }}>
            <svg width={svgSize.width} height={svgSize.height} className="absolute inset-0 overflow-visible">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto" markerUnits="strokeWidth">
                        <polygon points="0 0, 10 3.5, 0 7" fill="hsl(210 40% 96.1% / 0.5)" />
                    </marker>
                </defs>
                {/* Render Connectors */}
                {upcomingReleases.slice(0, -1).map((item, index) => {
                    const startPos = nodePositions.get(item.release.id);
                    const endPos = nodePositions.get(upcomingReleases[index + 1].release.id);

                    if (!startPos || !endPos) return null;

                    const dx = endPos.x - startPos.x;
                    const dy = endPos.y - startPos.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const offsetX = (dx / dist) * (NODE_DIAMETER / 2 + 10);
                    const offsetY = (dy / dist) * (NODE_DIAMETER / 2 + 10);

                    return (
                        <line
                            key={`line-${item.release.id}`}
                            x1={startPos.x}
                            y1={startPos.y}
                            x2={endPos.x - offsetX}
                            y2={endPos.y - offsetY}
                            stroke="hsl(210 40% 96.1% / 0.5)"
                            strokeWidth="2"
                            markerEnd="url(#arrowhead)"
                        />
                    );
                })}
            </svg>
            
            {/* Render Nodes on top of SVG */}
            {upcomingReleases.map((item) => {
              const pos = nodePositions.get(item.release.id);
              if (!pos) return null;
              
              const descriptionStyle: React.CSSProperties = {
                position: 'absolute',
                top: pos.y - NODE_DIAMETER / 2, // Align top with the node's bounding box
                width: DESCRIPTION_WIDTH,
                textAlign: pos.isLeft ? 'left' : 'right',
                left: pos.isLeft 
                  ? pos.x + NODE_DIAMETER / 2 + DESCRIPTION_MARGIN 
                  : pos.x - NODE_DIAMETER / 2 - DESCRIPTION_MARGIN - DESCRIPTION_WIDTH,
              };

              return (
                <React.Fragment key={item.release.id}>
                    <div
                      className="absolute flex items-center justify-center text-center p-4 shadow-2xl"
                      style={{
                        left: pos.x - NODE_DIAMETER / 2,
                        top: pos.y - NODE_DIAMETER / 2,
                        width: NODE_DIAMETER,
                        height: NODE_DIAMETER,
                      }}
                    >
                      <div className="relative w-full h-full bg-gray-800 border-2 border-gray-600 rounded-full flex flex-col items-center justify-center p-4">
                          <p className="text-lg font-bold leading-tight" title={item.release.name}>
                            {item.release.name}
                          </p>
                          <p className="text-sm text-gray-400 leading-tight mt-1" title={item.topic}>
                            ({item.topic})
                          </p>
                          <div className="mt-auto pt-2 text-xs text-yellow-400">
                            <p>{format(parseISO(item.release.launchDate), 'MMM d, yyyy')}</p>
                            <p>({item.release.daysRemaining} days)</p>
                          </div>
                      </div>
                    </div>
                    <div style={descriptionStyle} className="text-sm text-gray-300 py-2 h-48 flex items-center">
                        <p className="line-clamp-6">{item.release.description}</p>
                    </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PathPage() {
    return <AuthGuard><PathPageContent /></AuthGuard>
}
