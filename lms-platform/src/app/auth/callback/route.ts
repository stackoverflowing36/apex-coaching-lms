import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/student/dashboard';

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      const user = data.user;
      
      // Check if user profile exists in database
      const { data: profile } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        const role = user.user_metadata?.role || 'student';
        const studentName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Student';
        await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          full_name: studentName,
          role: role,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        });

        if (role === 'student') {
          try {
            await supabase.from('notifications').insert({
              type: 'student_signup',
              title: 'New Student Registered (Google)',
              message: `${studentName} registered via Google and joined the student portal`,
              data: {
                student_id: user.id,
                student_name: studentName,
                student_email: user.email,
              },
              is_read: false,
              created_at: new Date().toISOString(),
            });
          } catch (notifErr) {
            console.warn('OAuth notification failed:', notifErr);
          }
        }

        if (next === '/dashboard' || next === '/') {
          next = role === 'teacher' ? '/teacher/dashboard' : '/onboarding';
        }
      } else if (next === '/dashboard' || next === '/') {
        next = profile.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
      }

      const redirectUrl = isLocalEnv 
        ? `${origin}${next}`
        : forwardedHost 
          ? `https://${forwardedHost}${next}` 
          : `${origin}${next}`;

      return NextResponse.redirect(redirectUrl);
    }
  }

  // Return to login with error query param if exchange fails
  return NextResponse.redirect(`${origin}/login?error=oauth_error`);
}
