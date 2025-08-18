import { createRootRouteWithContext, Outlet } from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { CommandsProvider } from "../tauri/commands";

export const Route = createRootRouteWithContext()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <CommandsProvider>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </CommandsProvider>
  );
}
