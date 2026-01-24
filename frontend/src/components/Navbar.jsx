// "use client";
// import React, { useState, useEffect } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { useSelector } from "react-redux";
// import clsx from "clsx";
// import {
//   IoHomeOutline,
//   IoPeopleOutline,
//   IoListOutline,
//   IoMapOutline,
//   IoSettingsOutline,
//   IoShieldCheckmarkOutline,
// } from "react-icons/io5";
// import LoginButton from "./LoginButton";

// const Navbar = () => {
//   const [isOpen, setIsOpen] = useState(false);
//   const { userData } = useSelector((state) => state.user);
//   const location = useLocation();
//   const [showNavbar, setShowNavbar] = useState(true);
//   const [lastScrollY, setLastScrollY] = useState(0);

//   useEffect(() => {
//   const handleScroll = () => {
//     if (window.scrollY > lastScrollY && window.scrollY > 80) {
//       setShowNavbar(false); // scrolling down
//     } else {
//       setShowNavbar(true); // scrolling up
//     }
//     setLastScrollY(window.scrollY);
//   };

//   window.addEventListener("scroll", handleScroll);
//   return () => window.removeEventListener("scroll", handleScroll);
// }, [lastScrollY]);



//   // --- Dynamic nav links per role ---
//   let navLinks = [];

//   if (!userData) {
//     navLinks = [
//       { name: "Home", href: "/", icon: <IoHomeOutline size={20} /> },
//       { name: "Crises Updates", href: "/crises", icon: <IoMapOutline size={20} /> },
//       { name: "Resources", href: "/resources", icon: <IoPeopleOutline size={20} /> },
//       { name: "Contact", href: "/contact", icon: <IoListOutline size={20} /> },
//     ];
//   } else if (userData.role === "citizen") {
//     navLinks = [
//       { name: "Dashboard", href: "/citizenhome", icon: <IoHomeOutline size={20} /> },
//       { name: "Report", href: "/sos", icon: <IoListOutline size={20} /> },
//       { name: "My Incidents", href: "/citizen/incidents", icon: <IoMapOutline size={20} /> },
//       { name: "Map", href: "/map", icon: <IoMapOutline size={20} /> },
//     ];
//   } else if (userData.role === "agency") {
//     navLinks = [
//       { name: "Dashboard", href: "/agencyhome", icon: <IoHomeOutline size={20} /> },
//       // { name: "Requests", href: "/agency/requests", icon: <IoListOutline size={20} /> },
//       { name: "Analytics", href: "/agency/resources", icon: <IoPeopleOutline size={20} /> },
//       // { name: "Teams", href: "/agency/teams", icon: <IoPeopleOutline size={20} /> },
//     ];
//   } else if (userData.role === "coordinator") {
//     navLinks = [
//       { name: "Dashboard", href: "/coordinatorhome", icon: <IoHomeOutline size={20} /> },
//       { name: "Manage", href: "/coordinator/manage", icon: <IoSettingsOutline size={20} /> },
//       { name: "Reports", href: "/coordinator/reports", icon: <IoListOutline size={20} /> },
//       { name: "Agencies", href: "/coordinator/agencies", icon: <IoPeopleOutline size={20} /> },
//     ];
//   }

//   return (
//     <>
//       {/* Main Navbar */}
//       <nav
//   className={clsx(
//     "fixed z-50 w-[95%] top-4 rounded-2xl -translate-x-1/2 left-1/2 border border-white/10 bg-black/50 backdrop-blur-xl",
//     "md:top-4 md:left-1/2 md:w-[85%] lg:w-[75%] md:-translate-x-1/2 lg:rounded-full",
//     "transition-transform duration-300 ease-in-out",
//     showNavbar ? "translate-y-0" : "-translate-y-[120%]"
//   )}
// >

//         <div className="flex h-16 items-center justify-between px-4 md:px-6">
//           {/* Logo */}
//           <Link to="/" className="flex items-center gap-2 group">
//             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-shadow">
//               <IoShieldCheckmarkOutline size={24} className="text-white" />
//             </div>
//             <span className="text-white font-bold text-lg hidden sm:block">
//               Crisis Response
//             </span>
//           </Link>

//           {/* Desktop Menu */}
//           <div className="hidden items-center gap-1 lg:flex">
//             {navLinks.map((link) => (
//               <Link
//                 key={link.name}
//                 to={link.href}
//                 className={clsx(
//                   "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-gray-300 transition-all hover:text-white hover:bg-white/10",
//                   location.pathname === link.href && "bg-white/15 text-white"
//                 )}
//               >
//                 {link.icon}
//                 <span>{link.name}</span>
//               </Link>
//             ))}
//           </div>

