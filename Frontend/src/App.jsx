import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AiChatWidget from './components/AiChatWidget';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Route,
  Scissors,
  Plus,
  Bell,
  Clock,
  LogOut,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  PlayCircle,
  BookOpen,
  Layers,
  Edit3,
  Award,
  ArrowRight
} from 'lucide-react';
import { getLayoutedElements } from './layoutGraph';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const styles = {
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '13.5px',
    color: '#0f172a',
    background: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '5px'
  },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
  }
};

export default function App() {
  // Auth state persisted in localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('footprint_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Auth form state
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'signup'
  const [loginPortal, setLoginPortal] = useState('learner'); // 'learner' | 'instructor'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Course & Graph state
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [concepts, setConcepts] = useState([]);
  const [rawEdges, setRawEdges] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [selectedConcept, setSelectedConcept] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);

  // Proctored Quiz Anti-Cheat States
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [proctorWarning, setProctorWarning] = useState('');

  // Target Path state (Learner)
  const [targetConceptId, setTargetConceptId] = useState('');
  const [targetPath, setTargetPath] = useState(null);

  // Instructor state
  const [cycleError, setCycleError] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newConceptTitle, setNewConceptTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('https://www.youtube.com/embed/8hly31xKli0');
  const [newDuration, setNewDuration] = useState(20);
  const [newPassingScore, setNewPassingScore] = useState(70);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState('Option A, Option B, Option C');
  const [newCorrectIdx, setNewCorrectIdx] = useState(0);

  const [splitPart1, setSplitPart1] = useState('');
  const [splitPart2, setSplitPart2] = useState('');

  // Edit selected concept states
  const [editTitle, setEditTitle] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editDuration, setEditDuration] = useState(20);
  const [editPassingScore, setEditPassingScore] = useState(70);

  // Auto-converts standard YouTube links (watch?v= or youtu.be/) into /embed/ URLs
  const formatYoutubeEmbed = (url) => {
    if (!url) return '';
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = authTab === 'signup' ? `${API}/auth/signup` : `${API}/auth/login`;
      const payload = authTab === 'signup' ? { name, email, password } : { email, password };
      const res = await axios.post(endpoint, payload);

      if (loginPortal === 'instructor' && res.data.role !== 'instructor') {
        setAuthError('Access denied: Invalid instructor credentials.');
        return;
      }

      localStorage.setItem('footprint_user', JSON.stringify(res.data));
      setCurrentUser(res.data);
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Authentication failed.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('footprint_user');
    setIsQuizActive(false);
    setProctorWarning('');
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    setCurrentUser(null);
    setSelectedConcept(null);
    setTargetConceptId('');
    setTargetPath(null);
  };

  const loadCourses = useCallback(async () => {
    const res = await axios.get(`${API}/courses`);
    setCourses(res.data);
    if (res.data.length > 0 && !selectedCourseId) {
      setSelectedCourseId(res.data[0]._id);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (currentUser) loadCourses();
  }, [currentUser, loadCourses]);

  const fetchGraph = useCallback(async () => {
    if (!selectedCourseId || !currentUser) return;
    const learnerId = currentUser.role === 'learner' ? currentUser.id : 'demo-student';
    const res = await axios.get(`${API}/courses/${selectedCourseId}/graph?learnerId=${learnerId}`);
    const { course, concepts: fetchedConcepts, progress } = res.data;

    setConcepts(fetchedConcepts);
    setRawEdges(course.edges || []);
    setNotifications((progress.notifications || []).filter((n) => !n.isRead));

    if (selectedConcept) {
      const updated = fetchedConcepts.find((c) => c._id === selectedConcept._id);
      setSelectedConcept(updated || null);
    }
  }, [selectedCourseId, currentUser, selectedConcept]);

  useEffect(() => {
    fetchGraph();
  }, [selectedCourseId, currentUser]);

  // Recompute target path for Learner
  useEffect(() => {
    if (!selectedCourseId || !targetConceptId || currentUser?.role !== 'learner') {
      setTargetPath(null);
      return;
    }
    axios
      .get(`${API}/courses/${selectedCourseId}/path/${targetConceptId}?learnerId=${currentUser.id}`)
      .then((res) => setTargetPath(res.data));
  }, [selectedCourseId, targetConceptId, concepts, currentUser]);

  // Build React Flow nodes & edges
  useEffect(() => {
    const isInstructor = currentUser?.role === 'instructor';
    const pathIds = new Set((targetPath?.steps || []).map((s) => s._id));

    const rfNodes = concepts.map((c) => {
      const isHighlighted = !isInstructor && pathIds.has(c._id);
      const isSelected = selectedConcept?._id === c._id;

      let bg = '#ffffff';
      let border = '#cbd5e1';
      let pillBg = '#f1f5f9';
      let pillColor = '#475569';
      let badge = <Lock size={14} color="#64748b" />;

      if (isInstructor) {
        bg = '#ffffff';
        border = isSelected ? '#6d28d9' : '#c4b5fd';
        pillBg = '#f3e8ff';
        pillColor = '#6b21a8';
        badge = <ShieldCheck size={14} color="#7c3aed" />;
      } else if (c.status === 'mastered') {
        bg = '#f0fdf4';
        border = '#22c55e';
        pillBg = '#dcfce7';
        pillColor = '#15803d';
        badge = <CheckCircle2 size={14} color="#16a34a" />;
      } else if (c.status === 'unlocked') {
        bg = '#eff6ff';
        border = '#3b82f6';
        pillBg = '#dbeafe';
        pillColor = '#1d4ed8';
        badge = <Unlock size={14} color="#2563eb" />;
      }

      if (isHighlighted) {
        border = '#f59e0b';
      }

      const totalMins = (c.lessons || []).reduce((acc, l) => acc + (l.durationMins || 0), 0);

      return {
        id: c._id,
        data: {
          label: (
            <div style={{ textAlign: 'left', padding: '4px 2px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontWeight: 700, fontSize: '12.5px', color: '#0f172a', lineHeight: 1.3 }}>
                <span style={{ marginTop: '1px', flexShrink: 0 }}>{badge}</span>
                <span>{c.title}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: isHighlighted ? '#fef3c7' : pillBg,
                    color: isHighlighted ? '#b45309' : pillColor,
                    textTransform: 'capitalize'
                  }}
                >
                  {isInstructor
                    ? `Pass: ${c.quiz?.passingScore || 70}%`
                    : isHighlighted
                    ? 'Target Path'
                    : c.status}
                </span>
                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>
                  {totalMins}m
                </span>
              </div>
            </div>
          )
        },
        style: {
          background: bg,
          border: `2px solid ${border}`,
          borderRadius: '12px',
          width: 230,
          boxShadow: isSelected
            ? '0 0 0 4px rgba(59, 130, 246, 0.2), 0 8px 16px -4px rgba(15, 23, 42, 0.12)'
            : isHighlighted
            ? '0 0 0 3px rgba(245, 158, 11, 0.3), 0 4px 10px rgba(0,0,0,0.06)'
            : '0 2px 6px rgba(15, 23, 42, 0.06)',
          transition: 'all 0.2s ease'
        }
      };
    });

    const rfEdges = rawEdges.map((e) => ({
      id: e._id,
      source: e.source,
      target: e.target,
      animated: !isInstructor && pathIds.has(e.target),
      style: {
        stroke: !isInstructor && pathIds.has(e.target) ? '#f59e0b' : '#64748b',
        strokeWidth: !isInstructor && pathIds.has(e.target) ? 2.5 : 1.8
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: !isInstructor && pathIds.has(e.target) ? '#f59e0b' : '#64748b'
      }
    }));

    const { nodes: layoutedN, edges: layoutedE } = getLayoutedElements(rfNodes, rfEdges);
    setNodes(layoutedN);
    setEdges(layoutedE);
  }, [concepts, rawEdges, targetPath, currentUser, selectedConcept, setNodes, setEdges]);

  // Instructor actions
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;
    const res = await axios.post(`${API}/courses`, {
      title: newCourseTitle.trim(),
      description: 'Custom prerequisite graph course'
    });
    setNewCourseTitle('');
    await loadCourses();
    setSelectedCourseId(res.data._id);
  };

  const handleConnect = async (params) => {
    if (currentUser?.role !== 'instructor') return;
    setCycleError('');
    try {
      await axios.post(`${API}/courses/${selectedCourseId}/edges`, {
        source: params.source,
        target: params.target
      });
      fetchGraph();
    } catch (err) {
      setCycleError(err.response?.data?.error || 'Failed to add prerequisite link');
    }
  };

  const handleEdgeClick = async (_, edge) => {
    if (currentUser?.role !== 'instructor') return;
    if (!window.confirm('Remove this prerequisite link?')) return;
    await axios.delete(`${API}/courses/${selectedCourseId}/edges/${edge.id}`);
    fetchGraph();
  };

  const handleCreateConcept = async (e) => {
    e.preventDefault();
    if (!newConceptTitle.trim()) return;
    await axios.post(`${API}/courses/${selectedCourseId}/concepts`, {
      title: newConceptTitle,
      description: `Lessons and mastery quiz for ${newConceptTitle}`,
      lessons: [
        {
          title: `${newConceptTitle} Lesson`,
          type: 'video',
          urlOrContent: formatYoutubeEmbed(newVideoUrl),
          durationMins: Number(newDuration)
        }
      ],
      quiz: {
        passingScore: Number(newPassingScore) || 70,
        questions: newQuestion
          ? [
              {
                question: newQuestion,
                options: newOptions.split(',').map((s) => s.trim()),
                correctIndex: Number(newCorrectIdx)
              }
            ]
          : []
      }
    });
    setNewConceptTitle('');
    setNewQuestion('');
    fetchGraph();
  };

  const handleSplitConcept = async (e) => {
    e.preventDefault();
    if (!selectedConcept || !splitPart1 || !splitPart2) return;
    await axios.post(`${API}/courses/${selectedCourseId}/concepts/${selectedConcept._id}/split`, {
      part1Title: splitPart1,
      part2Title: splitPart2
    });
    setSplitPart1('');
    setSplitPart2('');
    setSelectedConcept(null);
    fetchGraph();
  };

  const handleUpdateConcept = async (e) => {
    e.preventDefault();
    if (!selectedConcept) return;
    await axios.put(`${API}/courses/${selectedCourseId}/concepts/${selectedConcept._id}`, {
      title: editTitle,
      videoUrl: formatYoutubeEmbed(editVideoUrl),
      durationMins: Number(editDuration),
      passingScore: Number(editPassingScore)
    });
    fetchGraph();
  };

  // Learner actions
  const handleSubmitQuiz = async () => {
    const questions = selectedConcept.quiz?.questions || [];
    const answers = questions.map((_, idx) => quizAnswers[idx] ?? -1);
    const res = await axios.post(
      `${API}/courses/${selectedCourseId}/concepts/${selectedConcept._id}/quiz`,
      { learnerId: currentUser.id, answers }
    );
    setIsQuizActive(false);
    setQuizResult(res.data);

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    fetchGraph();
  };

  // Start Quiz in Protected Fullscreen Mode
  const handleStartProctoredQuiz = async () => {
    setProctorWarning('');
    setQuizResult(null);
    setQuizAnswers({});
    setIsQuizActive(true);

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request blocked:', err);
    }
  };

  // Immediately close & void the quiz if student switches tab, app, or exits fullscreen
  const terminateQuizDueToViolation = useCallback((reason) => {
    setIsQuizActive(false);
    setQuizAnswers({});
    setQuizResult(null);
    setProctorWarning(`Quiz terminated: ${reason}. Switching tabs, apps, or exiting fullscreen is not allowed during the test.`);

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Monitor Tab Switches, App Focus Loss, and Fullscreen Exit
  useEffect(() => {
    if (!isQuizActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        terminateQuizDueToViolation('You switched to another tab or minimized the browser');
      }
    };

    const handleWindowBlur = () => {
      terminateQuizDueToViolation('You switched focus to another window or application');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        terminateQuizDueToViolation('You exited fullscreen mode');
      }
    };

    const blockAction = (e) => e.preventDefault();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', blockAction);
    document.addEventListener('copy', blockAction);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', blockAction);
      document.removeEventListener('copy', blockAction);
    };
  }, [isQuizActive, terminateQuizDueToViolation]);

  const dismissNotifications = async () => {
    await axios.post(`${API}/courses/${selectedCourseId}/notifications/read`, {
      learnerId: currentUser.id
    });
    setNotifications([]);
  };

  // =========================================================
  // VIEW 1: SPLIT-SCREEN HERO LOGIN / SIGNUP PORTAL
  // =========================================================
  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: '#f8fafc' }}>
        {/* Left Brand Showcase Panel */}
        <div
          style={{
            flex: 1.1,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #311042 100%)',
            color: 'white',
            padding: '48px 56px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Route size={20} color="white" />
            </div>
            <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>FootPrint</span>
          </div>

          <div style={{ maxWidth: '480px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: 600, color: '#93c5fd', marginBottom: '20px' }}>
              <Sparkles size={14} />
              <span>Prerequisite-Aware Learning Engine</span>
            </div>
            <h2 style={{ fontSize: '36px', fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>
              Master complex skills without missing a single foundation.
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#cbd5e1', margin: '0 0 32px 0' }}>
              Interactive concept dependency graphs, dynamic mastery unlocking, shortest learning path calculation, and proctored assessments.
            </p>

            <div style={{ display: 'grid', gap: '14px' }}>
              {[
                { icon: <Layers size={16} color="#60a5fa" />, text: 'DAG-enforced curriculum with real-time cycle protection' },
                { icon: <Route size={16} color="#fbbf24" />, text: 'Personalized shortest path & study-time estimation' },
                { icon: <ShieldCheck size={16} color="#c084fc" />, text: 'Proctored fullscreen mastery assessments' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13.5px', color: '#e2e8f0' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Adaptive Curriculum & Mastery Graph Platform
          </div>
        </div>

        {/* Right Auth Card Panel */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
          <div style={{ width: '100%', maxWidth: '420px', background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.08)' }}>
            {loginPortal === 'learner' ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', color: '#2563eb', marginBottom: '12px' }}>
                    <GraduationCap size={26} />
                  </div>
                  <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Learner Portal</h1>
                  <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: '#64748b' }}>Sign in or create a new student account</p>
                </div>

                {/* Learner Tabs: Login vs Create New Account */}
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', marginBottom: '20px' }}>
                  <button
                    type="button"
                    onClick={() => { setAuthTab('login'); setAuthError(''); }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '7px',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      background: authTab === 'login' ? 'white' : 'transparent',
                      color: authTab === 'login' ? '#0f172a' : '#64748b',
                      boxShadow: authTab === 'login' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthTab('signup'); setAuthError(''); }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '7px',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      background: authTab === 'signup' ? 'white' : 'transparent',
                      color: authTab === 'signup' ? '#0f172a' : '#64748b',
                      boxShadow: authTab === 'signup' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    Create New Account
                  </button>
                </div>

                {authError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                    {authError}
                  </div>
                )}

                <form onSubmit={handleAuthSubmit}>
                  {authTab === 'signup' && (
                    <div style={{ marginBottom: '14px' }}>
                      <label style={styles.label}>Full Name</label>
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        style={styles.input}
                      />
                    </div>
                  )}

                  <div style={{ marginBottom: '14px' }}>
                    <label style={styles.label}>Student Email</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@example.com"
                      style={styles.input}
                    />
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label style={styles.label}>Password</label>
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={styles.input}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '11px',
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '9px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                    }}
                  >
                    <span>{authTab === 'signup' ? 'Create Learner Account' : 'Login as Learner'}</span>
                    <ArrowRight size={16} />
                  </button>
                </form>

                {/* Separate Button to Switch to Instructor Login */}
                <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginPortal('instructor');
                      setAuthTab('login');
                      setAuthError('');
                      setEmail('');
                      setPassword('');
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#faf5ff',
                      color: '#6b21a8',
                      border: '1px solid #d8b4fe',
                      borderRadius: '9px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '13px'
                    }}
                  >
                    <ShieldCheck size={16} />
                    <span>Login as Instructor</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '14px', background: '#f3e8ff', color: '#7c3aed', marginBottom: '12px' }}>
                    <ShieldCheck size={26} />
                  </div>
                  <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Instructor Login</h1>
                  <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: '#64748b' }}>Authorized curriculum editors only</p>
                </div>

                {authError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                    {authError}
                  </div>
                )}

                <form onSubmit={handleAuthSubmit}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={styles.label}>Instructor Email</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="instructor@footprint.edu"
                      style={styles.input}
                    />
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label style={styles.label}>Password</label>
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={styles.input}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '11px',
                      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '9px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '14px',
                      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)'
                    }}
                  >
                    Enter Instructor Studio
                  </button>
                </form>

                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('instructor@footprint.edu');
                      setPassword('admin123');
                    }}
                    style={{ width: '100%', padding: '9px', background: '#f8fafc', color: '#475569', border: '1px dashed #cbd5e1', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    Auto-fill Demo Instructor (instructor@footprint.edu / admin123)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginPortal('learner');
                      setAuthError('');
                      setEmail('');
                      setPassword('');
                    }}
                    style={{ width: '100%', padding: '8px', background: 'transparent', color: '#2563eb', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                  >
                    ← Back to Learner Login / Sign Up
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW 2: SEPARATE INSTRUCTOR OR LEARNER DASHBOARD
  // =========================================================
  const isInstructor = currentUser.role === 'instructor';
  const masteredCount = concepts.filter((c) => c.status === 'mastered').length;
  const masteryPct = concepts.length > 0 ? Math.round((masteredCount / concepts.length) * 100) : 0;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: '#f8fafc' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          background: isInstructor
            ? 'linear-gradient(90deg, #2e1065 0%, #4c1d95 100%)'
            : 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.15)',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isInstructor ? <ShieldCheck size={19} color="#d8b4fe" /> : <GraduationCap size={19} color="#60a5fa" />}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 800, letterSpacing: '-0.01em' }}>
                {isInstructor ? 'FootPrint • Instructor Studio' : 'FootPrint • Learner Portal'}
              </h1>
            </div>
          </div>

          <select
            value={selectedCourseId}
            onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedConcept(null); setIsQuizActive(false); }}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.12)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {courses.map((c) => (
              <option key={c._id} value={c._id} style={{ color: '#0f172a' }}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Center/Right Progress Pill + User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {!isInstructor && concepts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Award size={15} color="#4ade80" />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                Mastery: {masteredCount}/{concepts.length} ({masteryPct}%)
              </span>
              <div style={{ width: '64px', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${masteryPct}%`, height: '100%', background: '#4ade80', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isInstructor ? '#7c3aed' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
              {currentUser.name?.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '13px', color: '#e2e8f0' }}>
              <strong>{currentUser.name}</strong>
            </span>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.06)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12.5px',
              fontWeight: 600
            }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Live Curriculum Update Banner (Learner Only) */}
      {!isInstructor && notifications.length > 0 && (
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fcd34d', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#92400e', fontSize: '13.5px' }}>
            <Bell size={16} color="#d97706" />
            <span><strong>Live Curriculum Update:</strong> {notifications[notifications.length - 1].message}</span>
          </div>
          <button
            onClick={dismissNotifications}
            style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Cycle Detection Error Alert (Instructor Only) */}
      {isInstructor && cycleError && (
        <div style={{ background: '#fef2f2', borderBottom: '1px solid #fca5a5', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#991b1b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '13.5px' }}>
            <AlertTriangle size={18} color="#dc2626" />
            <span>{cycleError}</span>
          </div>
          <button
            onClick={() => setCycleError('')}
            style={{ background: 'white', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '6px', padding: '4px 10px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split Workspace */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Interactive Visual Graph */}
        <div style={{ flex: 1, position: 'relative', background: '#f1f5f9' }}>
          <ReactFlow
            colorMode="light"
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onEdgeClick={handleEdgeClick}
            onNodeClick={(_, node) => {
              const found = concepts.find((c) => c._id === node.id);
              setSelectedConcept(found);
              setQuizAnswers({});
              setQuizResult(null);
              setIsQuizActive(false);
              setProctorWarning('');
              if (found) {
                setSplitPart1(`${found.title} - Basics`);
                setSplitPart2(`${found.title} - Advanced`);
                setEditTitle(found.title);
                setEditVideoUrl(found.lessons?.[0]?.urlOrContent || '');
                setEditDuration(found.lessons?.[0]?.durationMins || 20);
                setEditPassingScore(found.quiz?.passingScore || 70);
              }
            }}
            fitView
          >
            <Background color="#cbd5e1" gap={20} size={1} />
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              style={{ borderRadius: '10px', border: '1px solid #cbd5e1', overflow: 'hidden' }}
            />
          </ReactFlow>

          {/* Floating Bottom Legend */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 60,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(6px)',
              padding: '9px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
              display: 'flex',
              gap: '16px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#334155'
            }}
          >
            {!isInstructor ? (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e' }} /> Mastered
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3b82f6' }} /> Unlocked
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#94a3b8' }} /> Locked
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b' }} /> Target Path
                </span>
              </>
            ) : (
              <span>
                <strong>Instructor Tip:</strong> Drag bottom node handle → top node handle to add prerequisite; click any arrow to remove it.
              </span>
            )}
          </div>
        </div>

        {/* Right Sidebar: Role-Specific Panel */}
        <aside
          style={{
            width: '430px',
            background: '#f8fafc',
            borderLeft: '1px solid #e2e8f0',
            padding: '20px',
            overflowY: 'auto'
          }}
        >
          {/* ========================================= */}
          {/* LEARNER DASHBOARD SIDEBAR                 */}
          {/* ========================================= */}
          {!isInstructor && (
            <div>
              {/* Personalized Path Card */}
              <div style={styles.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', marginBottom: '10px', color: '#0f172a' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Route size={15} color="#d97706" />
                  </div>
                  <span>Personalized Learning Path</span>
                </div>
                <select
                  value={targetConceptId}
                  onChange={(e) => setTargetConceptId(e.target.value)}
                  style={{ ...styles.input, marginBottom: targetPath ? '12px' : 0, cursor: 'pointer' }}
                >
                  <option value="">-- Choose a Target Goal Concept --</option>
                  {concepts.map((c) => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>

                {targetPath && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '12.5px', color: '#92400e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <Clock size={14} />
                      <span>Estimated Time Remaining: {targetPath.totalDurationMins} mins</span>
                    </div>
                    {targetPath.steps.length === 0 ? (
                      <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
                        You have already mastered this goal!
                      </div>
                    ) : (
                      <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#1e293b' }}>
                        {targetPath.steps.map((step) => (
                          <li key={step._id} style={{ marginBottom: '4px' }}>
                            <strong>{step.title}</strong> <span style={{ color: '#64748b' }}>({step.durationMins}m)</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>

              {!selectedConcept ? (
                <div style={{ ...styles.card, textAlign: 'center', padding: '32px 20px', color: '#64748b' }}>
                  <BookOpen size={28} color="#94a3b8" style={{ marginBottom: '10px' }} />
                  <div style={{ fontWeight: 600, color: '#334155', fontSize: '14px', marginBottom: '4px' }}>Select a Concept Node</div>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
                    Click any concept in the dependency graph to inspect prerequisites, watch lessons, or start a proctored quiz.
                  </p>
                </div>
              ) : (
                <div style={styles.card}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        background:
                          selectedConcept.status === 'mastered'
                            ? '#dcfce7'
                            : selectedConcept.status === 'unlocked'
                            ? '#dbeafe'
                            : '#f1f5f9',
                        color:
                          selectedConcept.status === 'mastered'
                            ? '#15803d'
                            : selectedConcept.status === 'unlocked'
                            ? '#1d4ed8'
                            : '#475569'
                      }}
                    >
                      {selectedConcept.status}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                      Pass Threshold: {selectedConcept.quiz?.passingScore || 70}%
                    </span>
                  </div>

                  <h2 style={{ margin: '6px 0 6px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{selectedConcept.title}</h2>
                  <p style={{ fontSize: '13px', color: '#475569', marginTop: 0, lineHeight: 1.5 }}>{selectedConcept.description}</p>

                  {selectedConcept.status === 'locked' ? (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '14px', borderRadius: '10px', color: '#991b1b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, marginBottom: '6px', fontSize: '13.5px' }}>
                        <Lock size={16} />
                        <span>Concept Locked</span>
                      </div>
                      <div style={{ fontSize: '13px' }}>Complete and master these prerequisites first:</div>
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: '18px', fontSize: '13px' }}>
                        {selectedConcept.missingPrereqs.map((m) => (
                          <li key={m.id} style={{ marginBottom: '3px' }}><strong>{m.title}</strong></li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 700, marginTop: '14px', marginBottom: '8px', color: '#0f172a' }}>
                        <PlayCircle size={16} color="#2563eb" />
                        <span>Video Lesson</span>
                      </div>

                      {selectedConcept.lessons?.map((l, i) => (
                        <div key={i} style={{ marginBottom: '14px' }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
                            {l.title} • {l.durationMins} mins
                          </div>
                          {l.urlOrContent?.includes('youtube.com/embed') ? (
                            <iframe
                              width="100%"
                              height="195"
                              src={l.urlOrContent}
                              title={l.title}
                              style={{ borderRadius: '10px', border: '1px solid #e2e8f0' }}
                              allowFullScreen
                            />
                          ) : (
                            <p style={{ fontSize: '13px', background: '#f1f5f9', padding: '10px', borderRadius: '8px' }}>{l.urlOrContent}</p>
                          )}
                        </div>
                      ))}

                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '14px' }}>
                        <h3 style={{ fontSize: '14px', margin: '0 0 10px 0', color: '#0f172a', fontWeight: 700 }}>
                          Mastery Assessment ({selectedConcept.quiz?.questions?.length || 0} Questions)
                        </h3>

                        {/* Violation Alert Banner */}
                        {proctorWarning && (
                          <div style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b', padding: '10px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600, marginBottom: '12px', lineHeight: 1.4 }}>
                            ⚠️ {proctorWarning}
                          </div>
                        )}

                        {!isQuizActive ? (
                          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '14px', borderRadius: '10px' }}>
                            <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                              <strong>Proctored Mode:</strong> Launches in fullscreen. Switching browser tabs, opening external apps, or pressing <kbd style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>Esc</kbd> immediately terminates your test.
                            </p>
                            <button
                              onClick={handleStartProctoredQuiz}
                              style={{
                                width: '100%',
                                padding: '11px',
                                background: '#0f172a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '13.5px',
                                cursor: 'pointer'
                              }}
                            >
                              Start Proctored Quiz (Fullscreen)
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
                              🔒 Proctoring Active — Stay in fullscreen until submitted.
                            </div>

                            {(selectedConcept.quiz?.questions || []).map((q, qIdx) => (
                              <div key={qIdx} style={{ background: '#f8fafc', padding: '12px', borderRadius: '9px', marginBottom: '10px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#0f172a' }}>
                                  {qIdx + 1}. {q.question}
                                </div>
                                {q.options.map((opt, oIdx) => (
                                  <label
                                    key={oIdx}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      fontSize: '13px',
                                      padding: '6px 8px',
                                      borderRadius: '6px',
                                      marginBottom: '4px',
                                      cursor: 'pointer',
                                      color: '#1e293b',
                                      background: quizAnswers[qIdx] === oIdx ? '#eff6ff' : 'transparent'
                                    }}
                                  >
                                    <input
                                      type="radio"
                                      name={`q-${qIdx}`}
                                      checked={quizAnswers[qIdx] === oIdx}
                                      onChange={() => setQuizAnswers({ ...quizAnswers, [qIdx]: oIdx })}
                                      style={{ marginRight: '8px' }}
                                    />
                                    {opt}
                                  </label>
                                ))}
                              </div>
                            ))}

                            <button
                              onClick={handleSubmitQuiz}
                              style={{
                                width: '100%',
                                padding: '11px',
                                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '13.5px',
                                cursor: 'pointer'
                              }}
                            >
                              Submit Quiz & Unlock Next Topics
                            </button>
                          </div>
                        )}

                        {quizResult && (
                          <div
                            style={{
                              marginTop: '12px',
                              padding: '12px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: 600,
                              background: quizResult.passed ? '#dcfce7' : '#fee2e2',
                              border: `1px solid ${quizResult.passed ? '#86efac' : '#fecaca'}`,
                              color: quizResult.passed ? '#166534' : '#991b1b'
                            }}
                          >
                            Score: {quizResult.score}% — {quizResult.passed ? 'Mastered! Downstream concepts unlocked.' : 'Below passing threshold. Review and retry!'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================= */}
          {/* INSTRUCTOR STUDIO SIDEBAR                 */}
          {/* ========================================= */}
          {isInstructor && (
            <div>
              {/* Create New Course */}
              <div style={styles.card}>
                <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '10px', color: '#0f172a' }}>Create New Course</div>
                <form onSubmit={handleCreateCourse} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="e.g., Full-Stack Web Dev"
                    style={{ ...styles.input, flex: 1 }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '0 14px',
                      background: '#7c3aed',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Create
                  </button>
                </form>
              </div>

              {/* Edit Selected Concept (Video Link, Title, Duration, Pass %) */}
              {selectedConcept && (
                <div style={{ ...styles.card, borderColor: '#bfdbfe', background: '#f8faff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '14px', color: '#1e3a8a', marginBottom: '12px' }}>
                    <Edit3 size={15} />
                    <span>Edit "{selectedConcept.title}"</span>
                  </div>
                  <form onSubmit={handleUpdateConcept}>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={styles.label}>Concept Title</label>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        style={styles.input}
                      />
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                      <label style={styles.label}>YouTube Video URL</label>
                      <input
                        value={editVideoUrl}
                        onChange={(e) => setEditVideoUrl(e.target.value)}
                        placeholder="Paste any YouTube link..."
                        style={styles.input}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Duration (mins)</label>
                        <input
                          type="number"
                          value={editDuration}
                          onChange={(e) => setEditDuration(e.target.value)}
                          style={styles.input}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Pass Score (%)</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={editPassingScore}
                          onChange={(e) => setEditPassingScore(e.target.value)}
                          style={styles.input}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Save Concept Changes
                    </button>
                  </form>
                </div>
              )}

              {/* Live Split Tool */}
              {selectedConcept && (
                <div style={{ ...styles.card, borderColor: '#e9d5ff', background: '#fcfaff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '14px', color: '#6b21a8', marginBottom: '6px' }}>
                    <Scissors size={15} />
                    <span>Split "{selectedConcept.title}"</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#581c87', marginTop: 0, marginBottom: '10px', lineHeight: 1.4 }}>
                    Splits this node into two sequential concepts while preserving existing learner mastery.
                  </p>
                  <form onSubmit={handleSplitConcept}>
                    <input
                      value={splitPart1}
                      onChange={(e) => setSplitPart1(e.target.value)}
                      placeholder="Part 1 Title"
                      style={{ ...styles.input, marginBottom: '8px' }}
                    />
                    <input
                      value={splitPart2}
                      onChange={(e) => setSplitPart2(e.target.value)}
                      placeholder="Part 2 Title"
                      style={{ ...styles.input, marginBottom: '10px' }}
                    />
                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: '#7c3aed',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Split Concept & Notify Learners
                    </button>
                  </form>
                </div>
              )}

              {/* Add New Concept Form */}
              <div style={styles.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: '#0f172a' }}>
                  <Plus size={16} color="#7c3aed" />
                  <span>Add New Concept Node</span>
                </div>
                <form onSubmit={handleCreateConcept}>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={styles.label}>Concept Title</label>
                    <input
                      required
                      value={newConceptTitle}
                      onChange={(e) => setNewConceptTitle(e.target.value)}
                      placeholder="e.g., Graph Traversal"
                      style={styles.input}
                    />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={styles.label}>YouTube Video URL</label>
                    <input
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      placeholder="YouTube Video URL"
                      style={styles.input}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={styles.label}>Duration (mins)</label>
                      <input
                        type="number"
                        value={newDuration}
                        onChange={(e) => setNewDuration(e.target.value)}
                        style={styles.input}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={styles.label}>Passing Score (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newPassingScore}
                        onChange={(e) => setNewPassingScore(e.target.value)}
                        style={styles.input}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={styles.label}>Quiz Question</label>
                    <input
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Enter assessment question..."
                      style={styles.input}
                    />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={styles.label}>Options (comma separated)</label>
                    <input
                      value={newOptions}
                      onChange={(e) => setNewOptions(e.target.value)}
                      placeholder="Option A, Option B, Option C"
                      style={styles.input}
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={styles.label}>Correct Option Index (0 = 1st, 1 = 2nd, 2 = 3rd)</label>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      value={newCorrectIdx}
                      onChange={(e) => setNewCorrectIdx(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#0f172a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '13.5px',
                      cursor: 'pointer'
                    }}
                  >
                    Create Concept Node
                  </button>
                </form>
              </div>
            </div>
          )}
        </aside>
      </div>
      <AiChatWidget
        selectedConcept={selectedConcept}
        currentUser={currentUser}
        isQuizActive={isQuizActive}
      />
    </div>
  );
}