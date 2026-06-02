"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Layers, Eye, EyeOff, Github } from "@/lib/icons";
import { Google } from "@/lib/icons";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await apiClient.post<{ token: string; user: Record<string, unknown> }>("/api/auth/login", {
        email,
        password,
      });

      if (data.token) {
        localStorage.setItem("token", data.token);
        // Enregistrer également dans les cookies pour le proxy Next.js
        document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
      }
      if (data.user)   localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Échec de la connexion. Veuillez vérifier vos identifiants.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] dark:bg-gray-900 flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <div className="bg-green-600 p-1.5 rounded-xl">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <span className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">SPM</span>
        </Link>
        <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Bon retour 👋</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Connectez-vous pour gérer vos projets
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-10 px-8 shadow-2xl shadow-gray-200/50 dark:shadow-none rounded-[2.5rem] border border-gray-100 dark:border-gray-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all placeholder:text-gray-400"
                placeholder="nom@exemple.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  Mot de passe
                </label>
                <Link
                  href="/auth/reset-password"
                  className="text-xs font-bold text-green-600 hover:text-green-700"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all placeholder:text-gray-400"
                  placeholder="••••••••"
                  minLength={8}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full btn-primary"
                disabled={isLoading}
              >
                {isLoading ? "Connexion..." : "Se connecter"}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-gray-800 text-gray-400 font-medium">ou continuer avec</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button type="button" className="flex justify-center items-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                <Google className="w-5 h-5" />
                Google
              </button>
              <button type="button" className="flex justify-center items-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                <Github className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                GitHub
              </button>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Pas encore de compte ?{" "}
          <Link href="/auth/register" className="font-bold text-green-600 hover:text-green-700">
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
