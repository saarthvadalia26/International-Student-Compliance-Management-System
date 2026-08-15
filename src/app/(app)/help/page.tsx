"use client";

import * as React from "react";
import { HelpCircle, Phone, Mail, Building, Info, FileText, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Branding } from "@/config/branding";

export default function HelpPage() {
  const faqs = [
    {
      q: "How are student compliance metrics recalculated?",
      a: "The system automatically aggregates student passport, visa, and eFRRO validity fields into a cached student_snapshot record. High-performance indexes evaluate warning thresholds (e.g. 30 and 15 days pre-expiry) to determine real-time dashboard statistics."
    },
    {
      q: "How can I verify a student's newly uploaded eFRRO document?",
      a: "Navigate to the eFRRO Review Queue from the sidebar or click 'Direct Review Link' inside the alert context. You can preview the uploaded PDF document inline and choose to Approve or Reject the submission."
    },
    {
      q: "Where can I track PII unmasking actions?",
      a: "Sensitive data (Passport, Visa, and eFRRO numbers) are masked by default. Clicking the eye toggle triggers a secure API log that registers a UNMASK_PII event in the audit_log database, identifying the admin and time of access."
    },
    {
      q: "What file validation sizes are enforced for students?",
      a: "The student upload renewal page permits PDF and image document formats (JPEG/PNG), with the upper file size limit configured centrally by the institution administrator (default: 10MB). Duplicated files are automatically rejected using cryptographic SHA-256 checksum comparisons."
    }
  ];

  const docLinks = [
    { label: "ISCMS Administrator Guide", desc: "Complete reference manual for managing student records, reminder settings, and document audits." },
    { label: "Notification Rules Configurator", desc: "Instructional notes detailing pre-expiry and post-expiry threshold day offsets." },
    { label: "Supabase Security Architecture", desc: "Outline of row-level security (RLS) constraints, schema caches, and encrypted tokens." }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Help & Support</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Access system documentations, troubleshooting FAQs, and administrator support coordinates.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* FAQs */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-muted-foreground" /> Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {faqs.map((faq, index) => (
                <div key={index} className="space-y-1.5">
                  <h3 className="text-xs font-bold text-foreground flex items-start gap-1">
                    <span className="text-primary font-mono shrink-0">Q{index + 1}:</span>
                    {faq.q}
                  </h3>
                  <p className="text-xs text-muted-foreground pl-5 leading-relaxed">
                    {faq.a}
                  </p>
                  {index < faqs.length - 1 && <hr className="border-border/40 my-3" />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Documentation Placeholders Links */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-muted-foreground" /> Reference Manuals & Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-1">
                {docLinks.map((doc, idx) => (
                  <div key={idx} className="flex items-start justify-between p-3.5 rounded-lg border border-border/65 hover:border-primary/45 bg-muted/5 transition-all">
                    <div className="space-y-0.5 max-w-[85%]">
                      <h4 className="text-xs font-semibold text-foreground">{doc.label}</h4>
                      <p className="text-[10px] text-muted-foreground">{doc.desc}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent cursor-pointer" disabled>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* NFSU Support Contacts */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Support Contact</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-2.5">
                <Building className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-foreground">{Branding.shortName} Institution</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                    {Branding.universityName}, International Student Cell
                  </p>
                </div>
              </div>

              <hr className="border-border/40" />

              <div className="flex items-start gap-2.5">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Support Role</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">System Administrator</p>
                </div>
              </div>

              <hr className="border-border/40" />

              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Email Coordinate</h4>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{Branding.supportEmail}</p>
                </div>
              </div>

              <hr className="border-border/40" />

              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Phone Coordinate</h4>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{Branding.supportPhone}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
