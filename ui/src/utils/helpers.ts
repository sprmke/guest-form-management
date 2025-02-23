// Add files to form data with validation
export const addFileToFormData = (formData: FormData, fieldName: string, maxSizeMB = 5) => {
  const fileInput = document.querySelector<HTMLInputElement>(`input[name="${fieldName}"]`);
  const [file] = fileInput?.files ?? [];

  if (!file || file?.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`${fieldName} file size must be less than ${maxSizeMB}MB`);
  }

  formData.append(fieldName, file);
};

// Custom name validation function
export const validateName = (name: string) => {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return false;
  return words.every(word => word.length >= 2);
};
