import { z } from 'zod';
import type { Shift } from '@/types/student';

// Shift options shared between register and edit forms
export const SHIFT_OPTIONS: { value: Shift; label: string }[] = [
  { value: "morning", label: "Morning Shift (7 AM - 2 PM)" },
  { value: "evening", label: "Evening Shift (2 PM - 9:30 PM)" },
  { value: "fullday", label: "Full Day (7 AM - 9:30 PM)" },
];

/**
 * Fields shared by both the student registration and edit forms.
 * Each page extends this with its own page-specific fields.
 */
export const studentBaseSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone: z
    .string()
    .length(10, { message: "Phone number must be exactly 10 digits." })
    .regex(/^\d+$/, { message: "Phone number must contain only digits." }),
  address: z.string(),
  shift: z.enum(["morning", "evening", "fullday"], {
    required_error: "Shift selection is required.",
  }),
  idCardFileName: z.string().optional(),
});

// Registration form — extends base with password, seat, and profile picture
export const studentRegisterSchema = studentBaseSchema.extend({
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  seatNumber: z.string().min(1, "Seat selection is required."),
  profilePictureUrl: z.string().optional(),
});

export type StudentRegisterFormValues = z.infer<typeof studentRegisterSchema>;

// Edit form — extends base with seat (nullable), due date, and optional password change
export const studentEditSchema = studentBaseSchema
  .extend({
    seatNumber: z
      .string()
      .nullable()
      .refine((val) => val !== null && val !== "", {
        message: "Seat selection is required.",
      }),
    nextDueDate: z.date().optional(),
    newPassword: z.string().optional(),
    confirmNewPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword.length > 0) {
        return data.newPassword.length >= 6;
      }
      return true;
    },
    { message: "New password must be at least 6 characters.", path: ["newPassword"] },
  )
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword.length > 0) {
        return data.confirmNewPassword === data.newPassword;
      }
      return true;
    },
    { message: "New passwords don't match.", path: ["confirmNewPassword"] },
  );

export type StudentEditFormValues = z.infer<typeof studentEditSchema>;
