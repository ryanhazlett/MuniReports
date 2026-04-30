import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Use service role for webhook (no user session)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    // If webhook secret is set, verify signature; otherwise accept all (dev mode)
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    if (userId) {
      await supabase
        .from("profiles")
        .upsert({
          id: userId,
          plan: "pro",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
        });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_subscription_id", sub.id)
      .single();
    if (data) {
      await supabase
        .from("profiles")
        .update({ plan: "free" })
        .eq("id", data.id);
    }
  }

  return NextResponse.json({ received: true });
}
