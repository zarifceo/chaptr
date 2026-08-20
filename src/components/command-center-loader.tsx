"use client";

import dynamic from "next/dynamic";
import Image from "next/image";

const CommandCenter = dynamic(() => import("./command-center"), {
  ssr: false,
  loading: () => (
    <div className="app-loading" aria-busy="true" aria-label="Loading Chaptr">
      <Image src="/chaptr-icon-192.png" width={54} height={54} alt="Chaptr" priority />
      <strong>Chaptr</strong>
      <span>Loading your study workspace…</span>
    </div>
  ),
});

export default function CommandCenterLoader() {
  return <CommandCenter />;
}
