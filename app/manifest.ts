import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pickleball Record",
    short_name: "Pickleball",
    description: "Trusted club competition records and courtside operations.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7faf8",
    theme_color: "#176b42",
    orientation: "any",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
