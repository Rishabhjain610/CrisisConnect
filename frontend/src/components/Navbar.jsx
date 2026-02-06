// "use client";
// import React, { useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { useSelector } from "react-redux";
// import clsx from "clsx";
// import {
//   IoHomeOutline,
//   IoPeopleOutline,
//   IoListOutline,
//   IoMapOutline,
//   IoGridOutline,
//   IoCubeOutline,
// } from "react-icons/io5";
// import { AlertCircle, Menu, X } from "lucide-react";
// import LoginButton from "./LoginButton";
// import Language from "./Language";
// const Navbar = () => {
//   const [isOpen, setIsOpen] = useState(false);
//   const { userData } = useSelector((state) => state.user);
//   const location = useLocation();

//   // --- Dynamic nav links per role ---
//   let navLinks = [];

//   if (!userData) {
//     navLinks = [
//       { name: "Home", href: "/", icon: <IoHomeOutline size={20} /> },
//       { name: "Crises", href: "/crises", icon: <IoMapOutline size={20} /> },
//       { name: "Contact", href: "/contact", icon: <IoListOutline size={20} /> },
//     ];
//   } else if (userData.role === "citizen") {
//     navLinks = [
//       { name: "Dashboard", href: "/citizen/dashboard", icon: <IoHomeOutline size={20} /> },
//       { name: "Report", href: "/sos", icon: <AlertCircle size={20} /> },
//       { name: "My Incidents", href: "/citizenincidents", icon: <IoListOutline size={20} /> },
//       { name: "Map", href: "/map", icon: <IoMapOutline size={20} /> },
//     ];
//   } else if (userData.role === "agency") {
//     navLinks = [
//       { name: "Dashboard", href: "/agency/dashboard", icon: <IoHomeOutline size={20} /> },
//       { name: "Analytics", href: "/agency/analytics", icon: <IoPeopleOutline size={20} /> },
//     ];
//   } else if (userData.role === "coordinator") {
//     navLinks = [
//       { name: "Dashboard", href: "/coordinator/dashboard", icon: <IoGridOutline size={18} /> },
//       { name: "Inventory", href: "/coordinator/manage", icon: <IoCubeOutline size={18} /> },
//     ];
//   }

//   return (
//     <>
//       {/* Main Navbar - Fixed Position, No Scroll Hide */}
//       <nav
//         className={clsx(
//           "fixed z-50 w-[95%] md:w-[90%] lg:w-[85%] top-4 rounded-2xl -translate-x-1/2 left-1/2",
//           "border border-gray-200 bg-white/95 backdrop-blur-xl shadow-lg",
//           "transition-all duration-300 ease-in-out"
//         )}
//       >
//         <div className="flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">

//           {/* Logo */}
//           <Link to="/" className="flex items-center gap-1 group">
//             <div className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:shadow-blue-500/50 transition-all">
//               <img src="/connection.png" alt="logo" width={42} height={42} />
//             </div>
//             <span className="text-gray-900 font-bold text-lg hidden sm:inline-block group-hover:text-blue-600 transition">
//               CrisisConnect
//             </span>
//           </Link>

//           {/* Desktop Menu - Hidden on Mobile/Tablet */}
//           <div className="hidden lg:flex items-center gap-1">
//             {navLinks.map((link) => (
//               <Link
//                 key={link.name}
//                 to={link.href}
//                 className={clsx(
//                   "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
//                   location.pathname === link.href
//                     ? "bg-blue-100 text-blue-700"
//                     : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
//                 )}
//               >
//                 {link.icon}
//                 <span>{link.name}</span>
//               </Link>
//             ))}
//           </div>

//           {/* Right Side Actions */}
//           <div className="flex items-center gap-3">

//             {/* Desktop User Info & Login - Hidden on Mobile/Tablet */}
//             <div className="hidden lg:flex items-center gap-3">
//               {userData && (
//                 <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-100 border border-gray-200">
//                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
//                   <span className="text-xs font-light text-gray-600 font-medium capitalize">
//                     {userData.name || userData.email?.split("@")[0]}
//                   </span>
//                   <span className="text-xs text-blue-600 capitalize px-2 py-0.5 rounded-md bg-blue-100 font-semibold">
//                     {userData.role}
//                   </span>
//                 </div>
//               )}
//               <LoginButton />
//             </div>

//             {/* Mobile Toggle - Visible ONLY on Mobile/Tablet */}
//             <button
//               onClick={() => setIsOpen(!isOpen)}
//               type="button"
//               className="lg:hidden relative z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-all"
//               aria-controls="mobile-menu"
//               aria-expanded={isOpen}
//             >
//               <span className="sr-only">Toggle menu</span>
//               {isOpen ? <X size={24} /> : <Menu size={24} />}
//             </button>
//           </div>

