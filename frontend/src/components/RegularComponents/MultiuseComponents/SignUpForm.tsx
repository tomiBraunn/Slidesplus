// @ts-nocheck
import React, { useState } from "react";
import { toast } from "sonner";
import { supabase } from "../../../utils/supabaseClient";
import { useTranslation } from "react-i18next";

function SignUpForm() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("signup.passwordMismatch"));
      return;
    }

    try {
      // Use Supabase Auth to sign up. Supabase will send the confirmation email if SMTP is configured.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Redirect after confirmation (user clicks link in email)
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            username,
            first_name: firstName,
            last_name: lastName,
          },
        },
      } as any);

      if (error) {
        toast.error(error.message || t("signup.createAccountFailed"));
        return;
      }

      // Send user data + password to backend to save in public.users
      if (data?.user?.id) {
        try {
          const registerRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://slides-plus-backend.vercel.app'}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: data.user.id,
              email,
              username,
              password,
              first_name: firstName,
              last_name: lastName,
            }),
          });
          if (!registerRes.ok) {
            toast.error(t("signup.syncFailed"));
          }
        } catch (backendErr) {
          console.warn('Backend registration sync failed:', backendErr);
          toast.error(t("signup.syncFailed"));
        }
      }

      toast.success(t("signup.verifyEmail"), {
        description: t("signup.verifyEmailDescription"),
        action: {
          label: t("signup.goToLogin"),
          onClick: () => {
            window.location.href = "/login";
          },
        },
      });

      // Optionally clear form or keep values for user convenience
      setPassword("");
      setConfirmPassword("");

    } catch (err: any) {
      toast.error(t("settings.serverError"));
    }
  };

  return (
    <div className="relative flex items-center justify-center w-full">
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6">
        <div className="rounded-2xl border border-white/[0.06] bg-black/50 backdrop-blur-xl shadow-xl shadow-black/30">
          <div className="text-center px-4 sm:px-6 pt-6">
            <p className="text-xl sm:text-2xl font-semibold">{t("signup.title")}</p>
          </div>

          <div className="px-4 sm:px-6 pb-6 pt-4">
            <form onSubmit={handleSubmit} className="grid gap-4 sm:gap-6">

              <div className="grid gap-2 sm:gap-3">
                <label className="text-sm font-medium">{t("signup.nameLabel")}</label>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <input
                    type="text"
                    placeholder={t("signup.firstNamePlaceholder")}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="bg-[#121212] px-3 py-2.5 w-full sm:w-1/2 text-sm rounded-lg border border-[#2B2B2B] focus:outline-none focus:border-[#3B3B3B]"
                  />
                  <input
                    type="text"
                    placeholder={t("signup.lastNamePlaceholder")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="bg-[#121212] px-3 py-2.5 w-full sm:w-1/2 text-sm rounded-lg border border-[#2B2B2B] focus:outline-none focus:border-[#3B3B3B]"
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:gap-1">
                <label className="text-sm font-medium">{t("signup.usernameLabel")}</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-[#121212] px-3 py-2.5 w-full text-sm rounded-lg border border-[#2B2B2B] focus:outline-none focus:border-[#3B3B3B]"
                />
              </div>

              <div className="grid gap-2 sm:gap-1">
                <label className="text-sm font-medium">{t("signup.emailLabel")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-[#121212] px-3 py-2.5 w-full text-sm rounded-lg border border-[#2B2B2B] focus:outline-none focus:border-[#3B3B3B]"
                />
              </div>
              <div className="grid gap-2 sm:gap-1 relative">
                <label className="text-sm font-medium">{t("signup.passwordLabel")}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-[#121212] px-3 py-2.5 w-full text-sm rounded-lg border border-[#2B2B2B] pr-12 focus:outline-none focus:border-[#3B3B3B]"
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
              <div className="grid gap-2 sm:gap-1 relative">
                <label className="text-sm font-medium">{t("signup.confirmPasswordLabel")}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-[#121212] px-3 py-2.5 w-full text-sm rounded-lg border border-[#2B2B2B] pr-12 focus:outline-none focus:border-[#3B3B3B]"
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
                className="w-full rounded-xl px-4 py-3 font-medium text-black bg-[#d0d0d0] hover:bg-[#bcbcbc] transition cursor-pointer mt-2"
              >
                {t("signup.submitBtn")}
              </button>
              <div className="text-center text-sm flex justify-center">
                <p className="text-gray-400">
                  {t("signup.goBack")}
                  <a href="/" className="underline underline-offset-4 ml-1 text-white hover:text-gray-300 transition">
                     {t("signup.homeLink")}
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
