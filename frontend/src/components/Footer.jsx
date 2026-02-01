import React from "react";
import {
  AlertCircle,
  Facebook,
  Twitter,
  Instagram,
  Mail,
  Phone,
  MapPin,
  Github,
  Linkedin,
} from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                <img src="/connection.png" alt="logo" width={42} height={42} />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                CrisisConnect
              </span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
              Real-time emergency response system powered by AI. Detect,
              coordinate, and respond to crises instantly to save lives.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Platform</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>
                <Link
                  to="/"
                  className="hover:text-blue-600 transition-colors font-medium"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/reporter"
                  className="hover:text-blue-600 transition-colors font-medium"
                >
                  Report Crisis
                </Link>
              </li>
              <li>
                <Link
                  to="/agency"
                  className="hover:text-blue-600 transition-colors font-medium"
                >
                  Agency Portal
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-blue-600 transition-colors font-medium"
                >
                  Live Map
                </a>
              </li>
              <li>
                <Link
                  to="/news"
                  className="hover:text-blue-600 transition-colors font-medium"
                >
                  Crisis News
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>
                <Link
                  to="/contact"
                  className="hover:text-blue-600 transition-colors font-medium"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-blue-600 transition-colors font-medium"
                >
                  Help Center
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-blue-600 transition-colors font-medium"
                >
                  Safety Guidelines
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-blue-600 transition-colors font-medium"
                >
                  FAQs
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-blue-600 transition-colors font-medium"
                >
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-center gap-3 hover:text-blue-600 transition-colors">
                <Mail size={16} className="text-blue-600 flex-shrink-0" />
                <a href="mailto:support@crisisalert.com">
                  support@crisisalert.com
                </a>
              </li>
              <li className="flex items-center gap-3 hover:text-blue-600 transition-colors">
                <Phone size={16} className="text-blue-600 flex-shrink-0" />
                <a href="tel:+1-800-CRISIS-1">+1-800-CRISIS-1</a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin
                  size={16}
                  className="text-blue-600 flex-shrink-0 mt-0.5"
                />
                <span>
                  123 Emergency St,
                  <br />
                  Mumbai, India 400001
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 pt-8">
          {/* Legal Links */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
              <a
                href="#"
                className="hover:text-blue-600 transition-colors font-medium"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="hover:text-blue-600 transition-colors font-medium"
              >
                Terms of Service
              </a>
              <a
                href="#"
                className="hover:text-blue-600 transition-colors font-medium"
              >
                Cookie Policy
              </a>
              <a
                href="#"
                className="hover:text-blue-600 transition-colors font-medium"
              >
                Security
              </a>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <p className="text-xs text-gray-500 font-medium">
                © {currentYear} CrisisAlert. All rights reserved. | Saving lives
                through real-time emergency response
              </p>
            </div>

            {/* Social Links */}
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-blue-600 text-gray-600 hover:text-white transition-all flex items-center justify-center"
                aria-label="Facebook"
              >
                <Facebook size={18} />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-blue-400 text-gray-600 hover:text-white transition-all flex items-center justify-center"
                aria-label="Twitter"
              >
                <Twitter size={18} />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-pink-600 text-gray-600 hover:text-white transition-all flex items-center justify-center"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-800 text-gray-600 hover:text-white transition-all flex items-center justify-center"
                aria-label="GitHub"
              >
                <Github size={18} />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-blue-700 text-gray-600 hover:text-white transition-all flex items-center justify-center"
                aria-label="LinkedIn"
              >
                <Linkedin size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
