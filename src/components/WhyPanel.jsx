import { useState } from 'react';
import { motion } from 'framer-motion';
import Parts from './Parts.jsx';

const TONE = { idle: 'border-slate-300 dark:border-zinc-600', call: 'border-amber-400', line: 'border-green-500', ret: 'border-sky-500', error: 'border-red-500', predict: 'border-violet-500' };
const TAG = { idle: 'text-slate-500 dark:text-zinc-400', call: 'text-amber-700 dark:text-amber-300', line: 'text-green-700 dark:text-green-400', ret: 'text-sky-700 dark:text-sky-300', error: 'text-red-700 dark:text-red-300', predict: 'text-violet-700 dark:text-violet-300' };

function Predict({ onAnswer, onSkip }) {
  const [v, setV] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onAnswer(v); }} className="mt-2">
      <p className="text-sm text-slate-600 dark:text-zinc-300">Use the paused frames and the pending expression to work it out, then check.</p>
      <div className="mt-3 flex gap-2">
        <input className="field flex-1" autoFocus autoComplete="off" value={v} onChange={(e) => setV(e.target.value)} aria-label="Your prediction" placeholder="your answer" maxLength={60} />
        <button className="btn btn-primary" type="submit">Check</button>
        <button className="btn" type="button" onClick={onSkip}>Skip</button>
      </div>
    </form>
  );
}

export default function WhyPanel({ desc, stepKey, prediction, feedback, error }) {
  const kind = prediction ? 'predict' : desc.kind;
  return (
    <section aria-live="polite" className={`card min-h-[140px] border-l-4 ${TONE[kind]}`}>
      <motion.div key={prediction ? 'p' + prediction.idx : stepKey} initial={{ opacity: 0.2, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          <p className={`eyebrow ${TAG[kind]}`}>{prediction ? 'Predict' : desc.title}</p>
          {prediction ? (
            <>
              <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">What will <code className="rounded-md bg-green-50 dark:bg-green-950/50 px-1.5 font-mono text-green-800 dark:text-green-300">{prediction.label}</code> return?</h3>
              <Predict onAnswer={prediction.onAnswer} onSkip={prediction.onSkip} />
            </>
          ) : <p className="mt-1.5 leading-relaxed text-slate-700 dark:text-zinc-200"><Parts parts={desc.parts} /></p>}
      </motion.div>
      {feedback && <p className={`mt-3 rounded-md px-3 py-2 text-sm ${feedback.ok ? 'bg-green-50 dark:bg-green-950/50 text-green-900 dark:text-green-200' : 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200'}`}>{feedback.ok ? '✔ ' : '✘ '}{feedback.text}</p>}
      {error && <p className="mt-3 rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-900 dark:text-red-200">Your code threw: {error}</p>}
    </section>
  );
}
