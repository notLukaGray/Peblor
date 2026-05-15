"use client";

import { createContext, useContext } from "react";

export const GraphicLinkHoverContext = createContext<boolean>(false);

export function useGraphicLinkHover(): boolean {
  return useContext(GraphicLinkHoverContext);
}
