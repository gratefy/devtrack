"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";

export default function Dashboard() {
  const [fullName, setFullName] = useState<string | null>(null);
  const [role, setRole] = useState<string>("student");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");

  // --- УЧИТЕЛЬ: СОЗДАНИЕ / РЕДАКТИРОВАНИЕ ЗАДАНИЯ ---
  const [students, setStudents] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignmentType, setAssignmentType] = useState("homework");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(
    null,
  );

  // --- УЧИТЕЛЬ: СОЗДАНИЕ УЧЕНИКА ---
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  // --- МАТЕРИАЛЫ ---
  const [materials, setMaterials] = useState<any[]>([]);
  const [newMaterialTitle, setNewMaterialTitle] = useState("");
  const [newMaterialDesc, setNewMaterialDesc] = useState("");
  const [newMaterialFile, setNewMaterialFile] = useState<File | null>(null);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);

  // --- ПРОВЕРКА РАБОТ ---
  const [pendingHomeworks, setPendingHomeworks] = useState<any[]>([]);
  const [pendingTests, setPendingTests] = useState<any[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);

  // --- ЗАГРУЗКА ФАЙЛОВ ДЛЯ ЗАДАНИЙ ---
  const [assignmentFileUrl, setAssignmentFileUrl] = useState<string | null>(
    null,
  );
  const [assignmentFileName, setAssignmentFileName] = useState<string | null>(
    null,
  );

  // --- УЧЕНИК: ЗАДАНИЯ ---
  const [actualHomeworks, setActualHomeworks] = useState<any[]>([]);
  const [completedHomeworks, setCompletedHomeworks] = useState<any[]>([]);
  const [myTests, setMyTests] = useState<any[]>([]);
  const [myProgress, setMyProgress] = useState<any[]>([]);

  // --- КАТАЛОГ ЗАДАЧ ---
  const [catalogTasks, setCatalogTasks] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatement, setNewTaskStatement] = useState("");
  const [newTaskTopicId, setNewTaskTopicId] = useState("");
  const [newTaskCorrectAnswer, setNewTaskCorrectAnswer] = useState("");
  const [newTaskFile, setNewTaskFile] = useState<File | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // --- УЧЕНИК: ПРОВЕРКА ЗАДАЧ В КАТАЛОГЕ ---
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>(
    {},
  );
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const [checkResults, setCheckResults] = useState<Record<string, boolean>>({});

  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const loadData = async (userRole: string, userId: string) => {
    const { data: topicsData } = await supabase.from("topics").select("*");
    if (topicsData) {
      const sortedTopics = topicsData.sort((a, b) => {
        const numA = parseInt(a.title.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.title.replace(/\D/g, "")) || 0;
        return numA - numB;
      });
      setTopics(sortedTopics);
    }

    const { data: catalogData } = await supabase
      .from("tasks")
      .select("*, topics(title)")
      .order("created_at", { ascending: false });
    if (catalogData) setCatalogTasks(catalogData);

    const { data: materialsData } = await supabase
      .from("materials")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false });
    if (materialsData) setMaterials(materialsData);

    if (userRole === "teacher") {
      setActiveTab("create");

      const { data: st } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .eq("role", "student");
      if (st) setStudents(st);

      const { data: pending } = await supabase
        .from("submissions")
        .select(
          `id, submitted_at, text_answer, is_correct, profiles(full_name), assignments(title, type, correct_answer), submission_files(file_url, filename)`,
        )
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });

      if (pending) {
        setPendingHomeworks(
          pending.filter((p: any) => p.assignments?.type === "homework"),
        );
        setPendingTests(
          pending.filter((p: any) => p.assignments?.type === "test"),
        );
      }

      const { data: tAssignments } = await supabase
        .from("assignments")
        .select("*")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });
      if (tAssignments) setTeacherAssignments(tAssignments);
    } else {
      setActiveTab("actual_homework");

      const { data: assigned } = await supabase
        .from("assignment_students")
        .select(
          `assignments (id, title, description, type, file_url, filename)`,
        )
        .eq("student_id", userId);

      const { data: subs } = await supabase
        .from("submissions")
        .select(
          "assignment_id, status, submitted_at, teacher_feedback, is_correct",
        )
        .eq("student_id", userId)
        .order("submitted_at", { ascending: false });

      const subStatusMap: Record<string, any> = {};
      if (subs) {
        subs.forEach((s) => {
          if (!subStatusMap[s.assignment_id]) {
            subStatusMap[s.assignment_id] = {
              status: s.status,
              feedback: s.teacher_feedback,
              is_correct: s.is_correct,
              submitted_at: s.submitted_at,
            };
          }
        });
      }

      if (assigned) {
        const actualHwList: any[] = [];
        const completedHwList: any[] = [];
        const testList: any[] = [];
        const progressList: any[] = [];

        assigned.forEach((a: any) => {
          const assign = a.assignments;
          const subInfo = subStatusMap[assign.id];

          if (assign.type === "homework") {
            if (!subInfo || subInfo.status === "rejected") {
              actualHwList.push({ ...assign, sub_info: subInfo });
            } else {
              completedHwList.push({ ...assign, sub_info: subInfo });
            }
          } else {
            if (!subInfo || subInfo.status !== "approved") {
              testList.push({ ...assign, sub_info: subInfo });
            } else {
              progressList.push({ ...assign, sub_info: subInfo });
            }
          }
        });

        setActualHomeworks(actualHwList);
        setCompletedHomeworks(completedHwList);
        setMyTests(testList);
        setMyProgress(progressList);
      }
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();
      if (profile) {
        setRole(profile.role);
        setFullName(profile.full_name || user.email);
        await loadData(profile.role, user.id);
      }
      setLoading(false);
    };
    checkUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSaveAssignment = async () => {
    if (!title || (selectedStudents.length === 0 && !editingAssignmentId))
      return alert("Заполни название и выбери учеников!");
    if (assignmentType === "homework" && !correctAnswer)
      return alert("Напиши правильный ответ для домашки!");

    setIsCreating(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (editingAssignmentId) {
      const { error } = await supabase
        .from("assignments")
        .update({
          title,
          description,
          type: assignmentType,
          correct_answer: assignmentType === "homework" ? correctAnswer : null,
        })
        .eq("id", editingAssignmentId);

      if (error) alert("Ошибка: " + error.message);
      else {
        alert("Задание обновлено!");
        setEditingAssignmentId(null);
        setTitle("");
        setDescription("");
        setCorrectAnswer("");
        setAssignmentFileUrl(null);
        setAssignmentFileName(null);
        await loadData("teacher", user?.id || "");
      }
    } else {
      const { data: newAssignment, error } = await supabase
        .from("assignments")
        .insert({
          title,
          description,
          type: assignmentType,
          created_by: user?.id,
          file_url: assignmentFileUrl,
          filename: assignmentFileName,
          correct_answer: assignmentType === "homework" ? correctAnswer : null,
        })
        .select()
        .single();

      if (error) alert("Ошибка: " + error.message);
      else {
        const studentLinks = selectedStudents.map((sid) => ({
          assignment_id: newAssignment.id,
          student_id: sid,
        }));
        await supabase.from("assignment_students").insert(studentLinks);
        alert("Задание создано!");
        setTitle("");
        setDescription("");
        setSelectedStudents([]);
        setAssignmentFileUrl(null);
        setAssignmentFileName(null);
        setCorrectAnswer("");
        await loadData("teacher", user?.id || "");
      }
    }
    setIsCreating(false);
  };

  const startEditAssignment = (a: any) => {
    setEditingAssignmentId(a.id);
    setTitle(a.title);
    setDescription(a.description || "");
    setAssignmentType(a.type);
    setCorrectAnswer(a.correct_answer || "");
    setActiveTab("create");
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm("Удалить это задание? Оно исчезнет у учеников."))
      return;
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (!error)
      setTeacherAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleCreateStudent = async () => {
    if (!newStudentName || !newStudentEmail || !newStudentPassword)
      return alert("Заполни все поля!");
    setIsCreatingStudent(true);

    const res = await fetch("/api/create-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newStudentEmail,
        password: newStudentPassword,
        fullName: newStudentName,
      }),
    });

    const data = await res.json();
    if (data.error) {
      alert("Ошибка: " + data.error);
    } else {
      alert("Ученик успешно создан!");
      setNewStudentName("");
      setNewStudentEmail("");
      setNewStudentPassword("");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) loadData("teacher", user.id);
    }
    setIsCreatingStudent(false);
  };

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm("Удалить ученика? Он больше не сможет зайти.")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (!error) setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUploadMaterial = async () => {
    if (!newMaterialTitle || !newMaterialFile)
      return alert("Нужно название и файл!");
    setIsUploadingMaterial(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const fileExt = newMaterialFile.name.split(".").pop();
    const fileName = `mat_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("submissions")
      .upload(fileName, newMaterialFile);
    if (uploadError) {
      alert("Ошибка: " + uploadError.message);
      setIsUploadingMaterial(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("submissions").getPublicUrl(fileName);

    const { error } = await supabase.from("materials").insert({
      title: newMaterialTitle,
      description: newMaterialDesc,
      file_url: publicUrl,
      filename: newMaterialFile.name,
      created_by: user?.id,
    });

    if (error) alert("Ошибка: " + error.message);
    else {
      alert("Материал добавлен!");
      setNewMaterialTitle("");
      setNewMaterialDesc("");
      setNewMaterialFile(null);
      await loadData("teacher", user?.id || "");
    }
    setIsUploadingMaterial(false);
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!window.confirm("Удалить материал?")) return;
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (!error) setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSaveTask = async () => {
    if (!newTaskTitle || !newTaskStatement || !newTaskTopicId)
      return alert("Заполни все поля!");
    setIsAddingTask(true);

    let fileUrl = null,
      fileName = null;
    if (newTaskFile) {
      const fileExt = newTaskFile.name.split(".").pop();
      const uniqueName = `task_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(uniqueName, newTaskFile);
      if (uploadError) {
        alert("Ошибка: " + uploadError.message);
        setIsAddingTask(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("submissions").getPublicUrl(uniqueName);
      fileUrl = publicUrl;
      fileName = newTaskFile.name;
    }

    if (editingTaskId) {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: newTaskTitle,
          statement: newTaskStatement,
          topic_id: newTaskTopicId,
          correct_answer: newTaskCorrectAnswer,
          ...(fileUrl && { file_url: fileUrl, filename: fileName }),
        })
        .eq("id", editingTaskId);
      if (error) alert(error.message);
      else {
        alert("Задача обновлена!");
        setEditingTaskId(null);
        setNewTaskTitle("");
        setNewTaskStatement("");
        setNewTaskTopicId("");
        setNewTaskCorrectAnswer("");
        setNewTaskFile(null);
        await loadData("teacher", "");
      }
    } else {
      const { error } = await supabase.from("tasks").insert({
        title: newTaskTitle,
        statement: newTaskStatement,
        topic_id: newTaskTopicId,
        type: "test",
        file_url: fileUrl,
        filename: fileName,
        correct_answer: newTaskCorrectAnswer,
      });
      if (error) alert(error.message);
      else {
        alert("Задача добавлена!");
        setNewTaskTitle("");
        setNewTaskStatement("");
        setNewTaskTopicId("");
        setNewTaskFile(null);
        setNewTaskCorrectAnswer("");
        await loadData("teacher", "");
      }
    }
    setIsAddingTask(false);
  };

  const startEditTask = (task: any) => {
    setEditingTaskId(task.id);
    setNewTaskTitle(task.title);
    setNewTaskStatement(task.statement);
    setNewTaskTopicId(task.topic_id);
    setNewTaskCorrectAnswer(task.correct_answer || "");
    setNewTaskFile(null);
    window.scrollTo(0, 0);
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Удалить задачу из каталога?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) setCatalogTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleApprove = async (submissionId: string) => {
    await supabase
      .from("submissions")
      .update({ status: "approved" })
      .eq("id", submissionId);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) loadData("teacher", user.id);
  };

  const handleReject = async (submissionId: string) => {
    const reason = window.prompt(
      "Что нужно исправить? Напиши комментарий для ученика:",
    );
    if (reason === null) return;
    if (!reason.trim()) return alert("Пожалуйста, напиши комментарий.");

    await supabase
      .from("submissions")
      .update({ status: "rejected", teacher_feedback: reason })
      .eq("id", submissionId);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) loadData("teacher", user.id);
  };

  const handleAssignmentFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileExt = file.name.split(".").pop();
    const fileName = `assign_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("submissions")
      .upload(fileName, file);
    if (error) {
      alert("Ошибка загрузки: " + error.message);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("submissions").getPublicUrl(fileName);
    setAssignmentFileUrl(publicUrl);
    setAssignmentFileName(file.name);
  };

  const handleCheckAnswer = (taskId: string, correctAnswer: string) => {
    const studentAns = (studentAnswers[taskId] || "").trim().toLowerCase();
    const teacherAns = (correctAnswer || "").trim().toLowerCase();
    if (!studentAns) return alert("Введи свой ответ!");
    setCheckResults((prev) => ({
      ...prev,
      [taskId]: studentAns === teacherAns,
    }));
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-900 dark:text-white">
        Загрузка...
      </div>
    );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center p-10 mt-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 border-dashed transition-colors duration-200">
      <img
        src="https://i.pinimg.com/originals/33/f4/36/33f436d73b568cd12bb155acdafee707.jpg"
        alt="Отдых"
        className="w-48 h-auto rounded-xl mb-6 object-cover shadow-sm opacity-90 dark:opacity-75"
      />
      <p className="text-lg font-bold text-gray-500 dark:text-gray-400">
        Ура! Все сделано, можно отдохнуть
      </p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* САЙДБАР */}
      <aside className="w-72 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col justify-between h-screen sticky top-0 transition-colors duration-200">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-wider mb-8 text-gray-900 dark:text-white">
            DevTrack
          </h1>
          <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
            <p className="text-xl text-gray-500 dark:text-gray-400 font-semibold capitalize mb-1">
              Профиль
            </p>
            <p className="text-lg font-medium text-gray-900 dark:text-white truncate">
              {fullName}
            </p>
          </div>
          <nav className="flex flex-col gap-2">
            {role === "teacher" ? (
              <>
                <button
                  onClick={() => setActiveTab("create")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${activeTab === "create" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  Создать задание
                </button>
                <button
                  onClick={() => setActiveTab("check")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${activeTab === "check" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  Проверка работ
                </button>
                <button
                  onClick={() => setActiveTab("catalog")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${activeTab === "catalog" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  Каталог задач
                </button>
                <button
                  onClick={() => setActiveTab("students")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${activeTab === "students" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  Мои ученики
                </button>
                <button
                  onClick={() => setActiveTab("materials")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${activeTab === "materials" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  Материалы
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab("actual_homework")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${activeTab === "actual_homework" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  Актуальное ДЗ
                </button>
                <button
                  onClick={() => setActiveTab("completed_homework")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${activeTab === "completed_homework" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  Сделанное ДЗ
                </button>

                {/* ВОЗВРАЩАЕМ ДВЕ ВКЛАДКИ */}
                <button
                  onClick={() => setActiveTab("test")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${activeTab === "test" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  Невыполненные зачёты
                </button>
                <button
                  onClick={() => setActiveTab("progress")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${activeTab === "progress" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  Выполненные зачёты
                </button>

                <button
                  onClick={() => setActiveTab("catalog")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${activeTab === "catalog" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  Каталог задач
                </button>
                <button
                  onClick={() => setActiveTab("materials")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${activeTab === "materials" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  Материалы
                </button>
              </>
            )}
          </nav>
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-3 transition-colors duration-200">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium text-center transition-all duration-200 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              {theme === "dark" ? "☀️ Светлая тема" : "🌙 Тёмная тема"}
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium text-center"
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* ОСНОВНАЯ ОБЛАСТЬ */}
      <main className="flex-1 p-10">
        <div className="max-w-6xl mx-auto">
          {/* --- УЧИТЕЛЬ: СОЗДАНИЕ / РЕДАКТИРОВАНИЕ ЗАДАНИЯ --- */}
          {role === "teacher" && activeTab === "create" && (
            <div className="flex flex-col gap-8">
              <div
                className={`p-6 rounded-2xl border transition-colors duration-200 ${editingAssignmentId ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700" : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"}`}
              >
                <h3 className="text-xl font-bold mb-4">
                  {editingAssignmentId
                    ? "Редактировать задание"
                    : "Создать новое задание"}
                </h3>

                {assignmentFileUrl && !editingAssignmentId && (
                  <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg flex justify-between items-center">
                    <span className="text-sm text-purple-800 dark:text-purple-300">
                      📎 Прикреплен файл: {assignmentFileName}
                    </span>
                    <button
                      onClick={() => {
                        setAssignmentFileUrl(null);
                        setAssignmentFileName(null);
                      }}
                      className="text-red-500 dark:text-red-400 text-sm hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex gap-6 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="homework"
                        checked={assignmentType === "homework"}
                        onChange={() => setAssignmentType("homework")}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span>ДЗ (автопроверка)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="test"
                        checked={assignmentType === "test"}
                        onChange={() => setAssignmentType("test")}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span>Зачёт (файл)</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Название"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <textarea
                    placeholder="Описание или текст задания"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:border-purple-500 min-h-24 transition-colors"
                  />

                  {assignmentType === "homework" && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="font-bold text-blue-800 dark:text-blue-300 mb-2">
                        Автопроверка
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Впиши правильный ответ. Система сверит его с ответом
                        ученика.
                      </p>
                      <input
                        type="text"
                        placeholder="Правильный ответ"
                        value={correctAnswer}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        className="p-3 border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:border-blue-500 w-full transition-colors"
                      />
                    </div>
                  )}

                  {!editingAssignmentId && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Прикрепить файл к заданию (необязательно)
                      </p>
                      <input
                        type="file"
                        onChange={handleAssignmentFileUpload}
                        className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 dark:file:bg-purple-900/30 file:text-purple-700 dark:file:text-purple-300 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
                      />
                    </div>
                  )}
                </div>

                {!editingAssignmentId && (
                  <div className="mb-4">
                    <p className="font-medium mb-2">Кому выдать?</p>
                    <div className="flex flex-col gap-2">
                      {students.map((student) => (
                        <label
                          key={student.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() =>
                              setSelectedStudents((prev) =>
                                prev.includes(student.id)
                                  ? prev.filter((s) => s !== student.id)
                                  : [...prev, student.id],
                              )
                            }
                            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <span>{student.full_name || "Без имени"}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveAssignment}
                    disabled={isCreating}
                    className="px-6 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    {isCreating
                      ? "Сохранение..."
                      : editingAssignmentId
                        ? "Сохранить изменения"
                        : "Создать и выдать"}
                  </button>
                  {editingAssignmentId && (
                    <button
                      onClick={() => {
                        setEditingAssignmentId(null);
                        setTitle("");
                        setDescription("");
                        setCorrectAnswer("");
                        setAssignmentFileUrl(null);
                        setAssignmentFileName(null);
                      }}
                      className="px-6 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Отмена
                    </button>
                  )}
                </div>
              </div>

              {!editingAssignmentId && (
                <div>
                  <h3 className="text-xl font-bold mb-4">
                    Ранее выданные задания
                  </h3>
                  {teacherAssignments.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div className="grid gap-4">
                      {teacherAssignments.map((a) => (
                        <div
                          key={a.id}
                          className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center transition-colors duration-200"
                        >
                          <div>
                            <p className="font-bold text-lg">{a.title}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {a.type === "test" ? "Зачёт" : "ДЗ"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditAssignment(a)}
                              className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium"
                            >
                              ✎ Редактировать
                            </button>
                            <button
                              onClick={() => handleDeleteAssignment(a.id)}
                              className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium"
                            >
                              🗑 Удалить
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* --- УЧИТЕЛЬ: ПРОВЕРКА РАБОТ --- */}
          {role === "teacher" && activeTab === "check" && (
            <div className="flex flex-col gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-300">
                  Сданные домашние задания
                </h3>
                {pendingHomeworks.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="grid gap-4">
                    {pendingHomeworks.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm transition-colors duration-200"
                      >
                        <p className="font-bold text-lg mb-1">
                          {sub.assignments?.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Ученик: {sub.profiles?.full_name}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <span className="font-semibold block mb-1 text-sm text-gray-500 dark:text-gray-400">
                              Ответ ученика:
                            </span>
                            <span className="text-lg">
                              {sub.text_answer || "Пустой ответ"}
                            </span>
                          </div>
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <span className="font-semibold block mb-1 text-sm text-blue-500 dark:text-blue-400">
                              Правильный ответ:
                            </span>
                            <span className="text-lg">
                              {sub.assignments?.correct_answer}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`p-3 rounded-lg mb-4 font-bold ${sub.is_correct ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`}
                        >
                          Автопроверка:{" "}
                          {sub.is_correct ? "Правильно" : "Неправильно"}
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(sub.id)}
                            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                          >
                            Одобрить (Зачесть)
                          </button>
                          <button
                            onClick={() => handleReject(sub.id)}
                            className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                          >
                            Отклонить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4 text-purple-900 dark:text-purple-300">
                  Сданные зачёты (файлы)
                </h3>
                {pendingTests.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="grid gap-4">
                    {pendingTests.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm transition-colors duration-200"
                      >
                        <p className="font-bold text-lg mb-1">
                          {sub.assignments?.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Ученик: {sub.profiles?.full_name}
                        </p>

                        <div className="flex items-center gap-4 mb-4">
                          {sub.submission_files?.[0] && (
                            <a
                              href={`${sub.submission_files[0].file_url}?download=${sub.submission_files[0].filename}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                            >
                              📎 Скачать файл (
                              {sub.submission_files[0].filename})
                            </a>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(sub.id)}
                            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                          >
                            Одобрить (Зачёт)
                          </button>
                          <button
                            onClick={() => handleReject(sub.id)}
                            className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                          >
                            Отклонить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- УЧИТЕЛЬ: УЧЕНИКИ --- */}
          {role === "teacher" && activeTab === "students" && (
            <div>
              <h3 className="text-xl font-bold mb-4">Мои ученики</h3>

              <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 mb-8 transition-colors duration-200">
                <h4 className="font-bold mb-4">Добавить нового ученика</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Имя ученика"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    className="p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Пароль (придумай)"
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    className="p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg transition-colors"
                  />
                </div>
                <button
                  onClick={handleCreateStudent}
                  disabled={isCreatingStudent}
                  className="px-6 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {isCreatingStudent ? "Создание..." : "Создать аккаунт"}
                </button>
              </div>

              <div className="grid gap-4">
                {students.length === 0 ? (
                  <EmptyState />
                ) : (
                  students.map((st) => (
                    <div
                      key={st.id}
                      className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center transition-colors duration-200"
                    >
                      <div>
                        <p className="font-bold text-lg">{st.full_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Зарегистрирован:{" "}
                          {new Date(st.created_at).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteStudent(st.id)}
                        className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium"
                      >
                        Удалить
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* --- УЧЕНИК: АКТУАЛЬНОЕ ДЗ --- */}
          {role === "student" && activeTab === "actual_homework" && (
            <div>
              <h3 className="text-xl font-bold mb-4">
                Актуальное домашнее задание
              </h3>
              {actualHomeworks.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid gap-4">
                  {actualHomeworks.map((hw) => (
                    <div
                      key={hw.id}
                      className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative transition-colors duration-200"
                    >
                      {hw.sub_info?.status === "rejected" && (
                        <div className="absolute top-4 right-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-200 dark:border-red-800">
                          На доработку
                        </div>
                      )}
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {hw.title}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {hw.description}
                      </p>

                      {hw.sub_info?.status === "rejected" && (
                        <div className="text-red-600 dark:text-red-400 text-sm mb-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800">
                          <span className="font-bold block mb-1">
                            Комментарий:
                          </span>
                          {hw.sub_info?.feedback ||
                            "Исправь ошибки и отправь заново."}
                        </div>
                      )}

                      <Link
                        href={`/dashboard/assignment/${hw.id}`}
                        className="inline-block px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-lg hover:bg-gray-800 dark:hover:bg-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {hw.sub_info?.status === "rejected"
                          ? "Исправить"
                          : "Приступить"}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- УЧЕНИК: СДЕЛАННОЕ ДЗ --- */}
          {role === "student" && activeTab === "completed_homework" && (
            <div>
              <h3 className="text-xl font-bold mb-4">
                Сделанные домашние задания
              </h3>
              {completedHomeworks.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid gap-4">
                  {completedHomeworks.map((hw) => (
                    <div
                      key={hw.id}
                      className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative flex flex-col transition-colors duration-200"
                    >
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {hw.title}
                      </h4>

                      <div className="flex flex-col mb-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Статус:{" "}
                          {hw.sub_info?.status === "approved"
                            ? "Принято"
                            : "Ожидает проверки"}
                        </span>
                        {hw.sub_info?.submitted_at && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Сдано:{" "}
                            {new Date(
                              hw.sub_info.submitted_at,
                            ).toLocaleDateString("ru-RU")}
                          </span>
                        )}
                      </div>

                      {hw.sub_info?.is_correct !== null &&
                        hw.sub_info?.is_correct !== undefined && (
                          <div
                            className={`inline-block px-3 py-1 rounded-lg text-sm font-bold mb-4 w-fit ${hw.sub_info.is_correct ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`}
                          >
                            {hw.sub_info.is_correct
                              ? "Правильно"
                              : "Неправильно"}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- УЧЕНИК: НЕВЫПОЛНЕННЫЕ ЗАЧЕТЫ --- */}
          {role === "student" && activeTab === "test" && (
            <div>
              <h3 className="text-xl font-bold mb-4">Невыполненные зачёты</h3>
              {myTests.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid gap-4">
                  {myTests.map((test) => (
                    <div
                      key={test.id}
                      className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative transition-colors duration-200"
                    >
                      {test.sub_info?.status === "rejected" && (
                        <div className="absolute top-4 right-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-200 dark:border-red-800">
                          Отклонено
                        </div>
                      )}
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {test.title}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {test.description}
                      </p>

                      {test.sub_info?.status === "rejected" && (
                        <div className="text-red-600 dark:text-red-400 text-sm mb-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800">
                          <span className="font-bold block mb-1">
                            Комментарий:
                          </span>
                          {test.sub_info?.feedback ||
                            "Исправь ошибки и отправь заново."}
                        </div>
                      )}

                      <Link
                        href={`/dashboard/assignment/${test.id}`}
                        className="inline-block px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white text-sm rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {test.sub_info?.status === "rejected"
                          ? "Исправить"
                          : "Сдать зачёт"}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- УЧЕНИК: ВЫПОЛНЕННЫЕ ЗАЧЕТЫ --- */}
          {role === "student" && activeTab === "progress" && (
            <div>
              <h3 className="text-xl font-bold mb-4">Выполненные зачёты</h3>
              {myProgress.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid gap-4">
                  {myProgress.map((p) => (
                    <div
                      key={p.id}
                      className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 flex justify-between items-center transition-colors duration-200"
                    >
                      <div>
                        <h4 className="text-lg font-bold text-green-900 dark:text-green-400">
                          {p.title}
                        </h4>
                        <div className="flex flex-col mt-1">
                          <span className="text-sm text-green-700 dark:text-green-500">
                            Принято
                          </span>
                          {p.sub_info?.submitted_at && (
                            <span className="text-xs text-green-600 dark:text-green-600 mt-1">
                              Сдано:{" "}
                              {new Date(
                                p.sub_info.submitted_at,
                              ).toLocaleDateString("ru-RU")}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-3xl">✅</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- МАТЕРИАЛЫ --- */}
          {activeTab === "materials" && (
            <div>
              <h3 className="text-xl font-bold mb-4">Материалы и конспекты</h3>

              {role === "teacher" && (
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 mb-8 transition-colors duration-200">
                  <h4 className="font-bold mb-4">Загрузить материал</h4>
                  <div className="flex flex-col gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Название (например: Шпаргалка по циклам)"
                      value={newMaterialTitle}
                      onChange={(e) => setNewMaterialTitle(e.target.value)}
                      className="p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg transition-colors"
                    />
                    <textarea
                      placeholder="Описание (необязательно)"
                      value={newMaterialDesc}
                      onChange={(e) => setNewMaterialDesc(e.target.value)}
                      className="p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg min-h-20 transition-colors"
                    />
                    <input
                      type="file"
                      onChange={(e) =>
                        setNewMaterialFile(e.target.files?.[0] || null)
                      }
                      className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 dark:file:bg-purple-900/30 file:text-purple-700 dark:file:text-purple-300 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleUploadMaterial}
                    disabled={isUploadingMaterial}
                    className="px-6 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    {isUploadingMaterial ? "Загрузка..." : "Опубликовать"}
                  </button>
                </div>
              )}

              <div className="grid gap-4">
                {materials.length === 0 ? (
                  <EmptyState />
                ) : (
                  materials.map((mat) => (
                    <div
                      key={mat.id}
                      className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative transition-colors duration-200"
                    >
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {mat.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        Добавил: {mat.profiles?.full_name || "Учитель"} •{" "}
                        {new Date(mat.created_at).toLocaleDateString("ru-RU")}
                      </p>
                      {mat.description && (
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                          {mat.description}
                        </p>
                      )}

                      <div className="flex gap-4 items-center">
                        <a
                          href={`${mat.file_url}?download=${mat.filename}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-lg hover:bg-gray-800 dark:hover:bg-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          ⬇ Скачать файл ({mat.filename})
                        </a>
                        {role === "teacher" && (
                          <button
                            onClick={() => handleDeleteMaterial(mat.id)}
                            className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium"
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* --- КАТАЛОГ ЗАДАЧ --- */}
          {activeTab === "catalog" && (
            <div>
              <h3 className="text-xl font-bold mb-4">Каталог задач</h3>

              {role === "teacher" && (
                <div
                  className={`p-6 rounded-2xl border mb-8 transition-colors duration-200 ${editingTaskId ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700" : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"}`}
                >
                  <h4 className="font-bold mb-4">
                    {editingTaskId
                      ? "Редактировать задачу"
                      : "Добавить задачу в каталог"}
                  </h4>
                  <div className="flex flex-col gap-4 mb-4">
                    <select
                      value={newTaskTopicId}
                      onChange={(e) => setNewTaskTopicId(e.target.value)}
                      className="p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg transition-colors"
                    >
                      <option value="">Выбери номер задания (тему)</option>
                      {topics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Название задачи (кратко)"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg transition-colors"
                    />
                    <textarea
                      placeholder="Текст задачи"
                      value={newTaskStatement}
                      onChange={(e) => setNewTaskStatement(e.target.value)}
                      className="p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg min-h-24 transition-colors"
                    />

                    <input
                      type="text"
                      placeholder="Правильный ответ (для автопроверки)"
                      value={newTaskCorrectAnswer}
                      onChange={(e) => setNewTaskCorrectAnswer(e.target.value)}
                      className="p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg transition-colors"
                    />

                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Прикрепить файл{" "}
                        {editingTaskId && "(оставь пустым, чтобы не менять)"}
                      </p>
                      <input
                        type="file"
                        onChange={(e) =>
                          setNewTaskFile(e.target.files?.[0] || null)
                        }
                        className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 dark:file:bg-purple-900/30 file:text-purple-700 dark:file:text-purple-300 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveTask}
                      disabled={isAddingTask}
                      className="px-6 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      {isAddingTask
                        ? "Сохранение..."
                        : editingTaskId
                          ? "Сохранить изменения"
                          : "Сохранить в каталог"}
                    </button>
                    {editingTaskId && (
                      <button
                        onClick={() => {
                          setEditingTaskId(null);
                          setNewTaskTitle("");
                          setNewTaskStatement("");
                          setNewTaskCorrectAnswer("");
                          setNewTaskFile(null);
                        }}
                        className="px-6 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Отмена
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-6 flex items-center gap-4">
                <label className="font-medium">Фильтр по заданию:</label>
                <select
                  value={filterTopic}
                  onChange={(e) => setFilterTopic(e.target.value)}
                  className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:border-purple-500 min-w-50 transition-colors"
                >
                  <option value="all">Все задачи</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4">
                {(filterTopic === "all"
                  ? catalogTasks
                  : catalogTasks.filter((t) => t.topic_id === filterTopic)
                ).length === 0 ? (
                  <EmptyState />
                ) : (
                  (filterTopic === "all"
                    ? catalogTasks
                    : catalogTasks.filter((t) => t.topic_id === filterTopic)
                  ).map((task) => (
                    <div
                      key={task.id}
                      className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm relative transition-colors duration-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                          {task.title}
                        </h4>
                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full">
                          {task.topics?.title || "Без темы"}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                        {task.statement}
                      </p>

                      {task.file_url && (
                        <div className="mb-4">
                          <a
                            href={`${task.file_url}?download=${task.filename || "file"}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 dark:text-purple-400 hover:underline text-sm font-medium"
                          >
                            📎 Скачать файл к задаче (
                            {task.filename || "Скачать"})
                          </a>
                        </div>
                      )}

                      {role === "student" && task.correct_answer && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Проверь себя:
                          </p>
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              placeholder="Твой ответ..."
                              value={studentAnswers[task.id] || ""}
                              onChange={(e) =>
                                setStudentAnswers({
                                  ...studentAnswers,
                                  [task.id]: e.target.value,
                                })
                              }
                              className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg flex-1 focus:outline-none focus:border-purple-500 transition-colors"
                            />
                            <button
                              onClick={() =>
                                handleCheckAnswer(task.id, task.correct_answer)
                              }
                              className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-sm"
                            >
                              Проверить
                            </button>
                            <button
                              onClick={() =>
                                setShowAnswers({
                                  ...showAnswers,
                                  [task.id]: !showAnswers[task.id],
                                })
                              }
                              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-sm"
                            >
                              {showAnswers[task.id]
                                ? "Скрыть ответ"
                                : "Показать ответ"}
                            </button>
                          </div>

                          {checkResults[task.id] !== undefined && (
                            <div
                              className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${checkResults[task.id] ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`}
                            >
                              {checkResults[task.id]
                                ? "Правильно! ✅"
                                : "Неправильно ❌"}
                            </div>
                          )}

                          {showAnswers[task.id] && (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-300 text-sm">
                              <span className="font-bold block mb-1">
                                Правильный ответ:
                              </span>
                              {task.correct_answer}
                            </div>
                          )}
                        </div>
                      )}

                      {role === "teacher" && (
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => startEditTask(task)}
                            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium"
                          >
                            ✎ Редактировать
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium"
                          >
                            🗑 Удалить
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
