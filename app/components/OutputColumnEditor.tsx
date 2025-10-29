import { useMemo, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { OutputColumn } from '../types';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

// Nested column section
function NestedColumnSection({ column, columnIndex, onUpdate }: { column: OutputColumn; columnIndex: number; onUpdate: (updates: Partial<OutputColumn>) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNestedColumn, setNewNestedColumn] = useState<OutputColumn>({
    name: '',
    description: '',
    type: 'string',
  });
  const nestedSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const nestedIds = useMemo(
    () => (column.nestedColumns || []).map((_, i) => `nested-${columnIndex}-${i}`),
    [column.nestedColumns, columnIndex]
  );

  const addNestedColumn = () => {
    if (newNestedColumn.name.trim()) {
      const currentNested = column.nestedColumns || [];
      onUpdate({ nestedColumns: [...currentNested, newNestedColumn] });
      setNewNestedColumn({ name: '', description: '', type: 'string' });
      setIsAdding(false);
    }
  };

  const updateNestedColumn = (index: number, updates: Partial<OutputColumn>) => {
    const currentNested = column.nestedColumns || [];
    const updated = currentNested.map((col, i) => i === index ? { ...col, ...updates } : col);
    onUpdate({ nestedColumns: updated });
  };

  const deleteNestedColumn = (index: number) => {
    const currentNested = column.nestedColumns || [];
    const updated = currentNested.filter((_, i) => i !== index);
    onUpdate({ nestedColumns: updated });
  };

  if (column.type !== 'object' && column.type !== 'array') {
    return null;
  }

  return (
    <div className="ml-8 mt-2 space-y-2 border-l-2 pl-4 border-muted">
      <div className="text-xs font-medium text-muted-foreground">
        {column.type === 'object' ? 'Object properties' : 'Array elements'}
      </div>
      
      <DndContext
        sensors={nestedSensors}
        onDragEnd={({ active, over }) => {
          if (!over || active.id === over.id) return;
          const from = nestedIds.indexOf(String(active.id));
          const to = nestedIds.indexOf(String(over.id));
          if (from === -1 || to === -1) return;
          const next = arrayMove(column.nestedColumns || [], from, to);
          onUpdate({ nestedColumns: next });
        }}
      >
        <SortableContext items={nestedIds} strategy={verticalListSortingStrategy}>
          {(column.nestedColumns || []).map((nestedCol, nestedIndex) => (
            <SortableRow key={nestedIds[nestedIndex]} id={nestedIds[nestedIndex]}
              children={({ attributes, listeners, setNodeRef, style }) => (
                <div ref={setNodeRef} style={style} {...attributes} className="flex items-start gap-2 p-2 border rounded bg-background">
                  <div className="mt-1 cursor-grab select-none" {...listeners} title="Drag to reorder">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <Input
                        value={nestedCol.name}
                        onChange={(e) => updateNestedColumn(nestedIndex, { name: e.target.value })}
                        placeholder="Column name"
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="col-span-3">
                      <Select
                        value={nestedCol.type || 'string'}
                        onValueChange={(value) => updateNestedColumn(nestedIndex, { type: value as any })}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">string</SelectItem>
                          <SelectItem value="number">number</SelectItem>
                          <SelectItem value="boolean">boolean</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        value={nestedCol.description || ''}
                        onChange={(e) => updateNestedColumn(nestedIndex, { description: e.target.value })}
                        placeholder="Description"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNestedColumn(nestedIndex)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            />
          ))}
        </SortableContext>
      </DndContext>
      
      {isAdding ? (
        <div className="p-2 border rounded bg-muted/50 space-y-2">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-5">
              <Input
                value={newNestedColumn.name}
                onChange={(e) => setNewNestedColumn({ ...newNestedColumn, name: e.target.value })}
                placeholder="カラム名"
                className="font-mono text-xs h-8"
              />
            </div>
            
            <div className="col-span-3">
              <Select
                value={newNestedColumn.type || 'string'}
                onValueChange={(value) => setNewNestedColumn({ ...newNestedColumn, type: value as any })}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">string</SelectItem>
                  <SelectItem value="number">number</SelectItem>
                  <SelectItem value="boolean">boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-3">
              <Input
                value={newNestedColumn.description || ''}
                onChange={(e) => setNewNestedColumn({ ...newNestedColumn, description: e.target.value })}
                placeholder="説明"
                className="text-xs h-8"
              />
            </div>
            
            <div className="col-span-1 flex gap-1">
              <Button
                variant="default"
                size="icon"
                onClick={addNestedColumn}
                className="h-8 w-8"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsAdding(false);
              setNewNestedColumn({ name: '', description: '', type: 'string' });
            }}
            className="w-full h-8 text-xs"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="w-full h-8 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          {column.type === 'array' ? 'Add array element' : 'Add property'}
        </Button>
      )}
    </div>
  );
}

function SortableRow({ id, children }: { id: string; children: (dragProps: { attributes: any; listeners: any; setNodeRef: (node: HTMLElement | null) => void; style: React.CSSProperties }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <>
      {children({ attributes, listeners, setNodeRef, style })}
    </>
  );
}

export function OutputColumnEditor() {
  const { outputColumns, addOutputColumn, updateOutputColumn, deleteOutputColumn, setOutputColumns } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const ids = useMemo(() => outputColumns.map((_, i) => `col-${i}`), [outputColumns]);
  const [newColumn, setNewColumn] = useState<OutputColumn>({
    name: '',
    description: '',
    type: 'string',
  });
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const handleAddColumn = () => {
    if (newColumn.name.trim()) {
      addOutputColumn(newColumn);
      setNewColumn({ name: '', description: '', type: 'string' });
      setIsAdding(false);
    }
  };

  const handleUpdateColumn = (index: number, updates: Partial<OutputColumn>) => {
    updateOutputColumn(index, updates);
  };

  const handleDeleteColumn = (index: number) => {
    deleteOutputColumn(index);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    const next = arrayMove(outputColumns, from, to);
    setOutputColumns(next);
  };

  // Generate schema recursively
  const generateSchema = (columns: OutputColumn[], indent = 2): string => {
    return columns.map(col => {
      const indentStr = ' '.repeat(indent);
      const desc = col.description ? ` // ${col.description}` : '';
      const type = col.type || 'string';
      const typeStr = type === 'string' ? 'string' : type === 'number' ? 'number' : type === 'boolean' ? 'boolean' : type;
      
      if (type === 'object' && col.nestedColumns && col.nestedColumns.length > 0) {
        // Nested object
        const nestedSchema = generateSchema(col.nestedColumns, indent + 2);
        return `${indentStr}"${col.name}": {\n${nestedSchema}\n${indentStr}}${desc}`;
      } else if (type === 'array' && col.nestedColumns && col.nestedColumns.length > 0) {
        // Object inside array
        const nestedSchema = generateSchema(col.nestedColumns, indent + 2);
        return `${indentStr}"${col.name}": [\n${indentStr}  {\n${nestedSchema}\n${indentStr}  }\n${indentStr}]${desc}`;
      } else {
        return `${indentStr}"${col.name}": ${typeStr}${desc}`;
      }
    }).join(',\n');
  };

  const exportToPrompt = () => {
    if (outputColumns.length === 0) return '';
    
    const schema = generateSchema(outputColumns);
    return `\n\n[Output schema]\nPlease output in the following JSON structure:\n{\n${schema}\n}`;
  };

  const previewPrompt = outputColumns.length > 0 
    ? `Prompt content...${exportToPrompt()}`
    : 'Please add columns';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Output Columns</span>
          <div className="flex items-center gap-2">
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Import JSON</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import JSON schema or sample</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <Textarea
                    value={importText}
                    onChange={(e) => { setImportText(e.target.value); setImportError(null); }}
                    placeholder='{"title":"string","price":0,"inStock":true,"meta":{"brand":"string"},"items":[{"name":"string"}]}'
                    className="h-48 text-xs font-mono"
                  />
                  {importError && (
                    <div className="text-xs text-destructive">{importError}</div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => { setIsImportOpen(false); setImportText(''); setImportError(null); }}>Cancel</Button>
                  <Button onClick={() => {
                    try {
                      const parsed = JSON.parse(importText);
                      const toColumns = (val: any, key?: string): OutputColumn[] => {
                        const inferType = (v: any): OutputColumn['type'] => {
                          if (v === null || v === undefined) return 'string';
                          if (Array.isArray(v)) return 'array';
                          switch (typeof v) {
                            case 'string': return 'string';
                            case 'number': return 'number';
                            case 'boolean': return 'boolean';
                            case 'object': return 'object';
                            default: return 'string';
                          }
                        };

                        const buildFromObject = (obj: Record<string, any>): OutputColumn[] => {
                          return Object.keys(obj).map((k) => {
                            const t = inferType(obj[k]);
                            if (t === 'object') {
                              return {
                                name: k,
                                type: 'object',
                                nestedColumns: toColumns(obj[k])
                              } as OutputColumn;
                            }
                            if (t === 'array') {
                              const arr = Array.isArray(obj[k]) ? obj[k] : [];
                              const first = arr.find((x: any) => x && typeof x === 'object') ?? arr[0];
                              return {
                                name: k,
                                type: 'array',
                                nestedColumns: first && typeof first === 'object' && !Array.isArray(first)
                                  ? toColumns(first)
                                  : undefined,
                              } as OutputColumn;
                            }
                            return { name: k, type: t } as OutputColumn;
                          });
                        };

                        if (Array.isArray(val)) {
                          const first = val.find((x) => x !== null && x !== undefined);
                          if (first && typeof first === 'object' && !Array.isArray(first)) {
                            return buildFromObject(first as Record<string, any>);
                          }
                          return [{ name: key ?? 'items', type: 'array' }];
                        }
                        if (typeof val === 'object' && val) {
                          return buildFromObject(val as Record<string, any>);
                        }
                        return [{ name: key ?? 'value', type: inferType(val) }];
                      };

                      const newCols = toColumns(parsed);
                      setOutputColumns(newCols);
                      setIsImportOpen(false);
                      setImportText('');
                      setImportError(null);
                    } catch (e: any) {
                      setImportError(e?.message ?? 'Invalid JSON');
                    }
                  }}>Import</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Badge variant="secondary">{outputColumns.length} columns</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Columns */}
        <div className="space-y-2">
          {outputColumns.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Please add columns to output</p>
              <p className="text-sm mt-1">Define the JSON structure with your columns</p>
            </div>
          )}
          
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {outputColumns.map((column, index) => (
                <SortableRow key={ids[index]} id={ids[index]}
                  children={({ attributes, listeners, setNodeRef, style }) => (
                    <div className="space-y-2">
                      <div ref={setNodeRef} style={style} {...attributes} className="flex items-start gap-2 p-3 border rounded-lg bg-muted/50">
                        <div className="mt-2 cursor-grab select-none" {...listeners} title="Drag to reorder">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 grid grid-cols-12 gap-2">
                          <div className="col-span-5">
                            <Input
                              value={column.name}
                              onChange={(e) => handleUpdateColumn(index, { name: e.target.value })}
                              placeholder="Column name"
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="col-span-3">
                            <Select
                              value={column.type || 'string'}
                              onValueChange={(value) => handleUpdateColumn(index, { type: value as any })}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="string">string</SelectItem>
                                <SelectItem value="number">number</SelectItem>
                                <SelectItem value="boolean">boolean</SelectItem>
                                <SelectItem value="object">object</SelectItem>
                                <SelectItem value="array">array</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Input
                              value={column.description || ''}
                              onChange={(e) => handleUpdateColumn(index, { description: e.target.value })}
                              placeholder="Description (optional)"
                              className="text-xs"
                            />
                          </div>
                          <div className="col-span-1 flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteColumn(index)}
                              className="h-8 w-8"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      {(column.type === 'object' || column.type === 'array') && (
                        <NestedColumnSection
                          column={column}
                          columnIndex={index}
                          onUpdate={(updates) => handleUpdateColumn(index, updates)}
                        />
                      )}
                    </div>
                  )}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* 追加フォーム */}
        {isAdding ? (
          <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-5">
                <Input
                  value={newColumn.name}
                  onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                  placeholder="カラム名"
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="col-span-3">
                <Select
                  value={newColumn.type || 'string'}
                  onValueChange={(value) => setNewColumn({ ...newColumn, type: value as any })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">string</SelectItem>
                    <SelectItem value="number">number</SelectItem>
                    <SelectItem value="boolean">boolean</SelectItem>
                    <SelectItem value="object">object</SelectItem>
                    <SelectItem value="array">array</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-3">
                <Input
                  value={newColumn.description || ''}
                  onChange={(e) => setNewColumn({ ...newColumn, description: e.target.value })}
                  placeholder="説明（オプション）"
                  className="text-xs"
                />
              </div>
              
              <div className="col-span-1 flex gap-1">
                <Button
                  variant="default"
                  size="icon"
                  onClick={handleAddColumn}
                  className="h-8 w-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewColumn({ name: '', description: '', type: 'string' });
              }}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setIsAdding(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add column
          </Button>
        )}

        {/* Preview */}
        {outputColumns.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Output schema preview</div>
            <div className="p-3 border rounded-lg bg-muted/50">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {exportToPrompt()}
              </pre>
            </div>
              <div className="text-xs text-muted-foreground">
              This schema is automatically appended to the prompt
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
