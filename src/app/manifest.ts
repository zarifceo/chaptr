import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chaptr",
    short_name: "Chaptr",
    description: "Your syllabus, made manageable.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#f7f9fc",
    icons: [
      { src: "/chaptr-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/chaptr-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
