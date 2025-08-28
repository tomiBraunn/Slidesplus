import React, { useState } from "react";

function LogInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid: email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error en login");
        return;
      }

      localStorage.setItem("token", data.token);
      window.location.href = "/editor"; // redirigir después del login
    } catch (err) {
      console.error("Error:", err);
      setError("Error de conexión con el servidor");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-[#2B2B2B] bg-[#0f0f0f]">
        <div className="text-center px-6 pt-6">
          <h1 className="text-xl font-semibold">Welcome back!</h1>
          <p className="text-sm text-gray-400">
            Login with your Google or Github account
          </p>
        </div>

        <div className="px-6 pb-6 pt-4">
          <form onSubmit={handleSubmit} className="grid gap-6">
            {/* Botones OAuth */}
            <div className="flex flex-col gap-4">
              <button
                type="button"
                className="w-full rounded-xl border border-[#2B2B2B] px-4 py-2.5 text-sm font-medium hover:bg-[#161616] transition"
              >
                Login with Google
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-[#2B2B2B] px-4 py-2.5 text-sm font-medium hover:bg-[#161616] transition"
              >
                Login with Github
              </button>
            </div>

            {/* Separador */}
            <div className="relative text-center text-sm">
              <span className="bg-[#0f0f0f] relative z-10 px-2 text-gray-400">
                Or continue with
              </span>
              <div className="absolute inset-0 top-1/2 -translate-y-1/2 border-t border-[#2B2B2B]" />
            </div>

            {/* Email */}
            <div className="grid gap-3">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#121212] px-3 py-2 w-full text-sm rounded-lg border border-[#2B2B2B]
                focus:outline-none"
              />
            </div>

            {/* Password */}
            <div className="grid gap-3">
              <div className="flex items-center">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <a
                  href=""
                  className="ml-auto text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#121212] px-3 py-2 w-full text-sm rounded-lg border border-[#2B2B2B]
                focus:outline-none"
              />
            </div>

            {/* Mensaje de error */}
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            {/* Botón login */}
            <button
              type="submit"
              className="w-full rounded-xl px-4 py-3 font-medium text-black bg-[#d0d0d0]"
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

      <div className="text-center text-xs text-gray-400">
        By clicking continue, you agree to our{" "}
        <a
          href="#"
          className="underline underline-offset-4 hover:text-white"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="#"
          className="underline underline-offset-4 hover:text-white"
        >
          Privacy Policy
        </a>
        .
      </div>
    </div>
  );
}

export default LogInForm;
