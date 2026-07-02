"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Upload, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
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

      <Section title="Documents">
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
                    disabled={isUploading}
                    className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
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
