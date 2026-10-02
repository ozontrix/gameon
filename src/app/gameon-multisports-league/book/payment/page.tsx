import { redirect } from "next/navigation";

/** Checkout is launched from the review screen using the real payment gateway. */
export default function LeaguePaymentPage() {
  redirect("/gameon-multisports-league/book/review");
}