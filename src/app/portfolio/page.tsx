
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Github, ArrowRight, Briefcase, Package, User } from 'lucide-react';
import type { Project, Release } from '@/types/workout';

function PortfolioPageContent() {
    const { 
        currentUser,
        purposeData,
        projects,
        offerizationPlans,
        microSkillMap,
    } = useAuth();

    const portfolioProjects = useMemo(() => {
        const portfolioItems: (Project & { release: Release })[] = [];
        (projects || []).forEach(project => {
            const plan = offerizationPlans[project.domainId]; // This might not be right, need to check how projects are linked
            const projectReleases = (project.releases || []).filter(r => r.addToPortfolio);
            
            projectReleases.forEach(release => {
                portfolioItems.push({ ...project, release });
            });
        });
        return portfolioItems.sort((a,b) => new Date(b.release.launchDate).getTime() - new Date(a.release.launchDate).getTime());
    }, [projects, offerizationPlans]);

    const definedOffers = useMemo(() => {
        return Object.values(offerizationPlans || {}).flatMap(plan => plan.offers || []);
    }, [offerizationPlans]);

    const getMicroSkillsForRelease = (release: Release): string[] => {
        if (!release.focusAreaIds) return [];
        return release.focusAreaIds
            .map(id => microSkillMap.get(id)?.microSkillName)
            .filter((name): name is string => !!name);
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.15),_transparent_45%),radial-gradient(circle_at_20%_20%,_rgba(16,185,129,0.12),_transparent_40%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.12),_transparent_40%),linear-gradient(180deg,_rgba(15,15,16,0.98),_rgba(9,9,10,0.98))]">
            <div className="container mx-auto px-4 pb-20 pt-10 sm:px-6 lg:px-10">
                <header className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.04] p-8 text-center shadow-[0_25px_120px_rgba(0,0,0,0.45)] sm:p-10">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_55%)]" />
                    <div className="relative">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-lg">
                            <User className="h-7 w-7 text-white/80" />
                        </div>
                        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                            {currentUser?.username || "A Digital Craftsman"}
                        </h1>
                        <p className="mt-4 text-sm leading-relaxed text-white/60 sm:text-base">
                            {purposeData?.statement || "Building tools and systems to enhance human capability."}
                        </p>
                    </div>
                </header>

                <section id="projects" className="mt-12">
                    <div className="mb-6 flex items-center justify-center gap-3 text-white">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                            <Briefcase className="h-5 w-5 text-white/80" />
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight">Portfolio Projects</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {portfolioProjects.length > 0 ? portfolioProjects.map(proj => (
                            <Card key={proj.release.id} className="flex flex-col border border-white/10 bg-white/[0.03] text-white shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
                                <CardHeader className="space-y-2">
                                    <CardTitle className="text-xl text-white">{proj.release.name}</CardTitle>
                                    <CardDescription className="text-white/60">{proj.release.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Technologies Used</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {getMicroSkillsForRelease(proj.release).length > 0 ? (
                                            getMicroSkillsForRelease(proj.release).map(skill => (
                                                <Badge key={skill} variant="outline" className="border-white/15 bg-white/5 text-white/70">
                                                    {skill}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-sm text-white/40">No skills linked yet.</span>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2">
                                    {proj.release.githubLink && (
                                        <Button asChild variant="outline" size="sm" className="border-white/20 text-white/80 hover:text-white">
                                            <a href={proj.release.githubLink} target="_blank" rel="noopener noreferrer">
                                                <Github className="mr-2 h-4 w-4" /> GitHub
                                            </a>
                                        </Button>
                                    )}
                                    {proj.release.demoLink && (
                                        <Button asChild size="sm" className="bg-white text-black hover:bg-white/90">
                                            <a href={proj.release.demoLink} target="_blank" rel="noopener noreferrer">
                                                Live Demo <Globe className="ml-2 h-4 w-4" />
                                            </a>
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        )) : (
                            <div className="col-span-full rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-white/50">
                                No projects marked for portfolio yet.
                            </div>
                        )}
                    </div>
                </section>

                <section id="offerings" className="mt-12">
                    <div className="mb-6 flex items-center justify-center gap-3 text-white">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                            <Package className="h-5 w-5 text-white/80" />
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight">Services & Offers</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {definedOffers.length > 0 ? definedOffers.map(offer => (
                            <Card key={offer.id} className="flex h-full flex-col border border-white/10 bg-white/[0.03] text-white shadow-[0_18px_60px_rgba(0,0,0,0.32)]">
                                <CardHeader className="space-y-2">
                                    <CardTitle className="text-lg text-white">{offer.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-4 text-white/70">
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Outcome</h4>
                                        <p className="mt-1 text-sm">{offer.outcome}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Ideal For</h4>
                                        <p className="mt-1 text-sm">{offer.audience}</p>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/20">
                                        Learn More <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        )) : (
                            <div className="col-span-full rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-white/50">
                                No service offers defined yet.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}


export default function PortfolioPage() {
    return (
        <AuthGuard>
            <PortfolioPageContent />
        </AuthGuard>
    );
}
