import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 text-center">
      <h1 className="font-display text-3xl text-nexis-dark">Page Not Found</h1>
      <p className="mt-3 text-sm text-nexis-dark/60">The page you&rsquo;re looking for doesn&rsquo;t exist.</p>
      <div className="mt-6 w-full max-w-xs">
        <Link href="/">
          <Button fullWidth>Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}
