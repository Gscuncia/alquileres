import { SignInForm } from "@/components/auth/signin-form";

interface SignInPageProps {
  searchParams: { callbackUrl?: string };
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  const callbackUrl = searchParams.callbackUrl ?? "/admin";

  return <SignInForm callbackUrl={callbackUrl} />;
}
