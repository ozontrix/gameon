export function generateTimeSlots(openTime: string, closeTime: string, slotDurationMinutes: number) {
  const slots: { start_time: string; end_time: string }[] = [];
  
  // Parse times into minutes from midnight
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);
  
  let currentMinutes = openHour * 60 + openMin;
  const endMinutes = closeHour * 60 + closeMin;

  while (currentMinutes + slotDurationMinutes <= endMinutes) {
    const startHourStr = String(Math.floor(currentMinutes / 60)).padStart(2, '0');
    const startMinStr = String(currentMinutes % 60).padStart(2, '0');
    
    const nextMinutes = currentMinutes + slotDurationMinutes;
    const endHourStr = String(Math.floor(nextMinutes / 60)).padStart(2, '0');
    const endMinStr = String(nextMinutes % 60).padStart(2, '0');

    slots.push({
      start_time: `${startHourStr}:${startMinStr}:00`,
      end_time: `${endHourStr}:${endMinStr}:00`,
    });

    currentMinutes = nextMinutes;
  }

  return slots;
}

export function isTimeOverlap(
  slotStart: string, 
  slotEnd: string, 
  blockStart: string, 
  blockEnd: string
): boolean {
  // Simple string comparison works for HH:MM:SS format
  // Overlap occurs if: slot starts before block ends AND slot ends after block starts
  return slotStart < blockEnd && slotEnd > blockStart;
}
