"use server";

import { revalidatePath } from "next/cache";
import { newCardToken } from "@/lib/qr";
import { insertBorrower } from "@/lib/data/borrowers";
import { logActivity } from "@/lib/audit";
import { getCurrentStaff } from "@/lib/session";

export async function createBorrower(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error("Not authenticated");

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) throw new Error("Name is required");

  const borrower = await insertBorrower({
    cardQr: newCardToken(),
    fullName,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
  });

  await logActivity({
    actor: staff.id,
    action: "borrower.create",
    entityType: "borrower",
    entityId: borrower.id,
    metadata: { fullName },
  });

  revalidatePath("/borrowers");
}
