import {
  createContext,
  createResource,
  type ParentComponent,
  Show,
  useContext,
} from "solid-js";
import type { Commands } from "./types";

const mockEnv = import.meta.env.VITE_USE_MOCK_COMMANDS;
const isMockEnabled = mockEnv === "true" || mockEnv === true;

const CommandsContext = createContext<Commands>();

export const CommandsProvider: ParentComponent = (props) => {
  const [commandsResource] = createResource<Commands>(async () => {
    try {
      if (isMockEnabled) {
        const { mockCommands } = await import("./commands.mock");
        console.log("Mock commands loaded");
        return mockCommands;
      }

      return (await import("./commands")).commands;
    } catch (error) {
      console.error("Failed to load commands:", error);
      throw new Error("Failed to load commands");
    }
  });

  return (
    <Show when={commandsResource()}>
      <CommandsContext.Provider value={commandsResource()}>
        {props.children}
      </CommandsContext.Provider>
    </Show>
  );
};

export const useCommands = (): Commands => {
  const context = useContext(CommandsContext);
  if (!context) {
    throw new Error("useCommands must be used within a CommandsProvider");
  }
  return context;
};
