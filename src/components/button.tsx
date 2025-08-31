import { Button as KButton } from "@kobalte/core/button";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-solid";
import { type Component, type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/utils/style";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 px-3 py-1 rounded-md",
    "text-base leading-normal",
    "transition-colors cursor-pointer disabled:cursor-default",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-primary-bg text-primary-fg border border-primary-border",
          "hover:bg-primary-bg-hover active:bg-primary-bg",
          "disabled:bg-primary-bg-muted disabled:text-primary-fg-muted disabled:hover:bg-primary-bg-muted",
        ],
        secondary: [
          "bg-secondary-bg text-secondary-fg border border-secondary-border",
          "hover:bg-secondary-bg-hover active:bg-secondary-bg",
          "disabled:bg-secondary-bg-muted disabled:text-secondary-fg-muted disabled:hover:bg-secondary-bg-muted",
        ],
        tertiary: [
          "bg-tertiary-bg text-tertiary-fg border border-tertiary-border",
          "hover:bg-tertiary-bg-hover active:bg-tertiary-bg",
          "disabled:bg-tertiary-bg-muted disabled:text-tertiary-fg-muted disabled:hover:bg-tertiary-bg-muted",
        ],
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  },
);

const Button: Component<
  ComponentProps<typeof KButton> & VariantProps<typeof buttonVariants>
> = (props) => {
  const [local, rest] = splitProps(props, ["class", "variant", "children"]);
  return (
    <KButton
      class={cn(buttonVariants({ variant: local.variant }), local.class)}
      {...rest}
    >
      {local.children}
    </KButton>
  );
};

const IconButton: Component<
  Omit<ComponentProps<typeof KButton>, "children"> &
    VariantProps<typeof buttonVariants> & { icon: LucideIcon; children?: never }
> = (props) => {
  const [local, rest] = splitProps(props, ["class", "variant", "icon"]);
  return (
    <KButton
      class={cn(
        buttonVariants({ variant: local.variant }),
        "rounded-full p-[calc(0.25rem+0.3em/2)]",
        local.class,
      )}
      {...rest}
    >
      <local.icon size={"1.2em"} />
    </KButton>
  );
};

export { Button, IconButton };
