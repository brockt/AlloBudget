
import { z } from 'zod';

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
});

export const envelopeSchema = z.object({
  name: z.string().min(1, "Envelope name is required.").max(100, "Name too long."),
  budgetAmount: z.preprocess(
    (val) => Number(String(val)), // Convert to number
    z.number().min(0, "Budget amount must be non-negative.") // Allow 0 budget
  ),
});

export const transactionSchema = z.object({
  accountId: z.string().min(1, "Account is required."),
  envelopeId: z.string().optional(),
  amount: z.preprocess(
    (val) => Number(String(val)),
    z.number().positive("Amount must be positive.")
  ),
  type: z.enum(['income', 'expense'], { required_error: "Transaction type is required." }),
  description: z.string().min(1, "Description is required.").max(200, "Description too long."),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format.",
  }),
});

export const payeeSchema = z.object({
  name: z.string().min(1, "Payee name is required.").max(100, "Name too long."),
  category: z.string().max(100, "Category too long.").optional(),
});

// Ensure envelopeId is present if type is expense and an envelope is selected (or make it more complex)
// For now, basic schema. If type is expense, envelopeId is highly recommended.


