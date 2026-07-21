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
  "event.info": lazy(() => import("@/widgets/event-info/EventInfoWidget")),
  "event.guests": lazy(() => import("@/widgets/event-guests/EventGuestsWidget")),
  "event.responses": lazy(() => import("@/widgets/event-responses/EventResponsesWidget")),
  "event.contributions": lazy(() => import("@/widgets/event-contributions/EventContributionsWidget")),
  "event.type": lazy(() => import("@/widgets/event-type/EventTypeWidget")),
  "event.menu": lazy(() => import("@/widgets/event-menu/EventMenuWidget")),
  "event.checklist": lazy(() => import("@/widgets/event-checklist/EventChecklistWidget")),
  "event.planning": lazy(() => import("@/widgets/event-planning/EventPlanningWidget")),
  "event.messages": lazy(() => import("@/widgets/event-messages/EventMessagesWidget")),
  "event.photos": lazy(() => import("@/widgets/event-photos/EventPhotosWidget")),
  "event.documents": lazy(() => import("@/widgets/event-documents/EventDocumentsWidget")),
  "event.budget": lazy(() => import("@/widgets/event-budget/EventBudgetWidget")),
  "event.gifts": lazy(() => import("@/widgets/event-gifts/EventGiftsWidget")),
  "event.location": lazy(() => import("@/widgets/event-location/EventLocationWidget")),
  "event.history": lazy(() => import("@/widgets/event-history/EventHistoryWidget")),
  "event.notes": lazy(() => import("@/widgets/event-notes/EventNotesWidget")),
  "contacts.book": lazy(() => import("@/widgets/contacts-book/ContactsBookWidget")),
  "event.extensions": lazy(() => import("@/widgets/event-extensions")),
  "dashboard.stats": lazy(() => import("@/widgets/dashboard/StatsWidget")),
  "dashboard.upcoming": lazy(() => import("@/widgets/dashboard/UpcomingEventsWidget")),
  "dashboard.quick-actions": lazy(() => import("@/widgets/dashboard/QuickActionsWidget")),
  "dashboard.activity": lazy(() => import("@/widgets/dashboard/RecentActivityWidget")),
  "event.new.type": lazy(() => import("@/widgets/event-new/TypeStepWidget")),
  "event.new.info": lazy(() => import("@/widgets/event-new/InfoStepWidget")),
  "event.new.widgets": lazy(() => import("@/widgets/event-new/WidgetsStepWidget")),
};



import { EXTENSIONS } from "@/core/extensions/registry";

// Extension widgets are merged into the same lookup table so that the shell
// and <WidgetRenderer /> resolve them transparently. Extensions never mutate
// the Core registry — they only contribute additional entries at build time.
for (const ext of EXTENSIONS) {
  for (const w of ext.widgets ?? []) {
    if (!registry[w.key]) registry[w.key] = w.component;
  }
}

export function resolveWidgetComponent(key: string): WidgetComponent | null {
  return registry[key] ?? null;
}

export function listRegisteredComponentKeys(): string[] {
  return Object.keys(registry);
}
