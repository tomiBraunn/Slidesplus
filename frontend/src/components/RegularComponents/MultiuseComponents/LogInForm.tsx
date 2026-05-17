// @ts-nocheck
import React, { useState } from "react";
import { toast } from "sonner";
import { urlbackend } from "../../../config.js";
import { supabase } from "../../../utils/supabaseClient";

function LogInForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleGoogleLogin = () => {
    window.location.href = `${urlbackend}/auth/google`;
  };

  const handleGitHubLogin = () => {
    window.location.href = `${urlbackend}/auth/github`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`${urlbackend}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error en login");
        return;
      }

      localStorage.setItem("token", data.token);
      window.location.href = "/home";
    } catch (err) {
      console.error("Error:", err);
      toast.error("Error de conexión con el servidor");
    }
  };

  const handleForgotPassword = async () => {
    const defaultEmail = identifier.includes("@") ? identifier : "";
    const emailInput = window.prompt("Ingresá tu email para recuperar la contraseña:", defaultEmail)?.trim();

    if (!emailInput) return;

    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailInput, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message || "No se pudo enviar la recuperación");
        return;
      }

      toast.success("Te enviamos un mail para recuperar tu contraseña", {
        description: "Seguí el link del mail para definir una nueva contraseña.",
      });
    } catch (err) {
      console.error("Forgot password error:", err);
      toast.error("Error de conexión con el servidor");
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 relative z-10 w-full max-w-md px-4 sm:px-6">
      <div className="rounded-2xl border border-[#2B2B2B] bg-[#0f0f0f]/90 backdrop-blur">
        <div className="text-center px-4 sm:px-6 pt-6">
          <h1 className="text-xl sm:text-2xl font-semibold">Welcome back!</h1>
          <p className="text-sm text-gray-400 mt-1">
            Login with your Google or Github account
          </p>
        </div>

        <div className="px-4 sm:px-6 pb-6 pt-4">
          <form onSubmit={handleSubmit} className="grid gap-4 sm:gap-6">
            
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#2B2B2B] px-4 py-3 text-sm font-medium hover:bg-[#161616] transition cursor-pointer"
              >
                <img
                  src="/google-icon.png"
                  alt="Google icon"
                  width={24}
                  height={24}
                  className="flex-shrink-0"
                />
                <span>Login with Google</span>
              </button>

              <button
                type="button"
                onClick={handleGitHubLogin}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#2B2B2B] px-4 py-3 text-sm font-medium hover:bg-[#161616] transition cursor-pointer"
              >
                <img
                  src="/github-icon.png"
                  alt="GitHub icon"
                  width={24}
                  height={24}
                  className="flex-shrink-0"
                />
                <span>Login with GitHub</span>
              </button>
            </div>

            <div className="relative text-center text-sm">
              <span className="bg-[#0f0f0f]/90 relative z-10 px-3 text-gray-400">
                Or continue with
              </span>
              {/* <div className="absolute inset-0 top-1/4 -translate-y-1/4 border-t border-[#2B2B2B]" /> */}
            </div>

            <div className="grid gap-2 sm:gap-3">
              <label htmlFor="identifier" className="text-sm font-medium">
                Username/Email
              </label>
              <input
                id="identifier"
                type="text"
                placeholder=""
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="bg-[#121212] px-3 py-2.5 w-full text-sm rounded-lg border border-[#2B2B2B] focus:outline-none focus:border-[#3B3B3B]"
              />
            </div>

            <div className="grid gap-2 sm:gap-3 relative">
              <div className="flex items-center gap-2 flex-wrap">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isSendingReset}
                  className="ml-auto text-xs sm:text-sm underline-offset-4 hover:underline text-gray-400 hover:text-gray-300 transition disabled:opacity-60"
                >
                  {isSendingReset ? "Enviando..." : "Forgot your password?"}
                </button>
              </div>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#121212] px-3 py-2.5 w-full text-sm rounded-lg border border-[#2B2B2B] focus:outline-none focus:border-[#3B3B3B] pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 my-auto flex items-center justify-center text-gray-400 hover:text-gray-200 transition"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl px-4 py-3 font-medium text-black bg-[#d0d0d0] cursor-pointer hover:bg-[#bcbcbc] transition mt-2"
            >
              Login
            </button>

            <div className="text-center text-sm">
              <span className="text-gray-400">Don't have an account?</span>
              <a href="/signup" className="underline underline-offset-4 ml-1 text-white hover:text-gray-300 transition">
                Sign up
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LogInForm;
