import { Toaster as Sonner } from "sonner"

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      theme="light"
      position="top-right"
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-800 border border-slate-700 group-[.toaster]:text-slate-100 group-[.toaster]:border-slate-700 group-[.toaster]:shadow-xl",
          description: "group-[.toast]:text-slate-400",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-slate-700 group-[.toast]:text-slate-300",
          closeButton:
            "group-[.toast]:bg-slate-700 group-[.toast]:text-slate-200 group-[.toast]:border-slate-600 hover:group-[.toast]:bg-slate-600",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
