
// Banned States: Washington, Michigan, Montana, California, New York, Connecticut, Nevada, Louisiana, New Jersey
const BANNED_STATES = ['WA', 'MI', 'MT', 'CA', 'NY', 'CT', 'NV', 'LA', 'NJ'];

export const geoService = {
    checkCompliance: async (): Promise<{ allowed: boolean; region?: string; country?: string }> => {
        try {
            // Using a public IP API for demonstration. In production, this should be done server-side (Edge Functions).
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            // Allow if API fails (Fail Open for demo purposes) or strictly Fail Closed for prod
            if (data.error) {
                console.warn("Geo-check failed, allowing access for demo:", data.reason);
                return { allowed: true }; 
            }

            const country = data.country_code; // US, CA, etc.
            const region = data.region_code; // NY, CA, TX, etc.

            if (country !== 'US' && country !== 'CA') {
                return { allowed: false, country, region }; // Restrict to North America for now
            }

            if (country === 'US' && BANNED_STATES.includes(region)) {
                return { allowed: false, country, region };
            }

            return { allowed: true, country, region };

        } catch (e) {
            console.error("Geo-check error", e);
            // Default to allowed for development/demo continuity if fetch blocked by adblockers
            return { allowed: true }; 
        }
    }
};
