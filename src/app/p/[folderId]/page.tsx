

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Folder, Link as LinkIcon, Globe, Loader2, AlertTriangle, Youtube, Expand, ChevronDown, BrainCircuit, Library, MessageSquare, Code, ArrowRight, X, PictureInPicture, Play, Pause, GitMerge } from 'lucide-react';
import type { Resource, ResourceFolder, ResourcePoint } from '@/types/workout';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core';
import { useAuth } from '@/contexts/AuthContext';


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
            if (urlObj.pathname.startsWith('/shorts/')) {
                videoId = urlObj.pathname.split('/shorts/')[1];
            } else {
                videoId = urlObj.searchParams.get('v');
            }
        } else if (urlObj.hostname.includes('youtu.be')) {
            videoId = urlObj.pathname.slice(1);
        }
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    } catch (e) {}
    return null;
};

const isImageUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    if (/\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(url)) {
        return true;
    }
    try {
        const urlObj = new URL(url);
        const imageHosts = ['images.unsplash.com', 'plus.unsplash.com', 'upload.wikimedia.org'];
        return imageHosts.includes(urlObj.hostname);
    } catch (e) {
        return false;
    }
};

interface PopupState {
  resourceId: string;
  level: number;
  x: number;
  y: number;
  parentId?: string;
  width?: number;
  height?: number;
}

interface ResourcePopupProps {
  popupState: PopupState;
  allResources: Resource[];
  onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState: PopupState) => void;
  onClose: (resourceId: string) => void;
  onSizeChange: (resourceId: string, newSize: { width: number; height: number }) => void;
}

