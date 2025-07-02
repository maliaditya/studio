
"use client";

import React, { useState, useMemo, FormEvent, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Library, Folder, Link as LinkIcon, Edit, ExternalLink, ChevronDown, Loader2, Globe, GitMerge } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import type { Resource, ResourceFolder } from '@/types/workout';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MindMapViewer } from '@/components/MindMapViewer';

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

const getYouTubeEmbedUrl = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        let videoId: string | null = null;

        if (urlObj.hostname.includes('youtube.com')) {
            videoId = urlObj.searchParams.get('v');
        } else if (urlObj.hostname.includes('youtu.be')) {
            videoId = urlObj.pathname.slice(1);
        }

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}`;
        }
    } catch (e) {
        // Silently fail for invalid URLs
    }
    return null;
};

const isNotionUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.endsWith('notion.so');
    } catch (e) {
        return false;
    }
};

const isObsidianUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname === 'share.note.sx';
    } catch (e) {
        return false;
    }
};

function ResourcesPageContent() {
  const { toast } = useToast();
  const { 
    resources, setResources, 
    resourceFolders, setResourceFolders,
  } = useAuth();
  
  const [newFolderName, setNewFolderName] = useState('');
  const [newResource, setNewResource] = useState({ name: '', link: '', description: '' });

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
    if (!newResource.link.trim()) {
      toast({ title: "Error", description: "Resource link is required.", variant: "destructive" });
      return;
    }

    let fullLink = newResource.link.trim();
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
      };
      setResources(prev => [...prev, newRes]);
      setNewResource({ name: '', link: '', description: '' });
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

  const handleSaveResourceEdit = () => {
    if (!editingResource || !editedResourceData.name?.trim() || !editedResourceData.link?.trim() || !editedResourceData.folderId) {
        toast({ title: "Error", description: "Name, link, and folder are required.", variant: "destructive"});
        return;
    }
    
    let finalData = { ...editedResourceData };
    if (finalData.link && finalData.link !== editingResource?.link) {
        finalData.iconUrl = getFaviconUrl(finalData.link);
    }

    setResources(prev =>
        prev.map(res =>
            res.id === editingResource.id ? { ...res, ...finalData } as Resource : res
        )
    );
    setEditingResource(null);
    toast({ title: "Resource Updated", description: `"${editedResourceData.name}" has been updated.` });
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
                        {level === 0 && (
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
                        )}
                    </div>
                )}
                {!collapsedFolders.has(folder.id) && renderSidebarFolders(folder.id, level + 1)}
            </li>
        ))}
      </ul>
    );
  }, [resourceFolders, editingFolder, selectedFolderId, collapsedFolders, toggleFolderCollapse]);

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
              
              {selectedFolderId ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {isAdding ? (
                    <Card className="flex flex-col border-primary ring-2 ring-primary">
                      <CardHeader className="p-4">
                          <CardTitle className="text-lg">Add New Resource</CardTitle>
                          <CardDescription>Enter a URL to automatically fetch its details.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3 flex-grow">
                          <Input
                            autoFocus
                            placeholder="https://example.com"
                            value={newResource.link}
                            onChange={(e) => setNewResource({ name: '', link: e.target.value, description: '' })}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddResource(); }}
                          />
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-end gap-2">
                          <Button variant="ghost" onClick={() => { setIsAdding(false); setNewResource({ name: '', link: '', description: '' }); }}>Cancel</Button>
                          <Button onClick={handleAddResource} disabled={isFetchingMeta}>
                            {isFetchingMeta ? <Loader2 className="h-4 w-4 animate-spin"/> : "Save Resource"}
                          </Button>
                      </CardFooter>
                    </Card>
                  ) : (
                    <Card 
                      onClick={() => setIsAdding(true)}
                      className="flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-colors cursor-pointer min-h-[220px]"
                    >
                        <PlusCircle className="h-10 w-10 text-muted-foreground" />
                        <p className="mt-2 text-sm font-semibold text-muted-foreground">Add New Resource</p>
                    </Card>
                  )}

                  {filteredResources.map(res => {
                    const youtubeEmbedUrl = getYouTubeEmbedUrl(res.link);
                    const isSpecialEmbed = isNotionUrl(res.link) || isObsidianUrl(res.link);
                    
                    return (
                        <Card key={res.id} className="flex flex-col">
                            {youtubeEmbedUrl ? (
                                <div className="aspect-video w-full bg-black rounded-t-lg">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={youtubeEmbedUrl}
                                        title={res.name}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="rounded-t-lg"
                                    ></iframe>
                                </div>
                            ) : null}
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    {isSpecialEmbed ? (
                                        <Globe className="h-4 w-4" />
                                    ) : res.iconUrl ? (
                                        <Image src={res.iconUrl} alt={`${res.name} favicon`} width={16} height={16} className="rounded-sm" />
                                    ) : (
                                        <LinkIcon className="h-4 w-4" />
                                    )}
                                    <span className="truncate" title={res.name}>{res.name}</span>
                                </CardTitle>
                                {!youtubeEmbedUrl && (
                                    <CardDescription className="flex items-center gap-1 text-xs truncate">
                                        <a href={res.link} target="_blank" rel="noopener noreferrer" className="hover:underline">{res.link}</a>
                                    </CardDescription>
                                )}
                            </CardHeader>
                            {!youtubeEmbedUrl && (
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-muted-foreground">{res.description || 'No description.'}</p>
                                </CardContent>
                            )}
                            <CardFooter className="flex justify-between items-center mt-auto pt-6">
                                {isSpecialEmbed ? (
                                  <Button variant="outline" onClick={() => setEmbedUrl(res.link)}>
                                      View in App
                                  </Button>
                                ) : (
                                  <Button asChild variant="outline">
                                      <a href={res.link} target="_blank" rel="noopener noreferrer">
                                          Visit Site <ExternalLink className="ml-2 h-4 w-4" />
                                      </a>
                                  </Button>
                                )}
                                <div className="flex">
                                <Button variant="ghost" size="icon" onClick={() => setEditingResource(res)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteResource(res.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Library className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select a folder to view or add resources.</p>
                </div>
              )}
            </div>
          </main>
      </div>
    </div>
    
    {contextMenu && (
        <div
            ref={contextMenuRef}
            style={{ top: contextMenu.mouseY, left: contextMenu.mouseX }}
            className="fixed z-50 min-w-[10rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
        >
            <Button variant="ghost" className="w-full h-9 justify-start px-2" onClick={() => { handleAddNewNestedFolder(contextMenu.item); setContextMenu(null); }}>
                New Folder
            </Button>
            <Button variant="ghost" className="w-full h-9 justify-start px-2" onClick={() => {
                setEditingFolder(contextMenu.item);
                setContextMenu(null);
            }}>
                Rename
            </Button>
            <Button variant="ghost" className="w-full h-9 justify-start px-2 text-destructive hover:text-destructive" onClick={() => {
                setDeleteConfirmation({ item: contextMenu.item });
                setContextMenu(null);
            }}>
                Delete
            </Button>
        </div>
    )}
    
    {deleteConfirmation && (
        <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete "{deleteConfirmation.item.name}" and all its contents. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmation(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                        handleDeleteFolder(deleteConfirmation.item.id);
                        setDeleteConfirmation(null);
                    }}>
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="res-link" className="text-right">Link</Label>
                    <Input id="res-link" value={editedResourceData.link || ''} onChange={(e) => setEditedResourceData(prev => ({...prev, link: e.target.value}))} className="col-span-3"/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="res-desc" className="text-right">Description</Label>
                    <Textarea id="res-desc" value={editedResourceData.description || ''} onChange={(e) => setEditedResourceData(prev => ({...prev, description: e.target.value}))} className="col-span-3"/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="res-folder" className="text-right">Folder</Label>
                    <Select value={editedResourceData.folderId || ''} onValueChange={handleResourceFolderChange}>
                        <SelectTrigger id="res-folder" className="col-span-3">
                            <SelectValue placeholder="Select a folder" />
                        </SelectTrigger>
                        <SelectContent>
                            {renderFolderOptions(null, 0)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingResource(null)}>Cancel</Button>
                <Button onClick={handleSaveResourceEdit}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={!!embedUrl} onOpenChange={(isOpen) => !isOpen && setEmbedUrl(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2">
            <DialogHeader className="sr-only">
                <DialogTitle>Embedded Resource</DialogTitle>
            </DialogHeader>
            <div className="flex-grow min-h-0">
                {embedUrl && (
                    <iframe
                        src={embedUrl}
                        className="w-full h-full border-0 rounded-md"
                        title="Embedded Resource"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                    ></iframe>
                )}
            </div>
        </DialogContent>
    </Dialog>
    <Dialog open={isMindMapModalOpen} onOpenChange={setIsMindMapModalOpen}>
        <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
            <DialogHeader className="sr-only">
              <DialogTitle>Resource Mind Map</DialogTitle>
            </DialogHeader>
            <MindMapViewer defaultView="Resources" rootFolderId={mindMapRootFolderId} showControls={false} />
        </DialogContent>
    </Dialog>
    </>
  );
}

export default function ResourcesPage() {
    return <AuthGuard><ResourcesPageContent /></AuthGuard>;
}
