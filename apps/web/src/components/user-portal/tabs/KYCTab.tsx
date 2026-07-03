"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Upload, CheckCircle2, XCircle, Clock, ExternalLink, ChevronDown, ShieldCheck } from "lucide-react";
import { Badge, Section } from "@/components/portal/PortalShell";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Head } from "./shared";

const DOC_TYPES = [
  { key: "aadhaar" as const, label: "Aadhaar Card" },
  { key: "pan" as const, label: "PAN Card" },
  { key: "income_proof" as const, label: "Ownership Proof" },
];

type DocType = "aadhaar" | "pan" | "income_proof" | "other";

const KYC_STATUS_TONE: Record<string, "success" | "warm" | "cold" | "new" | "default"> = {
  verified: "success",
  pending: "warm",
  unverified: "cold",
  none: "default",
};

const KYC_STATUS_LABEL: Record<string, string> = {
  verified: "Verified",
  pending: "Under Review",
  unverified: "Not Verified",
  none: "Not Submitted",
};

const DOC_STATUS_TONE: Record<string, "success" | "warm" | "cold" | "default"> = {
  verified: "success",
  pending: "warm",
  unverified: "cold",
};

function DocStatusIcon({ status }: { status: string }) {
  if (status === "verified") return <CheckCircle2 size={16} className="text-emerald-500" />;
  if (status === "unverified") return <XCircle size={16} className="text-red-500" />;
  return <Clock size={16} className="text-amber-500" />;
}

