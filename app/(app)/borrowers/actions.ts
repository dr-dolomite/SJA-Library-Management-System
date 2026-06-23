"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { newCardToken } from "@/lib/qr";
import { createBorrowerWithAudit } from "@/lib/data/borrowers";

// Fix 6: validate server-side (HTML types are client-only / bypassable in a Server Action).
const BorrowerForm = z.object({
  full_name: z.string().trim().min(1, "Name is required"),
  email: z.union([z.string().trim().email("Enter a valid email"), z.literal("")]).optional(),
  phone: z.string().trim().optional(),
});

export async function createBorrower(formData: FormData) {
  const parsed = BorrowerForm.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid borrower details");
  }
  const { full_name, email, phone } = parsed.data;

  await createBorrowerWithAudit({
    cardQr: newCardToken(),
    fullName: full_name,
    email: email ? email : null,
    phone: phone ? phone : null,
  });

  revalidatePath("/borrowers");
}
