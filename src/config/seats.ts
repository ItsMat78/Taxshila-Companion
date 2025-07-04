// This file defines the master list of all available seat numbers in the study hall.

export const ALL_SEAT_NUMBERS: string[] = Array.from({ length: 75 }, (_, i) => String(i + 10));
