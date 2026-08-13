// components/auth/LoginForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { openAuthModal, closeAuthModal } from "~/store/slices/modalSlice";
import { useAppDispatch } from "~/hooks/useAppDispatch";
import { doLogin } from "~/services/auth";
import { loginSuccess } from '~/store/slices/authSlice';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const dispatch = useAppDispatch();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormValues) => {
    console.log("Login Data:", data);

    doLogin(data)
      .then((resp) => {
        const r = resp as unknown as { success?: boolean; message?: string; data?: { token?: string } };
        const token = r.data?.token;
        if (token) {
          localStorage.setItem("token", token);
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            dispatch(
              loginSuccess({
                token,
                user: {
                  id: payload.id,
                  email: payload.email,
                  username: payload.email.split('@')[0],
                },
              })
            );
            dispatch(closeAuthModal());
            console.log("Login successful");
          } catch (e) {
            console.error("Failed to decode token", e);
          }
        } else {
          alert(r.message || "Login failed. Check credentials.");
        }
      })
      .catch((err) => {
        console.error("Login request failed:", err);
        alert("Invalid credentials or server error");
      });
  };

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:3001/api/auth/google";
  };

  return (
    <div className="text-zinc-300">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Email Address
          </label>
          <input
            {...register("email")}
            id="email"
            type="email"
            placeholder="name@example.com"
            className="mt-1 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {errors.email && (
            <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Password
          </label>
          <input
            {...register("password")}
            id="password"
            type="password"
            placeholder="••••••••"
            className="mt-1 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {errors.password && (
            <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 border border-indigo-500/20 text-white rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-indigo-600/20"
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="relative flex py-4 items-center">
        <div className="flex-grow border-t border-white/10"></div>
        <span className="flex-shrink mx-4 text-zinc-500 text-xs font-semibold uppercase tracking-wider">or</span>
        <div className="flex-grow border-t border-white/10"></div>
      </div>

      {/* Google OAuth Login Button */}
      <button
        onClick={handleGoogleLogin}
        className="w-full py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-bold flex items-center justify-center transition-all hover:scale-[1.02] active:scale-95 shadow-md"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.87 3C6.18 7.56 8.84 5.04 12 5.04z" />
          <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.09 2.67-2.31 3.49l3.6 2.79c2.1-1.94 3.3-4.79 3.3-8.17z" />
          <path fill="#FBBC05" d="M5.26 14.12c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.39 7.56C.5 9.35 0 11.35 0 13.5s.5 4.15 1.39 5.94l3.87-3.32z" />
          <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.6-2.79c-1 .67-2.28 1.07-3.96 1.07-3.16 0-5.82-2.52-6.78-5.52l-3.87 3C3.37 20.33 7.35 23 12 23z" />
        </svg>
        Continue with Google
      </button>

      <p className="mt-6 text-center text-xs text-zinc-500 font-semibold">
        Don&apos;t have an account?{" "}
        <button
          onClick={() => dispatch(openAuthModal("signup"))}
          className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
        >
          Sign Up
        </button>
      </p>
    </div>
  );
}
