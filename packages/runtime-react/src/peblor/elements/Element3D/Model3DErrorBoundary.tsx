"use client";

import { Component } from "react";
import type { ReactNode } from "react";

type Props = {
  url: string;
  onError: (url: string, error: unknown) => void;
  children: ReactNode;
};

type State = { hasError: boolean };

/**
 * react-three-fiber renders into its own reconciler root, so a DOM-tree error
 * boundary wrapping <Canvas> never sees errors thrown inside it. This boundary
 * has to live inside the Canvas/Suspense tree to catch a blocked or failed
 * GLTF fetch before it escapes to the page-level error boundary.
 */
export class Model3DErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    this.props.onError(this.props.url, error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
