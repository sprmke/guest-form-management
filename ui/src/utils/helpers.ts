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
  imageUrl: string,
  primaryGuestName: string
): Promise<File | null> => {
  try {
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      console.error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      return null;
    }
    
    const blob = await imageResponse.blob();
    
    // Extract the filename from the URL
    const urlFileName = imageUrl.split('/').pop() || '';
    
    // Get guest name index
    const formattedGuestName = formatName(primaryGuestName);
    const guestNameIndex = urlFileName.indexOf(formattedGuestName);
    
    // Get the start index (after guest name and underscore)
    const startIndex = guestNameIndex + formattedGuestName.length + 1;
    // Get the end index (before file extension)
    const extensionIndex = urlFileName.lastIndexOf('.');

    if (extensionIndex > startIndex) {
      const fileName = urlFileName.substring(startIndex, extensionIndex);
      const fileExtension = urlFileName.substring(extensionIndex);
      
      // Sanitize the extracted filename to remove spaces and special characters
      const sanitizedFileName = fileName
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace any non-alphanumeric characters (except dots and hyphens) with underscores
        .replace(/_{2,}/g, '_') // Replace multiple consecutive underscores with single underscore
        .replace(/^_|_$/g, ''); // Remove leading and trailing underscores
      
      const newFileName = sanitizedFileName + fileExtension;
      
      // Ensure the filename doesn't exceed Supabase storage limits (1024 characters)
      const finalFileName = newFileName.length > 1024 
        ? newFileName.substring(0, 1024) 
        : newFileName;
      
      return new File([blob], finalFileName, { type: blob.type });
    }
    
    // If we can't extract a proper filename, sanitize the entire URL filename
    const sanitizedUrlFileName = urlFileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
    
    // Ensure the filename doesn't exceed Supabase storage limits (1024 characters)
    const finalUrlFileName = sanitizedUrlFileName.length > 1024 
      ? sanitizedUrlFileName.substring(0, 1024) 
      : sanitizedUrlFileName;
    
    return new File([blob], finalUrlFileName, { type: blob.type });
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
};

// Format a full name for file naming (convert to lowercase with underscores)
export const formatName = (fullName: string): string => {
  return fullName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
};

// Get file extension from filename
export const getFileExtension = (filename: string): string => {
  return filename.substring(filename.lastIndexOf('.'));
};

// Generate a standardized filename for uploads
export const generateFileName = (
  prefix: string,
  fullName: string,
  checkInDate: string,
  checkOutDate: string,
  originalFileName: string
): string => {
  const formattedName = formatName(fullName);
  
  // Sanitize the original filename to remove spaces and special characters
  const sanitizedOriginalName = originalFileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace any non-alphanumeric characters (except dots and hyphens) with underscores
    .replace(/_{2,}/g, '_') // Replace multiple consecutive underscores with single underscore
    .replace(/^_|_$/g, ''); // Remove leading and trailing underscores
  
  // Create a deterministic filename with sanitized original filename
  const fullFileName = `${prefix}_${checkInDate}_${checkOutDate}_${formattedName}_${sanitizedOriginalName}`;
  
  // Ensure the filename doesn't exceed Supabase storage limits (1024 characters)
  if (fullFileName.length > 1024) {
    // Truncate the sanitized original name if the full filename is too long
    const maxOriginalNameLength = 1024 - (fullFileName.length - sanitizedOriginalName.length);
    const truncatedOriginalName = sanitizedOriginalName.substring(0, Math.max(0, maxOriginalNameLength));
    return `${prefix}_${checkInDate}_${checkOutDate}_${formattedName}_${truncatedOriginalName}`;
  }
  
  return fullFileName;
};

// Handle file upload with standardized naming and form data appending
export const handleFileUpload = (
  formData: FormData,
  file: File | null | undefined,
  prefix: string,
  primaryGuestName: string,
  checkInDate: string,
  checkOutDate: string,
  isRequired: boolean = true,
  maxSizeMB: number = 5
): void => {
  // If file is not provided and it's required, throw error
  if (!file && isRequired) {
    throw new Error(`${prefix} file is required`);
  }

  // If no file and not required, return early
  if (!file) {
    return;
  }

  // Generate standardized filename
  const fileName = generateFileName(
    prefix,
    primaryGuestName,
    checkInDate,
    checkOutDate,
    file.name
  );

  // Add file and filename to form data
  addFileToFormData(formData, prefix, file, maxSizeMB);
  formData.append(`${prefix}FileName`, fileName);
};
