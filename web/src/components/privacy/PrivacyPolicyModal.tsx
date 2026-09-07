import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/Dialog";
import { Button } from "../ui/Button";

interface PrivacyPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacyPolicyModal({ open, onOpenChange }: PrivacyPolicyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>LifeOS Privacy Policy & AI Disclosure</DialogTitle>
          <DialogDescription>
            Information on data collection, user rights under GDPR/DPDP, and AI model disclosures.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-2 flex flex-col gap-4 text-sm text-[#31302e] border-y border-[#e6e6e6] py-4">
          <section className="flex flex-col gap-1.5">
            <h3 className="text-base font-semibold text-[#000000]">1. Data Protection Overview</h3>
            <p className="text-xs leading-relaxed text-[#615d59]">
              LifeOS complies with the EU General Data Protection Regulation (GDPR) and the India
              Digital Personal Data Protection Act (DPDP Act, 2023). We process data to deliver
              personal productivity, time tracking, knowledge management, and financial insights.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h3 className="text-base font-semibold text-[#000000]">2. Third-Party AI Processing (NFR-6.2)</h3>
            <div className="p-3 bg-[#f6f5f4] rounded-lg border border-[#e3e2e0] flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#000000]">
                Configured LLM Fallback Chain: Mistral AI → Groq → Google Gemini
              </span>
              <p className="text-xs leading-relaxed text-[#615d59]">
                When using AI features (assistant chat, daily summaries, or periodic recommendations),
                your prompt and relevant task/note context are processed by external providers.
              </p>
              <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-xs text-amber-900">
                <strong className="font-semibold">Model Training Notice:</strong> On free/developer
                tiers (such as Google AI Studio free tier), provider terms permit submitted data to
                be retained and used to train or improve models. On enterprise tiers with Zero Data
                Retention (ZDR), customer data is not used for model training. Production
                deployments should utilize enterprise keys with ZDR agreements.
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-1.5">
            <h3 className="text-base font-semibold text-[#000000]">3. Account Deletion & 30-Day Purge</h3>
            <p className="text-xs leading-relaxed text-[#615d59]">
              When you request account deletion, your account is immediately placed into a
              soft-deleted state, revoking all active sessions and blocking access. After a 30-day
              grace period, a permanent cascade purge removes all records across all 25 user
              collections (calendar, notes, habits, finances, study plans, AI messages, and
              tombstones).
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h3 className="text-base font-semibold text-[#000000]">4. Data Portability (Export)</h3>
            <p className="text-xs leading-relaxed text-[#615d59]">
              You can export a complete machine-readable JSON archive of all your personal data at
              any time via the "Export My Data" button in Settings. Secrets (passwords, token hashes,
              and private keys) are strictly excluded for your security.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h3 className="text-base font-semibold text-[#000000]">5. Privacy Contact</h3>
            <p className="text-xs leading-relaxed text-[#615d59]">
              For privacy inquiries, rights requests, or grievance redressal under DPDP, please
              contact the Data Protection Officer at:{" "}
              <code className="bg-[#f6f5f4] px-1 py-0.5 rounded text-xs font-mono">
                privacy@lifeos.example.com
              </code>
            </p>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
