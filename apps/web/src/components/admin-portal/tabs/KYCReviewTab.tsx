"use client";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { Section, Badge } from "@/components/portal/PortalShell";
import { trpc } from "@/lib/trpc";
import { PageHead } from "./PageHead";

const FILTER_OPTIONS = [
  { label: "Pending Review", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Unverified", value: "unverified" },
  { label: "All Submitted", value: undefined },
] as const;

type KycStatusFilter = "pending" | "verified" | "unverified" | undefined;

const USER_KYC_STATUS_TONE: Record<string, "success" | "warm" | "cold" | "default"> = {
  verified: "success",
  pending: "warm",
  unverified: "cold",
  none: "default",
};

const DOC_STATUS_TONE: Record<string, "success" | "warm" | "cold" | "default"> = {
  verified: "success",
  pending: "warm",
  unverified: "cold",
};

const DOC_TYPE_LABEL: Record<string, string> = {
  aadhaar: "Aadhaar Card",
  pan: "PAN Card",
  income_proof: "Income Proof",
  other: "Other",
};

const USER_KYC_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
] as const;

type UserItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  kycStatus: string;
  joined: Date | string;
  kycDocuments: {
    id: string;
    type: string;
    fileUrl: string;
    status: string;
    adminNotes: string | null;
    reviewedAt: Date | string | null;
  }[];
};

function UserKYCRow({ user, onRefetch }: { user: UserItem; onRefetch: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [docNotes, setDocNotes] = useState<Record<string, string>>({});
  const [userNote, setUserNote] = useState("");
  const [userKycStatus, setUserKycStatus] = useState(user.kycStatus);

  const updateDoc = trpc.admin.users.updateDocStatus.useMutation({
    onSuccess: () => { toast.success("Document status updated."); onRefetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const setUserStatus = trpc.admin.users.setUserKycStatus.useMutation({
    onSuccess: () => { toast.success("User KYC status updated."); onRefetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-secondary/30 transition"
      >
        <div className="min-w-0 flex items-center gap-3">
          <ShieldCheck size={16} className="shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-navy">{user.name}</span>
              <Badge tone={USER_KYC_STATUS_TONE[user.kycStatus] ?? "default"}>
                KYC: {user.kycStatus}
              </Badge>
              <Badge tone={user.role === "home-seller" ? "warm" : "new"}>
                {user.role === "home-seller" ? "Seller" : "Buyer"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
          <span className="text-xs">{user.kycDocuments.length} doc{user.kycDocuments.length !== 1 ? "s" : ""}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border bg-secondary/20 px-4 py-4 space-y-4">
          {user.kycDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documents</p>
              {user.kycDocuments.map((doc) => (
                <div key={doc.id} className="rounded-lg border border-border bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-muted-foreground" />
                      <span className="text-sm font-medium text-navy">
                        {DOC_TYPE_LABEL[doc.type] ?? doc.type}
                      </span>
                      <Badge tone={DOC_STATUS_TONE[doc.status] ?? "default"}>{doc.status}</Badge>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                    >
                      <ExternalLink size={12} />
                      View
                    </a>
                  </div>
                  {doc.adminNotes && (
                    <p className="text-xs text-muted-foreground">Note: {doc.adminNotes}</p>
                  )}
                  <div className="flex flex-wrap items-end gap-2 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Admin Notes
                      </label>
                      <input
                        type="text"
                        value={docNotes[doc.id] ?? ""}
                        onChange={(e) => setDocNotes((n) => ({ ...n, [doc.id]: e.target.value }))}
                        placeholder="Optional note…"
                        className="w-52 rounded-lg border border-input bg-white px-3 py-1.5 text-xs focus:border-accent focus:outline-none"
                      />
                    </div>
                    {(["verified", "pending", "unverified"] as const).map((s) => (
                      <button
                        key={s}
                        disabled={updateDoc.isPending}
                        onClick={() =>
                          updateDoc.mutate({
                            docId: doc.id,
                            status: s,
                            adminNotes: docNotes[doc.id] || undefined,
                          })
                        }
                        className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                          doc.status === s
                            ? "border-accent bg-accent text-white"
                            : "border-border bg-white text-navy hover:border-accent hover:text-accent"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Overall Profile KYC Status
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Note (sent to user)
                </label>
                <input
                  type="text"
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="Optional message to user…"
                  className="w-64 rounded-lg border border-input bg-white px-3 py-1.5 text-xs focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Set Status
                </label>
                <div className="flex gap-1.5">
                  {USER_KYC_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      disabled={setUserStatus.isPending}
                      onClick={() => {
                        setUserKycStatus(opt.value);
                        setUserStatus.mutate({
                          userId: user.id,
                          kycStatus: opt.value,
                          note: userNote || undefined,
                        });
                      }}
                      className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                        userKycStatus === opt.value
                          ? "border-accent bg-accent text-white"
                          : "border-border bg-white text-navy hover:border-accent hover:text-accent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function KYCReviewTab() {
  const [filter, setFilter] = useState<KycStatusFilter>("pending");

  const kycQ = trpc.admin.users.kycList.useQuery({
    kycStatus: filter,
    cursor: undefined,
    limit: 30,
  });

  const users = (kycQ.data?.items ?? []) as UserItem[];

  return (
    <>
      <PageHead
        title="KYC Review"
        subtitle="Review uploaded documents and set verification status for Home Buyers and Sellers."
      />

      <Section title="Filter">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setFilter(opt.value as KycStatusFilter)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                filter === opt.value
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-white text-navy hover:border-accent hover:text-accent"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title={`Users (${users.length})`}>
        {kycQ.isLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {!kycQ.isLoading && users.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No users found with status: {filter ?? "all submitted"}.
          </p>
        )}
        {users.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            {users.map((u) => (
              <UserKYCRow key={u.id} user={u} onRefetch={() => kycQ.refetch()} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
