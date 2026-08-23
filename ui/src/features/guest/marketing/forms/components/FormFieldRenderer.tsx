import { useRef, useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ImageIcon, X, AlertCircle } from 'lucide-react';
import { type UseFormRegister, type Control, type FieldErrors, Controller } from 'react-hook-form';

import type { FormField } from '@/features/guest/marketing/forms/lib/guest-forms/types';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface FormFieldRendererProps {
  field: FormField;
  register: UseFormRegister<Record<string, unknown>>;
  control: Control<Record<string, unknown>>;
  errors: FieldErrors;
  primaryColor?: string;
}

export function FormFieldRenderer({
  field,
  register,
  control,
  errors,
  primaryColor = '#0891b2',
}: FormFieldRendererProps) {
  const error = errors[field.id];
  const hasError = !!error;

  // Layout fields
  if (field.type === 'HEADING') {
    return (
      <div className="pt-2">
        <h3 className="text-foreground text-lg font-semibold">{field.label}</h3>
        {field.description && (
          <p className="text-muted-foreground mt-1 text-sm">{field.description}</p>
        )}
      </div>
    );
  }

  if (field.type === 'PARAGRAPH') {
    return (
      <p className="text-muted-foreground text-sm leading-relaxed">
        {field.description || field.label}
      </p>
    );
  }

  if (field.type === 'DIVIDER') {
    return <hr className="border-border" />;
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      <Label
        htmlFor={field.id}
        className={cn(
          'flex items-center gap-1 text-sm font-medium',
          hasError ? 'text-destructive' : 'text-foreground'
        )}
      >
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>

      {/* Field Input */}
      {renderInput(field, register, control, hasError, primaryColor)}

      {/* Description */}
      {field.description && !hasError && (
        <p className="text-muted-foreground text-xs">{field.description}</p>
      )}

      {/* Error */}
      <AnimatePresence>
        {hasError && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-destructive flex items-center gap-1 text-xs"
          >
            <AlertCircle className="h-3 w-3" />
            {(error?.message as string) || 'This field is required'}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function renderInput(
  field: FormField,
  register: UseFormRegister<Record<string, unknown>>,
  control: Control<Record<string, unknown>>,
  hasError: boolean,
  _primaryColor: string
) {
  const baseInputClass = cn(
    'border-border bg-background text-foreground rounded-xl transition-all',
    'placeholder:text-muted-foreground',
    'focus:ring-2 focus:ring-offset-0',
    hasError
      ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
      : 'focus:border-primary focus:ring-primary/20'
  );

  switch (field.type) {
    case 'TEXT':
    case 'ADDRESS':
      return (
        <Input
          id={field.id}
          type="text"
          placeholder={field.placeholder}
          className={baseInputClass}
          {...register(field.id)}
        />
      );

    case 'EMAIL':
      return (
        <Input
          id={field.id}
          type="email"
          placeholder={field.placeholder}
          className={baseInputClass}
          {...register(field.id)}
        />
      );

    case 'PHONE':
      return (
        <Input
          id={field.id}
          type="tel"
          placeholder={field.placeholder}
          className={baseInputClass}
          {...register(field.id)}
        />
      );

    case 'NUMBER':
      return (
        <Input
          id={field.id}
          type="number"
          placeholder={field.placeholder}
          className={baseInputClass}
          {...register(field.id, { valueAsNumber: true })}
        />
      );

    case 'TEXTAREA':
      return (
        <Textarea
          id={field.id}
          placeholder={field.placeholder}
          rows={4}
          className={cn(baseInputClass, 'resize-none')}
          {...register(field.id)}
        />
      );

    case 'DATE':
      return <Input id={field.id} type="date" className={baseInputClass} {...register(field.id)} />;

    case 'TIME':
      return <Input id={field.id} type="time" className={baseInputClass} {...register(field.id)} />;

    case 'DATETIME':
      return (
        <Input
          id={field.id}
          type="datetime-local"
          className={baseInputClass}
          {...register(field.id)}
        />
      );

    case 'SELECT':
      return (
        <Controller
          name={field.id}
          control={control}
          render={({ field: { onChange, value } }) => (
            <Select value={(value as string) ?? ''} onValueChange={onChange}>
              <SelectTrigger id={field.id} className={cn(baseInputClass, 'h-10 w-full')}>
                <SelectValue placeholder={field.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-24px)]">
                {field.options?.map((option) => (
                  <SelectItem key={option.id} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      );

    case 'MULTI_SELECT':
      return (
        <Controller
          name={field.id}
          control={control}
          render={({ field: { onChange, value } }) => {
            const selected = (value as string[]) || [];
            return (
              <div className="space-y-2">
                {field.options?.map((option) => {
                  const isChecked = selected.includes(option.value);
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all',
                        isChecked
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onChange([...selected, option.value]);
                          } else {
                            onChange(selected.filter((v: string) => v !== option.value));
                          }
                        }}
                      />
                      <span className="text-foreground text-sm">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            );
          }}
        />
      );

    case 'CHECKBOX':
      return (
        <Controller
          name={field.id}
          control={control}
          render={({ field: { onChange, value } }) => (
            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all',
                value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <Checkbox
                id={field.id}
                checked={value as boolean}
                onCheckedChange={onChange}
                className="mt-0.5"
              />
              <span className="text-foreground text-sm leading-relaxed">
                {field.placeholder || field.label}
              </span>
            </label>
          )}
        />
      );

    case 'RADIO':
      return (
        <Controller
          name={field.id}
          control={control}
          render={({ field: { onChange, value } }) => (
            <RadioGroup value={value as string} onValueChange={onChange} className="space-y-2">
              {field.options?.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all',
                    value === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                  <span className="text-foreground text-sm">{option.label}</span>
                </label>
              ))}
            </RadioGroup>
          )}
        />
      );

    case 'FILE_UPLOAD':
    case 'IMAGE_UPLOAD':
      return <FileUploadField field={field} control={control} hasError={hasError} />;

    case 'SIGNATURE':
      return (
        <div className="border-border bg-muted/30 rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Signature capture will be available when connected to backend
          </p>
        </div>
      );

    default:
      return (
        <Input
          id={field.id}
          placeholder={field.placeholder}
          className={baseInputClass}
          {...register(field.id)}
        />
      );
  }
}

// File Upload Component
function FileUploadField({
  field,
  control,
  hasError,
}: {
  field: FormField;
  control: Control<Record<string, unknown>>;
  hasError: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const isImage = field.type === 'IMAGE_UPLOAD';

  return (
    <Controller
      name={field.id}
      control={control}
      render={({ field: { onChange } }) => (
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept={
              isImage ? 'image/jpeg,image/png,image/gif' : field.validation?.fileTypes?.join(',')
            }
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setFileName(file.name);
                onChange(file);
                if (isImage) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setPreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }
              }
            }}
          />

          {/* Upload Area */}
          {!preview && !fileName ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                'flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all',
                'hover:border-primary hover:bg-primary/5',
                hasError ? 'border-destructive' : 'border-border'
              )}
            >
              {isImage ? (
                <ImageIcon className="text-muted-foreground h-8 w-8" />
              ) : (
                <Upload className="text-muted-foreground h-8 w-8" />
              )}
              <div className="text-center">
                <p className="text-foreground text-sm font-medium">
                  Click to upload {isImage ? 'image' : 'file'}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {field.validation?.fileTypes?.join(', ') ||
                    (isImage ? 'JPG, PNG' : 'PDF, JPG, PNG')}
                  {field.validation?.maxFileSize &&
                    ` · Max ${(field.validation.maxFileSize / (1024 * 1024)).toFixed(0)}MB`}
                </p>
              </div>
            </button>
          ) : (
            <div className="border-border bg-card relative overflow-hidden rounded-xl border">
              {preview ? (
                <div className="relative aspect-video">
                  <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4">
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Upload className="text-primary h-5 w-5" />
                  </div>
                  <div className="flex-1 truncate">
                    <p className="text-foreground truncate text-sm font-medium">{fileName}</p>
                    <p className="text-muted-foreground text-xs">Uploaded</p>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setFileName(null);
                  onChange(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
                className="bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground absolute right-2 top-2 rounded-full p-1.5 backdrop-blur-sm transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    />
  );
}
