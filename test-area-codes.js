// Test area code extraction fix
import { getLocationFromAreaCode } from './utils/areaCodeMapping.js';

// Test cases that were previously broken
const testCases = [
  { phone: '850-238-7432', expected: 'Tallahassee, FL' },
  { phone: '(850) 238-7432', expected: 'Tallahassee, FL' },
  { phone: '1-850-238-7432', expected: 'Tallahassee, FL' },
  { phone: '502-555-1234', expected: 'Louisville, KY' },
  { phone: '(502) 555-1234', expected: 'Louisville, KY' },
  { phone: '1-502-555-1234', expected: 'Louisville, KY' }
];

console.log('Testing area code extraction fixes:');
console.log('=====================================');

testCases.forEach(test => {
  const location = getLocationFromAreaCode(test.phone);
  const result = location ? `${location.city}, ${location.state}` : 'Not found';
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
  
  console.log(`${status} ${test.phone} → ${result} (expected: ${test.expected})`);
});

// Test the specific case from the image
const problematicPhone = '850-238-7432';
const location = getLocationFromAreaCode(problematicPhone);
console.log('\\n=== Specific Test Case ===');
console.log(`Phone: ${problematicPhone}`);
console.log(`Location: ${location ? `${location.city}, ${location.state}` : 'Not found'}`);
console.log(`Coordinates: ${location ? `${location.latitude}, ${location.longitude}` : 'N/A'}`);
console.log(`Should show: Tallahassee, FL (NOT Louisville, KY)`);