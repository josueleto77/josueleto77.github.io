import Link from "next/link";
import Logo from "@/components/logo/Logo";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <Link href="/" className="mb-6">
        <Logo />
      </Link>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-coral/10 text-coral">
        <Icon name="map-pin" className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-2xl font-extrabold text-navy">Page not found</h1>
      <p className="mt-2 text-sm text-ink/60">
        This page may have moved, or the listing you&apos;re looking for is no longer available.
      </p>
      <div className="mt-6 flex gap-3">
        <Button href="/">Back home</Button>
        <Button href="/search" variant="outline">
          Browse homes
        </Button>
      </div>
    </div>
  );
}
