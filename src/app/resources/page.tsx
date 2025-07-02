
"use client";

import React, { useState, useMemo, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Library, Folder, Link as LinkIcon, Edit, Save, X, ExternalLink } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  
  // State for editing a resource
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editedResourceData, setEditedResourceData] = useState<Partial<Resource>>({});

  useEffect(() => {
    if (editingResource) {
        setEditedResourceData(editingResource);
    }
  }, [editingResource]);

  const filteredResources = useMemo(() => {
    if (!selectedCategoryId) return [];
    let filtered = resources.filter(r => r.categoryId === selectedCategoryId);
    if (selectedSubcategoryId) {
        return filtered.filter(r => r.subcategoryId === selectedSubcategoryId);
    }
    // Show resources in the main category that don't have a subcategory
    return filtered.filter(r => !r.subcategoryId);
  }, [resources, selectedCategoryId, selectedSubcategoryId]);

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
        icon: 'Folder', // Default icon
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
  
  const handleSaveCategory = () => {
    if (!editingCategory || !editingCategory.name.trim()) return;
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
    setEditingSubcategory(newSub); // Enter edit mode immediately
  };

  const handleDeleteSubcategory = (subcategoryId: string) => {
    setResourceSubcategories(prev => prev.filter(sc => sc.id !== subcategoryId));
    setResources(prev => prev.filter(r => r.subcategoryId !== subcategoryId));
    if (selectedSubcategoryId === subcategoryId) {
        setSelectedSubcategoryId(null);
    }
    toast({ title: "Subcategory Deleted", description: "The subcategory and its resources have been removed." });
  };

  const handleSaveSubcategory = () => {
    if (!editingSubcategory || !editingSubcategory.name.trim()) return;
    setResourceSubcategories(prev => prev.map(sc => sc.id === editingSubcategory.id ? editingSubcategory : sc));
    setEditingSubcategory(null);
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
    const newRes: Resource = {
        id: `res_${Date.now()}`,
        name: newResource.name.trim(),
        link: newResource.link.trim(),
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
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
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
                  <li key={cat.id} className="group">
                    {editingCategory?.id === cat.id ? (
                      <div className="flex gap-2 items-center">
                        <Input value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} className="h-8"/>
                        <Button size="icon" onClick={handleSaveCategory} className="h-8 w-8"><Save className="h-4 w-4"/></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingCategory(null)} className="h-8 w-8"><X className="h-4 w-4"/></Button>
                      </div>
                    ) : (
                      <div className={cn("flex justify-between items-center rounded-md hover:bg-muted", selectedCategoryId === cat.id && "bg-muted")}>
                        <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => handleSelectCategory(cat.id)}>
                          <Folder className="h-4 w-4"/> {cat.name}
                        </Button>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleAddNewSubcategory(cat.id)}><PlusCircle className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCategory(cat)}><Edit className="h-4 w-4"/></Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete Category?</AlertDialogTitle><AlertDialogDescription>This will delete "{cat.name}" and all its subcategories and resources. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteCategory(cat.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                      </div>
                    )}
                    {selectedCategoryId === cat.id && (
                        <div className="pl-4 mt-2">
                           <ul className="space-y-1">
                                {resourceSubcategories.filter(sc => sc.categoryId === cat.id).map(sub => (
                                    <li key={sub.id} className="group/sub">
                                        {editingSubcategory?.id === sub.id ? (
                                            <div className="flex gap-2 items-center">
                                                <Input value={editingSubcategory.name} onChange={e => setEditingSubcategory({...editingSubcategory, name: e.target.value})} className="h-8"/>
                                                <Button size="icon" onClick={handleSaveSubcategory} className="h-8 w-8"><Save className="h-4 w-4"/></Button>
                                                <Button size="icon" variant="ghost" onClick={() => setEditingSubcategory(null)} className="h-8 w-8"><X className="h-4 w-4"/></Button>
                                            </div>
                                        ) : (
                                            <div className={cn("flex justify-between items-center rounded-md hover:bg-muted/50", selectedSubcategoryId === sub.id && "bg-muted/50")}>
                                                <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => setSelectedSubcategoryId(sub.id)}>
                                                    <Folder className="h-4 w-4"/> {sub.name}
                                                </Button>
                                                <div className="flex items-center opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSubcategory(sub)}><Edit className="h-3 w-3"/></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3"/></Button></AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Delete Subcategory?</AlertDialogTitle><AlertDialogDescription>This will delete "{sub.name}" and all its resources.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteSubcategory(sub.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
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
                  <Input value={newResource.link} onChange={e => setNewResource({...newResource, link: e.target.value})} placeholder="URL (e.g., https://fonts.google.com)" disabled={!selectedCategoryId} />
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
