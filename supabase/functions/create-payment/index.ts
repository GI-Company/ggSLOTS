// Follows Supabase Edge Function patterns
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Fix for missing Deno types
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate User
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error("Unauthorized")

    // 2. Parse Body
    const { packageId, price } = await req.json()
    if (!packageId || !price) throw new Error("Missing params")

    // 3. Init Service Role Client (for DB Writes)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Call NOWPayments API
    const apiKey = Deno.env.get('NOWPAYMENTS_API_KEY')
    const ipnUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook` // Pointing to our webhook handler

    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: price,
        price_currency: 'usd',
        ipn_callback_url: ipnUrl,
        order_id: packageId, // We'll link this later or pass a unique ID
        order_description: `Purchase ${packageId} for User ${user.id}`,
        success_url: "https://ggslots.app", // Your app URL
        cancel_url: "https://ggslots.app"
      }),
    })

    const npData = await response.json()
    if (!npData.id) throw new Error("Failed to create invoice with provider")

    // 5. Create Transaction Record in DB
    const { error: dbError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        package_id: packageId,
        provider_invoice_id: npData.id,
        provider_id: npData.id, // Invoice ID acts as ref initially
        amount: price,
        status: 'pending'
      })

    if (dbError) throw dbError

    // 6. Return Invoice URL to Client
    return new Response(
      JSON.stringify({ 
        invoice_url: npData.invoice_url,
        payment_id: npData.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})