import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "../redux/userSlice";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthDataContext } from "../context/AuthDataContext.jsx";
import { IoLogOutOutline, IoLogInOutline } from "react-icons/io5";

const LoginButton = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userData = useSelector((state) => state.user.userData);
  const { serverUrl } = useContext(AuthDataContext);

  const handleLogout = async () => {
    try {
      const res = await axios.post(
        `${serverUrl}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
      console.log("Logout Response:", res.data);
      dispatch(setUserData(null));
      navigate("/login");
    } catch (error) {
      console.error("Logout Failed", error);
    }
  };

  const handleLoginSignup = () => {
    navigate("/login");
  };

  return (
    <div>
      {userData ? (
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-full px-4 py-2 text-sm font-medium transition-all shadow-lg hover:shadow-red-500/50"
        >
          <IoLogOutOutline size={18} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      ) : (
        <button
          onClick={handleLoginSignup}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full px-4 py-2 text-sm font-medium transition-all shadow-lg hover:shadow-blue-500/50"
        >
          <IoLogInOutline size={18} />
          <span className="hidden sm:inline">Login</span>
        </button>
      )}
    </div>
  );
};

export default LoginButton;