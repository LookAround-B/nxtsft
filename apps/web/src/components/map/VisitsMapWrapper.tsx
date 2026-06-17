import dynamic from "next/dynamic";
import "mapbox-gl/dist/mapbox-gl.css";
export type { VisitPoint } from "./VisitsMap";

const VisitsMapContent = dynamic(() => import("./VisitsMap").then((m) => ({ default: m.VisitsMap })), { ssr: false });

export function VisitsMapWrapper(props: React.ComponentProps<typeof VisitsMapContent>) {
  return <VisitsMapContent {...props} />;
}
