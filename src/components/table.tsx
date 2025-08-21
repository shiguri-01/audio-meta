import {
  type Component,
  type ComponentProps,
  onCleanup,
  splitProps,
} from "solid-js";
import { cn } from "@/utils/style";

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      tableKeyboardNav: true;
    }
  }
}

// biome-ignore lint/correctness/noUnusedVariables: used as directive
const tableKeyboardNav = (el: HTMLTableElement) => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // イベントが発生した要素がセル(td, th)でなければ何もしない
    const activeEl = document.activeElement;
    if (!(activeEl instanceof HTMLTableCellElement) || !el.contains(activeEl)) {
      return;
    }

    const key = e.key;
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
      return;
    }

    // デフォルトのスクロールなどを防ぐ
    e.preventDefault();

    const currentCell = activeEl;
    const currentRow = currentCell.parentElement as HTMLTableRowElement;
    const rows = Array.from(el.rows) as HTMLTableRowElement[];

    const currentRowIndex = currentRow.rowIndex;
    const currentColIndex = currentCell.cellIndex;

    let nextRowIndex = currentRowIndex;
    let nextColIndex = currentColIndex;

    switch (key) {
      case "ArrowUp":
        nextRowIndex = Math.max(currentRowIndex - 1, 0);
        break;
      case "ArrowDown":
        nextRowIndex = Math.min(currentRowIndex + 1, rows.length - 1);
        break;
      case "ArrowLeft":
        nextColIndex = Math.max(currentColIndex - 1, 0);
        break;
      case "ArrowRight":
        nextColIndex = Math.min(
          currentColIndex + 1,
          rows[currentRowIndex].cells.length - 1,
        );
        break;
    }

    // 次にフォーカスするセルを取得してフォーカスを当てる
    const nextCell = rows[nextRowIndex]?.cells[nextColIndex] as
      | HTMLTableCellElement
      | undefined;
    if (nextCell) {
      nextCell.focus();
    }
  };

  el.addEventListener("keydown", handleKeyDown);

  onCleanup(() => {
    el.removeEventListener("keydown", handleKeyDown);
  });
};

const TableRoot: Component<ComponentProps<"table">> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class="relative overflow-x-auto w-stretch">
      <table
        class={cn("w-stretch", local.class)}
        use:tableKeyboardNav
        {...rest}
      >
        {local.children}
      </table>
    </div>
  );
};

const TableHeader: Component<ComponentProps<"thead">> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <thead class={cn("border-b border-border", local.class)} {...rest}>
      {local.children}
    </thead>
  );
};

const TableHeaderRow: Component<ComponentProps<"tr">> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <tr
      class={cn(
        "border-b border-border last-of-type:border-b-0 bg-bg-surface",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </tr>
  );
};

const TableHeaderCell: Component<ComponentProps<"th">> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <th
      class={cn(
        "text-sm font-medium align-middle text-left whitespace-nowrap h-8 px-5",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </th>
  );
};

const TableBody: Component<ComponentProps<"tbody">> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <tbody class={local.class} {...rest}>
      {local.children}
    </tbody>
  );
};

const TableRow: Component<ComponentProps<"tr">> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <tr
      class={cn(
        "border-b border-border last-of-type:border-b-0 hover:bg-bg-surface/80",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </tr>
  );
};

const TableCell: Component<ComponentProps<"td">> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <td
      class={cn(
        "align-middle whitespace-nowrap h-8 px-4 py-1",
        "focus:bg-red-200 focus:outline-none",
        local.class,
      )}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: table cell needs to be focusable for keyboard navigation
      tabIndex={0}
      {...rest}
    >
      {local.children}
    </td>
  );
};

const TableFooter: Component<ComponentProps<"tfoot">> = (props) => {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <tfoot
      class={cn("border-t border-border bg-bg-surface", local.class)}
      {...rest}
    >
      {local.children}
    </tfoot>
  );
};

export const Table = Object.assign(TableRoot, {
  Header: TableHeader,
  HeaderRow: TableHeaderRow,
  HeaderCell: TableHeaderCell,
  Body: TableBody,
  Row: TableRow,
  Cell: TableCell,
  Footer: TableFooter,
});
