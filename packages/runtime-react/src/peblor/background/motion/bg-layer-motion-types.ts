export type BgLoopMotion = {
  type: "loop";
  animate: Record<string, unknown>;
  transition: {
    duration: number;
    ease?: string | [number, number, number, number];
    delay?: number;
    repeatType?: "loop" | "reverse" | "mirror";
  };
};

export type BgEntranceMotion = {
  type: "entrance";
  initial: Record<string, unknown>;
  animate: Record<string, unknown>;
  transition: {
    duration: number;
    ease?: string | [number, number, number, number];
    delay?: number;
  };
  trigger?: "onMount" | "onFirstVisible" | "onEveryVisible";
  viewport?: { once?: boolean; amount?: number | "some" | "all"; margin?: string };
};

export type BgScrollMotion = {
  type: "scroll";
  properties: Record<string, [unknown, unknown]>;
  offset?: [string, string];
  clamp?: boolean;
};

export type BgPointerMotion = {
  type: "pointer";
  x?: Record<string, [unknown, unknown]>;
  y?: Record<string, [unknown, unknown]>;
  ease?: number;
};

export type BgParallaxMotion = {
  type: "parallax";
  speed: number;
  axis?: "x" | "y";
  offset?: [string, string];
};

export type BgTriggerMotion = {
  type: "trigger";
  id: string;
  from: Record<string, unknown>;
  to: Record<string, unknown>;
  transition?: {
    duration?: number;
    ease?: string | [number, number, number, number];
    delay?: number;
  };
  autoPlay?: boolean;
  autoPlayDelay?: number;
  toggle?: boolean;
};

export type BgLayerMotion =
  | BgLoopMotion
  | BgEntranceMotion
  | BgScrollMotion
  | BgPointerMotion
  | BgParallaxMotion
  | BgTriggerMotion;
