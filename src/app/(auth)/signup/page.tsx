"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    // Role is NEVER set here — the DB forces every new account to Employee.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      // Email confirmation flow
      router.push("/login?checkEmail=1");
    }
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Get started with AssetFlow in seconds.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required placeholder="Priya Shah" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={6} placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <div className="flex items-start gap-2 rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <span>Signup creates an <strong>Employee</strong> account. Admins assign manager roles later — no self-elevation.</span>
        </div>

        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
