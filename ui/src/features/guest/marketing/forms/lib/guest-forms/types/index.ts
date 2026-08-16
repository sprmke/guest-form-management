/**
 * Guest Forms Feature Types
 * Comprehensive type definitions for the multi-step form builder
 */

// ============================================
// Field Types
// ============================================

export type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'EMAIL'
  | 'PHONE'
  | 'NUMBER'
  | 'DATE'
  | 'TIME'
  | 'DATETIME'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'CHECKBOX'
  | 'RADIO'
  | 'FILE_UPLOAD'
  | 'IMAGE_UPLOAD'
  | 'SIGNATURE'
  | 'ADDRESS'
  | 'HEADING'
  | 'PARAGRAPH'
  | 'DIVIDER';

export interface FieldTypeConfig {
  type: FieldType;
  label: string;
  icon: string;
  description: string;
  category: FieldCategory;
  hasOptions?: boolean;
  hasValidation?: boolean;
  isLayoutField?: boolean;
}

export type FieldCategory = 'basic' | 'contact' | 'date_time' | 'selection' | 'file' | 'layout';

export const FIELD_TYPE_CONFIGS: FieldTypeConfig[] = [
  // Basic fields
  {
    type: 'TEXT',
    label: 'Text',
    icon: 'Type',
    description: 'Single line text input',
    category: 'basic',
    hasValidation: true,
  },
  {
    type: 'TEXTAREA',
    label: 'Text Area',
    icon: 'AlignLeft',
    description: 'Multi-line text input',
    category: 'basic',
    hasValidation: true,
  },
  {
    type: 'NUMBER',
    label: 'Number',
    icon: 'Hash',
    description: 'Numeric input',
    category: 'basic',
    hasValidation: true,
  },

  // Contact fields
  {
    type: 'EMAIL',
    label: 'Email',
    icon: 'Mail',
    description: 'Email address input',
    category: 'contact',
    hasValidation: true,
  },
  {
    type: 'PHONE',
    label: 'Phone',
    icon: 'Phone',
    description: 'Phone number input',
    category: 'contact',
    hasValidation: true,
  },
  {
    type: 'ADDRESS',
    label: 'Address',
    icon: 'MapPin',
    description: 'Address input',
    category: 'contact',
    hasValidation: true,
  },

  // Date & Time fields
  {
    type: 'DATE',
    label: 'Date',
    icon: 'Calendar',
    description: 'Date picker',
    category: 'date_time',
    hasValidation: true,
  },
  {
    type: 'TIME',
    label: 'Time',
    icon: 'Clock',
    description: 'Time picker',
    category: 'date_time',
    hasValidation: true,
  },
  {
    type: 'DATETIME',
    label: 'Date & Time',
    icon: 'CalendarClock',
    description: 'Date and time picker',
    category: 'date_time',
    hasValidation: true,
  },

  // Selection fields
  {
    type: 'SELECT',
    label: 'Dropdown',
    icon: 'ChevronDown',
    description: 'Single select dropdown',
    category: 'selection',
    hasOptions: true,
    hasValidation: true,
  },
  {
    type: 'MULTI_SELECT',
    label: 'Multi Select',
    icon: 'ListChecks',
    description: 'Multiple selection',
    category: 'selection',
    hasOptions: true,
    hasValidation: true,
  },
  {
    type: 'CHECKBOX',
    label: 'Checkbox',
    icon: 'CheckSquare',
    description: 'Yes/No checkbox',
    category: 'selection',
  },
  {
    type: 'RADIO',
    label: 'Radio Group',
    icon: 'Circle',
    description: 'Single choice from options',
    category: 'selection',
    hasOptions: true,
    hasValidation: true,
  },

  // File fields
  {
    type: 'FILE_UPLOAD',
    label: 'File Upload',
    icon: 'Upload',
    description: 'File attachment',
    category: 'file',
    hasValidation: true,
  },
  {
    type: 'IMAGE_UPLOAD',
    label: 'Image Upload',
    icon: 'Image',
    description: 'Image attachment',
    category: 'file',
    hasValidation: true,
  },
  {
    type: 'SIGNATURE',
    label: 'Signature',
    icon: 'PenTool',
    description: 'Digital signature',
    category: 'file',
  },

  // Layout fields
  {
    type: 'HEADING',
    label: 'Heading',
    icon: 'Heading',
    description: 'Section heading',
    category: 'layout',
    isLayoutField: true,
  },
  {
    type: 'PARAGRAPH',
    label: 'Paragraph',
    icon: 'FileText',
    description: 'Descriptive text',
    category: 'layout',
    isLayoutField: true,
  },
  {
    type: 'DIVIDER',
    label: 'Divider',
    icon: 'Minus',
    description: 'Visual separator',
    category: 'layout',
    isLayoutField: true,
  },
];

