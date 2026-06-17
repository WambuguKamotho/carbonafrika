import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: 32, height: 32, borderRadius: 6, background: "#00C853", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {/* Trunk */}
        <div style={{ position: "absolute", bottom: 3, left: 14, width: 4, height: 12, background: "#7B4F2E", borderRadius: 2, display: "flex" }} />
        {/* Left branch */}
        <div style={{ position: "absolute", bottom: 12, left: 4, width: 12, height: 3, background: "#7B4F2E", borderRadius: 2, transform: "rotate(-30deg)", display: "flex" }} />
        {/* Right branch */}
        <div style={{ position: "absolute", bottom: 12, right: 4, width: 12, height: 3, background: "#7B4F2E", borderRadius: 2, transform: "rotate(30deg)", display: "flex" }} />
        {/* Left canopy */}
        <div style={{ position: "absolute", top: 5, left: 1, width: 14, height: 11, background: "#166534", borderRadius: "50%", display: "flex" }} />
        {/* Right canopy */}
        <div style={{ position: "absolute", top: 5, right: 1, width: 13, height: 10, background: "#166534", borderRadius: "50%", display: "flex" }} />
        {/* Centre canopy (front) */}
        <div style={{ position: "absolute", top: 2, left: 7, width: 18, height: 14, background: "#15803d", borderRadius: "50%", display: "flex" }} />
      </div>
    ),
    { ...size },
  );
}
