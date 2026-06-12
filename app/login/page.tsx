"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconShield } from "@tabler/icons-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const { loginAction } = await import("../actions");
    const result = await loginAction(
      form.get("username") as string,
      form.get("password") as string
    );

    if (result.success) {
      router.push("/");
      router.refresh();
    } else {
      setError(
        result.error === "INVALID_CREDENTIALS"
          ? "Hatalı kullanıcı adı veya şifre."
          : result.error
      );
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] px-6">
      <div className="bg-[#0d0c0b] border border-[#2b2926] rounded p-8 space-y-6">
        {/* Branding */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 bg-[#1b3224] border border-[#2b4c37] rounded flex items-center justify-center text-[#55f289]">
            <IconShield size={28} />
          </div>
          <div>
            <h1 className="font-mono text-sm tracking-wider text-white font-bold uppercase">
              VAULTBASE
            </h1>
            <p className="font-mono text-[10px] text-[#605e58] tracking-widest mt-1">
              v1.0.0
            </p>
          </div>
        </div>

        {/* Welcome */}
        <div className="text-center">
          <p className="font-mono text-xs text-[#a09e96]">
            PostgreSQL veritabanı yedekleme yönetim sistemine erişmek için giriş yapın.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-[#2b1a1a] border border-[#4c2b2b] rounded px-4 py-2.5">
            <p className="font-mono text-[11px] text-[#f28955] text-center">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] tracking-wider text-[#605e58]">
              KULLANICI ADI
            </label>
            <input
              name="username"
              type="text"
              required
              autoFocus
              autoComplete="username"
              className="w-full bg-[#090807] border border-[#2b2926] rounded px-3 py-2.5 font-mono text-xs text-[#E6E4DD] placeholder-[#605e58] outline-none focus:border-[#55f289]/50 transition-colors"
              placeholder="admin"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[10px] tracking-wider text-[#605e58]">
              ŞİFRE
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full bg-[#090807] border border-[#2b2926] rounded px-3 py-2.5 font-mono text-xs text-[#E6E4DD] placeholder-[#605e58] outline-none focus:border-[#55f289]/50 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1b3224] hover:bg-[#24402f] disabled:opacity-50 border border-[#2b4c37] rounded px-4 py-2.5 font-mono text-xs text-white font-bold tracking-wider transition-colors cursor-pointer"
          >
            {loading ? "GİRİŞ YAPILIYOR..." : "GİRİŞ YAP"}
          </button>
        </form>
      </div>
    </div>
  );
}
