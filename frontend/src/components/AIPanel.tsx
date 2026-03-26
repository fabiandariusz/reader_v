import { useState, useEffect } from 'react';
import { useAIStream } from '@/hooks/useAIStream';
import { aiApi, type QuizQuestion } from '@/api/ai';
import AIChat from './AIChat';

type Tab = 'summary' | 'concepts' | 'quiz' | 'chat';

interface Props {
  videoId: number;
}

export default function AIPanel({ videoId }: Props) {
  const [tab, setTab] = useState<Tab>('summary');

  return (
    <div className="ai-panel">
      <div className="ai-panel__tabs">
        {(['summary', 'concepts', 'quiz', 'chat'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`ai-tab${tab === t ? ' ai-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="ai-panel__body">
        {tab === 'summary'  && <SummaryTab  videoId={videoId} />}
        {tab === 'concepts' && <ConceptsTab videoId={videoId} />}
        {tab === 'quiz'     && <QuizTab     videoId={videoId} />}
        {tab === 'chat'     && <AIChat      videoId={videoId} />}
      </div>
    </div>
  );
}

// ── Summary tab ────────────────────────────────────────────────────────────

function SummaryTab({ videoId }: { videoId: number }) {
  const { text, loading, error, run, reset } = useAIStream();
  const [cached, setCached] = useState<string | null>(null);
  const [checkedCache, setCheckedCache] = useState(false);

  useEffect(() => {
    aiApi.getCachedSummary(videoId).then((s) => {
      if (s) setCached(s.content);
      setCheckedCache(true);
    });
  }, [videoId]);

  const generate = () => {
    setCached(null);
    run('summarize', { videoId });
  };

  const displayed = text || cached;

  if (!checkedCache) return <div className="spinner spinner--center" />;

  return (
    <div className="ai-section">
      <div className="ai-section__actions">
        <button
          className="btn btn--secondary btn--sm"
          onClick={generate}
          disabled={loading}
        >
          {loading ? 'Generating…' : cached ? '↺ Regenerate' : '✦ Generate Summary'}
        </button>
        {loading && (
          <button className="btn btn--ghost btn--sm" onClick={reset}>Cancel</button>
        )}
      </div>
      {error && <div className="error-banner">{error}</div>}
      {displayed ? (
        <div className={`ai-output${loading ? ' ai-streaming' : ''}`}>{displayed}</div>
      ) : !loading && (
        <div className="empty-state">
          <span className="empty-state__icon">✦</span>
          <p className="empty-state__text">Generate an AI summary based on your notes</p>
        </div>
      )}
    </div>
  );
}

// ── Concepts tab ───────────────────────────────────────────────────────────

function ConceptsTab({ videoId }: { videoId: number }) {
  const { text, loading, error, run, reset } = useAIStream();

  return (
    <div className="ai-section">
      <div className="ai-section__actions">
        <button
          className="btn btn--secondary btn--sm"
          onClick={() => run('concepts', { videoId })}
          disabled={loading}
        >
          {loading ? 'Extracting…' : '✦ Extract Key Concepts'}
        </button>
        {loading && (
          <button className="btn btn--ghost btn--sm" onClick={reset}>Cancel</button>
        )}
      </div>
      {error && <div className="error-banner">{error}</div>}
      {text ? (
        <div className={`ai-output${loading ? ' ai-streaming' : ''}`}
          dangerouslySetInnerHTML={{ __html: formatConcepts(text) }}
        />
      ) : !loading && (
        <div className="empty-state">
          <span className="empty-state__icon">◈</span>
          <p className="empty-state__text">Extract key concepts and terms from your notes</p>
        </div>
      )}
    </div>
  );
}

function formatConcepts(text: string): string {
  // Bold **term** → <strong>term</strong>
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

// ── Quiz tab ───────────────────────────────────────────────────────────────

function QuizTab({ videoId }: { videoId: number }) {
  const { text, loading, error, run, reset } = useAIStream();
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [answers,   setAnswers]   = useState<Record<number, string>>({});
  const [revealed,  setRevealed]  = useState<Record<number, boolean>>({});
  const [checkedCache, setCheckedCache] = useState(false);

  useEffect(() => {
    aiApi.getCachedQuiz(videoId).then((q) => {
      if (q?.questions?.length) setQuestions(q.questions);
      setCheckedCache(true);
    });
  }, [videoId]);

  const generate = () => {
    setQuestions(null);
    setAnswers({});
    setRevealed({});
    run('quiz', { videoId }, (full) => {
      try {
        const match = full.match(/\[[\s\S]*\]/);
        if (match) setQuestions(JSON.parse(match[0]));
      } catch {
        // show raw text fallback
      }
    });
  };

  if (!checkedCache) return <div className="spinner spinner--center" />;

  return (
    <div className="ai-section">
      <div className="ai-section__actions">
        <button
          className="btn btn--secondary btn--sm"
          onClick={generate}
          disabled={loading}
        >
          {loading ? 'Generating…' : questions ? '↺ New Quiz' : '✦ Generate Quiz'}
        </button>
        {loading && (
          <button className="btn btn--ghost btn--sm" onClick={reset}>Cancel</button>
        )}
      </div>
      {error && <div className="error-banner">{error}</div>}

      {loading && !questions && (
        <div className="ai-output ai-streaming">{text}</div>
      )}

      {questions && (
        <div className="quiz">
          {questions.map((q, i) => (
            <div key={i} className="quiz-question">
              <p className="quiz-question__text">{i + 1}. {q.question}</p>
              <div className="quiz-options">
                {q.options.map((opt) => {
                  const selected = answers[i] === opt;
                  const isCorrect = opt === q.answer;
                  const show = revealed[i];
                  return (
                    <button
                      key={opt}
                      className={`quiz-option${selected ? ' quiz-option--selected' : ''}${show && isCorrect ? ' quiz-option--correct' : ''}${show && selected && !isCorrect ? ' quiz-option--wrong' : ''}`}
                      onClick={() => setAnswers((prev) => ({ ...prev, [i]: opt }))}
                      disabled={show}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {answers[i] && !revealed[i] && (
                <button
                  className="btn btn--ghost btn--sm"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => setRevealed((prev) => ({ ...prev, [i]: true }))}
                >
                  Check answer
                </button>
              )}
              {revealed[i] && (
                <p className={`quiz-result${answers[i] === q.answer ? ' quiz-result--correct' : ' quiz-result--wrong'}`}>
                  {answers[i] === q.answer ? '✓ Correct' : `✗ Correct answer: ${q.answer}`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!questions && !loading && (
        <div className="empty-state">
          <span className="empty-state__icon">?</span>
          <p className="empty-state__text">Generate quiz questions from your notes</p>
        </div>
      )}
    </div>
  );
}
