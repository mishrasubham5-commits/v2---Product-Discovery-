import React, { useState, useEffect, useMemo } from "react";
import { 
  Award, 
  Flame, 
  Sparkles, 
  BookOpen, 
  Lock, 
  ChevronRight, 
  TrendingUp,
  LogOut,
  RefreshCw,
  CheckCircle
} from "lucide-react";
import { CURRICULUM, MOCK_LEADERBOARD } from "./data/curriculum";
import { UserProfile, SubmissionItem, CustomLeaderboardEntry } from "./types";
import { isSupabaseConfigured, supabase } from "./supabase";
import AntigravityLanding from "./components/AntigravityLanding";

export default function App() {
  // --- AUTH & PROFILE STATES ---
  const [sessionUser, setSessionUser] = useState<{ email: string; name: string } | null>(() => {
    const saved = localStorage.getItem("discovery_session_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("discovery_profile");
    return saved ? JSON.parse(saved) : null;
  });

  const [submissions, setSubmissions] = useState<SubmissionItem[]>(() => {
    const saved = localStorage.getItem("discovery_submissions");
    return saved ? JSON.parse(saved) : [];
  });

  const [dbProfiles, setDbProfiles] = useState<UserProfile[]>([]);

  // Track ALL logged-in users for leaderboard
  const [localUsers, setLocalUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem("discovery_local_users");
    return saved ? JSON.parse(saved) : [];
  });

  // Onboarding/Login loading states
  const [authLoading, setAuthLoading] = useState(false);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [activeTab, setActiveTab] = useState<"curriculum" | "leaderboard">("curriculum");
  const [selectedDayNum, setSelectedDayNum] = useState(1);
  const [submissionText, setSubmissionText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Settings
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem("discovery_gemini_api_key") || import.meta.env.VITE_GEMINI_API_KEY || "";
  });

  // --- SYNC STATE TO LOCAL STORAGE ---
  useEffect(() => {
    if (sessionUser) {
      localStorage.setItem("discovery_session_user", JSON.stringify(sessionUser));
    } else {
      localStorage.removeItem("discovery_session_user");
    }
  }, [sessionUser]);

  useEffect(() => {
    if (profile) {
      localStorage.setItem("discovery_profile", JSON.stringify(profile));
    } else {
      localStorage.removeItem("discovery_profile");
    }
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("discovery_submissions", JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem("discovery_gemini_api_key", geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem("discovery_local_users", JSON.stringify(localUsers));
  }, [localUsers]);

  // --- PARSE CALLBACK REDIRECT / SIMULATED URL ON CLIENT START ---
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");
    const isCallback = window.location.pathname.includes("/login/callback") || !!token;

    if (isCallback) {
      const temp = localStorage.getItem("discovery_temp_onboard");
      let name = "Product Manager";
      let email = "pm@example.com";

      if (temp) {
        try {
          const parsed = JSON.parse(temp);
          name = parsed.name || name;
          email = parsed.email || email;
        } catch (e) {
          console.error("Failed to parse local onboarding items:", e);
        }
      } else if (token) {
        const cleanToken = token.replace("-active", "");
        email = decodeURIComponent(cleanToken);
        name = email.split("@")[0] || "Product Manager";
      }

      const mockProfile: UserProfile = {
        id: "mock_user_" + Date.now(),
        name,
        email,
        streak: 1,
        totalScore: 0,
        daysCompleted: 0,
        lastSubmissionDate: null,
        joinedAt: new Date().toISOString()
      };

      setSessionUser({ email, name });
      setProfile(mockProfile);
      setIsMagicLinkSent(false);
      localStorage.removeItem("discovery_temp_onboard");

      // Reset URL path
      window.history.replaceState({}, document.title, window.location.origin);
    }
  }, []);

  // --- SUPABASE DATA FETCH & SYNC ---
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Check active Supabase auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        const email = session.user.email || "";
        const name = session.user.user_metadata?.full_name || "Product Manager";
        setSessionUser({ email, name });
        syncUserProfile(session.user.id, name, email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && session.user) {
        const email = session.user.email || "";
        const name = session.user.user_metadata?.full_name || "Product Manager";
        setSessionUser({ email, name });
        syncUserProfile(session.user.id, name, email);
      } else if (event === "SIGNED_OUT") {
        handleSignOutCleanup();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch Supabase leaderboard profiles
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !sessionUser) return;

    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("total_score", { ascending: false });

      if (!error && data) {
        setDbProfiles(
          data.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            streak: p.current_streak,
            totalScore: p.total_score,
            daysCompleted: p.days_completed,
            lastSubmissionDate: p.last_submission_date,
            joinedAt: p.created_at
          }))
        );
      }
    };

    fetchProfiles();
  }, [sessionUser, profile]);

  const syncUserProfile = async (userId: string, name: string, email: string) => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      // Create profile if missing
      const newProfile = {
        id: userId,
        name,
        email,
        current_streak: 1,
        total_score: 0,
        days_completed: 0,
        last_submission_date: null
      };

      const { data: insertedData } = await supabase
        .from("profiles")
        .insert([newProfile])
        .select()
        .single();

      if (insertedData) {
        const userProfile: UserProfile = {
          id: insertedData.id,
          name: insertedData.name,
          email: insertedData.email,
          streak: insertedData.current_streak,
          totalScore: insertedData.total_score,
          daysCompleted: insertedData.days_completed,
          lastSubmissionDate: insertedData.last_submission_date,
          joinedAt: insertedData.created_at
        };
        setProfile(userProfile);
        
        // Also add to local leaderboard
        setLocalUsers(prev => {
          const filtered = prev.filter(u => u.email !== email);
          return [...filtered, userProfile];
        });
      }
    } else {
      // Profile exists, load it
      const userProfile: UserProfile = {
        id: data.id,
        name: data.name,
        email: data.email,
        streak: data.current_streak,
        totalScore: data.total_score,
        daysCompleted: data.days_completed,
        lastSubmissionDate: data.last_submission_date,
        joinedAt: data.created_at
      };
      setProfile(userProfile);

      // Also add to local leaderboard
      setLocalUsers(prev => {
        const filtered = prev.filter(u => u.email !== email);
        return [...filtered, userProfile];
      });

      // Load submissions
      const { data: subs } = await supabase
        .from("submissions")
        .select("*")
        .eq("user_id", userId);

      if (subs) {
        setSubmissions(
          subs.map((s) => ({
            id: s.id,
            userId: s.user_id,
            day: s.day,
            title: s.title,
            submittedAt: s.submitted_at,
            submissionText: s.submission_text,
            aiScore: s.ai_score,
            aiCritique: s.ai_critique,
            dailyScore: s.daily_score
          }))
        );
      }
    }
  };

  const handleSignOutCleanup = () => {
    setSessionUser(null);
    setProfile(null);
    setSubmissions([]);
    setIsMagicLinkSent(false);
    localStorage.removeItem("discovery_session_user");
    localStorage.removeItem("discovery_profile");
    localStorage.removeItem("discovery_submissions");
  };

  // --- ACTIONS ---
  const handleLoginSubmit = async (name: string, email: string) => {
    setAuthLoading(true);
    setErrorMessage(null);

    // Always preserve onboarding credentials to support direct sandbox fallback link
    localStorage.setItem("discovery_temp_onboard", JSON.stringify({ name, email }));

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin
          }
        });
        if (error) {
          setErrorMessage(error.message);
        }
        setIsMagicLinkSent(true);
      } catch (err: any) {
        setErrorMessage(err.message || "Authentication failed.");
        setIsMagicLinkSent(true);
      } finally {
        setAuthLoading(false);
      }
    } else {
      // Simulated Mode - Make it truly instant and smooth!
      setIsMagicLinkSent(true);
      setAuthLoading(false);
    }
  };

  const simulateMagicLinkClick = (fallbackName?: string, fallbackEmail?: string) => {
    let name = fallbackName || "";
    let email = fallbackEmail || "";

    if (!name || !email) {
      const temp = localStorage.getItem("discovery_temp_onboard");
      if (temp) {
        try {
          const parsed = JSON.parse(temp);
          name = name || parsed.name;
          email = email || parsed.email;
        } catch (e) {
          console.error("Failed to parse temp credentials:", e);
        }
      }
    }

    if (!name) name = "Product Manager";
    if (!email) email = "pm@example.com";

    const userId = "local_user_" + Date.now();
    const mockProfile: UserProfile = {
      id: userId,
      name,
      email,
      streak: 1,
      totalScore: 0,
      daysCompleted: 0,
      lastSubmissionDate: null,
      joinedAt: new Date().toISOString()
    };

    // Add user to local leaderboard tracking
    setLocalUsers(prev => {
      // Remove existing entry for this email if exists (in case of re-login)
      const filtered = prev.filter(u => u.email !== email);
      return [...filtered, mockProfile];
    });

    setSessionUser({ email, name });
    setProfile(mockProfile);
    setIsMagicLinkSent(false);
    localStorage.removeItem("discovery_temp_onboard");
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      handleSignOutCleanup();
    }
  };

  // --- AI EVALUATION WORKSPACE ---
  const getAISubmissionReview = async () => {
    if (!profile) return;
    setAiLoading(true);
    setErrorMessage(null);

    const activeDay = CURRICULUM.find((d) => d.day === selectedDayNum) || CURRICULUM[0];
    const userText = submissionText.trim();

    // 1. Calculate the streak logic
    let calculatedStreak = profile.streak;
    if (profile.lastSubmissionDate) {
      const lastDate = new Date(profile.lastSubmissionDate);
      const today = new Date();

      const lastMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const diffTime = todayMidnight.getTime() - lastMidnight.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        calculatedStreak += 1;
      } else if (diffDays > 1) {
        calculatedStreak = 1; // Missed day logic: reset streak to 1
      }
    } else {
      calculatedStreak = 1;
    }

    let aiScore = 7;
    let aiCritique = "";

    if (geminiApiKey) {
      try {
        const prompt = `You are an expert Product Discovery Mentor helping a candidate prepare for Product Manager interviews.

## CONTEXT
- This is Day ${activeDay.day} of a 21-Day Product Discovery Challenge
- Topic: ${activeDay.title}
- Assignment: ${activeDay.assignmentPrompt}
- User's Submission: ${userText}

## YOUR TASK
Act as a senior PM who conducts product interviews. Provide a comprehensive review that:
1. Identifies STRENGTHS in their answer (what they got right)
2. Identifies AREAS FOR IMPROVEMENT (what's missing or could be better)
3. Provides a SAMPLE EXCELLENT ANSWER they could use as a reference
4. Gives 2-3 SPECIFIC TIPS for interview success on this topic
5. Rates their PM thinking on a scale of 1-10

## IMPORTANT
- Be specific and constructive, not generic
- Connect your feedback to actual PM interview scenarios
- Use examples from top tech companies (Google, Amazon, Meta, Netflix, Airbnb, etc.)
- Focus on structured thinking, user-centricity, and business impact

## OUTPUT FORMAT (JSON only, no markdown)
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasForImprovement": ["improvement 1", "improvement 2", "improvement 3"],
  "sampleAnswer": "A detailed example excellent answer...",
  "interviewTips": ["tip 1", "tip 2", "tip 3"],
  "score": number (1-10),
  "overallFeedback": "A concise 2-3 sentence summary"
}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
              maxOutputTokens: 2048
            }
          })
        });

        if (response.ok) {
          const resJson = await response.json();
          const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          // Safely strip off any markdown wrap e.g., ```json ... ```
          let cleanedText = responseText.trim();
          if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.replace(/^```[a-zA-Z]*\s*/, "");
            cleanedText = cleanedText.replace(/\s*```$/, "");
          }
          cleanedText = cleanedText.trim();

          const parsed = JSON.parse(cleanedText);
          
          // Format a comprehensive critique from structured response
          const strengths = Array.isArray(parsed.strengths) ? parsed.strengths.join('\n• ') : '';
          const improvements = Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement.join('\n• ') : '';
          const tips = Array.isArray(parsed.interviewTips) ? parsed.interviewTips.join('\n• ') : '';
          
          aiCritique = `## STRENGTHS
• ${strengths}

## AREAS FOR IMPROVEMENT
• ${improvements}

## SAMPLE EXCELLENT ANSWER
${parsed.sampleAnswer || 'Not provided'}

## INTERVIEW TIPS
• ${tips}

## OVERALL FEEDBACK
${parsed.overallFeedback || 'Good effort! Keep practicing.'}`;

          aiScore = Math.max(1, Math.min(10, Number(parsed.score) || 7));
        } else {
          throw new Error(`Gemini API returned status code ${response.status}`);
        }
      } catch (err: any) {
        console.error("Gemini API Error, falling back to local simulation:", err);
        // Fallback with meaningful feedback when API fails
        aiScore = 7;
        aiCritique = `## REVIEW (Offline Mode - API Unavailable)

### Your Answer for Day ${activeDay.day}: ${activeDay.title}

Great start! While the AI review service is temporarily unavailable, here's what to focus on:

**Key Points to Cover:**
• Structure your answer using frameworks (STAR, PREP, or SCQA)
• Connect to real user problems and business impact
• Show data-driven thinking where possible
• Demonstrate customer empathy and insights

**For "${activeDay.title}", consider:**
• What user problem does this solve?
• How would you measure success?
• What would you do differently from competitors?

Keep practicing and resubmit when the AI service is back online!`;
      }
    } else {
      // Mock grading if no API key is set - but provide meaningful guidance
      aiScore = 7;
      aiCritique = `## SETUP REQUIRED: Gemini API Key Needed

To receive personalized AI feedback on your PM interview prep, you need to set up a free Gemini API key:

### How to Get Your Free API Key:
1. Go to https://aistudio.google.com/
2. Sign in with your Google account
3. Click "Get API Key" in the left sidebar
4. Create a new API key (free tier: 15 requests/min, 1500 requests/day)
5. Copy the key and paste it in the settings

### Why This Matters:
With Gemini API, you'll receive:
• Detailed strengths and weaknesses analysis
• Sample excellent answers from real PM interviews  
• Specific tips for this topic
• Scores to track your progress

**Your answer has been saved locally. Once you add the API key, you can resubmit to get full feedback!**`;
    }

    const dailyScore = calculatedStreak + aiScore;

    // Create submission item
    const newSubmission: SubmissionItem = {
      id: "sub_" + Date.now(),
      userId: profile.id,
      day: selectedDayNum,
      title: activeDay.title,
      submittedAt: new Date().toISOString(),
      submissionText: userText,
      aiScore,
      aiCritique,
      dailyScore
    };

    const updatedSubmissions = [...submissions.filter(s => s.day !== selectedDayNum), newSubmission];

    // Calculate new total score
    const totalScore = updatedSubmissions.reduce((sum, s) => sum + s.dailyScore, 0);
    const daysCompleted = updatedSubmissions.length;

    const updatedProfile: UserProfile = {
      ...profile,
      streak: calculatedStreak,
      totalScore,
      daysCompleted,
      lastSubmissionDate: new Date().toISOString()
    };

    // Save to State
    setSubmissions(updatedSubmissions);
    setProfile(updatedProfile);
    setSubmissionText("");

    // Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        // Save submission
        await supabase.from("submissions").insert([
          {
            user_id: profile.id,
            day: selectedDayNum,
            title: activeDay.title,
            submission_text: userText,
            ai_score: aiScore,
            ai_critique: aiCritique,
            daily_score: dailyScore
          }
        ]);

        // Update profile
        await supabase
          .from("profiles")
          .update({
            current_streak: calculatedStreak,
            total_score: totalScore,
            days_completed: daysCompleted,
            last_submission_date: new Date().toISOString()
          })
          .eq("id", profile.id);

      } catch (dbErr) {
        console.error("Database sync error:", dbErr);
      }
    }

    setAiLoading(false);
  };

  // --- LEADERBOARD & RANK CALCULATIONS ---
  const computedLeaderboard = useMemo<CustomLeaderboardEntry[]>(() => {
    if (!profile) return [];

    const userEntry: CustomLeaderboardEntry = {
      id: profile.id,
      name: `${profile.name} (You)`,
      streak: profile.streak,
      totalScore: profile.totalScore,
      daysCompleted: profile.daysCompleted,
      isCurrentUser: true
    };

    let list: CustomLeaderboardEntry[] = [];
    if (isSupabaseConfigured && dbProfiles.length > 0) {
      // Use real Supabase profiles
      list = dbProfiles.map((p) => ({
        id: p.id,
        name: p.id === profile.id ? `${profile.name} (You)` : p.name,
        streak: p.streak,
        totalScore: p.totalScore,
        daysCompleted: p.daysCompleted,
        isCurrentUser: p.id === profile.id
      }));

      // Make sure the active user is in the list
      if (!list.some(l => l.id === profile.id)) {
        list.push(userEntry);
      }
    } else {
      // Use local users instead of mock leaderboard
      list = localUsers
        .filter(u => u.email !== profile.email) // Remove current user (we'll add them separately)
        .map((u) => ({
          id: u.id,
          name: u.name,
          streak: u.streak,
          totalScore: u.totalScore,
          daysCompleted: u.daysCompleted,
          isCurrentUser: false
        }));
      
      // Add current user at the beginning
      list.unshift(userEntry);
    }

    return list.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.streak !== a.streak) return b.streak - a.streak;
      return b.daysCompleted - a.daysCompleted;
    });
  }, [profile, dbProfiles, localUsers]);

  const currentRank = useMemo(() => {
    if (!profile) return 0;
    const index = computedLeaderboard.findIndex(item => item.isCurrentUser);
    return index !== -1 ? index + 1 : 1;
  }, [computedLeaderboard, profile]);

  // Active Day Object
  const activeDay = useMemo(() => {
    return CURRICULUM.find((d) => d.day === selectedDayNum) || CURRICULUM[0];
  }, [selectedDayNum]);

  // Is active day submitted?
  const activeSubmission = useMemo(() => {
    return submissions.find((s) => s.day === selectedDayNum);
  }, [submissions, selectedDayNum]);

  // --- RENDER VIEWS ---
  if (!profile) {
    return (
      <AntigravityLanding 
        onLogin={handleLoginSubmit} 
        isLoading={authLoading}
        isMagicLinkSent={isMagicLinkSent} 
        onSimulateMagicLink={simulateMagicLinkClick}
        isSupabaseConfigured={isSupabaseConfigured}
        errorMessage={errorMessage}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col antialiased">
      {/* Workspace Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-slate-900 leading-tight">Discovery21</h1>
            <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              {isSupabaseConfigured ? "Live Sync Enabled" : "Simulated Offline Mode"}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl font-display font-bold text-xs">
          <button
            onClick={() => setActiveTab("curriculum")}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === "curriculum" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Syllabus
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === "leaderboard" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Leaderboard
          </button>
        </div>

        {/* User Badge Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-bold text-slate-900 text-xs">{profile.name}</div>
            <div className="text-[10px] text-slate-500">{profile.email}</div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-red-500 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-1 flex flex-col gap-6">
        
        {/* Sleek Dashboard Display Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">🔥 Current Streak</span>
              <h4 className="text-2xl font-extrabold text-slate-900 mt-1">{profile.streak} Days</h4>
            </div>
            <Flame className="w-8 h-8 text-amber-500 fill-amber-500/20 stroke-amber-600" />
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">⭐ Total Score</span>
              <h4 className="text-2xl font-extrabold text-slate-900 mt-1">{profile.totalScore} Points</h4>
            </div>
            <Award className="w-8 h-8 text-indigo-500" />
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">🏆 Current Rank</span>
              <h4 className="text-2xl font-extrabold text-slate-900 mt-1">#{currentRank}</h4>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-500" />
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">✅ Days Completed</span>
              <h4 className="text-2xl font-extrabold text-slate-900 mt-1">{profile.daysCompleted} / 21</h4>
            </div>
            <CheckCircle className="w-8 h-8 text-sky-500" />
          </div>
        </section>

        {/* Dynamic Content Views */}
        <section className="flex-1 flex flex-col">
          
          {/* TAB 1: CURRICULUM SYLLABUS PANEL */}
          {activeTab === "curriculum" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
              
              {/* Left Day Selector Sidebar */}
              <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-[600px] overflow-y-auto space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">21-Day PM Bootcamp</h3>
                {CURRICULUM.map((dayItem) => {
                  const isSubmitted = submissions.some(s => s.day === dayItem.day);
                  const isCurrent = dayItem.day === selectedDayNum;
                  
                  // The user can unlock days sequentially
                  const isUnlocked = dayItem.day <= profile.daysCompleted + 1;

                  return (
                    <button
                      key={dayItem.day}
                      onClick={() => isUnlocked && setSelectedDayNum(dayItem.day)}
                      disabled={!isUnlocked}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : isUnlocked
                            ? "bg-white border-slate-200 hover:bg-slate-100 text-slate-800"
                            : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                          isCurrent ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-650"
                        }`}>
                          DAY {dayItem.day}
                        </span>
                        <span className="text-xs font-bold truncate max-w-[150px]">{dayItem.title}</span>
                      </div>

                      <div className="flex items-center">
                        {isSubmitted ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                            COMPLETED
                          </span>
                        ) : isUnlocked ? (
                          <ChevronRight className="w-4 h-4 opacity-50" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Split Content Pane */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Curriculum Lesson Reading */}
                <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-xs space-y-5">
                  <div className="border-b border-slate-150 pb-4">
                    <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-slate-400">
                      Product Discovery Challenge • Day {activeDay.day} / 21
                    </span>
                    <h2 className="text-2xl font-display font-extrabold text-slate-900 mt-1 uppercase tracking-tight">
                      {activeDay.title}
                    </h2>
                  </div>

                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {activeDay.reading}
                  </div>

                  {/* Real World Example box */}
                  <div className="bg-slate-50 border-l-4 border-slate-800 p-4.5 rounded-r-xl space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Real Example</h4>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{activeDay.example}</p>
                  </div>
                </div>

                {/* AI Assignment Workstation */}
                <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-xs space-y-4">
                  <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">AI Assignment Prompt</span>
                    <p className="text-xs text-slate-700 leading-relaxed font-semibold">{activeDay.assignmentPrompt}</p>
                  </div>

                  {activeSubmission ? (
                    // Graded Day Display Lock
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-450 uppercase">Your Submission:</span>
                        <p className="text-xs text-slate-650 mt-1 leading-relaxed font-medium italic whitespace-pre-wrap">
                          "{activeSubmission.submissionText}"
                        </p>
                      </div>

                      <div className="border-t border-slate-100 pt-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-full w-fit">
                          <Sparkles className="w-4 h-4 fill-indigo-500 stroke-none" />
                          <span>Graded Review Critique Log</span>
                        </div>

                        <div className="p-4 bg-slate-900 text-indigo-200 rounded-2xl font-mono text-xs leading-relaxed border border-slate-950 max-h-[300px] overflow-y-auto">
                          {activeSubmission.aiCritique}
                          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-[10px] text-emerald-400 font-bold">
                            <span>Score: {activeSubmission.aiScore} / 10</span>
                            <span>Daily Score: {activeSubmission.dailyScore} Points (Streak: {activeSubmission.dailyScore - activeSubmission.aiScore})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Writing Console Input
                    <div className="space-y-4">
                      <textarea
                        disabled={aiLoading}
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        placeholder="Write your assignment solution here (minimum 25 characters)..."
                        rows={6}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white text-slate-900 transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />

                      <div className="flex justify-between items-center pt-2">
                        <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">
                          Length: {submissionText.length} chars
                        </div>

                        <button
                          onClick={getAISubmissionReview}
                          disabled={aiLoading || submissionText.trim().length < 25}
                          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-2"
                        >
                          {aiLoading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fetching AI Critique...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Get AI Review
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: LEADERBOARD BOARD PANEL */}
          {activeTab === "leaderboard" && (
            <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-xs max-w-3xl mx-auto w-full space-y-6">
              <div>
                <h3 className="text-lg font-display font-extrabold text-slate-900 uppercase tracking-tight">
                  Discovery21 League Standings
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Product managers compete daily. Streak points and AI ratings combined form the ultimate ranking standings.
                </p>
              </div>

              {computedLeaderboard.length <= 1 ? (
                <div className="text-center py-12 px-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-4xl mb-3">🏆</div>
                  <h4 className="font-bold text-slate-900 mb-2">You're the first one here!</h4>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    Share the app with other aspiring PMs to see the full leaderboard. 
                    Complete challenges to climb to the top!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-mono font-extrabold border-b border-slate-100">
                        <th className="py-3 px-4 text-center">Rank</th>
                        <th className="py-3 px-4">PM Name</th>
                        <th className="py-3 px-4 text-center">Current Streak</th>
                        <th className="py-3 px-4 text-center">Days Completed</th>
                        <th className="py-3 px-4 text-right">Total Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {computedLeaderboard.map((item, index) => {
                        const isUser = item.isCurrentUser;
                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/50 transition-colors ${
                              isUser ? "bg-slate-50 text-slate-900 font-bold border-l-4 border-slate-900" : ""
                            }`}
                          >
                            <td className="py-3.5 px-4 text-center font-mono font-extrabold text-slate-900">
                              #{index + 1}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-display font-extrabold text-[11px] uppercase tracking-tight">
                                  {item.name}
                                </span>
                                {isUser && <span className="text-[9px] text-slate-400">You</span>}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                              <span className="inline-flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 stroke-none" />
                                {item.streak}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                              {item.daysCompleted} / 21
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                              {item.totalScore} pts
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </section>

      </main>

      <footer className="bg-slate-50 border-t border-slate-200 py-6 text-center text-[10px] text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3 font-mono font-bold uppercase tracking-wider">
          <span>© 2026 Discovery21 Challenge. All rights reserved.</span>
          <div className="flex gap-4">
            <span className="hover:text-slate-650 cursor-pointer">Terms</span>
            <span className="hover:text-slate-650 cursor-pointer">Security</span>
            <span className="hover:text-slate-650 cursor-pointer">API Docs</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
