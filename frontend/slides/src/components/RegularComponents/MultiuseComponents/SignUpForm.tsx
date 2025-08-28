import React, { useState } from "react";

function SignUpForm() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        try {
            const res = await fetch("http://localhost:8000/createuser", {
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
                setError(data.message || "Error en el registro");
                return;
            }

            setSuccess("Cuenta creada correctamente, ahora puedes iniciar sesión.");
            setUsername("");
            setEmail("");
            setFirstName("");
            setLastName("");
            setPassword("");
            setConfirmPassword("");
        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión con el servidor");
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-[#2B2B2B] bg-[#0f0f0f]">
                <div className="text-center px-6 pt-6">
                    <h1 className="text-xl font-semibold">Create your account</h1>
                    <p className="text-sm text-gray-400">Sign up with Google or Github</p>
                </div>

                <div className="px-6 pb-6 pt-4">
                    <form onSubmit={handleSubmit} className="grid gap-6">
                        <div className="flex flex-col gap-4">
                            <button
                                type="button"
                                className="w-full rounded-xl border border-[#2B2B2B] px-4 py-2.5 text-sm font-medium hover:bg-[#161616] transition"
                            >
                                Sign up with Google
                            </button>
                            <button
                                type="button"
                                className="w-full rounded-xl border border-[#2B2B2B] px-4 py-2.5 text-sm font-medium hover:bg-[#161616] transition"
                            >
                                Sign up with Github
                            </button>
                        </div>

                        <div className="relative text-center text-sm">
                            <span className="bg-[#0f0f0f] relative z-10 px-2 text-gray-400">
                                Or continue with
                            </span>
                            <div className="absolute inset-0 top-1/2 -translate-y-1/2 border-t border-[#2B2B2B]" />
                        </div>


                        <div className="grid gap-3">
                            <label className="text-sm font-medium">Name</label>
                            <div className="flex gap-3 w-full">
                                <input
                                    id="firstName"
                                    type="text"
                                    placeholder="First Name"
                                    required
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="bg-[#121212] px-3 py-2 w-1/2 text-sm rounded-lg border border-[#2B2B2B] focus:outline-none"
                                />
                                <input
                                    id="lastName"
                                    type="text"
                                    placeholder="Last Name"
                                    required
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="bg-[#121212] px-3 py-2 w-1/2 text-sm rounded-lg border border-[#2B2B2B] focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid gap-3">
                            <label htmlFor="username" className="text-sm font-medium">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-[#121212] px-3 py-2 w-full text-sm rounded-lg border border-[#2B2B2B] focus:outline-none"
                            />
                        </div>

                        <div className="grid gap-3">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-[#121212] px-3 py-2 w-full text-sm rounded-lg border border-[#2B2B2B] focus:outline-none"
                            />
                        </div>

                        <div className="grid gap-3">
                            <label htmlFor="password" className="text-sm font-medium">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-[#121212] px-3 py-2 w-full text-sm rounded-lg border border-[#2B2B2B] focus:outline-none"
                            />
                        </div>

                        <div className="grid gap-3">
                            <label htmlFor="confirmPassword" className="text-sm font-medium">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="bg-[#121212] px-3 py-2 w-full text-sm rounded-lg border border-[#2B2B2B] focus:outline-none"
                            />
                        </div>

                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        {success && <p className="text-green-500 text-sm text-center">{success}</p>}

                        <button
                            type="submit"
                            className="w-full rounded-xl px-4 py-3 font-medium text-black bg-[#d0d0d0]"
                        >
                            Sign Up
                        </button>

                        <div className="text-center text-sm">
                            Already have an account?
                            <a href="/login" className="underline underline-offset-4"> Log in</a>
                        </div>
                    </form>
                </div>
            </div>

            <div className="text-center text-xs text-gray-400">
                By signing up, you agree to our{" "}
                <a href="#" className="underline underline-offset-4 hover:text-white">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="underline underline-offset-4 hover:text-white">Privacy Policy</a>.
            </div>
        </div>
    );
}

export default SignUpForm;
