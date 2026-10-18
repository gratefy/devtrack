"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Dashboard() {
  const [fullName, setFullName] = useState<string | null>(null);
  const [role, setRole] = useState<string>("student");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");

  // Женя: Создание ДЗ
  const [students, setStudents] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignmentType, setAssignmentType] = useState("homework");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Списки проверки
  const [pendingHomeworks, setPendingHomeworks] = useState<any[]>([]);
  const [pendingTests, setPendingTests] = useState<any[]>([]);

  // Список созданных заданий
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);

  // Файлы для задания
  const [assignmentFileUrl, setAssignmentFileUrl] = useState<string | null>(
    null,
  );
  const [assignmentFileName, setAssignmentFileName] = useState<string | null>(
    null,
  );

  // Ученик: Задания
  const [myHomework, setMyHomework] = useState<any[]>([]);
  const [myTests, setMyTests] = useState<any[]>([]);
  const [myProgress, setMyProgress] = useState<any[]>([]);

  // КАТАЛОГ ЗАДАЧ
  const [catalogTasks, setCatalogTasks] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [filterTopic, setFilterTopic] = useState<string>("all");

  // Форма добавления в каталог
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatement, setNewTaskStatement] = useState("");
  const [newTaskTopicId, setNewTaskTopicId] = useState("");
  const [newTaskFile, setNewTaskFile] = useState<File | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const router = useRouter();
  const supabase = createClient();

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

    if (userRole === "teacher") {
      setActiveTab("create");
      const { data: st } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "student");
      if (st) setStudents(st);

      const { data: pending } = await supabase
        .from("submissions")
        .select(
          `id, submitted_at, text_answer, teacher_feedback, profiles(full_name), assignments(title, type), submission_files(file_url, filename)`,
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
      setActiveTab("homework");
      const { data: assigned } = await supabase
        .from("assignment_students")
        .select(
          `assignments (id, title, description, type, file_url, filename)`,
        )
        .eq("student_id", userId);

      // Забираем комментарий Жени тоже
      const { data: subs } = await supabase
        .from("submissions")
        .select("assignment_id, status, submitted_at, teacher_feedback")
        .eq("student_id", userId)
        .order("submitted_at", { ascending: false });

      const subStatusMap: Record<string, any> = {};
      if (subs) {
        subs.forEach((s) => {
          if (!subStatusMap[s.assignment_id]) {
            subStatusMap[s.assignment_id] = {
              status: s.status,
              feedback: s.teacher_feedback,
            };
          }
        });
      }

      if (assigned) {
        const hwList: any[] = [];
        const testList: any[] = [];

        assigned.forEach((a: any) => {
          const assign = a.assignments;
          const subInfo = subStatusMap[assign.id];

          if (assign.type === "homework") {
            hwList.push(assign);
          } else {
            if (!subInfo || subInfo.status !== "approved") {
              testList.push({ ...assign, sub_info: subInfo });
            }
          }
        });

        setMyHomework(hwList);
        setMyTests(testList);
      }

      const { data: progress } = await supabase
        .from("submissions")
        .select(`id, submitted_at, assignments(title)`)
        .eq("student_id", userId)
        .eq("status", "approved");
      if (progress) setMyProgress(progress);
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

  const handleCreateAssignment = async () => {
    if (!title || selectedStudents.length === 0)
      return alert("Заполни название и выбери учеников!");
    setIsCreating(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: newAssignment, error } = await supabase
      .from("assignments")
      .insert({
        title,
        description,
        type: assignmentType,
        created_by: user?.id,
        file_url: assignmentFileUrl,
        filename: assignmentFileName,
      })
      .select()
      .single();

    if (error) {
      alert("Ошибка: " + error.message);
      setIsCreating(false);
      return;
    }

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
    setIsCreating(false);
    await loadData("teacher", user?.id || "");
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm("Удалить это задание? Оно исчезнет у учеников."))
      return;
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (!error)
      setTeacherAssignments((prev) => prev.filter((a) => a.id !== id));
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

  // ОТКЛОНЕНИЕ С КОММЕНТАРИЕМ
  const handleReject = async (submissionId: string) => {
    const reason = window.prompt(
      "Что нужно исправить? Напиши комментарий для ученика:",
    );
    if (reason === null) return; // Если нажали "Отмена"
    if (!reason.trim())
      return alert(
        "Пожалуйста, напиши комментарий, чтобы ученик понял, что не так.",
      );

    await supabase
      .from("submissions")
      .update({ status: "rejected", teacher_feedback: reason })
      .eq("id", submissionId);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) loadData("teacher", user.id);
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleAddToCatalog = async () => {
    if (!newTaskTitle || !newTaskStatement || !newTaskTopicId)
      return alert("Заполни все поля!");
    setIsAddingTask(true);

    let fileUrl = null;
    let fileName = null;

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

    const { error } = await supabase.from("tasks").insert({
      title: newTaskTitle,
      statement: newTaskStatement,
      topic_id: newTaskTopicId,
      type: "test",
      file_url: fileUrl,
      filename: fileName,
    });

    if (error) {
      alert("Ошибка: " + error.message);
    } else {
      alert("Задача добавлена!");
      setNewTaskTitle("");
      setNewTaskStatement("");
      setNewTaskTopicId("");
      setNewTaskFile(null);
      const { data } = await supabase
        .from("tasks")
        .select("*, topics(title)")
        .order("created_at", { ascending: false });
      if (data) setCatalogTasks(data);
    }
    setIsAddingTask(false);
  };

  const useTaskFromCatalog = (task: any) => {
    setTitle(task.title);
    setDescription(task.statement);
    setAssignmentFileUrl(task.file_url);
    setAssignmentFileName(task.filename);
    setActiveTab("create");
  };

  const filteredTasks =
    filterTopic === "all"
      ? catalogTasks
      : catalogTasks.filter((t) => t.topic_id === filterTopic);

  if (loading) return <div className="p-10 text-center">Загрузка...</div>;

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      {/* САЙДБАР */}
      <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col justify-between h-screen sticky top-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-wider mb-8">DevTrack</h1>
          <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xl text-gray-500 font-semibold capitalize mb-1">
              Профиль
            </p>
            <p className="text-lg font-medium text-gray-900 truncate">
              {fullName}
            </p>
          </div>
          <nav className="flex flex-col gap-2">
            {role === "teacher" ? (
              <>
                <button
                  onClick={() => setActiveTab("create")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "create" ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  Создать задание
                </button>
                <button
                  onClick={() => setActiveTab("check")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "check" ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  Проверка работ
                </button>
                <button
                  onClick={() => setActiveTab("catalog")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "catalog" ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  Каталог задач
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab("homework")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "homework" ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  Домашнее задание
                </button>
                <button
                  onClick={() => setActiveTab("test")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "test" ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  Невыполненные зачёты
                </button>
                <button
                  onClick={() => setActiveTab("progress")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "progress" ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  Выполненные зачёты
                </button>
                <button
                  onClick={() => setActiveTab("catalog")}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "catalog" ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  Каталог задач
                </button>
              </>
            )}
          </nav>
        </div>
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors font-medium text-center"
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* ОСНОВНАЯ ОБЛАСТЬ */}
      <main className="flex-1 p-10">
        <div className="max-w-4xl mx-auto">
          {/* --- ЖЕНЯ: СОЗДАНИЕ --- */}
          {role === "teacher" && activeTab === "create" && (
            <div className="flex flex-col gap-8">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <h3 className="text-xl font-bold mb-4">
                  Создать новое задание
                </h3>

                {assignmentFileUrl && (
                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex justify-between items-center">
                    <span className="text-sm text-purple-800">
                      📎 Прикреплен файл: {assignmentFileName}
                    </span>
                    <button
                      onClick={() => {
                        setAssignmentFileUrl(null);
                        setAssignmentFileName(null);
                      }}
                      className="text-red-500 text-sm hover:underline"
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
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Домашнее задание</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="test"
                        checked={assignmentType === "test"}
                        onChange={() => setAssignmentType("test")}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Зачёт</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Название"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                  <textarea
                    placeholder="Описание или текст задания"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 min-h-24"
                  />

                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      Прикрепить файл к заданию (необязательно)
                    </p>
                    <input
                      type="file"
                      onChange={handleAssignmentFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
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
                          onChange={() => toggleStudent(student.id)}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span>{student.full_name || "Без имени"}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCreateAssignment}
                  disabled={isCreating}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isCreating ? "Создание..." : "Создать и выдать"}
                </button>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4">
                  Ранее выданные задания
                </h3>
                {teacherAssignments.length === 0 ? (
                  <p className="text-gray-500">Ты пока не создавал заданий.</p>
                ) : (
                  <div className="grid gap-4">
                    {teacherAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-lg">{a.title}</p>
                          <p className="text-sm text-gray-500">
                            {a.type === "test" ? "Зачёт" : "ДЗ"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteAssignment(a.id)}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                        >
                          🗑 Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- ЖЕНЯ: ПРОВЕРКА РАБОТ --- */}
          {role === "teacher" && activeTab === "check" && (
            <div className="flex flex-col gap-8">
              {/* Сданные домашки */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-blue-900">
                  Сданные домашние задания
                </h3>
                {pendingHomeworks.length === 0 ? (
                  <p className="text-gray-500">
                    Нет новых домашек на проверку.
                  </p>
                ) : (
                  <div className="grid gap-4">
                    {pendingHomeworks.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-6 bg-white rounded-xl border border-blue-200 shadow-sm"
                      >
                        <p className="font-bold text-lg mb-1">
                          {sub.assignments?.title}
                        </p>
                        <p className="text-sm text-gray-500 mb-2">
                          Ученик: {sub.profiles?.full_name}
                        </p>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4 text-gray-700">
                          <span className="font-semibold block mb-1 text-sm text-gray-500">
                            Ответ ученика:
                          </span>
                          {sub.text_answer || "Пустой ответ"}
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(sub.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Одобрить
                          </button>
                          <button
                            onClick={() => handleReject(sub.id)}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            Отклонить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Сданные зачеты */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-purple-900">
                  Сданные зачёты (файлы)
                </h3>
                {pendingTests.length === 0 ? (
                  <p className="text-gray-500">
                    Нет новых зачётов на проверку.
                  </p>
                ) : (
                  <div className="grid gap-4">
                    {pendingTests.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-6 bg-white rounded-xl border border-purple-200 shadow-sm"
                      >
                        <p className="font-bold text-lg mb-1">
                          {sub.assignments?.title}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          Ученик: {sub.profiles?.full_name}
                        </p>

                        <div className="flex items-center gap-4 mb-4">
                          {sub.submission_files?.[0] && (
                            <a
                              href={`${sub.submission_files[0].file_url}?download=${sub.submission_files[0].filename}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:underline font-medium"
                            >
                              📎 Скачать файл (
                              {sub.submission_files[0].filename})
                            </a>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(sub.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Одобрить (Зачёт)
                          </button>
                          <button
                            onClick={() => handleReject(sub.id)}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
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

          {/* --- УЧЕНИК: ДОМАШКА --- */}
          {role === "student" && activeTab === "homework" && (
            <div>
              <h3 className="text-xl font-bold mb-4">Домашнее задание</h3>
              {myHomework.length === 0 ? (
                <p className="text-gray-500">Нет домашних заданий.</p>
              ) : (
                <div className="grid gap-4">
                  {myHomework.map((hw) => (
                    <div
                      key={hw.id}
                      className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm"
                    >
                      <h4 className="text-lg font-bold text-gray-900 mb-2">
                        {hw.title}
                      </h4>
                      <p className="text-gray-600 mb-4">{hw.description}</p>
                      <Link
                        href={`/dashboard/assignment/${hw.id}`}
                        className="inline-block px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        Приступить
                      </Link>
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
                <p className="text-gray-500">
                  Все зачёты сданы! Отличная работа.
                </p>
              ) : (
                <div className="grid gap-4">
                  {myTests.map((test) => (
                    <div
                      key={test.id}
                      className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm relative"
                    >
                      {/* Плашка, если отклонен */}
                      {test.sub_info?.status === "rejected" && (
                        <div className="absolute top-4 right-4 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200">
                          Отклонено
                        </div>
                      )}

                      <h4 className="text-lg font-bold text-gray-900 mb-2">
                        {test.title}
                      </h4>
                      <p className="text-gray-600 mb-4">{test.description}</p>

                      {test.sub_info?.status === "rejected" && (
                        <div className="text-red-600 text-sm mb-4 bg-red-50 p-4 rounded-lg border border-red-100">
                          <span className="font-bold block mb-1">
                            Комментарий:
                          </span>
                          {test.sub_info?.feedback ||
                            "Исправь ошибки и отправь зачёт заново."}
                        </div>
                      )}

                      <Link
                        href={`/dashboard/assignment/${test.id}`}
                        className="inline-block px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        {test.sub_info?.status === "rejected"
                          ? "Отправить заново"
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
                <p className="text-gray-500">Пока нет одобренных зачётов.</p>
              ) : (
                <div className="grid gap-4">
                  {myProgress.map((p) => (
                    <div
                      key={p.id}
                      className="p-6 bg-green-50 rounded-xl border border-green-200 flex justify-between items-center"
                    >
                      <div>
                        <h4 className="text-lg font-bold text-green-900">
                          {p.assignments?.title}
                        </h4>
                        <p className="text-sm text-green-700">Одобрено</p>
                      </div>
                      <span className="text-3xl">✅</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- КАТАЛОГ ЗАДАЧ --- */}
          {activeTab === "catalog" && (
            <div>
              <h3 className="text-xl font-bold mb-4">Каталог задач</h3>

              {role === "teacher" && (
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-8">
                  <h4 className="font-bold mb-4">Добавить задачу в каталог</h4>
                  <div className="flex flex-col gap-4 mb-4">
                    <select
                      value={newTaskTopicId}
                      onChange={(e) => setNewTaskTopicId(e.target.value)}
                      className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 bg-white"
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
                      className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 bg-white"
                    />
                    <textarea
                      placeholder="Текст задачи"
                      value={newTaskStatement}
                      onChange={(e) => setNewTaskStatement(e.target.value)}
                      className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 min-h-24 bg-white"
                    />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">
                        Прикрепить файл (необязательно)
                      </p>
                      <input
                        type="file"
                        onChange={(e) =>
                          setNewTaskFile(e.target.files?.[0] || null)
                        }
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 bg-white border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddToCatalog}
                    disabled={isAddingTask}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {isAddingTask ? "Сохранение..." : "Сохранить в каталог"}
                  </button>
                </div>
              )}

              <div className="mb-6 flex items-center gap-4">
                <label className="font-medium">Фильтр по заданию:</label>
                <select
                  value={filterTopic}
                  onChange={(e) => setFilterTopic(e.target.value)}
                  className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 bg-white min-w-50"
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
                {filteredTasks.length === 0 ? (
                  <p className="text-gray-500">В каталоге пока нет задач.</p>
                ) : (
                  filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-bold text-gray-900">
                          {task.title}
                        </h4>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                          {task.topics?.title || "Без темы"}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4 whitespace-pre-wrap">
                        {task.statement}
                      </p>

                      {task.file_url && (
                        <div className="mb-4">
                          <a
                            href={`${task.file_url}?download=${task.filename || "file"}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:underline text-sm font-medium"
                          >
                            📎 Скачать файл к задаче (
                            {task.filename || "Скачать"})
                          </a>
                        </div>
                      )}

                      {role === "teacher" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => useTaskFromCatalog(task)}
                            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
                          >
                            Использовать в задании
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition-colors font-medium"
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
