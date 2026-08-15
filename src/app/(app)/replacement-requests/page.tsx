"use client";

import * as React from "react";
import Link from "next/link";
import { 
  FileText, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Loader2,
  Calendar,
  User,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  fetchReplacementRequestsAction, 
  approveReplacementRequestAction, 
  rejectReplacementRequestAction 
} from "./actions";
import { 
  DocumentReplacementRequestRecord, 
  DocumentReplacementStatus,
  DocumentReplacementReason,
  REASON_LABELS 
} from "@/domain/compliance/types/replacement-request.types";

export default function DocumentReplacementRequestsPage() {
  const [requests, setRequests] = React.useState<DocumentReplacementRequestRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<DocumentReplacementStatus | "all">("pending");
  const [docTypeFilter, setDocTypeFilter] = React.useState<"all" | "passport" | "visa" | "efrro">("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Modals state
  const [selectedRequest, setSelectedRequest] = React.useState<DocumentReplacementRequestRecord | null>(null);
  const [isApproveOpen, setIsApproveOpen] = React.useState(false);
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
  const [approvalDuration, setApprovalDuration] = React.useState("7");
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadRequests = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchReplacementRequestsAction({
        status: statusFilter,
        documentType: docTypeFilter,
        search: searchQuery
      });
      setRequests(res.requests);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load document replacement requests.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, docTypeFilter, searchQuery]);

  React.useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      setIsSubmitting(true);
      const res = await approveReplacementRequestAction(selectedRequest.id, {
        durationDays: parseInt(approvalDuration, 10) || 7
      });

      if (res.success) {
        toast.success(`Replacement request for ${selectedRequest.documentType.toUpperCase()} approved. Temporary upload authorization created.`);
        setIsApproveOpen(false);
        setSelectedRequest(null);
        await loadRequests();
      } else {
        toast.error(res.error || "Failed to approve request.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejecting this replacement request.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await rejectReplacementRequestAction(selectedRequest.id, {
        rejectionReason: rejectionReason.trim()
      });

      if (res.success) {
        toast.success(`Replacement request declined.`);
        setIsRejectOpen(false);
        setRejectionReason("");
        setSelectedRequest(null);
        await loadRequests();
      } else {
        toast.error(res.error || "Failed to reject request.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Rejection failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Document Replacement Requests
            </h1>
            {pendingCount > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-semibold">
                {pendingCount} Pending Review
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Review, approve, and audit student requests for early document replacement before the normal pre-expiry window.
          </p>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadRequests} 
          disabled={isLoading}
          className="h-8 text-xs gap-1.5 self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-3 rounded-xl border border-border/60 shadow-sm">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "pending", label: "Pending Review" },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Rejected" },
            { id: "completed", label: "Completed" },
            { id: "expired", label: "Expired" },
            { id: "all", label: "All Requests" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as DocumentReplacementStatus | "all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Document Type */}
        <div className="flex items-center gap-2">
          <Select value={docTypeFilter} onValueChange={(val) => setDocTypeFilter(val as any)}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue placeholder="Doc Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Documents</SelectItem>
              <SelectItem value="passport">Passport</SelectItem>
              <SelectItem value="visa">Visa</SelectItem>
              <SelectItem value="efrro">eFRRO</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full md:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search student or reason..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading replacement requests...
        </div>
      ) : requests.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-muted/5">
          <CardContent className="p-12 text-center space-y-2">
            <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <div className="text-sm font-semibold text-foreground">No replacement requests found</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              There are currently no document replacement requests matching the selected status or filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map(req => {
            const isPending = req.status === "pending";
            const isApproved = req.status === "approved";
            const isRejected = req.status === "rejected";
            const isCompleted = req.status === "completed";

            return (
              <Card key={req.id} className="border border-border/60 shadow-xs hover:border-border transition-colors">
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Student & Request Details */}
                    <div className="space-y-2.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="uppercase font-bold tracking-wider text-[10px] px-2 py-0.5 bg-primary/5 text-primary border-primary/20">
                          {req.documentType}
                        </Badge>

                        <StatusBadge status={req.status} />

                        <span className="text-xs text-muted-foreground">
                          Submitted {new Date(req.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Link 
                          href={`/students/${req.studentId}`} 
                          className="text-sm font-bold text-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {req.studentFullName || "Student"}
                        </Link>
                        {req.studentRegistrationNumber && (
                          <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/40">
                            {req.studentRegistrationNumber}
                          </span>
                        )}
                        {req.studentEmail && (
                          <span className="text-xs text-muted-foreground">
                            ({req.studentEmail})
                          </span>
                        )}
                      </div>

                      {/* Reason & Student Message */}
                      <div className="bg-muted/10 p-3 rounded-lg border border-border/40 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                          Reason: {REASON_LABELS[req.reason] || req.reason}
                        </div>
                        <p className="text-xs text-muted-foreground pl-5 whitespace-pre-wrap">
                          &ldquo;{req.reasonDetails}&rdquo;
                        </p>
                      </div>

                      {/* Status Specific Notes */}
                      {isApproved && req.authorizationExpiresAt && (
                        <div className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Upload authorization active until {new Date(req.authorizationExpiresAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      )}

                      {isRejected && req.rejectionReason && (
                        <div className="text-xs text-rose-700 dark:text-rose-400 bg-rose-500/10 p-2.5 rounded border border-rose-500/20 space-y-0.5">
                          <div className="font-semibold flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" /> Rejection Reason:
                          </div>
                          <div className="pl-4.5">{req.rejectionReason}</div>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5 font-medium">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          New document uploaded and currently pending compliance verification.
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2 border-t lg:border-t-0 border-border/40 pt-3 lg:pt-0 shrink-0">
                      {isPending && (
                        <div className="flex items-center gap-2 w-full lg:w-auto">
                          <Button
                            size="sm"
                            className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => {
                              setSelectedRequest(req);
                              setIsApproveOpen(true);
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve Request
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs font-semibold"
                            onClick={() => {
                              setSelectedRequest(req);
                              setRejectionReason("");
                              setIsRejectOpen(true);
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject Request
                          </Button>
                        </div>
                      )}

                      <Link href={`/students/${req.studentId}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground gap-1">
                          View Student Profile
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Approve Request */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Approve Replacement Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Approving this request grants the student a temporary upload window to submit their new {selectedRequest?.documentType.toUpperCase()} document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-muted/20 rounded border border-border/60 space-y-1">
              <div className="font-semibold text-foreground">
                Student: {selectedRequest?.studentFullName} ({selectedRequest?.studentRegistrationNumber})
              </div>
              <div className="text-muted-foreground">
                Reason: {selectedRequest && (REASON_LABELS[selectedRequest.reason] || selectedRequest.reason)}
              </div>
              <div className="text-muted-foreground italic">
                &ldquo;{selectedRequest?.reasonDetails}&rdquo;
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Temporary Upload Authorization Duration</label>
              <Select value={approvalDuration} onValueChange={(val) => setApprovalDuration(val || "7")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="7">7 Days (Standard)</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                The student will have {approvalDuration} days to upload the replacement. If they fail to upload, the authorization expires automatically.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsApproveOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApprove} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Reject Request */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" />
              Reject Replacement Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Decline the early replacement request. A clear reason is required and will be displayed to the student.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Reason for Rejection (Mandatory)</label>
              <Textarea
                required
                rows={3}
                placeholder="e.g. Please provide an official police loss report or embassy acknowledgment letter before requesting early replacement..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsRejectOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleReject} disabled={isSubmitting || !rejectionReason.trim()}>
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentReplacementStatus }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] font-semibold gap-1">
          <Clock className="h-3 w-3" />
          Pending Review
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 text-[10px] font-semibold gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 text-[10px] font-semibold gap-1">
          <ShieldCheck className="h-3 w-3" />
          Completed
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 text-[10px] font-semibold">
          Expired
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 text-[10px] font-semibold">
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
