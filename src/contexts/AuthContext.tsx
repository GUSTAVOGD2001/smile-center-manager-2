import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  username: string;
  password: string;
  role: 'admin' | 'user' | 'secretaria';
  requirePasswordChange?: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  users: User[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: User) => void;
  updateUser: (username: string, updatedUser: User) => void;
  deleteUser: (username: string) => void;
  isAdmin: () => boolean;
  isSecretaria: () => boolean;
  changePassword: (newPassword: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_USERS: User[] = [
  { username: 'SMILEADMIN', password: 'Karla12345', role: 'admin' },
  { username: 'Usuario1', password: '1234', role: 'user' },
  { username: 'SecretariaSmile', password: 'Vani123', role: 'secretaria', requirePasswordChange: true },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('smileAuthToken') === 'authenticated';
  });
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('smileCurrentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('smileUsers');
    return savedUsers ? JSON.parse(savedUsers) : DEFAULT_USERS;
  });

  useEffect(() => {
    localStorage.setItem('smileUsers', JSON.stringify(users));
  }, [users]);

  const login = (username: string, password: string): boolean => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setIsAuthenticated(true);
      setCurrentUser(user);
      localStorage.setItem('smileAuthToken', 'authenticated');
      localStorage.setItem('smileCurrentUser', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('smileAuthToken');
    localStorage.removeItem('smileCurrentUser');
  };

  const addUser = (user: User) => {
    setUsers(prev => [...prev, user]);
  };

  const updateUser = (username: string, updatedUser: User) => {
    setUsers(prev => prev.map(u => u.username === username ? updatedUser : u));
  };

  const deleteUser = (username: string) => {
    setUsers(prev => prev.filter(u => u.username !== username));
  };

  const isAdmin = () => currentUser?.role === 'admin';
  
  const isSecretaria = () => currentUser?.role === 'secretaria';

  const changePassword = (newPassword: string) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, password: newPassword, requirePasswordChange: false };
      setCurrentUser(updatedUser);
      localStorage.setItem('smileCurrentUser', JSON.stringify(updatedUser));
      setUsers(prev => prev.map(u => u.username === currentUser.username ? updatedUser : u));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      currentUser,
      users,
      login, 
      logout,
      addUser,
      updateUser,
      deleteUser,
      isAdmin,
      isSecretaria,
      changePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
