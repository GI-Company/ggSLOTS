
import { supabase } from '../lib/supabaseClient';
import { CreatePaymentResponse } from '../types';

export const paymentService = {
    /**
     * Calls the secure Edge Function to generate a NOWPayments Invoice.
     * This avoids exposing API keys on the client and allows adding metadata like UserID.
     */
    createInvoice: async (packageId: string, price: number): Promise<CreatePaymentResponse> => {
        try {
            // In a real Supabase deployment, this calls the Edge Function 'create-payment'
            // Since we cannot deploy actual Edge Functions in this environment, 
            // we simulate the call to a hypothetical endpoint.
            // If deployed: const { data, error } = await supabase.functions.invoke('create-payment', { body: { packageId, price } });
            
            // MOCKING the Edge Function Call for Demo Environment consistency
            // In Production: UNCOMMENT the invoke line below and remove the mock.
            
            /* 
            const { data, error } = await supabase.functions.invoke('create-payment', {
                body: { packageId, price }
            });
            if (error) throw error;
            return data;
            */

            // SIMULATION OF EDGE FUNCTION RESPONSE (For Demo Continuity)
            // Real implementation requires the Deno code provided in `supabase/functions/create-payment/index.ts`
            console.log(`[PaymentService] Creating Invoice for ${packageId} ($${price})`);
            
            // We return a mock response that mimics NOWPayments success
            // In a real app, this URL comes from NOWPayments API
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        invoice_url: `https://nowpayments.io/payment/?iid=${Math.random().toString(36).substring(7)}`, // Mock URL for display
                        payment_id: `pay_${Math.random().toString(36).substring(2, 12)}`
                    });
                }, 1000);
            });

        } catch (error: any) {
            console.error('Payment Creation Failed:', error);
            throw new Error(error.message || 'Failed to create payment invoice.');
        }
    }
};
