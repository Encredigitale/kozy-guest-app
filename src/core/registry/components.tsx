import { lazy, type ComponentType, type LazyExoticComponent } from "react";

// Code-side registry: manifest.component (string key) -> React component.
// Adding a new widget means:
//   1. Register the component here with a stable key.
//   2. Insert a matching row in the `widgets` table (manifest.component === key).
// The Core never imports widgets directly; the shell does the lookup.

export type WidgetProps = {
  config?: Record<string, unknown>;
};

type WidgetComponent = LazyExoticComponent<ComponentType<WidgetProps>>;

const registry: Record<string, WidgetComponent> = {
  "hello-world": lazy(() => import("@/widgets/hello/HelloWidget")),
};

export function resolveWidgetComponent(key: string): WidgetComponent | null {
  return registry[key] ?? null;
}

export function listRegisteredComponentKeys(): string[] {
  return Object.keys(registry);
}
