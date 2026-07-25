"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function InstallInstructions({
  domain,
  appUrl,
  siteId,
}: {
  domain: string;
  appUrl: string;
  siteId: string;
}) {
  const router = useRouter();
  const snippet = `<script defer data-domain="${domain}" src="${appUrl}/script.js"></script>`;

  function copy() {
    navigator.clipboard.writeText(snippet);
    toast.success("Snippet copied to clipboard");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All sites
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Install Analytica on {domain}</CardTitle>
          <CardDescription>
            Paste this snippet into the <code>&lt;head&gt;</code> of your website.
            Once we receive the first pageview, your dashboard will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <code className="block whitespace-pre-wrap break-all text-sm">
              {snippet}
            </code>
          </div>
          <div className="flex gap-2">
            <Button onClick={copy}>
              <Copy className="h-4 w-4" /> Copy snippet
            </Button>
            <Button variant="outline" onClick={() => router.refresh()}>
              <RefreshCw className="h-4 w-4" /> Check for data
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Waiting for the first pageview from{" "}
            <span className="font-medium">{domain}</span>… By default the script
            ignores traffic from localhost. Add{" "}
            <code>data-track-localhost</code> to test locally.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
