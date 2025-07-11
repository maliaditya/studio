

"use client";

import React, { useState, useMemo, FormEvent, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Library, Folder, Link as LinkIcon, Edit, ExternalLink, ChevronDown, Loader2, Globe, GitMerge, MoreVertical, Youtube, Expand, PictureInPicture, ArrowRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import type { Resource, ResourceFolder, ResourcePoint } from '@/types/workout';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogFooter as DialogFooterComponent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MindMapViewer } from '@/components/MindMapViewer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const getFaviconUrl = (link: string): string | undefined => {
  try {
      let url = link;
      if (!url.startsWith('http')) {
          url = `https://${url}`;
      }
      const urlObject = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObject.hostname}&sz=32`;
  } catch (e) {
      console.error("Invalid URL for favicon:", e);
      return undefined;
  }
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

const isNotionUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.endsWith('notion.so');
    } catch (e) { return false; }
};

const isObsidianUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.endsWith('obsidian.md') || urlObj.hostname.endsWith('publish.obsidian.md');
    } catch (e) { return false; }
};

const ResourceCard = ({ resource, onUpdate, onDelete, setFloatingVideoUrl }: { resource: Resource; onUpdate: (resource: Resource) => void; onDelete: (resourceId: string) => void; setFloatingVideoUrl: (url: string | null) => void; }) => {
    const [editingTitle, setEditingTitle] = useState(false);
    const [editingPointId, setEditingPointId] = useState<string | null>(null);

    const handleUpdateTitle = (newTitle: string) => {
        onUpdate({ ...resource, name: newTitle });
    };

    const handleUpdatePoint = (pointId: string, newText: string) => {
        const youtubeEmbedUrl = getYouTubeEmbedUrl(newText);
        const obsidianEmbedUrl = isObsidianUrl(newText) ? newText : null;
        let updatedPointData: Partial<ResourcePoint>;
    
        if (youtubeEmbedUrl) {
            updatedPointData = { text: newText, type: 'youtube', url: youtubeEmbedUrl };
        } else if (obsidianEmbedUrl) {
            updatedPointData = { text: newText, type: 'obsidian', url: obsidianEmbedUrl };
        } else {
            updatedPointData = { text: newText, type: 'text', url: undefined };
        }
        
        const updatedPoints = (resource.points || []).map(p => 
            p.id === pointId 
                ? { ...p, ...updatedPointData } 
                : p
        );
        onUpdate({ ...resource, points: updatedPoints });
    };

    const handleAddPoint = () => {
        const newPoint: ResourcePoint = { id: `point_${Date.now()}`, text: 'New step', type: 'text' };
        const updatedPoints = [...(resource.points || []), newPoint];
        onUpdate({ ...resource, points: updatedPoints });
        setEditingPointId(newPoint.id);
    };

    const handleDeletePoint = (pointId: string) => {
        const updatedPoints = (resource.points || []).filter(p => p.id !== pointId);
        onUpdate({ ...resource, points: updatedPoints });
    };
    
    return (
        <Card className="flex flex-col rounded-2xl group overflow-hidden transition-all duration-300 hover:shadow-xl">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                   <div className="flex items-center gap-2 flex-grow min-w-0">
                        {editingTitle ? (
                            <Input value={resource.name} onChange={(e) => handleUpdateTitle(e.target.value)} onBlur={() => setEditingTitle(false)} autoFocus className="text-lg font-semibold h-9" />
                        ) : (
                            <CardTitle className="flex items-center gap-3 text-lg cursor-pointer" onClick={() => setEditingTitle(true)}>
                                <span className="text-primary"><Library className="h-5 w-5" /></span>
                                <span className="truncate">{resource.name}</span>
                            </CardTitle>
                        )}
                   </div>
                   <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mr-2 -mt-1">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditingTitle(true)}>Edit Title</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onDelete(resource.id)} className="text-destructive">Delete Card</DropdownMenuItem>
                        </DropdownMenuContent>
                   </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <ul className="space-y-3">
                    {(resource.points || []).map((point) => (
                        <li key={point.id} className="flex items-start gap-3 text-sm text-muted-foreground group/item">
                            <ArrowRight className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" />
                            <div className="flex-grow">
                                {editingPointId === point.id ? (
                                    <Textarea value={point.text} onChange={e => handleUpdatePoint(point.id, e.target.value)} onBlur={() => setEditingPointId(null)} autoFocus className="text-sm" rows={2}/>
                                ) : point.type === 'youtube' && point.url ? (
                                    <div className="w-full aspect-video rounded-md overflow-hidden border">
                                        <iframe src={point.url} title={resource.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
                                    </div>
                                ) : point.type === 'obsidian' && point.url ? (
                                    <div className="w-full aspect-[4/3] rounded-md overflow-hidden border">
                                        <iframe src={point.url} title={resource.name} frameBorder="0" allowFullScreen className="w-full h-full"></iframe>
                                    </div>
                                ) : (
                                    <span onClick={() => setEditingPointId(point.id)} className="flex-grow cursor-pointer" dangerouslySetInnerHTML={{ __html: point.text.replace(/<br>/g, '') }} />
                                )}
                            </div>
                            <div className="flex flex-col items-center flex-shrink-0">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover/item:opacity-100" onClick={() => handleDeletePoint(point.id)}>
                                    <Trash2 className="h-3 w-3"/>
                                </Button>
                                {(point.type === 'youtube' || point.type === 'obsidian') && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground opacity-0 group-hover/item:opacity-100" onClick={() => setFloatingVideoUrl(point.text)}>
                                        <PictureInPicture className="h-3 w-3"/>
                                    </Button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardContent className="pt-0">
                 <Button variant="outline" size="sm" className="w-full" onClick={handleAddPoint}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Step
                </Button>
            </CardContent>
        </Card>
    );
};


function ResourcesPageContent() {
  const { 
    resources, setResources, 
    resourceFolders, setResourceFolders,
    setFloatingVideoUrl
  } = useAuth();
  const { toast } = useToast();
  
  const [newFolderName, setNewFolderName] = useState('');
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceLink, setNewResourceLink] = useState('');

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<ResourceFolder | null>(null);
  const [newlyCreatedFolderId, setNewlyCreatedFolderId] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editedResourceData, setEditedResourceData] = useState<Partial<Resource>>({});
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    item: ResourceFolder;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ item: ResourceFolder } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  
  const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
  const [mindMapRootFolderId, setMindMapRootFolderId] = useState<string | null>(null);
  
  const [addResourceType, setAddResourceType] = useState<'link' | 'card'>('link');

  useEffect(() => {
    if (editingResource) {
        setEditedResourceData(editingResource);
    }
  }, [editingResource]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
            setContextMenu(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenuRef]);

  const filteredResources = useMemo(() => {
    if (!selectedFolderId) return [];
    return resources.filter(r => r.folderId === selectedFolderId);
  }, [resources, selectedFolderId]);

  const toggleFolderCollapse = useCallback((folderId: string) => {
    setCollapsedFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderId)) {
            newSet.delete(folderId);
        } else {
            newSet.add(folderId);
        }
        return newSet;
    });
  }, []);
  
  const handleAddFolder = (e: FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
        toast({ title: "Error", description: "Folder name cannot be empty.", variant: "destructive" });
        return;
    }
    const newFolder: ResourceFolder = {
        id: `cat_${Date.now()}`,
        name: newFolderName.trim(),
        parentId: null,
        icon: 'Folder',
    };
    setResourceFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
  };

  const handleDeleteFolder = (folderId: string) => {
    let idsToDelete = [folderId];
    let queue = [folderId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = resourceFolders.filter(f => f.parentId === currentId);
        for (const child of children) {
            idsToDelete.push(child.id);
            queue.push(child.id);
        }
    }
    
    setResourceFolders(prev => prev.filter(f => !idsToDelete.includes(f.id)));
    setResources(prev => prev.filter(r => !idsToDelete.includes(r.folderId)));
    
    if (selectedFolderId && idsToDelete.includes(selectedFolderId)) {
        setSelectedFolderId(null);
    }
    toast({ title: "Folder Deleted", description: "The folder and all its contents have been removed." });
  };
  
  const commitFolderEdit = () => {
    if (!editingFolder) return;
    if (!editingFolder.name.trim()) {
        toast({ title: "Rename Cancelled", description: "Folder name cannot be empty.", variant: "destructive" });
        cancelFolderEdit();
        return;
    }
    setResourceFolders(prev => prev.map(f => f.id === editingFolder.id ? editingFolder : f));
    setEditingFolder(null);
  };
  
  const handleAddNewNestedFolder = (parentFolder: ResourceFolder) => {
    const newFolder: ResourceFolder = {
      id: `folder_${Date.now()}`,
      name: "New Folder",
      parentId: parentFolder.id,
    };
    setResourceFolders(prev => [...prev, newFolder]);
    setEditingFolder(newFolder);
    setNewlyCreatedFolderId(newFolder.id);

    // Ensure parent is expanded
    setCollapsedFolders(prev => {
      const newSet = new Set(prev);
      newSet.delete(parentFolder.id);
      return newSet;
    });
  };

  const cancelFolderEdit = () => {
    if (!editingFolder) return;
    if (editingFolder.id === newlyCreatedFolderId) {
      setResourceFolders(prev => prev.filter(f => f.id !== editingFolder.id));
    }
    setEditingFolder(null);
    setNewlyCreatedFolderId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, item: ResourceFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
        mouseX: e.clientX,
        mouseY: e.clientY,
        item,
    });
  };
  
  const handleAddResource = async () => {
    if (!selectedFolderId) {
      toast({ title: "Error", description: "Please select a folder first.", variant: "destructive" });
      return;
    }
    if (addResourceType === 'link' && !newResourceLink.trim()) {
      toast({ title: "Error", description: "Resource link is required for a link type.", variant: "destructive" });
      return;
    }
    if (addResourceType === 'card' && !newResourceName.trim()) {
      toast({ title: "Error", description: "Name is required for a card type.", variant: "destructive" });
      return;
    }

    if (addResourceType === 'card') {
        const newRes: Resource = {
            id: `res_${Date.now()}`,
            name: newResourceName.trim(),
            folderId: selectedFolderId,
            type: 'card',
            points: [],
            icon: 'Library'
        };
        setResources(prev => [...prev, newRes]);
        setNewResourceName('');
        setIsAdding(false);
        toast({ title: "Resource Card Added", description: `"${newRes.name}" has been saved.`});
        return;
    }

    // Handle 'link' type
    let fullLink = newResourceLink.trim();
    if (!fullLink.startsWith('http://') && !fullLink.startsWith('https://')) {
        fullLink = 'https://' + fullLink;
    }

    setIsFetchingMeta(true);
    try {
      const response = await fetch('/api/get-link-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullLink }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch metadata.');
      }

      const newRes: Resource = {
          id: `res_${Date.now()}`,
          name: result.title || 'Untitled Resource',
          link: fullLink,
          description: result.description || '',
          folderId: selectedFolderId,
          iconUrl: getFaviconUrl(fullLink),
          type: 'link'
      };
      setResources(prev => [...prev, newRes]);
      setNewResourceLink('');
      setIsAdding(false);
      toast({ title: "Resource Added", description: `"${newRes.name}" has been saved.`});
    } catch (error) {
        toast({
            title: "Error adding resource",
            description: error instanceof Error ? error.message : "Could not fetch metadata from URL.",
            variant: "destructive",
        });
    } finally {
        setIsFetchingMeta(false);
    }
  };
  
  const handleDeleteResource = (resourceId: string) => {
      setResources(prev => prev.filter(r => r.id !== resourceId));
  };
  
  const handleResourceFolderChange = (value: string) => {
      setEditedResourceData(prev => ({...prev, folderId: value}));
  };

  const handleUpdateResource = (updatedResource: Resource) => {
    setResources(prev =>
      prev.map(res => res.id === updatedResource.id ? updatedResource : res)
    );
  };

  const handleSaveResourceEdit = () => {
    if (!editingResource || !editedResourceData.name?.trim() || !editedResourceData.folderId) {
        toast({ title: "Error", description: "Name and folder are required.", variant: "destructive"});
        return;
    }
    
    let finalData = { ...editedResourceData };
    if (finalData.type === 'link' && finalData.link && finalData.link !== editingResource?.link) {
        finalData.iconUrl = getFaviconUrl(finalData.link);
    }
    onUpdateResource(finalData as Resource);
    setEditingResource(null);
    toast({ title: "Resource Updated", description: `"${editedResourceData.name}" has been updated.` });
  };

  const onUpdateResource = (updatedResource: Resource) => {
    setResources(prev => prev.map(res => res.id === updatedResource.id ? updatedResource : res));
  };
  
  const renderFolderOptions = useCallback((parentId: string | null, level: number): JSX.Element[] => {
    const folders = resourceFolders.filter(f => f.parentId === parentId).sort((a,b) => a.name.localeCompare(b.name));
    let options: JSX.Element[] = [];

    folders.forEach(folder => {
        options.push(
            <SelectItem key={folder.id} value={folder.id}>
                <span style={{ paddingLeft: `${level * 1.5}rem` }}>{folder.name}</span>
            </SelectItem>
        );
        options = options.concat(renderFolderOptions(folder.id, level + 1));
    });

    return options;
  }, [resourceFolders]);

  const renderSidebarFolders = useCallback((parentId: string | null, level: number) => {
    const foldersToRender = resourceFolders
        .filter(f => f.parentId === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));

    if (foldersToRender.length === 0 && level > 0) return null;

    return (
      <ul className={cn("space-y-1", level > 0 && "pl-4")}>
        {foldersToRender.map(folder => (
            <li key={folder.id}>
                 {editingFolder?.id === folder.id ? (
                    <div className="flex items-center gap-2 p-1 w-full">
                        <Folder className="h-4 w-4 flex-shrink-0"/>
                        <Input
                            value={editingFolder.name}
                            onChange={e => setEditingFolder({...editingFolder, name: e.target.value})}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { commitFolderEdit(); e.preventDefault(); } 
                                else if (e.key === 'Escape') { cancelFolderEdit(); }
                            }}
                            onBlur={commitFolderEdit}
                            className="h-7 border-primary ring-primary"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                        />
                    </div>
                ) : (
                    <div 
                        onClick={() => { setSelectedFolderId(folder.id); toggleFolderCollapse(folder.id); }}
                        onDoubleClick={() => setEditingFolder(folder)}
                        onContextMenu={(e) => handleContextMenu(e, folder)}
                        className={cn("flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer group", selectedFolderId === folder.id && "bg-muted")}
                    >
                        <ChevronDown className={cn("h-4 w-4 transition-transform", collapsedFolders.has(folder.id) && "-rotate-90", resourceFolders.every(f => f.parentId !== folder.id) && "invisible")} />
                        <Folder className="h-4 w-4"/>
                        <span className='flex-grow truncate'>{folder.name}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation();
                                setMindMapRootFolderId(folder.id);
                                setIsMindMapModalOpen(true);
                            }}
                        >
                            <GitMerge className="h-4 w-4" />
                            <span className="sr-only">View Mind Map for {folder.name}</span>
                        </Button>
                    </div>
                )}
                {!collapsedFolders.has(folder.id) && renderSidebarFolders(folder.id, level + 1)}
            </li>
        ))}
      </ul>
    );
  }, [resourceFolders, editingFolder, selectedFolderId, collapsedFolders, toggleFolderCollapse, commitFolderEdit, cancelFolderEdit, handleContextMenu]);

  return (
    <>
    <div className="container mx-auto p-4 sm:p-6 lg:p-8" onClick={() => contextMenu && setContextMenu(null)}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left Sidebar */}
        <aside className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Folders</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddFolder} className="flex gap-2 mb-4">
                <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="New Root Folder" />
                <Button size="icon" type="submit"><PlusCircle className="h-4 w-4" /></Button>
              </form>
              {renderSidebarFolders(null, 0)}
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <main className="md:col-span-3">
            <div>
              <h2 className="text-2xl font-bold mb-4">
                {selectedFolderId
                  ? resourceFolders.find(f => f.id === selectedFolderId)?.name
                  : 'Resources'}
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredResources.map(res => {
                  if (res.type === 'card') {
                    return <ResourceCard key={res.id} resource={res} onUpdate={handleUpdateResource} onDelete={handleDeleteResource} setFloatingVideoUrl={setFloatingVideoUrl} />;
                  }

                  // Link type rendering
                  const youtubeEmbedUrl = getYouTubeEmbedUrl(res.link);
                  const isSpecialEmbed = isNotionUrl(res.link) || isObsidianUrl(res.link);
                  const embedLinkForModal = youtubeEmbedUrl || (isSpecialEmbed ? res.link : null);
                  const isLongContent = res.name.length > 20 && (res.description?.length ?? 0) > 30;

                  return (
                      <Card key={res.id} className={cn(
                          "relative group rounded-3xl flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5",
                          isLongContent ? "bg-gradient-to-br from-card to-muted/20" : "bg-card"
                      )}>
                          {youtubeEmbedUrl && res.link ? (
                              <>
                                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onClick={() => setFloatingVideoUrl(res.link!)} onMouseDown={(e) => e.stopPropagation()}>
                                        <PictureInPicture className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onClick={(e) => { e.stopPropagation(); setEmbedUrl(youtubeEmbedUrl); }} aria-label="View in App"><Expand className="h-4 w-4" /></Button>
                                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}><DropdownMenuItem onSelect={() => setEditingResource(res)}><Edit className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem><DropdownMenuItem onSelect={() => handleDeleteResource(res.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                  </div>
                                  <div className="aspect-video w-full bg-black overflow-hidden rounded-t-3xl"><iframe id={`video-${res.id}`} width="100%" height="100%" src={youtubeEmbedUrl} title={res.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div>
                                  <div className="p-4 flex-grow"><div className="flex items-start justify-between gap-2"><div className="flex-grow min-w-0"><div className="flex items-center gap-2"><Youtube className="h-5 w-5 flex-shrink-0 text-red-500" /><p className="text-base font-bold truncate" title={res.name}>{res.name}</p></div></div></div></div>
                              </>
                          ) : (
                              <div className="p-5 flex flex-col flex-grow">
                                  <div className="flex items-start justify-between gap-2">
                                      <div className="flex-grow min-w-0">
                                          <div className="flex items-center gap-2">
                                              {isSpecialEmbed ? <Globe className="h-4 w-4 flex-shrink-0 text-primary" /> : res.iconUrl ? <Image src={res.iconUrl} alt={`${res.name} favicon`} width={16} height={16} className="rounded-sm flex-shrink-0" unoptimized/> : <LinkIcon className="h-4 w-4 flex-shrink-0" />}
                                              <p className="text-base font-bold" title={res.name}>{res.name}</p>
                                          </div>
                                      </div>
                                       <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 -mr-2 -mt-1"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setEditingResource(res)}><Edit className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem><DropdownMenuItem onSelect={() => handleDeleteResource(res.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                  </div>
                                  <a href={res.link} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground truncate block hover:underline mt-1">{res.link}</a>
                                  <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-grow min-h-[60px]">{res.description || 'No description available.'}</p>
                                  <div className="mt-auto pt-4">
                                      {isSpecialEmbed ? (<Button variant="secondary" size="sm" className="w-full" onClick={() => setEmbedUrl(res.link)}>View in App</Button>) : (<Button asChild variant="secondary" size="sm" className="w-full"><a href={res.link} target="_blank" rel="noopener noreferrer">Visit Site <ExternalLink className="ml-2 h-3 w-3" /></a></Button>)}
                                  </div>
                              </div>
                          )}
                      </Card>
                  )
                })}
                 {selectedFolderId && (isAdding ? (
                      <Card className="rounded-3xl flex flex-col border-primary ring-2 ring-primary shadow-xl">
                        <div className="p-5 flex flex-col flex-grow justify-between">
                          <div>
                            <p className="text-base font-semibold">Add New Resource</p>
                            <Tabs value={addResourceType} onValueChange={(v) => setAddResourceType(v as 'link' | 'card')} className="w-full mt-2 mb-4">
                              <TabsList className="grid w-full grid-cols-2">
                                  <TabsTrigger value="link">Link</TabsTrigger>
                                  <TabsTrigger value="card">Card</TabsTrigger>
                              </TabsList>
                            </Tabs>
                            {addResourceType === 'link' ? (
                              <Input
                                  className="h-10 text-base"
                                  autoFocus
                                  placeholder="https://example.com"
                                  value={newResourceLink}
                                  onChange={(e) => setNewResourceLink(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddResource(); }}
                                />
                            ) : (
                               <Input
                                  className="h-10 text-base"
                                  autoFocus
                                  placeholder="New card name..."
                                  value={newResourceName}
                                  onChange={(e) => setNewResourceName(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddResource(); }}
                                />
                            )}
                          </div>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setNewResourceLink(''); setNewResourceName('') }}>Cancel</Button>
                            <Button size="sm" onClick={handleAddResource} disabled={isFetchingMeta}>
                              {isFetchingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <Card 
                        onClick={() => setIsAdding(true)}
                        className="rounded-3xl group flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-300 cursor-pointer min-h-[220px] hover:shadow-xl hover:-translate-y-1"
                      >
                          <PlusCircle className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                          <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors">Add New Resource</p>
                      </Card>
                    ))}
              </div>
            </div>
          </main>
      </div>
    </div>
    
    {contextMenu && (
        <div ref={contextMenuRef} style={{ top: contextMenu.mouseY, left: contextMenu.mouseX }} className="fixed z-50 min-w-[10rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" className="w-full h-9 justify-start px-2" onClick={() => { handleAddNewNestedFolder(contextMenu.item); setContextMenu(null); }}>New Folder</Button>
            <Button variant="ghost" className="w-full h-9 justify-start px-2" onClick={() => { setEditingFolder(contextMenu.item); setContextMenu(null); }}>Rename</Button>
            <Button variant="ghost" className="w-full h-9 justify-start px-2 text-destructive hover:text-destructive" onClick={() => { setDeleteConfirmation({ item: contextMenu.item }); setContextMenu(null); }}>Delete</Button>
        </div>
    )}
    
    {deleteConfirmation && (
        <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{deleteConfirmation.item.name}" and all its contents. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setDeleteConfirmation(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { handleDeleteFolder(deleteConfirmation.item.id); setDeleteConfirmation(null); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    )}

    <Dialog open={!!editingResource} onOpenChange={(isOpen) => !isOpen && setEditingResource(null)}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Edit Resource</DialogTitle>
                <DialogDescriptionComponent>Update the details or move this resource to a new folder.</DialogDescriptionComponent>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="res-name" className="text-right">Name</Label>
                    <Input id="res-name" value={editedResourceData.name || ''} onChange={(e) => setEditedResourceData(prev => ({...prev, name: e.target.value}))} className="col-span-3"/>
                </div>
                {editingResource?.type === 'link' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="res-link" className="text-right">Link</Label>
                        <Input id="res-link" value={editedResourceData.link || ''} onChange={(e) => setEditedResourceData(prev => ({...prev, link: e.target.value}))} className="col-span-3"/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="res-desc" className="text-right">Description</Label>
                        <Textarea id="res-desc" value={editedResourceData.description || ''} onChange={(e) => setEditedResourceData(prev => ({...prev, description: e.target.value}))} className="col-span-3"/>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="res-folder" className="text-right">Folder</Label>
                    <Select value={editedResourceData.folderId || ''} onValueChange={handleResourceFolderChange}>
                        <SelectTrigger id="res-folder" className="col-span-3"><SelectValue placeholder="Select a folder" /></SelectTrigger>
                        <SelectContent>{renderFolderOptions(null, 0)}</SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooterComponent>
                <Button variant="outline" onClick={() => setEditingResource(null)}>Cancel</Button>
                <Button onClick={handleSaveResourceEdit}>Save Changes</Button>
            </DialogFooterComponent>
        </DialogContent>
    </Dialog>

    <Dialog open={!!embedUrl} onOpenChange={(isOpen) => !isOpen && setEmbedUrl(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2">
            <div className="flex-grow min-h-0">{embedUrl && (<iframe src={embedUrl} className="w-full h-full border-0 rounded-md" title="Embedded Resource" sandbox="allow-scripts allow-same-origin allow-forms" allow="picture-in-picture"></iframe>)}</div>
        </DialogContent>
    </Dialog>
    <Dialog open={isMindMapModalOpen} onOpenChange={setIsMindMapModalOpen}>
        <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
            <DialogHeader className="sr-only"><DialogTitle>Resource Mind Map</DialogTitle></DialogHeader>
            <MindMapViewer defaultView="Resources" rootFolderId={mindMapRootFolderId} showControls={false} />
        </DialogContent>
    </Dialog>
    </>
  );
}

export default function ResourcesPage() {
    return <AuthGuard><ResourcesPageContent /></AuthGuard>;
}





