import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// User Queries
// ============================================================

export async function getCurrentUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) return profile;

    // If profile not yet created in table (e.g., OAuth direct login), build from metadata
    const newProfile = {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      role: user.user_metadata?.role || 'student',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      batch_name: user.user_metadata?.batch_name || 'General Batch',
    };

    await supabase.from('users').upsert(newProfile);
    return newProfile;
  } catch (err) {
    console.error('Error fetching/creating profile:', err);
    return {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
      role: user.user_metadata?.role || 'student',
      avatar_url: user.user_metadata?.avatar_url || null,
    };
  }
}

export async function getAllStudents(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ============================================================
// Course Queries
// ============================================================

export async function getCourses(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCourseById(supabase: SupabaseClient, courseId: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (error) throw error;
  return data;
}

export async function createCourse(
  supabase: SupabaseClient,
  course: { title: string; code: string; description?: string }
) {
  const { data, error } = await supabase
    .from('courses')
    .insert(course)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// Lecture Queries
// ============================================================

export async function getLectures(supabase: SupabaseClient, courseId?: string) {
  let query = supabase.from('lectures').select('*, courses(title, code)');

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query.order('order_index', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getLectureById(supabase: SupabaseClient, lectureId: string) {
  const { data, error } = await supabase
    .from('lectures')
    .select('*, courses(title, code)')
    .eq('id', lectureId)
    .single();

  if (error) throw error;
  return data;
}

export async function createLecture(
  supabase: SupabaseClient,
  lecture: {
    course_id: string;
    title: string;
    video_url?: string;
    notes_url?: string;
    order_index?: number;
  }
) {
  const { data, error } = await supabase
    .from('lectures')
    .insert(lecture)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLecture(
  supabase: SupabaseClient,
  lectureId: string,
  updates: Partial<{
    title: string;
    video_url: string;
    notes_url: string;
    order_index: number;
  }>
) {
  const { data, error } = await supabase
    .from('lectures')
    .update(updates)
    .eq('id', lectureId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLecture(supabase: SupabaseClient, lectureId: string) {
  const { error } = await supabase.from('lectures').delete().eq('id', lectureId);
  if (error) throw error;
  return true;
}

export async function reorderLectures(
  supabase: SupabaseClient,
  items: { id: string; order_index: number }[]
) {
  const promises = items.map((item) =>
    supabase.from('lectures').update({ order_index: item.order_index }).eq('id', item.id)
  );
  await Promise.all(promises);
  return true;
}

// ============================================================
// Assignment Queries
// ============================================================

export async function getAssignments(supabase: SupabaseClient, courseId?: string) {
  let query = supabase.from('assignments').select('*, courses(title, code)');

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query.order('due_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAssignmentById(supabase: SupabaseClient, assignmentId: string) {
  const { data, error } = await supabase
    .from('assignments')
    .select('*, courses(title, code)')
    .eq('id', assignmentId)
    .single();

  if (error) throw error;
  return data;
}

export async function createAssignment(
  supabase: SupabaseClient,
  assignment: {
    course_id: string;
    title: string;
    description: string;
    due_date: string;
    max_marks: number;
  }
) {
  const { data, error } = await supabase
    .from('assignments')
    .insert(assignment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAssignment(supabase: SupabaseClient, assignmentId: string) {
  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
  if (error) throw error;
  return true;
}

// ============================================================
// Submission & Grading Queries
// ============================================================

// Helper to extract checked_copy_url and clean feedback from raw string
export function parseSubmissionFeedback(raw: any) {
  if (!raw) return raw;
  let feedbackText = raw.feedback || '';
  let checkedCopyUrl: string | null = null;

  if (typeof feedbackText === 'string') {
    const match = feedbackText.match(/\[CHECKED_COPY:(https?:\/\/[^\]]+)\]/);
    if (match) {
      checkedCopyUrl = match[1];
      feedbackText = feedbackText.replace(/\[CHECKED_COPY:(https?:\/\/[^\]]+)\]/, '').trim();
    } else if (feedbackText.trim().startsWith('{') && feedbackText.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(feedbackText);
        feedbackText = parsed.text || parsed.feedback || '';
        checkedCopyUrl = parsed.checked_copy_url || null;
      } catch {}
    }
  }

  return {
    ...raw,
    feedback: feedbackText,
    checked_copy_url: checkedCopyUrl || raw.checked_copy_url || null,
  };
}

export async function getMySubmissions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*, assignments(title, max_marks, due_date, courses(title, code))')
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(parseSubmissionFeedback);
}

export async function getSubmissionForAssignment(
  supabase: SupabaseClient,
  assignmentId: string,
  studentId: string
) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) throw error;
  return data ? parseSubmissionFeedback(data) : null;
}

export async function createSubmission(
  supabase: SupabaseClient,
  submission: {
    assignment_id: string;
    student_id: string;
    file_url: string;
    file_name: string;
    file_type: string;
  }
) {
  const { data, error } = await supabase
    .from('submissions')
    .insert(submission)
    .select()
    .single();

  if (error) throw error;
  return parseSubmissionFeedback(data);
}

export async function getAllSubmissions(
  supabase: SupabaseClient,
  filterCourseId?: string,
  filterStatus?: string
) {
  let query = supabase.from('submissions').select(
    `
      id,
      assignment_id,
      student_id,
      file_url,
      file_name,
      file_type,
      marks_obtained,
      feedback,
      status,
      submitted_at,
      assignments:assignment_id (
        id,
        title,
        max_marks,
        due_date,
        courses:course_id (
          id,
          title,
          code
        )
      ),
      users:student_id (
        id,
        full_name,
        email,
        avatar_url
      )
    `
  );

  if (filterStatus && filterStatus !== 'all') {
    query = query.eq('status', filterStatus);
  }

  const { data, error } = await query.order('submitted_at', { ascending: false });
  if (error) throw error;

  let results = data ?? [];
  if (filterCourseId && filterCourseId !== 'all') {
    results = results.filter((item: any) => item.assignments?.courses?.id === filterCourseId);
  }

  return results.map(parseSubmissionFeedback);
}

export async function getSubmissionById(supabase: SupabaseClient, submissionId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select(
      `
        id,
        assignment_id,
        student_id,
        file_url,
        file_name,
        file_type,
        marks_obtained,
        feedback,
        status,
        submitted_at,
        assignments:assignment_id (
          id,
          title,
          description,
          max_marks,
          due_date,
          courses:course_id (
            id,
            title,
            code
          )
        ),
        users:student_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `
    )
    .eq('id', submissionId)
    .single();

  if (error) throw error;
  return parseSubmissionFeedback(data);
}

export async function uploadCheckedCopy(
  supabase: SupabaseClient,
  submissionId: string,
  blob: Blob
) {
  const filePath = `checked-copies/${submissionId}_${Date.now()}.png`;

  const { data, error } = await supabase.storage
    .from('course-materials')
    .upload(filePath, blob, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('course-materials').getPublicUrl(data.path);

  return publicUrl;
}

export async function gradeSubmission(
  supabase: SupabaseClient,
  submissionId: string,
  gradeData: {
    marks_obtained: number | null;
    feedback: string;
    status: string;
    checked_copy_url?: string | null;
  }
) {
  let combinedFeedback = gradeData.feedback || '';
  if (gradeData.checked_copy_url) {
    combinedFeedback = `${combinedFeedback}\n\n[CHECKED_COPY:${gradeData.checked_copy_url}]`.trim();
  }

  const { data, error } = await supabase
    .from('submissions')
    .update({
      marks_obtained: gradeData.marks_obtained,
      feedback: combinedFeedback,
      status: gradeData.status,
    })
    .eq('id', submissionId)
    .select()
    .single();

  if (error) throw error;
  return parseSubmissionFeedback(data);
}

// ============================================================
// Quiz Engine Queries
// ============================================================

export async function getQuizzes(supabase: SupabaseClient, courseId?: string) {
  let query = supabase.from('quizzes').select(
    `
      id,
      course_id,
      title,
      description,
      time_limit_minutes,
      created_at,
      courses:course_id (
        id,
        title,
        code
      ),
      quiz_questions (
        id,
        marks
      )
    `
  );

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  return (
    data?.map((quiz: any) => ({
      ...quiz,
      questions_count: quiz.quiz_questions?.length ?? 0,
      total_marks:
        quiz.quiz_questions?.reduce((sum: number, q: any) => sum + (q.marks ?? 1), 0) ?? 0,
    })) ?? []
  );
}

export async function getQuizWithQuestions(supabase: SupabaseClient, quizId: string) {
  const { data, error } = await supabase
    .from('quizzes')
    .select(
      `
        *,
        courses:course_id (
          id,
          title,
          code
        ),
        quiz_questions (
          id,
          question_text,
          options,
          correct_option_index,
          marks
        )
      `
    )
    .eq('id', quizId)
    .single();

  if (error) throw error;
  return data;
}

export async function createQuizWithQuestions(
  supabase: SupabaseClient,
  quiz: {
    course_id: string;
    title: string;
    description?: string;
    time_limit_minutes?: number;
  },
  questions: {
    question_text: string;
    options: string[];
    correct_option_index: number;
    marks: number;
  }[]
) {
  // 1. Insert Quiz
  const { data: quizData, error: quizError } = await supabase
    .from('quizzes')
    .insert(quiz)
    .select()
    .single();

  if (quizError) throw quizError;

  // 2. Insert Questions
  if (questions.length > 0) {
    const questionsToInsert = questions.map((q) => ({
      quiz_id: quizData.id,
      question_text: q.question_text,
      options: q.options,
      correct_option_index: q.correct_option_index,
      marks: q.marks,
    }));

    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questionsToInsert);

    if (questionsError) throw questionsError;
  }

  return quizData;
}

export async function deleteQuiz(supabase: SupabaseClient, quizId: string) {
  const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
  if (error) throw error;
  return true;
}

// ============================================================
// Course Materials Queries
// ============================================================

export async function getCourseMaterials(supabase: SupabaseClient, courseId?: string) {
  let query = supabase.from('course_materials').select('*, courses(id, title, code)');

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query.order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadCourseMaterial(
  supabase: SupabaseClient,
  courseId: string,
  file: File,
  title: string
) {
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${courseId}/${Date.now()}_${sanitizedFileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('course-materials')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('course-materials').getPublicUrl(uploadData.path);

  const fileType = file.type || file.name.split('.').pop() || 'unknown';

  const { data: materialData, error: insertError } = await supabase
    .from('course_materials')
    .insert({
      course_id: courseId,
      title: title.trim() || file.name,
      file_url: publicUrl,
      file_type: fileType,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return materialData;
}

export async function deleteCourseMaterial(
  supabase: SupabaseClient,
  materialId: string,
  filePath?: string
) {
  if (filePath) {
    await supabase.storage.from('course-materials').remove([filePath]);
  }
  const { error } = await supabase.from('course_materials').delete().eq('id', materialId);
  if (error) throw error;
  return true;
}

// ============================================================
// Attendance Queries
// ============================================================

export async function getAttendanceByDate(
  supabase: SupabaseClient,
  courseId: string,
  date: string
) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, users(id, full_name, email, avatar_url)')
    .eq('course_id', courseId)
    .eq('date', date);

  if (error) throw error;
  return data ?? [];
}

export async function saveAttendanceBatch(
  supabase: SupabaseClient,
  records: {
    course_id: string;
    student_id: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    remarks?: string;
  }[]
) {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(records, {
      onConflict: 'course_id,student_id,date',
    })
    .select();

  if (error) throw error;
  return data;
}

export async function getStudentAttendanceSummary(
  supabase: SupabaseClient,
  studentId: string
) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, courses(title, code)')
    .eq('student_id', studentId)
    .order('date', { ascending: false });

  if (error) throw error;

  const records = data ?? [];
  const total = records.length;
  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const percentage = total > 0 ? Math.round(((presentCount + lateCount * 0.5) / total) * 100) : 100;

  return {
    records,
    total,
    presentCount,
    absentCount,
    lateCount,
    percentage,
  };
}

export async function getAttendanceOverview(supabase: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('attendance')
    .select('id, status, date, course_id')
    .eq('date', today);

  if (error) throw error;
  return data ?? [];
}

// ============================================================
// Announcement Queries
// ============================================================

export async function getAnnouncements(supabase: SupabaseClient, courseId?: string) {
  let query = supabase.from('announcements').select('*, courses(title, code)');

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query.order('posted_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAnnouncement(
  supabase: SupabaseClient,
  announcement: {
    course_id?: string | null;
    title: string;
    content: string;
  }
) {
  const payload = {
    course_id: announcement.course_id ? announcement.course_id : null,
    title: announcement.title,
    content: announcement.content,
  };

  const { data, error } = await supabase
    .from('announcements')
    .insert(payload)
    .select('*, courses(title, code)')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================
// File Upload Helper (Student Submissions)
// ============================================================

export async function uploadSubmissionFile(
  supabase: SupabaseClient,
  studentId: string,
  assignmentId: string,
  file: File
) {
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${studentId}/${assignmentId}/${Date.now()}_${sanitizedFileName}`;

  const { data, error } = await supabase.storage
    .from('assignment-submissions')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('assignment-submissions').getPublicUrl(data.path);

  return { path: data.path, publicUrl };
}

// ============================================================
// Teacher Dashboard Stats
// ============================================================

export async function getTeacherDashboardStats(supabase: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0];

  const [
    coursesRes,
    quizzesRes,
    materialsRes,
    submissionsRes,
    pendingSubmissionsRes,
    todayAttendanceRes,
  ] = await Promise.all([
    supabase.from('courses').select('id', { count: 'exact', head: true }),
    supabase.from('quizzes').select('id', { count: 'exact', head: true }),
    supabase.from('course_materials').select('id', { count: 'exact', head: true }),
    supabase.from('submissions').select('id', { count: 'exact', head: true }),
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .or('status.eq.submitted,status.eq.pending,status.is.null'),
    supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('date', today),
  ]);

  return {
    totalCourses: coursesRes.count ?? 0,
    totalQuizzes: quizzesRes.count ?? 0,
    totalMaterials: materialsRes.count ?? 0,
    totalSubmissions: submissionsRes.count ?? 0,
    pendingToGrade: pendingSubmissionsRes.count ?? 0,
    todayAttendanceCount: todayAttendanceRes.count ?? 0,
  };
}

// ============================================================
// Student Dashboard Stats
// ============================================================

export async function getDashboardStats(supabase: SupabaseClient, studentId: string) {
  const [lecturesRes, assignmentsRes, submissionsRes, materialsRes] = await Promise.all([
    supabase.from('lectures').select('id', { count: 'exact' }),
    supabase.from('assignments').select('id', { count: 'exact' }),
    supabase
      .from('submissions')
      .select('marks_obtained, status, assignments(max_marks)')
      .eq('student_id', studentId),
    supabase.from('course_materials').select('id', { count: 'exact' }),
  ]);

  const totalLectures = lecturesRes.count ?? 0;
  const totalAssignments = assignmentsRes.count ?? 0;
  const totalMaterials = materialsRes.count ?? 0;
  const submissions = submissionsRes.data ?? [];
  const submittedCount = submissions.length;
  const pendingAssignments = totalAssignments - submittedCount;

  const gradedSubmissions = submissions.filter(
    (s) => s.status === 'graded' && s.marks_obtained !== null
  );
  const averageScore =
    gradedSubmissions.length > 0
      ? Math.round(
          gradedSubmissions.reduce((sum, s) => sum + (s.marks_obtained ?? 0), 0) /
            gradedSubmissions.length
        )
      : 0;

  return {
    totalLectures,
    totalAssignments,
    totalMaterials,
    pendingAssignments: Math.max(0, pendingAssignments),
    submittedCount,
    averageScore,
    gradedCount: gradedSubmissions.length,
  };
}
