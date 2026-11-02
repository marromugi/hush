import type { SVGProps } from "react";

export type LogoProps = Omit<SVGProps<SVGSVGElement>, "children" | "viewBox">;
