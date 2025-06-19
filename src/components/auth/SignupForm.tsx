// components/Auth/SignupForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authSchema, AuthFormData } from '~/libs/validations/authSchema';
import axiosInstance from "~/libs/axiosInstance";
import { doSignup } from "~/services/auth";

export default function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormData) => {
    console.log("Signup data:", data);

    doSignup(data).then(() => {
      console.log("Signup successful");
    });
    // TODO: Call signup API
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block mb-1 text-sm">Email</label>
        <input
          type="email"
          {...register("email")}
          className="w-full border px-3 py-2 rounded"
        />
        {errors.email && (
          <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block mb-1 text-sm">Password</label>
        <input
          type="password"
          {...register("password")}
          className="w-full border px-3 py-2 rounded"
        />
        {errors.password && (
          <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        {isSubmitting ? "Signing up..." : "Sign up"}
      </button>
    </form>
  );
}
