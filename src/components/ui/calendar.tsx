"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface CalendarProps {
  mode?: "single" | "range" | "multiple"
  selected?: Date | Date[] | { from: Date; to: Date }
  onSelect?: (date: Date | undefined) => void
  className?: string
  month?: Date
  initialFocus?: boolean
}

// This is a simplified calendar component since we don't have the full react-day-picker integration
export function Calendar({ 
  className,
  mode = "single",
  selected,
  onSelect,
  initialFocus
}: CalendarProps) {
  
  const handleDateSelect = (day: number) => {
    if (onSelect && mode === "single") {
      const now = new Date()
      const newDate = new Date(now.getFullYear(), now.getMonth(), day)
      onSelect(newDate)
    }
  }
  
  // Generate days for the current month
  const currentMonthDays = Array.from({ length: 31 }, (_, i) => i + 1)
  
  return (
    <div className={cn("p-3", className)}>
      <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2">
        <div className="text-muted-foreground">Su</div>
        <div className="text-muted-foreground">Mo</div>
        <div className="text-muted-foreground">Tu</div>
        <div className="text-muted-foreground">We</div>
        <div className="text-muted-foreground">Th</div>
        <div className="text-muted-foreground">Fr</div>
        <div className="text-muted-foreground">Sa</div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {/* Dummy offset for starting day of week */}
        {Array.from({ length: 3 }, (_, i) => (
          <div key={`empty-${i}`} className="h-9" />
        ))}
        
        {currentMonthDays.map((day) => {
          const isSelected = selected instanceof Date && 
            selected.getDate() === day &&
            selected.getMonth() === new Date().getMonth()
          
          return (
            <button
              key={day}
              type="button"
              className={cn(
                "h-9 w-9 rounded-md text-center text-sm p-0 font-normal",
                isSelected && "bg-primary text-primary-foreground",
                "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
              )}
              onClick={() => handleDateSelect(day)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
} 