const ResourcePopupCard = ({ popupState, allResources, onOpenNestedPopup, onClose, onSizeChange }: ResourcePopupProps) => {
    const resource = allResources.find(r => r.id === popupState.resourceId);
    const cardRef = useRef<HTMLDivElement>(null);

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `popup-${popupState.resourceId}`,
    });

    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        width: `${popupState.width}px`,
        willChange: 'transform',
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }

    if (!resource) return null;

    const handleLinkClick = (e: React.MouseEvent, pointResourceId: string) => {
      e.stopPropagation();
      onOpenNestedPopup(pointResourceId, e, popupState);
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="z-[60]">
            <Card ref={cardRef} className="shadow-2xl border-2 border-primary/50 bg-card max-h-[70vh] flex flex-col">
                <CardHeader className="p-3 relative cursor-grab flex-shrink-0" {...listeners}>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Library className="h-4 w-4" />
                        <span className="truncate">{resource.name}</span>
                    </CardTitle>
                </CardHeader>
                <div className="flex-grow min-h-0 overflow-y-auto">
                    <CardContent className="p-3 pt-0">
                        <ul className="space-y-2 text-sm text-muted-foreground pr-2">
                            {(resource.points || []).map(point => (
                                <li key={point.id} className="flex items-start gap-2">
                                    {point.type === 'code' ? <Code className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> :
                                    point.type === 'markdown' ? <MessageSquare className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> :
                                    <ArrowRight className="h-4 w-4 mt-0.5 text-primary/50 flex-shrink-0" />
                                    }
                                    {point.type === 'card' && point.resourceId ? (
                                        <button
                                            onClick={(e) => handleLinkClick(e, point.resourceId!)}
                                            className="text-left font-medium text-primary hover:underline"
                                        >
                                            {point.text}
                                        </button>
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
                    </CardContent>
                </div>
                <CardFooter className="p-2 flex justify-end flex-shrink-0 relative">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onClose(resource.id); }}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};


const ResourceCardComponent = ({ resource, onOpenNestedPopup, playingAudio, setPlayingAudio, setFloatingVideoUrl }: { 
  resource: Resource; 
  onOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void;
  playingAudio: { id: string; isPlaying: boolean } | null;
  setPlayingAudio: React.Dispatch<React.SetStateAction<{ id: string; isPlaying: boolean } | null>>;
  setFloatingVideoUrl: (url: string | null) => void;
}) => {
    const hasMarkdownContent = resource.type === 'card' && (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');
    const [embedUrl, setEmbedUrl] = useState<string | null>(null);

    const togglePlayAudio = () => {
      if (playingAudio?.id === resource.id && playingAudio.isPlaying) {
        setPlayingAudio(prev => prev ? { ...prev, isPlaying: false } : null);
      } else {
        setPlayingAudio({ id: resource.id, isPlaying: true });
      }
    };

    if (resource.type === 'card') {
        return (
            <Card className="flex flex-col rounded-2xl group overflow-hidden transition-all duration-300 hover:shadow-xl">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                   <div className="flex items-center gap-2 flex-grow min-w-0">
                        <CardTitle className="flex items-center gap-3 text-lg cursor-pointer">
                            <span className="text-primary"><Library className="h-5 w-5" /></span>
                            <span className="truncate">{resource.name}</span>
                        </CardTitle>
                   </div>
                   <div className="flex items-center">
                        {resource.audioUrl && (
                             <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={togglePlayAudio}>
                                {playingAudio?.id === resource.id && playingAudio.isPlaying ? <Pause className="h-4 w-4 text-green-500" /> : <Play className="h-4 w-4 text-green-500" />}
                            </Button>
                        )}
                   </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow min-h-0">
                <div className={cn(hasMarkdownContent ? 'h-[450px]' : '')}>
                  <ScrollArea className="h-full">
                      <ul className="space-y-3 pr-3">
                          {(resource.points || []).map((point) => (
                              <li key={point.id} className="flex items-start gap-3 text-sm text-muted-foreground group/item">
                                  {point.type === 'code' ? <Code className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> :
                                  point.type === 'markdown' ? <MessageSquare className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> :
                                  <ArrowRight className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" />
                                  }
                                  {point.type === 'card' && point.resourceId ? (
                                      <button onClick={(e) => onOpenNestedPopup(point.resourceId!, e)} className="text-left font-medium text-primary hover:underline">
                                          {point.text}
                                      </button>
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
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
        );
    }
    
    // Logic for 'link' type cards
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
                    <div className="aspect-video w-full bg-black relative group">
                        <iframe src={youtubeEmbedUrl} title={resource.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onClick={() => setFloatingVideoUrl(resource.link!)}><PictureInPicture className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onClick={() => setEmbedUrl(youtubeEmbedUrl)}><Expand className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    <CardContent className="p-3 flex-grow flex flex-col">
                        <div className="flex items-center gap-2"><Youtube className="h-4 w-4 text-red-500"/><p className="font-semibold text-sm truncate" title={resource.name}>{resource.name}</p></div>
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
    
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folderId);
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

    const { setFloatingVideoUrl, globalVolume } = useAuth();
    const [openPopups, setOpenPopups] = useState<Map<string, PopupState>>(new Map());
    const [playingAudio, setPlayingAudio] = useState<{ id: string, isPlaying: boolean } | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;
    
        if (playingAudio && playingAudio.isPlaying) {
          const resourceToPlay = data?.resources.find(r => r.id === playingAudio.id);
          if (resourceToPlay?.audioUrl) {
            if (audioEl.src !== resourceToPlay.audioUrl) {
              audioEl.src = resourceToPlay.audioUrl;
            }
            audioEl.volume = globalVolume;
            audioEl.play().catch(e => console.error("Audio play failed:", e));
          }
        } else {
          audioEl.pause();
        }
      }, [playingAudio, data?.resources, globalVolume]);

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

    const handleOpenNestedPopup = (resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState) => {
        setOpenPopups(prev => {
            const newPopups = new Map(prev);
            const resource = data?.resources.find(r => r.id === resourceId);
            if (!resource) return newPopups;
            
            const hasMarkdown = (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');
            const popupWidth = hasMarkdown ? 896 : 512;
        
            let x, y, level, parentId;
        
            if (parentPopupState) {
                level = parentPopupState.level + 1;
                parentId = parentPopupState.resourceId;
                x = parentPopupState.x + 40;
                y = parentPopupState.y + 40;
            } else {
                level = 0;
                parentId = undefined;
                if (hasMarkdown) {
                    x = window.innerWidth / 2 - popupWidth / 2;
                    y = window.innerHeight / 2 - Math.min(window.innerHeight * 0.7, 700) / 2;
                } else {
                    x = event.clientX;
                    y = event.clientY;
                }
            }
            
            newPopups.set(resourceId, {
                resourceId, level, x, y, parentId, width: popupWidth
            });
            return newPopups;
        });
    };
    
    const handleClosePopup = (resourceId: string) => {
        setOpenPopups(prev => {
          const newPopups = new Map(prev);
          const popupsToDelete = new Set<string>();
          function findChildren(parentId: string) {
            popupsToDelete.add(parentId);
            for (const [id, popup] of newPopups.entries()) {
              if (popup.parentId === parentId) findChildren(id);
            }
          }
          findChildren(resourceId);
          for (const id of popupsToDelete) newPopups.delete(id);
          return newPopups;
        });
    };

    const handleSizeChange = useCallback((resourceId: string, newSize: { width: number; height: number }) => {
        setOpenPopups(prev => {
            const newPopups = new Map(prev);
            const popup = newPopups.get(resourceId);
            if (popup) {
                newPopups.set(resourceId, {
                    ...popup,
                    ...newSize
                });
            }
            return newPopups;
        });
    }, []);

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
                    <div className="w-4" />
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

    const handleDragEndMain = (event: DragEndEvent) => {
        const { active, delta } = event;
        const activeId = active.id as string;
    
        if (activeId.startsWith('popup-')) {
            const resourceId = activeId.replace('popup-', '');
            setOpenPopups(prev => {
                const newPopups = new Map(prev);
                const popup = newPopups.get(resourceId);
                if (popup) {
                    newPopups.set(resourceId, {
                        ...popup,
                        x: popup.x + delta.x,
                        y: popup.y + delta.y,
                    });
                }
                return newPopups;
            });
        }
    };


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
        <DndContext onDragEnd={handleDragEndMain}>
            <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
                    <aside className="md:col-span-1 md:sticky top-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>{folder.name}</CardTitle>
                                <CardDescription>Shared by {sharedBy}</CardDescription>
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
                                    const isCardType = res.type === 'card';
                                    const hasMarkdownContent = isCardType && (res.points || []).some(p => p.type === 'markdown' || p.type === 'code');
                                    const cardClassName = hasMarkdownContent ? "lg:col-span-3" : "";
                                    return (
                                        <div key={res.id} className={cardClassName}>
                                            <ResourceCardComponent resource={res} onOpenNestedPopup={handleOpenNestedPopup} playingAudio={playingAudio} setPlayingAudio={setPlayingAudio} setFloatingVideoUrl={setFloatingVideoUrl} />
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
            {Array.from(openPopups.values()).map((popupState) => (
                <ResourcePopupCard
                    key={popupState.resourceId}
                    popupState={popupState}
                    allResources={data.resources}
                    onOpenNestedPopup={handleOpenNestedPopup}
                    onClose={handleClosePopup}
                    onSizeChange={handleSizeChange}
                />
            ))}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {Array.from(openPopups.values()).map(popup => {
                if (!popup.parentId) return null;
                const parentPopup = openPopups.get(popup.parentId);
                if (!parentPopup) return null;
                
                const startX = parentPopup.x + (parentPopup.width || 0) / 2;
                const startY = parentPopup.y + ((parentPopup.height || 0) / 2);
                const endX = popup.x + (popup.width || 0) / 2;
                const endY = popup.y + ((popup.height || 0) / 2);
                
                return (
                <line 
                    key={`${popup.parentId}-${popup.resourceId}`}
                    x1={startX} 
                    y1={startY} 
                    x2={endX} 
                    y2={endY} 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="2"
                    strokeOpacity="0.5"
                />
                )
            })}
            </svg>
        </DndContext>
    );
}





