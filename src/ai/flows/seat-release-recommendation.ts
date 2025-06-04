// src/ai/flows/seat-release-recommendation.ts
'use server';
/**
 * @fileOverview AI flow to recommend when to release a reserved seat based on student inactivity and booking policies.
 *
 * - seatReleaseRecommendation - A function that handles the seat release recommendation process.
 * - SeatReleaseRecommendationInput - The input type for the seatReleaseRecommendation function.
 * - SeatReleaseRecommendationOutput - The return type for the seatReleaseRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SeatReleaseRecommendationInputSchema = z.object({
  studentId: z.string().describe('The ID of the student holding the seat.'),
  seatId: z.string().describe('The ID of the reserved seat.'),
  bookingTimestamp: z.string().describe('The timestamp when the seat was booked (ISO format).'),
  lastActivityTimestamp: z.string().describe('The timestamp of the student\'s last activity (ISO format).'),
  holdSeatPolicy: z.string().describe('The organization hold seat policy (e.g., time before seat release after booking).'),
  exceptions: z.string().optional().describe('Any exceptions to the hold seat policy for this student or seat.'),
});
export type SeatReleaseRecommendationInput = z.infer<typeof SeatReleaseRecommendationInputSchema>;

const SeatReleaseRecommendationOutputSchema = z.object({
  recommendation: z.string().describe('A recommendation on when to release the seat (e.g., \'Release immediately\', \'Release in 1 hour\', \'Do not release\').'),
  reason: z.string().describe('The reasoning behind the recommendation.'),
});
export type SeatReleaseRecommendationOutput = z.infer<typeof SeatReleaseRecommendationOutputSchema>;

export async function seatReleaseRecommendation(input: SeatReleaseRecommendationInput): Promise<SeatReleaseRecommendationOutput> {
  return seatReleaseRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'seatReleaseRecommendationPrompt',
  input: {schema: SeatReleaseRecommendationInputSchema},
  output: {schema: SeatReleaseRecommendationOutputSchema},
  prompt: `You are an AI assistant that recommends when to release a reserved seat based on student inactivity and booking policies.

  Consider the following information:
  - Student ID: {{{studentId}}}
  - Seat ID: {{{seatId}}}
  - Booking Timestamp: {{{bookingTimestamp}}}
  - Last Activity Timestamp: {{{lastActivityTimestamp}}}
  - Hold Seat Policy: {{{holdSeatPolicy}}}
  - Exceptions: {{{exceptions}}}

  Based on this information, provide a recommendation on when to release the seat and the reasoning behind it.
  The recommendation should be one of the following: "Release immediately", "Release in [timeframe]", or "Do not release".
  The timeframe in "Release in [timeframe]" should be as short as possible, while respecting the hold seat policy and any exceptions.

  {{output}}
  `,
});

const seatReleaseRecommendationFlow = ai.defineFlow(
  {
    name: 'seatReleaseRecommendationFlow',
    inputSchema: SeatReleaseRecommendationInputSchema,
    outputSchema: SeatReleaseRecommendationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
