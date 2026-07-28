import Link from "next/link";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { ArrowRight, Globe } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { Card, CardContent } from "@/components/ui/card";
import { AddSite } from "@/components/dashboard/add-site";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const db = await getDb();
  const sites = await db
    .collection("sites")
    .find({ userId: new ObjectId(session.userId) })
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your sites</h1>
          <p className="text-sm text-muted-foreground">
            Select a site to view its analytics, or add a new one.
          </p>
        </div>
        <AddSite />
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Globe className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              You haven&apos;t added any sites yet.
            </p>
            <AddSite />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <Link key={site._id.toString()} href={`/dashboard/${site._id.toString()}`}>
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-center justify-between py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium">{site.domain}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
