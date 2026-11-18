import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, X, Send, Sparkles, Bot } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AiChatWidget({ selectedConcept, currentUser, isQuizActive }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: 'Hi! I am your FootPrint AI Tutor. Ask me anything about the selected concept, code examples, or prerequisite topics.'
    }
  ]);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Automatically close & hide chatbot during a proctored quiz
  if (isQuizActive) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const updatedMessages = [...messages, { role: 'user', text: trimmed }];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${API}/ai/chat`, {
        message: trimmed,
        history: updatedMessages.slice(-8), // send recent conversation turns
        context: {
          role: currentUser?.role,
          isQuizActive,
          conceptTitle: selectedConcept?.title,
          conceptDescription: selectedConcept?.description,
          conceptStatus: selectedConcept?.status,
          missingPrereqs: (selectedConcept?.missingPrereqs || []).map((m) => m.title)
        }
      });

      setMessages((prev) => [...prev, { role: 'model', text: res.data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: err.response?.data?.error || 'Could not reach Gemini AI. Check your backend API key.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '450px', zIndex: 40, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #4353ff, #6d28d9)',
            color: 'white',
            border: 'none',
            padding: '12px 18px',
            borderRadius: '999px',
            fontWeight: 700,
            fontSize: '13.5px',
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(67, 83, 255, 0.35)'
          }}
        >
          <Sparkles size={16} />
          <span>Ask AI Tutor</span>
        </button>
      ) : (
        <div
          style={{
            width: '350px',
            height: '460px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 35px -5px rgba(15, 23, 42, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
              color: 'white',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} color="#93c5fd" />
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700 }}>FootPrint AI Tutor</div>
                <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                  {selectedConcept ? `Topic: ${selectedConcept.title}` : 'Powered by Gemini'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '14px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '84%',
                  padding: '9px 12px',
                  borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: m.role === 'user' ? '#4353ff' : '#ffffff',
                  color: m.role === 'user' ? '#ffffff' : '#1e293b',
                  border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                  fontSize: '13px',
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', fontSize: '12px', color: '#64748b', padding: '4px 8px' }}>
                Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', padding: '10px 12px', borderTop: '1px solid #e2e8f0', background: 'white' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedConcept ? `Ask about ${selectedConcept.title}...` : 'Ask a coding question...'}
              style={{
                flex: 1,
                padding: '9px 11px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: '#4353ff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading || !input.trim() ? 0.6 : 1
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}