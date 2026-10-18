"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); // Новое поле для имени
  const [message, setMessage] = useState("");

  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMessage("Ошибка: " + error.message);
    } else {
      setMessage("Успешный вход! Перенаправляем...");
      router.push("/dashboard");
    }
  };

  const handleSignUp = async () => {
    if (!fullName) {
      setMessage("Пожалуйста, введите ваше имя");
      return;
    }

    // Передаем имя в метаданные пользователя при регистрации
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      setMessage("Ошибка: " + error.message);
    } else {
      setMessage('Аккаунт создан! Теперь нажмите "Войти".');
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
      style={{
        backgroundImage:
          "url('https://i.pinimg.com/originals/39/96/c4/3996c44a04c2edc9628348c07fd73f4e.gif')",
      }}
    >
      <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>

      <div className="relative z-10 p-8 bg-black/60 backdrop-blur-md rounded-2xl shadow-2xl w-96 border border-white/20">
        <h1 className="text-3xl font-bold mb-8 text-center text-white tracking-wider">
          DevTrack
        </h1>

        <div className="flex flex-col gap-4">
          {/* Новое поле для имени */}
          <input
            type="text"
            placeholder="Ваше имя (для регистрации)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="p-3 bg-white text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 bg-white text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 bg-white text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
          />

          <div className="flex flex-col gap-3 mt-2">
            <button
              onClick={handleLogin}
              className="p-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors border border-white/30"
            >
              Войти
            </button>
            <button
              onClick={handleSignUp}
              className="p-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors border border-white/30"
            >
              Зарегистрироваться
            </button>
          </div>

          {message && (
            <p className="text-center text-sm mt-2 text-white font-medium bg-black/50 py-2 px-4 rounded-lg">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
