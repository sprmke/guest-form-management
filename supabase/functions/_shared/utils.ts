export const camelToSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

export const transformFormDataToSnakeCase = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const snakeCaseKey = camelToSnakeCase(key);
    transformed[snakeCaseKey] = value;
  }
  
  return transformed;
}; 