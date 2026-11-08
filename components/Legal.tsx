import React from 'react';
import { Modal } from './Modals';

export const TermsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <Modal onClose={onClose} title="Free-play terms">
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <p><strong>Preview information — November 2026.</strong> This notice describes the current demonstration, not a cash-prize product.</p>
            <p>GGSlots currently provides free-play casino-style games only. Gold Coins are demonstration credits with no monetary value. They cannot be bought, transferred for money or redeemed for prizes.</p>
            <p>Sweeps Cash, paid checkout, sweepstakes entries and prize redemption are disabled. The demonstration makes no offer of real-money gambling or sweepstakes participation.</p>
            <p>Demo balances and game history are kept in this browser and may be reset, modified or lost. They are not audited financial records or guaranteed services.</p>
            <p>Use the demonstration for entertainment only. Additional terms, verified eligibility controls and legal review would be required before any future commercial product.</p>
        </div>
    </Modal>
);

export const PrivacyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <Modal onClose={onClose} title="Preview privacy notice">
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <p><strong>Updated November 2026.</strong> Free-play guest activity and demonstration balances are stored in your browser's local storage.</p>
            <p>Do not enter personal identification documents, payment card details or passwords into this preview. Local password accounts and identity document collection are disabled.</p>
            <p>The hosting platform may process technical request metadata and Vercel Analytics may collect usage measurements. Browser-local demo data is not an authoritative cross-device account.</p>
            <p>You can clear your browser's site data to remove locally stored demo information. This notice must be reviewed and expanded before collecting real user or payment data.</p>
        </div>
    </Modal>
);

export const ResponsibleGamingModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <Modal onClose={onClose} title="Responsible play">
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <p>Play for entertainment, not income. This preview offers no purchases or cash prizes.</p>
            <p>Take breaks, set your own time limits and stop if playing is no longer enjoyable. Automated spending limits and self-exclusion tools have not yet been implemented.</p>
            <p>If gambling is causing problems, confidential support is available through the <a className="text-indigo-300 underline" href="https://www.ncpgambling.org/help-treatment/" target="_blank" rel="noreferrer">National Council on Problem Gambling</a>.</p>
        </div>
    </Modal>
);
