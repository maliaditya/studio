
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';

function CodeOfConductPageContent() {
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Shield className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle className="text-2xl">Code of Conduct</CardTitle>
                            <CardDescription>Our pledge to maintain a respectful and harassment-free community.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 text-muted-foreground">
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-2">Our Pledge</h2>
                        <p>
                            We, as members, contributors, and leaders, pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.
                        </p>
                    </section>
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-2">Our Standards</h2>
                        <p>Examples of behavior that contributes to a positive environment include:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Demonstrating empathy and kindness toward other people</li>
                            <li>Being respectful of differing opinions, viewpoints, and experiences</li>
                            <li>Giving and gracefully accepting constructive feedback</li>
                            <li>Accepting responsibility and apologizing to those affected by our mistakes</li>
                            <li>Focusing on what is best not just for us as individuals, but for the overall community</li>
                        </ul>
                        <p className="mt-4">Examples of unacceptable behavior include:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>The use of sexualized language or imagery, and sexual attention or advances of any kind</li>
                            <li>Trolling, insulting or derogatory comments, and personal or political attacks</li>
                            <li>Public or private harassment</li>
                            <li>Publishing others' private information, such as a physical or email address, without their explicit permission</li>
                            <li>Other conduct which could reasonably be considered inappropriate in a professional setting</li>
                        </ul>
                    </section>
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-2">Enforcement</h2>
                        <p>
                            Community leaders are responsible for clarifying and enforcing our standards and will take appropriate and fair corrective action in response to any behavior that they deem inappropriate, threatening, offensive, or harmful.
                        </p>
                    </section>
                </CardContent>
            </Card>
        </div>
    );
}


export default function CodeOfConductPage() {
    return (
        <AuthGuard>
            <CodeOfConductPageContent />
        </AuthGuard>
    );
}

    