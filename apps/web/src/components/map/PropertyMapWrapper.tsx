import dynamic from "next/dynamic";
import type { PropertyMapProps } from "./PropertyMap";
import "mapbox-gl/dist/mapbox-gl.css";

const PropertyMapContent = dynamic(() => import("./PropertyMap").then((m) => ({ default: m.PropertyMap })), { ssr: false });

export function PropertyMapWrapper(props: PropertyMapProps) {
  return <PropertyMapContent {...props} />;
}
