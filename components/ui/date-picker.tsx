"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    value?: Date
    onChange?: (date: Date | undefined) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    fromYear?: number
    toYear?: number
}

function formatDateVN(date: Date | undefined): string {
    if (!date || !isValidDate(date)) return ""
    const d = String(date.getDate()).padStart(2, "0")
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const y = date.getFullYear()
    return `${d}/${m}/${y}`
}

function isValidDate(date: Date | undefined): boolean {
    if (!date) return false
    return !isNaN(date.getTime())
}

/**
 * Auto-insert "/" as user types digits.
 * Allows only digits and "/".
 * Target format: dd/mm/yyyy
 */
function autoFormatDateInput(raw: string, prevValue: string): string {
    // Strip non-digit, non-slash chars
    let clean = raw.replace(/[^\d/]/g, "")

    // If user is deleting, don't auto-format
    if (clean.length < prevValue.length) {
        return clean
    }

    // Remove all slashes, then re-insert at proper positions
    const digits = clean.replace(/\//g, "")

    // Limit to 8 digits (ddmmyyyy)
    const limited = digits.slice(0, 8)

    let result = ""
    for (let i = 0; i < limited.length; i++) {
        if (i === 2 || i === 4) result += "/"
        result += limited[i]
    }

    return result
}

function parseDateVN(input: string): Date | null {
    const parts = input.split("/")
    if (parts.length !== 3) return null

    const d = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const y = parseInt(parts[2], 10)

    // Validate ranges
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null
    if (y < 1900 || y > 2100) return null
    if (m < 0 || m > 11) return null
    if (d < 1 || d > 31) return null

    const date = new Date(y, m, d)

    // Verify the date didn't overflow (e.g., 31/02 → March)
    if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) {
        return null
    }

    return date
}

function DatePicker({
    value,
    onChange,
    placeholder = "dd/mm/yyyy",
    className,
    disabled = false,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [month, setMonth] = React.useState<Date | undefined>(value || new Date(2000, 0))
    const [inputValue, setInputValue] = React.useState(formatDateVN(value))
    const [hasError, setHasError] = React.useState(false)

    React.useEffect(() => {
        setInputValue(formatDateVN(value))
        setHasError(false)
    }, [value])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = autoFormatDateInput(e.target.value, inputValue)
        setInputValue(formatted)

        // Try parsing when complete (dd/mm/yyyy = 10 chars)
        if (formatted.length >= 10) {
            const date = parseDateVN(formatted)
            if (date) {
                setHasError(false)
                onChange?.(date)
                setMonth(date)
            } else {
                setHasError(true)
            }
        } else {
            setHasError(false)
        }

        if (formatted === "") {
            onChange?.(undefined)
            setHasError(false)
        }
    }

    const handleBlur = () => {
        if (inputValue && inputValue.length > 0 && inputValue.length < 10) {
            setHasError(true)
        }
        // If input is complete but invalid
        if (inputValue.length >= 10) {
            const date = parseDateVN(inputValue)
            if (!date) {
                setHasError(true)
            }
        }
    }

    return (
        <div className={cn("relative flex w-full", className)}>
            <input
                type="text"
                disabled={disabled}
                value={inputValue}
                placeholder={placeholder}
                className={cn(
                    "flex h-11 w-full rounded-lg border bg-gray-50/50 px-3 pr-10 text-sm",
                    "transition-all placeholder:text-gray-400",
                    "focus:outline-none focus:bg-white focus:ring-2",
                    hasError
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-gray-200 focus:border-efb-blue focus:ring-efb-blue/10",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                        e.preventDefault()
                        setOpen(true)
                    }
                }}
                maxLength={10}
                inputMode="numeric"
            />
            {hasError && (
                <span className="absolute -bottom-5 left-0 text-[10px] text-red-500">
                    Ngày không hợp lệ
                </span>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        disabled={disabled}
                        className={cn(
                            "absolute right-0 top-0 h-full px-3 flex items-center justify-center",
                            "text-gray-400 hover:text-efb-blue transition-colors",
                            "rounded-r-lg",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                        aria-label="Chọn ngày"
                    >
                        <CalendarIcon className="w-4 h-4" />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto overflow-hidden p-0 rounded-xl shadow-xl border-gray-200"
                    align="end"
                    alignOffset={-8}
                    sideOffset={10}
                >
                    <Calendar
                        mode="single"
                        selected={value}
                        month={month}
                        onMonthChange={setMonth}
                        onSelect={(date) => {
                            onChange?.(date)
                            setInputValue(formatDateVN(date))
                            setHasError(false)
                            setOpen(false)
                        }}
                        defaultMonth={value || new Date(2000, 0)}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}

export { DatePicker }
