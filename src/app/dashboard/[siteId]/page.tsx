import { ObjectId } from "mongodb";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { SiteDashboard } from "@/components/dashboard/site-dashboard";
import { InstallInstructions } from "@/components/dashboard/install-instructions";

export const dynamic = "force-dynamic";

export default async function SitePage({
  params,
}: {
  params: { siteId: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!ObjectId.isValid(params.siteId)) notFound();
  const siteId = new ObjectId(params.siteId);

  const db = await getDb();
  const site = await db
    .collection("sites")
    .findOne({ _id: siteId, userId: new ObjectId(session.userId) });
  if (!site) notFound();

  const eventCount = await db
    .collection("events")
    .countDocuments({ siteId }, { limit: 1 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (eventCount === 0) {
    return (
      <InstallInstructions
        domain={site.domain}
        appUrl={appUrl}
        siteId={params.siteId}
      />
    );
  }

  return <SiteDashboard siteId={params.siteId} domain={site.domain} />;
}
