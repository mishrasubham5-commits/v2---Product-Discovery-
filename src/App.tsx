import React, { useState, useEffect, useMemo } from "react";
import { 
  Award, 
  Flame, 
  Sparkles, 
  BookOpen, 
  Lock, 
  ChevronRight, 
  TrendingUp,
  Settings,
  LogOut,
  RefreshCw,
  Info,
  CheckCircle,
  HelpCircle
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

  // Onboarding/Login loading states
  const [authLoading, setAuthLoading] = useState(false);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [activeTab, setActiveTab] = useState<"curriculum" | "leaderboard" | "settings">("curriculum");
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
        setProfile({
          id: insertedData.id,
          name: insertedData.name,
          email: insertedData.email,
          streak: insertedData.current_streak,
          totalScore: insertedData.total_score,
          daysCompleted: insertedData.days_completed,
          lastSubmissionDate: insertedData.last_submission_date,
          joinedAt: insertedData.created_at
        });
      }
    } else {
      // Profile exists, load it
      setProfile({
        id: data.id,
        name: data.name,
        email: data.email,
        streak: data.current_streak,
        totalScore: data.total_score,
        daysCompleted: data.days_completed,
        lastSubmissionDate: data.last_submission_date,
        joinedAt: data.created_at
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
        // Always set magic link sent to true so the user is never stuck
        // and can immediately access the direct sandbox login fallback link.
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
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      handleSignOutCleanup();
    }
  };

  const handleResetWorkspace = () => {
    if (window.confirm("Are you sure you want to reset all your progress and streak info?")) {
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
      // If diffDays === 0, keep same streak (multiple same-day submissions, although day is locked)
    } else {
      calculatedStreak = 1;
    }

    let aiScore = 7;
    let aiCritique = "";

    if (geminiApiKey) {
      try {
        const prompt = `You are an expert Product Discovery Mentor.
Evaluate the user's submission for Day ${activeDay.day} of the 21-Day Product Discovery Challenge.

Topic: ${activeDay.title}
Assignment Prompt: ${activeDay.assignmentPrompt}
User's Submission: ${userText}

Evaluate the response based on the following criteria:
- Understanding of concept
- Critical thinking
- Quality of response
- Product discovery skills

Return your response in raw JSON matching this format:
{
  "score": number (integer 0 to 10),
  "critique": "string (concise review, advice, and feedback)"
}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json"
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
          aiScore = Math.max(0, Math.min(10, Number(parsed.score) || 7));
          aiCritique = parsed.critique || "Excellent work. You have demonstrated solid comprehension.";
        } else {
          throw new Error(`Gemini API returned status code ${response.status}`);
        }
      } catch (err: any) {
        console.error("Gemini API Error, falling back to local simulation:", err);
        // Fallback simulated review
        aiScore = Math.min(10, Math.max(4, Math.floor(Math.random() * 5) + 6));
        aiCritique = `[Simulated Feedback - API Error] Good effort on the ${activeDay.title} challenge. You analyzed the principles correctly. Focus on structuring user interviews around past behaviors rather than hypothetical preferences.`;
      }
    } else {
      // Mock grading if no API key is set
      aiScore = Math.min(10, Math.max(4, Math.floor(Math.random() * 5) + 6));
      aiCritique = `[Offline Mode Mock Critique] You have structured your response well for Day ${activeDay.day}. Your understanding of "${activeDay.title}" is clear. To maximize PM capabilities, focus on mapping outcomes rather than launching raw features. Configure your Gemini API key in Settings for live reviews!`;
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
    if (!profile) return MOCK_LEADERBOARD;

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
      // Use mock leaderboard
      list = [...MOCK_LEADERBOARD.filter(item => item.id !== profile.id), userEntry];
    }

    return list.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.streak !== a.streak) return b.streak - a.streak;
      return b.daysCompleted - a.daysCompleted;
    });
  }, [profile, dbProfiles]);

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
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === "settings" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Settings className="w-4 h-4 inline mr-1" /> Settings
          </button>
        </div>

        {/* User Badge Info */}
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

                        <div className="p-4 bg-slate-900 text-indigo-200 rounded-2xl font-mono text-xs leading-relaxed border border-slate-950">
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
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-950 focus:bg-white text-slate-900 transition-all font-medium resize-none leading-relaxed"
                      />

                      <div className="flex justify-between items-center pt-2">
                        <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">
                          Length: {submissionText.length} chars
                        </div>

                        <button
                          onClick={getAISubmissionReview}
                          disabled={aiLoading || submissionText.trim().length < 25}
                          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer"
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
                            <span className="font-display font-extrabold text-[11px] uppercase tracking-tight">
                              {item.name}
                            </span>
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
            </div>
          )}

          {/* TAB 3: SETTINGS CONFIG PANEL */}
          {activeTab === "settings" && (
            <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-xs max-w-xl mx-auto w-full space-y-6">
              <div>
                <h3 className="text-lg font-display font-extrabold text-slate-900 uppercase tracking-tight">
                  Challenge Settings
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  Configure local database links, AI API credentials, and simulate verification routines.
                </p>
              </div>

              {/* Supabase Status Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Database Infrastructure
                </span>
                <div className="flex justify-between items-center">
                  <div className="text-xs font-bold text-slate-900">Supabase State:</div>
                  <div
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider font-mono ${
                      isSupabaseConfigured
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-amber-50 border-amber-200 text-amber-800 animate-pulse"
                    }`}
                  >
                    {isSupabaseConfigured ? "Connected (Live Sync)" : "Connected Offline"}
                  </div>
                </div>
                {!isSupabaseConfigured && (
                  <div className="pt-2 text-[10px] text-slate-500 leading-normal flex gap-1.5 items-start">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Supabase environment variables are missing. App falls back to local storage automatically. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` to enable real backend sync.
                    </span>
                  </div>
                )}
              </div>

              {/* Magic Link Simulated Tool */}
              {!isSupabaseConfigured && localStorage.getItem("discovery_temp_onboard") && (
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-150 space-y-3.5">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                    Magic Link Simulator
                  </span>
                  <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                    We detected a pending login request in simulated offline mode. Click the button below to simulate verifying the email link and logging in.
                  </p>
                  <button
                    onClick={simulateMagicLinkClick}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Simulate Magic Link Click 🎉
                  </button>
                </div>
              )}

              {/* Gemini API Key configuration */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Gemini API Configuration Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  />
                  <button
                    onClick={() => {
                      localStorage.setItem("discovery_gemini_api_key", geminiApiKey);
                      alert("Gemini API key updated!");
                    }}
                    className="px-4.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Save Key
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal pt-1">
                  We use the Gemini API (e.g. <code>gemini-2.5-flash</code>) to rate and review submissions. Provide a key here or configure <code>VITE_GEMINI_API_KEY</code> in environment variables. If left blank, mock reviews are generated for testing.
                </p>
              </div>

              {/* Reset App data */}
              <div className="border-t border-slate-100 pt-6 space-y-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Danger Area
                </div>
                <button
                  onClick={handleResetWorkspace}
                  className="w-full py-3 border border-red-200 text-red-700 hover:bg-red-50 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Clear Session & Reset App Progress
                </button>
              </div>
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