//         </div>
//       </nav>

//       {/* Mobile Overlay */}
//       <div
//         className={clsx(
//           "fixed inset-0 z-40 lg:hidden transition-opacity duration-300 bg-black/30 backdrop-blur-sm",
//           isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
//         )}
//         onClick={() => setIsOpen(false)}
//       />

//       {/* Mobile Menu Dropdown */}
//       <div
//         className={clsx(
//           "fixed left-1/2 top-24 z-50 w-[95%] sm:w-[85%] -translate-x-1/2 rounded-2xl",
//           "border border-gray-200 bg-white/95 backdrop-blur-xl shadow-xl",
//           "transition-all duration-300 ease-out lg:hidden",
//           isOpen
//             ? "opacity-100 translate-y-0 scale-100"
//             : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
//         )}
//       >
//         <div className="p-6">
//           {/* Mobile User Info */}
//           {userData && (
//             <div className="pb-4 mb-4 border-b border-gray-200">
//               <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Logged in as</p>
//               <p className="text-gray-900 font-bold capitalize mt-1">
//                 {userData.name || userData.email}
//               </p>
//               <span className="inline-block text-xs text-blue-600 capitalize mt-2 px-2.5 py-1 rounded-md bg-blue-100 font-semibold">
//                 {userData.role}
//               </span>
//             </div>
//           )}

//           {/* Mobile Nav Links */}
//           <nav className="flex flex-col gap-1.5">
//             {navLinks.map((link, index) => (
//               <Link
//                 key={link.name}
//                 to={link.href}
//                 onClick={() => setIsOpen(false)}
//                 className={clsx(
//                   "flex items-center justify-between rounded-lg p-3 transition-all duration-200",
//                   "transform",
//                   location.pathname === link.href
//                     ? "bg-blue-100 text-blue-700 font-semibold"
//                     : "text-gray-700 hover:bg-gray-100 hover:text-blue-600",
//                   isOpen
//                     ? "translate-x-0 opacity-100"
//                     : "translate-x-4 opacity-0"
//                 )}
//                 style={{
//                   transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
//                 }}
//               >
//                 <div className="flex items-center gap-3">
//                   <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600 border border-zinc-100">
//                     {link.icon}
//                   </div>
//                   <span className="font-medium">{link.name}</span>
//                 </div>
//                 <span
//                   className={clsx(
//                     "h-2 w-2 rounded-full bg-blue-600 transition-all duration-200",
//                     location.pathname === link.href
//                       ? "opacity-100 scale-100"
//                       : "opacity-0 scale-75"
//                   )}
//                 />
//               </Link>
//             ))}
//           </nav>

//           {/* Mobile Login Button */}
//           <div className="pt-4 mt-4 border-t border-gray-200 flex justify-center">
//             <LoginButton />
//           </div>

//           {/* Footer */}
//           {/* <div className="pt-4 mt-4 border-t border-gray-200">
//             <p className="text-xs text-gray-500 text-center font-medium">
//               CrisisConnect © 2026 • Real-time Emergency Response
//             </p>
//           </div> */}
//         </div>
//       </div>
//     </>
//   );
// };

