import React, { useState } from "react";
import { urlbackend } from "../../../config.js";

function SignUpForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: "Las contraseñas no coinciden" });
      return;
    }

    try {
      const res = await fetch(`${urlbackend}/createuser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          first_name: firstName,
          last_name: lastName,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ [data?.field || "form"]: data?.message || "Error en el registro" });
        return;
      }

      window.location.href = "/login";
    } catch {
      setErrors({ form: "Error de conexión con el servidor" });
    }
  };

  return (
    <div className="relativeflex items-center justify-center">
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="rounded-2xl border border-[#2B2B2B] bg-[#0f0f0f]/90 backdrop-blur">
          <div className="text-center px-6 pt-6">
            <p className="text-xl font-semibold">Create your account</p>
          </div>

          <div className="px-6 pb-6 pt-4">
            <form onSubmit={handleSubmit} className="grid gap-6">

              <div className="grid gap-3">
                <label className="text-sm font-medium">Name</label>
                <div className="flex gap-3 w-full">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="bg-[#121212] px-3 py-2 w-1/2 text-sm rounded-lg border border-[#2B2B2B]"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="bg-[#121212] px-3 py-2 w-1/2 text-sm rounded-lg border border-[#2B2B2B]"
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-sm font-medium">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className={`bg-[#121212] px-3 py-2 w-full text-sm rounded-lg border ${
                    errors.username ? "border-red-500" : "border-[#2B2B2B]"
                  }`}
                />
                {errors.username && (
                  <span className="text-red-500 text-xs">{errors.username}</span>
                )}
              </div>

              <div className="grid gap-1">
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`bg-[#121212] px-3 py-2 w-full text-sm rounded-lg border ${
                    errors.email ? "border-red-500" : "border-[#2B2B2B]"
                  }`}
                />
                {errors.email && (
                  <span className="text-red-500 text-xs">{errors.email}</span>
                )}
              </div>

              {/* Password */}
              <div className="grid gap-1 relative">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`bg-[#121212] px-3 py-2 w-full text-sm rounded-lg border ${
                      errors.password ? "border-red-500" : "border-[#2B2B2B]"
                    } pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 my-auto flex items-center justify-center text-gray-400 hover:text-gray-200"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="grid gap-1 relative">
                <label className="text-sm font-medium">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`bg-[#121212] px-3 py-2 w-full text-sm rounded-lg border ${
                      errors.confirmPassword ? "border-red-500" : "border-[#2B2B2B]"
                    } pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-3 my-auto flex items-center justify-center text-gray-400 hover:text-gray-200"
                  >
                    <span className="material-symbols-outlined">
                      {showConfirmPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="text-red-500 text-xs">{errors.confirmPassword}</span>
                )}
              </div>

              {errors.form && (
                <p className="text-red-500 text-sm text-center">{errors.form}</p>
              )}

              <button
                type="submit"
                className="w-full rounded-xl px-4 py-3 font-medium text-black bg-[#d0d0d0]"
              >
                Sign Up
              </button>
              <div className="text-center text-sm flex justify-center">
                <p>
                  Go back
                  <a href="/" className="underline underline-offset-4">
                    {"  "}
                    to Home
                  </a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUpForm;
