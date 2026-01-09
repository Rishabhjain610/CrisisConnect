import React, { useContext, useEffect, useState } from "react";
import { AuthDataContext } from "./AuthDataContext.jsx";
import axios from "axios";
import { useDispatch,useSelector } from "react-redux";
import { setUserData } from "../redux/userSlice.js";

const UserDataContext = () => {
  const dispatch = useDispatch();
  const { serverUrl } = useContext(AuthDataContext);
  const getCurrentUser=async()=>{
    try {
      const res=await axios.get(`${serverUrl}/api/user/current`,{withCredentials:true});
      console.log("Current User Data:",res.data.user);
      dispatch(setUserData(res.data.user));
    } catch (error) {
      
      console.error("Failed to fetch user data",error);
    }
  }

  useEffect(() => {
    getCurrentUser();
  }, [dispatch, serverUrl]);
  return null;
};

export default UserDataContext;
