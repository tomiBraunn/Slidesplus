"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"

type TimerFormat = "SS.MS" | "MM:SS" | "HH:MM:SS"

interface FormattedTime {
  display: string
  seconds: number
  milliseconds: number
}

function formatElapsed(
  totalMs: number,
  format: TimerFormat
): FormattedTime {
  const totalSeconds = Math.floor(totalMs / 1000)
  const milliseconds = Math.floor((totalMs % 1000) / 10) // 0-99 for display
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)

  const pad = (n: number, len = 2) => n.toString().padStart(len, "0")

  let display = ""
  switch (format) {
    case "SS.MS":
      display = `${pad(totalSeconds)}.${pad(milliseconds)}`
      break
    case "MM:SS":
      display = `${pad(minutes)}:${pad(seconds)}`
      break
    case "HH:MM:SS":
      display = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      break
  }

  return { display, seconds: totalSeconds, milliseconds }
}

export interface UseTimerOptions {
  loading?: boolean
  onTick?: (seconds: number, milliseconds: number) => void
  resetOnLoadingChange?: boolean
  format?: TimerFormat
}

export function useTimer({
  loading = false,
  onTick,
  resetOnLoadingChange = true,
  format = "SS.MS",
}: UseTimerOptions = {}) {
  const [isRunning, setIsRunning] = React.useState(false)
  const [elapsedMs, setElapsedMs] = React.useState(0)

  const startRef = React.useRef<number | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const onTickRef = React.useRef(onTick)
  onTickRef.current = onTick

  const stopLoop = React.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const runLoop = React.useCallback(() => {
    const tick = () => {
      if (startRef.current == null) return
      const ms = performance.now() - startRef.current
      setElapsedMs(ms)
      const fmt = formatElapsed(ms, format)
      onTickRef.current?.(fmt.seconds, fmt.milliseconds)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [format])

  const start = React.useCallback(() => {
    if (startRef.current == null) {
      startRef.current = performance.now() - elapsedMs
    }
    setIsRunning(true)
    stopLoop()
    runLoop()
  }, [elapsedMs, runLoop, stopLoop])

  const stop = React.useCallback(() => {
    setIsRunning(false)
    stopLoop()
    startRef.current = null
  }, [stopLoop])

  const reset = React.useCallback(() => {
    stopLoop()
    startRef.current = null
    setElapsedMs(0)
    setIsRunning(false)
  }, [stopLoop])

  // React to the `loading` prop driving the timer.
  React.useEffect(() => {
    if (loading) {
      if (resetOnLoadingChange) {
        setElapsedMs(0)
        startRef.current = performance.now()
      } else if (startRef.current == null) {
        startRef.current = performance.now() - elapsedMs
      }
      setIsRunning(true)
      stopLoop()
      runLoop()
    } else {
      setIsRunning(false)
      stopLoop()
      startRef.current = null
    }
    return stopLoop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  React.useEffect(() => stopLoop, [stopLoop])

  const formattedTime = formatElapsed(elapsedMs, format)

  return {
    elapsedTime: formattedTime.seconds,
    milliseconds: formattedTime.milliseconds,
    formattedTime,
    isRunning,
    reset,
    start,
    stop,
  }
}

const timerRootVariants = cva(
  "inline-flex items-center gap-2 rounded-full font-mono transition-colors",
  {
    variants: {
      variant: {
        default: "bg-theme-quaternary text-theme-primary",
        outline: "border border-theme-tertiary text-theme-primary",
        ghost: "text-theme-secondary",
        destructive: "bg-red-500/15 text-red-400 border border-red-500/30",
      },
      size: {
        sm: "px-2 py-1 text-xs",
        md: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

type Size = "sm" | "md" | "lg"

const iconSizes: Record<Size, string> = {
  sm: "size-3",
  md: "size-4",
  lg: "size-5",
}

export interface TimerRootProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof timerRootVariants> {
  loading?: boolean
}

export function TimerRoot({
  className,
  variant,
  size,
  loading,
  children,
  ...props
}: TimerRootProps) {
  return (
    <div
      role="timer"
      aria-live={loading ? "polite" : "off"}
      className={cn(timerRootVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

export interface TimerIconProps {
  size?: Size
  loading?: boolean
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}

export function TimerIcon({
  size = "md",
  loading = false,
  icon: Icon = Clock,
  className,
}: TimerIconProps) {
  return (
    <Icon
      className={cn(iconSizes[size], loading && "animate-spin", className)}
    />
  )
}

export interface TimerDisplayProps {
  time: string
  label?: string
  size?: Size
  className?: string
}

export function TimerDisplay({
  time,
  label,
  size = "md",
  className,
}: TimerDisplayProps) {
  return (
    <span
      aria-label={label}
      className={cn("tabular-nums leading-none", className)}
    >
      {time}
    </span>
  )
}

export interface TimerProps
  extends Omit<TimerRootProps, "loading" | "children"> {
  loading?: boolean
  onTick?: (seconds: number, milliseconds: number) => void
  resetOnLoadingChange?: boolean
  format?: TimerFormat
  icon?: React.ComponentType<{ className?: string }>
}

export function Timer({
  loading = false,
  onTick,
  resetOnLoadingChange = true,
  format = "SS.MS",
  variant,
  size = "md",
  icon,
  className,
  ...props
}: TimerProps) {
  const { formattedTime } = useTimer({
    loading,
    onTick,
    resetOnLoadingChange,
    format,
  })

  return (
    <TimerRoot
      variant={variant}
      size={size}
      loading={loading}
      className={className}
      {...props}
    >
      <TimerIcon size={size} loading={loading} icon={icon} />
      <TimerDisplay time={formattedTime.display} size={size} />
    </TimerRoot>
  )
}

export default Timer
