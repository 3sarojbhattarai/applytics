import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BarChart3, Lock, Zap } from "lucide-react";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <BarChart3 className="h-5 w-5 text-primary" />
          Analytica
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <span className="mb-4 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Privacy-friendly · Cookieless
        </span>
        <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
          Simple web analytics <br /> without the creepy parts
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Track pageviews, visitors, top sources and pages with a lightweight
          script. No cookies, no personal data, just the numbers you need.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg">
            <Link href="/register">Start for free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Log in</Link>
          </Button>
        </div>

        <div className="mt-20 grid w-full gap-8 sm:grid-cols-3">
          <Feature icon={<Zap className="h-5 w-5" />} title="Lightweight">
            A tiny script that won&apos;t slow your site down.
          </Feature>
          <Feature icon={<Lock className="h-5 w-5" />} title="Private">
            No cookies and no personal data collected.
          </Feature>
          <Feature icon={<BarChart3 className="h-5 w-5" />} title="Clear">
            All your key metrics on one simple dashboard.
          </Feature>
        </div>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
