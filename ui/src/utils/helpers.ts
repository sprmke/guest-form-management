// Add files to form data with validation
export const addFileToFormData = (formData: FormData, fieldName: string, maxSizeMB = 5) => {
  const fileInput = document.querySelector<HTMLInputElement>(`input[name="${fieldName}"]`);
  const [file] = fileInput?.files ?? [];

  if (!file || file?.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`${fieldName} file size must be less than ${maxSizeMB}MB`);
  }

  formData.append(fieldName, file);
};

// Handle name input change
export const handleNameInputChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  onChange: (value: string) => void,
  transformValue: (value: string) => string = (v) => v
) => {
  const input = e.target;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const value = transformValue(input.value);
  
  onChange(value);
  
  // Restore cursor position after React rerender
  requestAnimationFrame(() => {
    input.selectionStart = start;
    input.selectionEnd = end;
  });
};

// Custom name validation function
export const validateName = (name: string = '') => {
  if (!name) return false;
  const words = name.trim().split(/\s+/);
  
  // Must have at least 2 words
  if (words.length < 2) return false;

  // First and last words must be at least 2 characters
  if (words[0].length < 2 || words[words.length - 1].length < 2) return false;

  // Middle parts can be single letters (for initials) or 2+ characters
  const middleWords = words.slice(1, -1);
  return middleWords.every(word => word.length >= 1);
};
