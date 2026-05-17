// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { urlbackend } from "./config.js";
import { getAuthToken } from "./utils/getAuthToken";

type Props = { children: React.ReactElement };

export default function ProtectedRoute({ children }: Props) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const tokenLocal = await getAuthToken();
      if (!tokenLocal) {
        setAllowed(false);
        setChecking(false);
        return;
      }
      try {
        const r = await fetch(`${urlbackend}/me`, {
          headers: { Authorization: `Bearer ${tokenLocal}` },
        });
        if (!cancelled) {
          if (r.ok) {
            setAllowed(true);
          } else {
            localStorage.removeItem("token");
            setAllowed(false);
          }
          setChecking(false);
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem("token");
          setAllowed(false);
          setChecking(false);
        }
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  if (checking) return null;
  if (!allowed) return <Navigate to="/login" replace state={{ returnTo: location.pathname + location.search }} />;
  return children;
}
