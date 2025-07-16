

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Folder, Link as LinkIcon, Globe, Loader2, AlertTriangle, Youtube, Expand, ChevronDown, BrainCircuit, Library, MessageSquare, Code, ArrowRight } from 'lucide-react';
import type { Resource, ResourceFolder } from '@/types/workout';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    const [embedUrl, setEmbedUrl] = useState<string | null>(null);

    const youtubeEmbedUrl = getYouTubeEmbedUrl(resource.link);
    const imageEmbedUrl = isImageUrl(resource.link) ? resource.link : null;
    const hasMarkdownContent = resource.type === 'card' && (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');
    
    if (resource.type === 'card') {
        return (
            <Card className="flex flex-col rounded-xl group overflow-hidden transition-all duration-300 hover:shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg">
                        <span className="text-primary"><Library className="h-5 w-5" /></span>
                        <span className="truncate">{resource.name}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex-grow min-h-0">
                  <div className={cn(hasMarkdownContent ? 'h-[650px]' : '')}>
                    <ScrollArea className="h-full">
                        <div>
                            <ul className="space-y-3">
                                {(resource.points || []).map((point) => (
                                    <li key={point.id} className="flex items-start gap-3 text-sm text-muted-foreground">
                                        {point.type === 'code' ? <Code className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> :
                                        point.type === 'markdown' ? <MessageSquare className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> :
                                        <ArrowRight className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" />
                                        }
                                        {point.type === 'card' && point.resourceId ? (
                                            <span className="font-medium text-primary">{point.text}</span>
                                        ) : point.type === 'markdown' ? (
                                            <div className="w-full prose dark:prose-invert prose-sm">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{point.text || ""}</ReactMarkdown>
                                            </div>
                                        ) : point.type === 'code' ? (
                                            <pre className="w-full bg-muted/50 p-2 rounded-md text-xs font-mono text-foreground whitespace-pre-wrap break-words">{point.text}</pre>
                                        ) : (
                                            <span className="break-words w-full" title={point.text}>{point.text}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </ScrollArea>
                  </div>
                </CardContent>
            </Card>
        );
    }

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
                             <Button asChild variant="outline" size="sm" className="w-full"><a href={resource.link} target="_blank" rel="noopener noreferrer">On YouTube <ExternalLink className="ml-2 h-3 w-3"/></a></Button>
                             <Button variant="secondary" size="sm" className="w-full" onClick={() => setEmbedUrl(youtubeEmbedUrl)}><Expand className="mr-2 h-3 w-3"/>Expand</Button>
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
    
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folderId);
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!folderId) return;

        setSelectedFolderId(folderId);
        
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

    const toggleFolderCollapse = useCallback((id: string) => {
      setCollapsedFolders(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
          return newSet;
      });
    }, []);

    const renderSidebarFolders = useCallback((currentFolder: ResourceFolder, allChildFolders: ResourceFolder[], level: number): JSX.Element => {
      const children = allChildFolders.filter(f => f.parentId === currentFolder.id).sort((a,b) => a.name.localeCompare(b.name));
      const isCollapsed = collapsedFolders.has(currentFolder.id);

      return (
        <li key={currentFolder.id}>
            <div 
                onClick={() => { setSelectedFolderId(currentFolder.id); if (children.length > 0) toggleFolderCollapse(currentFolder.id); }}
                className={cn("flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer group", selectedFolderId === currentFolder.id && "bg-muted")}
            >
                {children.length > 0 ? (
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isCollapsed && "-rotate-90")} />
                ) : (
                    <div className="w-4" /> // Placeholder for alignment
                )}
                <Folder className="h-4 w-4"/>
                <span className='flex-grow truncate'>{currentFolder.name}</span>
            </div>
            {!isCollapsed && children.length > 0 && (
                <ul className="pl-4 border-l ml-4 space-y-1">
                    {children.map(child => renderSidebarFolders(child, allChildFolders, level + 1))}
                </ul>
            )}
        </li>
      );
    }, [collapsedFolders, selectedFolderId, toggleFolderCollapse]);

    const filteredResources = useMemo(() => {
      if (!data || !selectedFolderId) return [];
      return data.resources.filter(r => r.folderId === selectedFolderId);
    }, [data, selectedFolderId]);

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
    const selectedFolderName = childFolders.find(f => f.id === selectedFolderId)?.name || folder.name;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold">Shared Collection</h1>
                <p className="text-muted-foreground">Shared by {sharedBy}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <p>Powered by</p>
                    <a href="https://corelifeos.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-primary hover:underline">
                        <BrainCircuit className="h-4 w-4"/> LifeOS
                    </a>
                </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
                <aside className="md:col-span-1 md:sticky top-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Folders</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-[calc(100vh-18rem)] overflow-y-auto pr-2">
                                <ul className="space-y-1">
                                    {renderSidebarFolders(folder, childFolders, 0)}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </aside>

                <main className="md:col-span-3">
                    <h2 className="text-2xl font-bold mb-4">{selectedFolderName}</h2>
                    {filteredResources.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredResources.map(res => {
                                const cardClassName = res.type === 'card' ? "lg:col-span-3" : "";
                                return (
                                    <div key={res.id} className={cardClassName}>
                                        <ResourceLinkCard resource={res} />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
                            <p>This folder is empty.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

