
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Github, ArrowRight, BrainCircuit, Briefcase, Package, User } from 'lucide-react';
import type { CoreSkill, Project, Offer, Release } from '@/types/workout';

function PortfolioPageContent() {
    const { 
        currentUser,
        purposeData,
        coreSkills,
        projects,
        offerizationPlans,
        microSkillMap,
    } = useAuth();

    const specializations = useMemo(() => {
        return coreSkills.filter(skill => skill.type === 'Specialization');
    }, [coreSkills]);

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
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-16">
            {/* Hero Section */}
            <header className="text-center py-16">
                <div className="inline-block p-4 rounded-full bg-primary/10 mb-4">
                    <User className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                    {currentUser?.username || "A Digital Craftsman"}
                </h1>
                <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                    {purposeData?.statement || "Building tools and systems to enhance human capability."}
                </p>
            </header>

            {/* Specializations Section */}
            <section id="specializations">
                <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-3">
                    <BrainCircuit className="h-8 w-8 text-primary" />
                    Specializations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {specializations.map(spec => (
                        <Card key={spec.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{spec.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <ul className="space-y-2">
                                    {spec.skillAreas.map(area => (
                                        <li key={area.id}>
                                            <p className="font-semibold text-sm">{area.name}</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {area.microSkills.map(ms => (
                                                    <Badge key={ms.id} variant="secondary">{ms.name}</Badge>
                                                ))}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Portfolio Projects Section */}
            <section id="projects">
                <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-3">
                    <Briefcase className="h-8 w-8 text-primary" />
                    Portfolio Projects
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {portfolioProjects.length > 0 ? portfolioProjects.map(proj => (
                        <Card key={proj.release.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{proj.release.name}</CardTitle>
                                <CardDescription>{proj.release.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm font-semibold mb-2">Technologies Used:</p>
                                <div className="flex flex-wrap gap-2">
                                    {getMicroSkillsForRelease(proj.release).map(skill => (
                                        <Badge key={skill} variant="outline">{skill}</Badge>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                {proj.release.githubLink && (
                                    <Button asChild variant="outline" size="sm">
                                        <a href={proj.release.githubLink} target="_blank" rel="noopener noreferrer">
                                            <Github className="mr-2 h-4 w-4" /> GitHub
                                        </a>
                                    </Button>
                                )}
                                {proj.release.demoLink && (
                                    <Button asChild size="sm">
                                        <a href={proj.release.demoLink} target="_blank" rel="noopener noreferrer">
                                            Live Demo <Globe className="ml-2 h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    )) : (
                        <p className="text-center text-muted-foreground md:col-span-2">No projects marked for portfolio yet.</p>
                    )}
                </div>
            </section>

            {/* Offerings Section */}
            <section id="offerings">
                <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-3">
                    <Package className="h-8 w-8 text-primary" />
                    Services & Offers
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {definedOffers.length > 0 ? definedOffers.map(offer => (
                        <Card key={offer.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{offer.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div>
                                    <h4 className="font-semibold text-sm">Outcome</h4>
                                    <p className="text-sm text-muted-foreground">{offer.outcome}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">Ideal For</h4>
                                    <p className="text-sm text-muted-foreground">{offer.audience}</p>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button variant="secondary" className="w-full">
                                    Learn More <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    )) : (
                        <p className="text-center text-muted-foreground lg:col-span-3">No service offers defined yet.</p>
                    )}
                </div>
            </section>
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