//           {/* Desktop User Section & Login Button */}
//           <div className="hidden lg:flex items-center gap-4">
//             {userData && (
//               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
//                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
//                 <span className="text-xs text-gray-400 capitalize">
//                   {userData.name?.split(' ')[0] || userData.email?.split('@')[0]}
//                 </span>
//                 <span className="text-xs text-blue-400 capitalize px-2 py-0.5 rounded-full bg-blue-500/10">
//                   {userData.role}
//                 </span>
//               </div>
//             )}
//             <LoginButton />
//           </div>

//           {/* Mobile: Login Button + Menu Toggle */}
//           <div className="flex lg:hidden items-center gap-2">
//             <div className="hidden sm:block">
//               <LoginButton />
//             </div>

//             <button
//               onClick={() => setIsOpen(!isOpen)}
//               type="button"
//               className="relative z-50 inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
//               aria-controls="mobile-menu"
//               aria-expanded={isOpen}
//             >
//               <span className="sr-only">Toggle menu</span>
//               <div className="relative h-5 w-5">
//                 <span
//                   className={clsx(
//                     "absolute block h-0.5 w-5 transform bg-current transition duration-300 ease-in-out top-1/2 -translate-y-1/2",
//                     isOpen ? "rotate-45" : "-translate-y-1.5"
//                   )}
//                 />
//                 <span
//                   className={clsx(
//                     "absolute block h-0.5 w-5 transform bg-current transition duration-300 ease-in-out top-1/2 -translate-y-1/2",
//                     isOpen && "opacity-0"
//                   )}
//                 />
//                 <span
//                   className={clsx(
//                     "absolute block h-0.5 w-5 transform bg-current transition duration-300 ease-in-out top-1/2 -translate-y-1/2",
//                     isOpen ? "-rotate-45" : "translate-y-1.5"
//                   )}
//                 />
//               </div>
//             </button>
//           </div>
//         </div>
//       </nav>

//       {/* Mobile Overlay */}
//       <div
//         className={clsx(
//           "fixed inset-0 z-40 lg:hidden transition-opacity duration-300 bg-black/50 backdrop-blur-sm",
//           isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
//         )}
//         onClick={() => setIsOpen(false)}
//       />

//       {/* Mobile Menu */}
//       <div
//         className={clsx(
//           "fixed left-1/2 top-24 z-50 w-[95%] sm:w-[85%] -translate-x-1/2 rounded-2xl border border-white/50 bg-black/80 backdrop-blur-xl transition-all duration-300 ease-out lg:hidden",
//           isOpen
//             ? "opacity-100 translate-y-0 scale-100"
//             : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
//         )}
//       >
//         <div className="p-6">
//           {/* User Info */}
//           {userData && (
//             <div className="pb-4 mb-4 border-b border-white/10">
//               <p className="text-sm text-gray-400">Logged in as</p>
//               <p className="text-white font-medium capitalize">
//                 {userData.name || userData.email}
//               </p>
//               <span className="inline-block text-xs text-blue-400 capitalize mt-1 px-2 py-0.5 rounded-full bg-blue-500/10">
//                 {userData.role}
//               </span>
//             </div>
//           )}

//           {/* Nav Links */}
//           <nav className="flex flex-col gap-1">
//             {navLinks.map((link, index) => (
//               <Link
//                 key={link.name}
//                 to={link.href}
//                 onClick={() => setIsOpen(false)}
//                 className={clsx(
//                   "flex items-center justify-between rounded-lg p-3 text-gray-300 transition-all duration-200 hover:bg-white/10 hover:text-white",
//                   "transform transition-all duration-200",
//                   location.pathname === link.href && "bg-white/15 text-white",
//                   isOpen
//                     ? "translate-x-0 opacity-100"
//                     : "translate-x-4 opacity-0"
//                 )}
//                 style={{
//                   transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
//                 }}
//               >
//                 <div className="flex items-center gap-3">
//                   {link.icon}
//                   <span className="font-medium">{link.name}</span>
//                 </div>
//                 <span
//                   className={clsx(
//                     "h-2 w-2 rounded-full bg-white transition-all duration-200",
//                     location.pathname === link.href
//                       ? "opacity-100 scale-100"
//                       : "opacity-0 scale-75"
//                   )}
//                 />
//               </Link>
//             ))}
//           </nav>

