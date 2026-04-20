---
name: form-builder
description: Dynamic form builder skill for creating drag-and-drop form editors, conditional logic, validation, and form rendering. Use when implementing guest forms, surveys, or any customizable form system.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Forms Skill

This skill helps you build dynamic, customizable forms with drag-and-drop editing.

## Tech Stack Context

- **Drag & Drop**: @dnd-kit
- **Form Handling**: React Hook Form + Zod
- **UI Components**: shadcn/ui
- **State**: Zustand (for builder state)

## Field Types

### Core Field Types

```typescript
type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'time'
  | 'datetime'
  | 'file'
  | 'signature';

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  order: number;

  // Type-specific options
  options?: { label: string; value: string }[]; // For select, radio, multiselect
  validation?: FieldValidation;
  conditions?: FieldCondition[];

  // File specific
  acceptedFileTypes?: string[];
  maxFileSize?: number;

  // Styling
  width?: 'full' | 'half';
}

interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
}

interface FieldCondition {
  fieldId: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  value: string | number | boolean;
}
```

## Forms Component

### Builder Store

```typescript
// stores/form-builder-store.ts
import { create } from 'zustand';
import { nanoid } from 'nanoid';

interface FormBuilderState {
  fields: FormField[];
  activeFieldId: string | null;
  isDirty: boolean;

  // Actions
  addField: (type: FieldType) => void;
  removeField: (id: string) => void;
  updateField: (id: string, updates: Partial<FormField>) => void;
  reorderFields: (activeId: string, overId: string) => void;
  setActiveField: (id: string | null) => void;
  loadForm: (fields: FormField[]) => void;
  reset: () => void;
}

export const useFormBuilderStore = create<FormBuilderState>((set) => ({
  fields: [],
  activeFieldId: null,
  isDirty: false,

  addField: (type) =>
    set((state) => ({
      fields: [
        ...state.fields,
        {
          id: nanoid(),
          type,
          label: getDefaultLabel(type),
          placeholder: '',
          required: false,
          order: state.fields.length,
        },
      ],
      isDirty: true,
    })),

  removeField: (id) =>
    set((state) => ({
      fields: state.fields.filter((f) => f.id !== id),
      activeFieldId: state.activeFieldId === id ? null : state.activeFieldId,
      isDirty: true,
    })),

  updateField: (id, updates) =>
    set((state) => ({
      fields: state.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      isDirty: true,
    })),

  reorderFields: (activeId, overId) =>
    set((state) => {
      const oldIndex = state.fields.findIndex((f) => f.id === activeId);
      const newIndex = state.fields.findIndex((f) => f.id === overId);
      const newFields = arrayMove(state.fields, oldIndex, newIndex);
      return {
        fields: newFields.map((f, i) => ({ ...f, order: i })),
        isDirty: true,
      };
    }),

  setActiveField: (id) => set({ activeFieldId: id }),

  loadForm: (fields) => set({ fields, isDirty: false }),

  reset: () => set({ fields: [], activeFieldId: null, isDirty: false }),
}));

function getDefaultLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    text: 'Text Field',
    email: 'Email',
    phone: 'Phone Number',
    number: 'Number',
    textarea: 'Long Text',
    select: 'Dropdown',
    multiselect: 'Multiple Choice',
    checkbox: 'Checkbox',
    radio: 'Radio Group',
    date: 'Date',
    time: 'Time',
    datetime: 'Date & Time',
    file: 'File Upload',
    signature: 'Signature',
  };
  return labels[type];
}
```

### Drag & Drop Forms

