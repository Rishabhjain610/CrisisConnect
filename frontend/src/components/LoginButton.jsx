import React from 'react'
import { useDispatch,useSelector } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthDataContext } from '../context/AuthDataContext.jsx';
const LoginButton = () => {
  const dispatch=useDispatch();
  const navigate=useNavigate();
  const userData=useSelector((state)=>state.user.userData);
  const { serverUrl } = useContext(AuthDataContext);
  const handleLogout=async()=>{
    try {
      const res=await axios.post(`${serverUrl}/api/auth/logout`,{}, {withCredentials:true});
      console.log("Logout Response:", res.data);
      dispatch(setUserData(null));
      navigate("/login");
    } catch (error) {
      console.error("Logout Failed",error);
      
    }
  }
  const handleLoginSignup=()=>{
    navigate("/login");
  }
  return (
    <div>
      {userData ? <button onClick={handleLogout} className='bg-red-400 rounded-3xl px-4 py-2'>Logout</button> : <button onClick={handleLoginSignup} className='bg-black text-white rounded-3xl px-4 py-2'>Login/Signup</button>}
    </div>
  )
}

export default LoginButton