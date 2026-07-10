import {
  createContext,
  useContext,
  useState,
  ReactNode
} from "react";

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext =
createContext<AuthContextType>(
{} as AuthContextType
);

export const AuthProvider = ({
  children,
}:{
  children:ReactNode
})=>{

  const [token,setToken]=useState(
    localStorage.getItem("token")
  );

  const [user]=useState<User|null>(null);

  const login=(jwt:string)=>{

    localStorage.setItem(
      "token",
      jwt
    );

    setToken(jwt);

  };

  const logout=()=>{

    localStorage.removeItem(
      "token"
    );

    setToken(null);

  };

  return(

<AuthContext.Provider
value={{
user,
token,
login,
logout
}}
>

{children}

</AuthContext.Provider>

  );

};

export const useAuth=()=>{

return useContext(AuthContext);

};