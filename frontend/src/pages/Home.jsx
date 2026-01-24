import React from 'react'
import { ArrowRight, AlertCircle, MapPin, Radio, Zap, Shield, Users, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2">
              <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
              <span className="text-sm font-medium text-blue-600">Real-time Crisis Detection</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">
              Real-time Emergency<br />
              <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Response System</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Detect crises as they happen. AI-powered incident detection, instant reporting, and coordinated emergency response. Save lives in real-time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/reporter" className="group px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-3 text-lg shadow-lg hover:shadow-xl">
              Report an Emergency
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </Link>
            <Link to="/agency" className="px-8 py-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition font-semibold flex items-center gap-3 text-lg">
              Agency Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 md:gap-8 pt-12 border-t border-gray-200">
            <div className="space-y-2">
              <p className="text-3xl md:text-4xl font-bold text-blue-600">99.9%</p>
              <p className="text-gray-600 text-sm md:text-base">Uptime</p>
            </div>
            <div className="space-y-2">
              <p className="text-3xl md:text-4xl font-bold text-blue-600">&lt;30s</p>
              <p className="text-gray-600 text-sm md:text-base">Response Time</p>
            </div>
            <div className="space-y-2">
              <p className="text-3xl md:text-4xl font-bold text-blue-600">1000+</p>
              <p className="text-gray-600 text-sm md:text-base">Agencies</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">Powerful Features</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Everything you need to respond to emergencies faster</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature 1 */}
            <div className="group bg-white p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition space-y-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition">
                <Radio className="w-6 h-6 text-blue-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Live Incident Detection</h3>
              <p className="text-gray-600">AI-powered voice and image recognition to detect crises in real-time with high accuracy</p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition space-y-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition">
                <MapPin className="w-6 h-6 text-blue-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Geo-Located Intelligence</h3>
              <p className="text-gray-600">Pinpoint incident locations on tactical maps with real-time crisis tracking and clustering</p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition space-y-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition">
                <Users className="w-6 h-6 text-blue-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Multi-Agency Coordination</h3>
              <p className="text-gray-600">Connect agencies instantly with shared incident data and coordinated response protocols</p>
            </div>

            {/* Feature 4 */}
            <div className="group bg-white p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition space-y-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition">
                <Zap className="w-6 h-6 text-blue-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Smart Resource Dispatch</h3>
              <p className="text-gray-600">Automatically allocate medical, rescue, and police resources based on incident severity</p>
            </div>

            {/* Feature 5 */}
            <div className="group bg-white p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition space-y-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition">
                <Shield className="w-6 h-6 text-blue-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Trust Scoring</h3>
              <p className="text-gray-600">ML-based validation system filters spam and assigns credibility scores to all reports</p>
            </div>

            {/* Feature 6 */}
            <div className="group bg-white p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition space-y-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition">
                <TrendingUp className="w-6 h-6 text-blue-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Crisis Analytics</h3>
              <p className="text-gray-600">Historical data analysis and crisis pattern recognition for predictive emergency management</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Three simple steps to save lives</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">1</div>
                <div className="hidden md:block flex-1 h-1 bg-gray-200 mx-4"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Report</h3>
              <p className="text-gray-600">Citizens call or upload images to report emergencies with automatic location detection</p>
              <div className="pt-4 text-blue-600 font-semibold">🎤 Voice & 📷 Image</div>
            </div>

            {/* Step 2 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">2</div>
                <div className="hidden md:block flex-1 h-1 bg-gray-200 mx-4"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Verify</h3>
              <p className="text-gray-600">AI analyzes reports, validates incident type, calculates trust score, filters spam</p>
              <div className="pt-4 text-blue-600 font-semibold">🤖 ML Processing</div>
            </div>

            {/* Step 3 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">3</div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Respond</h3>
              <p className="text-gray-600">Agencies receive instant notifications and dispatch resources automatically to the location</p>
              <div className="pt-4 text-blue-600 font-semibold">🚨 Live Dispatch</div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section id="impact" className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600 text-white">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">Real Impact</h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">Saving lives through instant crisis response</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <p className="text-4xl font-bold">50%</p>
              <p className="text-blue-100">Faster Response</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl font-bold">80%</p>
              <p className="text-blue-100">More Accurate</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl font-bold">100%</p>
              <p className="text-blue-100">24/7 Available</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl font-bold">∞</p>
              <p className="text-blue-100">Lives Saved</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">Ready to Respond?</h2>
            <p className="text-xl text-gray-600">Join thousands of agencies saving lives every day</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/reporter" className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-lg">
              Report Emergency Now
            </Link>
            <Link to="/agency" className="w-full sm:w-auto px-8 py-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition font-semibold text-lg">
              View Agency Dashboard
            </Link>
          </div>

          <p className="text-gray-500 text-sm">Available 24/7 • All devices • Multiple languages</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-gray-900">CrisisAlert</span>
              </div>
              <p className="text-gray-600 text-sm">Real-time emergency response for everyone</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#features" className="hover:text-gray-900 transition">Features</a></li>
                <li><a href="#how" className="hover:text-gray-900 transition">How it Works</a></li>
                <li><a href="#impact" className="hover:text-gray-900 transition">Impact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Portals</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="/reporter" className="hover:text-gray-900 transition">Report Crisis</Link></li>
                <li><Link to="/agency" className="hover:text-gray-900 transition">Agency</Link></li>
                <li><Link to="/" className="hover:text-gray-900 transition">Home</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900 transition">Privacy</a></li>
                <li><a href="#" className="hover:text-gray-900 transition">Terms</a></li>
                <li><a href="#" className="hover:text-gray-900 transition">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-600">
            <p>&copy; 2024 CrisisAlert. All rights reserved.</p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <a href="#" className="hover:text-gray-900 transition">Twitter</a>
              <a href="#" className="hover:text-gray-900 transition">LinkedIn</a>
              <a href="#" className="hover:text-gray-900 transition">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home