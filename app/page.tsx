"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }

    checkUser();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="text-center">
        <div className="text-4xl">💰</div>

        <p className="mt-4 text-sm text-neutral-500">
          Membuka BelanjaKu...
        </p>
      </div>
    </main>
  );
}