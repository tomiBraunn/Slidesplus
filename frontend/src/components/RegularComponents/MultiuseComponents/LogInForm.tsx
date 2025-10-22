import React, { useState } from "react";
import { urlbackend } from "../../../config.js";

function LogInForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${urlbackend}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error en login");
        return;
      }

      localStorage.setItem("token", data.token);
      window.location.href = "/home";
    } catch (err) {
      console.error("Error:", err);
      setError("Error de conexión con el servidor");
    }
  };

  return (
    <div className="flex flex-col gap-6 relative z-10 w-full max-w-md px-4">
      <div className="rounded-2xl border border-[#2B2B2B] bg-[#0f0f0f]">
        <div className="text-center px-6 pt-6">
          <h1 className="text-xl font-semibold">Welcome back!</h1>
          <p className="text-sm text-gray-400">
            Login with your Google or Github account
          </p>
        </div>

        <div className="px-6 pb-6 pt-4">
          <form onSubmit={handleSubmit} className="grid gap-6">
            {}
            <div className="flex flex-col gap-4">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#2B2B2B] px-4 py-2.5 text-sm font-medium hover:bg-[#161616] transition cursor-pointer"
              >
                <img
                  src="https://img.icons8.com/?size=512&id=17949&format=png"
                  alt="Google icon"
                  width={24}
                  height={24}
                />
                <span>Login with Google</span>
              </button>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#2B2B2B] px-4 py-2.5 text-sm font-medium hover:bg-[#161616] transition cursor-pointer mt-3"
              >
                <img
                  src="https://cdn-icons-png.flaticon.com/512/25/25231.png"
                  alt="GitHub icon"
                  width={24}
                  height={24}
                />
                <span>Login with GitHub</span>
              </button>
            </div>

            {}
            <div className="relative text-center text-sm">
              <span className="bg-[#0f0f0f] relative z-10 px-2 text-gray-400">
                Or continue with
              </span>
              <div className="absolute inset-0 top-1/2 -translate-y-1/2 border-t border-[#2B2B2B]" />
            </div>

            {}
            <div className="grid gap-3">
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
                className="bg-[#121212] px-3 py-2 w-full text-sm rounded-lg border border-[#2B2B2B]
                focus:outline-none"
              />
            </div>

            {}
            <div className="grid gap-3 relative">
              <div className="flex items-center">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <a
                  href="#"
                  className="ml-auto text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#121212] px-3 py-2 w-full text-sm rounded-lg border border-[#2B2B2B]
                  focus:outline-none pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400 hover:text-gray-200 w-8 h-8"
                >
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ fontSize: "22px" }}
                  >
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            {}
            <button
              type="submit"
              className="w-full rounded-xl px-4 py-3 font-medium text-black bg-[#d0d0d0] cursor-pointer hover:bg-[#bcbcbc] transition"
            >
              Login
            </button>

            <div className="text-center text-sm">
              Don’t have an account?
              <a href="/signup" className="underline underline-offset-4">
                {" "}
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
