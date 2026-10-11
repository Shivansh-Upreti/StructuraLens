import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import Navbar from './platform/components/Navbar.jsx';
import Footer from './platform/components/Footer.jsx';
import Landing from './platform/components/Landing.jsx';
import { MODULES } from './platform/algorithms/index.js';
import { topicById } from './platform/topics.js';
import { href, useRoute } from './platform/router.js';

// Recursion keeps its original, fully-featured interface; it is code-split so other pages stay light.
const RecursionPage = lazy(() => import('./modules/recursion/RecursionPage.jsx'));
const AlgoPage = lazy(() => import('./platform/components/AlgoPage.jsx'));

function Fallback() {
  return <p className="py-24 text-center text-slate-400 dark:text-zinc-500">Loading…</p>;
}

function NotFound({ route }) {
  const t = topicById(route);
  return (
    <div className="mx-auto max-w-[900px] px-5 py-24 text-center">
      <h1 className=" text-4xl font-semibold text-slate-900 dark:text-white">{t ? `${t.title} is coming soon` : 'Page not found'}</h1>
      <p className="mt-3 text-slate-600 dark:text-zinc-300">{t ? 'This topic is on the roadmap but has no interactive module yet.' : 'That topic does not exist.'}</p>
      <a href={href('')} className="btn btn-primary mt-6 !rounded-md">← Back to all topics</a>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  let page;
  if (route === '') page = <Landing />;
  else if (route === 'recursion') page = <RecursionPage />;
  else if (MODULES[route]) page = <AlgoPage key={route} moduleId={route} />;
  else page = <NotFound route={route} />;
  return (
    <div className="min-h-screen">
      <Navbar route={route} />
      <Suspense fallback={<Fallback />}>
        <motion.div key={route} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>{page}</motion.div>
      </Suspense>
      {!MODULES[route] && <Footer />}
    </div>
  );
}