export function KYCTab() {
  const { session } = useAuth();
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [consented, setConsented] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const fileRefs = useRef<Record<DocType, HTMLInputElement | null>>({
    aadhaar: null,
    pan: null,
    income_proof: null,
    other: null,
  });

  const docsQ = trpc.users.kyc.myDocuments.useQuery(undefined, { enabled: !!session });

  const uploadMutation = trpc.media.uploadImage.useMutation();
  const submitMutation = trpc.users.kyc.submit.useMutation({
    onSuccess: () => docsQ.refetch(),
  });

  const docByType = new Map(
    (docsQ.data?.documents ?? []).map((d) => [d.type, d]),
  );

  const kycStatus = docsQ.data?.kycStatus ?? "none";

  const handleFileChange = async (type: DocType, file: File | undefined) => {
    if (!file) return;
    if (!consented) {
      toast.error("Please accept the KYC & Document Verification Policy first.");
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPEG, PNG, WEBP, or PDF files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5 MB.");
      return;
    }

    setUploading(type);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { url } = await uploadMutation.mutateAsync({
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf",
        data: base64,
        folder: "kyc",
      });

      await submitMutation.mutateAsync({ type, fileUrl: url });
      toast.success("Document uploaded successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      toast.error(msg);
    } finally {
      setUploading(null);
      if (fileRefs.current[type]) fileRefs.current[type]!.value = "";
    }
  };

  return (
    <>
      <Head t="Documents (KYC)" s="Verify once, transact faster." />

      <Section title="Verification Status">
        <div className="flex items-center gap-3">
          <Badge tone={KYC_STATUS_TONE[kycStatus] ?? "default"}>
            {KYC_STATUS_LABEL[kycStatus] ?? kycStatus}
          </Badge>
          {kycStatus === "none" && (
            <p className="text-xs text-muted-foreground">
              Upload your documents below to start verification.
            </p>
          )}
          {kycStatus === "pending" && (
            <p className="text-xs text-muted-foreground">
              Our team is reviewing your documents. This usually takes 1–2 business days.
            </p>
          )}
          {kycStatus === "verified" && (
            <p className="text-xs text-emerald-600 font-medium">
              Your profile is fully verified.
            </p>
          )}
          {kycStatus === "unverified" && (
            <p className="text-xs text-red-600">
              Verification was unsuccessful. Please re-upload correct documents.
            </p>
          )}
        </div>
      </Section>

      <Section title="KYC & Document Verification Policy">
        <div className="rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setPolicyOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-navy">
              <ShieldCheck size={16} className="shrink-0 text-accent" />
              How we handle your documents (DPDP Act 2023)
            </span>
            <ChevronDown
              size={16}
              className={`shrink-0 text-muted-foreground transition-transform ${policyOpen ? "rotate-180" : ""}`}
            />
          </button>
          {policyOpen && (
            <div className="space-y-3 border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              <div>
                <p className="font-semibold text-navy">What We Collect</p>
                <p>
                  To verify your property listing, we collect Identity Proof (Aadhaar, PAN),
                  Ownership Proof (Sale Deed, Title Deed, EC, Tax Receipts, Khata/Mutation), and
                  Project Documents (RERA Certificate, OC/CC) if applicable.
                </p>
              </div>
              <div>
                <p className="font-semibold text-navy">Why We Collect</p>
                <p>
                  Documents are used only to: (a) confirm you own the listed property, (b) prevent
                  fake listings and fraud, (c) mark your listing as “NxtSft Verified”, and (d) comply
                  with RERA and DPDP Act 2023. We never use docs for marketing or share them with
                  buyers/brokers.
                </p>
              </div>
              <div>
                <p className="font-semibold text-navy">Storage &amp; Security</p>
                <p>
                  All documents are encrypted (AES-256), stored on Indian servers, and accessible only
                  to our verification team. Aadhaar numbers are masked after verification – only last 4
                  digits retained.
                </p>
              </div>
              <div>
                <p className="font-semibold text-navy">Retention</p>
                <p>
                  We keep documents while your listing is active + 90 days. After account closure, all
                  KYC data is permanently deleted within 180 days.
                </p>
              </div>
              <div>
                <p className="font-semibold text-navy">Your Rights</p>
                <p>
                  You can access, correct, or delete your documents anytime via privacy@nxtsft.com.
                  Withdrawing consent will remove the “Verified” badge and may delist your property.
                </p>
              </div>
              <div>
                <p className="font-semibold text-navy">Consent</p>
                <p>
                  By uploading, you give specific consent under DPDP Act for NxtSft to process your
                  documents for verification only.
                </p>
              </div>
              <p className="pt-1 text-muted-foreground/80">
                Contact: Data Protection Officer – dpo@nxtsft.com, Hyderabad
              </p>
            </div>
          )}
        </div>

        <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-border px-4 py-3">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
          />
          <span className="text-xs leading-relaxed text-muted-foreground">
            I consent to NxtSft collecting my Aadhaar, PAN, and property documents to verify my
            ownership and mark my listing as “Verified”. I understand docs are used only for KYC/RERA
            compliance, stored encrypted, and not shared with buyers. I can delete my data anytime.
          </span>
        </label>
      </Section>

      <Section title="Documents">
        {!consented && (
          <p className="mb-3 text-xs text-amber-600">
            Accept the policy above to enable document upload.
          </p>
        )}
        <div className="divide-y divide-border rounded-xl border border-border">
          {DOC_TYPES.map(({ key, label }) => {
            const doc = docByType.get(key);
            const isUploading = uploading === key;

            return (
              <div key={key} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={16} className="shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-navy">{label}</div>
                    {doc && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <DocStatusIcon status={doc.status} />
                        <Badge tone={DOC_STATUS_TONE[doc.status] ?? "default"}>
                          {doc.status === "pending" ? "Pending review" : doc.status === "verified" ? "Verified" : "Not verified"}
                        </Badge>
                        {doc.adminNotes && (
                          <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                            — {doc.adminNotes}
                          </span>
                        )}
                      </div>
                    )}
                    {!doc && (
                      <div className="text-xs text-muted-foreground mt-0.5">Not submitted</div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {doc && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-accent hover:text-accent transition"
                    >
                      <ExternalLink size={12} />
                      View
                    </a>
                  )}
                  <input
                    ref={(el) => { fileRefs.current[key] = el; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange(key, e.target.files?.[0])}
                  />
                  <button
                    onClick={() => fileRefs.current[key]?.click()}
                    disabled={isUploading || !consented}
                    title={!consented ? "Accept the policy above first" : undefined}
                    className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Upload size={12} />
                    {isUploading ? "Uploading…" : doc ? "Re-upload" : "Upload"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Accepted formats: JPEG, PNG, WEBP, PDF · Max 5 MB per file.
        </p>
      </Section>
    </>
  );
}
