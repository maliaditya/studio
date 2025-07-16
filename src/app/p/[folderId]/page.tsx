
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Folder, Link as LinkIcon, Globe, Loader2, AlertTriangle, Youtube, Expand, PictureInPicture, ChevronDown, ChevronRight, BrainCircuit } from 'lucide-react';
import type { Resource, ResourceFolder } from '@/types/workout';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Link from 'next/link';

const getFaviconUrl = (link: string): string | undefined => {
  try {
    let url = link;
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }
    const urlObject = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObject.hostname}&sz=32`;
  } catch (e) { return undefined; }
};

const getYouTubeEmbedUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        let videoId: string | null = null;
        if (urlObj.hostname.includes('youtube.com')) {
            videoId = urlObj.searchParams.get('v');
        } else if (urlObj.hostname.includes('youtu.be')) {
            videoId = urlObj.pathname.slice(1);
        }
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    } catch (e) {}
    return null;
};

const isImageUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(url);
};

const ResourceLinkCard = ({ resource }: { resource: Resource }) => {
    const { setFloatingVideoUrl } = useAuth();
    const [embedUrl, setEmbedUrl] = useState<string | null>(null);

    const youtubeEmbedUrl = getYouTubeEmbedUrl(resource.link);
    const imageEmbedUrl = isImageUrl(resource.link) ? resource.link : null;
    
    if (imageEmbedUrl) {
        return (
            <Card className="overflow-hidden h-full flex flex-col">
                <div className="aspect-video w-full bg-black relative">
                    <Image src={imageEmbedUrl} alt={resource.name} layout="fill" objectFit="contain" data-ai-hint="illustration" />
                </div>
                <CardContent className="p-3 flex-grow flex flex-col">
                    <p className="font-semibold text-sm truncate" title={resource.name}>{resource.name}</p>
                    <div className="mt-auto pt-2">
                        <Button asChild variant="secondary" size="sm" className="w-full"><a href={resource.link} target="_blank" rel="noopener noreferrer">View Full Size <ExternalLink className="ml-2 h-3 w-3"/></a></Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (youtubeEmbedUrl) {
         return (
            <>
                <Card className="overflow-hidden h-full flex flex-col">
                    <div className="aspect-video w-full bg-black"><iframe src={youtubeEmbedUrl} title={resource.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe></div>
                    <CardContent className="p-3 flex-grow flex flex-col">
                        <div className="flex items-center gap-2"><Youtube className="h-4 w-4 text-red-500"/><p className="font-semibold text-sm truncate" title={resource.name}>{resource.name}</p></div>
                        <div className="mt-auto pt-2 flex gap-2">
                             <Button variant="secondary" size="sm" className="w-full" onClick={() => setFloatingVideoUrl(resource.link!)}><PictureInPicture className="mr-2 h-3 w-3"/> Float</Button>
                             <Button asChild variant="outline" size="sm" className="w-full"><a href={resource.link} target="_blank" rel="noopener noreferrer">On YouTube <ExternalLink className="ml-2 h-3 w-3"/></a></Button>
                        </div>
                    </CardContent>
                </Card>
                <Dialog open={!!embedUrl} onOpenChange={(isOpen) => !isOpen && setEmbedUrl(null)}>
                    <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2"><div className="flex-grow min-h-0">{embedUrl && (<iframe src={embedUrl} className="w-full h-full border-0 rounded-md" title="Embedded Resource"></iframe>)}</div></DialogContent>
                </Dialog>
            </>
        )
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
                {resource.iconUrl ? <Image src={resource.iconUrl} alt="" width={16} height={16} className="flex-shrink-0" unoptimized/> : <Globe className="h-4 w-4 flex-shrink-0"/>}
                <CardTitle className="text-base truncate flex-grow" title={resource.name}>{resource.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2 flex-grow">{resource.description || 'No description provided.'}</p>
                <div className="mt-auto pt-2">
                    <Button asChild variant="secondary" size="sm" className="w-full"><a href={resource.link} target="_blank" rel="noopener noreferrer">Visit Link <ExternalLink className="ml-2 h-3 w-3"/></a></Button>
                </div>
            </CardContent>
        </Card>
    )
}

const FolderView = ({ folder, resources, childFolders }: { folder: ResourceFolder, resources: Resource[], childFolders: ResourceFolder[] }) => {
    const [collapsed, setCollapsed] = useState(false);
    const resourcesInFolder = resources.filter(r => r.folderId === folder.id);

    return (
        <div className="ml-4 pl-4 border-l">
            <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2 text-lg font-semibold hover:text-primary transition-colors w-full text-left">
                {collapsed ? <ChevronRight className="h-5 w-5"/> : <ChevronDown className="h-5 w-5"/>}
                <Folder className="h-5 w-5 text-amber-500"/>
                {folder.name}
            </button>
            {!collapsed && (
                <div className="mt-4">
                    {resourcesInFolder.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                            {resourcesInFolder.map(res => <ResourceLinkCard key={res.id} resource={res}/>)}
                        </div>
                    )}
                    {childFolders.map(child => (
                        <FolderView key={child.id} folder={child} resources={resources} childFolders={childFolders.filter(f => f.parentId === child.id)}/>
                    ))}
                </div>
            )}
        </div>
    );
};

interface SharedData {
  folder: ResourceFolder;
  resources: Resource[];
  childFolders: ResourceFolder[];
  sharedBy: string;
}

export default function SharedFolderPage() {
    const params = useParams();
    const router = useRouter();
    const folderId = params.folderId as string;

    const [data, setData] = useState<SharedData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!folderId) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/share/folder?folderId=${folderId}`);
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || 'Folder not found or an error occurred.');
                }
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [folderId]);

    const topLevelFolders = data ? [data.folder, ...data.childFolders.filter(f => f.parentId === data.folder.id)] : [];

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Loading shared resources...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)] text-center p-4">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-xl font-bold">Could not load folder</h2>
                <p className="text-muted-foreground max-w-md">{error}</p>
                <Button onClick={() => router.push('/')} className="mt-6">Go to Homepage</Button>
            </div>
        );
    }

    if (!data) return null;

    const { folder, resources, childFolders, sharedBy } = data;
    const rootResources = resources.filter(r => r.folderId === folder.id);

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
             <header className="mb-8">
                <div className="flex items-center gap-4">
                    <Folder className="h-8 w-8 text-amber-500"/>
                    <div>
                        <h1 className="text-3xl font-bold">{folder.name}</h1>
                        <p className="text-muted-foreground">A shared collection by {sharedBy}</p>
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <p>Powered by</p>
                    <a href="https://corelifeos.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-primary hover:underline">
                        <BrainCircuit className="h-4 w-4"/> LifeOS
                    </a>
                </div>
            </header>
            
            <div className="space-y-8">
                {rootResources.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {rootResources.map(res => <ResourceLinkCard key={res.id} resource={res}/>)}
                    </div>
                )}

                {childFolders.filter(f => f.parentId === folder.id).map(child => (
                    <FolderView key={child.id} folder={child} resources={resources} childFolders={childFolders.filter(f => f.parentId === child.id)}/>
                ))}
            </div>
        </div>
    );
}
