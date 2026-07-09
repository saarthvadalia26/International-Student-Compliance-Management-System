import * as React from "react";
import { NotFoundState } from "@/components/ui/not-found-state";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <div className="flex flex-col items-center">
        <NotFoundState
          title="Page Not Found"
          description="We couldn't find the page you were looking for. It might have been moved or deleted."
        />
        <Link href="/" passHref className="mt-4">
          <Button variant="outline">Go Back Home</Button>
        </Link>
      </div>
    </div>
  );
}
