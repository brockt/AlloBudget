
import { z } from 'zod';
import { parseISO, isValid } from 'date-fns'; // Import date-fns functions

// Define standard account types
export const accountTypes = [
  "Checking",
  "Savings",
  "Credit Card",
  "Investment",
  "Loan",
  "Cash",
  "Other"
] as const; // Use 'as const' for literal types

export const accountSchema = z.object({
  name: z.string().min(1, "Account name is required.").max(100, "Name too long."),
  initialBalance: z.preprocess(
    (val) => Number(String(val)), // Convert to number
    z.number().min(0, "Initial balance must be non-negative.") // Allow 0 balance
  ),
  // Update type to be an optional enum of the predefined types.
  // It will be undefined if nothing is selected.
  type: z.enum(accountTypes).optional(),
  // Add createdAt for completeness if needed elsewhere, though not in form
  // createdAt: z.string().optional(), // Typically set server-side or in context
});

export const envelopeSchema = z.object({
  name: z.string().min(1, "Envelope name is required.").max(100, "Name too long."),
  budgetAmount: z.preprocess(
    (val) => Number(String(val)), // Convert to number
    z.number().min(0, "Budget amount must be non-negative.") // Allow 0 budget
  ),
  // Make category mandatory
  category: z.string().min(1, "Category is required.").max(100, "Category name is too long."),
  // Add optional dueDate
  dueDate: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? undefined : Number(String(val)), // Convert to number or undefined
    z.number().int().min(1).max(31, "Due day must be between 1 and 31.").optional()
  ),
  // Add createdAt for completeness if needed elsewhere, though not in form
  // createdAt: z.string().optional(), // Typically set server-side or in context
});

export const transactionSchema = z.object({
  accountId: z.string().min(1, "Account is required."),
  envelopeId: z.string().optional().nullable().default(null).transform(val => val === "" ? null : val), // Ensure empty string becomes null
  amount: z.preprocess(
    (val) => Number(String(val)),
    z.number().positive("Amount must be positive.")
  ),
  type: z.enum(['income', 'expense'], { required_error: "Transaction type is required." }),
  description: z.string().min(1, "Description is required.").max(200, "Description too long."),
  // Validate that the date string is in 'yyyy-MM-dd' format and represents a valid date
  date: z.string().refine((dateString) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false; // Check basic format
      const date = parseISO(dateString); // Use parseISO which is stricter for yyyy-MM-dd
      return isValid(date); // Check if it's a valid date object
    }, {
      message: "Invalid date format. Please use YYYY-MM-DD.",
  }),
  // Add createdAt for completeness if needed elsewhere, though not in form
  // createdAt: z.string().optional(), // Typically set server-side or in context
});


export const payeeSchema = z.object({
  name: z.string().min(1, "Payee name is required.").max(100, "Name too long."),
  category: z.string().max(100, "Category too long.").optional(),
  // Add createdAt for completeness if needed elsewhere, though not in form
  // createdAt: z.string().optional(), // Typically set server-side or in context
});

// Ensure envelopeId is present if type is expense and an envelope is selected (or make it more complex)
// For now, basic schema. If type is expense, envelopeId is highly recommended.
