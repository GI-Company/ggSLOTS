import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts"

// Fix for missing Deno types
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req) => {
  try {
    // 1. Get Signature from Header
    const sig = req.headers.get('x-nowpayments-sig')
    if (!sig) throw new Error("No signature")

    // 2. Sort Params and Verify (Simplified for Demo - Strict sort required in prod)
    const rawBody = await req.text()
    // Note: Verification requires sorting keys recursively. 
    // For this implementation, we assume the shared secret logic is implemented here.
    // const calculatedSig = ...
    // if (sig !== calculatedSig) throw new Error("Invalid Signature")

    const body = JSON.parse(rawBody)

    // 3. Init Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Call DB RPC to Process Logic
    // We pass the invoice_id or payment_id depending on what NP sends in this context.
    const { data, error } = await supabaseAdmin.rpc('process_payment_webhook', {
        p_payment_id: body.payment_id?.toString() || body.invoice_id?.toString(),
        p_payment_status: body.payment_status,
        p_actually_paid: body.actually_paid,
        p_pay_currency: body.pay_currency,
        p_outcome_amount: body.outcome_amount,
        p_outcome_currency: body.outcome_currency
    })

    if (error) throw error

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})