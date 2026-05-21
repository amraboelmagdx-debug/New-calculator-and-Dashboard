import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Save, Trash2 } from 'lucide-react';

export default function TemplatePanel({
  isDarkMode,
  scopeTemplates,
  activeTemplateId,
  onLoadTemplate,
  onOpenEdit,
  onOpenDelete,
  onOpenCreate,
  hasTemplateSaveContent,
}) {
  return (
    <div
      className={`hidden lg:block mt-3 p-3 rounded-xl border space-y-2 ${
        isDarkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white border-slate-200'
      }`}
      data-testid="template-panel"
    >
      <Label className={`text-xs font-medium ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
        Templates
      </Label>
      <Select value={activeTemplateId || undefined} onValueChange={onLoadTemplate}>
        <SelectTrigger
          className={`text-sm ${isDarkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-white border-slate-300 text-slate-700'}`}
          data-testid="template-select"
        >
          <SelectValue placeholder="Load template..." />
        </SelectTrigger>
        <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
          {scopeTemplates.map(template => (
            <SelectItem key={template.id} value={template.id} className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {activeTemplateId && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenEdit}
            disabled={!hasTemplateSaveContent}
            className={`flex-1 gap-1.5 text-xs ${isDarkMode ? 'border-neutral-700' : ''}`}
            data-testid="update-template-btn"
          >
            <Pencil className="w-3.5 h-3.5" />
            Update
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDelete}
            className={`text-rose-500 ${isDarkMode ? 'border-neutral-700' : ''}`}
            data-testid="delete-template-btn"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onOpenCreate}
        disabled={!hasTemplateSaveContent}
        className={`w-full gap-2 text-xs ${isDarkMode ? 'border-neutral-700' : ''}`}
        data-testid="save-template-btn"
      >
        <Save className="w-3.5 h-3.5" />
        Save as template
      </Button>
    </div>
  );
}