// export default Navbar;
"use client";
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import clsx from "clsx";
import {
  IoHomeOutline,
  IoPeopleOutline,
  IoListOutline,
  IoMapOutline,
  IoGridOutline,
  IoCubeOutline,
} from "react-icons/io5";
import { AlertCircle, Menu, X, Globe } from "lucide-react";
import LoginButton from "./LoginButton";
import Language from "./Language";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const { userData } = useSelector((state) => state.user);
  const location = useLocation();

  // --- Dynamic nav links per role ---
  let navLinks = [];

  if (!userData) {
    navLinks = [
      { name: "Home", href: "/", icon: <IoHomeOutline size={20} /> },
      { name: "Crises", href: "/crises", icon: <IoMapOutline size={20} /> },
      { name: "Contact", href: "/contact", icon: <IoListOutline size={20} /> },
    ];
  } else if (userData.role === "citizen") {
    navLinks = [
      { name: "Dashboard", href: "/citizen/dashboard", icon: <IoHomeOutline size={20} /> },
      { name: "Report", href: "/sos", icon: <AlertCircle size={20} /> },
      { name: "My Incidents", href: "/citizenincidents", icon: <IoListOutline size={20} /> },
      { name: "Map", href: "/map", icon: <IoMapOutline size={20} /> },
    ];
  } else if (userData.role === "agency") {
    navLinks = [
      { name: "Dashboard", href: "/agency/dashboard", icon: <IoHomeOutline size={20} /> },
      { name: "Analytics", href: "/agency/analytics", icon: <IoPeopleOutline size={20} /> },
    ];
  } else if (userData.role === "coordinator") {
    navLinks = [
      { name: "Dashboard", href: "/coordinator/dashboard", icon: <IoGridOutline size={18} /> },
      { name: "Inventory", href: "/coordinator/manage", icon: <IoCubeOutline size={18} /> },
    ];
  }

  return (
    <>
      {/* Main Navbar - Fixed Position, No Scroll Hide */}
      <nav
        className={clsx(
          "fixed z-50 w-[95%] md:w-[90%] lg:w-[85%] top-4 rounded-2xl -translate-x-1/2 left-1/2",
          "border border-gray-200 bg-white/95 backdrop-blur-xl shadow-lg",
          "transition-all duration-300 ease-in-out"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-1 group">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:shadow-blue-500/50 transition-all">
              <img src="https://res.cloudinary.com/dkpgnq7ym/image/upload/v1770376030/connection_ilu3aa.png" alt="logo" width={42} height={42} />
            </div>
            <span className="text-gray-900 font-bold text-lg hidden sm:inline-block group-hover:text-blue-600 transition">
              CrisisConnect
            </span>
          </Link>

          {/* Desktop Menu - Hidden on Mobile/Tablet */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={clsx(
                  "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                  location.pathname === link.href
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                )}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">

            {/* Language Selector - Desktop Version */}
            <div className="hidden md:block relative">
              <button
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                className={clsx(
                  "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                  "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                )}
              >
                <Globe size={20} />
              </button>

              {/* Language Dropdown */}
              {isLanguageOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white/95 backdrop-blur-xl shadow-lg p-3">
                  <Language />
                </div>
              )}
            </div>

            {/* Desktop User Info & Login - Hidden on Mobile/Tablet */}
            <div className="hidden lg:flex items-center gap-3">
              {userData && (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-100 border border-gray-200">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-light text-gray-600 font-medium capitalize">
                    {userData.name || userData.email?.split("@")[0]}
                  </span>
                  <span className="text-xs text-blue-600 capitalize px-2 py-0.5 rounded-md bg-blue-100 font-semibold">
                    {userData.role}
                  </span>
                </div>
              )}
              <LoginButton />
            </div>

            {/* Mobile Toggle - Visible ONLY on Mobile/Tablet */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="lg:hidden relative z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-all"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Toggle menu</span>
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>
      </nav>

      {/* Mobile Overlay */}
      <div
        className={clsx(
          "fixed inset-0 z-40 lg:hidden transition-opacity duration-300 bg-black/30 backdrop-blur-sm",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Menu Dropdown */}
      <div
        className={clsx(
          "fixed left-1/2 top-24 z-50 w-[95%] sm:w-[85%] -translate-x-1/2 rounded-2xl",
          "border border-gray-200 bg-white/95 backdrop-blur-xl shadow-xl",
          "transition-all duration-300 ease-out lg:hidden",
          isOpen
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
        )}
      >
        <div className="p-6">
          {/* Mobile User Info */}
          {userData && (
            <div className="pb-4 mb-4 border-b border-gray-200">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Logged in as</p>
              <p className="text-gray-900 font-bold capitalize mt-1">
                {userData.name || userData.email}
              </p>
              <span className="inline-block text-xs text-blue-600 capitalize mt-2 px-2.5 py-1 rounded-md bg-blue-100 font-semibold">
                {userData.role}
              </span>
            </div>
          )}

          {/* Mobile Nav Links */}
          <nav className="flex flex-col gap-1.5">
            {navLinks.map((link, index) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={() => setIsOpen(false)}
                className={clsx(
                  "flex items-center justify-between rounded-lg p-3 transition-all duration-200",
                  "transform",
                  location.pathname === link.href
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-100 hover:text-blue-600",
                  isOpen
                    ? "translate-x-0 opacity-100"
                    : "translate-x-4 opacity-0"
                )}
                style={{
                  transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600 border border-zinc-100">
                    {link.icon}
                  </div>
                  <span className="font-medium">{link.name}</span>
                </div>
                <span
                  className={clsx(
                    "h-2 w-2 rounded-full bg-blue-600 transition-all duration-200",
                    location.pathname === link.href
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-75"
                  )}
                />
              </Link>
            ))}
          </nav>

          {/* Mobile Language Selector */}
          <div className="pt-4 mt-4 border-t border-gray-200 mb-4">
            <button
              onClick={() => setIsLanguageOpen(!isLanguageOpen)}
              className="w-full flex items-center justify-center gap-2 rounded-lg p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-all"
            >
              <Globe size={20} />
              <span>Select Language</span>
            </button>

            {/* Mobile Language Dropdown */}
            {isLanguageOpen && (
              <div className="mt-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
                <Language />
              </div>
            )}
          </div>

          {/* Mobile Login Button */}
          <div className="flex justify-center border-t border-gray-200 pt-4">
            <LoginButton />
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;