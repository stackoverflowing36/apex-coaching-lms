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

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gnoaegjqazibdchorpuo.supabase.co';

  // Ensure file_url has a fully qualified URL to avoid 404s when clicked
  let resolvedFileUrl = raw.file_url || '';
  if (resolvedFileUrl && !resolvedFileUrl.startsWith('http') && !resolvedFileUrl.startsWith('data:')) {
    resolvedFileUrl = `${supabaseUrl}/storage/v1/object/public/course-materials/${resolvedFileUrl}`;
  }

  // Ensure checked_copy_url has a fully qualified URL
  let resolvedCheckedUrl = checkedCopyUrl || raw.checked_copy_url || raw.checkedCopyUrl || null;
  if (resolvedCheckedUrl && !resolvedCheckedUrl.startsWith('http') && !resolvedCheckedUrl.startsWith('data:')) {
    resolvedCheckedUrl = `${supabaseUrl}/storage/v1/object/public/course-materials/${resolvedCheckedUrl}`;
  }

  return {
    ...raw,
    file_url: resolvedFileUrl || raw.file_url,
    feedback: feedbackText,
    checked_copy_url: resolvedCheckedUrl,
    checkedCopyUrl: resolvedCheckedUrl,
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
  // Check if an existing submission exists (e.g. records with status needs_resubmission)
  const { data: existing } = await supabase
    .from('submissions')
    .select('id, status')
    .eq('assignment_id', submission.assignment_id)
    .eq('student_id', submission.student_id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('submissions')
      .update({
        file_url: submission.file_url,
        file_name: submission.file_name,
        file_type: submission.file_type,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return parseSubmissionFeedback(data);
  }

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

export async function fetchAssignmentSubmissions(supabase: SupabaseClient, assignmentId: string) {
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
        users:student_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `
    )
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(parseSubmissionFeedback);
}

export async function uploadCheckedCopy(
  supabase: SupabaseClient,
  submissionId: string,
  blob: Blob,
  studentId?: string,
  assignmentId?: string
) {
  // Determine authenticated teacher/user ID or folder to comply with storage RLS
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id || studentId || 'evaluator';
  const filePath = `${currentUserId}/${assignmentId || 'checked-copies'}/${submissionId}_${Date.now()}.png`;

  try {
    const { data, error } = await supabase.storage
      .from('course-materials')
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      console.warn('User folder upload failed, attempting fallback path:', error.message);
      const fallbackPath = `checked_${submissionId}_${Date.now()}.png`;
      const { data: fbData, error: fbError } = await supabase.storage
        .from('course-materials')
        .upload(fallbackPath, blob, {
          contentType: 'image/png',
          upsert: true,
        });

      if (fbError) throw fbError;
      const {
        data: { publicUrl },
      } = supabase.storage.from('course-materials').getPublicUrl(fbData.path);
      return publicUrl;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('course-materials').getPublicUrl(data.path);

    return publicUrl;
  } catch (err: any) {
    console.error('All storage upload attempts failed:', err);
    throw err;
  }
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

  const finalStatus = gradeData.status || 'graded';

  const { data, error } = await supabase
    .from('submissions')
    .update({
      marks_obtained: gradeData.marks_obtained,
      feedback: combinedFeedback,
      status: finalStatus,
    })
    .eq('id', submissionId)
    .select();

  if (error) throw error;
  return data && data[0] ? parseSubmissionFeedback(data[0]) : { id: submissionId, ...gradeData };
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

export interface QuizAttemptRecord {
  id?: string;
  quiz_id: string;
  student_id: string;
  score: number;
  total_marks: number;
  answers: Record<string, number>;
  attempt_number: number;
  completed_at?: string;
  created_at?: string;
}

// Local storage helper for resilient fallback
function getLocalQuizAttempts(quizId: string, studentId: string): QuizAttemptRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`lms_quiz_attempts_${quizId}_${studentId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalQuizAttempt(attempt: QuizAttemptRecord): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = `lms_quiz_attempts_${attempt.quiz_id}_${attempt.student_id}`;
    const existing = getLocalQuizAttempts(attempt.quiz_id, attempt.student_id);
    const exists = existing.some(
      (a) => (a.id && a.id === attempt.id) || a.attempt_number === attempt.attempt_number
    );
    const updated = exists
      ? existing.map((a) =>
          (a.id && a.id === attempt.id) || a.attempt_number === attempt.attempt_number ? attempt : a
        )
      : [...existing, attempt];
    localStorage.setItem(key, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to save local quiz attempt:', err);
    return false;
  }
}

export async function getQuizAttempts(
  supabase: SupabaseClient,
  quizId: string,
  studentId: string
): Promise<QuizAttemptRecord[]> {
  const localAttempts = getLocalQuizAttempts(quizId, studentId);
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('student_id', studentId)
      .order('attempt_number', { ascending: true });

    if (error) {
      console.warn('Supabase getQuizAttempts error, returning local attempts:', error.message);
      return localAttempts;
    }

    const dbAttempts = data || [];
    if (localAttempts.length === 0) {
      return dbAttempts;
    }

    // Merge and deduplicate database and local attempts
    const attemptsMap = new Map<string | number, QuizAttemptRecord>();
    dbAttempts.forEach((att) => {
      const key = att.id || att.attempt_number;
      attemptsMap.set(key, att);
    });

    localAttempts.forEach((att) => {
      const key = att.id || att.attempt_number;
      if (!attemptsMap.has(key)) {
        attemptsMap.set(key, att);
      }
    });

    const merged = Array.from(attemptsMap.values());
    merged.sort((a, b) => (a.attempt_number || 0) - (b.attempt_number || 0));
    return merged;
  } catch (err) {
    console.warn('Exception in getQuizAttempts, returning local attempts:', err);
    return localAttempts;
  }
}

export async function getStudentQuizAttempts(
  supabase: SupabaseClient,
  studentId: string
): Promise<QuizAttemptRecord[]> {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('student_id', studentId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.warn('Supabase getStudentQuizAttempts error:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function submitQuizAttempt(
  supabase: SupabaseClient,
  payload: {
    quiz_id: string;
    student_id: string;
    score: number;
    total_marks: number;
    answers: Record<string, number>;
    allow_reattempt?: boolean;
  }
): Promise<{
  attempt: QuizAttemptRecord;
  officialScore: number;
  firstAttemptScore: number;
  isFirstAttempt: boolean;
}> {
  const { quiz_id, student_id, score, total_marks, answers } = payload;

  // 1. Fetch prior attempts to determine attempt order
  const existingAttempts = await getQuizAttempts(supabase, quiz_id, student_id);
  const isFirstAttempt = existingAttempts.length === 0;
  const nextAttemptNumber = isFirstAttempt ? 1 : existingAttempts.length + 1;

  // Rule: Save the score of the 1st attempt for multiple attempts option selected!
  // The first attempt's score is the permanent official score.
  const firstAttemptScore = isFirstAttempt ? score : existingAttempts[0].score;
  const officialScore = firstAttemptScore;

  const newAttempt: QuizAttemptRecord = {
    quiz_id,
    student_id,
    score,
    total_marks,
    answers,
    attempt_number: nextAttemptNumber,
    completed_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert(newAttempt)
      .select()
      .single();

    if (error) {
      console.warn('Supabase quiz_attempts insert failed, attempting local storage fallback:', error.message);
      const savedLocally = saveLocalQuizAttempt(newAttempt);
      if (!savedLocally) {
        throw new Error(
          `Failed to persist quiz attempt: database error (${error.message}) and local storage failed.`
        );
      }
      return {
        attempt: newAttempt,
        officialScore,
        firstAttemptScore,
        isFirstAttempt,
      };
    }

    saveLocalQuizAttempt(data);
    return {
      attempt: data,
      officialScore,
      firstAttemptScore,
      isFirstAttempt,
    };
  } catch (err: any) {
    console.warn('Network / DB exception in submitQuizAttempt, attempting local storage fallback:', err);
    const savedLocally = saveLocalQuizAttempt(newAttempt);
    if (!savedLocally) {
      throw new Error(
        `Failed to persist quiz attempt: ${err?.message || 'persistence failed on both database and local storage'}`
      );
    }
    return {
      attempt: newAttempt,
      officialScore,
      firstAttemptScore,
      isFirstAttempt,
    };
  }
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
    .from('course-materials')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('course-materials').getPublicUrl(data.path);

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

// ============================================================
// Notification Queries (Faculty alerts for signups & batch joins)
// ============================================================

export interface NotificationItem {
  id: string;
  user_id?: string | null;
  type: 'student_signup' | 'batch_enrolled' | 'submission_created' | string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(supabase: SupabaseClient, limit = 20): Promise<NotificationItem[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Could not fetch notifications:', error.message);
      return [];
    }
    return (data ?? []) as NotificationItem[];
  } catch (err) {
    console.warn('Notification fetch error:', err);
    return [];
  }
}

export async function createNotification(
  supabase: SupabaseClient,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
    user_id?: string | null;
  }
): Promise<NotificationItem | null> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        ...notification,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn('Failed to insert notification:', error.message);
      return null;
    }
    return data as NotificationItem;
  } catch (err) {
    console.warn('Notification insert error:', err);
    return null;
  }
}

export async function markNotificationsAsRead(supabase: SupabaseClient, ids?: string[]) {
  try {
    let query = supabase.from('notifications').update({ is_read: true });
    if (ids && ids.length > 0) {
      query = query.in('id', ids);
    } else {
      query = query.eq('is_read', false);
    }
    const { error } = await query;
    if (error) console.warn('Failed to mark notifications as read:', error.message);
    return true;
  } catch {
    return false;
  }
}

export async function deleteNotification(supabase: SupabaseClient, id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    if (error) {
      console.warn('Failed to delete notification:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error deleting notification:', err);
    return false;
  }
}

export async function getStudentNotifications(
  supabase: SupabaseClient,
  studentId?: string,
  limit = 25
): Promise<NotificationItem[]> {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (studentId) {
      query = query.or(`user_id.eq.${studentId},user_id.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Could not fetch student notifications:', error.message);
      return [];
    }
    return (data ?? []) as NotificationItem[];
  } catch (err) {
    console.warn('Student notification fetch error:', err);
    return [];
  }
}

export async function deleteSubmission(
  supabase: SupabaseClient,
  submissionId: string,
  fileUrl?: string
): Promise<boolean> {
  // If file exists in storage, attempt cleanup
  if (fileUrl && !fileUrl.startsWith('data:')) {
    try {
      let pathToRemove = fileUrl;
      if (fileUrl.includes('course-materials/')) {
        pathToRemove = fileUrl.split('course-materials/')[1];
      }
      if (pathToRemove && !pathToRemove.startsWith('http')) {
        await supabase.storage.from('course-materials').remove([pathToRemove]);
      }
    } catch (sErr) {
      console.warn('Storage file cleanup failed during submission delete:', sErr);
    }
  }

  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', submissionId);

  if (error) throw error;
  return true;
}

export async function uploadLectureVideo(
  supabase: SupabaseClient,
  courseId: string,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${courseId}/lectures/${Date.now()}_${sanitizedFileName}`;

  const { data, error } = await supabase.storage
    .from('course-materials')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('course-materials').getPublicUrl(data.path);

  return { path: data.path, publicUrl };
}


