import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { AnimatePresence, motion } from "framer-motion"

// ─── Context ──────────────────────────────────────────────────────────────────

type ExpandableScreenContextValue = {
  isExpanded: boolean
  expand: () => void
  collapse: () => void
  layoutId: string
  triggerRadius: string
  contentRadius: string
  animationDuration: number
}

const ExpandableScreenContext = createContext<ExpandableScreenContextValue | null>(null)

export function useExpandableScreen() {
  const ctx = useContext(ExpandableScreenContext)
  if (!ctx) throw new Error("useExpandableScreen must be used inside <ExpandableScreen>")
  return ctx
}

// ─── Root ─────────────────────────────────────────────────────────────────────

type ExpandableScreenProps = {
  children: React.ReactNode
  layoutId?: string
  triggerRadius?: string
  contentRadius?: string
  animationDuration?: number
  defaultExpanded?: boolean
  onExpandChange?: (expanded: boolean) => void
  lockScroll?: boolean
}

export function ExpandableScreen({
  children,
  layoutId = "expandable-card",
  triggerRadius = "15px",
  contentRadius = "20px",
  animationDuration = 0.35,
  defaultExpanded = false,
  onExpandChange,
  lockScroll = true,
}: ExpandableScreenProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const expand = useCallback(() => {
    setIsExpanded(true)
    onExpandChange?.(true)
  }, [onExpandChange])

  const collapse = useCallback(() => {
    setIsExpanded(false)
    onExpandChange?.(false)
  }, [onExpandChange])

  useEffect(() => {
    if (!lockScroll) return
    if (isExpanded) {
      document.documentElement.style.overflow = "hidden"
    } else {
      document.documentElement.style.overflow = ""
    }
    return () => {
      document.documentElement.style.overflow = ""
    }
  }, [isExpanded, lockScroll])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) collapse()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isExpanded, collapse])

  return (
    <ExpandableScreenContext.Provider
      value={{ isExpanded, expand, collapse, layoutId, triggerRadius, contentRadius, animationDuration }}
    >
      {children}
    </ExpandableScreenContext.Provider>
  )
}

// ─── Trigger ──────────────────────────────────────────────────────────────────

type ExpandableScreenTriggerProps = {
  children: React.ReactNode
  className?: string
}

export function ExpandableScreenTrigger({ children, className }: ExpandableScreenTriggerProps) {
  const { isExpanded, expand, layoutId, triggerRadius, animationDuration } = useExpandableScreen()

  return (
    <AnimatePresence>
      {!isExpanded && (
        <motion.div
          layoutId={layoutId}
          className={className}
          style={{ borderRadius: triggerRadius, cursor: "pointer" }}
          onClick={expand}
          initial={false}
          transition={{
            layout: { duration: animationDuration, ease: [0.32, 0.72, 0, 1] },
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Content ──────────────────────────────────────────────────────────────────

type ExpandableScreenContentProps = {
  children: React.ReactNode
  className?: string
  showCloseButton?: boolean
  closeButtonClassName?: string
}

export function ExpandableScreenContent({
  children,
  className,
  showCloseButton = true,
  closeButtonClassName,
}: ExpandableScreenContentProps) {
  const { isExpanded, collapse, layoutId, contentRadius, animationDuration } = useExpandableScreen()

  return (
    <AnimatePresence>
      {isExpanded && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: animationDuration * 0.6 }}
            onClick={collapse}
          />

          {/* Expanding panel */}
          <motion.div
            layoutId={layoutId}
            className={`fixed z-[91] ${className ?? ""}`}
            style={{
              borderRadius: contentRadius,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: "auto",
              width: "min(95vw, 1400px)",
              height: "80vh",
            }}
            initial={false}
            transition={{
              layout: { duration: animationDuration, ease: [0.32, 0.72, 0, 1] },
            }}
          >
            {showCloseButton && (
              <motion.button
                className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white backdrop-blur-sm transition-colors ${closeButtonClassName ?? ""}`}
                onClick={collapse}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: animationDuration * 0.4, duration: 0.15 }}
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Background (optional) ────────────────────────────────────────────────────

type ExpandableScreenBackgroundProps = {
  trigger?: React.ReactNode
  content?: React.ReactNode
  className?: string
}

export function ExpandableScreenBackground({ trigger, content, className }: ExpandableScreenBackgroundProps) {
  const { isExpanded } = useExpandableScreen()
  return (
    <div className={`absolute inset-0 pointer-events-none ${className ?? ""}`}>
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div key="content" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {content}
          </motion.div>
        ) : (
          <motion.div key="trigger" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {trigger}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
