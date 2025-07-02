
"use client";

import React, { useState, useMemo, FormEvent, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Library, Folder, Link as LinkIcon, Edit, ExternalLink, ChevronsRight, ChevronDown } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import type { Resource, ResourceCategory, ResourceSubcategory } from '@/types/workout';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function ResourcesPageContent() {
  const { toast } = useToast();
  const { 
    resources, setResources, 
    resourceCategories, setResourceCategories,
    resourceSubcategories, setResourceSubcategories 
  } = useAuth();
  
  // State for forms
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newResource, setNewResource] = useState({ name: '', link: '', description: '' });

  // State for UI control
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<ResourceCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<ResourceSubcategory | null>(null);
  const [newlyCreatedSubcategoryId, setNewlyCreatedSubcategoryId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  
  // State for editing a resource
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editedResourceData, setEditedResourceData] = useState<Partial<Resource>>({});

  // State for custom context menu
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    item: ResourceCategory | ResourceSubcategory;
    type: 'category' | 'subcategory';
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // State for delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    item: ResourceCategory | ResourceSubcategory;
    type: 'category' | 'subcategory';
  } | null>(null);


  useEffect(() => {
    if (editingResource) {
        setEditedResourceData(editingResource);
    }
  }, [editingResource]);

  // Effect to close context menu on outside click
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
    if (!selectedCategoryId) return [];
    let filtered = resources.filter(r => r.categoryId === selectedCategoryId);
    if (selectedSubcategoryId) {
        return filtered.filter(r => r.subcategoryId === selectedSubcategoryId);
    }
    // Show resources in the main category that don't have a subcategory
    return filtered.filter(r => !r.subcategoryId);
  }, [resources, selectedCategoryId, selectedSubcategoryId]);

  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories(prev => {
        const newSet = new Set(prev);
        if (newSet.has(categoryId)) {
            newSet.delete(categoryId);
        } else {
            newSet.add(categoryId);
        }
        return newSet;
    });
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(null);
  }
  
  const handleAddCategory = (e: FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
        toast({ title: "Error", description: "Category name cannot be empty.", variant: "destructive" });
        return;
    }
    const newCategory: ResourceCategory = {
        id: `cat_${Date.now()}`,
        name: newCategoryName.trim(),
        icon: 'Folder',
    };
    setResourceCategories(prev => [...prev, newCategory]);
    setNewCategoryName('');
  };

  const handleDeleteCategory = (categoryId: string) => {
    setResourceCategories(prev => prev.filter(c => c.id !== categoryId));
    setResources(prev => prev.filter(r => r.categoryId !== categoryId));
    setResourceSubcategories(prev => prev.filter(sc => sc.categoryId !== categoryId));
    if (selectedCategoryId === categoryId) {
        setSelectedCategoryId(null);
        setSelectedSubcategoryId(null);
    }
    toast({ title: "Category Deleted", description: "The category and all its contents have been removed." });
  };
  
  const commitCategoryEdit = () => {
    if (!editingCategory) return;
    if (!editingCategory.name.trim()) {
        toast({ title: "Rename Cancelled", description: "Category name cannot be empty.", variant: "destructive" });
        setEditingCategory(null);
        return;
    }
    setResourceCategories(prev => prev.map(c => c.id === editingCategory.id ? editingCategory : c));
    setEditingCategory(null);
  };
  
  const handleAddNewSubcategory = (categoryId: string) => {
    if (!categoryId) return;
    const newSub: ResourceSubcategory = {
      id: `sub_${Date.now()}`,
      name: "New Subcategory",
      categoryId: categoryId,
    };
    setResourceSubcategories(prev => [...prev, newSub]);
    setEditingSubcategory(newSub);
    setNewlyCreatedSubcategoryId(newSub.id);

    // Ensure parent is expanded
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      newSet.delete(categoryId);
      return newSet;
    });
  };

  const handleDeleteSubcategory = (subcategoryId: string) => {
    setResourceSubcategories(prev => prev.filter(sc => sc.id !== subcategoryId));
    setResources(prev => prev.filter(r => r.subcategoryId !== subcategoryId));
    if (selectedSubcategoryId === subcategoryId) {
        setSelectedSubcategoryId(null);
    }
    toast({ title: "Subcategory Deleted", description: "The subcategory and its resources have been removed." });
  };

  const commitSubcategoryEdit = () => {
    if (!editingSubcategory) return;

    if (editingSubcategory.name.trim() === '') {
        if (editingSubcategory.id === newlyCreatedSubcategoryId) {
            // It's a new, empty subcategory, so delete it on blur/enter.
            handleDeleteSubcategory(editingSubcategory.id);
        }
        // For existing items, just cancel the edit.
        setEditingSubcategory(null);
        setNewlyCreatedSubcategoryId(null);
    } else {
        // Name is valid, save it.
        setResourceSubcategories(prev => prev.map(sc => sc.id === editingSubcategory.id ? editingSubcategory : sc));
        setEditingSubcategory(null);
        setNewlyCreatedSubcategoryId(null);
    }
  };
  
  const cancelSubcategoryEdit = () => {
    if (!editingSubcategory) return;
    if (editingSubcategory.id === newlyCreatedSubcategoryId) {
        handleDeleteSubcategory(editingSubcategory.id);
    }
    setEditingSubcategory(null);
    setNewlyCreatedSubcategoryId(null);
  }

  const handleContextMenu = (e: React.MouseEvent, item: ResourceCategory | ResourceSubcategory, type: 'category' | 'subcategory') => {
    e.preventDefault();
    e.stopPropagation(); // Prevent parent context menus
    setContextMenu({
        mouseX: e.clientX,
        mouseY: e.clientY,
        item,
        type,
    });
  };
  
  const handleAddResource = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) {
      toast({ title: "Error", description: "Please select a category first.", variant: "destructive" });
      return;
    }
    if (!newResource.name.trim() || !newResource.link.trim()) {
      toast({ title: "Error", description: "Resource name and link are required.", variant: "destructive" });
      return;
    }
    let fullLink = newResource.link.trim();
    if (!fullLink.startsWith('http://') && !fullLink.startsWith('https://')) {
        fullLink = 'https://' + fullLink;
    }
    const newRes: Resource = {
        id: `res_${Date.now()}`,
        name: newResource.name.trim(),
        link: fullLink,
        description: newResource.description.trim(),
        categoryId: selectedCategoryId,
        subcategoryId: selectedSubcategoryId || undefined,
    };
    setResources(prev => [...prev, newRes]);
    setNewResource({ name: '', link: '', description: '' });
  };
  
  const handleDeleteResource = (resourceId: string) => {
      setResources(prev => prev.filter(r => r.id !== resourceId));
  };
  
  const handleResourceDataChange = (field: keyof Resource, value: string) => {
    if (field === 'categoryId') {
        setEditedResourceData(prev => ({
            ...prev,
            categoryId: value,
            subcategoryId: undefined
        }));
    } else if (field === 'subcategoryId') {
        setEditedResourceData(prev => ({
            ...prev,
            subcategoryId: value === 'none' ? undefined : value
        }));
    } else {
        setEditedResourceData(prev => ({...prev, [field]: value}));
    }
  };

  const handleSaveResourceEdit = () => {
    if (!editingResource || !editedResourceData.name?.trim() || !editedResourceData.link?.trim() || !editedResourceData.categoryId) {
        toast({ title: "Error", description: "Name, link, and category are required.", variant: "destructive"});
        return;
    }
    setResources(prev =>
        prev.map(res =>
            res.id === editingResource.id ? { ...res, ...editedResourceData } as Resource : res
        )
    );
    setEditingResource(null);
    toast({ title: "Resource Updated", description: `"${editedResourceData.name}" has been updated.` });
  };
  
  const subcategoriesForSelectedCategoryInDialog = useMemo(() => {
    if (!editedResourceData.categoryId) return [];
    return resourceSubcategories.filter(sc => sc.categoryId === editedResourceData.categoryId);
  }, [editedResourceData.categoryId, resourceSubcategories]);

  return (
    <>
    <div className="container mx-auto p-4 sm:p-6 lg:p-8" onClick={() => contextMenu && setContextMenu(null)}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left Sidebar */}
        <aside className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
                <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="New Category" />
                <Button size="icon" type="submit"><PlusCircle className="h-4 w-4" /></Button>
              </form>
              <ul className="space-y-1">
                {resourceCategories.map(cat => (
                  <li key={cat.id}>
                    {editingCategory?.id === cat.id ? (
                      <div className="flex items-center gap-2 p-1 w-full">
                        <Folder className="h-4 w-4 flex-shrink-0"/>
                        <Input
                          value={editingCategory.name}
                          onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              commitCategoryEdit();
                              e.preventDefault();
                            } else if (e.key === 'Escape') {
                              setEditingCategory(null);
                            }
                          }}
                          onBlur={commitCategoryEdit}
                          className="h-7 border-primary ring-primary"
                          autoFocus
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                    ) : (
                      <div 
                        onClick={() => { handleSelectCategory(cat.id); toggleCategoryCollapse(cat.id); }}
                        onDoubleClick={() => setEditingCategory(cat)}
                        onContextMenu={(e) => handleContextMenu(e, cat, 'category')}
                        className={cn("flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer", selectedCategoryId === cat.id && !selectedSubcategoryId && "bg-muted")}
                      >
                         {resourceSubcategories.some(sc => sc.categoryId === cat.id) ? (
                            <ChevronDown className={cn("h-4 w-4 transition-transform", collapsedCategories.has(cat.id) && "-rotate-90")} />
                          ) : (
                            <ChevronsRight className="h-4 w-4 text-muted-foreground/50"/>
                         )}
                         <Folder className="h-4 w-4"/>
                         <span className='flex-grow truncate'>{cat.name}</span>
                      </div>
                    )}
                    {!collapsedCategories.has(cat.id) && (
                        <div className="pl-6 mt-1">
                           <ul className="space-y-1">
                                {resourceSubcategories.filter(sc => sc.categoryId === cat.id).map(sub => (
                                    <li key={sub.id}>
                                        {editingSubcategory?.id === sub.id ? (
                                           <div className="flex items-center gap-2 p-1 w-full">
                                                <Folder className="h-4 w-4 flex-shrink-0"/>
                                                <Input
                                                value={editingSubcategory.name}
                                                onChange={e => setEditingSubcategory({...editingSubcategory, name: e.target.value})}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        commitSubcategoryEdit();
                                                        e.preventDefault();
                                                    } else if (e.key === 'Escape') {
                                                        cancelSubcategoryEdit();
                                                    }
                                                }}
                                                onBlur={commitSubcategoryEdit}
                                                className="h-7 border-primary ring-primary"
                                                autoFocus
                                                onFocus={(e) => e.target.select()}
                                                />
                                            </div>
                                        ) : (
                                            <div 
                                                onClick={() => { handleSelectCategory(cat.id); setSelectedSubcategoryId(sub.id); }}
                                                onDoubleClick={() => setEditingSubcategory(sub)}
                                                onContextMenu={(e) => handleContextMenu(e, sub, 'subcategory')}
                                                className={cn("flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer", selectedSubcategoryId === sub.id && "bg-muted/50")}
                                            >
                                                <Folder className="h-4 w-4"/>
                                                <span className='flex-grow truncate'>{sub.name}</span>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <main className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add a New Resource</CardTitle>
              <CardDescription>Select a category and add your resource details below.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddResource} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input value={newResource.name} onChange={e => setNewResource({...newResource, name: e.target.value})} placeholder="Resource Name (e.g., Google Fonts)" disabled={!selectedCategoryId} />
                  <Input value={newResource.link} onChange={e => setNewResource({...newResource, link: e.target.value})} placeholder="URL (e.g., fonts.google.com)" disabled={!selectedCategoryId} />
                  <Input value={newResource.description} onChange={e => setNewResource({...newResource, description: e.target.value})} placeholder="Description (optional)" className="sm:col-span-2" disabled={!selectedCategoryId} />
                  <Button type="submit" className="sm:col-span-2" disabled={!selectedCategoryId}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add Resource
                  </Button>
              </form>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-2xl font-bold mb-4">Resources</h2>
            {filteredResources.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredResources.map(res => (
                        <Card key={res.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-lg">{res.name}</CardTitle>
                                <CardDescription className="flex items-center gap-1 text-xs truncate">
                                    <LinkIcon className="h-3 w-3"/>
                                    <a href={res.link} target="_blank" rel="noopener noreferrer" className="hover:underline">{res.link}</a>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground">{res.description || 'No description.'}</p>
                            </CardContent>
                            <CardFooter className="flex justify-between items-center">
                                <Button asChild variant="outline">
                                    <a href={res.link} target="_blank" rel="noopener noreferrer">
                                        Visit Site <ExternalLink className="ml-2 h-4 w-4"/>
                                    </a>
                                </Button>
                                <div className="flex">
                                    <Button variant="ghost" size="icon" onClick={() => setEditingResource(res)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteResource(res.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Library className="mx-auto h-12 w-12 text-muted-foreground mb-4"/>
                    <p className="text-muted-foreground">{selectedCategoryId ? "No resources in this section yet." : "Select a category to view resources."}</p>
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
            {contextMenu.type === 'category' && (
                <Button variant="ghost" className="w-full h-9 justify-start px-2" onClick={() => { handleAddNewSubcategory((contextMenu.item as ResourceCategory).id); setContextMenu(null); }}>
                    New Subcategory
                </Button>
            )}
            <Button variant="ghost" className="w-full h-9 justify-start px-2" onClick={() => {
                if (contextMenu.type === 'category') setEditingCategory(contextMenu.item as ResourceCategory);
                else setEditingSubcategory(contextMenu.item as ResourceSubcategory);
                setContextMenu(null);
            }}>
                Rename
            </Button>
            <Button variant="ghost" className="w-full h-9 justify-start px-2 text-destructive hover:text-destructive" onClick={() => {
                setDeleteConfirmation({ type: contextMenu.type, item: contextMenu.item });
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
                        if (deleteConfirmation.type === 'category') handleDeleteCategory(deleteConfirmation.item.id);
                        else handleDeleteSubcategory(deleteConfirmation.item.id);
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
                <DialogDescription>Update the details or move this resource to a new category.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="res-name" className="text-right">Name</Label>
                    <Input id="res-name" value={editedResourceData.name || ''} onChange={(e) => handleResourceDataChange('name', e.target.value)} className="col-span-3"/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="res-link" className="text-right">Link</Label>
                    <Input id="res-link" value={editedResourceData.link || ''} onChange={(e) => handleResourceDataChange('link', e.target.value)} className="col-span-3"/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="res-desc" className="text-right">Description</Label>
                    <Textarea id="res-desc" value={editedResourceData.description || ''} onChange={(e) => handleResourceDataChange('description', e.target.value)} className="col-span-3"/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="res-cat" className="text-right">Category</Label>
                    <Select value={editedResourceData.categoryId || ''} onValueChange={(value) => handleResourceDataChange('categoryId', value)}>
                        <SelectTrigger id="res-cat" className="col-span-3">
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {resourceCategories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="res-subcat" className="text-right">Subcategory</Label>
                    <Select value={editedResourceData.subcategoryId || 'none'} onValueChange={(value) => handleResourceDataChange('subcategoryId', value)} disabled={!editedResourceData.categoryId}>
                        <SelectTrigger id="res-subcat" className="col-span-3">
                            <SelectValue placeholder="Select (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">-- Main Category --</SelectItem>
                            {subcategoriesForSelectedCategoryInDialog.map(sub => (
                                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                            ))}
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
    </>
  );
}

export default function ResourcesPage() {
    return <AuthGuard><ResourcesPageContent /></AuthGuard>;
}

