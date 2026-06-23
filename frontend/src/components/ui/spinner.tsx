import { useTranslation } from "react-i18next"
import { LoaderIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const { t } = useTranslation()
  return (
    <LoaderIcon
      role="status"
      aria-label={t("ui.loading")}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
