// Add files to form data with validation
export const addFileToFormData = (
  formData: FormData, 
  fieldName: string, 
  file: File | null | undefined,
  maxSizeMB = 5
) => {
  if (!file) {
    throw new Error(`${fieldName} file is required`);
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
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

// Validate image file type
export const validateImageFile = (file: File | null | undefined): { valid: boolean; message?: string } => {
  if (!file) {
    return { valid: false, message: 'No file selected' };
  }
  
  // List of valid image MIME types
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
  
  if (!validTypes.includes(file.type)) {
    return { 
      valid: false, 
      message: 'Please upload only JPG, JPEG, PNG or HEIC image formats' 
    };
  }
  
  return { valid: true };
};

// Fetches an image from a URL and converts it to a File object
export const fetchImageAsFile = async (
  imageUrl: string
): Promise<File | null> => {
  try {
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      console.error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      return null;
    }
    
    const blob = await imageResponse.blob();
    
    // Extract the filename from the URL
    const fileName = imageUrl.split('/').pop() || '';
    
    return new File([blob], fileName, { type: blob.type });
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
};
