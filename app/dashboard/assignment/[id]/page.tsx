"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

function AssignmentContent() {
  const [assignment, setAssignment] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const assignmentId = params.id as string;

  useEffect(() => {
    const fetchAssignment = async () => {
      const { data } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();
      if (data) setAssignment(data);
    };
    fetchAssignment();
  }, [assignmentId, supabase]);

  const handleSubmit = async () => {
    setIsUploading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (assignment.type === "homework") {
      if (!textAnswer) {
        setMessage("Введи ответ.");
        setIsUploading(false);
        return;
      }

      const { error } = await supabase.from("submissions").insert({
        assignment_id: assignmentId,
        student_id: user?.id,
        status: "submitted",
        text_answer: textAnswer,
        submitted_at: new Date().toISOString(),
      });

      if (error) setMessage("Ошибка: " + error.message);
      else setMessage("Ответ успешно отправлен!");
    } else {
      if (!file) {
        setMessage("Выбери файл.");
        setIsUploading(false);
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(fileName, file);
      if (uploadError) {
        setMessage("Ошибка загрузки: " + uploadError.message);
        setIsUploading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("submissions").getPublicUrl(fileName);

      const { data: submission, error: subError } = await supabase
        .from("submissions")
        .insert({
          assignment_id: assignmentId,
          student_id: user?.id,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (subError) {
        setMessage("Ошибка сохранения: " + subError.message);
        setIsUploading(false);
        return;
      }

      await supabase.from("submission_files").insert({
        submission_id: submission.id,
        file_url: publicUrl,
        filename: file.name,
      });

      setMessage("Зачёт сдан на проверку!");
    }
    setIsUploading(false);
  };

  if (!assignment) return <div className="p-10 text-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-10 text-gray-900">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/dashboard"
          className="text-purple-600 hover:underline mb-6 inline-block"
        >
          ← Назад
        </Link>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{assignment.title}</h1>
            <span
              className={`px-2 py-1 text-xs font-bold rounded ${assignment.type === "test" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
            >
              {assignment.type === "test" ? "ЗАЧЁТ" : "ДЗ"}
            </span>
          </div>

          <div className="text-gray-700 mb-6 whitespace-pre-wrap">
            {assignment.description}
          </div>

          {assignment.file_url && (
            <div className="mb-8 p-4 bg-purple-50 rounded-xl border border-purple-100 flex justify-between items-center">
              <span className="font-medium text-purple-900">
                Материалы к заданию прикреплены
              </span>
              <a
                href={`${assignment.file_url}?download=${assignment.filename || "file"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-bold"
              >
                ⬇ Скачать файл
              </a>
            </div>
          )}

          <hr className="my-8" />

          <h2 className="text-xl font-bold mb-4">Твой ответ</h2>

          {assignment.type === "homework" ? (
            <textarea
              placeholder="Введи свой ответ здесь..."
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 min-h-32 mb-4"
            />
          ) : (
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 mb-4"
            />
          )}

          <button
            onClick={handleSubmit}
            disabled={isUploading}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {isUploading ? "Отправка..." : "Отправить на проверку"}
          </button>

          {message && (
            <p
              className={`mt-4 font-medium ${message.includes("Ошибка") ? "text-red-500" : "text-green-600"}`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AssignmentPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center">Загрузка данных задания...</div>
      }
    >
      <AssignmentContent />
    </Suspense>
  );
}
