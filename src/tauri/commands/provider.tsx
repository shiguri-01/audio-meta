import {
  createContext,
  createMemo,
  createResource,
  type ParentComponent,
  useContext,
} from "solid-js";
import { commands } from "./commands";
import type { Commands } from "./types";

const mockEnv = import.meta.env.VITE_USE_MOCK_COMMANDS;
const isMockEnabled = mockEnv === "true" || mockEnv === true;

const CommandsContext = createContext<Commands>();

export const CommandsProvider: ParentComponent = (props) => {
  const [mockCommandsResource] = createResource(
    () => isMockEnabled,
    async (enabled) => {
      if (!enabled) return null;
      try {
        const mod = await import("./commands.mock");
        console.log("Mock commands loaded");
        return mod.mockCommands;
      } catch (err) {
        console.error("Error loading mock commands:", err);
        return null;
      }
    },
  );

  // createMemoでvalueをラップする
  const contextValue = createMemo(() => {
    const mockCommands = mockCommandsResource();
    // モックが有効で、かつ読み込みが終わって値が存在する場合にモックを返す
    return isMockEnabled && mockCommands ? mockCommands : commands;
  });

  return (
    // valueにはメモの実行結果（値）を渡す
    <CommandsContext.Provider value={contextValue()}>
      {props.children}
    </CommandsContext.Provider>
  );
};

export const useCommands = (): Commands => {
  const context = useContext(CommandsContext);
  if (!context) {
    throw new Error("useCommands must be used within a CommandsProvider");
  }
  return context;
};
