'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Search, FileText, Upload, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

export function TemplatesPanel() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const formEntries = Object.fromEntries(formData.entries());
    
    const data: Record<string, any> = { ...formEntries };
    
    // Parse arrays
    data.requiredFields = (formEntries.requiredFields as string).split(',').map(s => s.trim()).filter(Boolean);
    data.writingTips = (formEntries.writingTips as string).split('\n').map(s => s.trim()).filter(Boolean);
    data.commonMistakes = (formEntries.commonMistakes as string).split('\n').map(s => s.trim()).filter(Boolean);
    data.isPremium = formEntries.isPremium === 'true';
    
    // Create/update logic here. We use the same API for simplicity
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/admin/crud/documentTemplate?id=${editing.id}` : '/api/templates'; // For creation we can use /api/templates
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (res.ok) {
        toast({ title: 'Success', description: 'Template saved.' });
        setShowForm(false);
        fetchTemplates();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const res = await fetch(`/api/admin/crud/documentTemplate?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Deleted', description: 'Template deleted.' });
        fetchTemplates();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
    }
  };

  const filtered = templates.filter(t => t.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Document Templates</h2>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Template
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-card p-2 rounded-lg border">
        <Search className="h-4 w-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Search templates..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 shadow-none focus-visible:ring-0" 
        />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Premium</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8">No templates found</td></tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${t.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{t.isPremium ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setShowForm(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Template' : 'Add Template'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input name="title" defaultValue={editing?.title} required />
                </div>
                <div className="space-y-2">
                  <Label>Slug *</Label>
                  <Input name="slug" defaultValue={editing?.slug} required />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Excerpt</Label>
                <Textarea name="excerpt" defaultValue={editing?.excerpt} />
              </div>
              
              <div className="space-y-2">
                <Label>Template Content (Text/Markdown)</Label>
                <Textarea name="content" defaultValue={editing?.content} rows={10} className="font-mono text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Required Fields (comma separated)</Label>
                  <Input name="requiredFields" defaultValue={editing?.requiredFields?.join(', ')} placeholder="University Name, Degree, Date" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select name="status" defaultValue={editing?.status || 'published'} className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Writing Tips (one per line)</Label>
                  <Textarea name="writingTips" defaultValue={editing?.writingTips?.join('\n')} rows={4} />
                </div>
                <div className="space-y-2">
                  <Label>Common Mistakes (one per line)</Label>
                  <Textarea name="commonMistakes" defaultValue={editing?.commonMistakes?.join('\n')} rows={4} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Save Template</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
