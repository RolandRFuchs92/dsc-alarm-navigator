"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedUser } from "@/lib/auth/guards";
import { KeypadNotOfferedError, UnknownModelError, saveKeypadChoice } from "@/lib/content/repo";

// Keypad picker: the model slug is bound by the page, the keypad comes from the pressed button.
async function chooseKeypad(modelSlug: string, formData: FormData): Promise<void> {
  const current = await requireApprovedUser();
  const keypadSlug = String(formData.get("keypad") ?? "");
  try {
    await saveKeypadChoice(current.id, modelSlug, keypadSlug);
  } catch (error) {
    // A tampered form can name a keypad or model we don't offer; ignore it, keep the old choice.
    if (!(error instanceof UnknownModelError || error instanceof KeypadNotOfferedError)) throw error;
  }
  revalidatePath(`/devices/${modelSlug}`, "layout");
}

export { chooseKeypad };
