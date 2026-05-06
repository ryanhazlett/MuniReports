import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-12-18.acacia" as any });

export async function POST(req: NextRequest) {
  try {
    const { priceType } = await req.json();
    
    let priceId: string;
    if (priceType === "single") {
      priceId = process.env.STRIPE_PRICE_SINGLE || "";
    } else if (priceType === "5pack") {
      priceId = process.env.STRIPE_PRICE_5PACK || "";
    } else {
      return NextResponse.json({ error: "Invalid price type" }, { status: 400 });
    }

    if (!priceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://munireports.com"}/builder?purchased=${priceType}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://munireports.com"}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