```tsx
// components/form-builder/form-builder.tsx
'use client';

import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useFormBuilderStore } from '@/stores/form-builder-store';
import { FieldPalette } from './field-palette';
import { SortableField } from './sortable-field';
import { FieldEditor } from './field-editor';

export function FormBuilder() {
  const { fields, activeFieldId, reorderFields } = useFormBuilderStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fieldIds = useMemo(() => fields.map((f) => f.id), [fields]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderFields(active.id as string, over.id as string);
    }
  };

  return (
    <div className="grid h-[calc(100vh-200px)] grid-cols-12 gap-6">
      {/* Field Palette */}
      <div className="col-span-3 overflow-y-auto rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">Add Fields</h3>
        <FieldPalette />
      </div>

      {/* Form Canvas */}
      <div className="bg-muted/30 col-span-5 overflow-y-auto rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">Form Preview</h3>

        {fields.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground">Click a field type to add it to your form</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {fields.map((field) => (
                  <SortableField key={field.id} field={field} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Field Editor */}
      <div className="col-span-4 overflow-y-auto rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">Field Settings</h3>
        {activeFieldId ? (
          <FieldEditor fieldId={activeFieldId} />
        ) : (
          <p className="text-muted-foreground text-sm">Select a field to edit its properties</p>
        )}
      </div>
    </div>
  );
}
```

### Sortable Field Component

```tsx
// components/form-builder/sortable-field.tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormBuilderStore } from '@/stores/form-builder-store';
import { Button } from '@/components/ui/button';
import { FieldPreview } from './field-preview';

interface SortableFieldProps {
  field: FormField;
}

export function SortableField({ field }: SortableFieldProps) {
  const { activeFieldId, setActiveField, removeField } = useFormBuilderStore();
  const isActive = activeFieldId === field.id;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-card relative cursor-pointer rounded-lg border p-4 transition-all',
        isActive && 'ring-primary ring-2',
        isDragging && 'opacity-50'
      )}
      onClick={() => setActiveField(field.id)}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-1/2 left-2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="text-muted-foreground h-5 w-5" />
      </button>

      {/* Field Preview */}
      <div className="pr-8 pl-6">
        <FieldPreview field={field} disabled />
      </div>

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          removeField(field.id);
        }}
      >
        <Trash2 className="text-destructive h-4 w-4" />
      </Button>
    </div>
  );
}
```

### Field Palette

```tsx
// components/form-builder/field-palette.tsx
'use client';

import {
  Type,
  Mail,
  Phone,
  Hash,
  AlignLeft,
  ChevronDown,
  CheckSquare,
  Circle,
  Calendar,
  Clock,
  Upload,
  PenTool,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormBuilderStore } from '@/stores/form-builder-store';

const FIELD_TYPES = [
  { type: 'text' as const, label: 'Text', icon: Type },
  { type: 'email' as const, label: 'Email', icon: Mail },
  { type: 'phone' as const, label: 'Phone', icon: Phone },
  { type: 'number' as const, label: 'Number', icon: Hash },
  { type: 'textarea' as const, label: 'Long Text', icon: AlignLeft },
  { type: 'select' as const, label: 'Dropdown', icon: ChevronDown },
  { type: 'checkbox' as const, label: 'Checkbox', icon: CheckSquare },
  { type: 'radio' as const, label: 'Radio', icon: Circle },
  { type: 'date' as const, label: 'Date', icon: Calendar },
  { type: 'time' as const, label: 'Time', icon: Clock },
  { type: 'file' as const, label: 'File Upload', icon: Upload },
  { type: 'signature' as const, label: 'Signature', icon: PenTool },
];

export function FieldPalette() {
  const addField = useFormBuilderStore((s) => s.addField);

  return (
    <div className="grid grid-cols-2 gap-2">
      {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
        <Button
          key={type}
          variant="outline"
          className="h-auto flex-col gap-2 py-3"
          onClick={() => addField(type)}
        >
          <Icon className="h-5 w-5" />
          <span className="text-xs">{label}</span>
        </Button>
      ))}
    </div>
  );
}
```

### Field Editor

