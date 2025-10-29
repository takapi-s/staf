"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "~/lib/utils"

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  value?: number;
  activeValue?: number; // 進行中の値（薄いグレーで表示）
  maxValue?: number; // 最大値（デフォルト100）
}

function Progress({
  className,
  value = 0,
  activeValue = 0,
  maxValue = 100,
  ...props
}: ProgressProps) {
  const completedPercentage = Math.min((value / maxValue) * 100, 100);
  // リクエスト送信済み（完了 + 実行中）を薄い色で示す
  const requestedPercentage = Math.min(((value + activeValue) / maxValue) * 100, 100);
  
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      {/* 送信済み（完了+実行中）部分：暗めの色 */}
      {requestedPercentage > 0 && (
        <div
          className="absolute top-0 left-0 h-full bg-white/30 transition-all duration-300"
          style={{ width: `${requestedPercentage}%` }}
        />
      )}
      {/* 完了部分（白） */}
      {value > 0 && (
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="bg-white h-full w-full flex-1 transition-all duration-300"
          style={{ transform: `translateX(-${100 - completedPercentage}%)` }}
        />
      )}
    </ProgressPrimitive.Root>
  )
}

export { Progress }
