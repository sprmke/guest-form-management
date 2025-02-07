export const toCapitalCase = (text: string): string => {
  if (!text) return text;
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}-${day}-${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

export const formatTimeToAMPM = (time: string, isCheckIn: boolean = false): string => {
  try {
    // Handle empty or invalid input
    if (!time) {
      return isCheckIn ? "02:00 pm" : "11:00 am"
    }
    
    // Split the time into hours and minutes
    const [hours, minutes] = time.split(':').map(num => parseInt(num))
    
    // Handle invalid numbers
    if (isNaN(hours) || isNaN(minutes)) {
      return isCheckIn ? "02:00 pm" : "11:00 am"
    }
    
    // Determine period and format hour
    const period = hours >= 12 ? 'pm' : 'am'
    const formattedHour = (hours % 12 || 12).toString().padStart(2, '0')
    const formattedMinutes = minutes.toString().padStart(2, '0')
    
    // Return formatted time
    return `${formattedHour}:${formattedMinutes} ${period}`
  } catch (error) {
    console.error('Error formatting time:', error)
    return isCheckIn ? "02:00 pm" : "11:00 am"
  }
} 