"use client";

import { Warning } from "@phosphor-icons/react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="fatal-error"><Warning weight="fill" /><h1>Chaptr hit a temporary problem.</h1><p>Your saved local work is still on this device. Retry the screen; queued cloud changes will remain safe.</p><button onClick={reset}>Try again</button></main>;
}
