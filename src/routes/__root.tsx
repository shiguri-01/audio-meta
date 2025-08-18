import { createRootRouteWithContext, Outlet } from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { Suspense } from "solid-js";
import { CommandsProvider } from "../tauri/commands";

export const Route = createRootRouteWithContext()({
  component: RootComponent,
});

function RootComponent() {
  return (
    // TODO: fallbackをいい感じにする
    <Suspense fallback={null}>
      <CommandsProvider>
        <Outlet />
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </CommandsProvider>
    </Suspense>
  );
}
