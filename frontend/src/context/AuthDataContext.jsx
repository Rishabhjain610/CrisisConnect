import React,{useContext,createContext} from 'react'
export const AuthDataContext = createContext();
const AuthContext = ({children}) => {
  // const serverUrl="https://vibeshare-backend-j92a.onrender.com";
  const serverUrl="http://localhost:8901";
  // const serverUrl="https://vector-caused-laid-tennis.trycloudflare.com";
  const value={
    serverUrl
  }

  return (
    <AuthDataContext.Provider value={value}>
      {children}
    </AuthDataContext.Provider>
  )
}

export default AuthContext