```tsx
// components/form-builder/field-editor.tsx
'use client';

import { useFormBuilderStore } from '@/stores/form-builder-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { OptionsEditor } from './options-editor';
import { ValidationEditor } from './validation-editor';
import { ConditionsEditor } from './conditions-editor';

interface FieldEditorProps {
  fieldId: string;
}

export function FieldEditor({ fieldId }: FieldEditorProps) {
  const { fields, updateField } = useFormBuilderStore();
  const field = fields.find((f) => f.id === fieldId);

  if (!field) return null;

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="label">Label</Label>
          <Input
            id="label"
            value={field.label}
            onChange={(e) => updateField(fieldId, { label: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="placeholder">Placeholder</Label>
          <Input
            id="placeholder"
            value={field.placeholder || ''}
            onChange={(e) => updateField(fieldId, { placeholder: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Help Text</Label>
          <Textarea
            id="description"
            value={field.description || ''}
            onChange={(e) => updateField(fieldId, { description: e.target.value })}
            rows={2}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="required">Required</Label>
          <Switch
            id="required"
            checked={field.required}
            onCheckedChange={(checked) => updateField(fieldId, { required: checked })}
          />
        </div>
      </div>

      {/* Options for select/radio/checkbox */}
      {['select', 'radio', 'multiselect'].includes(field.type) && (
        <>
          <Separator />
          <OptionsEditor
            options={field.options || []}
            onChange={(options) => updateField(fieldId, { options })}
          />
        </>
      )}

      {/* Validation Rules */}
      <Separator />
      <ValidationEditor
        field={field}
        onChange={(validation) => updateField(fieldId, { validation })}
      />

      {/* Conditional Logic */}
      <Separator />
      <ConditionsEditor
        fieldId={fieldId}
        conditions={field.conditions || []}
        onChange={(conditions) => updateField(fieldId, { conditions })}
      />
    </div>
  );
}
```

## Form Renderer

### Dynamic Form Component

```tsx
// components/form-renderer/form-renderer.tsx
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateFormSchema, generateDefaultValues } from '@/lib/form-utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface FormRendererProps {
  fields: FormField[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  submitLabel?: string;
}

export function FormRenderer({ fields, onSubmit, submitLabel = 'Submit' }: FormRendererProps) {
  const schema = generateFormSchema(fields);
  const defaultValues = generateDefaultValues(fields);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const watchedValues = watch();

  // Filter visible fields based on conditions
  const visibleFields = fields.filter((field) =>
    evaluateConditions(field.conditions, watchedValues, fields)
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {visibleFields.map((field) => (
        <div key={field.id} className={field.width === 'half' ? 'w-1/2' : 'w-full'}>
          <Label htmlFor={field.id} className="mb-2 flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>

          {renderField(field, register, control, errors)}

          {field.description && (
            <p className="text-muted-foreground mt-1 text-sm">{field.description}</p>
          )}
          {errors[field.id] && (
            <p className="text-destructive mt-1 text-sm">{errors[field.id]?.message as string}</p>
          )}
        </div>
      ))}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Submitting...' : submitLabel}
      </Button>
    </form>
  );
}

function renderField(field: FormField, register: any, control: any, errors: any) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      return (
        <Input
          id={field.id}
          type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
          placeholder={field.placeholder}
          {...register(field.id)}
          className={errors[field.id] ? 'border-destructive' : ''}
        />
      );

    case 'number':
      return (
        <Input
          id={field.id}
          type="number"
          placeholder={field.placeholder}
          {...register(field.id, { valueAsNumber: true })}
          className={errors[field.id] ? 'border-destructive' : ''}
        />
      );

    case 'textarea':
      return (
        <Textarea
          id={field.id}
          placeholder={field.placeholder}
          {...register(field.id)}
          className={errors[field.id] ? 'border-destructive' : ''}
        />
      );

    case 'select':
      return (
        <Controller
          name={field.id}
          control={control}
          render={({ field: { onChange, value } }) => (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger id={field.id}>
                <SelectValue placeholder={field.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      );

    case 'checkbox':
      return (
        <Controller
          name={field.id}
          control={control}
          render={({ field: { onChange, value } }) => (
            <div className="flex items-center space-x-2">
              <Checkbox id={field.id} checked={value} onCheckedChange={onChange} />
              <Label htmlFor={field.id} className="font-normal">
                {field.placeholder || 'Yes'}
              </Label>
            </div>
          )}
        />
      );

    case 'radio':
      return (
        <Controller
          name={field.id}
          control={control}
          render={({ field: { onChange, value } }) => (
            <RadioGroup value={value} onValueChange={onChange}>
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                  <Label htmlFor={`${field.id}-${option.value}`} className="font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        />
      );

    case 'date':
      return (
        <Input
          id={field.id}
          type="date"
          {...register(field.id)}
          className={errors[field.id] ? 'border-destructive' : ''}
        />
      );

    default:
      return <Input id={field.id} {...register(field.id)} />;
  }
}
```

