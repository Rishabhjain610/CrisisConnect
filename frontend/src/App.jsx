import React from "react";
import { Routes, Route } from "react-router-dom";
import SignUp from "./components/SignUp.jsx";
import Login from "./components/Login.jsx";
import { ToastContainer } from "react-toastify";
import Home from "./pages/Home.jsx";
import UserDataContext from "./context/UserDataContext.jsx";
import { useDispatch, useSelector } from "react-redux";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { Navigate } from "react-router-dom";
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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={userData ? <Navigate to="/" /> : <SignUp />} />
        <Route path="/login" element={userData ? <Navigate to="/" /> : <Login />} />
      </Routes>
    </div>
  );
};

export default App;
