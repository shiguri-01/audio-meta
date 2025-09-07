import { makeEventListener } from "@solid-primitives/event-listener";
import { cva, type VariantProps } from "class-variance-authority";
import {
  type ComponentProps,
  createEffect,
  createMemo,
  createUniqueId,
  mergeProps,
  onCleanup,
  type ParentComponent,
  splitProps,
  untrack,
} from "solid-js";
import { addAriaDescribedBy, removeAriaDescribedBy } from "@/utils/a11y";
import { cn } from "@/utils/style";

const tooltipVariants = cva(
  [
    "bg-bg text-fg",
    "text-sm px-2 py-1 rounded-sm shadow whitespace-nowrap",
    "absolute", // anchorのために必要
    "opacity-0 open:opacity-100 transition-discrete starting:open:opacity-0 transition-all",
  ],
  {
    variants: {
      position: {
        top: "bottom-[anchor(top)] mb-1 left-[anchor(center)] -translate-x-1/2",
        bottom:
          "top-[anchor(bottom)] mt-1 left-[anchor(center)] -translate-x-1/2",
        left: "right-[anchor(left)] mr-1 top-[anchor(center)] -translate-y-1/2",
        right:
          "left-[anchor(right)] ml-1 top-[anchor(center)] -translate-y-1/2",
      },
    },
    defaultVariants: {
      position: "bottom",
    },
  },
);

export type TooltipVisibility = "auto" | "always" | "never";
export type TooltipPosition = "top" | "bottom" | "left" | "right";

const defaultProps: {
  position: TooltipPosition;
  visible: TooltipVisibility;
} = {
  position: "bottom",
  visible: "auto",
} as const;

const getTooltipName = (id: string) => `--tooltip-${id}`;

export const Tooltip: ParentComponent<
  ComponentProps<"div"> &
    VariantProps<typeof tooltipVariants> & {
      trigger: HTMLElement;
      visible?: TooltipVisibility;
    }
> = (props) => {
  const [local, rest] = splitProps(mergeProps(defaultProps, props), [
    "id",
    "class",
    "children",
    "trigger",
    "position",
    "visible",
  ]);

  const id = createMemo(() => local.id ?? createUniqueId());

  let tooltipRef!: HTMLDivElement;

  const showPopover = () => {
    if (!tooltipRef.matches(":popover-open")) {
      tooltipRef.showPopover();
    }
  };

  const hidePopover = () => {
    if (tooltipRef.matches(":popover-open")) {
      tooltipRef.hidePopover();
    }
  };

  createEffect(() => {
    const trigger = local.trigger;
    if (!trigger) return;

    const clearMouseEnter = makeEventListener(trigger, "mouseenter", () => {
      if (untrack(() => local.visible) === "auto") {
        showPopover();
      }
    });
    const clearMouseLeave = makeEventListener(trigger, "mouseleave", () => {
      if (untrack(() => local.visible) === "auto") {
        hidePopover();
      }
    });

    const currentId = id();
    trigger.setAttribute("popovertarget", currentId);
    trigger.style.setProperty("anchor-name", getTooltipName(currentId));
    addAriaDescribedBy(trigger, currentId);

    onCleanup(() => {
      clearMouseEnter();
      clearMouseLeave();
      trigger.removeAttribute("popovertarget");
      trigger.style.removeProperty("anchor-name");
      removeAriaDescribedBy(trigger, currentId);
    });
  });

  createEffect(() => {
    switch (local.visible) {
      case "always":
        tooltipRef.setAttribute("popover", "manual");
        showPopover();
        break;
      case "never":
        tooltipRef.setAttribute("popover", "manual");
        hidePopover();
        break;
      case "auto":
        tooltipRef.setAttribute("popover", "auto");
    }
  });

  return (
    <div
      id={id()}
      popover
      ref={tooltipRef}
      role="tooltip"
      style={`position-anchor: ${getTooltipName(id())};`}
      class={cn(tooltipVariants({ position: local.position }), local.class)}
      {...rest}
    >
      {local.children}
    </div>
  );
};
