// Minimal ambient declarations for the Figma Widget API.
// Replace with @figma/widget-typings when available.

interface BaseNode {
  id: string;
  name: string;
  type: string;
  parent: BaseNode | null;
}

interface LayoutMixin {
  width: number;
  height: number;
}

interface ChildrenMixin {
  children: ReadonlyArray<SceneNode>;
}

interface SceneNode extends BaseNode, Partial<LayoutMixin>, Partial<ChildrenMixin> {
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
}

interface PageNode extends BaseNode {
  readonly selection: ReadonlyArray<SceneNode>;
}

interface WidgetNode {
  readonly __widgetNode: unique symbol;
}

interface TextStyle {
  id: string;
  name: string;
}

type WidgetProps = Record<string, unknown>;
type WidgetComponent = (props: WidgetProps) => WidgetNode;

declare namespace figma {
  const currentPage: PageNode;
  function on(event: "selectionchange" | "run" | "close" | "drop", callback: () => void): void;
  function off(event: string, callback: () => void): void;
  function closePlugin(message?: string): void;
  function getLocalTextStyles(): ReadonlyArray<TextStyle>;

  namespace widget {
    function register(component: () => WidgetNode): void;
    function h(
      type: string | WidgetComponent | symbol,
      props: WidgetProps | null,
      ...children: (WidgetNode | string | boolean | null | undefined)[]
    ): WidgetNode;
    const Fragment: symbol;

    function useSyncedState<T>(key: string, defaultValue: T): [T, (value: T) => void];
    function useEffect(callback: () => (() => void) | void): void;

    const AutoLayout: WidgetComponent;
    const Text: WidgetComponent;
    const Frame: WidgetComponent;
    const Rectangle: WidgetComponent;
    const Ellipse: WidgetComponent;
    const Image: WidgetComponent;
    const Input: WidgetComponent;
    const SVG: WidgetComponent;
    const Span: WidgetComponent;
  }
}
