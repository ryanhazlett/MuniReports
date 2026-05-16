import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-12-18.acacia" as any });

export async function POST(req: NextRequest) {
  try {
    const { priceType } = await req.json();

    if (priceType !== "single") {
      return NextResponse.json({ error: "Invalid price type" }, { status: 400 });
    }
    const priceId = process.env.STRIPE_PRICE_SINGLE || "";

    if (!priceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_creation: "always",
      custom_fields: [
        {
          key: "issuer_name_and_state",
          label: { type: "custom", custom: "Issuer name and state (e.g. 'City of Houston, TX')" },
          type: "text",
          optional: false,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://munireports.com"}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://munireports.com"}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
