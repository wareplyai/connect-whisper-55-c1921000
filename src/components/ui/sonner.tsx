import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      expand
      richColors
      closeButton
      duration={4500}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-5 pr-10 shadow-2xl backdrop-blur-md " +
            "min-h-[78px] text-[15px] font-medium " +
            "group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border",
          title: "text-[15px] font-semibold leading-snug",
          description: "text-[13.5px] opacity-90 mt-1 leading-relaxed",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-sm",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-sm",
          closeButton:
            "group-[.toast]:!bg-transparent group-[.toast]:!border-0 group-[.toast]:!text-current group-[.toast]:hover:!opacity-100 group-[.toast]:!opacity-70",
          icon: "shrink-0 mt-0.5 [&>svg]:h-5 [&>svg]:w-5",
          success:
            "!bg-[hsl(142_70%_10%)] !text-[hsl(142_85%_85%)] !border-[hsl(142_70%_35%)] !shadow-[0_10px_40px_-10px_hsl(142_70%_45%/0.55)] [&>[data-icon]]:!text-[hsl(142_85%_60%)]",
          error:
            "!bg-[hsl(0_60%_12%)] !text-[hsl(0_90%_92%)] !border-[hsl(0_84%_55%)] !shadow-[0_10px_40px_-10px_hsl(0_84%_55%/0.6)] [&>[data-icon]]:!text-[hsl(0_90%_70%)]",
          warning:
            "!bg-[hsl(35_60%_12%)] !text-[hsl(40_95%_88%)] !border-[hsl(35_95%_55%)] !shadow-[0_10px_40px_-10px_hsl(35_95%_55%/0.55)] [&>[data-icon]]:!text-[hsl(40_95%_65%)]",
          info:
            "!bg-[hsl(210_50%_12%)] !text-[hsl(210_90%_92%)] !border-[hsl(210_90%_55%)] !shadow-[0_10px_40px_-10px_hsl(210_90%_55%/0.55)] [&>[data-icon]]:!text-[hsl(210_90%_70%)]",
        },
        style: {
          minWidth: "380px",
        },
      }}
      style={
        {
          "--width": "420px",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster, toast };
