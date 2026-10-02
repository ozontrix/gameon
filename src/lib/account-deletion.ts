import { z } from "zod";

export const ACCOUNT_DELETION_EMAIL = "info@gameonmultisports.com";

export const AccountDeletionSchema = z.object({
  accountType: z.enum(["email", "phone"]),
  identifier: z.string().trim().min(1, "Enter the email or phone linked to your account.").max(254),
  receiptEmail: z.string().trim().max(254).optional().default(""),
  message: z.string().trim().min(10, "Please enter at least 10 characters.").max(2000, "Please keep your message under 2,000 characters."),
  consent: z.literal(true, { error: "Please confirm that you want to request account deletion." }),
  website: z.string().max(0, "Unable to submit this request.").optional().default(""),
}).superRefine((data, context) => {
  if (data.accountType === "email") {
    if (!z.email().safeParse(data.identifier).success) {
      context.addIssue({ code: "custom", path: ["identifier"], message: "Enter a valid account email address." });
    }
  } else {
    const digits = data.identifier.replace(/[\s()+-]/g, "");
    if (!/^\d{10,15}$/.test(digits) || !/^[+\d\s()-]+$/.test(data.identifier)) {
      context.addIssue({ code: "custom", path: ["identifier"], message: "Enter a valid phone number with 10–15 digits, including your country code if needed." });
    }
    if (!z.email().safeParse(data.receiptEmail).success) {
      context.addIssue({ code: "custom", path: ["receiptEmail"], message: "Enter a valid email address so we can send your request copy." });
    }
  }
});

export type AccountDeletionInput = z.infer<typeof AccountDeletionSchema>;

export function deletionReplyEmail(input: AccountDeletionInput): string {
  return (input.accountType === "email" ? input.identifier : input.receiptEmail).toLowerCase();
}