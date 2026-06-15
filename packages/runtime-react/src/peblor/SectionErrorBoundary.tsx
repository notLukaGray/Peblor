"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Section key for logging */
  sectionKey?: string;
  /** When true, render fallback instead of null (e.g. dev placeholder) */
  fallback?: ReactNode;
};

type State = { hasError: boolean };

/**
 * Catches runtime render errors in a single section so the rest of the page still renders.
 * Schema-invalid content should be filtered earlier by loader validation and not rely on this boundary.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[runtime-react] Section render error", {
      sectionKey: this.props.sectionKey,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const fallback = this.props.fallback;
      if (fallback != null) {
        return (
          <div role="alert" aria-live="assertive">
            <span className="sr-only">An error occurred in this section</span>
            {fallback}
          </div>
        );
      }
      return (
        <div role="alert" aria-live="assertive" aria-atomic="true">
          <span className="sr-only">An error occurred in this section</span>
        </div>
      );
    }
    return this.props.children;
  }
}

type ElementBoundaryProps = {
  children: ReactNode;
  elementKey?: string;
};

/** Catches render errors in a single element so the rest of the section (e.g. content block) still renders. */
export class ElementErrorBoundary extends Component<ElementBoundaryProps, State> {
  constructor(props: ElementBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[runtime-react] Element render error", {
      elementKey: this.props.elementKey,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div role="alert" aria-live="assertive" aria-atomic="true">
          <span className="sr-only">An error occurred in this element</span>
        </div>
      );
    }
    return this.props.children;
  }
}
