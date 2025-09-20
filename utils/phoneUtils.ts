// Utility function to correctly extract area code from phone number
export function extractAreaCode(phone: string | undefined): string | null {
  if (!phone) return null;
  
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Handle different phone number formats
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // US format with country code: 1xxxxxxxxxx
    return digitsOnly.slice(1, 4);
  } else if (digitsOnly.length === 10) {
    // US format without country code: xxxxxxxxxx
    return digitsOnly.slice(0, 3);
  } else {
    // Unable to determine area code
    return null;
  }
}