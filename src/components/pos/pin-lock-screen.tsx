"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Lock, Unlock, Delete, Coffee, ShieldCheck, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface PinLockScreenProps {
  onUnlock: () => void;
}

const CORRECT_PIN = "0000";

export function PinLockScreen({ onUnlock }: PinLockScreenProps) {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleDigit = useCallback(
    (digit: string) => {
      if (isSuccess) return;
      setError(null);
      if (pin.length < 4) {
        const nextPin = pin + digit;
        setPin(nextPin);

        if (nextPin.length === 4) {
          if (nextPin === CORRECT_PIN) {
            setIsSuccess(true);
            try {
              sessionStorage.setItem("duval_pos_unlocked", "true");
              localStorage.setItem("duval_pos_unlocked_time", Date.now().toString());
            } catch {}
            setTimeout(() => {
              onUnlock();
            }, 600);
          } else {
            setIsShaking(true);
            setError("Password / PIN salah. Coba lagi.");
            setTimeout(() => {
              setPin("");
              setIsShaking(false);
            }, 700);
          }
        }
      }
    },
    [pin, isSuccess, onUnlock]
  );

  const handleDelete = useCallback(() => {
    if (isSuccess) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }, [isSuccess]);

  const handleClear = useCallback(() => {
    if (isSuccess) return;
    setError(null);
    setPin("");
  }, [isSuccess]);

  // Physical keyboard listener (Laptop / Desktop / External iPad keyboard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSuccess) return;
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "Escape" || e.key === "Delete") {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDigit, handleDelete, handleClear, isSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090E] p-4 select-none">
      {/* Subtle ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          x: isShaking ? [-8, 8, -6, 6, -3, 3, 0] : 0,
        }}
        transition={{ duration: isShaking ? 0.4 : 0.3 }}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0E131F]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-400/40 shadow-lg shadow-amber-500/10 flex items-center justify-center bg-black/60">
              <Image
                src="/logo.jpg"
                alt="Duval Caminos Logo"
                width={64}
                height={64}
                className="object-cover w-full h-full"
                priority
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
              {isSuccess ? (
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-300" />
              )}
            </div>
          </div>

          <h1 className="text-lg font-bold text-white tracking-wide">
            Caminos Coffee
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Specialty Coffee POS & Terminal Kasir
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Masukkan PIN Akses Kasir</span>
          </div>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-4 my-4">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <motion.div
                key={index}
                animate={{
                  scale: isFilled ? [1, 1.25, 1] : 1,
                  backgroundColor: isSuccess
                    ? "#10B981"
                    : isFilled
                    ? "#38BDF8"
                    : "rgba(255, 255, 255, 0.08)",
                  borderColor: isSuccess
                    ? "#34D399"
                    : isFilled
                    ? "#38BDF8"
                    : "rgba(255, 255, 255, 0.2)",
                }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "w-4 h-4 rounded-full border-2 transition-all shadow-sm",
                  isFilled && "shadow-cyan-500/40"
                )}
              />
            );
          })}
        </div>

        {/* Error / Status message */}
        <div className="h-6 flex items-center justify-center mb-4">
          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-400"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </motion.div>
            ) : isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Akses Diterima. Membuka...</span>
              </motion.div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Gunakan keypad layar atau keyboard fisik
              </p>
            )}
          </AnimatePresence>
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-12 sm:h-14 rounded-2xl bg-[#161F30] hover:bg-[#1E2B42] active:bg-[#253654] border border-white/10 hover:border-cyan-400/40 text-lg sm:text-xl font-bold text-white transition-all shadow-sm flex items-center justify-center select-none active:scale-95"
            >
              {digit}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 sm:h-14 rounded-2xl bg-[#161F30]/60 hover:bg-[#1E2B42] active:bg-[#253654] border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition-all shadow-sm flex items-center justify-center select-none active:scale-95 uppercase tracking-wider"
          >
            Clear
          </button>

          {/* Digit 0 */}
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="h-12 sm:h-14 rounded-2xl bg-[#161F30] hover:bg-[#1E2B42] active:bg-[#253654] border border-white/10 hover:border-cyan-400/40 text-lg sm:text-xl font-bold text-white transition-all shadow-sm flex items-center justify-center select-none active:scale-95"
          >
            0
          </button>

          {/* Delete / Backspace */}
          <button
            type="button"
            onClick={handleDelete}
            className="h-12 sm:h-14 rounded-2xl bg-[#161F30]/60 hover:bg-[#1E2B42] active:bg-[#253654] border border-white/10 text-slate-400 hover:text-white transition-all shadow-sm flex items-center justify-center select-none active:scale-95"
            title="Hapus Digit"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-[10px] text-slate-500">
          Duval Caminos Coffee System • Terminal Kasir Terproteksi
        </div>
      </motion.div>
    </div>
  );
}
