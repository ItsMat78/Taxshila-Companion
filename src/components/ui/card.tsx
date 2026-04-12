
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-2xl rounded-xl overflow-hidden font-body text-gray-800 dark:text-gray-200 transition-all",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4 sm:p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement, // Changed from HTMLDivElement to HTMLParagraphElement for semantic correctness
  React.HTMLAttributes<HTMLHeadingElement> // Changed from HTMLDivElement
>(({ className, ...props }, ref) => (
  <h3 // Changed from div to h3 for semantic title
    ref={ref}
    className={cn(
      "text-xl font-light leading-none tracking-tight font-headline text-gray-800 dark:text-gray-100 break-words", // Added break-words
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement, // Changed from HTMLDivElement
  React.HTMLAttributes<HTMLParagraphElement> // Changed from HTMLDivElement
>(({ className, ...props }, ref) => (
  <p // Changed from div to p
    ref={ref}
    className={cn("text-sm text-gray-500 dark:text-gray-400 font-body break-words", className)} // Added dark:text-gray-400
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 pt-0 sm:p-6 sm:pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 pt-0 sm:p-6 sm:pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
