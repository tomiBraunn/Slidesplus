// @ts-nocheck
import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../../utils/supabaseClient";
import { urlbackend } from "../../config.js";
import Threads from "../ThirdPartyComponents/Threads/Threads";

export default function ResetPasswordPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [loading, setLoading] = useState(false);

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (password.length < 6) {
			toast.error("La contraseña debe tener al menos 6 caracteres");
			return;
		}

		if (password !== confirmPassword) {
			toast.error("Las contraseñas no coinciden");
			return;
		}

		setLoading(true);
		try {
			const { data: { session }, error: sessionError } = await supabase.auth.getSession();
			if (sessionError || !session) {
				toast.error("El link de recuperación es inválido o expiró");
				navigate("/login");
				return;
			}

			const { error: updateError } = await supabase.auth.updateUser({ password });
			if (updateError) {
				toast.error(updateError.message || t("resetPassword.error"));
				return;
			}

			const syncRes = await fetch(`${urlbackend}/auth/sync-password`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({ new_password: password }),
			});

			const syncData = await syncRes.json().catch(() => ({}));
			if (!syncRes.ok) {
				toast.error(syncData.message || "No se pudo sincronizar la contraseña");
				return;
			}

			localStorage.removeItem("token");
			await supabase.auth.signOut();
			toast.success(t("resetPassword.success"));
			navigate("/login");
		} catch (err) {
			console.error("Reset password error:", err);
			toast.error(t("resetPassword.error"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bg-[#121212] w-screen h-screen flex flex-col items-center justify-center text-white overflow-y-auto overflow-x-hidden py-4 sm:py-0">
			<div className="flex flex-col gap-6 relative z-10 w-full max-w-md px-4 sm:px-6">
				<div className="rounded-2xl border border-[#2B2B2B] bg-[#0f0f0f]/90 backdrop-blur">
					<div className="text-center px-4 sm:px-6 pt-6">
						<h1 className="text-xl sm:text-2xl font-semibold">{t("resetPassword.title")}</h1>
						<p className="text-sm text-gray-400 mt-1">Elegí una nueva contraseña para tu cuenta</p>
					</div>

					<div className="px-4 sm:px-6 pb-6 pt-4">
						<form onSubmit={onSubmit} className="grid gap-4 sm:gap-6">
							<div className="grid gap-2 sm:gap-3">
								<label htmlFor="new-password" className="text-sm font-medium">{t("resetPassword.newPasswordLabel")}</label>
								<div className="relative">
									<input
										id="new-password"
										type={showPassword ? "text" : "password"}
										required
										minLength={6}
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

							<div className="grid gap-2 sm:gap-3">
								<label htmlFor="confirm-password" className="text-sm font-medium">{t("resetPassword.confirmPasswordLabel")}</label>
								<div className="relative">
									<input
										id="confirm-password"
										type={showConfirmPassword ? "text" : "password"}
										required
										minLength={6}
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										className="bg-[#121212] px-3 py-2.5 w-full text-sm rounded-lg border border-[#2B2B2B] focus:outline-none focus:border-[#3B3B3B] pr-12"
									/>
									<button
										type="button"
										onClick={() => setShowConfirmPassword(!showConfirmPassword)}
										className="absolute inset-y-0 right-3 my-auto flex items-center justify-center text-gray-400 hover:text-gray-200 transition"
									>
										<span className="material-symbols-outlined text-[22px]">
											{showConfirmPassword ? "visibility_off" : "visibility"}
										</span>
									</button>
								</div>
							</div>

							<button
								type="submit"
								disabled={loading}
								className="w-full rounded-xl px-4 py-3 font-medium text-black bg-[#d0d0d0] cursor-pointer hover:bg-[#bcbcbc] transition mt-2 disabled:opacity-60"
							>
								{loading ? t("resetPassword.submitting") : t("resetPassword.submitBtn")}
							</button>
						</form>
					</div>
				</div>
			</div>

			<div className="absolute inset-0 pointer-events-none">
				<Threads
					color={[0.2, 0.6, 1]}
					amplitude={1.2}
					distance={0.1}
					enableMouseInteraction={false}
				/>
			</div>
		</div>
	);
}
