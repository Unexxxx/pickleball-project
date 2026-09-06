"use client";

import { Timer } from "lucide-react";
import { useEffect, useState } from "react";

function elapsedLabel(startedAt: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
  );
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function elapsedSeconds(startedAt: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
  );
}

export function MatchTimer({
  startedAt,
  durationMinutes,
}: {
  startedAt: string;
  durationMinutes: number;
}) {
  const [label, setLabel] = useState("00:00");
  const [isOvertime, setIsOvertime] = useState(false);
  useEffect(() => {
    const update = () => {
      setLabel(elapsedLabel(startedAt));
      setIsOvertime(elapsedSeconds(startedAt) > durationMinutes * 60);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [durationMinutes, startedAt]);
  return (
    <span
      className={`match-timer${isOvertime ? " is-overtime" : ""}`}
      aria-label={`Elapsed match time ${label}${isOvertime ? ", overtime" : ""}`}
    >
      <Timer aria-hidden="true" size={15} />
      <span>{label}</span>
      {isOvertime ? <strong>OVERTIME</strong> : null}
    </span>
  );
}
