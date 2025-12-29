
import React from 'react';
import { Modal } from './Modals';

export const TermsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <Modal onClose={onClose} title="Terms of Service">
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <p><strong>Last Updated: October 2023</strong></p>
            
            <h5 className="text-white font-bold">1. Acceptance of Terms</h5>
            <p>By accessing GGSlots, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>

            <h5 className="text-white font-bold">2. Eligibility</h5>
            <p>You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to participate. Services are void where prohibited by law. Residents of WA, MI, MT, CA, NY, CT, NV, LA, and NJ are prohibited from participating in Sweepstakes.</p>

            <h5 className="text-white font-bold">3. Virtual Currency</h5>
            <p><strong>Gold Coins (GC):</strong> Social currency with no monetary value. Cannot be redeemed.</p>
            <p><strong>Sweeps Cash (SC):</strong> Sweepstakes entries obtained for free. Can be redeemed for prizes subject to verification and playthrough requirements (1x).</p>

            <h5 className="text-white font-bold">4. Account Security</h5>
            <p>You are responsible for maintaining the confidentiality of your login credentials. We are not liable for any loss resulting from unauthorized access.</p>

            <h5 className="text-white font-bold">5. Limitation of Liability</h5>
            <p>GGSlots is provided "as is". We make no warranties regarding uninterrupted service or freedom from errors.</p>
        </div>
    </Modal>
);

export const PrivacyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <Modal onClose={onClose} title="Privacy Policy">
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <p><strong>Effective Date: October 2023</strong></p>
            
            <h5 className="text-white font-bold">1. Information We Collect</h5>
            <p>We collect information you provide directly (email, DOB, address) and usage data (IP address, device info) to ensure compliance with state laws.</p>

            <h5 className="text-white font-bold">2. How We Use Data</h5>
            <ul className="list-disc pl-5">
                <li>To verify identity and age (KYC).</li>
                <li>To prevent fraud and enforce geo-blocking.</li>
                <li>To process redemptions and purchases.</li>
            </ul>

            <h5 className="text-white font-bold">3. Data Sharing</h5>
            <p>We do not sell your personal data. We may share data with third-party identity verification services (e.g., SumSub, Veriff) solely for compliance purposes.</p>
        </div>
    </Modal>
);

export const ResponsibleGamingModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <Modal onClose={onClose} title="Responsible Gaming">
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl">
                <h5 className="text-white font-bold mb-2">Play for Fun, Not for Income</h5>
                <p>Gaming should be entertainment. If you are no longer having fun, it's time to stop.</p>
            </div>

            <h5 className="text-white font-bold">Tools Available</h5>
            <ul className="list-disc pl-5">
                <li><strong>Purchase Limits:</strong> Cap your daily spending.</li>
                <li><strong>Time Limits:</strong> Set session duration alerts.</li>
                <li><strong>Self-Exclusion:</strong> Suspend your account for 6 months, 1 year, or permanently.</li>
            </ul>

            <h5 className="text-white font-bold">Need Help?</h5>
            <p>If you or someone you know has a gambling problem, help is available:</p>
            <p className="text-white font-bold">National Problem Gambling Helpline: 1-800-522-4700</p>
        </div>
    </Modal>
);
