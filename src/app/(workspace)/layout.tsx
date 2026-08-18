import CommandCenterLoader from "@/components/command-center-loader";

export default function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}<CommandCenterLoader /></>;
}
