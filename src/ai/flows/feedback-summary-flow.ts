
'use server';
/**
 * @fileOverview An AI flow to summarize user feedback.
 *
 * - summarizeFeedback - A function that takes feedback and returns a summary.
 * - FeedbackSummaryInput - The input type for the summarizeFeedback function.
 * - FeedbackSummaryOutput - The return type for the summarizeFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FeedbackSummaryInputSchema = z.object({
  feedbacks: z.array(z.string()).describe('An array of feedback messages from users.'),
});
export type FeedbackSummaryInput = z.infer<typeof FeedbackSummaryInputSchema>;

const FeedbackSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the overall sentiment and key points from all feedback combined.'),
  commonThemes: z.array(z.string()).describe("A list of common, recurring themes or topics mentioned in the feedback, such as 'internet', 'cleanliness', 'AC', 'noise', 'staff', 'timings'."),
});
export type FeedbackSummaryOutput = z.infer<typeof FeedbackSummaryOutputSchema>;

export async function summarizeFeedback(input: FeedbackSummaryInput): Promise<FeedbackSummaryOutput> {
  return feedbackSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'feedbackSummaryPrompt',
  input: {schema: FeedbackSummaryInputSchema},
  output: {schema: FeedbackSummaryOutputSchema},
  prompt: `You are an expert analyst for a library/study hall. You will be given a list of raw feedback messages from members. Your task is to analyze these messages to identify common themes and provide a brief, neutral summary.

Focus on extracting factual topics and recurring issues or compliments.

List of Feedback Messages:
{{#each feedbacks}}
- {{{this}}}
{{/each}}
`,
});

const feedbackSummaryFlow = ai.defineFlow(
  {
    name: 'feedbackSummaryFlow',
    inputSchema: FeedbackSummaryInputSchema,
    outputSchema: FeedbackSummaryOutputSchema,
  },
  async (input) => {
    if (input.feedbacks.length === 0) {
      return {
        summary: "No feedback was provided to analyze.",
        commonThemes: [],
      };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