export const FIELD_CATEGORIES: { key: FieldCategory; label: string; icon: string }[] = [
  { key: 'basic', label: 'Basic', icon: 'Type' },
  { key: 'contact', label: 'Contact', icon: 'User' },
  { key: 'date_time', label: 'Date & Time', icon: 'Calendar' },
  { key: 'selection', label: 'Selection', icon: 'ListChecks' },
  { key: 'file', label: 'Files', icon: 'Upload' },
  { key: 'layout', label: 'Layout', icon: 'Layout' },
];

// ============================================
// Form Field Definitions
// ============================================

export interface FormFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  customMessage?: string;
  fileTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
}

export interface FormFieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FormFieldConditional {
  show: boolean; // true = show when conditions met, false = hide when conditions met
  conditions: {
    fieldId: string;
    operator:
      | 'equals'
      | 'not_equals'
      | 'contains'
      | 'not_contains'
      | 'is_empty'
      | 'is_not_empty'
      | 'greater_than'
      | 'less_than';
    value?: string | number | boolean;
  }[];
  logic: 'AND' | 'OR';
}

export interface FormFieldStyling {
  width: 'full' | 'half' | 'third';
  labelPosition?: 'top' | 'left' | 'hidden';
  className?: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  validation?: FormFieldValidation;
  options?: FormFieldOption[];
  defaultValue?: string | number | boolean;
  conditional?: FormFieldConditional;
  styling?: FormFieldStyling;
  order: number;
}

// ============================================
// Form Step Definitions
// ============================================

export interface FormStep {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  fields: FormField[];
  isOptional: boolean;
  order: number;
}

// ============================================
// Form Template Definitions
// ============================================

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: 'property_rental' | 'hospitality' | 'custom';
  thumbnail?: string;
  steps: FormStep[];
  styling: FormStyling;
  settings: FormSettings;
  isDefault?: boolean;
}

// ============================================
// Form Styling
// ============================================

export interface FormStyling {
  primaryColor: string;
  backgroundColor: string;
  cardBackgroundColor: string;
  textColor: string;
  borderColor: string;
  borderRadius: number;
  fontFamily: string;
  fontSize: number;
  buttonStyle: {
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
    padding: string;
  };
  stepIndicator: {
    activeColor: string;
    completedColor: string;
    pendingColor: string;
    style: 'circles' | 'numbers' | 'progress' | 'minimal';
  };
}

// ============================================
// Form Settings
// ============================================

export interface FormSettings {
  // Button text
  submitButtonText: string;
  nextButtonText: string;
  prevButtonText: string;

  // Success handling
  successMessage: string;
  successRedirectUrl?: string;

  // Notifications
  sendConfirmationEmail: boolean;
  confirmationEmailTemplate?: string;
  notifyOnSubmission: boolean;
  notificationEmails: string[];

  // Behavior
  allowSaveProgress: boolean;
  showProgressBar: boolean;
  showStepNumbers: boolean;
  enableCaptcha: boolean;
  allowFileAttachments: boolean;
  maxFileSize: number; // in bytes