//           {/* Mobile Login Button (for small screens) */}
//           <div className="sm:hidden pt-4 mt-4 border-t border-white/10">
//             <LoginButton />
//           </div>

//           {/* Footer */}
//           <div className="pt-4 mt-4 border-t border-white/10">
//             <p className="text-xs text-gray-500 text-center">
//               Crisis Response © 2025
//             </p>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default Navbar;
"use client";
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import clsx from "clsx";
import {
  IoHomeOutline,
  IoPeopleOutline,
  IoListOutline,
  IoMapOutline,
  IoSettingsOutline,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";
import { AlertCircle, Menu, X } from "lucide-react";
import LoginButton from "./LoginButton";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { userData } = useSelector((state) => state.user);
  const location = useLocation();
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      setLastScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

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
      { name: "Dashboard", href: "/citizenhome", icon: <IoHomeOutline size={20} /> },
      { name: "Report", href: "/sos", icon: <AlertCircle size={20} /> },
      { name: "My Incidents", href: "/citizenown", icon: <IoListOutline size={20} /> },
      { name: "Map", href: "/map", icon: <IoMapOutline size={20} /> },
    ];
  } else if (userData.role === "agency") {
    navLinks = [
      { name: "Dashboard", href: "/agencyhome", icon: <IoHomeOutline size={20} /> },
      { name: "Analytics", href: "/agency/resources", icon: <IoPeopleOutline size={20} /> },
      { name: "Resources", href: "/agency/teams", icon: <IoMapOutline size={20} /> },
    ];
  } else if (userData.role === "coordinator") {
    navLinks = [
      { name: "Dashboard", href: "/coordinatorhome", icon: <IoHomeOutline size={20} /> },
      { name: "Manage", href: "/coordinator/manage", icon: <IoSettingsOutline size={20} /> },
      { name: "Reports", href: "/coordinator/reports", icon: <IoListOutline size={20} /> },
      { name: "Agencies", href: "/coordinator/agencies", icon: <IoPeopleOutline size={20} /> },
    ];
  }

  return (
    <>
      {/* Main Navbar */}
      <nav
        className={clsx(
          "fixed z-50 w-[95%] md:w-[90%] lg:w-[85%] top-4 rounded-2xl -translate-x-1/2 left-1/2",
          "border border-gray-200 bg-white/95 backdrop-blur-xl shadow-lg",
          "transition-all duration-300 ease-in-out",
          showNavbar ? "translate-y-0 opacity-100" : "-translate-y-[120%] opacity-0"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-all">
              <AlertCircle size={24} className="text-white" />
            </div>
            <span className="text-gray-900 font-bold text-lg hidden sm:inline-block group-hover:text-blue-600 transition">
              CrisisAlert
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden items-center gap-0.5 lg:flex">
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

          {/* Desktop User Section & Login Button */}
          <div className="hidden lg:flex items-center gap-3">
            {userData && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-100 border border-gray-200">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-gray-600 font-medium capitalize">
                  {userData.name?.split(" ")[0] || userData.email?.split("@")[0]}
                </span>
                <span className="text-xs text-blue-600 capitalize px-2 py-0.5 rounded-md bg-blue-100 font-semibold">
                  {userData.role}
                </span>
              </div>
            )}
            <LoginButton />
          </div>

          {/* Mobile: Login Button + Menu Toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="hidden sm:block">
              <LoginButton />
            </div>

            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="relative z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-all"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Toggle menu</span>
              {isOpen ? (
                <X size={24} />
              ) : (
                <Menu size={24} />
              )}
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

      {/* Mobile Menu */}
      <div
        className={clsx(
          "fixed left-1/2 top-20 z-50 w-[95%] sm:w-[85%] -translate-x-1/2 rounded-2xl",
          "border border-gray-200 bg-white/95 backdrop-blur-xl shadow-xl",
          "transition-all duration-300 ease-out lg:hidden",
          isOpen
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
        )}
      >
        <div className="p-6">
          {/* User Info */}
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

          {/* Nav Links */}
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
                  {link.icon}
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

          {/* Mobile Login Button */}
          <div className="sm:hidden pt-4 mt-4 border-t border-gray-200">
            <LoginButton />
          </div>

          {/* Footer */}
          <div className="pt-4 mt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center font-medium">
              CrisisAlert © 2025 • Real-time Emergency Response
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;