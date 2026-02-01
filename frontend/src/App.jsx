import React from "react";
import { Routes, Route } from "react-router-dom";
import SignUp from "./components/SignUp.jsx";
import Login from "./components/Login.jsx";
import { ToastContainer } from "react-toastify";
import Home from "./pages/Home.jsx";
import Agency from "./pages/Agency.jsx";
import Citizen from "./pages/Citizen.jsx";
import Coordinator from "./pages/Coordinator.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Sos from "./components/Sos.jsx";
import UserDataContext from "./context/UserDataContext.jsx";
import ImageTextInput from "./components/ImageTextInput.jsx";
import { useDispatch, useSelector } from "react-redux";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { Navigate } from "react-router-dom";
import NewsSummarizer from "./components/NewsSummarizer.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import Maps from "./components/Maps.jsx";
import ContactUs from "./components/ContactUs.jsx";
import CitizenOwn from "./pages/CitizenOwn.jsx";
import ShakeSOS from "./components/ShakeSOS.jsx";
import CoordinatorManage from './pages/CoordinatorManage.jsx';
const App = () => {
  const userData = useSelector((state) => state.user.userData);
  const navigate = useNavigate();
  return (
    <div>
      <ToastContainer
        position="top-left"
        hideProgressBar={true}
        autoClose={1000}
        theme="dark"
        toastStyle={{
          background: "#18181b",
          color: "#fafafa",
          borderRadius: "10px",
          fontWeight: "500",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}
      />
      <UserDataContext />
      <Navbar />
      <ShakeSOS />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/signup"
          element={userData ? <Navigate to="/" /> : <SignUp />}
        />
        <Route
          path="/login"
          element={userData ? <Navigate to="/" /> : <Login />}
        />
        <Route path="/crises" element={<NewsSummarizer />} />
        <Route path="/contact" element={<ContactUs />} />
        {
          userData && userData.role === "citizen" && (
            <>
              <Route path="/citizenhome" element={<Citizen />} />
              <Route path="/sos" element={<Sos />} />
              <Route path="/imagetext" element={<ImageTextInput />} />
              <Route path="/map" element={<Maps />} />
              <Route path="/citizenown" element={<CitizenOwn />} />
            </>
          )}
        {
          userData && userData.role === "agency" && (
            <>
              <Route path="/agencyhome" element={<Agency />} />
              <Route path="/agency/resources" element={<AnalyticsPage />} />
            </>
          )
        }
        {
          userData && userData.role === "coordinator" && (
            <>
              <Route path="/coordinatorhome" element={<Coordinator />} />
              <Route path="/coordinator/manage" element={<CoordinatorManage />} />
            </>
          )
        }
      </Routes >
      <Footer />
    </div >
  );
};

export default App;