  // Validation
  validateOnBlur: boolean;
  validateOnChange: boolean;
  showRequiredIndicator: boolean;
}

// ============================================
// Complete Guest Form
// ============================================

export interface GuestForm {
  id: string;
  propertyId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  version: number;
  steps: FormStep[];
  styling: FormStyling;
  settings: FormSettings;
  publicUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Form Submission
// ============================================

export interface GuestFormSubmission {
  id: string;
  guestFormId: string;
  bookingId?: string | null;
  data: Record<string, unknown>;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  submittedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  stepProgress?: number;
}

// ============================================
// Forms State
// ============================================

export interface FormBuilderState {
  // Form data
  formId: string | null;
  name: string;
  description: string;
  steps: FormStep[];
  styling: FormStyling;
  settings: FormSettings;

  // Template tracking
  currentTemplateId: string | null;

  // Builder UI state
  activeStepId: string | null;
  activeFieldId: string | null;
  activePanel: 'steps' | 'fields' | 'styling' | 'settings' | 'templates';
  isDirty: boolean;
  isSaving: boolean;

  // Preview state
  previewStep: number;
  previewMode: 'desktop' | 'tablet' | 'mobile';

  // History for undo/redo
  history: FormBuilderHistoryEntry[];
  historyIndex: number;
}

export interface FormBuilderHistoryEntry {
  steps: FormStep[];
  timestamp: number;
}

// ============================================
// Input Types for API
// ============================================

export interface CreateGuestFormInput {
  propertyId: string;
  name: string;
  description?: string;
  steps: FormStep[];
  styling?: Partial<FormStyling>;
  settings?: Partial<FormSettings>;
}

export interface UpdateGuestFormInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  steps?: FormStep[];
  styling?: Partial<FormStyling>;
  settings?: Partial<FormSettings>;
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_FORM_STYLING: FormStyling = {
  primaryColor: '#0891b2',
  backgroundColor: '#f8fafc',
  cardBackgroundColor: '#ffffff',
  textColor: '#1e293b',
  borderColor: '#e2e8f0',
  borderRadius: 12,
  fontFamily: 'Inter',
  fontSize: 14,
  buttonStyle: {
    backgroundColor: '#0891b2',
    textColor: '#ffffff',
    borderRadius: 8,
    padding: '12px 24px',
  },
  stepIndicator: {
    activeColor: '#0891b2',
    completedColor: '#10b981',
    pendingColor: '#94a3b8',
    style: 'circles',
  },
};

export const DEFAULT_FORM_SETTINGS: FormSettings = {
  submitButtonText: 'Submit',
  nextButtonText: 'Next',
  prevButtonText: 'Previous',
  successMessage: 'Thank you! Your form has been submitted successfully.',
  sendConfirmationEmail: true,
  notifyOnSubmission: true,
  notificationEmails: [],
  allowSaveProgress: false,
  showProgressBar: true,
  showStepNumbers: true,
  enableCaptcha: false,
  allowFileAttachments: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  validateOnBlur: true,
  validateOnChange: false,
  showRequiredIndicator: true,
};

export function createDefaultField(type: FieldType): FormField {
  const config = FIELD_TYPE_CONFIGS.find((c) => c.type === type);
  const id = crypto.randomUUID();

  return {
    id,
    type,
    label: config?.label || 'New Field',
    placeholder: '',
    description: '',
    required: false,
    validation: config?.hasValidation ? {} : undefined,
    options: config?.hasOptions
      ? [
          { id: crypto.randomUUID(), label: 'Option 1', value: 'option_1' },
          { id: crypto.randomUUID(), label: 'Option 2', value: 'option_2' },
        ]
      : undefined,
    styling: { width: 'full' },
    order: 0,
  };
}

export function createDefaultStep(name: string = 'New Step'): FormStep {
  return {
    id: crypto.randomUUID(),
    name,
    description: '',
    fields: [],
    isOptional: false,
    order: 0,
  };
}