### Schema Generation

```typescript
// lib/form-utils.ts
import { z } from 'zod';

export function generateFormSchema(fields: FormField[]): z.ZodSchema {
  const shape: Record<string, z.ZodType> = {};

  for (const field of fields) {
    let fieldSchema: z.ZodType;

    switch (field.type) {
      case 'email':
        fieldSchema = z.string().email('Please enter a valid email');
        break;
      case 'phone':
        fieldSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number');
        break;
      case 'number':
        fieldSchema = z.number();
        if (field.validation?.min !== undefined) {
          fieldSchema = (fieldSchema as z.ZodNumber).min(field.validation.min);
        }
        if (field.validation?.max !== undefined) {
          fieldSchema = (fieldSchema as z.ZodNumber).max(field.validation.max);
        }
        break;
      case 'checkbox':
        fieldSchema = z.boolean();
        break;
      case 'date':
        fieldSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
          message: 'Please enter a valid date',
        });
        break;
      default:
        fieldSchema = z.string();
        if (field.validation?.minLength) {
          fieldSchema = (fieldSchema as z.ZodString).min(
            field.validation.minLength,
            `Must be at least ${field.validation.minLength} characters`
          );
        }
        if (field.validation?.maxLength) {
          fieldSchema = (fieldSchema as z.ZodString).max(
            field.validation.maxLength,
            `Must be no more than ${field.validation.maxLength} characters`
          );
        }
        if (field.validation?.pattern) {
          fieldSchema = (fieldSchema as z.ZodString).regex(
            new RegExp(field.validation.pattern),
            field.validation.patternMessage || 'Invalid format'
          );
        }
    }

    if (!field.required) {
      fieldSchema = fieldSchema.optional();
    }

    shape[field.id] = fieldSchema;
  }

  return z.object(shape);
}

export function generateDefaultValues(fields: FormField[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const field of fields) {
    switch (field.type) {
      case 'checkbox':
        defaults[field.id] = false;
        break;
      case 'number':
        defaults[field.id] = undefined;
        break;
      default:
        defaults[field.id] = '';
    }
  }

  return defaults;
}

export function evaluateConditions(
  conditions: FieldCondition[] | undefined,
  values: Record<string, unknown>,
  allFields: FormField[]
): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every((condition) => {
    const fieldValue = values[condition.fieldId];

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'notEquals':
        return fieldValue !== condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'greaterThan':
        return Number(fieldValue) > Number(condition.value);
      case 'lessThan':
        return Number(fieldValue) < Number(condition.value);
      default:
        return true;
    }
  });
}
```

## API Integration

### Save Form Template

```typescript
// server/routers/guest-forms.ts
export const guestFormsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        name: z.string().min(2),
        fields: z.array(formFieldSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [form] = await db
        .insert(guestForms)
        .values({
          propertyId: input.propertyId,
          name: input.name,
          fields: input.fields,
          createdBy: ctx.user.id,
        })
        .returning();

      return form;
    }),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    const form = await db.query.guestForms.findFirst({
      where: eq(guestForms.id, input.id),
    });
    return form;
  }),

  submitResponse: publicProcedure
    .input(
      z.object({
        formId: z.string().uuid(),
        responses: z.record(z.unknown()),
      })
    )
    .mutation(async ({ input }) => {
      // Validate against form schema
      const form = await db.query.guestForms.findFirst({
        where: eq(guestForms.id, input.formId),
      });

      if (!form) throw new TRPCError({ code: 'NOT_FOUND' });

      const schema = generateFormSchema(form.fields);
      const validated = schema.parse(input.responses);

      // Save submission
      const [submission] = await db
        .insert(formSubmissions)
        .values({
          formId: input.formId,
          responses: validated,
        })
        .returning();

      return submission;
    }),
});
```

## Reference Documentation

- See `docs/product/user-flows.md` for guest form flows
  - See `docs/reference/feature-specifications.md` for form specs
- @dnd-kit docs: https://docs.dndkit.com/
