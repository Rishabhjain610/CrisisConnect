import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ShieldAlert, Activity, Map, Mic, Zap,
  ArrowRight, Users, Radio, Globe, CheckCircle2
} from 'lucide-react';
import { BackgroundRippleEffect } from '../components/ui/background-ripple-effect';

const Home = () => {
  const { userData } = useSelector((state) => state.user);

  // Dynamic Dashboard Link based on Role
  const getDashboardLink = () => {
    if (!userData) return '/login';
    if (userData.role === 'agency') return '/agencyhome';
    if (userData.role === 'coordinator') return '/coordinatorhome';
    return '/citizenhome';
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900">

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 px-6 lg:px-8 overflow-hidden">
        {/* Background Decorative Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-br from-blue-50 to-purple-50 rounded-full blur-3xl opacity-60 -z-10" />

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
            <Radio size={14} className="animate-pulse" />
            Live Crisis Response System
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-zinc-900 tracking-tight mb-6 leading-tight">
            Faster Response. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Smarter Coordination.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Connecting citizens, agencies, and ground coordinators in real-time.
            Report emergencies via Voice or Image and get help instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {userData ? (
              <Link
                to={getDashboardLink()}
                className="w-full sm:w-auto px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-bold transition-all shadow-xl shadow-zinc-200 flex items-center justify-center gap-2"
              >
                Go to Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  Get Started <ArrowRight size={18} />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-4 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-2xl font-bold transition-all flex items-center justify-center"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* --- STATS BANNER --- */}
      <div className="border-y border-zinc-100 bg-zinc-50/50">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <p className="text-3xl font-extrabold text-zinc-900">2.4s</p>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-1">Avg. Response Time</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-zinc-900">98%</p>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-1">AI Accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-zinc-900">24/7</p>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-1">System Uptime</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-zinc-900">50km</p>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-1">Coverage Radius</p>
          </div>
        </div>
      </div>

      {/* --- FEATURES GRID --- */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">Powered by Next-Gen Tech</h2>
            <p className="text-zinc-500 max-w-lg mx-auto">
              We leverage geolocation, AI transcription, and smart resource allocation to save lives.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-6">
                <Mic size={24} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Voice SOS Analysis</h3>
              <p className="text-zinc-500 leading-relaxed">
                Just speak. Our AI transcribes your emergency, detects severity, and alerts the nearest responders instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Smart Dispatch</h3>
              <p className="text-zinc-500 leading-relaxed">
                Agencies can request specific resources (Ambulance, Firetruck) from nearby Coordinators with a single click.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-6">
                <Map size={24} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Live Geo-Tracking</h3>
              <p className="text-zinc-500 leading-relaxed">
                Real-time map visualization of incidents and resources ensures help reaches the exact location.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS (Timeline) --- */}
      <section className="py-24 bg-zinc-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900">How It Works</h2>
          </div>

          <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-300 before:to-transparent">

            {/* Step 1 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-zinc-200 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                <ShieldAlert size={18} className="text-zinc-500" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
                <div className="font-bold text-zinc-900 mb-1">1. Report Incident</div>
                <div className="text-zinc-500 text-sm">Citizen reports via Voice SOS or uploads an image. AI verifies the details.</div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                <Zap size={18} className="text-white" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
                <div className="font-bold text-zinc-900 mb-1">2. Agency Activation</div>
                <div className="text-zinc-500 text-sm">Nearby Agencies receive the alert and Activate the mission.</div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-zinc-200 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                <CheckCircle2 size={18} className="text-zinc-500" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
                <div className="font-bold text-zinc-900 mb-1">3. Resource Deployment</div>
                <div className="text-zinc-500 text-sm">Coordinators accept requests and deploy Ambulances/Rescue Teams to the field.</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-zinc-900 rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden">
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 blur-[100px] opacity-20 rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 blur-[100px] opacity-20 rounded-full pointer-events-none" />
          <BackgroundRippleEffect />
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 relative z-10">
            Ready to make a difference?
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto mb-10 text-lg relative z-10">
            Join the network of Citizens, Agencies, and Coordinators building a safer tomorrow.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
            {!userData && (
              <Link to="/signup" className="px-8 py-4 bg-white text-zinc-900 rounded-2xl font-bold hover:bg-zinc-100 transition-colors">
                Join as Citizen
              </Link>
            )}
            <Link to="/contact" className="px-8 py-4 bg-zinc-800 text-white border border-zinc-700 rounded-2xl font-bold hover:bg-zinc-700 transition-colors">
              Contact Support
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;