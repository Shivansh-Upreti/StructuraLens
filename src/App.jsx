import { Component, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import Navbar from './platform/components/Navbar.jsx';
import Footer from './platform/components/Footer.jsx';
import Landing from './platform/components/Landing.jsx';
import OrientationGuard from './platform/components/OrientationGuard.jsx';
import { PageSkeleton } from './platform/components/Skeleton.jsx';
import { MODULES } from './platform/algorithms/index.js';
import { topicById } from './platform/topics.js';
import { href, useRoute } from './platform/router.js';

// Recursion keeps its original, fully-featured interface; it is code-split so other pages stay light.
const RecursionPage = lazy(() => import('./modules/recursion/RecursionPage.jsx'));
const AlgoPage = lazy(() => import('./platform/components/AlgoPage.jsx'));

function Fallback() {
  return <PageSkeleton />;
}

/* A lazy chunk can fail to load (offline, or an old tab after a redeploy changed the file hashes). */
class ChunkBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="mx-auto max-w-[640px] px-5 py-24">
        <p className="eyebrow prompt">load error</p>
        <p className="mt-3 text-slate-700 dark:text-fg">This part of the app could not be loaded. The site may have been updated since this tab was opened.</p>
        <button type="button" className="btn btn-primary mt-5" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}

function NotFound({ route }) {
  const t = topicById(route);
  return (
    <div className="mx-auto max-w-[900px] px-5 py-24 text-center">
      <h1 className="text-3xl font-semibold text-slate-900 dark:text-fg">{t ? `${t.title} is coming soon` : 'Page not found'}</h1>
      <p className="mt-3 text-slate-600 dark:text-zinc-300">{t ? 'This topic is on the roadmap but has no interactive module yet.' : 'That topic does not exist.'}</p>
      <a href={href('')} className="btn btn-primary mt-6">Back to all topics</a>
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
      <OrientationGuard />
      <Navbar route={route} />
      <ChunkBoundary key={route}>
        <Suspense fallback={<Fallback />}>
          <motion.div key={route} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>{page}</motion.div>
        </Suspense>
      </ChunkBoundary>
      {!MODULES[route] && <Footer />}
    </div>
  );
}
