import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Save, Trash2, Edit, FileText } from 'lucide-react';
import { toast } from 'sonner';

export function TemplateManager() {
  const { 
    savedTemplates, 
    promptTemplate, 
    addTemplate, 
    updateTemplate, 
    deleteTemplate, 
    loadTemplate 
  } = useAppStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !promptTemplate.trim()) {
      toast.error('Enter template name and prompt');
      return;
    }

    if (editingTemplate) {
      updateTemplate(editingTemplate, { name: templateName.trim() });
      toast.success('Template updated');
    } else {
      addTemplate({
        name: templateName.trim(),
        content: promptTemplate,
      });
      toast.success('Template saved');
    }

    setTemplateName('');
    setEditingTemplate(null);
    setIsDialogOpen(false);
  };

  const handleEditTemplate = (templateId: string) => {
    const template = savedTemplates.find(t => t.id === templateId);
    if (template) {
      setTemplateName(template.name);
      setEditingTemplate(templateId);
      setIsDialogOpen(true);
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    loadTemplate(templateId);
    toast.success('Template loaded');
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Delete this template?')) {
      deleteTemplate(templateId);
      toast.success('Template deleted');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S to save template
      if (event.ctrlKey && event.key === 's' && promptTemplate.trim()) {
        event.preventDefault();
        if (!isDialogOpen) {
          setIsDialogOpen(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [promptTemplate, isDialogOpen]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Template Manager</span>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save
                <kbd className="ml-2">Ctrl+S</kbd>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? 'Edit Template' : 'Save Template'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Template name</label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Live info search"
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsDialogOpen(false);
                      setTemplateName('');
                      setEditingTemplate(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTemplate}>
                    {editingTemplate ? 'Update' : 'Save'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {savedTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No templates saved</p>
            <p className="text-sm">Enter a prompt and save it</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        {template.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(template.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(template.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLoadTemplate(template.id)}
                            className="h-8 w-8 p-0"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTemplate(template.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total {savedTemplates.length} templates</span>
              <Badge variant="outline">
                Up to 100 templates
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
