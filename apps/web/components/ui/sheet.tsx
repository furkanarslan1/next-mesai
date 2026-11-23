"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        {side === "bottom" && <BottomSheetBehavior />}
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

/**
 * Alttan açılan panelin iOS davranışları:
 * - Üstte tutamak; panel en üstteyken aşağı sürüklenir, yeterince çekilince (ya da hızlı fırlatılınca) kapanır.
 * - Panel açıkken arkadaki sayfa hafifçe küçülüp geri çekilir (iOS kart yığını), yalnızca telefonda.
 */
let openSheets = 0
function BottomSheetBehavior() {
  const anchor = React.useRef<HTMLSpanElement>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    const popup = anchor.current?.closest<HTMLElement>('[data-slot="sheet-content"]')
    if (!popup) return

    // Arkadaki sayfa: görünen alanın ortasından küçülsün
    const main = document.querySelector<HTMLElement>(".app-main")
    openSheets++
    if (main && window.matchMedia("(max-width: 767px)").matches) {
      const top = main.getBoundingClientRect().top + window.scrollY
      main.style.transformOrigin = `50% ${window.scrollY + window.innerHeight / 2 - top}px`
      document.documentElement.dataset.sheetOpen = ""
    }

    let y0 = 0, t0 = 0, dy = 0, dragging = false, tracking = false
    const set = (y: number, anim: boolean) => {
      popup.style.transition = anim ? "transform 320ms cubic-bezier(0.2, 0.9, 0.3, 1)" : "none"
      popup.style.transform = y ? `translateY(${y}px)` : ""
    }
    const start = (e: TouchEvent) => {
      const t = e.target as HTMLElement
      if (e.touches.length !== 1 || t.closest("input, textarea, select, [data-no-drag]")) return
      tracking = true; dragging = false; dy = 0
      y0 = e.touches[0].clientY; t0 = performance.now()
    }
    const move = (e: TouchEvent) => {
      if (!tracking) return
      const d = e.touches[0].clientY - y0
      if (!dragging) {
        if (d > 4 && popup.scrollTop <= 0) dragging = true
        else if (Math.abs(d) > 4) { tracking = false; return }
        else return
      }
      e.preventDefault()
      dy = Math.max(0, d)
      set(dy, false)
    }
    const end = () => {
      if (!tracking) return
      tracking = false
      if (!dragging) return
      const v = dy / Math.max(1, performance.now() - t0)
      if (dy > Math.min(140, popup.offsetHeight * 0.3) || v > 0.7) {
        popup.style.transition = "transform 220ms ease-in"
        popup.style.transform = "translateY(100%)"
        window.setTimeout(() => closeRef.current?.click(), 160)
      } else set(0, true)
    }
    popup.addEventListener("touchstart", start, { passive: true })
    popup.addEventListener("touchmove", move, { passive: false })
    popup.addEventListener("touchend", end)
    popup.addEventListener("touchcancel", end)
    return () => {
      popup.removeEventListener("touchstart", start)
      popup.removeEventListener("touchmove", move)
      popup.removeEventListener("touchend", end)
      popup.removeEventListener("touchcancel", end)
      openSheets = Math.max(0, openSheets - 1)
      if (openSheets === 0) delete document.documentElement.dataset.sheetOpen
    }
  }, [])

  return (
    <>
      <span ref={anchor} aria-hidden className="sheet-grabber" />
      <SheetPrimitive.Close ref={closeRef} className="hidden" tabIndex={-1} aria-hidden />
    </>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
