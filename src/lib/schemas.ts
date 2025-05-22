
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
    z.number().min(0, "Initial balance cannot be negative.") // Updated message for clarity
  ),
  type: z.enum(accountTypes).optional(),
});

export const envelopeSchema = z.object({
  name: z.string().min(1, "Envelope name is required.").max(100, "Name too long."),
  budgetAmount: z.preprocess(
    (val) => Number(String(val)), // Convert to number
    z.number().min(0, "Budget amount cannot be negative.")
  ),
  estimatedAmount: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? undefined : Number(String(val)),
    z.number().min(0, "Estimated amount cannot be negative.").optional()
  ),
  category: z.string().min(1, "Category is required.").max(100, "Category name is too long."),
  dueDate: z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? undefined : Number(String(val)),
    z.number().int().min(1).max(31, "Due day must be between 1 and 31.").optional()
  ),
});

export const transactionSchema = z.object({
  accountId: z.string().min(1, "Account is required."),
  envelopeId: z.string().optional().nullable().transform(val => val === "" ? null : val),
  payeeId: z.string().min(1, "Payee is required."),
  amount: z.preprocess(
    (val) => Number(String(val)),
    z.number().positive("Amount must be positive.")
  ),
  type: z.enum(['inflow', 'outflow'], { required_error: "Transaction type is required." }), // Changed
  description: z.string().max(200, "Description too long.").optional(),
  date: z.string().refine((dateString) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
      const date = parseISO(dateString);
      return isValid(date);
    }, {
      message: "Invalid date format. Please use YYYY-MM-DD.",
  }),
  isTransfer: z.boolean().optional(),
  isActualIncome: z.boolean().optional(), // New field
}).superRefine((data, ctx) => {
  if (data.type === 'outflow' && (!data.envelopeId || data.envelopeId.trim() === "")) { // Changed to 'outflow'
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Envelope is required for outflow transactions.", // Changed message
      path: ['envelopeId'],
    });
  }
});


export const payeeSchema = z.object({
  name: z.string().min(1, "Payee name is required.").max(100, "Name too long."),
  category: z.string().max(100, "Category too long.").optional(),
});

export const transferEnvelopeFundsSchema = z.object({
  fromEnvelopeId: z.string().min(1, "Source envelope is required."),
  toEnvelopeId: z.string().min(1, "Destination envelope is required."),
  amount: z.preprocess(
    (val) => Number(String(val)),
    z.number().positive("Amount must be positive.")
  ),
  accountId: z.string().min(1, "Account for transactions is required."),
  date: z.string().refine((dateString) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    const date = parseISO(dateString);
    return isValid(date);
  }, {
    message: "Invalid date format. Please use YYYY-MM-DD.",
  }),
  description: z.string().max(200, "Description too long.").optional(),
}).superRefine((data, ctx) => {
  if (data.fromEnvelopeId === data.toEnvelopeId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Source and destination envelopes cannot be the same.",
      path: ['toEnvelopeId'], 
    });
  }
});


export const transferAccountFundsSchema = z.object({
    fromAccountId: z.string().min(1, "Source account is required."),
    toAccountId: z.string().min(1, "Destination account is required."),
    amount: z.preprocess(
        (val) => Number(String(val)),
        z.number().positive("Amount must be positive.")
    ),
    date: z.string().refine((dateString) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
        const date = parseISO(dateString);
        return isValid(date);
    }, {
        message: "Invalid date format. Please use YYYY-MM-DD.",
    }),
    description: z.string().max(200, "Description too long.").optional(),
}).superRefine((data, ctx) => {
    if (data.fromAccountId === data.toAccountId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Source and destination accounts cannot be the same.",
            path: ['toAccountId'], 
        });
    }
});
