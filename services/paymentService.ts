export interface CheckoutConfirmation {
    paid: boolean;
    pending: boolean;
    credit: boolean;
    alreadyFulfilled: boolean;
    packageId: string;
    userId: string;
    gcAmount: number;
    scAmount: number;
    price: number;
}

async function readJson(response: Response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Payment request failed');
    return data;
}

export const paymentService = {
    createCheckout: async (packageId: string, userId: string): Promise<{ url: string; payment_id: string }> => {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packageId, userId })
        });
        return readJson(response);
    },
    confirm: async (sessionId: string): Promise<CheckoutConfirmation> => {
        const response = await fetch(`/api/session?session_id=${encodeURIComponent(sessionId)}`);
        return readJson(response);
    }
};
