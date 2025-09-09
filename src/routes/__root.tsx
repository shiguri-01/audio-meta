import { createRootRouteWithContext, Outlet } from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { Suspense } from "solid-js";
import { CommandsProvider } from "../tauri/commands";
import "solid-devtools";

export const Route = createRootRouteWithContext()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      {/* TODO: fallbackをいい感じにする */}
      <Suspense fallback={null}>
        <CommandsProvider>
          <Outlet />
        </CommandsProvider>
      </Suspense>
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  );
}
