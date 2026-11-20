import { redirect } from "next/navigation";

/** The old multi-route sign-up now lives in one flow at /register. */
export default function OldRegisterStep() {
  redirect("/register");
}
